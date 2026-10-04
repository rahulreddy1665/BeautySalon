import { nanoid } from '@reduxjs/toolkit'
import { format } from 'date-fns'
import { Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import {
  CategorySuggestions,
  type SuggestableService,
} from '@/app/components/CategorySuggestions'
import { PageHeader } from '@/app/components/PageHeader'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select'
import { Separator } from '@/app/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet'
import { BILLING, COMMON, PAYMENT_MODES, TIP_CHIP_AMOUNTS, ROUTES } from '@/app/constants'
import { useAppointmentQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import {
  useBillingProductsQuery,
  useCreateBillMutation,
} from '@/app/hooks/queries/useBillingQuery'
import { useLoyaltyBalanceQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import {
  appointmentCustomerLabel,
  appointmentServiceId,
  appointmentStaffId,
  appointmentStaffName,
} from '@/app/service/appointments/appointmentsApi'
import {
  addLine,
  loadFromAppointment,
  removeLine,
  resetCart,
  selectCartTotals,
  beginCustomerSearch,
  setCashReceived,
  setCustomer,
  setLoyaltyRedeemPoints,
  setNotes,
  setPaymentMode,
  setPointsValueRatio,
  setProductDiscount,
  setServiceDiscount,
  setTip,
  setTipStaffId,
  setWalkIn,
  setWalkInDetails,
  updateLine,
  type BillingCartState,
  type CartLine,
} from '@/app/state/redux/slices/billingCartSlice'
import { formatINR, toErrorMessage } from '@/app/utils'

const ROW_GRID =
  'lg:grid lg:grid-cols-[minmax(0,1fr)_200px_112px_96px_104px_40px] lg:items-center lg:gap-x-3'

function QtyStepper({
  qty,
  onChange,
}: {
  qty: number
  onChange: (qty: number) => void
}) {
  return (
    <div className="flex h-11 w-[112px] items-stretch overflow-hidden rounded-md border border-input lg:h-10">
      <button
        type="button"
        className="flex w-9 items-center justify-center text-sm hover:bg-muted"
        onClick={() => onChange(Math.max(1, qty - 1))}
        aria-label={COMMON.actions.previous}
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
        aria-label={COMMON.actions.next}
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
    <div className="inline-flex h-11 overflow-hidden rounded-md border border-input lg:h-10">
      <button
        type="button"
        className={`px-3 text-sm ${type === 'amount' ? 'bg-muted font-medium' : 'hover:bg-muted/60'}`}
        onClick={() => onChange('amount')}
      >
        {BILLING.new.amount}
      </button>
      <button
        type="button"
        className={`border-l border-input px-3 text-sm ${type === 'percent' ? 'bg-muted font-medium' : 'hover:bg-muted/60'}`}
        onClick={() => onChange('percent')}
      >
        {BILLING.new.percent}
      </button>
    </div>
  )
}

function LineRow({
  line,
  staffOptions,
  onPatch,
  onRemove,
}: {
  line: CartLine
  staffOptions: Array<{ _id: string; name: string }>
  onPatch: (patch: Partial<CartLine>) => void
  onRemove: () => void
}) {
  const lineTotal = Math.max(0, line.unitPrice * line.qty)
  const staffPlaceholder =
    line.kind === 'service' ? BILLING.new.doneBy : BILLING.new.soldBy

  const staffSelect = (
    <Select
      value={line.staffId ?? ''}
      onValueChange={(staffId) => {
        const staff = staffOptions.find((s) => s._id === staffId)
        onPatch({ staffId, staffName: staff?.name })
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder={staffPlaceholder} />
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
      {/* Mobile card */}
      <div className="relative space-y-3 border-b border-border py-3 last:border-0 lg:hidden">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="absolute top-3 right-0"
          onClick={onRemove}
          aria-label={COMMON.actions.delete}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
        <div className="min-w-0 pr-12">
          <p
            className="line-clamp-2 text-sm font-medium"
            title={line.name}
          >
            {line.name}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatINR(line.unitPrice)}
          </p>
        </div>
        <div className="w-full">{staffSelect}</div>
        <div className="flex items-center justify-between gap-3">
          <QtyStepper
            qty={line.qty}
            onChange={(qty) => onPatch({ qty })}
          />
          <p className="text-sm font-medium tabular-nums">
            {formatINR(lineTotal)}
          </p>
        </div>
      </div>

      {/* Desktop row */}
      <div className={`hidden border-b border-border py-3 last:border-0 ${ROW_GRID}`}>
        <div className="min-w-0">
          <p
            className="line-clamp-2 text-sm font-medium"
            title={line.name}
          >
            {line.name}
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatINR(line.unitPrice)}
          </p>
        </div>
        <div className="min-w-0">{staffSelect}</div>
        <QtyStepper qty={line.qty} onChange={(qty) => onPatch({ qty })} />
        <p className="flex h-10 items-center justify-end text-sm tabular-nums">
          {formatINR(line.unitPrice)}
        </p>
        <p className="flex h-10 items-center justify-end text-sm font-medium tabular-nums">
          {formatINR(lineTotal)}
        </p>
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onRemove}
          aria-label={COMMON.actions.delete}
        >
          <Trash2 className="size-4" strokeWidth={1.75} />
        </Button>
      </div>
    </>
  )
}

function SectionFooterDiscount({
  subtotal,
  discount,
  onChange,
}: {
  subtotal: number
  discount: { type: 'percent' | 'amount'; value: number }
  onChange: (patch: Partial<{ type: 'percent' | 'amount'; value: number }>) => void
}) {
  const amount =
    discount.type === 'percent'
      ? Math.min(subtotal, (subtotal * discount.value) / 100)
      : Math.min(subtotal, discount.value)
  const net = Math.max(0, subtotal - amount)

  return (
    <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm">
      <div className="flex justify-end gap-6 tabular-nums">
        <span className="text-muted-foreground">{BILLING.new.subtotal}</span>
        <span className="w-24 text-right">{formatINR(subtotal)}</span>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span className="text-muted-foreground">{BILLING.new.discountLabel}</span>
        <DiscountTypeToggle
          type={discount.type}
          onChange={(type) => onChange({ type })}
        />
        <Input
          type="number"
          min={0}
          className="w-[120px]"
          value={discount.value || ''}
          onChange={(e) => onChange({ value: Number(e.target.value) || 0 })}
          aria-label={BILLING.new.discountLabel}
        />
        <span className="w-24 text-right tabular-nums text-muted-foreground">
          −{formatINR(amount)}
        </span>
      </div>
      <div className="flex justify-end gap-6 font-medium tabular-nums">
        <span>{BILLING.new.net}</span>
        <span className="w-24 text-right">{formatINR(net)}</span>
      </div>
    </div>
  )
}

function ItemSectionCard({
  title,
  addLabel,
  searchPlaceholder,
  emptyHint,
  staffHeader,
  lines,
  staffOptions,
  catalog,
  discount,
  onDiscount,
  onAdd,
  onPatch,
  onRemove,
}: {
  title: string
  addLabel: string
  searchPlaceholder: string
  emptyHint: string
  staffHeader: string
  lines: CartLine[]
  staffOptions: Array<{ _id: string; name: string }>
  catalog: Array<{ id: string; name: string; price: number }>
  discount: { type: 'percent' | 'amount'; value: number }
  onDiscount: (patch: Partial<{ type: 'percent' | 'amount'; value: number }>) => void
  onAdd: (id: string) => void
  onPatch: (id: string, patch: Partial<CartLine>) => void
  onRemove: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const results = useMemo(() => {
    const q = search.trim().toLowerCase()
    return catalog
      .filter((c) => !q || c.name.toLowerCase().includes(q))
      .slice(0, 8)
  }, [catalog, search])
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0)

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="relative w-full sm:max-w-xs lg:w-72">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={addLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) {
                e.preventDefault()
                onAdd(results[0].id)
                setSearch('')
              }
            }}
          />
          {search && results.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-card shadow-md">
              {results.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => {
                      onAdd(item.id)
                      setSearch('')
                    }}
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="ml-2 shrink-0 tabular-nums text-muted-foreground">
                      {formatINR(item.price)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {lines.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <>
            <div
              className={`mb-1 hidden text-xs text-muted-foreground ${ROW_GRID}`}
            >
              <span>{BILLING.new.item}</span>
              <span>{staffHeader}</span>
              <span>{BILLING.new.qty}</span>
              <span className="text-right">{BILLING.new.price}</span>
              <span className="text-right">{BILLING.new.total}</span>
              <span />
            </div>
            {lines.map((line) => (
              <LineRow
                key={line.id}
                line={line}
                staffOptions={staffOptions}
                onPatch={(patch) => onPatch(line.id, patch)}
                onRemove={() => onRemove(line.id)}
              />
            ))}
          </>
        )}
        <SectionFooterDiscount
          subtotal={subtotal}
          discount={discount}
          onChange={onDiscount}
        />
      </CardContent>
    </Card>
  )
}

