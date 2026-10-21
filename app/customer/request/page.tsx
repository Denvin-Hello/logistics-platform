import { CustomerSidebar } from "@/components/customer/customer-sidebar"
import { RequestForm } from "@/components/customer/request-form"

export default function RequestPage() {
  return (
    <div className="flex h-screen bg-background">
      <CustomerSidebar />
      <div className="flex-1 overflow-auto">
        <RequestForm />
      </div>
    </div>
  )
}
