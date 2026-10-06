import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/app/components/ui/button'
import { COMMON, ROUTES } from '@/app/constants'

const RELOAD_GUARD = 'beautysalon.sw-reload'

function isChunkLoadError(error: Error): boolean {
  const message = `${error.name} ${error.message}`
  return (
    message.includes('ChunkLoadError') ||
    message.includes('Loading chunk') ||
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('MIME type') ||
    message.includes('Importing a module script failed')
  )
}

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  private reload = () => {
    const chunk = this.state.error ? isChunkLoadError(this.state.error) : false
    if (chunk && !sessionStorage.getItem(RELOAD_GUARD) && 'serviceWorker' in navigator) {
      sessionStorage.setItem(RELOAD_GUARD, '1')
      void navigator.serviceWorker.getRegistrations().then((regs) => {
        void Promise.all(regs.map((reg) => reg.unregister())).then(() => {
          window.location.reload()
        })
      })
      return
    }
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const chunk = isChunkLoadError(error)
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <p className="text-sm font-medium">
          {chunk ? COMMON.errors.newVersion : COMMON.errors.unexpected}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {chunk ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={() => this.setState({ error: null })}
            >
              {COMMON.errors.tryAgain}
            </Button>
          )}
          <Button type="button" onClick={this.reload}>
            {COMMON.errors.reload}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              window.location.assign(ROUTES.home)
            }}
          >
            {COMMON.errors.goHome}
          </Button>
        </div>
      </div>
    )
  }
}
