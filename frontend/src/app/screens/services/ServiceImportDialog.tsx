import { Download, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'

import { DialogBody } from '@/app/components/ui/dialog'
import { Button } from '@/app/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog'
import { Input } from '@/app/components/ui/input'
import { useImportServicesMutation } from '@/app/hooks/queries/useServicesQuery'
import type { ServiceImportRowResult } from '@/app/service/services/servicesApi'
import { cn } from '@/app/utils'

interface ServiceImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewRow = {
  row: number
  name: string
  category: string
  price: string
  duration: string
  error?: string
}

function downloadTemplate() {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Category', 'Price', 'Duration (min)'],
    ['Haircut', 'Hair', 499, 45],
    ['Blow dry', 'Hair', 350, ''],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Services')
  XLSX.writeFile(wb, 'services-template.xlsx')
}

export function ServiceImportDialog({ open, onOpenChange }: ServiceImportDialogProps) {
  const importMutation = useImportServicesMutation()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [results, setResults] = useState<ServiceImportRowResult[] | null>(null)

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
          return ''
        }
        const name = String(pick('name', 'service name', 'service')).trim()
        const category = String(pick('category', 'service category')).trim()
        const priceRaw = pick('price', 'price (inr)', 'amount')
        const durationRaw = pick('duration (min)', 'duration', 'durationminutes')
        const price = Number(priceRaw)
        let error: string | undefined
        if (!name || !category) error = 'Name and category required'
        else if (!Number.isFinite(price) || price <= 0)
          error = 'Price must be a positive number'
        return {
          row: index + 2,
          name,
          category,
          price: String(priceRaw ?? ''),
          duration: String(durationRaw ?? ''),
          error,
        }
      }),
    )
  }

  const confirmImport = async () => {
    if (!file) return
    const data = await importMutation.mutateAsync(file)
    setResults(data.results)
  }

  const close = (next: boolean) => {
    if (!next) {
      setFile(null)
      setPreview([])
      setResults(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import services</DialogTitle>
          <DialogDescription>
            Upload a spreadsheet. Blank duration defaults to 30 minutes. Bad rows are
            reported without stopping the rest.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="size-4" strokeWidth={1.75} />
              Download template
            </Button>
            <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-secondary px-3 text-sm font-medium">
              <Upload className="size-4" strokeWidth={1.75} />
              Choose file
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void parseFile(f)
                }}
              />
            </label>
          </div>

          {file ? <p className="text-xs text-muted-foreground">{file.name}</p> : null}

          {preview.length > 0 && !results ? (
            <div className="max-h-56 overflow-auto rounded-md border border-border">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1.5">Row</th>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Category</th>
                    <th className="px-2 py-1.5">Price</th>
                    <th className="px-2 py-1.5">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr
                      key={row.row}
                      className={cn(
                        'border-t border-border',
                        row.error && 'bg-destructive/10',
                      )}
                    >
                      <td className="px-2 py-1.5 tabular-nums">{row.row}</td>
                      <td className="px-2 py-1.5">{row.name || '—'}</td>
                      <td className="px-2 py-1.5">{row.category || '—'}</td>
                      <td className="px-2 py-1.5 tabular-nums">{row.price || '—'}</td>
                      <td className="px-2 py-1.5">
                        {row.error ? (
                          <span className="text-destructive">{row.error}</span>
                        ) : (
                          <span className="tabular-nums">{row.duration || '30'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {results ? (
            <div className="space-y-2 text-sm">
              <p className="font-medium">Import results</p>
              <ul className="max-h-48 space-y-1 overflow-auto text-xs">
                {results.map((r) => (
                  <li key={`${r.row}-${r.status}`}>
                    Row {r.row}: {r.status}
                    {r.reason ? ` — ${r.reason}` : ''}
                    {r.name ? ` (${r.name})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => close(false)}
          >
            {results ? 'Close' : 'Cancel'}
          </Button>
          {!results ? (
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!file || importMutation.isPending || preview.length === 0}
              onClick={() => void confirmImport()}
            >
              {importMutation.isPending
                ? 'Importing…'
                : hasPreviewErrors
                  ? 'Import valid rows'
                  : 'Confirm import'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
