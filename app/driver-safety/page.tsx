import { Header } from "@/components/layout/header"
import { DriverSafetyContent } from "@/components/driver-safety/driver-safety-content"

export default function DriverSafetyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-10">
        <DriverSafetyContent />
      </main>
    </div>
  )
}
