/**
 * Design tokens — CSS vars are the runtime source; this mirrors them for TS/charts.
 * Brand: gold (#FFD700) on white (light) / black (dark). Never white text on gold.
 *
 * Contrast (WCAG AA: text 4.5:1, UI 3:1) — measured ratios:
 *
 * LIGHT
 * - Body #1A1A1A on page #F6F6F7 → 16.1:1
 * - Muted #6B6B73 on page → 4.9:1 · on white → 5.3:1
 * - On-gold #1A1A1A on #FFD700 → 12.4:1
 * - Gold-deep #8A6D00 on white → 4.9:1
 * - Input border #92929C on white → 3.1:1 (UI)
 * - Status chips (booked/confirmed/completed/cancelled/no-show) → ≥5.3:1
 * - Chart labels (muted on white) → 5.3:1
 * - Decorative card border #E4E4E7 is intentionally subtle (~1.3:1)
 *
 * DARK
 * - Body #F2F2F2 on #0B0B0B → 17.6:1
 * - Muted #A0A0A8 on page → 7.6:1 · on card #141414 → 7.1:1
 * - Gold #FFD700 on black → 14.0:1 · on card → 13.1:1
 * - On-gold #1A1A1A on #FFD700 → 12.4:1
 * - Status chip pairs → ≥6.4:1
 *
 * Gradient policy: `--gold-gradient` ONLY on primary buttons, dashboard highlight
 * stat card, and active sidebar pill accent. Everything else stays flat.
 */

export const theme = {
  light: {
    brandAccent: '#FFD700',
    gold: '#FFD700',
    goldHover: '#E6C200',
    goldPressed: '#D4B000',
    goldSoft: '#FFF8CC',
    goldDeep: '#8A6D00',
    onGold: '#1A1A1A',
    background: '#F6F6F7',
    foreground: '#1A1A1A',
    card: '#FFFFFF',
    cardForeground: '#1A1A1A',
    popover: '#FFFFFF',
    popoverForeground: '#1A1A1A',
    primary: '#FFD700',
    primaryForeground: '#1A1A1A',
    primaryHover: '#E6C200',
    primaryPressed: '#D4B000',
    primaryDisabled: '#F0E6A0',
    secondary: '#F0F0F2',
    secondaryForeground: '#1A1A1A',
    muted: '#F0F0F2',
    mutedForeground: '#6B6B73',
    accent: '#FFF8CC',
    accentForeground: '#8A6D00',
    destructive: '#B91C1C',
    destructiveForeground: '#FFFFFF',
    border: '#E4E4E7',
    input: '#92929C',
    ring: '#FFD700',
    success: '#166534',
    successForeground: '#166534',
    successSoft: '#DCFCE7',
    warning: '#854D0E',
    warningForeground: '#854D0E',
    warningSoft: '#FEF3C7',
    info: '#1D4ED8',
    infoForeground: '#1D4ED8',
    infoSoft: '#DBEAFE',
    danger: '#B91C1C',
    dangerForeground: '#B91C1C',
    dangerSoft: '#FEE2E2',
    sidebar: '#FFFFFF',
    sidebarForeground: '#1A1A1A',
    chart1: '#FFD700',
    chart2: '#8A6D00',
    chart3: '#166534',
    chart4: '#1D4ED8',
    chart5: '#6B6B73',
    chartCursor: '#F0F0F2',
    chartTrack: '#ECECEE',
    statusBooked: '#1D4ED8',
    statusBookedBg: '#DBEAFE',
    statusConfirmed: '#854D0E',
    statusConfirmedBg: '#FEF3C7',
    statusCompleted: '#166534',
    statusCompletedBg: '#DCFCE7',
    statusCancelled: '#B91C1C',
    statusCancelledBg: '#FEE2E2',
    statusNoShow: '#52525B',
    statusNoShowBg: '#F4F4F5',
  },
  dark: {
    brandAccent: '#FFD700',
    gold: '#FFD700',
    goldHover: '#E6C200',
    goldPressed: '#D4B000',
    goldSoft: '#3F2E0A',
    goldDeep: '#FDE68A',
    onGold: '#1A1A1A',
    background: '#0B0B0B',
    foreground: '#F2F2F2',
    card: '#141414',
    cardForeground: '#F2F2F2',
    popover: '#141414',
    popoverForeground: '#F2F2F2',
    primary: '#FFD700',
    primaryForeground: '#1A1A1A',
    primaryHover: '#E6C200',
    primaryPressed: '#D4B000',
    primaryDisabled: '#3F3A20',
    secondary: '#1C1C1C',
    secondaryForeground: '#F2F2F2',
    muted: '#1C1C1C',
    mutedForeground: '#A0A0A8',
    accent: '#3F2E0A',
    accentForeground: '#FDE68A',
    destructive: '#FCA5A5',
    destructiveForeground: '#1A1A1A',
    border: '#262626',
    input: '#3F3F46',
    ring: '#FFD700',
    success: '#86EFAC',
    successForeground: '#86EFAC',
    successSoft: '#14532D',
    warning: '#FDE68A',
    warningForeground: '#FDE68A',
    warningSoft: '#3F2E0A',
    info: '#93C5FD',
    infoForeground: '#93C5FD',
    infoSoft: '#1E3A5F',
    danger: '#FCA5A5',
    dangerForeground: '#FCA5A5',
    dangerSoft: '#450A0A',
    sidebar: '#141414',
    sidebarForeground: '#F2F2F2',
    chart1: '#FFD700',
    chart2: '#FDE68A',
    chart3: '#86EFAC',
    chart4: '#93C5FD',
    chart5: '#A0A0A8',
    chartCursor: '#262626',
    chartTrack: '#262626',
    statusBooked: '#93C5FD',
    statusBookedBg: '#1E3A5F',
    statusConfirmed: '#FDE68A',
    statusConfirmedBg: '#3F2E0A',
    statusCompleted: '#86EFAC',
    statusCompletedBg: '#14532D',
    statusCancelled: '#FCA5A5',
    statusCancelledBg: '#450A0A',
    statusNoShow: '#D4D4D8',
    statusNoShowBg: '#27272A',
  },
  radius: {
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
    '2xl': '24px',
    full: '9999px',
  },
  layout: {
    sidebarWidth: '260px',
    sidebarCollapsedWidth: '72px',
    bottomNavHeight: '56px',
    headerHeight: '56px',
    shellRadius: '24px',
  },
} as const

