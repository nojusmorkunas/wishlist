package handlers

import (
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/html"
)

type ScrapedMeta struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Price       string `json:"price"`
	Image       string `json:"image"`
}

var privateRanges []*net.IPNet

func init() {
	for _, cidr := range []string{
		"127.0.0.0/8",
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"169.254.0.0/16",
		"::1/128",
		"fc00::/7",
		"fe80::/10",
	} {
		_, block, _ := net.ParseCIDR(cidr)
		privateRanges = append(privateRanges, block)
	}
}

func isPrivateIP(ip net.IP) bool {
	for _, block := range privateRanges {
		if block.Contains(ip) {
			return true
		}
	}
	return false
}

func safeDialContext(ctx context.Context, network, addr string) (net.Conn, error) {
	host, port, err := net.SplitHostPort(addr)
	if err != nil {
		return nil, err
	}
	ips, err := net.DefaultResolver.LookupIPAddr(ctx, host)
	if err != nil {
		return nil, err
	}
	for _, ipa := range ips {
		if isPrivateIP(ipa.IP) {
			return nil, fmt.Errorf("address %s resolves to a private IP", host)
		}
	}
	return (&net.Dialer{}).DialContext(ctx, network, net.JoinHostPort(ips[0].IP.String(), port))
}

var scrapeClient = &http.Client{
	Timeout: 8 * time.Second,
	Transport: &http.Transport{
		DialContext: safeDialContext,
	},
}

var (
	scrapeMu      sync.Mutex
	scrapeWindows = map[string][2]int64{} // ip -> [windowStart, count]
)

func scrapeAllowed(r *http.Request) bool {
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	now := time.Now().Unix()
	scrapeMu.Lock()
	defer scrapeMu.Unlock()
	e := scrapeWindows[ip]
	if now-e[0] >= 60 {
		scrapeWindows[ip] = [2]int64{now, 1}
		return true
	}
	if e[1] >= 10 {
		return false
	}
	scrapeWindows[ip] = [2]int64{e[0], e[1] + 1}
	return true
}

func ScrapeURL() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !scrapeAllowed(r) {
			writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": "too many requests"})
			return
		}
		rawURL := r.URL.Query().Get("url")
		if _, err := url.ParseRequestURI(rawURL); err != nil || (!strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://")) {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid url"})
			return
		}

		req, err := http.NewRequestWithContext(r.Context(), "GET", rawURL, nil)
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid url"})
			return
		}
		req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
		req.Header.Set("Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
		req.Header.Set("Accept-Language", "en-US,en;q=0.5")

		resp, err := scrapeClient.Do(req)
		if err != nil {
			writeJSON(w, http.StatusBadGateway, map[string]string{"error": "could not fetch url"})
			return
		}
		defer resp.Body.Close()

		meta := parseMeta(io.LimitReader(resp.Body, 2*1024*1024))
		if isBotPage(meta.Name) {
			meta = ScrapedMeta{}
		}
		writeJSON(w, http.StatusOK, meta)
	}
}

func parseMeta(r io.Reader) ScrapedMeta {
	var meta ScrapedMeta
	var titleText string
	inTitle := false

	z := html.NewTokenizer(r)
	for {
		tt := z.Next()
		if tt == html.ErrorToken {
			break
		}
		switch tt {
		case html.StartTagToken, html.SelfClosingTagToken:
			t := z.Token()
			switch t.Data {
			case "title":
				inTitle = true
			case "meta":
				prop := attrVal(t.Attr, "property")
				name := attrVal(t.Attr, "name")
				content := attrVal(t.Attr, "content")
				switch prop {
				case "og:title", "twitter:title":
					if meta.Name == "" {
						meta.Name = content
					}
				case "og:description", "twitter:description":
					if meta.Description == "" {
						meta.Description = content
					}
				case "og:image", "twitter:image":
					if meta.Image == "" {
						meta.Image = content
					}
				case "og:price:amount", "product:price:amount":
					if meta.Price == "" {
						meta.Price = content
					}
				case "og:price:currency":
					if meta.Price != "" && !strings.Contains(meta.Price, content) {
						meta.Price = content + meta.Price
					}
				}
				switch name {
				case "description":
					if meta.Description == "" {
						meta.Description = content
					}
				case "twitter:title":
					if meta.Name == "" {
						meta.Name = content
					}
				case "twitter:description":
					if meta.Description == "" {
						meta.Description = content
					}
				case "twitter:image", "twitter:image:src":
					if meta.Image == "" {
						meta.Image = content
					}
				}
			case "head", "/head":
				// stop after head to avoid parsing the full body
			}
		case html.TextToken:
			if inTitle && titleText == "" {
				titleText = strings.TrimSpace(string(z.Text()))
			}
		case html.EndTagToken:
			t := z.Token()
			if t.Data == "title" {
				inTitle = false
			}
			if t.Data == "head" {
				goto done
			}
		}
	}
done:
	if meta.Name == "" {
		meta.Name = titleText
	}
	meta.Name = strings.TrimSpace(meta.Name)
	meta.Description = strings.TrimSpace(meta.Description)
	meta.Price = strings.TrimSpace(meta.Price)
	return meta
}

var botPagePatterns = []string{
	"just a moment",
	"are you a robot",
	"robot check",
	"access denied",
	"attention required",
	"security check",
	"checking your browser",
	"please wait",
	"ddos protection",
	"verifying you are human",
	"enable javascript and cookies",
	"before you continue",
	"pardon our interruption",
	"403 forbidden",
	"404 not found",
	"blocked",
	"captcha",
}

func isBotPage(title string) bool {
	lower := strings.ToLower(strings.TrimSpace(title))
	for _, p := range botPagePatterns {
		if strings.Contains(lower, p) {
			return true
		}
	}
	return false
}

func attrVal(attrs []html.Attribute, key string) string {
	for _, a := range attrs {
		if a.Key == key {
			return a.Val
		}
	}
	return ""
}
