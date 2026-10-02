import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { Logo } from '@/app/components/Logo'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { getLoginErrorMessage, useLoginMutation } from '@/app/hooks/auth/useLoginMutation'
import { useAppSelector } from '@/app/hooks/useRedux'

export function LoginScreen() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated)
  const location = useLocation()
  const loginMutation = useLoginMutation()

  const [email, setEmail] = useState('admin@example.com')
  const [password, setPassword] = useState('Admin@123')

  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/'

  if (isAuthenticated) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    loginMutation.mutate({ email: email.trim(), password })
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Logo size="lg" />
        <p className="text-sm text-muted-foreground">
          Sign in to collect payment, manage bookings, and view today&apos;s collection.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {loginMutation.isError ? (
          <p
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            role="alert"
          >
            {getLoginErrorMessage(loginMutation.error)}
          </p>
        ) : null}

        <Button
          type="submit"
          className="min-touch w-full"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </div>
  )
}
