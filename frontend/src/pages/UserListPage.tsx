import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { api, type User, type ItemView } from "@/lib/api"
import { daysUntilBirthday, formatPrice } from "@/lib/utils"
import { useSettings } from "@/contexts/SettingsContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import ItemDetailDialog from "@/components/ItemDetailDialog"
import UserAvatar from "@/components/UserAvatar"
import { ExternalLink, Gift, Undo2, ShoppingBag, PackageCheck, Check } from "lucide-react"

const priorityLabel = ["", "Low", "Medium", "High"] as const
const priorityClass = [
  "",
  "bg-muted text-muted-foreground",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
] as const

export default function UserListPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currency, locale } = useSettings()
  const [targetUser, setTargetUser] = useState<User | null>(null)
  const [items, setItems] = useState<ItemView[]>([])
  const [loading, setLoading] = useState(true)
  const [detailItem, setDetailItem] = useState<ItemView | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const userId = parseInt(id ?? "0", 10)

  useEffect(() => {
    if (!userId) return
    Promise.all([api.users.get(userId), api.items.forUser(userId)])
      .then(([user, items]) => {
        setTargetUser(user)
        setItems(items)
      })
      .catch(() => navigate("/browse"))
      .finally(() => setLoading(false))
  }, [userId, navigate])

  function openDetail(item: ItemView) {
    setDetailItem(item)
    setDetailOpen(true)
  }

  function updateItem(id: number, patch: Partial<ItemView>) {
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)))
    setDetailItem((prev) => (prev?.id === id ? { ...prev, ...patch } : prev))
  }

  async function handleClaim(itemId: number, note: string) {
    updateItem(itemId, { claimed: true, claimedByMe: true, claimNote: note })
    setDetailOpen(false)
    api.items.claim(itemId, note)
  }

  async function handleUnclaim(itemId: number) {
    updateItem(itemId, { claimed: false, claimedByMe: false, isPurchased: false, claimNote: "" })
    setDetailOpen(false)
    api.items.unclaim(itemId)
  }

  async function handlePurchase(itemId: number) {
    updateItem(itemId, { isPurchased: true })
    api.items.purchase(itemId)
  }

  async function handleUnpurchase(itemId: number) {
    updateItem(itemId, { isPurchased: false })
    api.items.unpurchase(itemId)
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="h-8 w-48 rounded bg-muted animate-pulse mb-6" />
        {[1, 2, 3].map((n) => (
          <div key={n} className="h-16 rounded-xl bg-muted animate-pulse" />
        ))}
      </div>
    )
  }

  if (!targetUser) return null

  const days = daysUntilBirthday(targetUser.birthday)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <UserAvatar user={targetUser} className="w-12 h-12" />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{targetUser.displayName}'s list</h1>
          {days !== null && (
            <p className="text-muted-foreground text-sm mt-0.5">
              {days === 0
                ? "🎂 Today is their birthday!"
                : `Birthday in ${days} day${days === 1 ? "" : "s"}`}
            </p>
          )}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No items on this list yet.</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.isReceived ? "opacity-60" : undefined}>
              <CardContent className="p-3 flex flex-wrap items-start gap-2 sm:flex-nowrap sm:items-center">
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt=""
                    className="w-12 h-12 rounded-md object-cover shrink-0 bg-muted cursor-pointer"
                    onClick={() => openDetail(item)}
                    onError={(e) => (e.currentTarget.style.display = "none")}
                  />
                )}

                <div className="flex-1 min-w-0 cursor-pointer pt-1 sm:pt-0" onClick={() => openDetail(item)}>
                  <p className="font-semibold text-sm leading-tight line-clamp-1">
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    {item.price && (
                      <Badge variant="secondary" className="text-xs">
                        {formatPrice(item.price, locale, item.currency || currency)}
                      </Badge>
                    )}
                    {item.priority > 0 && (
                      <Badge className={`text-xs ${priorityClass[item.priority]}`}>
                        {priorityLabel[item.priority]}
                      </Badge>
                    )}
                    {item.isReceived && (
                      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        <Check size={10} className="mr-0.5" />
                        Received
                      </Badge>
                    )}
                    {!item.isReceived && item.claimed && !item.claimedByMe && (
                      <Badge variant="secondary" className="text-xs">
                        {item.claimedByName ? `Claimed by ${item.claimedByName}` : "Claimed"}
                      </Badge>
                    )}
                    {item.claimedByMe && (
                      <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                        {item.isPurchased ? "You bought this" : "You're getting this"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="order-last flex w-full items-center justify-end gap-1 shrink-0 sm:order-none sm:w-auto">
                  {item.url && (
                    <Button variant="ghost" size="icon" asChild className="h-11 w-11 sm:h-9 sm:w-9">
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink size={15} />
                        <span className="sr-only">Open link</span>
                      </a>
                    </Button>
                  )}
                  {!item.isReceived && !item.claimed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(item)}
                      className="h-11 gap-1.5 text-xs sm:h-9"
                    >
                      <Gift size={14} />
                      Claim
                    </Button>
                  )}
                  {!item.isReceived && item.claimedByMe && (
                    <>
                      {!item.isPurchased ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePurchase(item.id)}
                          className="h-11 gap-1.5 text-xs sm:h-9"
                          title="Mark as bought"
                        >
                          <ShoppingBag size={14} />
                          <span className="hidden sm:inline">Bought</span>
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnpurchase(item.id)}
                          className="h-11 gap-1.5 text-xs sm:h-9"
                          title="Unmark bought"
                        >
                          <PackageCheck size={14} />
                        </Button>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-9 sm:w-9">
                            <Undo2 size={14} />
                            <span className="sr-only">Unclaim</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Unclaim "{item.name}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Your claim and note will be removed.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnclaim(item.id)}>
                              Unclaim
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ItemDetailDialog
        item={detailItem}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        mode="viewer"
        onClaim={(note) => detailItem && handleClaim(detailItem.id, note)}
        onUnclaim={() => detailItem && handleUnclaim(detailItem.id)}
        onPurchase={() => detailItem && handlePurchase(detailItem.id)}
        onUnpurchase={() => detailItem && handleUnpurchase(detailItem.id)}
      />
    </div>
  )
}
