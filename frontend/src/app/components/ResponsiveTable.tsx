import { flexRender, type RowData } from '@tanstack/react-table'
import {
  getCoreRowModel,
  useLegacyTable,
  type LegacyColumnDef,
} from '@tanstack/react-table/legacy'

import { EmptyState } from '@/app/components/EmptyState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table'
import { cn } from '@/app/utils'

export type ColumnDef<TData extends RowData> = LegacyColumnDef<TData, unknown>

interface ResponsiveTableProps<TData extends object> {
  data: TData[]
  columns: ColumnDef<TData>[]
  mobileTitleKey?: keyof TData & string
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

/**
 * Desktop: real table. Mobile: stacked card rows.
 * Built on TanStack Table v9 legacy API (familiar column defs).
 */
export function ResponsiveTable<TData extends object>({
  data,
  columns,
  mobileTitleKey,
  emptyTitle = 'No rows yet',
  emptyDescription = 'Nothing to show for this range.',
  className,
}: ResponsiveTableProps<TData>) {
  const table = useLegacyTable({
    data: data as never[],
    columns: columns as never[],
    getCoreRowModel: getCoreRowModel(),
  })

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="space-y-2 md:hidden">
        {table.getRowModel().rows.map((row) => {
          const original = row.original as TData
          const titleValue = mobileTitleKey
            ? String(original[mobileTitleKey] ?? '')
            : String(row.getVisibleCells()[0]?.getValue() ?? '')

          return (
            <div key={row.id} className="rounded-md border border-border bg-card p-3">
              <p className="mb-2 text-sm font-semibold">{titleValue}</p>
              <dl className="grid gap-1.5">
                {row.getVisibleCells().map((cell, index) => {
                  if (mobileTitleKey && cell.column.id === mobileTitleKey) return null
                  if (!mobileTitleKey && index === 0) return null
                  const header = cell.column.columnDef.header
                  const label = typeof header === 'string' ? header : cell.column.id

                  return (
                    <div
                      key={cell.id}
                      className="flex items-start justify-between gap-3 text-sm"
                    >
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className="text-right font-medium tabular-nums">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-md border border-border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-10 whitespace-nowrap px-3 text-xs">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id} className="px-3 py-2.5 text-sm tabular-nums">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
