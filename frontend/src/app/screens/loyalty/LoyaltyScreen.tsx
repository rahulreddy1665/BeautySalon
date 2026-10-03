import { zodResolver } from '@hookform/resolvers/zod'
import { format, parseISO } from 'date-fns'
import { Gift, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { ErrorState } from '@/app/components/ErrorState'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { PageHeader } from '@/app/components/PageHeader'
import { ResponsiveTable, type ColumnDef } from '@/app/components/ResponsiveTable'
import { StatCard } from '@/app/components/StatCard'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs'
import {
  loyaltyRulesSchema,
  type LoyaltyRulesFormValues,
} from '@/app/helpers/loyaltyValidation'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import {
  useLoyaltyBalancesQuery,
  useLoyaltyLedgerQuery,
  useLoyaltyRulesQuery,
  useUpdateLoyaltyRulesMutation,
} from '@/app/hooks/queries/useLoyaltyQuery'
import type { Customer } from '@/app/service/customers/customersApi'
import type { LoyaltyMovement } from '@/app/service/loyalty/loyaltyApi'
import { AdjustPointsDialog } from '@/app/screens/loyalty/AdjustPointsDialog'
import { formatINR } from '@/app/utils'

type MemberRow = {
  id: string
  fullName: string
  phoneLabel: string
  points: number
  updatedLabel: string
}

type LedgerRow = {
  id: string
  dateLabel: string
  customerName: string
  typeLabel: string
  pointsLabel: string
  reason: string
  balanceLabel: string
}

const PAGE_SIZE = 20

function displayName(customer: Customer): string {
  return [customer.name, customer.lastName].filter(Boolean).join(' ')
}

const memberColumns = (
  onAdjust: (customerId: string) => void,
): ColumnDef<MemberRow>[] => [
  {
    accessorKey: 'fullName',
    header: 'Customer',
    cell: ({ row }) => (
      <div className="min-w-0">
        <Link
          to={`/customers/${row.original.id}`}
          className="font-medium text-primary hover:underline"
        >
          {row.original.fullName}
        </Link>
        <p className="text-xs text-muted-foreground tabular-nums">
          {row.original.phoneLabel}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'points',
    header: 'Points',
    cell: ({ getValue }) => (
      <span className="tabular-nums font-medium">{Number(getValue())}</span>
    ),
  },
  { accessorKey: 'updatedLabel', header: 'Updated' },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8"
        onClick={() => onAdjust(row.original.id)}
      >
        Adjust
      </Button>
    ),
  },
]

const ledgerColumns: ColumnDef<LedgerRow>[] = [
  { accessorKey: 'dateLabel', header: 'Date' },
  { accessorKey: 'customerName', header: 'Customer' },
  { accessorKey: 'typeLabel', header: 'Type' },
  { accessorKey: 'pointsLabel', header: 'Points' },
  { accessorKey: 'reason', header: 'Reason' },
  { accessorKey: 'balanceLabel', header: 'Balance' },
]

function typeLabel(type: LoyaltyMovement['type']): string {
  if (type === 'earn') return 'Earn'
  if (type === 'redeem') return 'Redeem'
  return 'Set'
}

