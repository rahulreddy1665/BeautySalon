import Particles, { ParticlesProvider } from '@tsparticles/react'
import type { Container, Engine, ISourceOptions } from '@tsparticles/engine'
import { loadSlim } from '@tsparticles/slim'
import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from 'react'

/** Stable for ParticlesProvider — must not change across remounts. */
async function initLoginParticlesEngine(engine: Engine): Promise<void> {
  await loadSlim(engine)
}

function readToken(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function isMobileViewport(): boolean {
  return window.matchMedia('(max-width: 767px)').matches
}

/**
 * Tunable login particle settings (desktop / mobile).
 * Colors come from CSS tokens at runtime — never hard-code hex here.
 */
export const LOGIN_PARTICLE_SETTINGS = {
  desktopCount: 55,
  mobileCount: 28,
  sizeMin: 2,
  sizeMax: 4.5,
  opacityMin: 0.85,
  opacityMax: 1,
  speed: 0.85,
  linkDistance: 160,
  linkOpacity: 0.7,
  linkWidth: 1.5,
  repulseDistance: 180,
  pushQuantity: 6,
  fpsLimit: 60,
} as const

function buildOptions(isMobile: boolean): ISourceOptions {
  // Bright brand gold from CSS tokens (theme primary).
  const gold = readToken('--gold') || readToken('--primary')
  const goldHover = readToken('--gold-hover') || gold
  if (!gold) return { fullScreen: { enable: false }, particles: { number: { value: 0 } } }

  const count = isMobile
    ? LOGIN_PARTICLE_SETTINGS.mobileCount
    : LOGIN_PARTICLE_SETTINGS.desktopCount

  return {
    fullScreen: { enable: false },
    background: { color: { value: 'transparent' } },
    fpsLimit: LOGIN_PARTICLE_SETTINGS.fpsLimit,
    detectRetina: true,
    pauseOnBlur: true,
    pauseOnOutsideViewport: true,
    particles: {
      number: {
        value: count,
        density: { enable: false, width: 1920, height: 1080 },
      },
      color: { value: [gold, goldHover] },
      shape: { type: 'circle' },
      opacity: {
        value: {
          min: LOGIN_PARTICLE_SETTINGS.opacityMin,
          max: LOGIN_PARTICLE_SETTINGS.opacityMax,
        },
      },
      size: {
        value: {
          min: LOGIN_PARTICLE_SETTINGS.sizeMin,
          max: LOGIN_PARTICLE_SETTINGS.sizeMax,
        },
      },
      links: {
        enable: true,
        distance: isMobile
          ? LOGIN_PARTICLE_SETTINGS.linkDistance - 20
          : LOGIN_PARTICLE_SETTINGS.linkDistance,
        color: gold,
        opacity: LOGIN_PARTICLE_SETTINGS.linkOpacity,
        width: LOGIN_PARTICLE_SETTINGS.linkWidth,
      },
      move: {
        enable: true,
        speed: LOGIN_PARTICLE_SETTINGS.speed,
        direction: 'none',
        random: true,
        straight: false,
        outModes: { default: 'bounce' },
      },
    },
    interactivity: {
      // Canvas only — form controls sit above with pointer-events-auto and won't trigger this.
      detectsOn: 'canvas',
      events: {
        onHover: {
          enable: !isMobile,
          mode: 'repulse',
        },
        onClick: {
          enable: true,
          mode: ['push', 'repulse'],
        },
      },
      modes: {
        push: {
          quantity: LOGIN_PARTICLE_SETTINGS.pushQuantity,
        },
        repulse: {
          distance: LOGIN_PARTICLE_SETTINGS.repulseDistance,
          duration: 0.55,
          factor: 6,
          speed: 1.2,
        },
      },
    },
  }
}

class ParticlesErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.warn('[LoginParticles]', error, info.componentStack)
    }
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

function LoginParticlesCanvas() {
  const containerRef = useRef<Container | null>(null)
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? isMobileViewport() : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)')
    const sync = () => setIsMobile(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const options = useMemo(() => buildOptions(isMobile), [isMobile])

  useEffect(() => {
    const onVisibility = () => {
      const container = containerRef.current
      if (!container || container.destroyed) return
      if (document.visibilityState === 'hidden') container.pause()
      else container.play()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      const container = containerRef.current
      if (container && !container.destroyed) {
        container.destroy()
      }
      containerRef.current = null
    }
  }, [])

  if (!options) return null

  return (
    <Particles
      id="login-particles"
      className="absolute inset-0 z-0 size-full"
      options={options}
      particlesLoaded={(container) => {
        containerRef.current = container ?? null
        if (container && document.visibilityState === 'hidden') {
          container.pause()
        }
      }}
    />
  )
}

/**
 * Decorative particles for the login form column only.
 * Lazy-load this module — never import from the main shell.
 *
 * Parent should use pointer-events-auto on this layer and pointer-events-none
 * on the card chrome (with pointer-events-auto on form controls) so taps on
 * empty space explode/multiply particles without blocking the form.
 */
export function LoginParticles() {
  const [allowMotion, setAllowMotion] = useState(() =>
    typeof window !== 'undefined' ? !prefersReducedMotion() : false,
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setAllowMotion(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  if (!allowMotion) return null

  return (
    <ParticlesErrorBoundary>
      {/* pointer-events-auto required when an ancestor card uses pointer-events-none */}
      <div
        className="pointer-events-auto absolute inset-0 z-0 overflow-hidden"
        aria-hidden="true"
      >
        <ParticlesProvider init={initLoginParticlesEngine}>
          <LoginParticlesCanvas />
        </ParticlesProvider>
      </div>
    </ParticlesErrorBoundary>
  )
}

export default LoginParticles
