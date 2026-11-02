import { getSettings } from "./settings.service";

export type PublicBranding = {
  salonName: string;
  logoUrl: string | null;
};

/**
 * Unauthenticated branding for the login screen.
 * Returns ONLY salon name + logo data URL (or null). No address/phone/GSTIN/ids.
 */
export const getPublicBranding = async () => {
  try {
    const result = await getSettings();
    if (result.statusCode !== 200 || !result.data || typeof result.data !== "object") {
      return { statusCode: 500, data: null as unknown };
    }
    const data = result.data as {
      business?: {
        salonName?: string;
        logoBase64?: string | null;
        logoMimeType?: string | null;
      };
    };
    const business = data.business ?? {};
    const salonName = String(business.salonName ?? "BeautySalon").trim() || "BeautySalon";
    const base64 = business.logoBase64;
    const mime = business.logoMimeType;
    const logoUrl =
      base64 && mime ? `data:${mime};base64,${base64}` : null;

    const branding: PublicBranding = { salonName, logoUrl };
    return { statusCode: 200, data: branding };
  } catch (error) {
    return { statusCode: 500, data: error };
  }
};
