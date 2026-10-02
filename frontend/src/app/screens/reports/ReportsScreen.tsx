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

const reports = [
  {
    to: '/reports/sales',
    title: 'Sales',
    description: 'Collection, service vs product split, staff table.',
    icon: BarChart3,
  },
  {
    to: '/reports/staff',
    title: 'Staff sales & incentives',
    description: 'Per-staff sales, incentive rate, and payout estimate.',
    icon: UserRound,
  },
  {
    to: '/reports/inventory',
    title: 'Inventory valuation',
    description: 'On-hand stock at cost and retail, with CSV export.',
    icon: Package,
  },
  {
    to: '/reports/profit',
    title: 'Profit',
    description: 'Revenue, expenses, and net profit breakdown.',
    icon: PiggyBank,
  },
] as const

export function ReportsScreen() {
  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description="Owner reports — sales, staff, stock, and profit." />

      <div className="grid gap-2 sm:grid-cols-2">
        {reports.map((report) => {
          const Icon = report.icon
          return (
            <Link
              key={report.to}
              to={report.to}
              className="group block rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="h-full transition-colors group-hover:border-primary/40">
                <CardContent className="flex items-start gap-3 py-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
                    <Icon className="size-4 text-foreground" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{report.title}</p>
                      <ChevronRight
                        className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
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
