import { Fragment, type ReactNode } from 'react'
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
  getRowId?: (row: TData) => string
  expandedRowId?: string | null
  renderExpandedRow?: (row: TData) => ReactNode
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
  getRowId,
  expandedRowId,
  renderExpandedRow,
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
          const rowKey = getRowId ? getRowId(original) : row.id
          const expanded = expandedRowId != null && expandedRowId === rowKey
          const titleValue = mobileTitleKey
            ? String(original[mobileTitleKey] ?? '')
            : String(row.getVisibleCells()[0]?.getValue() ?? '')

          const expandCell = row.getVisibleCells().find((cell) => cell.column.id === 'expand')

          return (
            <div
              key={row.id}
              className={cn(
                'rounded-md border border-border bg-card p-3',
                expanded && 'bg-muted/50',
              )}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="min-w-0 text-sm font-semibold">{titleValue}</p>
                {expandCell
                  ? flexRender(
                      expandCell.column.columnDef.cell,
                      expandCell.getContext(),
                    )
                  : null}
              </div>
              <dl className="grid gap-1.5">
                {row.getVisibleCells().map((cell, index) => {
                  if (cell.column.id === 'expand') return null
                  if (mobileTitleKey && cell.column.id === mobileTitleKey) return null
                  if (!mobileTitleKey && index === 0) return null
                  const header = cell.column.columnDef.header
                  if (typeof header === 'string' && header.trim() === '') return null
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
              {expanded && renderExpandedRow ? (
                <div className="mt-2 border-t border-border pt-2">
                  {renderExpandedRow(original)}
                </div>
              ) : null}
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
                  <TableHead
                    key={header.id}
                    className={cn(
                      'h-10 whitespace-nowrap px-3 text-xs',
                      header.column.id === 'expand' && 'w-10 px-1',
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              const original = row.original as TData
              const rowKey = getRowId ? getRowId(original) : row.id
              const expanded = expandedRowId != null && expandedRowId === rowKey
              return (
                <Fragment key={row.id}>
                  <TableRow className={cn(expanded && 'bg-muted/60')}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          'px-3 py-2.5 text-sm tabular-nums',
                          cell.column.id === 'expand' && 'w-10 px-1',
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                  {expanded && renderExpandedRow ? (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={columns.length} className="p-0">
                        {renderExpandedRow(original)}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
