"use client"

import React from "react"

export default function PrintInvoice({ order }: { order: any }) {
  function handlePrint() {
    window.print()
  }

  return (
    <button
      onClick={handlePrint}
      className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
    >
      Print Invoice
    </button>
  )
}
