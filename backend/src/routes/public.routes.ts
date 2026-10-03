import { Router } from "express";

import { getPublicInvoiceController } from "../controller/invoice-share.controller";

const router = Router();

router.get("/invoice/:token", getPublicInvoiceController);

export default router;
