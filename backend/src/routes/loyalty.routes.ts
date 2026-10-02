import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/permission.middleware";
import {
  adjustLoyaltyController,
  getBalanceController,
  getLoyaltyRulesController,
  listBalancesController,
  listLedgerController,
  patchLoyaltyRulesController,
} from "../controller/loyalty.controller";

const router = Router();

router.get(
  "/rules",
  authenticate,
  requirePermission("loyalty:read"),
  getLoyaltyRulesController,
);

router.patch(
  "/rules",
  authenticate,
  requirePermission("loyalty:update"),
  patchLoyaltyRulesController,
);

router.get(
  "/balances",
  authenticate,
  requirePermission("loyalty:read"),
  listBalancesController,
);

router.get(
  "/balances/:customerId",
  authenticate,
  requirePermission("loyalty:read"),
  getBalanceController,
);

router.get(
  "/ledger",
  authenticate,
  requirePermission("loyalty:read"),
  listLedgerController,
);

router.post(
  "/adjust",
  authenticate,
  requirePermission("loyalty:adjust"),
  adjustLoyaltyController,
);

export default router;
