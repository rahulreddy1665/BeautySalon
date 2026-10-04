import { Trash2 } from 'lucide-react'
import { useEffect, useRef } from 'react'

import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { BILLING, COMMON } from '@/app/constants'
import {
  lineDisplayAmounts,
  type CartLine,
} from '@/app/state/redux/slices/billingCartSlice'
import { cn, formatINR } from '@/app/utils'

/**
 * ONE shared grid for header + every row.
 * Keyed off card container width (not viewport): sidebar + summary make the
 * card far narrower than the viewport, and these fixed tracks need ~800px+.
 * Only Item is flexible; every other track is fixed px — no fr/auto/% on them.
 */
const ROW_GRID =
  [
    '@[800px]:grid',
    '@[800px]:grid-cols-[minmax(220px,1fr)_104px_84px_170px_96px_36px]',
    '@[800px]:items-start',
    '@[800px]:gap-x-3',
    '@[900px]:grid-cols-[minmax(280px,1fr)_104px_84px_190px_96px_36px]',
  ].join(' ')

const FIRST_LINE = 'flex h-10 items-center'

function QtyStepper({ qty, onChange }: { qty: number; onChange: (qty: number) => void }) {
  return (
    <div className="flex h-10 w-[104px] shrink-0 items-stretch overflow-hidden rounded-md border border-input">
      <button
        type="button"
        className="flex w-9 items-center justify-center text-sm hover:bg-muted"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label={BILLING.new.decreaseQty}
      >
        −
      </button>
      <span className="flex flex-1 items-center justify-center text-sm tabular-nums">
        {qty}
      </span>
      <button
        type="button"
        className="flex w-9 items-center justify-center text-sm hover:bg-muted"
        onClick={() => onChange(qty + 1)}
        aria-label={BILLING.new.increaseQty}
      >
        +
      </button>
    </div>
  )
}

function DiscountTypeToggle({
  type,
  onChange,
}: {
  type: 'percent' | 'amount'
  onChange: (type: 'percent' | 'amount') => void
}) {
  return (
    <div className="inline-flex h-10 shrink-0 overflow-hidden rounded-md border border-input">
      <button
        type="button"
        className={cn(
          'px-2.5 text-xs',
          type === 'percent' ? 'bg-muted font-medium' : 'hover:bg-muted/60',
        )}
        onClick={() => onChange('percent')}
      >
        {BILLING.new.percent}
      </button>
      <button
        type="button"
        className={cn(
          'border-l border-input px-2.5 text-xs',
          type === 'amount' ? 'bg-muted font-medium' : 'hover:bg-muted/60',
        )}
        onClick={() => onChange('amount')}
      >
        {BILLING.new.amount}
      </button>
    </div>
  )
}

