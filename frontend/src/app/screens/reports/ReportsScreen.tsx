import { Link } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  Package,
  PiggyBank,
  UserRound,
} from 'lucide-react'

import { PageHeader } from '@/app/components/PageHeader'
import { Card, CardContent } from '@/app/components/ui/card'
import { REPORTS, ROUTES } from '@/app/constants'

const reports = [
  {
    to: ROUTES.reportsSales,
    title: REPORTS.hub.sales,
    description: REPORTS.sales.description,
    icon: BarChart3,
  },
  {
    to: ROUTES.reportsStaff,
    title: REPORTS.hub.staff,
    description: REPORTS.staff.description,
    icon: UserRound,
  },
  {
    to: ROUTES.reportsInventory,
    title: REPORTS.hub.inventory,
    description: REPORTS.inventory.description,
    icon: Package,
  },
  {
    to: ROUTES.reportsProfit,
    title: REPORTS.hub.profit,
    description: REPORTS.profit.description,
    icon: PiggyBank,
  },
] as const

export function ReportsScreen() {
  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description={REPORTS.hub.description} />

      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link
              key={report.to}
              to={report.to}
              className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <Icon
                      className="size-4 text-foreground"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{report.title}</p>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                        strokeWidth={1.75}
                      />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {report.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
