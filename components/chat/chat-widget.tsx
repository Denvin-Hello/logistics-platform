"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { MessageCircle, X, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Input } from "@/components/ui/input"

interface ChatWidgetProps {
  userId: string
  userRole: string
  userName?: string
}

export function ChatWidget({ userId, userRole, userName }: ChatWidgetProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"list" | "window">("list")
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const loadConversations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/chat/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations || [])
      }
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  async function createOrOpenConversation(orderId: string, orderNumber: string) {
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      })
      if (res.ok) {
        const data = await res.json()
        setSelectedConversation(data.conversation.id)
        setView("window")
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
        className="bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:scale-105 transition-transform border"
        size="sm"
      >
        <MessageCircle className="h-5 w-5" />
        {unreadCount > 0 && (
          <Badge className="absolute top-1 right-1 bg-destructive text-destructive-foreground">
            {unreadCount}
          </Badge>
        )}
      </Button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-0 z-[101] flex items-end justify-end p-4">
          <div className="w-full max-w-md lg:w-[500px] h-[600px] bg-background border border-border rounded-2xl shadow-2xl flex flex-col pointer-events-auto z-[101]">
            <div className="flex items-center justify-between p-4 border-b bg-background/50 backdrop-blur">
              <CardHeader className="p-0 m-0 flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  {view === "list" ? "Messages" : "Conversation"}
                </CardTitle>
              </CardHeader>
              <div className="flex items-center gap-2">
                {view === "window" && (
                  <Button variant="ghost" size="sm" onClick={() => { setView("list"); setSelectedConversation(null) }}>
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
                loading={loading}
                userId={userId}
                onSelect={setSelectedConversation}
                onOpen={setView}
              />
            ) : (
              <ChatWindow
                conversationId={selectedConversation || ""}
                userId={userId}
                userRole={userRole}
                userName={userName || ""}
                onBack={() => { setView("list"); setSelectedConversation(null) }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function ChatList({
  conversations,
  loading,
  userId,
  onSelect,
  onOpen,
}: {
  conversations: any[]
  loading: boolean
  userId: string
  onSelect: (id: string) => void
  onOpen: (v: "list" | "window") => void
}) {
  if (loading) {
    return (
      <div className="flex-1 p-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {conversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <MessageCircle className="h-10 w-10 mb-2 opacity-50" />
          <p>No conversations yet</p>
        </div>
      ) : (
        <ScrollArea type="auto" className="h-full">
          {conversations.map((c) => {
            const other = c.participants?.find((p: any) => p.userId !== userId)
            const lastMsg = c.messages?.[0]
            const unread = lastMsg && lastMsg.senderId !== userId && !lastMsg.readAt
            return (
              <Card
                key={c.id}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => {
                  onSelect(c.id)
                  onOpen("window")
                }}
              >
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-sm">{other?.name || "Unknown"}</h3>
                    {unread && <Badge variant="destructive" className="h-5 w-5">•</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {lastMsg?.body || "No messages"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Order #{c.order?.orderNumber || "—"}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </ScrollArea>
      )}
    </div>
  )
}

function ChatWindow({
  conversationId,
  userId,
  userRole,
  userName,
  onBack,
}: {
  conversationId: string
  userId: string
  userRole: string
  userName: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL(`/api/chat/conversations/${conversationId}/messages`, window.location.origin)
      url.searchParams.set("take", "50")
      if (cursor) url.searchParams.set("cursor", cursor)
      const res = await fetch(url)
      if (res.ok) {
        const data = await res.json()
        setMessages((prev) => cursor ? [...prev, ...data.messages] : data.messages)
        setCursor(data.nextCursor)
      }
    } catch {
      setMessages([])
    } finally {
      setLoading(false)
    }
  }, [conversationId, cursor])

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  async function sendMessage() {
    if (!input.trim()) return
    setSending(true)
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: input.trim() }),
      })
      if (res.ok) {
        setInput("")
        const data = await res.json()
        setMessages((prev) => [data.message, ...prev])
      }
    } catch {
      console.error("Failed to send")
    } finally {
      setSending(false)
      // Safety: ensure sending never stays true due to batched state updates
      setTimeout(() => setSending(false), 100)
    }
  }

  return (
    <div className="flex flex-col h-full border-t bg-background pointer-events-auto">
      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
        {loading ? (
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
                    m.senderId === userId
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
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
      </div>

      <div className="border-t p-3 bg-background/50 backdrop-blur pointer-events-auto z-[102]">
        <div className="flex items-center gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1 pointer-events-auto"
          />
          <Button
            onClick={sendMessage}
            disabled={sending || !input.trim()}
            size="sm"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  )
}
