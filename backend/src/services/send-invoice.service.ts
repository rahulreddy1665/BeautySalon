/**
 * Future WhatsApp Cloud API (or other paid channel) entry point.
 * Free flow today uses wa.me / navigator.share on the client — see frontend
 * `sendInvoiceToCustomer`. Swap this body when Cloud API credentials exist.
 */
export type SendInvoicePayload = {
  invoiceId: string;
  phoneE164: string;
  message: string;
  publicUrl?: string;
  pdfBuffer?: Buffer;
};

export type SendInvoiceResult = {
  sent: boolean;
  channel: "none" | "whatsapp_cloud";
  reason?: string;
};

/**
 * Paid / automatic send path — intentionally a no-op until Cloud API is wired.
 * Do not call from production UI yet; free share opens WhatsApp for the staff.
 */
export async function sendInvoiceToCustomer(
  _payload: SendInvoicePayload,
): Promise<SendInvoiceResult> {
  return {
    sent: false,
    channel: "none",
    reason: "WhatsApp Cloud API not configured",
  };
}
