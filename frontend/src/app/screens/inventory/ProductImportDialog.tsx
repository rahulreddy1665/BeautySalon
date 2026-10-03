import { Download, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { useImportProductsMutation } from '@/app/hooks/queries/useInventoryQuery'
import type { ProductImportRowResult } from '@/app/service/products/productsApi'
import { cn } from '@/app/utils'

interface ProductImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewRow = {
  row: number
  name: string
  price: string
  error?: string
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Price'],
    ['Shampoo 250ml', 450],
    ['Hair serum', 699],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Products')
  XLSX.writeFile(wb, 'products-template.xlsx')
}

export function ProductImportDialog({ open, onOpenChange }: ProductImportDialogProps) {
  const importMutation = useImportProductsMutation()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [results, setResults] = useState<ProductImportRowResult[] | null>(null)

  const hasPreviewErrors = useMemo(() => preview.some((r) => Boolean(r.error)), [preview])

  const parseFile = async (next: File) => {
    setFile(next)
    setResults(null)
    const buffer = await next.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0] ?? '']
    if (!sheet) {
      setPreview([])
      return
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })
    setPreview(
      rows.map((row, index) => {
        const keys = Object.keys(row)
        const pick = (...names: string[]) => {
          for (const name of names) {
            const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
            if (key !== undefined) return row[key]
          }
          return undefined
        }
        const name = String(pick('name', 'product name', 'product') ?? '').trim()
        const priceRaw = pick('price', 'price (inr)', 'amount')
        const priceNum = Number(priceRaw)
        let error: string | undefined
        if (!name) error = 'Name required'
        else if (!Number.isFinite(priceNum) || priceNum < 0) error = 'Invalid price'
        return {
          row: index + 2,
          name,
          price: priceRaw === undefined || priceRaw === '' ? '' : String(priceRaw),
          error,
        }
      }),
    )
  }

  const submit = async () => {
    if (!file || hasPreviewErrors) return
    const data = await importMutation.mutateAsync(file)
    setResults(data.results)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setFile(null)
          setPreview([])
          setResults(null)
        }
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import products</DialogTitle>
          <DialogDescription>
            Upserts by name. Download the template, fill rows, then upload.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Button type="button" variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="size-3.5" strokeWidth={1.75} />
            Download template
          </Button>
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => {
              const next = e.target.files?.[0]
              if (next) void parseFile(next)
            }}
          />
          {preview.length > 0 ? (
            <div className="max-h-48 overflow-auto rounded-md border border-border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Row</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Price</th>
                    <th className="px-2 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.row} className={cn(row.error && 'bg-destructive/10')}>
                      <td className="px-2 py-1 tabular-nums">{row.row}</td>
                      <td className="px-2 py-1">{row.name || '—'}</td>
                      <td className="px-2 py-1">{row.price || '—'}</td>
                      <td className="px-2 py-1 text-destructive">{row.error ?? 'OK'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {results ? (
            <div className="max-h-40 overflow-auto rounded-md border border-border text-xs">
              {results.map((r) => (
                <p
                  key={`${r.row}-${r.status}`}
                  className="border-b border-border px-2 py-1"
                >
                  Row {r.row}: {r.status}
                  {r.reason ? ` · ${r.reason}` : ''}
                  {r.name ? ` · ${r.name}` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            disabled={!file || hasPreviewErrors || importMutation.isPending}
            onClick={() => void submit()}
          >
            <Upload className="size-3.5" strokeWidth={1.75} />
            {importMutation.isPending ? 'Importing…' : 'Confirm import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
