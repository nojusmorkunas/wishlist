import { useState } from "react"
import { cn } from "@/lib/utils"

const COLORS = [
  "bg-red-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-green-500",
  "bg-teal-500",
  "bg-cyan-600",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-rose-500",
]

function hashColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h)
  }
  return COLORS[Math.abs(h) % COLORS.length]
}

interface Props {
  user: { displayName: string; avatarUrl: string }
  className?: string
}

export default function UserAvatar({ user, className = "w-9 h-9" }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const letter = (user.displayName || "?").charAt(0).toUpperCase()
  const color = hashColor(user.displayName)

  if (user.avatarUrl && !imgFailed) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.displayName}
        className={cn("rounded-full object-cover shrink-0", className)}
        onError={() => setImgFailed(true)}
      />
    )
  }

  return (
    <div
      className={cn(
        "rounded-full shrink-0 flex items-center justify-center text-white font-semibold select-none",
        color,
        className
      )}
      aria-label={user.displayName}
    >
      <span className="leading-none">{letter}</span>
    </div>
  )
}
