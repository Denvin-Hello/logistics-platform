import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProviderSidebar } from "@/components/provider/provider-sidebar"
import { ProfileForm } from "@/components/provider/profile-form"

export const dynamic = "force-dynamic"

export default async function ProviderProfilePage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) redirect("/login")

  const profile = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      businessName: true,
      phone: true,
      serviceArea: true,
      serviceAreaLat: true,
      serviceAreaLng: true,
      serviceRadiusKm: true,
      vehicleType: true,
      vehicleCapacityKg: true,
    },
  })

  if (!profile) redirect("/login")

  return (
    <div className="flex min-h-screen bg-background">
      <ProviderSidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Profile</h1>
            <p className="text-muted-foreground">
              Keep your service area and vehicle details current so dispatch can match the right deliveries.
            </p>
          </div>
          <ProfileForm initialProfile={profile} />
        </div>
      </div>
    </div>
  )
}
