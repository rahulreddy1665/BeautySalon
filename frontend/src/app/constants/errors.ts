import { COMMON } from '@/app/constants/common'

/** User-facing error messages + backend code/status map. */

export const ERRORS = {
  unexpected: COMMON.errors.unexpected,
  network: 'Network error. Check your connection and try again.',
  unauthorized: 'Please sign in again.',
  forbidden: 'You do not have permission for this action.',
  notFound: 'Not found.',
  validation: 'Please check the form and try again.',
  conflict: 'This action conflicts with existing data.',
  rateLimited: 'Too many attempts. Try again shortly.',
  salonClosed: 'The salon is closed at this time.',
  lastAdmin: 'There must always be at least one active admin.',
  invalidCredentials: 'Invalid username or password.',
  wrongPassword: 'Current password is incorrect.',
  passwordSame: 'New password must be different from the current one.',
  mustChangePassword: 'You must set a new password before continuing.',
  designationInUse: 'Reassign staff before deactivating this designation.',
  usernameTaken: 'That username is already taken.',
  emailTaken: 'That email is already in use.',
  designationRequired: 'Select a designation before enabling login.',
  appointmentLocked: 'This appointment has passed and can no longer be edited.',
} as const

export const ERROR_CODE_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: ERRORS.unauthorized,
  FORBIDDEN: ERRORS.forbidden,
  NOT_FOUND: ERRORS.notFound,
  VALIDATION_ERROR: ERRORS.validation,
  CONFLICT: ERRORS.conflict,
  RATE_LIMITED: ERRORS.rateLimited,
  SALON_CLOSED: ERRORS.salonClosed,
  LAST_ADMIN: ERRORS.lastAdmin,
  INVALID_CREDENTIALS: ERRORS.invalidCredentials,
  WRONG_PASSWORD: ERRORS.wrongPassword,
  PASSWORD_SAME: ERRORS.passwordSame,
  MUST_CHANGE_PASSWORD: ERRORS.mustChangePassword,
  DESIGNATION_IN_USE: ERRORS.designationInUse,
  USERNAME_TAKEN: ERRORS.usernameTaken,
  EMAIL_TAKEN: ERRORS.emailTaken,
  DESIGNATION_REQUIRED: ERRORS.designationRequired,
  APPOINTMENT_LOCKED: ERRORS.appointmentLocked,
}

export const ERROR_STATUS_MESSAGES: Record<number, string> = {
  401: ERRORS.unauthorized,
  403: ERRORS.forbidden,
  404: ERRORS.notFound,
  409: ERRORS.conflict,
  422: ERRORS.validation,
  429: ERRORS.rateLimited,
}
