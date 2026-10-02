import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Plus, Trash2, UserRound } from 'lucide-react'
import { toast } from 'sonner'

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
import { useAppointmentQuery } from '@/app/hooks/queries/useAppointmentsQuery'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import {
  useBillingProductsQuery,
  useCreateBillMutation,
} from '@/app/hooks/queries/useBillingQuery'
import { useServicesCatalogQuery } from '@/app/hooks/queries/useServicesQuery'
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
  payFullWith,
  removeLine,
  resetCart,
  selectCartTotals,
  setCustomer,
  setLoyaltyRedeemPoints,
  setNotes,
  setPayment,
  setPointsValueRatio,
  setTip,
  setWalkIn,
  setWalkInDetails,
  updateLine,
} from '@/app/state/redux/slices/billingCartSlice'
import { useSalonSettingsQuery } from '@/app/hooks/queries/useSettingsQuery'
import { useLoyaltyBalanceQuery } from '@/app/hooks/queries/useLoyaltyQuery'
import { formatINR, toErrorMessage } from '@/app/utils'

export function NewBillScreen() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const appointmentIdParam = searchParams.get('appointmentId') ?? undefined
  const dispatch = useAppDispatch()
  const cart = useAppSelector((state) => state.billingCart)
  const totals = selectCartTotals(cart)

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

  const [serviceToAdd, setServiceToAdd] = useState('')
  const [productToAdd, setProductToAdd] = useState('')

  const loyaltyRules = settingsQuery.data?.loyalty
  const loyaltyEnabled = Boolean(loyaltyRules?.enabled && cart.customerId && !cart.walkIn)

  useEffect(() => {
    if (loyaltyRules?.redeemValuePerPoint != null) {
      dispatch(setPointsValueRatio(loyaltyRules.redeemValuePerPoint))
    }
  }, [loyaltyRules?.redeemValuePerPoint, dispatch])

  useEffect(() => {
    const appt = appointmentQuery.data
    if (!appt || loadedAppointmentIdRef.current === appt._id) return
    if (appt.status !== 'booked' || appt.invoice) {
      toast.error('This appointment cannot be billed')
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
          const catalog = (servicesQuery.data ?? []).find(
            (s) => s._id === serviceId,
          )
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

  const staffOptions = staffQuery.data ?? []
  const fromAppointment = Boolean(cart.appointmentId)

  const addServiceLine = () => {
    const service = (servicesQuery.data ?? []).find((s) => s._id === serviceToAdd)
    if (!service) return
    dispatch(
      addLine({
        catalogId: service._id,
        kind: 'service',
        name: service.name,
        unitPrice: service.price,
        qty: 1,
      }),
    )
    setServiceToAdd('')
  }

  const addProductLine = () => {
    const product = (productsQuery.data ?? []).find((p) => p.id === productToAdd)
    if (!product) return
    dispatch(
      addLine({
        catalogId: product.id,
        kind: 'product',
        name: product.name,
        unitPrice: product.price,
        qty: 1,
      }),
    )
    setProductToAdd('')
  }

  const submit = async () => {
    if (cart.lines.length === 0) return
    if (cart.lines.some((line) => !line.staffId)) {
      toast.error('Assign staff on every line')
      return
    }
    if (totals.paid <= 0) {
      toast.error('Choose a payment mode (Full cash / UPI / card)')
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
        })),
        tip: cart.tip,
        loyaltyRedeemPoints: loyaltyEnabled ? cart.loyaltyRedeemPoints : 0,
        payment: cart.payment,
        notes: cart.notes,
      })

      dispatch(resetCart())
      navigate(`/billing/${bill.id}`)
    } catch (error) {
      toast.error(toErrorMessage(error, 'Could not save bill'))
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Collect payment via /api/invoice · staff required on every line."
        actions={
          <Button asChild size="sm" variant="outline" className="h-8">
            <Link to="/billing">Back to bills</Link>
          </Button>
        }
      />

      {fromAppointment ? (
        <Badge variant="outline" className="rounded-md font-normal text-[11px]">
          From appointment · completes booking on pay
        </Badge>
      ) : null}

      {appointmentIdParam && appointmentQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading appointment…</p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-3">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={cart.walkIn ? 'default' : 'outline'}
                  className="h-9"
                  disabled={fromAppointment}
                  onClick={() => dispatch(setWalkIn())}
                >
                  Walk-in
                </Button>
              </div>
              {cart.walkIn ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label htmlFor="walk-name">Name (optional)</Label>
                    <Input
                      id="walk-name"
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
                    <Label htmlFor="walk-phone">Phone (optional)</Label>
                    <Input
                      id="walk-phone"
                      value={cart.walkInPhone}
                      disabled={fromAppointment}
                      onChange={(e) =>
                        dispatch(setWalkInDetails({ phone: e.target.value }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <Select
                  value={cart.customerId ?? ''}
                  disabled={fromAppointment}
                  onValueChange={(id) => {
                    const customer = (customersQuery.data ?? []).find(
                      (c) => c._id === id,
                    )
                    if (!customer) return
                    dispatch(
                      setCustomer({
                        id: customer._id,
                        name: [customer.name, customer.lastName]
                          .filter(Boolean)
                          .join(' '),
                      }),
                    )
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {(customersQuery.data ?? []).map((customer) => (
                      <SelectItem key={customer._id} value={customer._id}>
                        {[customer.name, customer.lastName]
                          .filter(Boolean)
                          .join(' ')}{' '}
                        · {customer.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-muted-foreground">
                <UserRound className="mr-1 inline size-3.5" strokeWidth={1.75} />
                {cart.customerName || 'Walk-in'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Add service</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Select value={serviceToAdd} onValueChange={setServiceToAdd}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose service" />
                </SelectTrigger>
                <SelectContent>
                  {(servicesQuery.data ?? []).map((service) => (
                    <SelectItem key={service._id} value={service._id}>
                      {service.name} · {formatINR(service.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="min-touch shrink-0"
                onClick={addServiceLine}
                disabled={!serviceToAdd}
              >
                <Plus className="size-4" strokeWidth={1.75} />
                Add service
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Add product</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 sm:flex-row">
              <Select value={productToAdd} onValueChange={setProductToAdd}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose product" />
                </SelectTrigger>
                <SelectContent>
                  {(productsQuery.data ?? []).map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name} · {formatINR(product.price)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                className="min-touch shrink-0"
                variant="outline"
                onClick={addProductLine}
                disabled={!productToAdd}
              >
                <Plus className="size-4" strokeWidth={1.75} />
                Add product
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Cart lines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No lines yet.</p>
              ) : (
                cart.lines.map((line) => (
                  <div
                    key={line.id}
                    className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[1fr_72px_1fr_auto]"
                  >
                    <div>
                      <p className="text-sm font-medium">{line.name}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">
                        {line.kind} · {formatINR(line.unitPrice)}
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      className="h-9"
                      value={line.qty}
                      onChange={(e) =>
                        dispatch(
                          updateLine({
                            id: line.id,
                            patch: {
                              qty: Math.max(1, Number(e.target.value) || 1),
                            },
                          }),
                        )
                      }
                      aria-label="Qty"
                    />
                    <Select
                      value={line.staffId ?? ''}
                      onValueChange={(staffId) => {
                        const staff = staffOptions.find((s) => s._id === staffId)
                        dispatch(
                          updateLine({
                            id: line.id,
                            patch: {
                              staffId,
                              staffName: staff?.name,
                            },
                          }),
                        )
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Assign staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffOptions.map((staff) => (
                          <SelectItem key={staff._id} value={staff._id}>
                            {staff.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      className="size-9"
                      onClick={() => dispatch(removeLine(line.id))}
                      aria-label="Remove line"
                    >
                      <Trash2 className="size-4" strokeWidth={1.75} />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 lg:sticky lg:top-14 lg:self-start">
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>Totals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={cart.notes}
                  onChange={(e) => dispatch(setNotes(e.target.value))}
                />
              </div>

              <Separator />

              <div className="space-y-1">
                <Label htmlFor="tip">Tip (not taxed)</Label>
                <Input
                  id="tip"
                  type="number"
                  min={0}
                  step={1}
                  value={cart.tip || ''}
                  onChange={(e) =>
                    dispatch(setTip(Number(e.target.value) || 0))
                  }
                />
              </div>

              {loyaltyEnabled ? (
                <div className="space-y-1">
                  <Label htmlFor="loyalty-pts">
                    Redeem points
                    {loyaltyBalanceQuery.data
                      ? ` (avail. ${loyaltyBalanceQuery.data.points})`
                      : ''}
                  </Label>
                  <Input
                    id="loyalty-pts"
                    type="number"
                    min={0}
                    step={1}
                    value={cart.loyaltyRedeemPoints || ''}
                    onChange={(e) =>
                      dispatch(
                        setLoyaltyRedeemPoints(Number(e.target.value) || 0),
                      )
                    }
                  />
                  {totals.loyaltyRedeemValue > 0 ? (
                    <p className="text-[11px] text-muted-foreground">
                      ≈ −{formatINR(totals.loyaltyRedeemValue)} · min{' '}
                      {loyaltyRules?.minRedeemPoints ?? 0} pts · max{' '}
                      {loyaltyRules?.maxRedeemPercent ?? 0}% of net
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">
                      Min {loyaltyRules?.minRedeemPoints ?? 0} pts · max{' '}
                      {loyaltyRules?.maxRedeemPercent ?? 0}% of net (server
                      enforces)
                    </p>
                  )}
                </div>
              ) : null}

              <div className="flex justify-between text-base font-semibold tabular-nums">
                <span>Subtotal (display)</span>
                <span>{formatINR(totals.subtotal)}</span>
              </div>
              {totals.loyaltyRedeemValue > 0 ? (
                <div className="flex justify-between text-sm tabular-nums text-muted-foreground">
                  <span>Loyalty (est.)</span>
                  <span>−{formatINR(totals.loyaltyRedeemValue)}</span>
                </div>
              ) : null}
              {totals.tip > 0 ? (
                <div className="flex justify-between text-sm tabular-nums text-muted-foreground">
                  <span>Tip</span>
                  <span>{formatINR(totals.tip)}</span>
                </div>
              ) : null}
              <p className="text-[11px] text-muted-foreground">
                Server computes GST, rounding, and final payable.
              </p>

              <Separator />

              <p className="text-xs font-medium">Payment mode</p>
              <div className="flex flex-wrap gap-1.5">
                {(['cash', 'upi', 'card'] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="sm"
                    variant={cart.payment[mode] > 0 ? 'default' : 'outline'}
                    className="h-8 capitalize"
                    onClick={() =>
                      dispatch(
                        payFullWith({
                          mode,
                          total: Math.max(1, totals.total),
                        }),
                      )
                    }
                  >
                    {mode}
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['cash', 'upi', 'card'] as const).map((mode) => (
                  <div key={mode} className="space-y-1">
                    <Label htmlFor={mode} className="capitalize">
                      {mode}
                    </Label>
                    <Input
                      id={mode}
                      type="number"
                      min={0}
                      value={cart.payment[mode]}
                      onChange={(e) =>
                        dispatch(
                          setPayment({
                            [mode]: Number(e.target.value) || 0,
                          }),
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <Button
                type="button"
                className="min-touch w-full"
                disabled={cart.lines.length === 0 || createBill.isPending}
                onClick={() => void submit()}
              >
                {createBill.isPending ? 'Saving…' : 'Collect payment'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  dispatch(resetCart())
                  loadedAppointmentIdRef.current = null
                  navigate('/billing/new', { replace: true })
                }}
              >
                Clear cart
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
