import { ArrowLeft } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '@/app/components/PageHeader'
import { Button } from '@/app/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { Input } from '@/app/components/ui/input'
import { Label } from '@/app/components/ui/label'
import { AUTH, COMMON, ROUTES } from '@/app/constants'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import { authApi } from '@/app/service/auth/authApi'
import { setCredentials } from '@/app/state/redux/slices/authSlice'
import { toErrorMessage } from '@/app/utils'

export function AccountScreen() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const token = useAppSelector((s) => s.auth.token)
  const isAdmin = user?.role === 'admin'

  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwPending, setPwPending] = useState(false)

  const [email, setEmail] = useState(user?.email ?? '')
  const [emailPw, setEmailPw] = useState('')
  const [emailPending, setEmailPending] = useState(false)

  const onChangePassword = async (e: FormEvent) => {
    e.preventDefault()
    if (newPw !== confirmPw) {
      toast.error(AUTH.setPassword.mismatch)
      return
    }
    setPwPending(true)
    try {
      const result = await authApi.changePassword({
        currentPassword: currentPw,
        newPassword: newPw,
      })
      if (token) {
        dispatch(
          setCredentials({
            token: result.token,
            user: result.user,
          }),
        )
      }
      toast.success(AUTH.account.passwordUpdated)
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      toast.error(toErrorMessage(err))
    } finally {
      setPwPending(false)
    }
  }

  const onChangeEmail = async (e: FormEvent) => {
    e.preventDefault()
    setEmailPending(true)
    try {
      const result = await authApi.changeEmail({
        email: email.trim(),
        currentPassword: emailPw,
      })
      if (user && token) {
        dispatch(
          setCredentials({
            token,
            user: { ...user, email: result.email },
          }),
        )
      }
      toast.success(AUTH.account.emailUpdated)
      setEmailPw('')
    } catch (err) {
      toast.error(toErrorMessage(err))
    } finally {
      setEmailPending(false)
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <Link
        to={ROUTES.home}
        className="hidden items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
      >
        <ArrowLeft className="size-3.5" strokeWidth={1.75} />
        {COMMON.actions.back}
      </Link>
      <PageHeader description={AUTH.account.title} />

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle>{AUTH.account.changePassword}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-3"
              onSubmit={(e) => void onChangePassword(e)}
              noValidate
            >
              <div className="space-y-1">
                <Label>{AUTH.account.currentPassword}</Label>
                <Input
                  type="password"
                  className="min-touch h-11"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>{AUTH.account.newPassword}</Label>
                <Input
                  type="password"
                  className="min-touch h-11"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <div className="space-y-1">
                <Label>{AUTH.account.confirmPassword}</Label>
                <Input
                  type="password"
                  className="min-touch h-11"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  required
                  minLength={8}
                />
              </div>
              <Button type="submit" className="min-touch" disabled={pwPending}>
                {AUTH.account.savePassword}
              </Button>
            </form>
          </CardContent>
        </Card>

        {isAdmin ? (
          <Card>
            <CardHeader className="pb-1">
              <CardTitle>{AUTH.account.changeEmail}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-3"
                onSubmit={(e) => void onChangeEmail(e)}
                noValidate
              >
                <div className="space-y-1">
                  <Label>{AUTH.account.newEmail}</Label>
                  <Input
                    type="email"
                    className="min-touch h-11"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>{AUTH.account.currentPassword}</Label>
                  <Input
                    type="password"
                    className="min-touch h-11"
                    value={emailPw}
                    onChange={(e) => setEmailPw(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="min-touch" disabled={emailPending}>
                  {AUTH.account.saveEmail}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
