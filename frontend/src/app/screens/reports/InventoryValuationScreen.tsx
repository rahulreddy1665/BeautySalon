import { EmptyState } from '@/app/components/EmptyState'
import { PageHeader } from '@/app/components/PageHeader'
import { REPORTS } from '@/app/constants'
import { useInventoryValuationQuery } from '@/app/hooks/queries/useReportsQuery'

export function InventoryValuationScreen() {
  useInventoryValuationQuery()

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader description={REPORTS.inventory.description} />
      <EmptyState
        title={REPORTS.inventory.emptyTitle}
        description={REPORTS.inventory.emptyHint}
      />
    </div>
  )
}
