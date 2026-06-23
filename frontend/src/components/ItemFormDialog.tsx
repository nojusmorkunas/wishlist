import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { api, type ItemInput, type ItemView } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"
import { Loader2, ImagePlus, X } from "lucide-react"

const CURRENCIES = [
  "EUR", "USD", "GBP", "PLN", "SEK", "NOK", "DKK",
  "CHF", "JPY", "CAD", "AUD", "HUF", "CZK", "RON",
]

const localeClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  initial?: ItemView
  onSave: (data: ItemInput) => Promise<void>
}

function isValidUrl(value: string) {
  try {
    const u = new URL(value)
    return u.protocol === "http:" || u.protocol === "https:"
  } catch {
    return false
  }
}

export default function ItemFormDialog({ open, onOpenChange, initial, onSave }: Props) {
  const { currency: preferredCurrency } = useSettings()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [url, setUrl] = useState("")
  const [price, setPrice] = useState("")
  const [currency, setCurrency] = useState(preferredCurrency)
  const [imageUrl, setImageUrl] = useState("")
  const [priority, setPriority] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const lastFetched = useRef("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "")
      setDescription(initial?.description ?? "")
      setUrl(initial?.url ?? "")
      setPrice(initial?.price ?? "")
      setCurrency(initial?.currency || preferredCurrency)
      setImageUrl(initial?.imageUrl ?? "")
      setPriority(initial?.priority ?? 0)
      setError("")
      lastFetched.current = initial?.url ?? ""
    }
  }, [open, initial])

  async function fetchMeta(targetUrl: string) {
    if (!isValidUrl(targetUrl) || lastFetched.current === targetUrl) return
    lastFetched.current = targetUrl
    setFetching(true)
    try {
      // Product scraping is best-effort. Some shops block it, so failures stay quiet.
      const meta = await api.scrape(targetUrl)
      if (meta.name) setName((prev) => prev || meta.name)
      if (meta.description) setDescription((prev) => prev || meta.description)
      if (meta.price) setPrice((prev) => prev || meta.price)
      if (meta.image) setImageUrl((prev) => prev || meta.image)
    } catch {
      // silently ignore
    } finally {
      setFetching(false)
    }
  }

  function handleUrlPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim()
    // Let the pasted value land in the input before reading metadata.
    if (isValidUrl(pasted)) setTimeout(() => fetchMeta(pasted), 0)
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await api.upload(file)
      setImageUrl(url)
    } catch {
      setError("Image upload failed.")
    } finally {
      setUploading(false)
      // Allows uploading the same file again after removing it.
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Name is required.")
      return
    }
    if (!imageUrl.trim()) {
      // Photos make shared lists easier to skim, so every item needs one.
      setError("Photo is required.")
      return
    }
    setError("")
    setLoading(true)
    try {
      await onSave({ name: name.trim(), description, url, price, currency, imageUrl, priority })
      onOpenChange(false)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit item" : "Add item"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="item-url">Link</Label>
            <div className="relative">
              <Input
                id="item-url"
                type="url"
                inputMode="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handleUrlPaste}
                onBlur={() => fetchMeta(url)}
                placeholder="https://..."
                className={fetching ? "pr-8" : ""}
              />
              {fetching && (
                <Loader2
                  size={14}
                  className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground"
                />
              )}
            </div>
          </div>

          {imageUrl && !fetching && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
              <img
                src={imageUrl}
                alt=""
                className="w-12 h-12 rounded object-cover shrink-0 bg-muted"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{name || "Photo found"}</p>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setImageUrl("")}
              >
                <X size={13} />
              </Button>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-price">Price</Label>
              <div className="flex">
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 rounded-l-md rounded-r-none border border-r-0 border-input bg-muted px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shrink-0"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Input
                  id="item-price"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="rounded-l-none"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-priority">Priority</Label>
              <select
                id="item-priority"
                value={priority}
                onChange={(e) => setPriority(parseInt(e.target.value))}
                className={localeClass}
              >
                <option value={0}>None</option>
                <option value={1}>Low</option>
                <option value={2}>Medium</option>
                <option value={3}>High</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Photo</Label>
            {imageUrl ? (
              <div className="relative w-full aspect-video rounded-md overflow-hidden border bg-muted">
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => setImageUrl("")}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setImageUrl("")}
                >
                  <X size={14} />
                  <span className="sr-only">Remove photo</span>
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center w-full h-24 rounded-md border-2 border-dashed border-input text-muted-foreground hover:border-ring hover:text-foreground transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <span className="flex flex-col items-center gap-1 text-sm">
                    <ImagePlus size={20} />
                    Upload photo
                  </span>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || fetching || uploading}>
              {loading && <Loader2 className="animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