export function LoyaltyScreen() {
  const customersQuery = useCustomersQuery()
  const rulesQuery = useLoyaltyRulesQuery()
  const balancesQuery = useLoyaltyBalancesQuery()
  const ledgerQuery = useLoyaltyLedgerQuery()
  const updateRules = useUpdateLoyaltyRulesMutation()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [presetCustomerId, setPresetCustomerId] = useState<string | null>(null)

  const customers = customersQuery.data ?? []
  const customerById = useMemo(() => {
    const map = new Map<string, Customer>()
    for (const c of customers) map.set(c._id, c)
    return map
  }, [customers])

  const rulesForm = useForm<LoyaltyRulesFormValues>({
    resolver: zodResolver(loyaltyRulesSchema),
    defaultValues: {
      enabled: true,
      earnPointsPer100Inr: 10,
      redeemValuePerPoint: 1,
      minRedeemPoints: 50,
      maxRedeemPercent: 50,
      pointsExpiryDays: 365,
    },
  })

  useEffect(() => {
    if (rulesQuery.data) {
      rulesForm.reset({
        enabled: rulesQuery.data.enabled,
        earnPointsPer100Inr: rulesQuery.data.earnPointsPer100Inr,
        redeemValuePerPoint: rulesQuery.data.redeemValuePerPoint,
        minRedeemPoints: rulesQuery.data.minRedeemPoints,
        maxRedeemPercent: rulesQuery.data.maxRedeemPercent,
        pointsExpiryDays: rulesQuery.data.pointsExpiryDays,
      })
    }
  }, [rulesQuery.data, rulesForm])

  const balanceByCustomer = useMemo(() => {
    const map = new Map<string, { points: number; updatedAt?: string }>()
    for (const b of balancesQuery.data ?? []) {
      map.set(b.customerId, { points: b.points, updatedAt: b.updatedAt })
    }
    return map
  }, [balancesQuery.data])

  const members = useMemo(() => {
    const q = search.trim().toLowerCase()
    return customers
      .filter((c) => c.isActive !== false)
      .map((c) => {
        const bal = balanceByCustomer.get(c._id)
        return {
          id: c._id,
          fullName: displayName(c),
          phoneLabel: String(c.phone ?? ''),
          points: bal?.points ?? 0,
          updatedLabel: bal?.updatedAt
            ? format(parseISO(bal.updatedAt), 'dd MMM yyyy')
            : '—',
        }
      })
      .filter((row) => {
        if (!q) return true
        return `${row.fullName} ${row.phoneLabel}`.toLowerCase().includes(q)
      })
      .sort((a, b) => b.points - a.points)
  }, [customers, balanceByCustomer, search])

  const pageCount = Math.max(1, Math.ceil(members.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = members.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  const ledgerRows = useMemo((): LedgerRow[] => {
    return (ledgerQuery.data ?? []).slice(0, 50).map((m) => {
      const customerId =
        typeof m.customer === 'string' ? m.customer : m.customer?._id
      const customer = customerId ? customerById.get(customerId) : undefined
      const customerName = customer
        ? displayName(customer)
        : typeof m.customer === 'object'
          ? [m.customer.name, m.customer.lastName].filter(Boolean).join(' ') ||
            'Customer'
          : (customerId ?? '').slice(0, 8)
      return {
        id: m.id ?? m._id,
        dateLabel: format(parseISO(m.createdAt), 'dd MMM yyyy, HH:mm'),
        customerName,
        typeLabel: typeLabel(m.type),
        pointsLabel: String(m.points),
        reason: m.reason,
        balanceLabel: String(m.balanceAfter),
      }
    })
  }, [ledgerQuery.data, customerById])

  const stats = useMemo(() => {
    const totalPoints = members.reduce((sum, m) => sum + m.points, 0)
    const withPoints = members.filter((m) => m.points > 0).length
    const rules = rulesQuery.data
    const redeemRate = rules?.redeemValuePerPoint ?? 1
    return {
      members: members.length,
      withPoints,
      totalPoints,
      liability: totalPoints * redeemRate,
    }
  }, [members, rulesQuery.data])

  const loading =
    customersQuery.isLoading ||
    rulesQuery.isLoading ||
    balancesQuery.isLoading

  const error =
    customersQuery.isError || rulesQuery.isError || balancesQuery.isError
      ? customersQuery.error ?? rulesQuery.error ?? balancesQuery.error
      : null

  const openAdjust = (customerId?: string) => {
    setPresetCustomerId(customerId ?? null)
    setAdjustOpen(true)
  }

  const onSaveRules = rulesForm.handleSubmit(async (values) => {
    await updateRules.mutateAsync(values)
  })

  return (
    <div className="min-w-0 space-y-3">
      <PageHeader
        description="Earn/redeem rules, member balances, and points ledger."
        actions={
          <Button
            type="button"
            size="sm"
            className="min-touch h-9"
            onClick={() => openAdjust()}
          >
            <Gift className="size-4" strokeWidth={1.75} />
            Adjust points
          </Button>
        }
      />

      {loading ? <LoadingSkeleton variant="stats" /> : null}
      {error ? (
        <ErrorState
          error={error}
          title="Could not load loyalty"
          onRetry={() => {
            void customersQuery.refetch()
            void rulesQuery.refetch()
            void balancesQuery.refetch()
          }}
        />
      ) : null}

      {!loading && !error ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-3">
            <StatCard label="Members" value={stats.members} />
            <StatCard label="With points" value={stats.withPoints} />
            <StatCard label="Points outstanding" value={stats.totalPoints} />
            <StatCard
              label="Est. redeem liability"
              value={stats.liability}
              format="inr"
            />
          </div>

          <Tabs defaultValue="members">
            <TabsList variant="line" className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="ledger">Ledger</TabsTrigger>
              <TabsTrigger value="rules">Rules</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="space-y-3 pt-2">
              <div className="relative max-w-md">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                  strokeWidth={1.75}
                />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(0)
                  }}
                  placeholder="Search name or phone"
                  className="pl-8"
                />
              </div>

              <ResponsiveTable
                data={pageRows}
                columns={memberColumns((id) => openAdjust(id))}
                mobileTitleKey="fullName"
                emptyTitle="No members"
                emptyDescription="Add customers to start tracking points."
              />

              {members.length > PAGE_SIZE ? (
                <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                  <span>
                    {members.length} members · page {safePage + 1} / {pageCount}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safePage <= 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={safePage >= pageCount - 1}
                      onClick={() =>
                        setPage((p) => Math.min(pageCount - 1, p + 1))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="ledger" className="space-y-3 pt-2">
              {ledgerQuery.isLoading ? <LoadingSkeleton rows={5} /> : null}
              {ledgerQuery.isError ? (
                <ErrorState
                  error={ledgerQuery.error}
                  title="Could not load ledger"
                  onRetry={() => void ledgerQuery.refetch()}
                />
              ) : null}
              {!ledgerQuery.isLoading && !ledgerQuery.isError ? (
                <ResponsiveTable
                  data={ledgerRows}
                  columns={ledgerColumns}
                  mobileTitleKey="dateLabel"
                  emptyTitle="No movements yet"
                  emptyDescription="Earn, redeem, or adjust points to fill the ledger."
                />
              ) : null}
            </TabsContent>

            <TabsContent value="rules" className="pt-2">
              <Card className="max-w-lg">
                <CardHeader className="pb-1">
                  <CardTitle>Points rules</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={onSaveRules} noValidate>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border"
                        checked={rulesForm.watch('enabled')}
                        onChange={(e) =>
                          rulesForm.setValue('enabled', e.target.checked, {
                            shouldDirty: true,
                          })
                        }
                      />
                      Loyalty enabled
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="earn">Earn / ₹100</Label>
                        <Input
                          id="earn"
                          type="number"
                          min={0}
                          step="1"
                          className="tabular-nums"
                          {...rulesForm.register('earnPointsPer100Inr', {
                            valueAsNumber: true,
                          })}
                        />
                        {rulesForm.formState.errors.earnPointsPer100Inr ? (
                          <p className="text-xs text-destructive">
                            {
                              rulesForm.formState.errors.earnPointsPer100Inr
                                .message
                            }
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="redeem-value">₹ per point</Label>
                        <Input
                          id="redeem-value"
                          type="number"
                          min={0}
                          step="0.5"
                          className="tabular-nums"
                          {...rulesForm.register('redeemValuePerPoint', {
                            valueAsNumber: true,
                          })}
                        />
                        {rulesForm.formState.errors.redeemValuePerPoint ? (
                          <p className="text-xs text-destructive">
                            {
                              rulesForm.formState.errors.redeemValuePerPoint
                                .message
                            }
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="min-redeem">Min redeem</Label>
                        <Input
                          id="min-redeem"
                          type="number"
                          min={0}
                          step="1"
                          className="tabular-nums"
                          {...rulesForm.register('minRedeemPoints', {
                            valueAsNumber: true,
                          })}
                        />
                        {rulesForm.formState.errors.minRedeemPoints ? (
                          <p className="text-xs text-destructive">
                            {rulesForm.formState.errors.minRedeemPoints.message}
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="max-redeem">Max redeem %</Label>
                        <Input
                          id="max-redeem"
                          type="number"
                          min={0}
                          max={100}
                          step="1"
                          className="tabular-nums"
                          {...rulesForm.register('maxRedeemPercent', {
                            valueAsNumber: true,
                          })}
                        />
                        {rulesForm.formState.errors.maxRedeemPercent ? (
                          <p className="text-xs text-destructive">
                            {
                              rulesForm.formState.errors.maxRedeemPercent
                                .message
                            }
                          </p>
                        ) : null}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="expiry">Expiry (days)</Label>
                        <Input
                          id="expiry"
                          type="number"
                          min={0}
                          step="1"
                          className="tabular-nums"
                          {...rulesForm.register('pointsExpiryDays', {
                            valueAsNumber: true,
                          })}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          0 = never expire
                        </p>
                      </div>
                    </div>

                    {rulesQuery.data ? (
                      <p className="text-xs text-muted-foreground">
                        Example: ₹1,000 bill →{' '}
                        {Math.floor(
                          (1000 / 100) * (rulesQuery.data.earnPointsPer100Inr || 0),
                        )}{' '}
                        pts · 100 pts ={' '}
                        {formatINR(
                          100 * (rulesQuery.data.redeemValuePerPoint || 0),
                        )}
                      </p>
                    ) : null}

                    <Button
                      type="submit"
                      size="sm"
                      disabled={updateRules.isPending}
                    >
                      {updateRules.isPending ? 'Saving…' : 'Save rules'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      <AdjustPointsDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        customers={customers.filter((c) => c.isActive !== false)}
        presetCustomerId={presetCustomerId}
      />
    </div>
  )
}
