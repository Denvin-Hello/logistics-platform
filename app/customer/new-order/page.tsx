import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { OrderForm } from "@/components/customer/order-form"

export default function NewOrderPage() {
  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 overflow-auto">
        <OrderForm />
      </div>
    </div>
  )
}
