import { Suspense, useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  ChevronRight,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Receipt,
  Scissors,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'

import { ErrorBoundary } from '@/app/components/ErrorBoundary'
import { LoadingSkeleton } from '@/app/components/LoadingSkeleton'
import { GlobalSearch } from '@/app/components/layout/GlobalSearch'
import { Logo } from '@/app/components/Logo'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import { IconButton } from '@/app/components/ui/icon-button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/app/components/ui/sheet'
import { COMMON, ROUTES } from '@/app/constants'
import { useNavBadgesQuery } from '@/app/hooks/queries/useNavBadgesQuery'
import { permissionForPath, useHasPermission } from '@/app/hooks/useHasPermission'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { clearCredentials } from '@/app/state/redux/slices/authSlice'
import { setThemeMode, type ThemeMode } from '@/app/state/redux/slices/settingsSlice'
import { cn } from '@/app/utils'
import { getSalonNow } from '@/app/utils/salonTime'

const SIDEBAR_KEY = 'beautysalon.sidebar.collapsed'

type NavItem = {
  to: string
  label: string
  icon: typeof LayoutDashboard
  end?: boolean
  badge?: 'appointments' | 'customers' | 'services'
}

const generalNav: NavItem[] = [
  { to: '/', label: COMMON.nav.dashboard, icon: LayoutDashboard, end: true },
  {
    to: '/appointments',
    label: COMMON.nav.appointments,
    icon: CalendarDays,
    badge: 'appointments',
  },
  {
    to: '/customers',
    label: COMMON.nav.customers,
    icon: Users,
    badge: 'customers',
  },
  {
    to: '/services',
    label: COMMON.nav.services,
    icon: Scissors,
    badge: 'services',
  },
  { to: '/inventory', label: COMMON.nav.products, icon: Package },
  { to: '/staff', label: COMMON.nav.staff, icon: UserRound },
]

const financeNav: NavItem[] = [
  { to: '/billing', label: COMMON.nav.billing, icon: Receipt },
  { to: '/loyalty', label: COMMON.nav.loyalty, icon: Gift },
]

const managementNav: NavItem[] = [
  { to: '/reports', label: COMMON.nav.reports, icon: BarChart3 },
  { to: '/settings', label: COMMON.nav.settings, icon: Settings },
]

const mobilePrimary: NavItem[] = [
  { to: '/', label: COMMON.nav.dashboard, icon: LayoutDashboard, end: true },
  { to: '/appointments', label: COMMON.nav.appointments, icon: CalendarDays },
  { to: '/billing', label: COMMON.nav.billing, icon: Receipt },
  { to: '/customers', label: COMMON.nav.customers, icon: Users },
]

const mobileMore: NavItem[] = [
  ...generalNav.filter((i) => !['/', '/appointments', '/customers'].includes(i.to)),
  ...financeNav.filter((i) => i.to !== '/billing'),
  ...managementNav,
]

function pageTitle(pathname: string): string {
  if (pathname === '/' || pathname === '') return COMMON.nav.dashboard
  if (pathname.startsWith('/appointments')) return COMMON.nav.appointments
  if (pathname.startsWith('/customers')) return COMMON.nav.customers
  if (pathname.startsWith('/billing/new')) return COMMON.nav.newBill
  if (pathname.startsWith('/billing')) return COMMON.nav.billing
  if (pathname.startsWith('/staff')) return COMMON.nav.staff
  if (pathname.startsWith('/services')) return COMMON.nav.services
  if (pathname.startsWith('/inventory')) return COMMON.nav.products
  if (pathname.startsWith('/loyalty')) return COMMON.nav.loyalty
  if (pathname.startsWith('/reports')) return COMMON.nav.reports
  if (pathname.startsWith('/settings')) return COMMON.nav.settings
  if (pathname.startsWith('/account')) return COMMON.nav.account
  return COMMON.appName
}

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase() || '?'
}

function useVisibleNav(items: readonly NavItem[]): NavItem[] {
  const user = useAppSelector((state) => state.auth.user)
  const isAdmin = user?.role === 'admin'
  const perms = user?.permissions ?? []
  return items.filter((item) => {
    if (isAdmin) return true
    const needed = permissionForPath(item.to)
    if (!needed) return true
    return perms.includes(needed)
  })
}

function NavBadge({ value }: { value: number | null | undefined }) {
  if (value == null || value <= 0) return null
  const label = value > 99 ? '99+' : String(value)
  return (
    <span className="ml-auto rounded-full bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-gold-deep tabular-nums">
      {label}
    </span>
  )
}

function SidebarLink({
  item,
  collapsed,
  badgeValue,
  onNavigate,
}: {
  item: NavItem
  collapsed: boolean
  badgeValue?: number | null
  onNavigate?: () => void
}) {
  return (
    <NavLink
      to={item.to}
      end={Boolean(item.end)}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        cn(
          'relative flex h-10 items-center gap-2.5 rounded-full px-3 text-sm text-sidebar-foreground/80 transition-colors hover:bg-muted',
          collapsed && 'justify-center px-0',
          isActive && 'nav-active-pill font-medium text-gold-deep',
        )
      }
    >
      <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
      {!collapsed ? (
        <>
          <span className="truncate">{item.label}</span>
          <NavBadge value={badgeValue} />
        </>
      ) : null}
    </NavLink>
  )
}

