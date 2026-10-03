/** Normalize to E.164-ish digits for wa.me (default India +91). */
export function normalizeWhatsAppPhone(
  raw: string,
  defaultCountry = '91',
): string | null {
  let digits = raw.replace(/[^\d+]/g, '')
  if (digits.startsWith('+')) digits = digits.slice(1)
  digits = digits.replace(/\D/g, '')
  // strip leading zeros after country handling
  if (digits.length === 10) {
    digits = `${defaultCountry}${digits}`
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = `${defaultCountry}${digits.slice(1)}`
  } else if (digits.startsWith('91') && digits.length === 12) {
    // already IN
  } else if (digits.length < 10 || digits.length > 15) {
    return null
  }
  // remove a single leading 0 after country if present (e.g. 910987...)
  if (digits.startsWith(`${defaultCountry}0`) && digits.length === 13) {
    digits = `${defaultCountry}${digits.slice(defaultCountry.length + 1)}`
  }
  if (digits.length < 11 || digits.length > 15) return null
  return digits
}

export function fillWhatsAppMessage(
  template: string,
  vars: {
    customer: string
    salon: string
    amount: string
    link: string
  },
): string {
  return template
    .replaceAll('{customer}', vars.customer)
    .replaceAll('{salon}', vars.salon)
    .replaceAll('{amount}', vars.amount)
    .replaceAll('{link}', vars.link)
}
