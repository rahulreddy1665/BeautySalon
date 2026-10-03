import { useState } from 'react'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { EmptyState } from '@/app/components/EmptyState'
import { PageHeader } from '@/app/components/PageHeader'
import { REPORTS } from '@/app/constants'
import { useProfitReportQuery } from '@/app/hooks/queries/useReportsQuery'

export function ProfitReportScreen() {
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  useProfitReportQuery(range)

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description={REPORTS.profit.description} />
      <DateRangeFilter value={range} onChange={setRange} />
      <EmptyState
        title={REPORTS.profit.emptyTitle}
        description={REPORTS.profit.emptyHint}
      />
    </div>
  )
}
