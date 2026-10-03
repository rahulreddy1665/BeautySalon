import { ArrowLeft, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  DateRangeFilter,
  defaultTodayRange,
  type DateRange,
} from '@/app/components/DateRangeFilter'
import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { StatCard } from '@/app/components/StatCard'
import { Badge } from '@/app/components/ui/badge'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { COMMON, STAFF } from '@/app/constants'
import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { useStaffQuery } from '@/app/hooks/queries/useStaffQuery'
import { invoicesApi } from '@/app/service/invoices/invoicesApi'
import { staffApi, type StaffLoginStatus } from '@/app/service/staff/staffApi'
import { StaffFormSheet } from '@/app/screens/staff/StaffFormSheet'
import { formatINR, toErrorMessage } from '@/app/utils'

function loginLabel(status?: StaffLoginStatus): string {
  switch (status) {
    case 'login_enabled':
      return STAFF.list.loginEnabled
    case 'login_off':
      return STAFF.list.loginOff
    case 'must_change_password':
      return STAFF.list.mustChangePassword
    default:
      return STAFF.list.noLogin
  }
}

function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let out = ''
  for (let i = 0; i < 10; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return out
}

export function StaffDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const staffQuery = useStaffQuery(id)
  const [range, setRange] = useState<DateRange>(defaultTodayRange)
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [tempPassword, setTempPassword] = useState('')
  const [shownTemp, setShownTemp] = useState<string | null>(null)
  const [loginPending, setLoginPending] = useState(false)

  const salesQuery = useQuery({
    queryKey: queryKeys.invoices.staffSales({
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      staffId: id,
    }),
    queryFn: () =>
      invoicesApi.staffSales(range.from.toISOString(), range.to.toISOString()),
    enabled: Boolean(id),
  })

  const sales = useMemo(() => {
    const row = (salesQuery.data ?? []).find((r) => r.staffId === id)
    return (
      row ?? {
        serviceSales: 0,
        productSales: 0,
        totalSales: 0,
      }
    )
  }, [salesQuery.data, id])

  if (staffQuery.isLoading) {
    return (
      <div className="space-y-3">
        <LoadingSkeleton variant="stats" />
      </div>
    )
  }

  if (staffQuery.isError || !staffQuery.data) {
    return (
      <ErrorState
        error={staffQuery.error}
        title="Staff not found"
        onRetry={() => void staffQuery.refetch()}
      />
    )
  }

  const staff = staffQuery.data

  return (
    <div className="min-w-0 space-y-3">
      <Button asChild variant="ghost" size="sm" className="h-8 px-2">
        <Link to="/staff">
          <ArrowLeft className="size-4" strokeWidth={1.75} />
          Staff
        </Link>
      </Button>

      <PageHeader
        description={`${staff.gender} · age ${staff.age}`}
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" strokeWidth={1.75} />
            Edit
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">{staff.name}</h2>
        <Badge variant="outline" className="rounded-md font-normal">
          {staff.isActive === false ? COMMON.labels.inactive : COMMON.labels.active}
        </Badge>
        <Badge variant="outline" className="rounded-md font-normal">
          {loginLabel(staff.loginStatus)}
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>{STAFF.detail.allowLogin}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {shownTemp ? (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <p className="mb-2">{STAFF.detail.tempPasswordOnce}</p>
              <p className="font-mono text-base tabular-nums">{shownTemp}</p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-2"
                onClick={() => {
                  void navigator.clipboard.writeText(shownTemp)
                  toast.success(STAFF.toasts.copied)
                }}
              >
                {STAFF.detail.copyPassword}
              </Button>
            </div>
          ) : null}

          {(staff.loginStatus === 'no_login' || staff.loginStatus === 'login_off') && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{STAFF.detail.username}</Label>
                <Input
                  className="min-touch h-11"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <Label>{STAFF.detail.temporaryPassword}</Label>
                <div className="flex gap-1">
                  <Input
                    className="min-touch h-11"
                    type="text"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="min-touch h-11"
                    onClick={() => setTempPassword(generatePassword())}
                  >
                    {STAFF.detail.generatePassword}
                  </Button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {STAFF.detail.passwordStrength}
                </p>
              </div>
              <Button
                type="button"
                className="min-touch sm:col-span-2"
                disabled={loginPending || !username || tempPassword.length < 8}
                onClick={() => {
                  if (!id) return
                  setLoginPending(true)
                  void staffApi
                    .enableLogin(id, {
                      username,
                      temporaryPassword: tempPassword,
                    })
                    .then((res) => {
                      setShownTemp(res.temporaryPassword)
                      setTempPassword('')
                      toast.success(STAFF.toasts.loginEnabled)
                      void queryClient.invalidateQueries({
                        queryKey: queryKeys.staff.all,
                      })
                    })
                    .catch((err) => toast.error(toErrorMessage(err)))
                    .finally(() => setLoginPending(false))
                }}
              >
                {STAFF.detail.enableLogin}
              </Button>
            </div>
          )}

          {(staff.loginStatus === 'login_enabled' ||
            staff.loginStatus === 'must_change_password') && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                className="min-touch"
                disabled={loginPending}
                onClick={() => {
                  if (!id) return
                  const pw = generatePassword()
                  setLoginPending(true)
                  void staffApi
                    .resetLoginPassword(id, pw)
                    .then((res) => {
                      setShownTemp(res.temporaryPassword)
                      toast.success(STAFF.toasts.passwordReset)
                      void queryClient.invalidateQueries({
                        queryKey: queryKeys.staff.all,
                      })
                    })
                    .catch((err) => toast.error(toErrorMessage(err)))
                    .finally(() => setLoginPending(false))
                }}
              >
                {STAFF.detail.resetPassword}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-touch"
                disabled={loginPending}
                onClick={() => {
                  if (!id) return
                  setLoginPending(true)
                  void staffApi
                    .disableLogin(id)
                    .then(() => {
                      setShownTemp(null)
                      toast.success(STAFF.toasts.loginDisabled)
                      void queryClient.invalidateQueries({
                        queryKey: queryKeys.staff.all,
                      })
                    })
                    .catch((err) => toast.error(toErrorMessage(err)))
                    .finally(() => setLoginPending(false))
                }}
              >
                {STAFF.detail.turnOffLogin}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <DateRangeFilter value={range} onChange={setRange} />

      {salesQuery.isLoading ? <LoadingSkeleton variant="stats" /> : null}
      {!salesQuery.isLoading ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          <StatCard label="Service sales" value={sales.serviceSales} format="inr" />
          <StatCard label="Product sales" value={sales.productSales} format="inr" />
          <StatCard
            label="Total"
            value={sales.totalSales}
            format="inr"
            className="col-span-2 lg:col-span-1"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader className="pb-1">
          <CardTitle>Sales note</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Totals come from paid invoice line items
          {sales.totalSales === 0
            ? ' — no billed lines in this range yet.'
            : ` (${formatINR(sales.totalSales)}).`}
        </CardContent>
      </Card>

      <StaffFormSheet open={editOpen} onOpenChange={setEditOpen} staff={staff} />
    </div>
  )
}
