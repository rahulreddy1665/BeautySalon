import { useState } from 'react'

import { FormField } from '@/app/components/FormField'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { COMMON, INVENTORY } from '@/app/constants'
import {
  useAddStockMutation,
  useAdjustStockMutation,
  useStockLedgerQuery,
  useUseStockMutation,
} from '@/app/hooks/queries/useInventoryQuery'
import type { SalonProduct } from '@/app/service/products/productsApi'
import { formatINR, toErrorMessage } from '@/app/utils'

export type StockDialogMode = 'add' | 'use' | 'adjust' | 'history'

interface Props {
  open: boolean
  mode: StockDialogMode
  product: SalonProduct | null
  onOpenChange: (open: boolean) => void
}

export function ProductStockDialog({
  open,
  mode,
  product,
  onOpenChange,
}: Props) {
  const [quantity, setQuantity] = useState(1)
  const [countedQty, setCountedQty] = useState(0)
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const addMutation = useAddStockMutation()
  const useMutation = useUseStockMutation()
  const adjustMutation = useAdjustStockMutation()
  const ledgerQuery = useStockLedgerQuery(
    product?._id,
    open && mode === 'history',
  )

  const pending =
    addMutation.isPending || useMutation.isPending || adjustMutation.isPending

  const title =
    mode === 'add'
      ? INVENTORY.stock.add
      : mode === 'use'
        ? INVENTORY.stock.use
        : mode === 'adjust'
          ? INVENTORY.stock.adjust
          : INVENTORY.stock.historyTitle

  const onSubmit = async () => {
    if (!product) return
    setError('')
    try {
      if (mode === 'add') {
        await addMutation.mutateAsync({
          id: product._id,
          quantity,
          note: note || undefined,
        })
      } else if (mode === 'use') {
        await useMutation.mutateAsync({
          id: product._id,
          quantity,
          reason,
        })
      } else if (mode === 'adjust') {
        await adjustMutation.mutateAsync({
          id: product._id,
          countedQty,
          reason,
        })
      }
      onOpenChange(false)
      setQuantity(1)
      setCountedQty(0)
      setReason('')
      setNote('')
    } catch (err) {
      setError(toErrorMessage(err, INVENTORY.toasts.stockFailed))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {title}
            {product ? ` · ${product.name}` : ''}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-3">
          {mode === 'history' ? (
            <div className="max-h-80 overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-muted/80 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5">{INVENTORY.stock.colDate}</th>
                    <th className="px-2 py-1.5">{INVENTORY.stock.colType}</th>
                    <th className="px-2 py-1.5">{INVENTORY.stock.colQty}</th>
                    <th className="px-2 py-1.5">{INVENTORY.stock.colBalance}</th>
                    <th className="px-2 py-1.5">{INVENTORY.stock.colReason}</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerQuery.data?.items ?? []).map((row) => (
                    <tr key={row._id} className="border-t border-border">
                      <td className="px-2 py-1.5 text-xs">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="px-2 py-1.5">{row.type}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.quantity}</td>
                      <td className="px-2 py-1.5 tabular-nums">
                        {row.balanceAfter}
                      </td>
                      <td className="px-2 py-1.5 text-muted-foreground">
                        {row.reason || row.note || '—'}
                        {row.reference?.invoiceNumber
                          ? ` · ${row.reference.invoiceNumber}`
                          : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <>
              {mode !== 'adjust' ? (
                <FormField label={INVENTORY.stock.quantity} htmlFor="stock-qty">
                  <Input
                    id="stock-qty"
                    type="number"
                    min={0.001}
                    step={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  />
                </FormField>
              ) : (
                <FormField
                  label={INVENTORY.stock.countedQty}
                  htmlFor="stock-counted"
                >
                  <Input
                    id="stock-counted"
                    type="number"
                    min={0}
                    step={1}
                    value={countedQty}
                    onChange={(e) => setCountedQty(Number(e.target.value) || 0)}
                  />
                </FormField>
              )}
              {mode === 'add' ? (
                <FormField label={INVENTORY.stock.note} htmlFor="stock-note">
                  <Input
                    id="stock-note"
                    placeholder={INVENTORY.stock.optionalNote}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                </FormField>
              ) : (
                <FormField label={INVENTORY.stock.reason} htmlFor="stock-reason">
                  <Input
                    id="stock-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </FormField>
              )}
              {product?.trackStock ? (
                <p className="text-xs text-muted-foreground">
                  {INVENTORY.list.colStock}: {product.stockQty ?? 0}
                  {product.unit ? ` ${product.unit}` : ''}
                  {product.price ? ` · ${formatINR(product.price)}` : ''}
                </p>
              ) : null}
            </>
          )}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {COMMON.actions.cancel}
          </Button>
          {mode !== 'history' ? (
            <Button type="button" disabled={pending} onClick={() => void onSubmit()}>
              {pending ? COMMON.labels.loading : COMMON.actions.save}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
