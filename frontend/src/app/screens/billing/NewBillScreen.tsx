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
  const loyaltyEnabled = Boolean(loyaltyRules?.enabled && cart.customerId && !cart.walkIn)
  const maxDiscountPercent =
    user?.role === 'admin' ? 100 : (user?.maxDiscountPercent ?? 0)

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
  const draftWhen = format(new Date(), 'EEE, dd MMM yyyy, h:mm a')

  useEffect(() => {
    if (loyaltyRules?.redeemValuePerPoint != null) {
      dispatch(setPointsValueRatio(loyaltyRules.redeemValuePerPoint))
    }
  }, [loyaltyRules?.redeemValuePerPoint, dispatch])

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

  const missingStaff = cart.lines.some((l) => !l.staffId)
  const canCheckout = cart.lines.length > 0 && !missingStaff && Boolean(cart.paymentMode)
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
          discount: line.discount,
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

  const cgstRate = taxSettings?.services.cgstPercent ?? 0
  const sgstRate = taxSettings?.services.sgstPercent ?? 0
  const showRoundOff = (invoiceSettings?.rounding ?? 'none') !== 'none'

  const summaryHandlers = {
    onRedeem: (n: number) => dispatch(setLoyaltyRedeemPoints(n)),
    onUseMax: () =>
      dispatch(setLoyaltyRedeemPoints(loyaltyBalanceQuery.data?.points ?? 0)),
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
            popularServices={popularServices}
            popularProducts={popularProducts}
            selectedServiceIds={cart.lines
              .filter((l) => l.kind === 'service')
              .map((l) => l.catalogId)}
            onAddService={addService}
            onAddProduct={addProduct}
          />

          <BillItemsCard
            lines={cart.lines}
            staffOptions={staffOptions}
            maxDiscountPercent={maxDiscountPercent}
            onPatch={(id, patch) => dispatch(updateLine({ id, patch }))}
            onRemove={(id) => dispatch(removeLine(id))}
            focusStaffLineId={focusStaffLineId}
            onFocusStaffHandled={() => setFocusStaffLineId(null)}
          />
        </div>

        <div className="hidden min-w-0 xl:sticky xl:top-14 xl:block xl:self-start">
          <BillSummaryPanel
            totals={totals}
            cart={cart}
            loyaltyEnabled={loyaltyEnabled}
            availablePoints={loyaltyBalanceQuery.data?.points ?? 0}
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

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card p-3 pb-safe xl:hidden">
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

      <Sheet open={summaryOpen} onOpenChange={setSummaryOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{BILLING.new.summaryTitle}</SheetTitle>
          </SheetHeader>
          <div className="mt-3 space-y-3 px-1 pb-4">
            <BillSummaryBody
              totals={totals}
              cart={cart}
              loyaltyEnabled={loyaltyEnabled}
              availablePoints={loyaltyBalanceQuery.data?.points ?? 0}
              cgstRate={cgstRate}
              sgstRate={sgstRate}
              showRoundOff={showRoundOff}
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
