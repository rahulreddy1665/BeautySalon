import {
  appointmentCustomerLabel,
  appointmentServiceId,
  appointmentStaffId,
  appointmentStaffName,
  type Appointment,
} from '@/app/service/appointments/appointmentsApi'

export function appointmentToCartLines(
  appt: Appointment,
  servicesCatalog: Array<{ _id: string; price: number }>,
) {
  return appt.services.map((line) => {
    const serviceId = appointmentServiceId(line)
    const catalog = servicesCatalog.find((s) => s._id === serviceId)
    const price =
      typeof line.service === 'object' && line.service?.price != null
        ? line.service.price
        : (catalog?.price ?? 0)
    return {
      catalogId: serviceId,
      kind: 'service' as const,
      name: line.name,
      unitPrice: price,
      qty: 1,
      staffId: appointmentStaffId(line),
      staffName: appointmentStaffName(line),
    }
  })
}

export function appointmentCustomerMeta(appt: Appointment) {
  const hasCustomer = Boolean(appt.customer)
  const customerId =
    typeof appt.customer === 'object' && appt.customer
      ? appt.customer._id
      : typeof appt.customer === 'string'
        ? appt.customer
        : null
  return {
    appointmentId: appt._id,
    customerId,
    customerName: appointmentCustomerLabel(appt),
    walkIn: !hasCustomer,
    walkInPhone: appt.guestPhone,
    notes: appt.notes,
  }
}
