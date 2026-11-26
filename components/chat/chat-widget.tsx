"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MessageCircle, X, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

interface ChatWidgetProps {
  userId: string
  userRole: string
  userName?: string
}

interface ChattableOrder {
  id: string
  orderNumber: string
  status: string
  counterpartName: string
  conversationId: string | null
}

export function ChatWidget({ userId }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "window">("list")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [orders, setOrders] = useState<ChattableOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/chat/conversations", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data.conversations) ? data.conversations : []
        setConversations(list)
        setOrders(Array.isArray(data.orders) ? data.orders : [])
        setUnreadCount(
          list.filter((c: any) => {
            const last = c.messages?.[0]
            return last && last.senderId !== userId && !last.readAt
          }).length,
        )
      }
    } catch {
      setConversations([])
      setOrders([])
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  const openConversation = useCallback((conversationId: string) => {
    setSelectedConversation(conversationId)
    setView("window")
  }, [])

  async function createOrOpenConversation(orderId: string) {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      if (res.ok) {
        const data = await res.json()
        openConversation(data.conversation.id)
        setOpen(true)
        await loadConversations()
      }
    } catch {
      console.error("Failed to open conversation")
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      {/* Floating button */}
      <Button
        onClick={() => {
          setOpen(true)
          setView("list")
          setSelectedConversation(null)
        }}
        className="relative bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:scale-105 transition-transform border"
        size="sm"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-[101] flex items-end justify-end p-4">
          <div className="w-full max-w-md lg:w-[500px] h-[600px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur">
              <CardHeader className="p-0 m-0 flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {view === "list" ? "Messages" : "Conversation"}
                </CardTitle>
              </CardHeader>
              <div className="flex items-center gap-2">
                {view === "window" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setView("list")
                      setSelectedConversation(null)
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {view === "list" ? (
              <ChatList
                conversations={conversations}
                orders={orders}
                loading={loading}
                userId={userId}
                onOpenConversation={openConversation}
                onStartOrder={createOrOpenConversation}
              />
            ) : (
              <ChatWindow conversationId={selectedConversation || ""} userId={userId} />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatList({
  conversations,
  orders,
  loading,
  userId,
  onOpenConversation,
  onStartOrder,
}: {
  conversations: any[]
  orders: ChattableOrder[]
  loading: boolean
  userId: string
  onOpenConversation: (id: string) => void
  onStartOrder: (orderId: string) => void
}) {
  const startable = orders.filter((order) => !order.conversationId)

  if (loading && conversations.length === 0 && orders.length === 0) {
    return (
      <div className="flex-1 p-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conversations</h3>
        {conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          conversations.map((c) => {
            const other = c.participants?.find((p: any) => p.userId !== userId)
            const lastMsg = c.messages?.[0]
            const unread = lastMsg && lastMsg.senderId !== userId && !lastMsg.readAt
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => onOpenConversation(c.id)}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{other?.name || "Unknown"}</h3>
                    {unread && (
                      <Badge variant="destructive" className="h-5 w-5">
                        •
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{lastMsg?.body || "No messages"}</p>
                  <p className="text-xs text-muted-foreground">Order #{c.order?.orderNumber || "—"}</p>
                </CardContent>
              </Card>
            )
          })
        )}
      </section>

      {startable.length > 0 ? (
        <section className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Start a conversation</h3>
          {startable.map((order) => (
            <Card
              key={order.id}
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onStartOrder(order.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-sm">{order.counterpartName}</h3>
                  <span className="text-xs text-muted-foreground">#{order.orderNumber}</span>
                </div>
                <p className="text-xs text-muted-foreground">Message about this delivery</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      {conversations.length === 0 && startable.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
          <p>Nothing to chat about yet</p>
          <p className="text-xs">Messaging becomes available once a provider is assigned to an order.</p>
        </div>
      ) : null}
    </div>
  )
}

function ChatWindow({ conversationId, userId }: { conversationId: string; userId: string }) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const markedRead = useRef<Set<string>>(new Set())

  const loadMessages = useCallback(async () => {
    if (!conversationId) return
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages?take=100`, {
        cache: "no-store",
      })
      if (res.ok) {
        const data = await res.json()
        const list = Array.isArray(data.messages) ? [...data.messages].reverse() : []
        setMessages(list)
        for (const message of list) {
          if (message.senderId !== userId && !message.readAt && !markedRead.current.has(message.id)) {
            markedRead.current.add(message.id)
            void fetch(`/api/chat/messages/${message.id}/read`, { method: "PATCH" })
          }
        }
      }
    } catch {
      // Transient network errors keep the previous messages visible.
    } finally {
      setLoading(false)
    }
  }, [conversationId, userId])

  useEffect(() => {
    setLoading(true)
    setMessages([])
    void loadMessages()
    const timer = setInterval(() => {
      void loadMessages()
    }, 5000)
    return () => clearInterval(timer)
  }, [loadMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" })
  }, [messages])

  async function sendMessage() {
    const body = input.trim()
    if (!body || sending) return
    setSending(true)
    setError(null)
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      })
      if (res.ok) {
        const data = await res.json()
        setInput("")
        setMessages((prev) => [...prev, data.message])
      } else {
        const data = await res.json().catch(() => null)
        setError(data?.error || "Unable to send message.")
      }
    } catch {
      setError("Network error. Try again.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 border-t bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <p>No messages yet</p>
            <p className="text-xs">Start the conversation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.senderId === userId ? "justify-end" : "justify-start"} max-w-[85%]`}
              >
                <div
                  className={`rounded-lg p-3 text-sm ${
                    m.senderId === userId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.body}</p>
                  <p className="text-[10px] opacity-60 mt-1">
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.senderId === userId && m.readAt ? " ✓" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="border-t p-3 bg-background/50 backdrop-blur">
        {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button onClick={() => void sendMessage()} disabled={sending || !input.trim()} size="sm">
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
