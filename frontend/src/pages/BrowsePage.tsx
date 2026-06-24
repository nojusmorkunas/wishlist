import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, type User, type ItemView } from "@/lib/api"
import { useAuth } from "@/App"
import { daysUntilBirthday, turningAge, formatBirthday } from "@/lib/utils"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import UserAvatar from "@/components/UserAvatar"

interface UserWithItems {
  user: User
  items: ItemView[]
}

export default function BrowsePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [entries, setEntries] = useState<UserWithItems[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.users.list().then(async (all) => {
      const others = all.filter((u) => u.id !== user.id)
      const results = await Promise.all(
        others.map((u) =>
          api.items.forUser(u.id).then((items) => ({ user: u, items })).catch(() => ({ user: u, items: [] as ItemView[] }))
        )
      )
      setEntries(results)
    }).finally(() => setLoading(false))
  }, [user.id])

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Browse</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 animate-in fade-in duration-200">
      <h1 className="text-2xl font-bold mb-6">Browse</h1>
      {entries.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No other users yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {entries.map(({ user: u, items }) => {
            const days = daysUntilBirthday(u.birthday)
            const age = turningAge(u.birthday)
            const unclaimed = items.filter((i) => !i.claimed && !i.isReceived).length
            const total = items.length
            return (
              <Card key={u.id} className="flex flex-col transition-shadow hover:shadow-md">
                <CardContent className="pt-6 flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <UserAvatar user={u} className="w-10 h-10" />
                    <p className="min-w-0 truncate text-lg font-semibold leading-tight">{u.displayName}</p>
                  </div>
                  {days !== null && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {days === 0
                        ? `🎂 Turning ${age} today!`
                        : `Turning ${age} in ${days} day${days === 1 ? "" : "s"} (${formatBirthday(u.birthday)})`}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2 flex-wrap">
                    {total === 0 ? (
                      <Badge variant="outline" className="text-xs">No items</Badge>
                    ) : (
                      <>
                        <Badge variant="secondary" className="text-xs">{total} item{total === 1 ? "" : "s"}</Badge>
                        {unclaimed > 0 && (
                          <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                            {unclaimed} unclaimed
                          </Badge>
                        )}
                        {unclaimed === 0 && total > 0 && (
                          <Badge variant="outline" className="text-xs">All claimed</Badge>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full min-h-[44px]"
                    variant="outline"
                    onClick={() => navigate(`/users/${u.id}`)}
                  >
                    View list
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
