/**
 * MOCK — staff sales & incentives (no report endpoints yet).
 * Replace when GET /api/reports/staff-sales (or similar) exists.
 */
export interface StaffSalesSummary {
  staffId: string
  servicesSales: number
  productSales: number
  totalSales: number
  bookings: number
  incentiveEarned: number
  incentiveRatePercent: number
}

export function getStaffSalesMock(
  staffId: string,
  fromIso: string,
  toIso: string,
): StaffSalesSummary {
  let hash = 0
  const seed = `${staffId}:${fromIso}:${toIso}`
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 3)) % 991
  }

  const servicesSales = 8000 + hash * 21
  const productSales = 1200 + (hash % 40) * 85
  const incentiveRatePercent = 8
  const totalSales = servicesSales + productSales

  return {
    staffId,
    servicesSales,
    productSales,
    totalSales,
    bookings: 8 + (hash % 25),
    incentiveEarned: Math.round(totalSales * (incentiveRatePercent / 100)),
    incentiveRatePercent,
  }
}

export const STAFF_SALES_GAPS = [
  'GET /api/reports/staff-sales?from&to — missing',
  'Staff incentives configuration API — missing',
  'POST /api/user create requires password + role; CreateUserDto only documents name/email/age',
] as const
