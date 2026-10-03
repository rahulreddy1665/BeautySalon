import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Logo } from '@/app/components/Logo'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { AUTH, ROUTES } from '@/app/constants'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { authApi } from '@/app/service/auth/authApi'
import { setCredentials } from '@/app/state/redux/slices/authSlice'
import { toErrorMessage } from '@/app/utils'

export function SetPasswordScreen() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated)
  const mustChange = useAppSelector((s) => s.auth.user?.mustChangePassword)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} replace />
  }
  if (!mustChange) {
    return <Navigate to={ROUTES.home} replace />
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (newPassword !== confirm) {
      setError(AUTH.setPassword.mismatch)
      return
    }
    setPending(true)
    try {
      const result = await authApi.changePassword({
        currentPassword,
        newPassword,
      })
      dispatch(
        setCredentials({
          token: result.token,
          user: { ...result.user, mustChangePassword: false },
        }),
      )
      toast.success(AUTH.account.passwordUpdated)
      navigate(ROUTES.home, { replace: true })
    } catch (err) {
      setError(toErrorMessage(err, AUTH.failed))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-5 p-4">
      <div className="space-y-2">
        <Logo size="lg" />
        <h1 className="text-lg font-semibold">{AUTH.setPassword.title}</h1>
        <p className="text-sm text-muted-foreground">{AUTH.setPassword.description}</p>
      </div>
      <form className="space-y-4" onSubmit={(e) => void onSubmit(e)} noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="current">{AUTH.account.currentPassword}</Label>
          <Input
            id="current"
            type="password"
            className="min-touch h-11"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new">{AUTH.setPassword.newPassword}</Label>
          <Input
            id="new"
            type="password"
            className="min-touch h-11"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm">{AUTH.setPassword.confirmPassword}</Label>
          <Input
            id="confirm"
            type="password"
            className="min-touch h-11"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={8}
          />
        </div>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" className="min-touch w-full" disabled={pending}>
          {AUTH.setPassword.submit}
        </Button>
      </form>
    </div>
  )
}
