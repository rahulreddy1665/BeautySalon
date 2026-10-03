import { Button } from '@/app/components/ui/button'
import { COMMON, SETTINGS } from '@/app/constants'

interface Props {
  dirty: boolean
  canUpdate: boolean
  pending: boolean
  formId?: string
}

/** Sticky save footer for settings forms (mobile-friendly). */
export function SettingsSaveBar({
  dirty,
  canUpdate,
  pending,
  formId,
}: Props) {
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-4 flex items-center justify-between gap-2 border-t border-border bg-card/95 px-1 py-3 backdrop-blur-sm">
      <p className="text-xs text-muted-foreground">
        {dirty ? SETTINGS.unsavedHint : SETTINGS.allSaved}
      </p>
      <Button
        type="submit"
        form={formId}
        disabled={!canUpdate || !dirty || pending}
      >
        {pending ? SETTINGS.saving : COMMON.actions.save}
      </Button>
    </div>
  )
}
