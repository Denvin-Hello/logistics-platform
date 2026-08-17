"use client"

import React, { useState } from "react"

export default function SupportPage() {
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [orderId, setOrderId] = useState("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch("/api/support/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, orderId }),
      })

      if (res.ok) {
        setStatus("Support request submitted. We'll be in touch.")
        setSubject("")
        setMessage("")
        setOrderId("")
      } else {
        setStatus("Failed to submit. Try again later.")
      }
    } catch (err) {
      setStatus("Network error. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Support</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Subject</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Order ID (optional)</label>
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
            rows={6}
            required
          />
        </div>
        <div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
        {status && <div className="text-sm text-gray-700">{status}</div>}
      </form>
    </div>
  )
}
