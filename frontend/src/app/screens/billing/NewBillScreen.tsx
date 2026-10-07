import { nanoid } from '@reduxjs/toolkit'
import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import type { SuggestableService } from '@/app/components/CategorySuggestions'
import { PageHeader } from '@/app/components/PageHeader'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/app/components/ui/sheet'
import { BILLING, COMMON, ROUTES } from '@/app/constants'
import { useAppointmentQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import {
  useBillingProductsQuery,
  useCreateBillMutation,
  usePopularBillingItemsQuery,
} from '@/app/hooks/queries/useBillingQuery'
import { useCombosQuery } from '@/app/hooks/queries/useCombosQuery'
import { useLoyaltyBalanceQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useActiveStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import {
  appointmentCustomerMeta,
  appointmentToCartLines,
} from '@/app/screens/billing/new-bill/appointmentCart'
import { BillItemsCard } from '@/app/screens/billing/new-bill/BillItemsCard'
import {
  BillSummaryBody,
  BillSummaryPanel,
} from '@/app/screens/billing/new-bill/BillSummaryPanel'
import { CatalogCard } from '@/app/screens/billing/new-bill/CatalogCard'
import { CustomerCard } from '@/app/screens/billing/new-bill/CustomerCard'
import { openEstimatePrintWindow } from '@/app/screens/billing/new-bill/printEstimate'
import type { Appointment } from '@/app/service/appointments/appointmentsApi'
import {
  addLine,
  loadCart,
  loadFromAppointment,
  removeLine,
  resetCart,
  selectCartTotals,
  setCashReceived,
  setCustomer,
  setLoyaltyRedeemPoints,
  setNotes,
  setPaymentMode,
  setPointsValueRatio,
  setTip,
  setWalkIn,
  clearLines,
  setWalkInDetails,
  updateLine,
} from '@/app/state/redux/slices/billingCartSlice'
import {
  deleteDraft,
  saveDraft,
} from '@/app/state/redux/slices/billingDraftsSlice'
import { formatINR, toErrorMessage } from '@/app/utils'

export function NewBillScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appointmentIdParam = searchParams.get('appointmentId') ?? undefined
  const dispatch = useAppDispatch()
  const cart = useAppSelector((state) => state.billingCart)
  const drafts = useAppSelector((state) => state.billingDrafts.drafts)
  const user = useAppSelector((state) => state.auth.user)

  const servicesQuery = useServicesCatalogQuery()
  const productsQuery = useBillingProductsQuery()
  const staffQuery = useActiveStaffQuery()
  const createBill = useCreateBillMutation()
  const appointmentQuery = useAppointmentQuery(appointmentIdParam)
  const settingsQuery = useSalonSettingsQuery()
  const combosQuery = useCombosQuery(true)
  const popularQuery = usePopularBillingItemsQuery(12)
  const loyaltyBalanceQuery = useLoyaltyBalanceQuery(
    cart.walkIn ? undefined : (cart.customerId ?? undefined),
  )
  const loadedAppointmentIdRef = useRef<string | null>(null)

  const [summaryOpen, setSummaryOpen] = useState(false)
  const [focusStaffLineId, setFocusStaffLineId] = useState<string | null>(null)

  const loyaltyRules = settingsQuery.data?.loyalty
  const taxSettings = settingsQuery.data?.tax
  const invoiceSettings = settingsQuery.data?.invoice
  const allowNegativeStock = Boolean(
    settingsQuery.data?.business?.allowNegativeStock,
  )
  const loyaltyEnabled = Boolean(loyaltyRules?.enabled && cart.customerId && !cart.walkIn)
  const maxDiscountPercent =
    user?.role === 'admin' ? 100 : (user?.maxDiscountPercent ?? 0)

  const cartQtyByProductId = useMemo(() => {
    const map = new Map<string, number>()
    for (const line of cart.lines) {
      if (line.kind !== 'product') continue
      map.set(line.catalogId, (map.get(line.catalogId) ?? 0) + line.qty)
    }
    return map
  }, [cart.lines])

  const remainingStockByProductId = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of productsQuery.data ?? []) {
      if (!p.trackStock || allowNegativeStock) continue
      const onHand = p.stockQty ?? 0
      const inCart = cartQtyByProductId.get(p.id) ?? 0
      map.set(p.id, Math.max(0, onHand - inCart))
    }
    return map
  }, [productsQuery.data, cartQtyByProductId, allowNegativeStock])

  const maxQtyByLineId = useMemo(() => {
    const result: Record<string, number | undefined> = {}
    if (allowNegativeStock) return result
    for (const line of cart.lines) {
      if (line.kind !== 'product') continue
      const product = (productsQuery.data ?? []).find((p) => p.id === line.catalogId)
      if (!product?.trackStock) continue
      const onHand = product.stockQty ?? 0
      const others =
        (cartQtyByProductId.get(line.catalogId) ?? 0) - line.qty
      result[line.id] = Math.max(0, onHand - others)
    }
    return result
  }, [cart.lines, productsQuery.data, cartQtyByProductId, allowNegativeStock])

  const stockBlockedLines = useMemo(() => {
    if (allowNegativeStock) return [] as Array<{ name: string; available: number }>
    const blocked: Array<{ name: string; available: number }> = []
    for (const line of cart.lines) {
      if (line.kind !== 'product') continue
      const product = (productsQuery.data ?? []).find((p) => p.id === line.catalogId)
      if (!product?.trackStock) continue
      const onHand = product.stockQty ?? 0
      const others =
        (cartQtyByProductId.get(line.catalogId) ?? 0) - line.qty
      const maxForLine = Math.max(0, onHand - others)
      if (line.qty > maxForLine) {
        blocked.push({ name: line.name, available: maxForLine })
      }
    }
    return blocked
  }, [cart.lines, productsQuery.data, cartQtyByProductId, allowNegativeStock])

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
  const availableLoyaltyPoints = loyaltyBalanceQuery.data?.points ?? 0
  const minRedeemPoints = loyaltyRules?.minRedeemPoints ?? 0
  const maxRedeemablePoints = Math.min(
    availableLoyaltyPoints,
    totals.maxRedeemPointsByBill,
  )
  const staffOptions = staffQuery.data ?? []
  const fromAppointment = Boolean(cart.appointmentId)
  const draftWhen = format(new Date(), 'EEE, dd MMM yyyy, h:mm a')

  useEffect(() => {
    if (loyaltyRules?.redeemValuePerPoint != null) {
      dispatch(setPointsValueRatio(loyaltyRules.redeemValuePerPoint))
    }
  }, [loyaltyRules?.redeemValuePerPoint, dispatch])

  useEffect(() => {
    if (!loyaltyEnabled) {
      if (cart.loyaltyRedeemPoints > 0) dispatch(setLoyaltyRedeemPoints(0))
      return
    }
    if (cart.loyaltyRedeemPoints > maxRedeemablePoints) {
      dispatch(setLoyaltyRedeemPoints(maxRedeemablePoints))
    }
  }, [
    loyaltyEnabled,
    maxRedeemablePoints,
    cart.loyaltyRedeemPoints,
    dispatch,
  ])

  const applyAppointment = (appt: Appointment) => {
    if (appt.status !== 'booked' || appt.invoice) {
      toast.error(BILLING.toasts.createFailed)
      return
    }
    const meta = appointmentCustomerMeta(appt)
    loadedAppointmentIdRef.current = appt._id
    dispatch(
      loadFromAppointment({
        appointmentId: appt._id,
        customerId: meta.customerId,
        customerName: meta.customerName,
        walkIn: meta.walkIn,
        walkInPhone: meta.walkInPhone,
        notes: appt.notes,
        lines: appointmentToCartLines(appt, servicesQuery.data ?? []),
      }),
    )
  }

  useEffect(() => {
    const appt = appointmentQuery.data
    if (!appt || loadedAppointmentIdRef.current === appt._id) return
    applyAppointment(appt)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per appointment id
  }, [appointmentQuery.data, servicesQuery.data])

  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      if (!window.matchMedia('(max-width: 1023px)').matches) return
      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return
      window.setTimeout(() => {
        target.scrollIntoView({ block: 'center', inline: 'nearest' })
      }, 300)
    }
    document.addEventListener('focusin', onFocusIn)
    return () => document.removeEventListener('focusin', onFocusIn)
  }, [])

  const missingStaff = cart.lines.some((l) => {
    if (l.kind === 'combo') {
      return !(l.components ?? []).length || (l.components ?? []).some((c) => !c.staffId)
    }
    return !l.staffId
  })
  const stockBlocked = stockBlockedLines.length > 0
  const canCheckout =
    cart.lines.length > 0 &&
    !missingStaff &&
    Boolean(cart.paymentMode) &&
    !stockBlocked
  const checkoutReason =
    cart.lines.length === 0
      ? BILLING.new.needLines
      : missingStaff
        ? BILLING.new.needStaff
        : !cart.paymentMode
          ? BILLING.toasts.paymentRequired
          : stockBlocked
            ? BILLING.new.needStock
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
      (productsQuery.data ?? []).map((p) => {
        const trackStock = Boolean(p.trackStock)
        const onHand = p.stockQty ?? 0
        const remaining = allowNegativeStock
          ? onHand
          : (remainingStockByProductId.get(p.id) ?? onHand)
        const outOfStock = trackStock && !allowNegativeStock && remaining <= 0
        return {
          id: p.id,
          name: p.name,
          price: p.price,
          trackStock,
          stockQty: remaining,
          stockLabel:
            trackStock && !outOfStock
              ? BILLING.new.stockLeft.replace('{qty}', String(remaining))
              : undefined,
          disabled: outOfStock,
          disabledLabel: outOfStock ? BILLING.new.outOfStock : undefined,
          kind: 'product' as const,
        }
      }),
    [productsQuery.data, remainingStockByProductId, allowNegativeStock],
  )

  const comboCatalog = useMemo(
    () =>
      (combosQuery.data ?? []).map((c) => ({
        id: c._id,
        name: c.name,
        price: c.comboPrice,
        kind: 'combo' as const,
      })),
    [combosQuery.data],
  )
  const popularServices = useMemo(
    () =>
      (popularQuery.data?.services ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        price: s.price,
        timesSold: s.timesSold,
      })),
    [popularQuery.data?.services],
  )
  const popularProducts = useMemo(
    () =>
      (popularQuery.data?.products ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        timesSold: p.timesSold,
      })),
    [popularQuery.data?.products],
  )

  const coveredServiceIds = useMemo(() => {
    const ids = new Set<string>()
    for (const line of cart.lines) {
      if (line.kind !== 'combo') continue
      for (const c of line.components ?? []) ids.add(c.serviceId)
    }
    return [...ids]
  }, [cart.lines])

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
    if (product.trackStock && !allowNegativeStock) {
      const remaining = remainingStockByProductId.get(product.id) ?? (product.stockQty ?? 0)
      if (remaining <= 0) {
        toast.error(
          BILLING.new.stockExceeded
            .replace('{qty}', String(Math.max(0, product.stockQty ?? 0)))
            .replace('{name}', product.name),
        )
        return
      }
    }
    const lineId = nanoid()
    dispatch(
      addLine({
        id: lineId,
        catalogId: product.id,
        kind: 'product',
        name: product.name,
        unitPrice: product.price,
        qty: 1,
        discount: { type: 'amount', value: 0 },
      }),
    )
    setFocusStaffLineId(lineId)
  }

  const addCombo = (id: string) => {
    const combo = (combosQuery.data ?? []).find((c) => c._id === id)
    if (!combo) return
    const lineId = nanoid()
    dispatch(
      addLine({
        id: lineId,
        catalogId: combo._id,
        kind: 'combo',
        name: combo.name,
        unitPrice: combo.comboPrice,
        qty: 1,
        discount: { type: 'amount', value: 0 },
        components: combo.services.map((s) => ({
          serviceId: s.service._id,
          name: s.service.name,
          listPrice: s.service.price * (s.qty || 1),
        })),
      }),
    )
    setFocusStaffLineId(lineId)
  }

  const submit = async () => {
    if (!canCheckout || !cart.paymentMode) return
    const redeemPts = loyaltyEnabled ? cart.loyaltyRedeemPoints : 0
    if (
      redeemPts > 0 &&
      minRedeemPoints > 0 &&
      redeemPts < minRedeemPoints
    ) {
      toast.error(
        BILLING.new.minRedeemPoints.replace('{qty}', String(minRedeemPoints)),
      )
      return
    }
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
          discount: line.discount,
          components: line.components,
        })),
        serviceDiscount: { type: 'amount', value: 0 },
        productDiscount: { type: 'amount', value: 0 },
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

  const collectLabel = cart.paymentMode
    ? BILLING.new.collectVia
        .replace('{amount}', formatINR(totals.payable))
        .replace('{mode}', COMMON.paymentMode[cart.paymentMode])
    : BILLING.new.checkout
  const collectShort = BILLING.new.collectAmount.replace(
    '{amount}',
    formatINR(totals.payable),
  )

  const cgstRate = taxSettings?.services.cgstPercent ?? 0
  const sgstRate = taxSettings?.services.sgstPercent ?? 0
  const showRoundOff = (invoiceSettings?.rounding ?? 'none') !== 'none'

  const clampRedeemPoints = (raw: number) =>
    Math.min(maxRedeemablePoints, Math.max(0, Math.floor(raw)))

  const summaryHandlers = {
    onRedeem: (n: number) =>
      dispatch(setLoyaltyRedeemPoints(clampRedeemPoints(n))),
    onUseMax: () => {
      if (
        maxRedeemablePoints > 0 &&
        minRedeemPoints > 0 &&
        maxRedeemablePoints < minRedeemPoints
      ) {
        toast.error(
          BILLING.new.minRedeemPoints.replace('{qty}', String(minRedeemPoints)),
        )
        dispatch(setLoyaltyRedeemPoints(0))
        return
      }
      dispatch(setLoyaltyRedeemPoints(maxRedeemablePoints))
    },
    onTip: (n: number) => dispatch(setTip(n)),
    onPaymentMode: (m: 'cash' | 'upi' | 'card') => dispatch(setPaymentMode(m)),
    onCashReceived: (n: number) => dispatch(setCashReceived(n)),
    onNotes: (notes: string) => dispatch(setNotes(notes)),
  }

  return (
    <div className="min-w-0 space-y-3 pb-24 xl:pb-3">
      <PageHeader
        title={BILLING.new.title}
        description={BILLING.new.draftSubtitle.replace('{when}', draftWhen)}
        actions={
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => {
                dispatch(saveDraft(cart))
                toast.success(BILLING.new.draftSaved)
              }}
            >
              {BILLING.new.saveDraft}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8"
              onClick={() => openEstimatePrintWindow(cart, totals.payable)}
            >
              {BILLING.new.printEstimate}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="h-8">
                  {BILLING.new.draftsMenu.replace('{count}', String(drafts.length))}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>{BILLING.new.draftsMenu.replace('{count}', String(drafts.length))}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {drafts.length === 0 ? (
                  <DropdownMenuItem disabled>{BILLING.new.draftsEmpty}</DropdownMenuItem>
                ) : (
                  drafts.map((draft) => (
                    <DropdownMenuItem
                      key={draft.id}
                      className="flex items-center justify-between gap-2"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <button
                        type="button"
                        className="min-w-0 flex-1 truncate text-left"
                        onClick={() => {
                          dispatch(loadCart(draft.cart))
                          loadedAppointmentIdRef.current = draft.cart.appointmentId
                        }}
                      >
                        {draft.label}
                      </button>
                      <button
                        type="button"
                        className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => dispatch(deleteDraft(draft.id))}
                        aria-label={BILLING.new.deleteDraft}
                      >
                        {COMMON.actions.delete}
                      </button>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
      />

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)]">
        <div className="min-w-0 space-y-3">
          <CustomerCard
            cart={cart}
            fromAppointment={fromAppointment}
            onWalkIn={() => dispatch(setWalkIn())}
            onClearLines={() => dispatch(clearLines())}
            onSelectCustomer={(id, name) => dispatch(setCustomer({ id, name }))}
            onWalkInDetails={(patch) => {
              if (!cart.walkIn || cart.customerId) {
                dispatch(setWalkIn())
              }
              dispatch(setWalkInDetails(patch))
            }}
            onLoadAppointment={applyAppointment}
            onClearAppointment={() => {
              loadedAppointmentIdRef.current = null
              dispatch(setWalkIn())
              navigate(ROUTES.billingNew, { replace: true })
            }}
          />

          <CatalogCard
            serviceCatalog={serviceCatalog}
            productCatalog={productCatalog}
            comboCatalog={comboCatalog}
            popularServices={popularServices}
            popularProducts={popularProducts}
            selectedServiceIds={cart.lines
              .filter((l) => l.kind === 'service')
              .map((l) => l.catalogId)}
            coveredServiceIds={coveredServiceIds}
            onAddService={addService}
            onAddProduct={addProduct}
            onAddCombo={addCombo}
          />

          <BillItemsCard
            lines={cart.lines}
            staffOptions={staffOptions}
            maxDiscountPercent={maxDiscountPercent}
            maxQtyByLineId={maxQtyByLineId}
            onPatch={(id, patch) => {
              const maxQty = maxQtyByLineId[id]
              if (
                patch.qty !== undefined &&
                maxQty !== undefined &&
                patch.qty > maxQty
              ) {
                const line = cart.lines.find((l) => l.id === id)
                toast.error(
                  BILLING.new.stockExceeded
                    .replace('{qty}', String(maxQty))
                    .replace('{name}', line?.name ?? ''),
                )
                dispatch(updateLine({ id, patch: { ...patch, qty: maxQty } }))
                return
              }
              dispatch(updateLine({ id, patch }))
            }}
            onRemove={(id) => dispatch(removeLine(id))}
            focusStaffLineId={focusStaffLineId}
            onFocusStaffHandled={() => setFocusStaffLineId(null)}
          />

          <div className="lg:hidden">
            <BillSummaryPanel
              totals={totals}
              cart={cart}
              loyaltyEnabled={loyaltyEnabled}
              availablePoints={availableLoyaltyPoints}
              maxRedeemPoints={maxRedeemablePoints}
              cgstRate={cgstRate}
              sgstRate={sgstRate}
              showRoundOff={showRoundOff}
              canCheckout={canCheckout}
              checkoutReason={checkoutReason}
              collectLabel={collectLabel}
              saving={createBill.isPending}
              onCollect={() => void submit()}
              idPrefix="m-"
              {...summaryHandlers}
            />
          </div>
        </div>

        <div className="hidden min-w-0 xl:sticky xl:top-14 xl:block xl:self-start">
          <BillSummaryPanel
            totals={totals}
            cart={cart}
            loyaltyEnabled={loyaltyEnabled}
            availablePoints={availableLoyaltyPoints}
            maxRedeemPoints={maxRedeemablePoints}
            cgstRate={cgstRate}
            sgstRate={sgstRate}
            showRoundOff={showRoundOff}
            canCheckout={canCheckout}
            checkoutReason={checkoutReason}
            collectLabel={collectLabel}
            saving={createBill.isPending}
            onCollect={() => void submit()}
            {...summaryHandlers}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 hidden border-t border-border bg-card p-3 pb-safe lg:block xl:hidden">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setSummaryOpen(true)}
          >
            <p className="text-xs text-muted-foreground">{BILLING.new.payable}</p>
            <p className="text-lg font-semibold tabular-nums">
              {formatINR(totals.payable)}
            </p>
          </button>
          <Button
            type="button"
            className="min-touch h-11 px-4"
            disabled={!canCheckout || createBill.isPending}
            onClick={() => void submit()}
          >
            {createBill.isPending ? BILLING.new.saving : collectLabel}
          </Button>
        </div>
        {!canCheckout ? (
          <p className="mt-1 text-xs text-muted-foreground">{checkoutReason}</p>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden">
        {!canCheckout ? (
          <p className="px-3 pt-1 text-center text-[11px] leading-tight text-muted-foreground">
            {checkoutReason}
          </p>
        ) : null}
        <div className="flex h-16 items-center gap-2 px-3">
          <button
            type="button"
            className="min-w-0 flex-1 text-left"
            onClick={() => setSummaryOpen(true)}
          >
            <p className="text-xs text-muted-foreground">{BILLING.new.payable}</p>
            <p className="text-xl font-semibold tabular-nums leading-none">
              {formatINR(totals.payable)}
            </p>
          </button>
          <Button
            type="button"
            className="h-10 shrink-0 px-3 whitespace-nowrap"
            disabled={!canCheckout || createBill.isPending}
            onClick={() => void submit()}
          >
            <span className="max-[400px]:hidden">
              {createBill.isPending ? BILLING.new.saving : collectLabel}
            </span>
            <span className="hidden max-[400px]:inline">
              {createBill.isPending ? BILLING.new.saving : collectShort}
            </span>
          </Button>
        </div>
      </div>

      <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[85dvh] overflow-y-auto rounded-t-2xl"
        >
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted lg:hidden" />
          <SheetHeader>
            <SheetTitle>{BILLING.new.summaryTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-3 px-1 pb-4">
            <BillSummaryBody
              totals={totals}
              cart={cart}
              loyaltyEnabled={loyaltyEnabled}
              availablePoints={availableLoyaltyPoints}
              maxRedeemPoints={maxRedeemablePoints}
              cgstRate={cgstRate}
              sgstRate={sgstRate}
              showRoundOff={showRoundOff}
              idPrefix="sheet-"
              {...summaryHandlers}
            />
            <Button
              type="button"
              className="min-touch w-full"
              disabled={!canCheckout || createBill.isPending}
              onClick={() => void submit()}
            >
              {createBill.isPending ? BILLING.new.saving : collectLabel}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
