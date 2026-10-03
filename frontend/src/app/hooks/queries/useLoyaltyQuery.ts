import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import { useCustomersQuery } from '@/app/hooks/queries/useCustomersQuery'
import {
  loyaltyApi,
  type AdjustLoyaltyPayload,
  type UpdateLoyaltyRulesPayload,
} from '@/app/service/loyalty/loyaltyApi'
import { toErrorMessage } from '@/app/utils'

export function useLoyaltyRulesQuery() {
  return useQuery({
    queryKey: queryKeys.loyalty.rules(),
    queryFn: () => loyaltyApi.getRules(),
  })
}

export function useLoyaltyBalancesQuery() {
  const customersQuery = useCustomersQuery()
  const ids = (customersQuery.data ?? []).map((c) => c._id)

  return useQuery({
    queryKey: [...queryKeys.loyalty.balances(), ids] as const,
    queryFn: () => loyaltyApi.listBalances(ids),
    enabled: !customersQuery.isLoading && !customersQuery.isError,
  })
}

export function useLoyaltyLedgerQuery(customerId?: string) {
  return useQuery({
    queryKey: queryKeys.loyalty.ledger(customerId),
    queryFn: () => loyaltyApi.listLedger(customerId),
  })
}

export function useLoyaltyBalanceQuery(customerId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.loyalty.balance(customerId ?? ''),
    queryFn: () => loyaltyApi.getBalance(customerId!),
    enabled: Boolean(customerId),
  })
}

export function useUpdateLoyaltyRulesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateLoyaltyRulesPayload) => loyaltyApi.updateRules(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.rules() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
      toast.success('Loyalty rules saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save rules'))
    },
  })
}

export function useAdjustLoyaltyMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: AdjustLoyaltyPayload) => loyaltyApi.adjust(payload),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.customers.detail(vars.customerId),
      })
      toast.success('Points updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not adjust points'))
    },
  })
}
