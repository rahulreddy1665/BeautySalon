import { useMemo, useState } from 'react'

import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Separator } from '@/app/components/ui/separator'
import { BILLING, COMMON, TIP_CHIP_AMOUNTS } from '@/app/constants'

/** SPEC order: UPI, Card, Cash (one mode only). */
const PAYMENT_CHIP_ORDER = ['upi', 'card', 'cash'] as const
import {
  lineDisplayAmounts,
  previewTipAllocations,
  selectCartTotals,
  type BillingCartState,
  type CartLine,
} from '@/app/state/redux/slices/billingCartSlice'
import { cn, formatINR } from '@/app/utils'

function shortStaffName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return name
  if (parts.length === 1) return parts[0]!
  const last = parts[parts.length - 1]!
  return `${parts[0]} ${last.slice(0, 1)}.`
}

function discountLabel(line: CartLine): string | null {
  const { disc } = lineDisplayAmounts(line)
  if (disc <= 0) return null
  if (line.discount.type === 'percent') {
    return `${line.discount.value}% off`
  }
  return `${formatINR(disc)} off`
}

function lineStaffSummary(line: CartLine): string | null {
  if (line.kind === 'combo') {
    const names = (line.components ?? [])
      .map((c) => c.staffName?.trim())
      .filter(Boolean)
      .map((name) => shortStaffName(name!))
    if (names.length === 0) return null
    return [...new Set(names)].join(', ')
  }
  return line.staffName ? shortStaffName(line.staffName) : null
}

