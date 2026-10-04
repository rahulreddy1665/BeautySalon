import { Router } from "express";

import { getPublicBrandingController } from "../controller/public-branding.controller";
import { getPublicInvoiceController } from "../controller/invoice-share.controller";

const router = Router();

router.get("/branding", getPublicBrandingController);
router.get("/invoice/:token", getPublicInvoiceController);

export default router;
