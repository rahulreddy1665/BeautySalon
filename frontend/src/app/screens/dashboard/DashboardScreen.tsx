import { Link } from 'react-router-dom'
import { Package, UserRound } from 'lucide-react'

import { RevenueTrendChart } from '@/app/components/charts/ReportCharts'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useOwnerDashboardQuery } from '@/app/hooks/queries/useDashboardQuery'
import { formatINR } from '@/app/utils'

export function DashboardScreen() {
  const { data, isLoading, isError, error, refetch } = useOwnerDashboardQuery()
  const showMockBadge = import.meta.env.DEV && Boolean(data?.usingMock)

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Today's collection, appointments, and staff performance."
        actions={
          <Button asChild size="sm" className="min-touch h-9">
            <Link to="/billing">Collect payment</Link>
          </Button>
        }
      />

      {showMockBadge ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          Live appointments/invoices/staff/products · trend falls back to mock when empty
        </Badge>
      ) : null}

      {isLoading ? <LoadingSkeleton variant="stats" /> : null}

      {isError ? (
        <ErrorState
          error={error}
          title="Dashboard failed to load"
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard
              label="Today's collection"
              value={data.todaysCollection}
              format="inr"
              delta={data.collectionDelta}
            />
            <StatCard label="Appointments today" value={data.todaysBookings} />
            <StatCard label="New customers" value={data.newCustomers} />
            <StatCard label="Products" value={data.productCount} />
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-1">
                <CardTitle>Revenue trend (7 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueTrendChart data={data.revenueTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1">
                <CardTitle>Top staff</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {data.topStaff.map((staff, index) => (
                  <div
                    key={staff.staffId}
                    className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0 last:pb-0"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[11px] font-semibold">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{staff.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {staff.salesMocked ? 'Sales today (mock)' : 'Sales today'}
                        </p>
                      </div>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">
                      {formatINR(staff.sales)}
                    </p>
                  </div>
                ))}
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <UserRound className="size-3.5" strokeWidth={1.75} />
                  {data.staffCount} staff on roster
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Package className="size-3.5" strokeWidth={1.75} />
                  <Link to="/inventory" className="hover:underline">
                    {data.productCount} products in catalog
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}
    </div>
  )
}
