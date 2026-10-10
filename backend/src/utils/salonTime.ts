/**
 * Salon wall-clock helpers. No salon timezone setting exists yet —
 * default Asia/Kolkata (IST). Never use the process/browser local zone
 * for appointment lock / past checks on the server.
 */

export const SALON_TIME_ZONE = "Asia/Kolkata";

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((p) => p.type === type)?.value ?? "";
}

/** Current date (YYYY-MM-DD) and minutes-from-midnight in the salon zone. */
export function getSalonNow(now: Date = new Date()): {
  dateKey: string;
  totalMinutes: number;
} {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SALON_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const year = part(parts, "year");
  const month = part(parts, "month");
  const day = part(parts, "day");
  let hour = Number(part(parts, "hour"));
  if (hour === 24) hour = 0;
  const minute = Number(part(parts, "minute"));

  return {
    dateKey: `${year}-${month}-${day}`,
    totalMinutes: hour * 60 + minute,
  };
}

export function parseHhMm(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function isFinalAppointmentStatus(
  status: string,
): boolean {
  return (
    status === "completed" ||
    status === "cancelled" ||
    status === "no_show"
  );
}

/** True when the appointment start is at or before salon now. */
export function isAppointmentPast(
  date: string,
  startTime: string,
  now: Date = new Date(),
): boolean {
  const salon = getSalonNow(now);
  if (date < salon.dateKey) return true;
  if (date > salon.dateKey) return false;
  const startMin = parseHhMm(startTime);
  if (startMin == null) return false;
  return startMin <= salon.totalMinutes;
}

/**
 * Locked for edit / reschedule / cancel.
 * Final statuses OR past start time. Booked + past still allows bill / no-show.
 */
export function isAppointmentLocked(
  status: string,
  date: string,
  startTime: string,
  now: Date = new Date(),
): boolean {
  if (isFinalAppointmentStatus(status)) return true;
  return isAppointmentPast(date, startTime, now);
}