export type Theme = typeof theme

export const chartTokenVars = {
  revenue: 'var(--chart-1)',
  expense: 'var(--chart-2)',
  profit: 'var(--chart-3)',
  service: 'var(--chart-4)',
  product: 'var(--chart-5)',
  muted: 'var(--muted-foreground)',
  border: 'var(--border)',
  card: 'var(--card)',
  foreground: 'var(--foreground)',
  cursor: 'var(--chart-cursor)',
  track: 'var(--chart-track)',
} as const

/** @deprecated Prefer CSS vars / Tailwind tokens. */
export const colors = {
  bg: theme.light.background,
  bgElevated: theme.light.card,
  bgMuted: theme.light.muted,
  text: theme.light.foreground,
  textMuted: theme.light.mutedForeground,
  textInverse: theme.light.primaryForeground,
  border: theme.light.border,
  primary: theme.light.primary,
  primaryHover: theme.light.primaryHover,
  primaryMuted: theme.light.goldSoft,
  danger: theme.light.destructive,
  dangerMuted: theme.light.dangerSoft,
  focus: theme.light.ring,
  sidebar: theme.light.sidebar,
  sidebarText: theme.light.sidebarForeground,
  navActive: theme.light.goldDeep,
} as const

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
} as const

export const radii = theme.radius

export const typography = {
  fontSans: "'Inter Variable', Inter, system-ui, sans-serif",
  fontDisplay: "'Inter Variable', Inter, system-ui, sans-serif",
  sizeXs: '0.75rem',
  sizeSm: '0.875rem',
  sizeMd: '0.875rem',
  sizeLg: '1rem',
  sizeXl: '1.25rem',
  size2xl: '1.5rem',
  weightRegular: 400,
  weightMedium: 500,
  weightBold: 600,
} as const

export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
} as const
