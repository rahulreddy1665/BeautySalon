import { ArrowLeft, Download, Info } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

import { Button } from '@/app/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover'
import { COMMON, REPORTS, ROUTES } from '@/app/constants'
import { cn } from '@/app/utils'

interface ReportPageLayoutProps {
  title: string
  description: string
  showHowCalculated?: boolean
  filters?: ReactNode
  kpis?: ReactNode
  chart?: ReactNode
  table?: ReactNode
  children?: ReactNode
  onExport?: () => void
  exportDisabled?: boolean
  canExport?: boolean
  className?: string
}

export function ReportPageLayout({
  title,
  description,
  showHowCalculated = true,
  filters,
  kpis,
  chart,
  table,
  children,
  onExport,
  exportDisabled,
  canExport,
  className,
}: ReportPageLayoutProps) {
  return (
    <div className={cn('min-w-0 space-y-3', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1.5">
          <Link
            to={ROUTES.reports}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" strokeWidth={1.75} />
            {REPORTS.hub.backToReports}
          </Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
            {showHowCalculated ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  >
                    <Info className="size-3.5" strokeWidth={1.75} />
                    {REPORTS.shared.howCalculated.title}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-80 text-sm">
                  <p className="mb-2 font-medium">{REPORTS.shared.howCalculated.title}</p>
                  <ul className="list-disc space-y-1.5 pl-4 text-xs text-muted-foreground">
                    {REPORTS.shared.howCalculated.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {canExport && onExport ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="min-touch h-9 shrink-0"
            onClick={onExport}
            disabled={exportDisabled}
          >
            <Download className="size-4" strokeWidth={1.75} />
            {COMMON.actions.exportCsv}
          </Button>
        ) : null}
      </div>

      {filters ? <div className="space-y-2">{filters}</div> : null}
      {kpis}
      {chart}
      {table}
      {children}
    </div>
  )
}

interface ReportPaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
}

export function ReportPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: ReportPaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between text-sm text-muted-foreground">
      <span>
        {REPORTS.shared.rowsTotal.replace('{total}', String(total))} ·{' '}
        {REPORTS.shared.pageOf
          .replace('{page}', String(page))
          .replace('{total}', String(totalPages))}
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {COMMON.actions.previous}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {COMMON.actions.next}
        </Button>
      </div>
    </div>
  )
}
