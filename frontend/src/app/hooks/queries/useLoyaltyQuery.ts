import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
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

/**
 * Loyalty balances. Omit `customerIds` for every balance (only customers with
 * points have one), or pass the few IDs on screen. Never pass the whole customer
 * list: the IDs go in the URL and long URLs are rejected by the proxy.
 */
export function useLoyaltyBalancesQuery(
  customerIds?: string[],
  options: { enabled?: boolean } = {},
) {
  const ids = customerIds ? [...new Set(customerIds)].sort() : undefined

  return useQuery({
    queryKey: [...queryKeys.loyalty.balances(), ids ?? 'all'] as const,
    queryFn: () => loyaltyApi.listBalances(ids),
    enabled: (options.enabled ?? true) && (ids === undefined || ids.length > 0),
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
