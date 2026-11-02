import { useMemo, useState } from 'react'

import { SearchableSelect } from '@/app/components/ui/searchable-select'
import {
  useCustomerQuery,
  useCustomersPageQuery,
} from '@/app/hooks/queries/useCustomersQuery'
import { useDebouncedValue } from '@/app/hooks/useDebouncedValue'
import type { Customer } from '@/app/service/customers/customersApi'

function customerLabel(c: Pick<Customer, 'name' | 'lastName' | 'phone'>): string {
  const name = [c.name, c.lastName].filter(Boolean).join(' ')
  return name || String(c.phone ?? '')
}

interface CustomerPickerProps {
  value?: string
  onChange: (customerId: string, customer: Customer | undefined) => void
  placeholder?: string
  disabled?: boolean
  'aria-invalid'?: boolean
}

/**
 * Searchable customer picker backed by server search (name, email or phone).
 * Loads 20 matches at a time instead of every customer, so it scales to any size.
 */
export function CustomerPicker({
  value,
  onChange,
  placeholder = 'Search name or phone',
  disabled,
  'aria-invalid': ariaInvalid,
}: CustomerPickerProps) {
  const [query, setQuery] = useState('')
  const debounced = useDebouncedValue(query.trim())
  const results = useCustomersPageQuery({ q: debounced || undefined, limit: 20 })
  const selected = useCustomerQuery(value || undefined)

  const items = useMemo(() => results.data?.items ?? [], [results.data])
  const options = useMemo(
    () =>
      items.map((c) => ({
        value: c._id,
        label: customerLabel(c),
        hint: String(c.phone ?? ''),
      })),
    [items],
  )

  return (
    <SearchableSelect
      value={value}
      onValueChange={(id) => onChange(id, items.find((c) => c._id === id))}
      options={options}
      onQueryChange={setQuery}
      loading={results.isFetching}
      selectedLabel={selected.data ? customerLabel(selected.data) : undefined}
      placeholder={placeholder}
      searchPlaceholder="Search name or phone"
      emptyText="No customers match"
      disabled={disabled}
      aria-invalid={ariaInvalid}
    />
  )
}
