import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
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
  Receipt,
  Scissors,
  Settings,
  UserRound,
  Users,
} from 'lucide-react'

import { Logo } from '@/app/components/Logo'
import { ThemeToggle } from '@/app/components/ThemeToggle'
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar'
import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { clearCredentials } from '@/app/state/redux/slices/authSlice'
import { cn } from '@/app/utils'

const primaryNav = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/appointments', label: 'Appointments', icon: CalendarDays },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/billing', label: 'Billing', icon: Receipt },
] as const

const moreNav = [
  { to: '/staff', label: 'Staff', icon: UserRound },
  { to: '/services', label: 'Services', icon: Scissors },
  { to: '/inventory', label: 'Products', icon: Package },
  { to: '/loyalty', label: 'Loyalty', icon: Gift },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/reports/sales', label: 'Sales report', icon: BarChart3 },
  { to: '/reports/profit', label: 'Profit report', icon: BarChart3 },
] as const

const sidebarNav = [
  ...primaryNav,
  ...moreNav.filter((i) => !i.to.includes('/reports/')),
] as const

function pageTitle(pathname: string): string {
  const all = [...primaryNav, ...moreNav]
  const match = all.find((item) => {
    const exact = 'end' in item && item.end
    return exact
      ? pathname === item.to
      : pathname === item.to || pathname.startsWith(`${item.to}/`)
  })
  return match?.label ?? 'Dashboard'
}

function initials(name?: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return (first + second).toUpperCase() || '?'
}

export function AppLayout() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((state) => state.auth.user)
  const location = useLocation()
  const [moreOpen, setMoreOpen] = useState(false)
  const title = pageTitle(location.pathname)

  const signOut = () => dispatch(clearCredentials())

  return (
    <div className="flex min-h-dvh w-full bg-background pt-safe">
      {/* Fixed full-height sidebar — lg+ */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-border bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex h-12 items-center border-b border-border/60 px-3">
          <Logo size="sm" />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={'end' in item ? Boolean(item.end) : false}
              className={({ isActive }) =>
                cn(
                  'flex h-9 items-center gap-2 rounded-md px-2.5 text-sm text-sidebar-foreground/80',
                  isActive && 'bg-primary/10 font-medium text-sidebar-foreground',
                )
              }
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-56">
        <header className="sticky top-0 z-30 flex h-12 items-center justify-between gap-2 border-b border-border bg-card px-4 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="lg:hidden">
              <Logo size="sm" showText={false} />
            </div>
            <h1 className="truncate text-base font-semibold tracking-tight md:text-lg">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-touch size-9 rounded-full"
                  aria-label="Account menu"
                >
                  <Avatar className="size-8">
                    <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">
                      {initials(user?.name)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {user?.role}
                    </p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/settings">
                    <Settings className="size-4" strokeWidth={1.75} />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="size-4" strokeWidth={1.75} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+0.75rem)] md:px-5 md:py-5 lg:pb-5">
          <Outlet />
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid h-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] grid-cols-5 border-t border-border bg-card pb-safe lg:hidden"
        aria-label="Mobile navigation"
      >
        {primaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={'end' in item ? Boolean(item.end) : false}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 flex-col items-center justify-center gap-0.5 px-1 text-[10px] text-muted-foreground',
                isActive && 'font-semibold text-primary',
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
                moreNav.some(
                  (item) =>
                    location.pathname === item.to ||
                    location.pathname.startsWith(`${item.to}/`),
                ) && 'font-semibold text-primary',
              )}
            >
              <MoreHorizontal className="size-4" strokeWidth={1.75} />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-md pb-safe">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2 text-left text-sm">
                <Menu className="size-4" strokeWidth={1.75} />
                More
              </SheetTitle>
            </SheetHeader>
            <div className="mt-2 space-y-0.5">
              {moreNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'flex h-10 items-center justify-between rounded-md px-3 text-sm',
                      isActive ? 'bg-muted font-medium' : 'hover:bg-muted/70',
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
