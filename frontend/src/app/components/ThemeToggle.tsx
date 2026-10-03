import { Check, Monitor, Moon, Sun } from 'lucide-react'

import { Button } from '@/app/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu'
import { COMMON } from '@/app/constants'
import { useAppDispatch, useAppSelector } from '@/app/hooks/useRedux'
import {
  setThemeMode,
  type ThemeMode,
} from '@/app/state/redux/slices/settingsSlice'

const options: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: COMMON.nav.themeLight, icon: Sun },
  { value: 'dark', label: COMMON.nav.themeDark, icon: Moon },
  { value: 'system', label: COMMON.nav.themeSystem, icon: Monitor },
]

export function ThemeToggle() {
  const dispatch = useAppDispatch()
  const themeMode = useAppSelector((state) => state.settings.themeMode)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={COMMON.nav.theme}
          className="min-touch size-9 rounded-full"
        >
          <Sun className="size-4 dark:hidden" strokeWidth={1.75} />
          <Moon className="hidden size-4 dark:block" strokeWidth={1.75} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => dispatch(setThemeMode(option.value))}
            className="gap-2"
          >
            <option.icon className="size-4" strokeWidth={1.75} />
            <span className="flex-1">{option.label}</span>
            {themeMode === option.value ? (
              <Check className="size-4" strokeWidth={1.75} />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
