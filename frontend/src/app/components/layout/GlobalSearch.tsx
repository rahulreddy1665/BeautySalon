import { format, parseISO } from 'date-fns'
import { FileText, Search, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/app/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet'
import { Input } from '@/app/components/ui/input'
import { COMMON, ROUTES } from '@/app/constants'
import { useHasPermission } from '@/app/hooks/useHasPermission'
import { customersApi } from '@/app/service/customers/customersApi'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { cn } from '@/app/utils'

type Hit =
  | { kind: 'customer'; id: string; title: string; subtitle: string }
  | { kind: 'invoice'; id: string; title: string; subtitle: string }

async function runSearch(
  q: string,
  canCustomers: boolean,
  canInvoices: boolean,
): Promise<Hit[]> {
  const query = q.trim()
  if (query.length < 2) return []
  const hits: Hit[] = []

  if (canCustomers) {
    const all = await customersApi.getAll()
    const lower = query.toLowerCase()
    for (const c of all) {
      const name = [c.name, c.lastName].filter(Boolean).join(' ')
      const phone = String(c.phone ?? '')
      const id = c._id
      if (
        name.toLowerCase().includes(lower) ||
        phone.includes(query.replace(/\D/g, '')) ||
        id.toLowerCase().includes(lower)
      ) {
        hits.push({
          kind: 'customer',
          id,
          title: name || phone,
          subtitle: phone,
        })
      }
      if (hits.length >= 8) break
    }
  }

  if (canInvoices) {
    const page = await invoicesApi.list({
      search: query,
      page: 1,
      limit: 8,
    })
    for (const inv of page.items) {
      const cust = inv.customer
      const name = inv.walkIn
        ? inv.walkInName || COMMON.nav.customers
        : [cust?.name, cust?.lastName].filter(Boolean).join(' ')
      hits.push({
        kind: 'invoice',
        id: inv._id,
        title: inv.invoiceNumber,
        subtitle: `${name} · ${format(parseISO(inv.createdAt), 'dd MMM yyyy')}`,
      })
    }
  }

  return hits.slice(0, 12)
}

function ResultsList({ hits, onPick }: { hits: Hit[]; onPick: (hit: Hit) => void }) {
  if (hits.length === 0) {
    return (
      <p className="px-3 py-4 text-sm text-muted-foreground">{COMMON.nav.searchEmpty}</p>
    )
  }
  return (
    <ul className="max-h-72 overflow-y-auto py-1">
      {hits.map((hit) => (
        <li key={`${hit.kind}-${hit.id}`}>
          <button
            type="button"
            className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
            onClick={() => onPick(hit)}
          >
            {hit.kind === 'customer' ? (
              <UserRound
                className="mt-0.5 size-4 shrink-0 text-gold-deep"
                strokeWidth={1.75}
              />
            ) : (
              <FileText
                className="mt-0.5 size-4 shrink-0 text-gold-deep"
                strokeWidth={1.75}
              />
            )}
            <span className="min-w-0">
              <span className="block truncate font-medium">{hit.title}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {hit.subtitle}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export function GlobalSearch({ className }: { className?: string }) {
  const navigate = useNavigate()
  const listId = useId()
  const wrapRef = useRef<HTMLDivElement>(null)
  const canCustomers = useHasPermission('customer:read')
  const canInvoices = useHasPermission('invoice:read')
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<Hit[]>([])
  const [open, setOpen] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (q.trim().length < 2) return
    let cancelled = false
    const t = window.setTimeout(() => {
      setLoading(true)
      void runSearch(q, canCustomers, canInvoices)
        .then((rows) => {
          if (!cancelled) {
            setHits(rows)
            setOpen(true)
          }
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [q, canCustomers, canInvoices])

  const visibleHits = q.trim().length < 2 ? [] : hits
  const showResults = open && q.trim().length >= 2

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const pick = (hit: Hit) => {
    setOpen(false)
    setSheetOpen(false)
    setQ('')
    if (hit.kind === 'customer') navigate(ROUTES.customerDetail(hit.id))
    else navigate(ROUTES.invoice(hit.id))
  }

  const field = (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        strokeWidth={1.75}
      />
      <Input
        value={q}
        onChange={(e) => {
          const next = e.target.value
          setQ(next)
          if (next.trim().length < 2) {
            setHits([])
            setOpen(false)
          }
        }}
        onFocus={() => q.trim().length >= 2 && setOpen(true)}
        placeholder={COMMON.nav.searchPlaceholder}
        className="h-10 rounded-full border-border bg-muted/60 pl-9 lg:h-10"
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open}
      />
    </div>
  )

  return (
    <>
      <div ref={wrapRef} className={cn('relative hidden min-w-0 lg:block', className)}>
        {field}
        {showResults ? (
          <div
            id={listId}
            className="absolute top-[calc(100%+6px)] left-0 z-50 w-full min-w-[280px] rounded-xl border border-border bg-popover shadow-popover"
            role="listbox"
          >
            {loading ? (
              <p className="px-3 py-4 text-sm text-muted-foreground">
                {COMMON.labels.loading}
              </p>
            ) : (
              <ResultsList hits={visibleHits} onPick={pick} />
            )}
          </div>
        ) : null}
      </div>

      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="size-10 shrink-0 rounded-full lg:hidden"
        aria-label={COMMON.nav.searchPlaceholder}
        onClick={() => setSheetOpen(true)}
      >
        <Search className="size-4" strokeWidth={1.75} />
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="top" className="rounded-b-2xl pt-safe">
          <SheetHeader>
            <SheetTitle className="text-sm">{COMMON.nav.searchPlaceholder}</SheetTitle>
          </SheetHeader>
          <div className="mt-2 space-y-2">
            {field}
            {loading ? (
              <p className="px-1 text-sm text-muted-foreground">
                {COMMON.labels.loading}
              </p>
            ) : q.trim().length >= 2 ? (
              <ResultsList hits={visibleHits} onPick={pick} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
