import { Link } from 'react-router-dom'
import {
  BarChart3,
  CalendarDays,
  Package,
  Scissors,
  UserRound,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { EmptyState } from '@/app/components/EmptyState'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { StatCard } from '@/app/components/StatCard'
import { Card, CardContent } from '@/app/components/ui/card'
import { COMMON, REPORTS, ROUTES } from '@/app/constants'
import { useReportsOverviewQuery } from '@/app/hooks/queries/useReportsQuery'
import { useCanAccessPath } from '@/app/hooks/useHasPermission'

type ReportCard = {
  to: string
  title: string
  description: string
  icon: LucideIcon
  group: keyof typeof REPORTS.hub.groups
}

const REPORT_CARDS: ReportCard[] = [
  {
    to: ROUTES.reportsSales,
    title: REPORTS.hub.cards.sales.title,
    description: REPORTS.hub.cards.sales.description,
    icon: BarChart3,
    group: 'sales',
  },
  {
    to: ROUTES.reportsStaff,
    title: REPORTS.hub.cards.staff.title,
    description: REPORTS.hub.cards.staff.description,
    icon: UserRound,
    group: 'team',
  },
  {
    to: ROUTES.reportsCustomers,
    title: REPORTS.hub.cards.customers.title,
    description: REPORTS.hub.cards.customers.description,
    icon: Users,
    group: 'customers',
  },
  {
    to: ROUTES.reportsAppointments,
    title: REPORTS.hub.cards.appointments.title,
    description: REPORTS.hub.cards.appointments.description,
    icon: CalendarDays,
    group: 'operations',
  },
  {
    to: ROUTES.reportsServices,
    title: REPORTS.hub.cards.services.title,
    description: REPORTS.hub.cards.services.description,
    icon: Scissors,
    group: 'operations',
  },
  {
    to: ROUTES.reportsProducts,
    title: REPORTS.hub.cards.products.title,
    description: REPORTS.hub.cards.products.description,
    icon: Package,
    group: 'operations',
  },
]

function ReportLinkCard({ card }: { card: ReportCard }) {
  const Icon = card.icon
  return (
    <Link
      to={card.to}
      className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full transition-colors group-hover:border-primary/40">
        <CardContent className="flex items-start gap-3 py-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-gold-deep">
            <Icon className="size-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{card.title}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export function ReportsScreen() {
  const overview = useReportsOverviewQuery()
  const canSales = useCanAccessPath(ROUTES.reportsSales)
  const canStaff = useCanAccessPath(ROUTES.reportsStaff)
  const canCustomers = useCanAccessPath(ROUTES.reportsCustomers)
  const canAppointments = useCanAccessPath(ROUTES.reportsAppointments)
  const canServices = useCanAccessPath(ROUTES.reportsServices)
  const canProducts = useCanAccessPath(ROUTES.reportsProducts)

  const access: Record<string, boolean> = {
    [ROUTES.reportsSales]: canSales,
    [ROUTES.reportsStaff]: canStaff,
    [ROUTES.reportsCustomers]: canCustomers,
    [ROUTES.reportsAppointments]: canAppointments,
    [ROUTES.reportsServices]: canServices,
    [ROUTES.reportsProducts]: canProducts,
  }

  const visible = REPORT_CARDS.filter((c) => access[c.to])

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader description={REPORTS.hub.description} />

      <section className="space-y-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {REPORTS.hub.keyNumbers}
        </h3>
        {overview.isLoading ? <LoadingSkeleton variant="stats" /> : null}
        {overview.isError ? (
          <ErrorState
            error={overview.error}
            title={COMMON.errors.loadFailed}
            onRetry={() => void overview.refetch()}
          />
        ) : null}
        {!overview.isLoading && !overview.isError && overview.data ? (
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard
              label={REPORTS.hub.revenue}
              value={overview.data.revenue}
              format="inr"
              delta={overview.data.revenueChange}
              icon={BarChart3}
            />
            <StatCard
              label={REPORTS.hub.avgBill}
              value={overview.data.averageBill}
              format="inr"
              delta={overview.data.averageBillChange}
              icon={BarChart3}
            />
            <StatCard
              label={REPORTS.hub.newCustomers}
              value={overview.data.newCustomers}
              delta={overview.data.newCustomersChange}
              icon={Users}
            />
            <StatCard
              label={REPORTS.hub.noShowRate}
              value={overview.data.noShowRate}
              format="percent"
              delta={overview.data.noShowRateChange}
              icon={CalendarDays}
            />
          </div>
        ) : null}
      </section>

      {visible.length === 0 ? (
        <EmptyState
          title={COMMON.errors.noAccess}
          description={COMMON.errors.noAccessHint}
        />
      ) : (
        <>
          {/* Sales / Team / Customers share one row on md+ so the hub fits without scrolling. */}
          {(['sales', 'team', 'customers'] as const).some((g) =>
            visible.some((c) => c.group === g),
          ) ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-2">
              {(['sales', 'team', 'customers'] as const).map((group) => {
                const cards = visible.filter((c) => c.group === group)
                if (cards.length === 0) return null
                return (
                  <section key={group} className="min-w-0 space-y-2">
                    <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {REPORTS.hub.groups[group]}
                    </h3>
                    <div className="space-y-2">
                      {cards.map((card) => (
                        <ReportLinkCard key={card.to} card={card} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          ) : null}

          {(() => {
            const cards = visible.filter((c) => c.group === 'operations')
            if (cards.length === 0) return null
            return (
              <section className="space-y-2">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {REPORTS.hub.groups.operations}
                </h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {cards.map((card) => (
                    <ReportLinkCard key={card.to} card={card} />
                  ))}
                </div>
              </section>
            )
          })()}
        </>
      )}
    </div>
  )
}
