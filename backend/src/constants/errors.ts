/**
 * Stable error codes + default messages.
 * Include `code` inside `errors` when returning structured failures.
 */

export const ErrorCodes = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  SALON_CLOSED: "SALON_CLOSED",
  LAST_ADMIN: "LAST_ADMIN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  WRONG_PASSWORD: "WRONG_PASSWORD",
  PASSWORD_SAME: "PASSWORD_SAME",
  MUST_CHANGE_PASSWORD: "MUST_CHANGE_PASSWORD",
  DESIGNATION_IN_USE: "DESIGNATION_IN_USE",
  USERNAME_TAKEN: "USERNAME_TAKEN",
  EMAIL_TAKEN: "EMAIL_TAKEN",
  DESIGNATION_REQUIRED: "DESIGNATION_REQUIRED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

export const ErrorMessages = {
  [ErrorCodes.VALIDATION_ERROR]: "Please check the form and try again",
  [ErrorCodes.UNAUTHORIZED]: "Authentication required",
  [ErrorCodes.FORBIDDEN]: "Permission denied",
  [ErrorCodes.NOT_FOUND]: "Not found",
  [ErrorCodes.CONFLICT]: "Conflict with existing data",
  [ErrorCodes.SALON_CLOSED]:
    "The salon is closed at this time. Check opening hours and working days.",
  [ErrorCodes.LAST_ADMIN]: "There must always be at least one active admin",
  [ErrorCodes.INVALID_CREDENTIALS]: "Invalid username or password",
  [ErrorCodes.WRONG_PASSWORD]: "Current password is incorrect",
  [ErrorCodes.PASSWORD_SAME]:
    "New password must be different from the current one",
  [ErrorCodes.MUST_CHANGE_PASSWORD]:
    "You must set a new password before continuing",
  [ErrorCodes.DESIGNATION_IN_USE]:
    "Reassign staff before deactivating this designation",
  [ErrorCodes.USERNAME_TAKEN]: "That username is already taken",
  [ErrorCodes.EMAIL_TAKEN]: "That email is already in use",
  [ErrorCodes.DESIGNATION_REQUIRED]:
    "Select a designation before enabling login",
  [ErrorCodes.INTERNAL]: "Something went wrong",

  SALON_NAME_REQUIRED: "Salon name is required",
  INVALID_GSTIN: "Invalid GSTIN format",
  INVALID_EMAIL: "Invalid email",
  END_AFTER_START: "Closing time must be after opening time",
  OUTSIDE_HOURS: (open: string, close: string) =>
    `The salon is closed at this time. Opening hours are ${open} to ${close}.`,
  NON_WORKING_DAY: "The salon is closed on this day.",
  STAFF_REQUIRED: "Staff is required on every line",
  MIN_REDEEM: (n: number) => `Minimum redeem is ${n} points`,
} as const;

export function fail(
  statusCode: number,
  message: string,
  code: ErrorCode | string = ErrorCodes.VALIDATION_ERROR,
  errors: unknown = null,
) {
  return {
    statusCode,
    data: null,
    message,
    errors: errors ?? { code },
  };
}
