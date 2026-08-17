import { prisma } from "@/lib/prisma"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { escapeHtml, formatRands } from "@/lib/format"

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 })
  }

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { payments: true, assignedProvider: true },
  })

  if (!order || order.customerId !== session.user.id) {
    return new Response("Not found", { status: 404 })
  }

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice ${order.orderNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px }
        .box { border: 1px solid #ddd; padding: 12px; margin-bottom: 8px }
      </style>
    </head>
    <body>
      <h1>Invoice: ${escapeHtml(order.orderNumber)}</h1>
      <div class="box">
        <strong>Customer:</strong> ${escapeHtml(order.customerName)} &lt;${escapeHtml(order.customerEmail)}&gt;<br/>
        <strong>Created:</strong> ${order.createdAt.toISOString()}
      </div>
      <div class="box">
        <strong>Pickup:</strong><br/>${escapeHtml(order.pickupAddress)}<br/>${escapeHtml(order.pickupPhone)}
      </div>
      <div class="box">
        <strong>Delivery:</strong><br/>${escapeHtml(order.deliveryAddress)}<br/>${escapeHtml(order.deliveryPhone)}
      </div>
      <div class="box">
        <strong>Amount:</strong> ${formatRands(order.amount)}<br/>
        <strong>Payment status:</strong> ${escapeHtml(order.paymentStatus)}
      </div>
      <div class="box">
        <strong>Notes:</strong><br/>${escapeHtml(order.description || order.packageDescription || "-")}
      </div>
    </body>
  </html>`

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html",
      "Content-Disposition": `attachment; filename="invoice-${order.orderNumber}.html"`,
    },
  })
}
