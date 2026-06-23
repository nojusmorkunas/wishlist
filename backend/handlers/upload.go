package handlers

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

var uploadsDir string

const maxImageUploadBytes = 10 << 20

func SetUploadsDir(dir string) {
	uploadsDir = dir
}

func UploadImage() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Cap the whole request, not just the multipart memory buffer.
		r.Body = http.MaxBytesReader(w, r.Body, maxImageUploadBytes)
		if err := r.ParseMultipartForm(maxImageUploadBytes); err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file too large (max 10MB)"})
			return
		}
		file, _, err := r.FormFile("image")
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "missing image field"})
			return
		}
		defer file.Close()

		buf := make([]byte, 512)
		n, _ := file.Read(buf)
		// Trust the detected MIME type more than the uploaded filename.
		mime := http.DetectContentType(buf[:n])
		if !strings.HasPrefix(mime, "image/") {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "file must be an image"})
			return
		}

		ext := mimeToExt(mime)

		if err := os.MkdirAll(uploadsDir, 0755); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		filename := uuid.NewString() + ext
		dst, err := os.Create(filepath.Join(uploadsDir, filename))
		if err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}
		defer dst.Close()

		// Write the sniffed bytes first, then copy the rest of the upload.
		dst.Write(buf[:n])
		if _, err := io.Copy(dst, file); err != nil {
			writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal error"})
			return
		}

		writeJSON(w, http.StatusCreated, map[string]string{"url": fmt.Sprintf("/uploads/%s", filename)})
	}
}

func mimeToExt(mime string) string {
	switch mime {
	case "image/jpeg":
		return ".jpg"
	case "image/png":
		return ".png"
	case "image/gif":
		return ".gif"
	case "image/webp":
		return ".webp"
	default:
		return ".bin"
	}
}
