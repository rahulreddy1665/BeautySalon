/**
 * Invoice template palettes — the only place hard-coded hex is allowed
 * outside `theme/tokens.ts` (per product rules).
 */

export type InvoiceTemplateId =
  | 'creamGold'
  | 'blush'
  | 'compact'
  | 'thermal'
  /** Legacy id kept for old invoices */
  | 'classic'

export type InvoiceAccentPreset =
  | 'gold'
  | 'blush'
  | 'teal'
  | 'charcoal'
  | 'sage'
  | 'plum'
  | 'custom'

export interface InvoicePalette {
  page: string
  ink: string
  muted: string
  accent: string
  accentInk: string
  band: string
  bandInk: string
  rule: string
  surface: string
}

const PRESETS: Record<Exclude<InvoiceAccentPreset, 'custom'>, string> = {
  gold: '#FFD700',
  blush: '#C45C7A',
  teal: '#2A6F6F',
  charcoal: '#3A3A3A',
  sage: '#6B8F71',
  plum: '#6B4C7A',
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  if (h.length !== 6) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

/** Pick dark or white ink for text sitting on an accent band. */
export function contrastInk(accentHex: string): string {
  return luminance(accentHex) > 0.45 ? '#1A1512' : '#FFFFFF'
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}

export function resolveAccent(
  preset: InvoiceAccentPreset,
  customHex?: string,
): string {
  if (preset === 'custom' && customHex && isValidHexColor(customHex)) {
    return customHex.toUpperCase()
  }
  return PRESETS[preset === 'custom' ? 'gold' : preset]
}

export function resolveTemplateId(
  id?: string | null,
): Exclude<InvoiceTemplateId, 'classic'> {
  if (id === 'blush' || id === 'compact' || id === 'thermal' || id === 'creamGold') {
    return id
  }
  // classic / missing → creamGold
  return 'creamGold'
}

export function buildPalette(
  templateId: InvoiceTemplateId,
  accentPreset: InvoiceAccentPreset = 'gold',
  customAccent?: string,
): InvoicePalette {
  const resolved = resolveTemplateId(templateId)
  const accent = resolveAccent(
    accentPreset === 'custom'
      ? 'custom'
      : resolved === 'blush' && accentPreset === 'gold'
        ? 'blush'
        : accentPreset,
    customAccent,
  )
  const accentInk = contrastInk(accent)

  if (resolved === 'thermal') {
    return {
      page: '#FFFFFF',
      ink: '#111111',
      muted: '#555555',
      accent: '#111111',
      accentInk: '#FFFFFF',
      band: '#EEEEEE',
      bandInk: '#111111',
      rule: '#CCCCCC',
      surface: '#FFFFFF',
    }
  }

  if (resolved === 'blush') {
    return {
      page: '#FBE8EE',
      ink: '#2A181C',
      muted: '#7A5560',
      accent,
      accentInk,
      band: accent,
      bandInk: accentInk,
      rule: accent,
      surface: '#FFF5F7',
    }
  }

  if (resolved === 'compact') {
    return {
      page: '#FAF7F2',
      ink: '#241F1A',
      muted: '#6B635C',
      accent,
      accentInk,
      band: accent,
      bandInk: accentInk,
      rule: accent,
      surface: '#FFFFFF',
    }
  }

  // creamGold
  return {
    page: '#F7F0E4',
    ink: '#2A2420',
    muted: '#6B635C',
    accent,
    accentInk,
    band: accent,
    bandInk: accentInk,
    rule: accent,
    surface: '#FFFCF7',
  }
}

export const ACCENT_PRESET_OPTIONS: Array<{
  id: Exclude<InvoiceAccentPreset, 'custom'>
  hex: string
}> = (Object.keys(PRESETS) as Array<Exclude<InvoiceAccentPreset, 'custom'>>).map(
  (id) => ({ id, hex: PRESETS[id] }),
)

export const TEMPLATE_OPTIONS: Array<{
  id: Exclude<InvoiceTemplateId, 'classic'>
  labelKey: 'creamGold' | 'blush' | 'compact' | 'thermal'
}> = [
  { id: 'creamGold', labelKey: 'creamGold' },
  { id: 'blush', labelKey: 'blush' },
  { id: 'compact', labelKey: 'compact' },
  { id: 'thermal', labelKey: 'thermal' },
]
