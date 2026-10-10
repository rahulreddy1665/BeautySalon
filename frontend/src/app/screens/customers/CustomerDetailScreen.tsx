import { format, parseISO } from 'date-fns'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { CUSTOMERS, COMMON } from '@/app/constants'
import { useCustomerVisitsQuery } from '@/app/hooks/queries/useCustomerVisitsQuery'
import { useCustomerQuery } from '@/app/hooks/queries/useCustomersQuery'
import { useLoyaltyBalanceQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import type { InvoiceRecord } from '@/app/service/invoices/invoicesApi'
import { CustomerFormSheet } from '@/app/screens/customers/CustomerFormSheet'
import { formatINR } from '@/app/utils'

type VisitRow = {
  id: string
  date: string
  service: string
  invoice: string
  total: string
}

const visitColumns: ColumnDef<VisitRow>[] = [
  { accessorKey: 'date', header: CUSTOMERS.detail.colDate },
  { accessorKey: 'service', header: CUSTOMERS.detail.colServices },
  { accessorKey: 'invoice', header: CUSTOMERS.detail.colInvoice },
  { accessorKey: 'total', header: CUSTOMERS.detail.colTotal },
]

function invoiceServices(inv: InvoiceRecord): string {
  const names = [
    ...inv.serviceItems.map((s) => s.name),
    ...inv.productItems.map((p) => p.name),
  ].filter(Boolean)
  return names.length > 0 ? names.join(', ') : '—'
}

function toVisitRows(invoices: InvoiceRecord[]): VisitRow[] {
  return invoices.map((inv) => {
    const when = inv.createdAt ? parseISO(inv.createdAt) : null
    return {
      id: inv._id,
      date: when && !Number.isNaN(when.getTime()) ? format(when, 'dd MMM yyyy') : '—',
      service: invoiceServices(inv),
      invoice: inv.invoiceNumber || '—',
      total: formatINR(inv.amountPayable ?? inv.grandTotal ?? 0),
    }
  })
}

export function CustomerDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const customerQuery = useCustomerQuery(id)
  const visitsQuery = useCustomerVisitsQuery(id)
  const loyaltyQuery = useLoyaltyBalanceQuery(id)
  const [editOpen, setEditOpen] = useState(false)

  const visits = useMemo(
    () => toVisitRows(visitsQuery.data ?? []),
    [visitsQuery.data],
  )
  const loyaltyPoints = loyaltyQuery.data?.points ?? 0
  const lifetimeSpend = useMemo(
    () =>
      (visitsQuery.data ?? []).reduce(
        (sum, inv) => sum + (Number(inv.amountPayable ?? inv.grandTotal) || 0),
        0,
      ),
    [visitsQuery.data],
  )

  if (customerQuery.isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton variant="stats" />
        <LoadingSkeleton rows={4} />
      </div>
    )
  }

  if (customerQuery.isError || !customerQuery.data) {
    return (
      <ErrorState
        error={customerQuery.error}
        title={CUSTOMERS.detail.notFound}
        onRetry={() => void customerQuery.refetch()}
      />
    )
  }

  const customer = customerQuery.data
  const fullName = [customer.name, customer.lastName].filter(Boolean).join(' ')

  return (
    <div className="min-w-0 space-y-3">
      <div className="flex items-center gap-2">
        <Button asChild type="button" size="sm" variant="outline" className="h-8">
          <Link to="/customers">
            <ArrowLeft className="size-4" strokeWidth={1.75} />
            {CUSTOMERS.detail.back}
          </Link>
        </Button>
      </div>

      <PageHeader
        description={[fullName, customer.phone].filter(Boolean).join(' · ')}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
            {CUSTOMERS.detail.edit}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
        <StatCard label={CUSTOMERS.detail.visits} value={visits.length} />
        <StatCard
          label={CUSTOMERS.detail.lifetimeSpend}
          value={lifetimeSpend}
          format="inr"
        />
        <StatCard label={CUSTOMERS.detail.loyaltyPoints} value={loyaltyPoints} />
        <Card className="gap-0 rounded-md py-0 shadow-none">
          <CardContent className="px-3 py-3 sm:px-4">
            <p className="text-xs text-muted-foreground">{COMMON.labels.status}</p>
            <p className="mt-1 text-sm font-semibold">
              {customer.isActive === false
                ? COMMON.labels.inactive
                : COMMON.labels.active}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>{CUSTOMERS.detail.profile}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">{CUSTOMERS.detail.email}</p>
            <p>{customer.email || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{CUSTOMERS.detail.phone}</p>
            <p className="tabular-nums">{customer.phone}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>{CUSTOMERS.detail.visitHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {visitsQuery.isLoading ? <LoadingSkeleton rows={3} /> : null}
          {visitsQuery.isError ? (
            <ErrorState
              error={visitsQuery.error}
              title={CUSTOMERS.detail.loadVisitsFailed}
              onRetry={() => void visitsQuery.refetch()}
            />
          ) : null}
          {!visitsQuery.isLoading && !visitsQuery.isError ? (
            <ResponsiveTable
              data={visits}
              columns={visitColumns}
              mobileTitleKey="date"
              emptyTitle={CUSTOMERS.detail.emptyVisits}
              emptyDescription={CUSTOMERS.detail.emptyVisitsHint}
            />
          ) : null}
        </CardContent>
      </Card>

      <CustomerFormSheet open={editOpen} onOpenChange={setEditOpen} customer={customer} />
    </div>
  )
}