function LineRow({
  line,
  staffOptions,
  maxDiscountPercent,
  onPatch,
  onRemove,
  focusStaff,
  onFocusStaffHandled,
}: {
  line: CartLine
  staffOptions: Array<{ _id: string; name: string }>
  maxDiscountPercent: number
  onPatch: (patch: Partial<CartLine>) => void
  onRemove: () => void
  focusStaff?: boolean
  onFocusStaffHandled?: () => void
}) {
  const amounts = lineDisplayAmounts(line)
  const staffLabel = line.kind === 'service' ? BILLING.new.stylist : BILLING.new.soldBy
  const staffTriggerRef = useRef<HTMLButtonElement>(null)
  const unlimited = maxDiscountPercent >= 100

  useEffect(() => {
    if (!focusStaff) return
    staffTriggerRef.current?.focus()
    onFocusStaffHandled?.()
  }, [focusStaff, onFocusStaffHandled])

  const clampDiscount = (type: 'percent' | 'amount', value: number) => {
    const v = Math.max(0, value)
    if (unlimited) return v
    if (type === 'percent') return Math.min(v, maxDiscountPercent)
    const maxAmount = (amounts.gross * maxDiscountPercent) / 100
    return Math.min(v, maxAmount)
  }

  const discountNote =
    amounts.disc > 0
      ? BILLING.new.discountOff.replace('{amount}', formatINR(amounts.disc))
      : BILLING.new.noDiscount

  const patchDiscountType = (type: 'percent' | 'amount') =>
    onPatch({
      discount: { type, value: clampDiscount(type, line.discount.value) },
    })

  const patchDiscountValue = (raw: number) =>
    onPatch({
      discount: {
        ...line.discount,
        value: clampDiscount(line.discount.type, raw),
      },
    })

  const staffSelect = (fullWidth: boolean) => (
    <Select
      value={line.staffId ?? ''}
      onValueChange={(staffId) => {
        const staff = staffOptions.find((s) => s._id === staffId)
        onPatch({ staffId, staffName: staff?.name })
      }}
    >
      <SelectTrigger
        ref={staffTriggerRef}
        title={line.staffName}
        className={cn(
          // min-w-0 so nowrap value text cannot inflate the track and clip the ring
          'h-10 min-w-0 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
          fullWidth ? 'w-full' : 'w-full max-w-[240px]',
        )}
      >
        <SelectValue placeholder={staffLabel} />
      </SelectTrigger>
      <SelectContent>
        {staffOptions.map((staff) => (
          <SelectItem key={staff._id} value={staff._id}>
            {staff.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <>
      {/* Stacked when the card is too narrow for the fixed tracks */}
      <div className="relative space-y-3 border-b border-border py-3 last:border-0 @[800px]:hidden">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute top-3 right-0 size-9"
          onClick={onRemove}
          aria-label={COMMON.actions.delete}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
        <div className="min-w-0 pr-12">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <Badge
              variant="outline"
              className={cn(
                'shrink-0 font-normal text-[10px] uppercase',
                line.kind === 'product' &&
                  'border-gold-deep/30 bg-gold-soft text-gold-deep',
              )}
            >
              {line.kind === 'service'
                ? BILLING.new.badgeService
                : BILLING.new.badgeProduct}
            </Badge>
            <p className="line-clamp-2 text-sm font-medium" title={line.name}>
              {line.name}
            </p>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{staffLabel}</p>
          <div className="mt-1">{staffSelect(true)}</div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <QtyStepper qty={line.qty} onChange={(qty) => onPatch({ qty })} />
          <p className="text-sm font-semibold tabular-nums">{formatINR(amounts.net)}</p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <DiscountTypeToggle
              type={line.discount.type}
              onChange={patchDiscountType}
            />
            <Input
              type="number"
              min={0}
              className="h-10 w-[72px] focus-visible:ring-inset"
              value={line.discount.value || ''}
              onChange={(e) => patchDiscountValue(Number(e.target.value) || 0)}
              aria-label={BILLING.new.lineDiscount}
            />
          </div>
          <p
            className={cn(
              'text-[11px]',
              amounts.disc > 0 ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {discountNote}
          </p>
        </div>
      </div>

      {/* Wide card — replaced layout, shared ROW_GRID */}
      <div className={`hidden border-b border-border py-3 last:border-0 ${ROW_GRID}`}>
        {/* Item & stylist — only flexible track; name wraps (2 lines), never few-char ellipsis */}
        <div className="min-w-0 space-y-1.5 pr-0.5">
          <div className="flex min-h-10 min-w-0 items-start gap-2">
            <Badge
              variant="outline"
              className={cn(
                'mt-2.5 shrink-0 px-1.5 py-0 font-normal text-[10px] leading-5 uppercase tracking-wide',
                line.kind === 'product' &&
                  'border-gold-deep/30 bg-gold-soft text-gold-deep',
              )}
            >
              {line.kind === 'service'
                ? BILLING.new.badgeService
                : BILLING.new.badgeProduct}
            </Badge>
            <p
              className="min-w-0 flex-1 py-2.5 text-sm font-medium leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden"
              title={line.name}
            >
              {line.name}
            </p>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {staffLabel}
            </span>
            <div className="min-w-0 max-w-[240px] flex-1 basis-[160px]">
              {staffSelect(false)}
            </div>
          </div>
        </div>

        {/* Qty */}
        <div className={cn(FIRST_LINE, 'justify-center')}>
          <QtyStepper qty={line.qty} onChange={(qty) => onPatch({ qty })} />
        </div>

        {/* Price — first-line box */}
        <div className={cn(FIRST_LINE, 'justify-end')}>
          <p className="text-sm tabular-nums">{formatINR(line.unitPrice)}</p>
        </div>

        {/* Line discount */}
        <div className="min-w-0 space-y-1 pr-0.5">
          <div className={cn(FIRST_LINE, 'gap-1.5')}>
            <DiscountTypeToggle
              type={line.discount.type}
              onChange={patchDiscountType}
            />
            <Input
              type="number"
              min={0}
              className="h-10 w-[72px] shrink-0 focus-visible:ring-inset"
              value={line.discount.value || ''}
              onChange={(e) => patchDiscountValue(Number(e.target.value) || 0)}
              aria-label={BILLING.new.lineDiscount}
            />
          </div>
          <p
            className={cn(
              'text-[11px] tabular-nums',
              amounts.disc > 0 ? 'text-success' : 'text-muted-foreground',
            )}
          >
            {discountNote}
          </p>
        </div>

        {/* Net */}
        <div className={cn(FIRST_LINE, 'justify-end')}>
          <p className="text-sm font-semibold tabular-nums">{formatINR(amounts.net)}</p>
        </div>

        {/* Delete */}
        <div className={cn(FIRST_LINE, 'justify-end')}>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground focus-visible:ring-inset"
            onClick={onRemove}
            aria-label={COMMON.actions.delete}
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </>
  )
}

export function BillItemsCard({
  lines,
  staffOptions,
  maxDiscountPercent,
  onPatch,
  onRemove,
  focusStaffLineId,
  onFocusStaffHandled,
}: {
  lines: CartLine[]
  staffOptions: Array<{ _id: string; name: string }>
  maxDiscountPercent: number
  onPatch: (id: string, patch: Partial<CartLine>) => void
  onRemove: (id: string) => void
  focusStaffLineId?: string | null
  onFocusStaffHandled?: () => void
}) {
  const ordered = [
    ...lines.filter((l) => l.kind === 'service'),
    ...lines.filter((l) => l.kind === 'product'),
  ]

  return (
    <Card className="min-w-0 overflow-hidden rounded-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">
          {BILLING.new.billItemsTitle.replace('{count}', String(lines.length))}
        </CardTitle>
      </CardHeader>
      {/* @container: grid tracks key off card width. 2px pad keeps focus rings inside the clipped radius. */}
      <CardContent className="@container min-w-0 px-[calc(1rem+2px)]">
        {ordered.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">
            {BILLING.new.emptyBillItems}
          </p>
        ) : (
          <div className="min-w-0">
            <div
              className={cn(
                'mb-1 hidden text-[11px] font-medium uppercase tracking-wide text-muted-foreground',
                ROW_GRID,
              )}
            >
              <span className="whitespace-nowrap">{BILLING.new.itemAndStylist}</span>
              <span className="text-center whitespace-nowrap">{BILLING.new.qty}</span>
              <span className="text-right whitespace-nowrap">{BILLING.new.price}</span>
              <span className="whitespace-nowrap">{BILLING.new.lineDiscount}</span>
              <span className="text-right whitespace-nowrap">{BILLING.new.net}</span>
              <span />
            </div>
            {ordered.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                staffOptions={staffOptions}
                maxDiscountPercent={maxDiscountPercent}
                onPatch={(patch) => onPatch(line.id, patch)}
                onRemove={() => onRemove(line.id)}
                focusStaff={focusStaffLineId === line.id}
                onFocusStaffHandled={onFocusStaffHandled}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
