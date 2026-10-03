import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
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
  Receipt,
  Scissors,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'
import { format } from 'date-fns'

import { GlobalSearch } from '@/app/components/layout/GlobalSearch'
import { Logo } from '@/app/components/Logo'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
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
import {
  permissionForPath,
  useHasPermission,
} from '@/app/hooks/useHasPermission'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { clearCredentials } from '@/app/state/redux/slices/authSlice'
import {
  setThemeMode,
  type ThemeMode,
} from '@/app/state/redux/slices/settingsSlice'
import { cn } from '@/app/utils'

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
  { to: '/customers', label: COMMON.nav.customers, icon: Users },
  { to: '/billing', label: COMMON.nav.billing, icon: Receipt },
]

const mobileMore: NavItem[] = [
  ...generalNav.filter(
    (i) => !['/', '/appointments', '/customers'].includes(i.to),
  ),
  ...financeNav.filter((i) => i.to !== '/billing'),
  ...managementNav,
]

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

  if (path.startsWith('/appointments') && canAppt) {
    return (
      <Button asChild size="sm" className="h-9 rounded-full px-4">
        <Link to={`${ROUTES.appointments}/new`}>
          {COMMON.nav.newAppointment}
        </Link>
      </Button>
    )
  }
  if (path.startsWith('/customers') && canCustomer) {
    return (
      <Button asChild size="sm" className="h-9 rounded-full px-4">
        <Link to={`${ROUTES.customers}?new=1`}>{COMMON.nav.addCustomer}</Link>
      </Button>
    )
  }
  if (canBill) {
    return (
      <Button asChild size="sm" className="h-9 rounded-full px-4">
        <Link to={ROUTES.billingNew}>{COMMON.nav.newBill}</Link>
      </Button>
    )
  }
  return null
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
            'flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2 text-left hover:bg-muted/60',
            compact && 'size-9 justify-center rounded-full border-0 p-0',
          )}
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-gold-soft text-xs font-semibold text-gold-deep">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {!compact ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user?.name}
              </span>
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

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  return (
    <div className="min-h-dvh w-full bg-background pt-safe lg:p-3">
      <div className="mx-auto flex min-h-dvh w-full max-w-[1600px] lg:min-h-[calc(100dvh-1.5rem)] lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-border lg:bg-card">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex lg:h-[calc(100dvh-1.5rem)]',
            collapsed ? 'w-[72px]' : 'w-[260px]',
          )}
        >
          <div
            className={cn(
              'flex h-14 items-center gap-2 border-b border-border px-3',
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

          <div className="border-t border-border p-2">
            <UserMenu compact={collapsed} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col bg-background">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm md:px-4">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden size-9 rounded-full lg:inline-flex"
              aria-label={
                collapsed
                  ? COMMON.nav.expandSidebar
                  : COMMON.nav.collapseSidebar
              }
              onClick={() => setCollapsed((v) => !v)}
            >
              {collapsed ? (
                <PanelLeftOpen className="size-4" strokeWidth={1.75} />
              ) : (
                <PanelLeftClose className="size-4" strokeWidth={1.75} />
              )}
            </Button>

            <div className="lg:hidden">
              <Logo size="sm" showText={false} />
            </div>

            <GlobalSearch className="max-w-md flex-1" />

            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <ThemeToggle />
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                className="size-9 rounded-full"
                aria-label={COMMON.nav.todayCalendar}
                onClick={() =>
                  navigate(
                    `${ROUTES.appointments}?date=${format(new Date(), 'yyyy-MM-dd')}`,
                  )
                }
              >
                <CalendarDays className="size-4" strokeWidth={1.75} />
              </Button>
              <div className="hidden sm:block">
                <ContextualCta />
              </div>
              <div className="lg:hidden">
                <UserMenu compact />
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] md:px-5 md:py-5 lg:pb-5">
            <Outlet />
          </main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] grid-cols-5 border-t border-border bg-card pb-safe lg:hidden"
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
              <div className="mb-2 px-1 sm:hidden">
                <ContextualCta />
              </div>
              {visibleMore.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'relative flex h-10 items-center justify-between rounded-full px-3 text-sm',
                      isActive
                        ? 'nav-active-pill font-medium'
                        : 'hover:bg-muted/70',
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
