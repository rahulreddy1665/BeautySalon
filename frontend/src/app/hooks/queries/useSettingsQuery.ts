import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  settingsApi,
  type AppointmentSettings,
  type BusinessSettings,
  type InvoiceSettings,
  type LoyaltySettings,
  type TaxSettings,
} from '@/app/service/settings/settingsApi'
import { toErrorMessage } from '@/app/utils'

export function useSalonSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings.all,
    queryFn: () => settingsApi.get(),
    staleTime: 60_000,
  })
}

function invalidateSettings(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
  void queryClient.invalidateQueries({ queryKey: queryKeys.loyalty.rules() })
}

export function usePatchBusinessMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<BusinessSettings>) =>
      settingsApi.patchBusiness(payload),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Business profile saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save'))
    },
  })
}

export function useUploadLogoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => settingsApi.uploadLogo(file),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Logo updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Logo upload failed'))
    },
  })
}

export function useRemoveLogoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => settingsApi.removeLogo(),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Logo removed')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not remove logo'))
    },
  })
}

export function usePatchTaxMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<TaxSettings>) => settingsApi.patchTax(payload),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Tax settings saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save'))
    },
  })
}

export function usePatchInvoiceSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      payload: Partial<InvoiceSettings> & { nextNumber?: number },
    ) => settingsApi.patchInvoice(payload),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Invoice settings saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save'))
    },
  })
}

export function usePatchAppointmentSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AppointmentSettings>) =>
      settingsApi.patchAppointments(payload),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Appointment settings saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save'))
    },
  })
}

export function usePatchLoyaltySettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<LoyaltySettings>) =>
      settingsApi.patchLoyalty(payload),
    onSuccess: () => {
      invalidateSettings(queryClient)
      toast.success('Loyalty settings saved')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not save'))
    },
  })
}
