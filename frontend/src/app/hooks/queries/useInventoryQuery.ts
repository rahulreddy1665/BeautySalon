import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { queryKeys } from '@/app/hooks/queries/queryKeys'
import {
  productsApi,
  type ProductInput,
  type ProductListParams,
} from '@/app/service/products/productsApi'
import { toErrorMessage } from '@/app/utils'

export function useProductsQuery(params: ProductListParams = {}) {
  return useQuery({
    queryKey: queryKeys.inventory.list(params as Record<string, unknown>),
    queryFn: () => productsApi.list(params),
  })
}

export function useProductsCatalogQuery() {
  return useQuery({
    queryKey: queryKeys.inventory.list({ catalog: true }),
    queryFn: () => productsApi.getAll(),
  })
}

export function useProductQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.detail(id ?? ''),
    queryFn: () => productsApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ProductInput) => productsApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success('Product added')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not add product'))
    },
  })
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductInput> }) =>
      productsApi.update(id, payload),
    onSuccess: (product) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.inventory.detail(product._id),
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success('Product updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update product'))
    },
  })
}

export function useDeleteProductMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => productsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success('Product deleted')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not delete product'))
    },
  })
}

export function useImportProductsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => productsApi.importFile(file),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success(
        `Import done · ${result.summary.created} created · ${result.summary.updated} updated · ${result.summary.error} errors`,
      )
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Import failed'))
    },
  })
}

/** @deprecated Prefer useProductsQuery — kept so old imports compile during rename. */
export function useInventoryQuery() {
  return useProductsCatalogQuery()
}

/** @deprecated */
export function useInventoryProductQuery(id: string | undefined) {
  return useProductQuery(id)
}

export function useAddStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      quantity,
      note,
    }: {
      id: string
      quantity: number
      note?: string
    }) => productsApi.addStock(id, { quantity, note }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success('Stock updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update stock'))
    },
  })
}

export function useUseStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      quantity,
      reason,
      staffId,
    }: {
      id: string
      quantity: number
      reason: string
      staffId?: string
    }) => productsApi.useStock(id, { quantity, reason, staffId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      toast.success('Stock updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update stock'))
    },
  })
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      countedQty,
      reason,
    }: {
      id: string
      countedQty: number
      reason: string
    }) => productsApi.adjustStock(id, { countedQty, reason }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
      void queryClient.invalidateQueries({ queryKey: queryKeys.billing.products() })
      toast.success('Stock updated')
    },
    onError: (error) => {
      toast.error(toErrorMessage(error, 'Could not update stock'))
    },
  })
}

export function useStockLedgerQuery(id: string | undefined, open: boolean) {
  return useQuery({
    queryKey: queryKeys.inventory.history(id ?? ''),
    queryFn: () => productsApi.ledger(id!),
    enabled: Boolean(id) && open,
  })
}
