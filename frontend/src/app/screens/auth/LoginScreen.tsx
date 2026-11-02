import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Check, Loader2, Lock, Mail } from 'lucide-react'
import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useLocation } from 'react-router-dom'
import { z } from 'zod'

import logoFallback from '@/app/assets/logo.svg'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { AUTH, ROUTES } from '@/app/constants'
import {
  getLoginErrorMessage,
  useLoginMutation,
} from '@/app/hooks/auth/useLoginMutation'
import { usePublicBranding } from '@/app/hooks/queries/usePublicBrandingQuery'
import { useAppSelector } from '@/app/hooks/useRedux'
import { LoginRings } from '@/app/screens/auth/LoginRings'
import { cn } from '@/app/utils'

const LoginParticles = lazy(() => import('@/app/components/LoginParticles'))

function readCssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Mobile status bar matches dark header; desktop matches light page. */
function readLoginThemeColor(): string {
  const desktop = window.matchMedia('(min-width: 1024px)').matches
  if (desktop) {
    return readCssVar('--theme-color') || readCssVar('--background')
  }
  return readCssVar('--login-panel') || readCssVar('--theme-color')
}

const loginSchema = z.object({
  identifier: z.string().trim().min(1, AUTH.validation.identifierRequired),
  password: z.string().min(1, AUTH.validation.passwordRequired),
})

type LoginFormValues = z.infer<typeof loginSchema>

function BrandMark({
  salonName,
  logoUrl,
  inverted,
}: {
  salonName: string
  logoUrl: string | null
  inverted?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2.5',
        inverted ? 'text-login-panel-foreground' : 'text-foreground',
      )}
    >
      <span className="relative size-8 shrink-0 lg:size-9">
        <img
          src={logoUrl || logoFallback}
          alt=""
          className="size-full object-contain"
          onError={(e) => {
            e.currentTarget.src = logoFallback
          }}
        />
      </span>
      <span className="truncate text-sm font-semibold tracking-tight">{salonName}</span>
    </div>
  )
}

