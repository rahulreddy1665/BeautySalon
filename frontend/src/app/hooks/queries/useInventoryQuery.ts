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
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: Partial<ProductInput>
    }) => productsApi.update(id, payload),
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
