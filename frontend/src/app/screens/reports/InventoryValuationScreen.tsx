import { Download } from 'lucide-react'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import {
  useInventoryValuationQuery,
  type InventoryValuationRow,
} from '@/app/hooks/queries/useReportsQuery'
import { cn, downloadCsv, formatINR, formatNumber } from '@/app/utils'

const columns: ColumnDef<InventoryValuationRow>[] = [
  {
    accessorKey: 'name',
    header: 'Product',
    cell: ({ row }) => (
      <div className="min-w-0">
        <p className="font-medium">{row.original.name}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {row.original.sku} · {row.original.category}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'qtyOnHand',
    header: 'Qty',
    cell: ({ getValue }) => (
      <span className="tabular-nums">{formatNumber(Number(getValue()))}</span>
    ),
  },
  {
    accessorKey: 'stockLevel',
    header: 'Status',
    cell: ({ getValue }) => {
      const level = String(getValue())
      return (
        <Badge
          variant="outline"
          className={cn(
            'rounded-md font-normal capitalize',
            level === 'out' && 'border-destructive/40 text-destructive',
            level === 'low' && 'border-warning/50 text-warning',
            level === 'ok' && 'border-success/40 text-success',
          )}
        >
          {level === 'out' ? 'Out' : level === 'low' ? 'Low' : 'OK'}
        </Badge>
      )
    },
  },
  {
    accessorKey: 'costValue',
    header: 'Cost value',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
  {
    accessorKey: 'retailValue',
    header: 'Retail value',
    cell: ({ getValue }) => formatINR(Number(getValue())),
  },
]

export function InventoryValuationScreen() {
  const { data, isLoading, isError, error, refetch } =
    useInventoryValuationQuery()

  const exportCsv = () => {
    downloadCsv(
      `inventory-valuation.csv`,
      [
        'SKU',
        'Name',
        'Category',
        'Qty',
        'Cost',
        'Sell',
        'Cost value',
        'Retail value',
        'Status',
      ],
      data.rows.map((row) => [
        row.sku,
        row.name,
        row.category,
        row.qtyOnHand,
        row.costPrice,
        row.unitPrice,
        row.costValue,
        row.retailValue,
        row.stockLevel,
      ]),
    )
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="On-hand stock valued at cost and retail."
        actions={
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-touch h-9"
            onClick={exportCsv}
            disabled={isLoading || isError || data.rows.length === 0}
          >
            <Download className="size-4" strokeWidth={1.75} />
            Export CSV
          </Button>
        }
      />

      {import.meta.env.DEV && data.usingMock ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          MOCK inventory store · CSV client-side (no export API)
        </Badge>
      ) : null}

      {isLoading ? (
        <>
          <LoadingSkeleton variant="stats" />
          <LoadingSkeleton rows={5} />
        </>
      ) : null}

      {isError ? (
        <ErrorState
          error={error}
          title="Inventory valuation failed"
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard label="SKUs" value={data.skuCount} />
            <StatCard label="Low / out" value={data.lowStockCount} />
            <StatCard label="Cost value" value={data.costValue} format="inr" />
            <StatCard label="Retail value" value={data.retailValue} format="inr" />
          </div>

          <ResponsiveTable
            data={data.rows}
            columns={columns}
            mobileTitleKey="name"
            emptyTitle="No stock to value"
            emptyDescription="Add products in Inventory first."
          />
        </>
      ) : null}
    </div>
  )
}