function SummaryBody({
  totals,
  cart,
  loyaltyEnabled,
  availablePoints,
  staffOptions,
  onRedeem,
  onUseMax,
  onTip,
  onTipStaff,
  onPaymentMode,
  onCashReceived,
}: {
  totals: ReturnType<typeof selectCartTotals>
  cart: BillingCartState
  loyaltyEnabled: boolean
  availablePoints: number
  staffOptions: Array<{ _id: string; name: string }>
  onRedeem: (n: number) => void
  onUseMax: () => void
  onTip: (n: number) => void
  onTipStaff: (id: string | null) => void
  onPaymentMode: (m: 'cash' | 'upi' | 'card') => void
  onCashReceived: (n: number) => void
}) {
  const [customTip, setCustomTip] = useState(false)

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <p className="font-medium">{BILLING.new.servicesHeading}</p>
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.gross}</span>
          <span>{formatINR(totals.serviceGross)}</span>
        </div>
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.discountLabel}</span>
          <span>−{formatINR(totals.serviceDiscount)}</span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span>{BILLING.new.net}</span>
          <span>{formatINR(totals.serviceNet)}</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="font-medium">{BILLING.new.productsHeading}</p>
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.gross}</span>
          <span>{formatINR(totals.productGross)}</span>
        </div>
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.discountLabel}</span>
          <span>−{formatINR(totals.productDiscount)}</span>
        </div>
        <div className="flex justify-between tabular-nums">
          <span>{BILLING.new.net}</span>
          <span>{formatINR(totals.productNet)}</span>
        </div>
      </div>
      <Separator />
      <div className="flex justify-between tabular-nums font-medium">
        <span>{BILLING.new.subtotal}</span>
        <span>{formatINR(totals.subtotal)}</span>
      </div>
      {totals.gstEnabled ? (
        <>
          <div className="flex justify-between tabular-nums text-muted-foreground">
            <span>{BILLING.new.cgst}</span>
            <span>{formatINR(totals.cgst)}</span>
          </div>
          <div className="flex justify-between tabular-nums text-muted-foreground">
            <span>{BILLING.new.sgst}</span>
            <span>{formatINR(totals.sgst)}</span>
          </div>
        </>
      ) : null}
      {loyaltyEnabled ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="redeem">{BILLING.new.redeemPoints}</Label>
            <span className="text-xs text-muted-foreground">
              {BILLING.new.availablePoints} {availablePoints}
            </span>
          </div>
          <div className="flex gap-2">
            <Input
              id="redeem"
              type="number"
              min={0}
              className="min-touch h-11"
              value={cart.loyaltyRedeemPoints || ''}
              onChange={(e) => onRedeem(Number(e.target.value) || 0)}
            />
            <Button type="button" variant="outline" className="min-touch h-11" onClick={onUseMax}>
              {BILLING.new.useMax}
            </Button>
          </div>
          {totals.loyaltyRedeemValue > 0 ? (
            <div className="flex justify-between tabular-nums text-muted-foreground">
              <span>{BILLING.new.loyaltyRedeem}</span>
              <span>−{formatINR(totals.loyaltyRedeemValue)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      {totals.roundOff !== 0 ? (
        <div className="flex justify-between tabular-nums text-muted-foreground">
          <span>{BILLING.new.roundOff}</span>
          <span>{formatINR(totals.roundOff)}</span>
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
              onTip(0)
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
                onTip(amt)
              }}
            >
              {amt}
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
            className="min-touch h-11"
            value={cart.tip || ''}
            onChange={(e) => onTip(Number(e.target.value) || 0)}
          />
        ) : null}
        {cart.tip > 0 ? (
          <Select
            value={cart.tipStaffId ?? ''}
            onValueChange={(id) => onTipStaff(id || null)}
          >
            <SelectTrigger className="min-touch h-11">
              <SelectValue placeholder={BILLING.new.tipFor} />
            </SelectTrigger>
            <SelectContent>
              {staffOptions.map((s) => (
                <SelectItem key={s._id} value={s._id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      <div className="flex justify-between rounded-lg bg-gold-soft px-3 py-2 text-lg font-semibold tabular-nums text-gold-deep">
        <span>{BILLING.new.payable}</span>
        <span>{formatINR(totals.payable)}</span>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-medium">{BILLING.new.paymentMode}</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_MODES.map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={cart.paymentMode === mode ? 'default' : 'outline'}
              className="h-9"
              onClick={() => onPaymentMode(mode)}
            >
              {COMMON.paymentMode[mode]}
            </Button>
          ))}
        </div>
        {cart.paymentMode === 'cash' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="cash-recv">{BILLING.new.amountReceived}</Label>
              <Input
                id="cash-recv"
                type="number"
                min={0}
                className="min-touch h-11"
                value={cart.cashReceived || ''}
                onChange={(e) => onCashReceived(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-1">
              <Label>{BILLING.new.changeToReturn}</Label>
              <p className="h-11 content-center text-sm font-medium tabular-nums">
                {formatINR(totals.change)}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function NewBillScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appointmentIdParam = searchParams.get('appointmentId') ?? undefined
  const dispatch = useAppDispatch()
  const cart = useAppSelector((state) => state.billingCart)

  const customersQuery = useCustomersQuery()
  const servicesQuery = useServicesCatalogQuery()
  const productsQuery = useBillingProductsQuery()
  const staffQuery = useActiveStaffQuery()
  const createBill = useCreateBillMutation()
  const appointmentQuery = useAppointmentQuery(appointmentIdParam)
  const settingsQuery = useSalonSettingsQuery()
  const loyaltyBalanceQuery = useLoyaltyBalanceQuery(
    cart.walkIn ? undefined : (cart.customerId ?? undefined),
  )
  const loadedAppointmentIdRef = useRef<string | null>(null)

  const [customerSearch, setCustomerSearch] = useState('')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [focusStaffLineId, setFocusStaffLineId] = useState<string | null>(null)

  const loyaltyRules = settingsQuery.data?.loyalty
  const taxSettings = settingsQuery.data?.tax
  const invoiceSettings = settingsQuery.data?.invoice
  const loyaltyEnabled = Boolean(
    loyaltyRules?.enabled && cart.customerId && !cart.walkIn,
  )

  const taxInput = useMemo(
    () => ({
      gstEnabled: Boolean(taxSettings?.gstEnabled),
      pricesIncludeGst: Boolean(taxSettings?.pricesIncludeGst),
      servicesCgst: taxSettings?.services.cgstPercent ?? 0,
      servicesSgst: taxSettings?.services.sgstPercent ?? 0,
      productsCgst: taxSettings?.products.cgstPercent ?? 0,
      productsSgst: taxSettings?.products.sgstPercent ?? 0,
      rounding: (invoiceSettings?.rounding ?? 'none') as
        | 'none'
        | 'nearest'
        | 'up'
        | 'down',
      maxRedeemPercent: loyaltyRules?.maxRedeemPercent ?? 0,
    }),
    [taxSettings, invoiceSettings, loyaltyRules],
  )

  const totals = selectCartTotals(cart, taxInput)
  const staffOptions = staffQuery.data ?? []
  const fromAppointment = Boolean(cart.appointmentId)
  const todayLabel = format(new Date(), 'dd MMM yyyy')

  useEffect(() => {
    if (loyaltyRules?.redeemValuePerPoint != null) {
      dispatch(setPointsValueRatio(loyaltyRules.redeemValuePerPoint))
    }
  }, [loyaltyRules?.redeemValuePerPoint, dispatch])

  useEffect(() => {
    const appt = appointmentQuery.data
    if (!appt || loadedAppointmentIdRef.current === appt._id) return
    if (appt.status !== 'booked' || appt.invoice) {
      toast.error(BILLING.toasts.createFailed)
      return
    }
    const hasCustomer = Boolean(appt.customer)
    const customerId =
      typeof appt.customer === 'object' && appt.customer
        ? appt.customer._id
        : typeof appt.customer === 'string'
          ? appt.customer
          : null
    loadedAppointmentIdRef.current = appt._id
    dispatch(
      loadFromAppointment({
        appointmentId: appt._id,
        customerId,
        customerName: appointmentCustomerLabel(appt),
        walkIn: !hasCustomer,
        walkInPhone: appt.guestPhone,
        notes: appt.notes,
        lines: appt.services.map((line) => {
          const serviceId = appointmentServiceId(line)
          const catalog = (servicesQuery.data ?? []).find((s) => s._id === serviceId)
          const price =
            typeof line.service === 'object' && line.service?.price != null
              ? line.service.price
              : (catalog?.price ?? 0)
          return {
            catalogId: serviceId,
            kind: 'service' as const,
            name: line.name,
            unitPrice: price,
            qty: 1,
            staffId: appointmentStaffId(line),
            staffName: appointmentStaffName(line),
          }
        }),
      }),
    )
  }, [appointmentQuery.data, dispatch, servicesQuery.data])

  const customerResults = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q || cart.walkIn === false && !customerSearch) {
      if (!q) return []
    }
    return (customersQuery.data ?? [])
      .filter((c) => {
        const name = [c.name, c.lastName].filter(Boolean).join(' ').toLowerCase()
        const phone = String(c.phone ?? '')
        return (
          name.includes(q) ||
          phone.includes(q) ||
          c._id.toLowerCase().includes(q)
        )
      })
      .slice(0, 8)
  }, [customerSearch, customersQuery.data, cart.walkIn])

  const serviceLines = cart.lines.filter((l) => l.kind === 'service')
  const productLines = cart.lines.filter((l) => l.kind === 'product')
  const missingStaff = cart.lines.some((l) => !l.staffId)
  const canCheckout =
    cart.lines.length > 0 && !missingStaff && Boolean(cart.paymentMode)
  const checkoutReason =
    cart.lines.length === 0
      ? BILLING.new.needLines
      : missingStaff
        ? BILLING.new.needStaff
        : !cart.paymentMode
          ? BILLING.toasts.paymentRequired
          : ''

  const serviceCatalog = useMemo(
    (): SuggestableService[] =>
      (servicesQuery.data ?? []).map((s) => ({
        id: s._id,
        name: s.name,
        price: s.price,
        category: s.category,
      })),
    [servicesQuery.data],
  )
  const productCatalog = useMemo(
    () =>
      (productsQuery.data ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
      })),
    [productsQuery.data],
  )

  const addService = (id: string) => {
    const service = (servicesQuery.data ?? []).find((s) => s._id === id)
    if (!service) return
    const lineId = nanoid()
    dispatch(
      addLine({
        id: lineId,
        catalogId: service._id,
        kind: 'service',
        name: service.name,
        unitPrice: service.price,
        qty: 1,
        discount: { type: 'amount', value: 0 },
      }),
    )
    setFocusStaffLineId(lineId)
  }

  const addProduct = (id: string) => {
    const product = (productsQuery.data ?? []).find((p) => p.id === id)
    if (!product) return
    dispatch(
      addLine({
        catalogId: product.id,
        kind: 'product',
        name: product.name,
        unitPrice: product.price,
        qty: 1,
        discount: { type: 'amount', value: 0 },
      }),
    )
  }

  const submit = async () => {
    if (!canCheckout || !cart.paymentMode) return
    try {
      const customerName = cart.walkIn
        ? cart.customerName.trim() || 'Walk-in'
        : cart.customerName
      const bill = await createBill.mutateAsync({
        customerId: cart.customerId,
        customerName,
        walkIn: cart.walkIn,
        walkInPhone: cart.walkIn ? cart.walkInPhone || undefined : undefined,
        appointmentId: cart.appointmentId,
        lines: cart.lines.map((line) => ({
          catalogId: line.catalogId,
          kind: line.kind,
          name: line.name,
          unitPrice: line.unitPrice,
          qty: line.qty,
          staffId: line.staffId,
          staffName: line.staffName,
          discount: { type: 'amount' as const, value: 0 },
        })),
        serviceDiscount: cart.serviceDiscount,
        productDiscount: cart.productDiscount,
        tip: cart.tip,
        loyaltyRedeemPoints: loyaltyEnabled ? cart.loyaltyRedeemPoints : 0,
        payment: {
          cash: cart.paymentMode === 'cash' ? totals.payable : 0,
          upi: cart.paymentMode === 'upi' ? totals.payable : 0,
          card: cart.paymentMode === 'card' ? totals.payable : 0,
        },
        notes: cart.notes,
      })
      dispatch(resetCart())
      navigate(ROUTES.invoice(bill.id))
    } catch (error) {
      toast.error(toErrorMessage(error, BILLING.toasts.createFailed))
    }
  }

  const summaryProps = {
    totals,
    cart,
    loyaltyEnabled,
    availablePoints: loyaltyBalanceQuery.data?.points ?? 0,
    staffOptions,
    onRedeem: (n: number) => dispatch(setLoyaltyRedeemPoints(n)),
    onUseMax: () =>
      dispatch(
        setLoyaltyRedeemPoints(loyaltyBalanceQuery.data?.points ?? 0),
      ),
    onTip: (n: number) => dispatch(setTip(n)),
    onTipStaff: (id: string | null) => dispatch(setTipStaffId(id)),
    onPaymentMode: (m: 'cash' | 'upi' | 'card') => dispatch(setPaymentMode(m)),
    onCashReceived: (n: number) => dispatch(setCashReceived(n)),
  }

  return (
    <div className="min-w-0 space-y-3 pb-24 2xl:pb-3">
      <PageHeader
        description={BILLING.new.description}
        actions={
          <Button asChild size="sm" variant="outline" className="h-8">
            <Link to={ROUTES.billing}>{BILLING.new.backToBills}</Link>
          </Button>
        }
      />

      {fromAppointment ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          {BILLING.new.fromAppointment}
        </Badge>
      ) : null}

      {/* Stack until 2xl so Bill items card can reach ~900px+ for the fixed-track grid */}
      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="min-w-0 space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <div className="flex items-center justify-between gap-2">
                <CardTitle>{BILLING.new.customer}</CardTitle>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {todayLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={cart.walkIn ? 'default' : 'outline'}
                  className="min-touch h-11"
                  disabled={fromAppointment}
                  onClick={() => dispatch(setWalkIn())}
                >
                  {BILLING.new.walkIn}
                </Button>
              </div>
              {cart.walkIn ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{COMMON.labels.name}</Label>
                    <Input
                      className="min-touch h-11"
                      value={
                        cart.customerName === 'Walk-in' ? '' : cart.customerName
                      }
                      disabled={fromAppointment}
                      onChange={(e) =>
                        dispatch(setWalkInDetails({ name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{COMMON.labels.phone}</Label>
                    <div className="flex gap-1">
                      <span className="flex h-11 items-center rounded-md border border-border px-2 text-sm text-muted-foreground">
                        {BILLING.new.phonePrefix}
                      </span>
                      <Input
                        className="min-touch h-11"
                        value={cart.walkInPhone}
                        disabled={fromAppointment}
                        onChange={(e) =>
                          dispatch(setWalkInDetails({ phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>{BILLING.new.searchCustomer}</Label>
                  <Input
                    className="min-touch h-11"
                    value={customerSearch}
                    disabled={fromAppointment}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    placeholder={BILLING.new.searchCustomer}
                  />
                  {customerResults.length > 0 ? (
                    <ul className="rounded-md border border-border bg-card">
                      {customerResults.map((c) => {
                        const name = [c.name, c.lastName]
                          .filter(Boolean)
                          .join(' ')
                        return (
                          <li key={c._id}>
                            <button
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                              onClick={() => {
                                dispatch(setCustomer({ id: c._id, name }))
                                setCustomerSearch('')
                              }}
                            >
                              <span>{name}</span>
                              <span className="tabular-nums text-muted-foreground">
                                {c.phone}
                              </span>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                  {cart.customerId ? (
                    <div className="rounded-md border border-border p-3 text-sm">
                      <p className="font-medium">{cart.customerName}</p>
                      <p className="text-muted-foreground">
                        {BILLING.new.loyaltyBalance}:{' '}
                        <span className="tabular-nums">
                          {loyaltyBalanceQuery.data?.points ?? 0}
                        </span>
                      </p>
                    </div>
                  ) : null}
                </div>
              )}
              {cart.walkIn ? (
                <Button
                  type="button"
                  variant="outline"
                  className="min-touch h-11"
                  disabled={fromAppointment}
                  onClick={() => {
                    dispatch(beginCustomerSearch())
                    setCustomerSearch('')
                  }}
                >
                  {BILLING.new.searchCustomer}
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <ItemSectionCard
            title={BILLING.new.servicesHeading}
            addLabel={BILLING.new.addService}
            searchPlaceholder={BILLING.new.searchService}
            emptyHint={BILLING.new.emptyServices}
            staffHeader={BILLING.new.doneBy}
            lines={serviceLines}
            staffOptions={staffOptions}
            catalog={serviceCatalog}
            discount={cart.serviceDiscount}
            onDiscount={(patch) => dispatch(setServiceDiscount(patch))}
            onAdd={addService}
            onPatch={(id, patch) => dispatch(updateLine({ id, patch }))}
            onRemove={(id) => dispatch(removeLine(id))}
            showCategorySuggestions
            serviceCatalog={serviceCatalog}
            focusStaffLineId={focusStaffLineId}
            onFocusStaffHandled={() => setFocusStaffLineId(null)}
          />

          <ItemSectionCard
            title={BILLING.new.productsHeading}
            addLabel={BILLING.new.addProduct}
            searchPlaceholder={BILLING.new.searchProduct}
            emptyHint={BILLING.new.emptyProducts}
            staffHeader={BILLING.new.soldBy}
            lines={productLines}
            staffOptions={staffOptions}
            catalog={productCatalog}
            discount={cart.productDiscount}
            onDiscount={(patch) => dispatch(setProductDiscount(patch))}
            onAdd={addProduct}
            onPatch={(id, patch) => dispatch(updateLine({ id, patch }))}
            onRemove={(id) => dispatch(removeLine(id))}
          />

          <div className="space-y-1">
            <Label htmlFor="notes">{BILLING.new.notes}</Label>
            <Input
              id="notes"
              value={cart.notes}
              placeholder={BILLING.new.notesPlaceholder}
              onChange={(e) => dispatch(setNotes(e.target.value))}
            />
          </div>
        </div>

        <div className="hidden space-y-3 lg:sticky lg:top-14 lg:block lg:self-start">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{BILLING.new.summaryTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <SummaryBody {...summaryProps} />
              <Button
                type="button"
                className="min-touch w-full"
                disabled={!canCheckout || createBill.isPending}
                onClick={() => void submit()}
              >
                {createBill.isPending ? BILLING.new.saving : BILLING.new.checkout}
              </Button>
              {!canCheckout ? (
                <p className="text-center text-xs text-muted-foreground">
                  {checkoutReason}
                </p>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  dispatch(resetCart())
                  loadedAppointmentIdRef.current = null
                  navigate(ROUTES.billingNew, { replace: true })
                }}
              >
                {BILLING.new.reset}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-safe 2xl:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setSummaryOpen(true)}
          >
            <p className="text-xs text-muted-foreground">{BILLING.new.payable}</p>
            <p className="text-lg font-semibold tabular-nums text-gold-deep">
              {formatINR(totals.payable)}
            </p>
          </button>
          <Button
            type="button"
            className="min-touch h-11 px-6"
            disabled={!canCheckout || createBill.isPending}
            onClick={() => void submit()}
          >
            {BILLING.new.checkout}
          </Button>
        </div>
        {!canCheckout ? (
          <p className="mt-1 text-xs text-muted-foreground">{checkoutReason}</p>
        ) : null}
      </div>

      <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{BILLING.new.summaryTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-3 px-1 pb-4">
            <SummaryBody {...summaryProps} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
