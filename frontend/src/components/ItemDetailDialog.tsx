import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { type ItemView } from "@/lib/api"
import { useSettings } from "@/contexts/SettingsContext"
import { formatPrice } from "@/lib/utils"
import {
  ExternalLink,
  Gift,
  Undo2,
  ShoppingBag,
  PackageCheck,
  Check,
  Archive,
  ArchiveRestore,
  Loader2,
} from "lucide-react"

const priorityLabel = ["", "Low", "Medium", "High"] as const
const priorityClass = [
  "",
  "bg-muted text-muted-foreground",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
] as const

interface Props {
  item: ItemView | null
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "owner" | "viewer"
  onClaim?: (note: string) => void
  onUnclaim?: () => void
  onPurchase?: () => void
  onUnpurchase?: () => void
  onReceived?: () => void
  onUnreceived?: () => void
  onArchive?: () => void
  onUnarchive?: () => void
}

export default function ItemDetailDialog({
  item,
  open,
  onOpenChange,
  mode,
  onClaim,
  onUnclaim,
  onPurchase,
  onUnpurchase,
  onReceived,
  onUnreceived,
  onArchive,
  onUnarchive,
}: Props) {
  const { currency, locale } = useSettings()
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimNote, setClaimNote] = useState("")
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const busy = busyAction !== null

  if (!item) return null

  async function run(key: string, fn: () => void | Promise<void>) {
    if (busy) return
    setBusyAction(key)
    try { await fn() } finally { setBusyAction(null) }
  }

  function handleClaim() {
    run("claim", () => {
      onClaim?.(claimNote)
      setClaimNote("")
      setShowClaimForm(false)
    })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setShowClaimForm(false) }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="pr-8">{item.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {item.imageUrl && (
            <div className="w-full aspect-video rounded-md overflow-hidden bg-muted">
              <img
                src={item.imageUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-2 items-center">
            {item.price && (
              <Badge variant="secondary" className="text-sm">
                {formatPrice(item.price, locale, item.currency || currency)}
              </Badge>
            )}
            {item.priority > 0 && (
              <Badge className={priorityClass[item.priority]}>
                {priorityLabel[item.priority]} priority
              </Badge>
            )}
            {item.isReceived && (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                <Check size={12} className="mr-1" />
                Received
              </Badge>
            )}
            {item.isArchived && (
              <Badge variant="outline">Archived</Badge>
            )}
          </div>

          {item.description && (
            <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
          )}

          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <ExternalLink size={14} />
              View product
            </a>
          )}

          {mode === "viewer" && (
            <div className="border-t pt-4 space-y-3">
              {item.isReceived ? (
                <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                  This gift has been received.
                </p>
              ) : item.claimedByMe ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      {item.isPurchased ? "You bought this" : "You're getting this"}
                    </Badge>
                  </div>
                  {item.claimNote && (
                    <p className="text-sm text-muted-foreground italic">
                      Your note: {item.claimNote}
                    </p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {!item.isPurchased ? (
                      <Button size="sm" disabled={busy} onClick={() => run("purchase", () => onPurchase?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                        {busyAction === "purchase" ? <Loader2 size={15} className="animate-spin" /> : <ShoppingBag size={15} />}
                        Mark as bought
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unpurchase", () => onUnpurchase?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                        {busyAction === "unpurchase" ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                        Unmark bought
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unclaim", () => onUnclaim?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                      {busyAction === "unclaim" ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
                      Unclaim
                    </Button>
                  </div>
                </>
              ) : item.claimed ? (
                <Badge variant="secondary">
                  {item.claimedByName ? `${item.claimedByName} is getting this` : "Someone else is getting this"}
                </Badge>
              ) : showClaimForm ? (
                <div className="space-y-2">
                  <Textarea
                    placeholder="Optional private note (only you can see this)…"
                    value={claimNote}
                    onChange={(e) => setClaimNote(e.target.value)}
                    rows={2}
                    disabled={busy}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busy} onClick={handleClaim} className="min-h-[44px] gap-1.5 sm:min-h-0">
                      {busyAction === "claim" ? <Loader2 size={15} className="animate-spin" /> : <Gift size={15} />}
                      Confirm claim
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => { setShowClaimForm(false); setClaimNote("") }}
                      className="min-h-[44px] sm:min-h-0"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button size="sm" disabled={busy} onClick={() => setShowClaimForm(true)} className="min-h-[44px] gap-1.5 sm:min-h-0">
                  <Gift size={15} />
                  Claim this gift
                </Button>
              )}
            </div>
          )}

          {mode === "owner" && (
            <div className="border-t pt-4 flex gap-2 flex-wrap">
              {!item.isReceived ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("received", () => onReceived?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                  {busyAction === "received" ? <Loader2 size={15} className="animate-spin" /> : <PackageCheck size={15} />}
                  Mark as received
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unreceived", () => onUnreceived?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                  {busyAction === "unreceived" ? <Loader2 size={15} className="animate-spin" /> : <Undo2 size={15} />}
                  Unmark received
                </Button>
              )}
              {!item.isArchived ? (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("archive", () => onArchive?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                  {busyAction === "archive" ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
                  Archive
                </Button>
              ) : (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => run("unarchive", () => onUnarchive?.())} className="min-h-[44px] gap-1.5 sm:min-h-0">
                  {busyAction === "unarchive" ? <Loader2 size={15} className="animate-spin" /> : <ArchiveRestore size={15} />}
                  Unarchive
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
