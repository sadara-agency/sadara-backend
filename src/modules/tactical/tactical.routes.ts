import { Router } from "express";
import kpiRoutes from "./kpis/tacticalKpi.routes";
import setPieceRoutes from "./set-pieces/setPiece.routes";
import reportRoutes from "./reports/tacticalReport.routes";

const router = Router();

// Sub-modules
// /api/v1/tactical/kpis
router.use("/kpis", kpiRoutes);

// /api/v1/tactical/set-pieces
router.use("/set-pieces", setPieceRoutes);

// /api/v1/tactical/reports
router.use("/reports", reportRoutes);

export default router;