function NavGroup({
  label,
  items,
  collapsed,
  badges,
}: {
  label: string
  items: NavItem[]
  collapsed: boolean
  badges: {
    appointments?: number | null
    customers?: number | null
    services?: number | null
  }
}) {
  if (items.length === 0) return null
  return (
    <div className="space-y-1">
      {!collapsed ? (
        <p className="px-3 pt-3 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
      ) : (
        <div className="mx-auto my-2 h-px w-6 bg-border" />
      )}
      {items.map((item) => (
        <SidebarLink
          key={item.to}
          item={item}
          collapsed={collapsed}
          badgeValue={
            item.badge === 'appointments'
              ? badges.appointments
              : item.badge === 'customers'
                ? badges.customers
                : item.badge === 'services'
                  ? badges.services
                  : null
          }
        />
      ))}
    </div>
  )
}

function ContextualCta() {
  const location = useLocation()
  const canBill = useHasPermission('invoice:create')
  const canAppt = useHasPermission('appointment:create')
  const canCustomer = useHasPermission('customer:create')
  const path = location.pathname

  if (path === '/billing/new' || path.startsWith('/billing/new/')) return null

  let to: string | null = null
  let label: string | null = null
  if (path.startsWith('/appointments') && canAppt) {
    to = `${ROUTES.appointments}/new`
    label = COMMON.nav.newAppointment
  } else if (path.startsWith('/customers') && canCustomer) {
    to = `${ROUTES.customers}?new=1`
    label = COMMON.nav.addCustomer
  } else if (canBill) {
    to = ROUTES.billingNew
    label = COMMON.nav.newBill
  }
  if (!to || !label) return null

  return (
    <>
      <Button asChild size="sm" className="hidden h-10 rounded-full px-4 lg:inline-flex">
        <Link to={to}>{label}</Link>
      </Button>
      <Button
        asChild
        size="sm"
        className="inline-flex h-10 shrink-0 rounded-full px-3 whitespace-nowrap lg:hidden"
      >
        <Link to={to} aria-label={label}>
          <Plus className="size-4 shrink-0" strokeWidth={1.75} />
          <span className="max-[340px]:sr-only">{label}</span>
        </Link>
      </Button>
    </>
  )
}

