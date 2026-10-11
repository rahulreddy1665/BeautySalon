import { Download, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'

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
import { phoneToNumber } from '@/app/helpers/customerValidation'
import { useImportCustomersMutation } from '@/app/hooks/queries/useCustomersQuery'
import type { CustomerImportRowResult } from '@/app/service/customers/customersApi'
import { cn } from '@/app/utils'
import { loadXlsx } from '@/app/utils/loadXlsx'

interface CustomerImportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type PreviewRow = {
  row: number
  name: string
  phone: string
  email: string
  error?: string
}

const INDIAN_PHONE = /^(?:\+?91[\s-]?|0)?[6-9]\d{9}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function downloadTemplate() {
  const XLSX = await loadXlsx()
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.aoa_to_sheet([
    ['Name', 'Phone', 'Email'],
    ['Priya Sharma', '9876543210', 'priya@example.com'],
    ['', '9123456780', ''],
  ])
  XLSX.utils.book_append_sheet(wb, ws, 'Customers')
  XLSX.writeFile(wb, 'customers-template.xlsx')
}

export function CustomerImportDialog({ open, onOpenChange }: CustomerImportDialogProps) {
  const importMutation = useImportCustomersMutation()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<PreviewRow[]>([])
  const [results, setResults] = useState<CustomerImportRowResult[] | null>(null)

  const hasPreviewErrors = useMemo(() => preview.some((r) => Boolean(r.error)), [preview])

  const parseFile = async (next: File) => {
    setFile(next)
    setResults(null)
    const [XLSX, buffer] = await Promise.all([loadXlsx(), next.arrayBuffer()])
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheet = wb.Sheets[wb.SheetNames[0] ?? '']
    if (!sheet) {
      setPreview([])
      return
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
    })
    const parsed: PreviewRow[] = []
    rows.forEach((row, index) => {
      const keys = Object.keys(row)
      const pick = (...names: string[]) => {
        for (const name of names) {
          const key = keys.find((k) => k.trim().toLowerCase() === name.toLowerCase())
          if (key !== undefined) return String(row[key] ?? '').trim()
        }
        return ''
      }
      const name = pick('name', 'customer name', 'full name')
      const phone = pick('phone', 'mobile', 'mobile number', 'phone number')
      const email = pick('email', 'email address')
      if (!name && !phone && !email) return
      let error: string | undefined
      if (!phone) error = 'Phone required'
      else if (!INDIAN_PHONE.test(phone.replace(/[\s-]/g, ''))) error = 'Invalid phone'
      else if (email && !EMAIL.test(email)) error = 'Invalid email'
      parsed.push({
        row: index + 2,
        name,
        phone: error ? phone : String(phoneToNumber(phone)),
        email,
        error,
      })
    })
    setPreview(parsed)
  }

  const submit = async () => {
    if (!file || hasPreviewErrors) return
    const data = await importMutation.mutateAsync(file)
    setResults(data.results)
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setFile(null)
      setPreview([])
      setResults(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import customers</DialogTitle>
          <DialogDescription>
            Columns: Name, Phone, Email. Only Phone is required. Existing customers are
            matched by phone and updated.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void downloadTemplate()}
          >
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
          {preview.length > 0 && !results ? (
            <div className="max-h-48 overflow-auto rounded-md border border-border text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="px-2 py-1 text-left">Row</th>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Phone</th>
                    <th className="px-2 py-1 text-left">Email</th>
                    <th className="px-2 py-1 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.row} className={cn(row.error && 'bg-destructive/10')}>
                      <td className="px-2 py-1 tabular-nums">{row.row}</td>
                      <td className="px-2 py-1">{row.name || '—'}</td>
                      <td className="px-2 py-1 tabular-nums">{row.phone || '—'}</td>
                      <td className="max-w-32 truncate px-2 py-1">{row.email || '—'}</td>
                      <td
                        className={cn(
                          'px-2 py-1',
                          row.error ? 'text-destructive' : 'text-muted-foreground',
                        )}
                      >
                        {row.error ?? 'OK'}
                      </td>
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
                  {r.phone ? ` · ${r.phone}` : ''}
                  {r.name ? ` · ${r.name}` : ''}
                </p>
              ))}
            </div>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
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
