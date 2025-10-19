import { Router } from "express";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { metricsService } from "../metrics";

const router = Router();

// Metrics routes
router.get("/", requireAuth, async (req, res) => {
  try {
    const metrics = await storage.getLatestMetrics();
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:type", requireAuth, async (req, res) => {
  try {
    const metrics = await storage.getMetricsByType(req.params.type);
    res.json(metrics);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/user/resource-usage", requireAuth, async (req, res) => {
  try {
    const summary = await metricsService.getUserResourceSummary(req.user!.id);
    const usage = await storage.getResourceUsageByUserId(req.user!.id);
    res.json({ summary, usage });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