function UserMenu({ compact }: { compact?: boolean }) {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const themeMode = useAppSelector((s) => s.settings.themeMode)
  const roleLabel = user?.role ?? ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2 text-left hover:bg-muted/60',
            compact
              ? 'size-9 justify-center rounded-full'
              : 'w-full rounded-xl border border-border bg-card p-2',
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-gold-soft text-xs font-semibold text-gold-deep">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!compact ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{user?.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground capitalize">
                {roleLabel}
              </span>
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to={ROUTES.account}>
            <UserRound className="size-4" strokeWidth={1.75} />
            {COMMON.nav.account}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {COMMON.nav.theme}
        </DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={themeMode}
          onValueChange={(v) => dispatch(setThemeMode(v as ThemeMode))}
        >
          <DropdownMenuRadioItem value="light">
            {COMMON.nav.themeLight}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            {COMMON.nav.themeDark}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            {COMMON.nav.themeSystem}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => dispatch(clearCredentials())}>
          <LogOut className="size-4" strokeWidth={1.75} />
          {COMMON.actions.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [moreOpen, setMoreOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_KEY) === '1'
    } catch {
      return false
    }
  })
  const badgesQuery = useNavBadgesQuery()
  const badges = {
    appointments: badgesQuery.data?.appointmentsToday,
    customers: badgesQuery.data?.customersTotal,
    services: badgesQuery.data?.servicesTotal,
  }

  const visibleGeneral = useVisibleNav(generalNav)
  const visibleFinance = useVisibleNav(financeNav)
  const visibleManagement = useVisibleNav(managementNav)
  const visiblePrimary = useVisibleNav(mobilePrimary)
  const visibleMore = useVisibleNav(mobileMore)
  const isNewBill = location.pathname === ROUTES.billingNew
  const mobileBackTo = isNewBill
    ? ROUTES.billing
    : location.pathname === ROUTES.account
      ? ROUTES.home
      : null
  const themeMode = useAppSelector((s) => s.settings.themeMode)

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <aside
        className={cn(
          'hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex',
          collapsed ? 'w-[72px]' : 'w-[260px]',
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center gap-2 border-b border-border px-3',
            collapsed && 'justify-center px-2',
          )}
        >
          <Logo size="sm" collapsed={collapsed} />
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-2">
          <NavGroup
            label={COMMON.nav.groupGeneral}
            items={visibleGeneral}
            collapsed={collapsed}
            badges={badges}
          />
          <NavGroup
            label={COMMON.nav.groupFinance}
            items={visibleFinance}
            collapsed={collapsed}
            badges={badges}
          />
          <NavGroup
            label={COMMON.nav.groupManagement}
            items={visibleManagement}
            collapsed={collapsed}
            badges={badges}
          />
        </nav>

        <div
          className={cn(
            'border-t border-border p-2',
            collapsed && 'flex justify-center',
          )}
        >
          <UserMenu compact={collapsed} />
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] min-w-0 shrink-0 items-center gap-2 border-b border-border bg-card px-3 pt-[env(safe-area-inset-top,0px)] md:px-4 lg:h-16 lg:pt-0">
          <IconButton
            className="hidden lg:inline-flex"
            aria-label={collapsed ? COMMON.nav.expandSidebar : COMMON.nav.collapseSidebar}
            onClick={() => setCollapsed((v) => !v)}
          >
            {collapsed ? (
              <PanelLeftOpen strokeWidth={1.75} />
            ) : (
              <PanelLeftClose strokeWidth={1.75} />
            )}
          </IconButton>

          {mobileBackTo ? (
            <IconButton
              className="lg:hidden"
              aria-label={COMMON.actions.back}
              onClick={() => navigate(mobileBackTo)}
            >
              <ArrowLeft strokeWidth={1.75} />
            </IconButton>
          ) : null}

          <div className="lg:hidden">
            <Logo size="sm" showText={false} />
          </div>

          <p className="min-w-0 flex-1 truncate text-sm font-semibold lg:hidden">
            {pageTitle(location.pathname)}
          </p>

          <GlobalSearch className="min-w-0 max-w-md lg:flex-1" />

          <div className="ml-auto flex shrink-0 items-center gap-1.5 lg:ml-auto">
            <div className="hidden lg:contents">
              <ThemeToggle />
            </div>
            <IconButton
              className="hidden lg:inline-flex"
              aria-label={COMMON.nav.todayCalendar}
              onClick={() =>
                navigate(`${ROUTES.appointments}?date=${getSalonNow().dateKey}`)
              }
            >
              <CalendarDays strokeWidth={1.75} />
            </IconButton>
            <ContextualCta />
            <div className="lg:hidden">
              <UserMenu compact />
            </div>
          </div>
        </header>

        <main
          className={cn(
            'min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 md:px-5 md:py-5 lg:pb-5',
            isNewBill
              ? 'pb-[calc(4rem+1.5rem+env(safe-area-inset-bottom,0px))]'
              : 'pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)]',
          )}
        >
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<LoadingSkeleton rows={6} />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

      <nav
        className={cn(
          'fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] grid-cols-5 border-t border-border bg-card pb-[env(safe-area-inset-bottom,0px)] lg:hidden',
          isNewBill && 'hidden',
        )}
        aria-label="Mobile navigation"
      >
        {visiblePrimary.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={Boolean(item.end)}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[10px] text-muted-foreground',
                isActive && 'font-semibold text-gold-deep',
              )
            }
          >
            <item.icon className="size-4" strokeWidth={1.75} />
            <span className="truncate">{item.label}</span>
          </NavLink>
        ))}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[10px] text-muted-foreground',
                visibleMore.some(
                  (item) =>
                    location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`),
                ) && 'font-semibold text-gold-deep',
              )}
            >
              <MoreHorizontal className="size-4" strokeWidth={1.75} />
              {COMMON.nav.moreMenu}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left text-sm">
                <Menu className="size-4" strokeWidth={1.75} />
                {COMMON.nav.moreMenu}
              </SheetTitle>
            </SheetHeader>
            <div className="mt-2 space-y-0.5">
              <button
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-full px-3 text-left text-sm hover:bg-muted/70"
                onClick={() => {
                  setMoreOpen(false)
                  navigate(`${ROUTES.appointments}?date=${getSalonNow().dateKey}`)
                }}
              >
                <CalendarDays className="size-4" strokeWidth={1.75} />
                {COMMON.nav.todayCalendar}
              </button>
              <p className="px-3 pt-2 text-xs text-muted-foreground">
                {COMMON.nav.theme}
              </p>
              <div className="flex gap-1.5 px-3 pb-1">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      'h-10 flex-1 rounded-full border border-border text-xs',
                      themeMode === mode &&
                        'border-primary bg-gold-soft font-medium text-gold-deep',
                    )}
                    onClick={() => dispatch(setThemeMode(mode))}
                  >
                    {mode === 'light'
                      ? COMMON.nav.themeLight
                      : mode === 'dark'
                        ? COMMON.nav.themeDark
                        : COMMON.nav.themeSystem}
                  </button>
                ))}
              </div>
              {visibleMore.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-10 items-center justify-between rounded-full px-3 text-sm',
                      isActive ? 'nav-active-pill font-medium' : 'hover:bg-muted/70',
                    )
                  }
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="size-4" strokeWidth={1.75} />
                    {item.label}
                  </span>
                  <ChevronRight
                    className="size-4 text-muted-foreground"
                    strokeWidth={1.75}
                  />
                </NavLink>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </nav>
    </div>
  )
}
