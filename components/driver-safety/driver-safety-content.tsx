import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DriverSafetyMonitor } from "@/components/driver-safety/driver-safety-monitor"
import { Eye, ShieldCheck } from "lucide-react"

export function DriverSafetyContent() {
  return (
    <div className="grid gap-10 xl:grid-cols-[1.25fr_0.85fr]">
      <section className="space-y-8">
        <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
            Driver safety
          </span>
          <div className="mt-6 space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Live eye monitoring for logistics drivers</h2>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground">
              Combine your delivery tracking platform with a live driver fatigue monitor. Detect eye closure, blinks,
              and alertness changes in real time so logistics teams can keep drivers safe and deliveries on time.
            </p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link href="/tracking">Open route tracking</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/driver-safety">Open driver safety</Link>
            </Button>
          </div>
        </div>

        <DriverSafetyMonitor />
      </section>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-accent/10 p-3 text-accent">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Overview</p>
              <h3 className="text-2xl font-semibold">Why this matters</h3>
            </div>
          </div>
          <p className="mt-5 text-sm leading-7 text-muted-foreground">
            Logistics depends on timely and safe delivery. When drivers stay alert, operational delays drop and customer
            promises are met. Eye gesture monitoring adds a safety layer without interrupting the normal delivery flow.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-muted p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-background p-3 text-accent">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">Safety in every route</h3>
          </div>
          <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
            <li className="rounded-2xl bg-card p-4">
              <p className="font-semibold">Real-time alerts</p>
              <p className="mt-1">Notify dispatch when attention drops during a delivery.</p>
            </li>
            <li className="rounded-2xl bg-card p-4">
              <p className="font-semibold">Performance insight</p>
              <p className="mt-1">Track fatigue trends across drivers to optimize schedules.</p>
            </li>
            <li className="rounded-2xl bg-card p-4">
              <p className="font-semibold">Driver-first design</p>
              <p className="mt-1">On-device monitoring keeps the experience private and responsive.</p>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold">How it works</h3>
          <ol className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground list-decimal list-inside">
            <li>Start the monitor before the delivery route begins.</li>
            <li>Watch live driver alertness and blink statistics.</li>
            <li>Respond to fatigue alerts with route adjustments.</li>
            <li>Use the data to improve delivery scheduling and safety.</li>
          </ol>
        </div>
      </aside>
    </div>
  )
}
