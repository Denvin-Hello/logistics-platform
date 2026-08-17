import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { DriverSafetyContent } from "@/components/driver-safety/driver-safety-content"

export default function ProviderDriverSafetyPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />

      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Driver Safety</h1>
            <p className="text-muted-foreground">Monitor driver alertness and fatigue in real time</p>
          </div>
          <DriverSafetyContent />
        </div>
      </div>
    </div>
  )
}