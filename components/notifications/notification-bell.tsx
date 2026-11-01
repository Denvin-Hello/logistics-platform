"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface NotificationItem {
  id: string
  type: string
  title: string
  body: string
  href: string | null
  readAt: string | null
  createdAt: string
}

export function NotificationBell() {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      setItems(Array.isArray(data.notifications) ? data.notifications : [])
      setUnread(typeof data.unreadCount === "number" ? data.unreadCount : 0)
    } catch {
      // Transient network errors should not break the navigation.
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(load, 30_000)
    return () => clearInterval(timer)
  }, [load])

  async function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnread(0)
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
    } catch {
      // The next poll will reconcile the badge.
    }
  }

  async function markRead(item: NotificationItem) {
    if (item.readAt) return
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, readAt: new Date().toISOString() } : entry,
      ),
    )
    setUnread((count) => Math.max(0, count - 1))
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      })
    } catch {
      // The next poll will reconcile the badge.
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 ? (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifications</p>
            <p className="text-xs text-muted-foreground">{unread} unread</p>
          </div>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : null}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            items.map((item) => {
              const content = (
                <div className={cn("space-y-1 px-4 py-3", !item.readAt && "bg-accent/10")}>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.body}</p>
                  <p className="text-[11px] text-muted-foreground">{formatDateTime(item.createdAt)}</p>
                </div>
              )

              return (
                <div key={item.id} className="border-b last:border-b-0">
                  {item.href ? (
                    <Link
                      href={item.href}
                      onClick={() => {
                        void markRead(item)
                        setOpen(false)
                      }}
                      className="block hover:bg-muted/60"
                    >
                      {content}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void markRead(item)}
                      className="block w-full text-left hover:bg-muted/60"
                    >
                      {content}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