function LineSummaryRow({ line }: { line: CartLine }) {
  const { net, disc } = lineDisplayAmounts(line)
  const staff = lineStaffSummary(line)
  const discText = discountLabel(line)
  const meta = [staff, discText].filter(Boolean).join(' · ')

  return (
    <div className="space-y-0.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm leading-snug">
            {BILLING.new.qtyTimes
              .replace('{name}', line.name)
              .replace('{qty}', String(line.qty))}
          </p>
          {meta ? (
            <p className="text-[11px] text-muted-foreground">{meta}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-sm tabular-nums">{formatINR(net)}</p>
      </div>
      {disc > 0 ? (
        <p className="text-right text-[11px] tabular-nums text-success">
          −{formatINR(disc)}
        </p>
      ) : null}
    </div>
  )
}

export type BillSummaryHandlers = {
  onRedeem: (n: number) => void
  onUseMax: () => void
  onTip: (n: number) => void
  onPaymentMode: (m: 'cash' | 'upi' | 'card') => void
  onCashReceived: (n: number) => void
  onNotes: (notes: string) => void
}

export function BillSummaryBody({
  totals,
  cart,
  loyaltyEnabled,
  availablePoints,
  maxRedeemPoints,
  cgstRate,
  sgstRate,
  showRoundOff,
  idPrefix = '',
  ...handlers
}: {
  totals: ReturnType<typeof selectCartTotals>
  cart: BillingCartState
  loyaltyEnabled: boolean
  availablePoints: number
  /** Cap from balance + max redeem % of bill. */
  maxRedeemPoints: number
  cgstRate: number
  sgstRate: number
  showRoundOff: boolean
  idPrefix?: string
} & BillSummaryHandlers) {
  const [customTip, setCustomTip] = useState(
    () => cart.tip > 0 && !TIP_CHIP_AMOUNTS.includes(cart.tip as (typeof TIP_CHIP_AMOUNTS)[number]),
  )

  const serviceLines = cart.lines.filter((l) => l.kind === 'service')
  const comboLines = cart.lines.filter((l) => l.kind === 'combo')
  const productLines = cart.lines.filter((l) => l.kind === 'product')
  const tipAllocations = useMemo(
    () => previewTipAllocations(cart.tip, cart.lines),
    [cart.tip, cart.lines],
  )

  const tipNote = (() => {
    if (cart.lines.length === 0) return BILLING.new.tipAssignEmpty
    if (cart.tip <= 0) return null
    if (tipAllocations.length === 0) return BILLING.new.tipAssignEmpty
    if (tipAllocations.length === 1) {
      return BILLING.new.tipGoesTo.replace(
        '{name}',
        shortStaffName(tipAllocations[0]!.staffName),
      )
    }
    const names = tipAllocations.map((a) => shortStaffName(a.staffName))
    const joined =
      names.length === 2
        ? `${names[0]} and ${names[1]}`
        : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
    const each = tipAllocations[0]?.amount ?? 0
    return BILLING.new.tipSplitEqually
      .replace('{names}', joined)
      .replace('{amount}', formatINR(each))
  })()

  const totalDiscount = totals.serviceDiscount + totals.productDiscount

  return (
    <div className="space-y-3 text-sm">
      {serviceLines.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {BILLING.new.servicesCount.replace('{count}', String(serviceLines.length))}
          </p>
          <div className="space-y-2">
            {serviceLines.map((line) => (
              <LineSummaryRow key={line.id} line={line} />
            ))}
          </div>
        </div>
      ) : null}

      {comboLines.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {BILLING.new.combosCount.replace('{count}', String(comboLines.length))}
          </p>
          <div className="space-y-2">
            {comboLines.map((line) => (
              <LineSummaryRow key={line.id} line={line} />
            ))}
          </div>
        </div>
      ) : null}

      {productLines.length > 0 ? (
        <div className="space-y-2">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {BILLING.new.productsCount.replace('{count}', String(productLines.length))}
          </p>
          <div className="space-y-2">
            {productLines.map((line) => (
              <LineSummaryRow key={line.id} line={line} />
            ))}
          </div>
        </div>
      ) : null}

      {cart.lines.length === 0 ? (
        <p className="text-muted-foreground">{BILLING.new.emptyBillItems}</p>
      ) : null}

      <Separator />

      <div className="space-y-1">
        <div className="flex justify-between tabular-nums">
          <span>{BILLING.new.gross}</span>
          <span>{formatINR(totals.serviceGross + totals.productGross)}</span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span>{BILLING.new.discountLabel}</span>
          <span className={cn(totalDiscount > 0 && 'text-success')}>
            −{formatINR(totalDiscount)}
          </span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span>{BILLING.new.taxable}</span>
          <span>{formatINR(totals.subtotal)}</span>
        </div>
        {totals.gstEnabled ? (
          <>
            <div className="flex justify-between tabular-nums text-muted-foreground">
              <span>
                {BILLING.new.cgstRate.replace('{rate}', String(cgstRate))}
              </span>
              <span>{formatINR(totals.cgst)}</span>
            </div>
            <div className="flex justify-between tabular-nums text-muted-foreground">
              <span>
                {BILLING.new.sgstRate.replace('{rate}', String(sgstRate))}
              </span>
              <span>{formatINR(totals.sgst)}</span>
            </div>
          </>
        ) : null}
      </div>

      {loyaltyEnabled ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="redeem">{BILLING.new.loyaltyRedeem}</Label>
            <span className="text-xs text-muted-foreground">
              {BILLING.new.availablePoints} {availablePoints}
              {' · '}
              {BILLING.new.maxRedeemPoints.replace(
                '{qty}',
                String(maxRedeemPoints),
              )}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="redeem"
              type="number"
              min={0}
              max={maxRedeemPoints}
              className="h-10"
              value={cart.loyaltyRedeemPoints || ''}
              onChange={(e) => handlers.onRedeem(Number(e.target.value) || 0)}
              aria-label={BILLING.new.redeemPoints}
            />
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={maxRedeemPoints <= 0}
              onClick={handlers.onUseMax}
            >
              {BILLING.new.useMax}
            </Button>
          </div>
          {totals.loyaltyRedeemValue > 0 ? (
            <div className="flex justify-between tabular-nums text-success">
              <span>{BILLING.new.loyaltyRedeem}</span>
              <span>−{formatINR(totals.loyaltyRedeemValue)}</span>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        <Label>{BILLING.new.tip}</Label>
        <div className="flex flex-wrap gap-1.5">
          <Button
            type="button"
            size="sm"
            variant={cart.tip === 0 && !customTip ? 'default' : 'outline'}
            className="h-9"
            onClick={() => {
              setCustomTip(false)
              handlers.onTip(0)
            }}
          >
            {BILLING.new.noTip}
          </Button>
          {TIP_CHIP_AMOUNTS.map((amt) => (
            <Button
              key={amt}
              type="button"
              size="sm"
              variant={cart.tip === amt && !customTip ? 'default' : 'outline'}
              className="h-9"
              onClick={() => {
                setCustomTip(false)
                handlers.onTip(amt)
              }}
            >
              {formatINR(amt)}
            </Button>
          ))}
          <Button
            type="button"
            size="sm"
            variant={customTip ? 'default' : 'outline'}
            className="h-9"
            onClick={() => setCustomTip(true)}
          >
            {BILLING.new.customTip}
          </Button>
        </div>
        {customTip ? (
          <Input
            type="number"
            min={0}
            className="h-10"
            value={cart.tip || ''}
            onChange={(e) => handlers.onTip(Number(e.target.value) || 0)}
            aria-label={BILLING.new.customTip}
          />
        ) : null}
        {tipNote ? (
          <p className="text-[11px] text-muted-foreground">{tipNote}</p>
        ) : null}
      </div>

      {showRoundOff && totals.roundOff !== 0 ? (
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.roundOff}</span>
          <span>
            {totals.roundOff > 0 ? '+' : ''}
            {formatINR(totals.roundOff)}
          </span>
        </div>
      ) : null}

      <div className="rounded-full bg-primary px-5 py-3 text-primary-foreground">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-semibold leading-none">
            {BILLING.new.payable}
          </span>
          <span className="text-2xl font-semibold leading-none tabular-nums tracking-tight">
            {formatINR(totals.payable)}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor={`${idPrefix}bill-notes`}>{BILLING.new.notes}</Label>
        <Input
          id={`${idPrefix}bill-notes`}
          value={cart.notes}
          placeholder={BILLING.new.notesPlaceholder}
          className="h-10"
          onChange={(e) => handlers.onNotes(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">{BILLING.new.paymentMode}</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_CHIP_ORDER.map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={cart.paymentMode === mode ? 'default' : 'outline'}
              className="h-9"
              onClick={() => handlers.onPaymentMode(mode)}
            >
              {COMMON.paymentMode[mode]}
            </Button>
          ))}
        </div>
        {cart.paymentMode === 'cash' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor={`${idPrefix}cash-recv`}>{BILLING.new.amountReceived}</Label>
              <Input
                id={`${idPrefix}cash-recv`}
                type="number"
                min={0}
                className="h-10"
                value={cart.cashReceived || ''}
                onChange={(e) =>
                  handlers.onCashReceived(Number(e.target.value) || 0)
                }
              />
            </div>
            <div className="space-y-1">
              <Label>{BILLING.new.changeToReturn}</Label>
              <p className="flex h-10 items-center text-sm font-medium tabular-nums">
                {formatINR(totals.change)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function BillSummaryPanel({
  totals,
  cart,
  loyaltyEnabled,
  availablePoints,
  maxRedeemPoints,
  cgstRate,
  sgstRate,
  showRoundOff,
  canCheckout,
  checkoutReason,
  collectLabel,
  saving,
  onCollect,
  idPrefix = '',
  ...handlers
}: {
  totals: ReturnType<typeof selectCartTotals>
  cart: BillingCartState
  loyaltyEnabled: boolean
  availablePoints: number
  maxRedeemPoints: number
  cgstRate: number
  sgstRate: number
  showRoundOff: boolean
  canCheckout: boolean
  checkoutReason: string
  collectLabel: string
  saving: boolean
  onCollect: () => void
  idPrefix?: string
} & BillSummaryHandlers) {
  return (
    <Card className="min-w-0">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{BILLING.new.summaryTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <BillSummaryBody
          totals={totals}
          cart={cart}
          loyaltyEnabled={loyaltyEnabled}
          availablePoints={availablePoints}
          maxRedeemPoints={maxRedeemPoints}
          cgstRate={cgstRate}
          sgstRate={sgstRate}
          showRoundOff={showRoundOff}
          idPrefix={idPrefix}
          {...handlers}
        />
        <Button
          type="button"
          className="min-touch h-11 w-full"
          disabled={!canCheckout || saving}
          onClick={onCollect}
        >
          {saving ? BILLING.new.saving : collectLabel}
        </Button>
        {!canCheckout ? (
          <p className="text-center text-xs text-muted-foreground">
            {checkoutReason}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
