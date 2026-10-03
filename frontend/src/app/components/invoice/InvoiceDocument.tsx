import type { CSSProperties } from 'react'

import { BILLING, COMMON, SETTINGS } from '@/app/constants'
import type { InvoiceViewModel } from '@/app/components/invoice/invoiceViewModel'
import { cn } from '@/app/utils'

function paletteStyle(vm: InvoiceViewModel): CSSProperties {
  const p = vm.palette
  return {
    ['--inv-page' as string]: p.page,
    ['--inv-ink' as string]: p.ink,
    ['--inv-muted' as string]: p.muted,
    ['--inv-accent' as string]: p.accent,
    ['--inv-accent-ink' as string]: p.accentInk,
    ['--inv-band' as string]: p.band,
    ['--inv-band-ink' as string]: p.bandInk,
    ['--inv-rule' as string]: p.rule,
    ['--inv-surface' as string]: p.surface,
    backgroundColor: p.page,
    color: p.ink,
  }
}

function LineTable({
  title,
  lines,
  showStaff,
  formatMoney,
  headerBand,
}: {
  title: string
  lines: InvoiceViewModel['serviceLines']
  showStaff: boolean
  formatMoney: (n: number) => string
  headerBand?: boolean
}) {
  if (lines.length === 0) return null
  return (
    <section className="inv-section break-inside-avoid">
      <h3
        className="inv-section-title mb-1 font-[family-name:var(--font-invoice-serif)] text-sm font-semibold tracking-wide"
        style={{ color: 'var(--inv-accent)' }}
      >
        {title}
      </h3>
      <table className="inv-table w-full border-collapse text-sm">
        <thead>
          <tr
            className={cn(headerBand && 'inv-thead-band')}
            style={
              headerBand
                ? {
                    backgroundColor: 'var(--inv-band)',
                    color: 'var(--inv-band-ink)',
                  }
                : { borderBottom: '2px solid var(--inv-rule)' }
            }
          >
            <th className="py-1.5 pr-2 text-left font-medium">
              {SETTINGS.invoice.colDescription}
            </th>
            <th className="w-12 py-1.5 text-right font-medium">
              {SETTINGS.invoice.colQty}
            </th>
            <th className="w-20 py-1.5 text-right font-medium">
              {SETTINGS.invoice.colRate}
            </th>
            <th className="w-24 py-1.5 text-right font-medium">
              {SETTINGS.invoice.colAmount}
            </th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr
              key={`${line.name}-${i}`}
              className="inv-row break-inside-avoid"
              style={{
                borderBottom:
                  '1px solid color-mix(in srgb, var(--inv-muted) 25%, transparent)',
              }}
            >
              <td className="py-1.5 pr-2 align-top">
                <p className="font-medium">{line.name}</p>
                {showStaff && line.staffName ? (
                  <p className="text-[11px]" style={{ color: 'var(--inv-muted)' }}>
                    {line.staffName}
                  </p>
                ) : null}
              </td>
              <td className="py-1.5 text-right tabular-nums align-top">{line.qty}</td>
              <td className="py-1.5 text-right tabular-nums align-top">
                {formatMoney(line.rate)}
              </td>
              <td className="py-1.5 text-right tabular-nums align-top font-medium">
                {formatMoney(line.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

function TotalsBlock({ vm }: { vm: InvoiceViewModel }) {
  const rows: Array<{
    label: string
    value: string
    strong?: boolean
    accent?: boolean
  }> = [
    {
      label: BILLING.new.servicesDiscount,
      value: `−${vm.formatMoney(vm.serviceDiscount)}`,
      hide: vm.serviceDiscount <= 0,
    },
    {
      label: BILLING.new.productsDiscount,
      value: `−${vm.formatMoney(vm.productDiscount)}`,
      hide: vm.productDiscount <= 0,
    },
    {
      label: SETTINGS.invoice.taxable,
      value: vm.formatMoney(vm.taxable),
    },
    ...(vm.gstEnabled
      ? [
          { label: BILLING.new.cgst, value: vm.formatMoney(vm.cgst) },
          { label: BILLING.new.sgst, value: vm.formatMoney(vm.sgst) },
        ]
      : []),
    {
      label: BILLING.new.loyaltyRedeem,
      value: `−${vm.formatMoney(vm.loyaltyRedeem)}`,
      hide: vm.loyaltyRedeem <= 0,
    },
    {
      label: BILLING.new.roundOff,
      value: vm.formatMoney(vm.roundOff),
      hide: vm.roundOff === 0,
    },
    {
      label: BILLING.new.tip,
      value: vm.formatMoney(vm.tip),
      hide: vm.tip <= 0,
    },
    {
      label: BILLING.new.grandTotal,
      value: vm.formatMoney(vm.total),
      strong: true,
      accent: true,
    },
  ].filter((r) => !('hide' in r && r.hide)) as Array<{
    label: string
    value: string
    strong?: boolean
    accent?: boolean
  }>

  return (
    <div className="ml-auto mt-4 w-full max-w-xs space-y-1 text-sm">
      {rows.map((row) => (
        <div
          key={row.label}
          className={cn(
            'flex justify-between gap-4 tabular-nums',
            row.strong && 'mt-2 pt-2 text-base font-semibold',
            row.accent && 'inv-total-band rounded-sm px-2 py-1.5',
          )}
          style={
            row.accent
              ? {
                  backgroundColor: 'var(--inv-band)',
                  color: 'var(--inv-band-ink)',
                  borderTop: 'none',
                }
              : row.strong
                ? { borderTop: '1px solid var(--inv-rule)', color: 'var(--inv-accent)' }
                : undefined
          }
        >
          <span>{row.label}</span>
          <span>{row.value}</span>
        </div>
      ))}
      <p className="pt-1 text-xs" style={{ color: 'var(--inv-muted)' }}>
        {BILLING.new.paymentMode}:{' '}
        {COMMON.paymentMode[vm.paymentMode as keyof typeof COMMON.paymentMode] ??
          vm.paymentMode}
      </p>
    </div>
  )
}

export function InvoiceDocument({
  vm,
  className,
}: {
  vm: InvoiceViewModel
  className?: string
}) {
  const isThermal = vm.templateId === 'thermal'
  const isBlush = vm.templateId === 'blush'
  const isCompact = vm.templateId === 'compact'
  const headerBand = isBlush || isCompact

  return (
    <article
      className={cn(
        'invoice-sheet relative mx-auto overflow-hidden text-[13px] leading-snug',
        isThermal && 'max-w-[320px] font-mono text-[11px]',
        isCompact && 'max-w-[560px]',
        !isThermal && !isCompact && 'max-w-[794px]',
        className,
      )}
      style={paletteStyle(vm)}
      data-template={vm.templateId}
    >
      {isBlush ? (
        <div
          className="pointer-events-none absolute -right-16 -bottom-16 size-56 rounded-full opacity-40 print:opacity-50"
          style={{ backgroundColor: 'var(--inv-accent)' }}
          aria-hidden
        />
      ) : null}

      <div className={cn('relative p-6 sm:p-8', isThermal && 'p-3', isCompact && 'p-5')}>
        <header className="inv-header break-inside-avoid text-center">
          {vm.showLogo && vm.logoUrl ? (
            <img
              src={vm.logoUrl}
              alt=""
              className={cn('mx-auto mb-2 object-contain', isThermal ? 'h-10' : 'h-14')}
            />
          ) : null}
          <p
            className={cn(
              'font-semibold tracking-tight',
              !isThermal && 'font-[family-name:var(--font-invoice-serif)] text-xl',
              isThermal && 'text-sm uppercase',
            )}
          >
            {vm.salonName}
          </p>
          <h1
            className={cn(
              'mt-3 font-[family-name:var(--font-invoice-serif)] tracking-wide',
              isBlush && 'text-2xl font-bold uppercase',
              !isBlush && !isThermal && 'text-3xl font-semibold',
              isThermal && 'text-base font-bold uppercase',
            )}
            style={{ color: 'var(--inv-accent)' }}
          >
            {isBlush ? SETTINGS.invoice.titleUpper : SETTINGS.invoice.title}
          </h1>
          <div
            className="mx-auto mt-1 h-0.5 w-16"
            style={{ backgroundColor: 'var(--inv-accent)' }}
          />
        </header>

        <div className={cn('mt-5 grid gap-4 text-sm', !isThermal && 'sm:grid-cols-2')}>
          <div className={cn(isThermal && 'text-left')}>
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--inv-accent)' }}
            >
              {SETTINGS.invoice.invoiceFrom}
            </p>
            <p className="font-medium">{vm.salonName}</p>
            {vm.address ? (
              <p style={{ color: 'var(--inv-muted)' }}>{vm.address}</p>
            ) : null}
            {vm.phone ? <p style={{ color: 'var(--inv-muted)' }}>{vm.phone}</p> : null}
            {vm.email ? <p style={{ color: 'var(--inv-muted)' }}>{vm.email}</p> : null}
            {vm.gstin ? (
              <p className="tabular-nums">
                {SETTINGS.business.gstin}: {vm.gstin}
              </p>
            ) : null}
          </div>
          <div className={cn(!isThermal && 'sm:text-right')}>
            <p
              className="text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: 'var(--inv-accent)' }}
            >
              {SETTINGS.invoice.invoiceTo}
            </p>
            <p className="font-medium break-words">{vm.customerName}</p>
            {vm.customerPhone ? (
              <p style={{ color: 'var(--inv-muted)' }}>{vm.customerPhone}</p>
            ) : null}
            <p className="mt-2 tabular-nums">
              {SETTINGS.invoice.numberLabel}: {vm.invoiceNumber}
            </p>
            <p className="tabular-nums" style={{ color: 'var(--inv-muted)' }}>
              {COMMON.labels.date}: {vm.dateLabel}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <LineTable
            title={BILLING.new.servicesHeading}
            lines={vm.serviceLines}
            showStaff={vm.showStaffNames}
            formatMoney={vm.formatMoney}
            headerBand={headerBand}
          />
          <LineTable
            title={BILLING.new.productsHeading}
            lines={vm.productLines}
            showStaff={vm.showStaffNames}
            formatMoney={vm.formatMoney}
            headerBand={headerBand}
          />
        </div>

        <TotalsBlock vm={vm} />

        <footer
          className={cn(
            'inv-footer relative mt-8 grid gap-4 break-inside-avoid text-xs',
            !isThermal && 'sm:grid-cols-2',
            isBlush && 'rounded-md p-3',
          )}
          style={
            isBlush
              ? {
                  backgroundColor: 'var(--inv-band)',
                  color: 'var(--inv-band-ink)',
                }
              : undefined
          }
        >
          <div>
            <p className="font-semibold">{SETTINGS.invoice.termsTitle}</p>
            <p className="mt-1 whitespace-pre-wrap opacity-90">
              {vm.termsText || SETTINGS.invoice.termsDefault}
            </p>
          </div>
          <div className={cn(!isThermal && 'sm:text-right')}>
            <p className="font-semibold">{SETTINGS.invoice.paymentMethod}</p>
            <p className="mt-1">
              {COMMON.paymentMode[vm.paymentMode as keyof typeof COMMON.paymentMode] ??
                vm.paymentMode}
            </p>
            <p
              className={cn(
                'mt-3 font-[family-name:var(--font-invoice-serif)] text-lg',
                isBlush && 'text-xl',
              )}
            >
              {vm.thankYouText}
            </p>
          </div>
        </footer>
      </div>
    </article>
  )
}
