/**
 * Design tokens — CSS vars are the runtime source; this mirrors them for TS/charts.
 * Brand accent reference: #D8BCAB (beige). Not used as full-page background.
 *
 * Contrast notes (WCAG AA targets: text 4.5:1, UI 3:1) — computed with relative luminance:
 *
 * LIGHT
 * - Body #2A2420 on page #FAF6F3 → ~14.2:1
 * - Muted #6B635C on #FAF6F3 → ~5.1:1
 * - Primary btn #5C4638 + text #FAF6F3 → ~7.8:1
 * - Table/body on card #FFFFFF → ~15.0:1 / muted ~5.4:1
 * - Badge/UI primary border on white → >3:1
 *
 * DARK
 * - Body #F0EBE6 on #292929 → ~12.4:1
 * - Muted #A89F96 on #292929 → ~6.0:1
 * - Primary btn #D8BCAB + text #2A2420 → ~8.1:1
 * - Card text on #323232 → ~11.5:1
 * - Chart labels use --muted-foreground (same as muted text)
 */

export const theme = {
  light: {
    brandAccent: '#D8BCAB',
    background: '#FAF6F3',
    foreground: '#2A2420',
    card: '#FFFFFF',
    cardForeground: '#2A2420',
    popover: '#FFFFFF',
    popoverForeground: '#2A2420',
    /** Deep taupe — readable primary button (beige alone fails AA with white). */
    primary: '#5C4638',
    primaryForeground: '#FAF6F3',
    secondary: '#EDE0D6',
    secondaryForeground: '#2A2420',
    muted: '#EDE0D6',
    mutedForeground: '#6B635C',
    accent: '#D8BCAB',
    accentForeground: '#2A2420',
    destructive: '#B42318',
    destructiveForeground: '#FAF6F3',
    border: '#E5D9CF',
    input: '#E5D9CF',
    ring: '#5C4638',
    success: '#1B7A3D',
    successForeground: '#FAF6F3',
    warning: '#9A6700',
    warningForeground: '#FAF6F3',
    info: '#175CD3',
    infoForeground: '#FAF6F3',
    sidebar: '#E8D4C4',
    sidebarForeground: '#2A2420',
    chart1: '#5C4638',
    chart2: '#9A6700',
    chart3: '#1B7A3D',
    chart4: '#175CD3',
    chart5: '#6B635C',
  },
  dark: {
    brandAccent: '#D8BCAB',
    background: '#292929',
    foreground: '#F0EBE6',
    card: '#323232',
    cardForeground: '#F0EBE6',
    popover: '#323232',
    popoverForeground: '#F0EBE6',
    primary: '#D8BCAB',
    primaryForeground: '#2A2420',
    secondary: '#3A3A3A',
    secondaryForeground: '#F0EBE6',
    muted: '#3A3A3A',
    mutedForeground: '#A89F96',
    accent: '#3F3A36',
    accentForeground: '#F0EBE6',
    destructive: '#F97066',
    destructiveForeground: '#2A2420',
    border: '#404040',
    input: '#404040',
    ring: '#D8BCAB',
    success: '#3DD68C',
    successForeground: '#0A2E1A',
    warning: '#F5B83D',
    warningForeground: '#2A2000',
    info: '#84ADFF',
    infoForeground: '#0B1F4A',
    sidebar: '#242424',
    sidebarForeground: '#F0EBE6',
    chart1: '#D8BCAB',
    chart2: '#F5B83D',
    chart3: '#3DD68C',
    chart4: '#84ADFF',
    chart5: '#A89F96',
  },
  radius: {
    sm: '6px',
    md: '8px',
    lg: '8px',
  },
  layout: {
    sidebarWidth: '224px',
    bottomNavHeight: '56px',
    headerHeight: '48px',
  },
} as const

export type Theme = typeof theme

/** Chart colors resolve from CSS vars at runtime via getComputedStyle when needed. */
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
} as const

/** @deprecated Prefer CSS vars / Tailwind tokens. Kept for gradual migration. */
export const colors = {
  bg: theme.light.background,
  bgElevated: theme.light.card,
  bgMuted: theme.light.muted,
  text: theme.light.foreground,
  textMuted: theme.light.mutedForeground,
  textInverse: theme.light.primaryForeground,
  border: theme.light.border,
  primary: theme.light.primary,
  primaryHover: theme.light.primary,
  primaryMuted: theme.light.accent,
  danger: theme.light.destructive,
  dangerMuted: theme.light.muted,
  focus: theme.light.ring,
  sidebar: theme.light.sidebar,
  sidebarText: theme.light.sidebarForeground,
  navActive: theme.light.primary,
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
