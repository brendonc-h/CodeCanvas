import { Router } from "express";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { aiClient } from "../ai-client";
import { metricsService } from "../metrics";

const router = Router();

// AI Models route
router.get("/models", requireAuth, async (req, res) => {
  try {
    const { provider } = req.query;
    const supportedProviders = ['groq', 'openai', 'anthropic', 'grok'];
    if (!provider || typeof provider !== 'string' || !supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Invalid provider. Supported: groq, openai, anthropic, grok" });
    }

    const models = await aiClient.listModels(provider, req.user!.id);
    const modelsWithLabels = models.map(model => ({
      value: model,
      label: model.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }));
    res.json({ models: modelsWithLabels });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI Health check route
router.get("/health", requireAuth, async (req, res) => {
  try {
    const { provider } = req.query;
    const supportedProviders = ['groq', 'openai', 'anthropic', 'grok'];
    if (!provider || typeof provider !== 'string' || !supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Invalid provider. Supported: groq, openai, anthropic, grok" });
    }

    const healthy = await aiClient.checkProviderHealth(provider, req.user!.id);
    res.json({ healthy });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI completion
router.post("/complete", requireAuth, async (req, res) => {
  try {
    const { provider = 'groq', model, prompt, projectId, filePath, apiKey } = req.body;
    const supportedProviders = ['groq', 'openai', 'anthropic', 'grok'];

    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: "Invalid provider. Supported: groq, openai, anthropic, grok" });
    }

    if (!model || !prompt) {
      return res.status(400).json({ error: "Model and prompt required" });
    }

    const response = await aiClient.generate({
      provider,
      model,
      prompt,
      apiKey,
    }, req.user!.id);

    // Store interaction
    await storage.createAiInteraction({
      userId: req.user!.id,
      projectId: projectId || null,
      provider,
      model,
      prompt,
      response,
      filePath: filePath || null,
    });

    // Track AI usage (estimate tokens)
    const estimatedTokens = (prompt.length + response.length) / 4; // Rough estimation
    await metricsService.trackAIUsage(req.user!.id, model, Math.ceil(estimatedTokens), projectId);

    res.json({ response });
  } catch (error: any) {
    console.error("AI error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
