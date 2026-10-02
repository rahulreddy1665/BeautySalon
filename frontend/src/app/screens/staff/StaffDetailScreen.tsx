import { ArrowLeft, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { useStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { StaffFormSheet } from '@/app/screens/staff/StaffFormSheet'
import { formatINR } from '@/app/utils'

export function StaffDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const staffQuery = useStaffQuery(id)
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const [editOpen, setEditOpen] = useState(false)

  const salesQuery = useQuery({
    queryKey: queryKeys.invoices.staffSales({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      staffId: id,
    }),
    queryFn: () =>
      invoicesApi.staffSales(range.from.toISOString(), range.to.toISOString()),
    enabled: Boolean(id),
  })

  const sales = useMemo(() => {
    const row = (salesQuery.data ?? []).find((r) => r.staffId === id)
    return (
      row ?? {
        serviceSales: 0,
        productSales: 0,
        totalSales: 0,
      }
    )
  }, [salesQuery.data, id])

  if (staffQuery.isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton variant="stats" />
      </div>
    )
  }

  if (staffQuery.isError || !staffQuery.data) {
    return (
      <ErrorState
        error={staffQuery.error}
        title="Staff not found"
        onRetry={() => void staffQuery.refetch()}
      />
    )
  }

  const staff = staffQuery.data

  return (
    <div className="min-w-0 space-y-3">
      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
        <Link to="/staff">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Staff
        </Link>
      </Button>

      <PageHeader
        description={`${staff.gender} · age ${staff.age}`}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
            Edit
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{staff.name}</h2>
        <Badge variant="outline" className="rounded-md font-normal">
          {staff.isActive === false ? 'Inactive' : 'Active'}
        </Badge>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {salesQuery.isLoading ? <LoadingSkeleton variant="stats" /> : null}
      {!salesQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          <StatCard label="Service sales" value={sales.serviceSales} format="inr" />
          <StatCard label="Product sales" value={sales.productSales} format="inr" />
          <StatCard
            label="Total"
            value={sales.totalSales}
            format="inr"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Sales note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Totals come from paid invoice line items
          {sales.totalSales === 0
            ? ' — no billed lines in this range yet.'
            : ` (${formatINR(sales.totalSales)}).`}
        </CardContent>
      </Card>

      <StaffFormSheet open={editOpen} onOpenChange={setEditOpen} staff={staff} />
    </div>
  )
}