export function LoginScreen() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const mustChange = useAppSelector((state) => state.auth.user?.mustChangePassword)
  const location = useLocation()
  const loginMutation = useLoginMutation()
  const { salonName, logoUrl } = usePublicBranding()
  const [showPassword, setShowPassword] = useState(false)
  const [isDesktopLayout, setIsDesktopLayout] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 1024px)').matches
      : false,
  )
  const passwordInputRef = useRef<HTMLInputElement | null>(null)
  const formId = useId()

  const fromState = (
    location.state as {
      from?: { pathname?: string; search?: string; hash?: string }
    } | null
  )?.from
  const from = fromState?.pathname
    ? `${fromState.pathname}${fromState.search ?? ''}${fromState.hash ?? ''}`
    : ROUTES.home

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: '', password: '' },
  })
  const { ref: passwordRegisterRef, ...passwordRegister } = form.register('password')

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onLayout = () => setIsDesktopLayout(mq.matches)
    onLayout()
    mq.addEventListener('change', onLayout)
    return () => mq.removeEventListener('change', onLayout)
  }, [])

  useEffect(() => {
    const root = document.documentElement
    const previousLock = root.dataset.themeColorLock
    const metas = Array.from(
      document.querySelectorAll('meta[name="theme-color"]'),
    ) as HTMLMetaElement[]
    const previous = metas.map((m) => ({ el: m, content: m.content }))
    let created: HTMLMetaElement | null = null

    const apply = () => {
      const color = readLoginThemeColor()
      if (!color) return
      root.dataset.themeColorLock = color
      if (metas.length === 0 && !created) {
        created = document.createElement('meta')
        created.name = 'theme-color'
        created.content = color
        document.head.appendChild(created)
      } else {
        ;(created ? [created] : metas).forEach((m) => {
          m.content = color
        })
      }
    }

    apply()
    const mq = window.matchMedia('(min-width: 1024px)')
    mq.addEventListener('change', apply)
    return () => {
      mq.removeEventListener('change', apply)
      if (previousLock === undefined) delete root.dataset.themeColorLock
      else root.dataset.themeColorLock = previousLock
      if (created) created.remove()
      previous.forEach(({ el, content }) => {
        el.content = content
      })
    }
  }, [])

  if (isAuthenticated && mustChange) {
    return <Navigate to={ROUTES.setPassword} replace />
  }

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const onSubmit = form.handleSubmit((values) => {
    if (loginMutation.isPending) return
    loginMutation.mutate({
      identifier: values.identifier.trim(),
      password: values.password,
    })
  })

  const year = new Date().getFullYear()
  const copyright = AUTH.panel.copyright
    .replace('{year}', String(year))
    .replace('{salon}', salonName)

  const fieldError =
    form.formState.errors.identifier?.message ||
    form.formState.errors.password?.message
  const submitError = loginMutation.isError
    ? getLoginErrorMessage(loginMutation.error)
    : null
  const alertMessage = submitError || fieldError || null

  return (
    <div className="min-h-dvh w-full overflow-x-hidden bg-background lg:grid lg:grid-cols-[minmax(0,43fr)_minmax(0,57fr)]">
      {/* Desktop brand panel */}
      <aside className="relative hidden flex-col overflow-hidden bg-login-panel px-10 py-8 text-login-panel-foreground lg:flex">
        <BrandMark salonName={salonName} logoUrl={logoUrl} inverted />
        <div className="relative z-10 flex flex-1 flex-col justify-end pb-16">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight text-balance xl:text-4xl">
            {AUTH.panel.headline}
          </h2>
          <ul className="mt-10 max-w-md space-y-4">
            {AUTH.panel.features.map((feature) => (
              <li key={feature.title} className="flex gap-3">
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  <Check className="size-4" strokeWidth={2.25} aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{feature.title}</p>
                  <p className="mt-0.5 text-sm text-login-panel-muted">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-login-panel-muted">{copyright}</p>
        <LoginRings className="pointer-events-none absolute -right-16 -bottom-24 size-[420px] text-login-panel-foreground/80" />
      </aside>

      {/* Form column (mobile header + sheet / desktop centered card) */}
      <section className="relative flex min-h-dvh flex-col overflow-hidden bg-background lg:items-center lg:justify-center lg:px-6 lg:py-10">
        {/* Desktop: particles fill the right half; taps outside form controls hit this layer */}
        {isDesktopLayout ? (
          <div className="pointer-events-auto absolute inset-0 z-0" aria-hidden="true">
            <Suspense fallback={null}>
              <LoginParticles />
            </Suspense>
          </div>
        ) : null}

        {/* Mobile brand header */}
        <div className="relative z-10 flex min-h-[30dvh] flex-col overflow-hidden bg-login-panel px-6 pt-safe pb-10 text-login-panel-foreground lg:hidden">
          <LoginRings className="pointer-events-none absolute -top-10 -right-16 size-[280px] text-login-panel-foreground/80" />
          <div className="relative z-10 mt-4">
            <BrandMark salonName={salonName} logoUrl={logoUrl} inverted />
            <h2 className="mt-6 max-w-xs text-2xl font-semibold tracking-tight text-balance">
              {AUTH.panel.mobileHeadline}
            </h2>
          </div>
        </div>

        {/* Card chrome lets clicks through to particles; form controls re-enable pointer events */}
        <div className="pointer-events-none relative z-10 -mt-6 flex flex-1 flex-col overflow-hidden rounded-t-[28px] bg-card/80 px-6 pt-8 pb-safe shadow-sm backdrop-blur-[2px] lg:mt-0 lg:flex-none lg:overflow-visible lg:rounded-[20px] lg:border lg:border-border lg:bg-card/85 lg:p-10 lg:shadow-sm lg:pb-10">
          {/* Mobile: particles fill the sheet under the form (auto so taps work through card chrome) */}
          {!isDesktopLayout ? (
            <div className="pointer-events-auto absolute inset-0 z-0" aria-hidden="true">
              <Suspense fallback={null}>
                <LoginParticles />
              </Suspense>
            </div>
          ) : null}
          <div className="pointer-events-auto relative z-10 mx-auto w-full max-w-[480px]">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {AUTH.welcomeTitle}
              </h1>
              <p className="text-sm text-muted-foreground">{AUTH.welcomeSubtitle}</p>
            </div>

            <form className="mt-8 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-id`}>{AUTH.identifier}</Label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <Input
                    id={`${formId}-id`}
                    type="text"
                    autoComplete="username"
                    autoFocus
                    placeholder={AUTH.identifierPlaceholder}
                    className="h-12 min-touch pl-10 text-base lg:h-11 lg:text-sm"
                    aria-invalid={Boolean(form.formState.errors.identifier)}
                    {...form.register('identifier')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-pw`}>{AUTH.password}</Label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  <Input
                    id={`${formId}-pw`}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder={AUTH.passwordPlaceholder}
                    className="h-12 min-touch pr-16 pl-10 text-base lg:h-11 lg:text-sm"
                    aria-invalid={Boolean(form.formState.errors.password)}
                    {...passwordRegister}
                    ref={(el) => {
                      passwordRegisterRef(el)
                      passwordInputRef.current = el
                    }}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md px-2 py-1.5 text-xs font-medium text-gold-deep hover:bg-muted"
                    onClick={() => {
                      setShowPassword((v) => !v)
                      requestAnimationFrame(() => passwordInputRef.current?.focus())
                    }}
                  >
                    {showPassword ? AUTH.hidePassword : AUTH.showPassword}
                  </button>
                </div>
              </div>

              {alertMessage ? (
                <div
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
                  role="alert"
                >
                  {alertMessage}
                </div>
              ) : null}

              <Button
                type="submit"
                className="min-touch h-12 w-full gap-2 lg:h-11"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />
                    {AUTH.submitting}
                  </>
                ) : (
                  <>
                    {AUTH.submit}
                    <ArrowRight className="size-4" strokeWidth={2} aria-hidden />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm text-muted-foreground">
              {AUTH.adminResetHint}
            </div>
            <p className="mt-4 text-center text-[11px] text-muted-foreground">
              {AUTH.secureSession}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
