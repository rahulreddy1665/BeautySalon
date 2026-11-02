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
    // Lower floor so the table still fits with a full sidebar + summary column.
    '@[680px]:grid',
    '@[680px]:grid-cols-[minmax(180px,1fr)_104px_76px_190px_80px_36px]',
    '@[680px]:items-start',
    '@[680px]:gap-x-3',
    '@[820px]:grid-cols-[minmax(220px,1fr)_104px_84px_200px_88px_36px]',
  ].join(' ')

const FIRST_LINE = 'flex h-10 items-center'

function ComboStaffRow({
  line,
  staffOptions,
  onPatch,
  className,
}: {
  line: CartLine
  staffOptions: Array<{ _id: string; name: string }>
  onPatch: (patch: Partial<CartLine>) => void
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-nowrap items-center gap-x-3 overflow-x-auto pb-0.5',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {BILLING.new.applyToAllStaff}
        </span>
        <Select
          value=""
          onValueChange={(staffId) => {
            const staff = staffOptions.find((s) => s._id === staffId)
            onPatch({
              components: (line.components ?? []).map((c) => ({
                ...c,
                staffId,
                staffName: staff?.name,
              })),
              staffId,
              staffName: staff?.name,
            })
          }}
        >
          <SelectTrigger
            size="sm"
            className="h-6 w-[7.5rem] shrink-0 px-2 text-xs data-[size=sm]:h-6"
          >
            <SelectValue placeholder={BILLING.new.applyToAllStaff} />
          </SelectTrigger>
          <SelectContent>
            {staffOptions.map((staff) => (
              <SelectItem key={staff._id} value={staff._id}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {(line.components ?? []).map((comp, idx) => (
        <div
          key={comp.serviceId}
          className="flex shrink-0 items-center gap-1.5"
        >
          <span className="max-w-[6.5rem] truncate text-[11px] text-muted-foreground">
            {comp.name}
          </span>
          <Select
            value={comp.staffId ?? ''}
            onValueChange={(staffId) => {
              const staff = staffOptions.find((s) => s._id === staffId)
              const components = [...(line.components ?? [])]
              components[idx] = {
                ...comp,
                staffId,
                staffName: staff?.name,
              }
              onPatch({ components })
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-6 w-[7.5rem] shrink-0 px-2 text-xs data-[size=sm]:h-6"
            >
              <SelectValue placeholder={BILLING.new.stylist} />
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((staff) => (
                <SelectItem key={staff._id} value={staff._id}>
                  {staff.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}

function QtyStepper({
  qty,
  onChange,
  max,
}: {
  qty: number
  onChange: (qty: number) => void
  /** When set, + cannot exceed this value. */
  max?: number
}) {
  const atMax = max !== undefined && qty >= max
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
        className="flex w-9 items-center justify-center text-sm hover:bg-muted disabled:opacity-40"
        disabled={atMax}
        onClick={() =>
          onChange(max !== undefined ? Math.min(max, qty + 1) : qty + 1)
        }
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
  maxQty,
  onPatch,
  onRemove,
  focusStaff,
  onFocusStaffHandled,
}: {
  line: CartLine
  staffOptions: Array<{ _id: string; name: string }>
  maxDiscountPercent: number
  maxQty?: number
  onPatch: (patch: Partial<CartLine>) => void
  onRemove: () => void
  focusStaff?: boolean
  onFocusStaffHandled?: () => void
}) {
  const setQty = (qty: number) => {
    const next = Math.max(1, Math.floor(qty))
    onPatch({
      qty: maxQty !== undefined ? Math.min(maxQty, next) : next,
    })
  }
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
        size="sm"
        className={cn(
          'h-6 min-w-0 px-2 text-xs focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring data-[size=sm]:h-6',
          fullWidth ? 'w-full max-w-[60%]' : 'w-full max-w-[144px]',
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
      <div className="relative space-y-3 border-b border-border py-3 last:border-0 @[680px]:hidden">
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
              className="shrink-0 border-gold-deep/30 bg-gold-soft font-normal text-[10px] text-gold-deep uppercase"
            >
              {line.kind === 'combo'
                ? BILLING.new.badgeCombo
                : line.kind === 'service'
                  ? BILLING.new.badgeService
                  : BILLING.new.badgeProduct}
            </Badge>
            <p className="line-clamp-2 text-sm font-medium" title={line.name}>
              {line.name}
            </p>
          </div>
          {line.kind === 'combo' ? (
            <ComboStaffRow
              className="mt-2"
              line={line}
              staffOptions={staffOptions}
              onPatch={onPatch}
            />
          ) : (
            <>
              <p className="mt-1 text-xs text-muted-foreground">{staffLabel}</p>
              <div className="mt-1">{staffSelect(true)}</div>
            </>
          )}
        </div>
        <div className="flex items-center justify-between gap-3">
          <QtyStepper qty={line.qty} max={maxQty} onChange={setQty} />
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
      <div className="hidden border-b border-border py-3 last:border-0 @[680px]:block">
        <div className={ROW_GRID}>
          {/* Item & stylist — only flexible track; name wraps (2 lines), never few-char ellipsis */}
          <div className="min-w-0 space-y-1.5 pr-0.5">
            <div className="flex min-h-10 min-w-0 items-start gap-2">
              <Badge
                variant="outline"
                className="mt-2.5 shrink-0 border-gold-deep/30 bg-gold-soft px-1.5 py-0 font-normal text-[10px] leading-5 text-gold-deep uppercase tracking-wide"
              >
                {line.kind === 'combo'
                  ? BILLING.new.badgeCombo
                  : line.kind === 'service'
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
            {line.kind !== 'combo' ? (
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {staffLabel}
                </span>
                <div className="min-w-0 max-w-[144px] flex-1 basis-[96px]">
                  {staffSelect(false)}
                </div>
              </div>
            ) : null}
          </div>

          {/* Qty */}
          <div className={cn(FIRST_LINE, 'justify-center')}>
            <QtyStepper qty={line.qty} max={maxQty} onChange={setQty} />
          </div>

          {/* Price — first-line box */}
          <div className={cn(FIRST_LINE, 'justify-end')}>
            <p className="text-sm tabular-nums">{formatINR(line.unitPrice)}</p>
          </div>

          {/* Line discount — slight left pad keeps a gap after Price without a dead zone before Net */}
          <div className="min-w-0 space-y-1 pl-1.5">
            <div className={cn(FIRST_LINE, 'gap-1.5')}>
              <DiscountTypeToggle
                type={line.discount.type}
                onChange={patchDiscountType}
              />
              <Input
                type="number"
                min={0}
                className="h-10 w-[80px] shrink-0 focus-visible:ring-inset"
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
            <p className="text-sm font-semibold tabular-nums">
              {formatINR(amounts.net)}
            </p>
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
        {line.kind === 'combo' ? (
          <ComboStaffRow
            className="mt-1.5"
            line={line}
            staffOptions={staffOptions}
            onPatch={onPatch}
          />
        ) : null}
      </div>
    </>
  )
}

export function BillItemsCard({
  lines,
  staffOptions,
  maxDiscountPercent,
  maxQtyByLineId,
  onPatch,
  onRemove,
  focusStaffLineId,
  onFocusStaffHandled,
}: {
  lines: CartLine[]
  staffOptions: Array<{ _id: string; name: string }>
  maxDiscountPercent: number
  /** Per-line qty ceiling for tracked stock (undefined = uncapped). */
  maxQtyByLineId?: Record<string, number | undefined>
  onPatch: (id: string, patch: Partial<CartLine>) => void
  onRemove: (id: string) => void
  focusStaffLineId?: string | null
  onFocusStaffHandled?: () => void
}) {
  const ordered = [
    ...lines.filter((l) => l.kind === 'service' || l.kind === 'combo'),
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
              <span className="pl-1.5 whitespace-nowrap">{BILLING.new.lineDiscount}</span>
              <span className="text-right whitespace-nowrap">{BILLING.new.net}</span>
              <span />
            </div>
            {ordered.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                staffOptions={staffOptions}
                maxDiscountPercent={maxDiscountPercent}
                maxQty={maxQtyByLineId?.[line.id]}
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
