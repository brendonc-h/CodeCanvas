import { Router } from "express";
import Joi from "joi";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { fileSync } from "../file-sync";

const router = Router();

// Input validation schemas
const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  template: Joi.string().required(),
  files: Joi.object().required(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().optional(),
});

// Template sharing routes
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const templates = await storage.getSharedTemplates(limit);
    res.json(templates);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    res.json(template);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const { name, description, template: baseTemplate, files, tags, isPublic = true } = req.body;

    if (!name || !baseTemplate || !files) {
      return res.status(400).json({ error: "Name, template, and files required" });
    }

    const sharedTemplate = await storage.createSharedTemplate({
      name,
      description,
      template: baseTemplate,
      files,
      creatorId: req.user!.id,
      isPublic,
      tags,
    });

    res.json(sharedTemplate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id", requireAuth, async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.creatorId !== req.user!.id) {
      return res.status(403).json({ error: "Only creator can update template" });
    }

    const updatedTemplate = await storage.updateSharedTemplate(req.params.id, req.body);
    res.json(updatedTemplate);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    if (template.creatorId !== req.user!.id) {
      return res.status(403).json({ error: "Only creator can delete template" });
    }

    await storage.deleteSharedTemplate(req.params.id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/rate", requireAuth, async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const { rating, review } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const templateRating = await storage.createTemplateRating({
      templateId: req.params.id,
      userId: req.user!.id,
      rating,
      review,
    });

    // Update template average rating
    const allRatings = await storage.getTemplateRatings(req.params.id);
    const avgRating = allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;
    await storage.updateSharedTemplate(req.params.id, { rating: Math.round(avgRating * 10) / 10 });

    res.json(templateRating);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/:id/ratings", async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    const ratings = await storage.getTemplateRatings(req.params.id);
    res.json(ratings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/use", requireAuth, async (req, res) => {
  try {
    const template = await storage.getSharedTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }

    // Increment download count
    await storage.updateSharedTemplate(req.params.id, {
      downloads: (template.downloads ?? 0) + 1
    });

    // Create project from template
    const project = await storage.createProject({
      userId: req.user!.id,
      name: `${template.name} Copy`,
      template: template.template,
      description: template.description,
    });

    // Create files from template
    const templateFiles = template.files as Record<string, unknown>;
    for (const [filePath, content] of Object.entries(templateFiles)) {
      const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
      await storage.createFile({
        projectId: project.id,
        path: filePath,
        content: contentStr,
      });
      await fileSync.writeFile(project.id, filePath, contentStr);
    }

    res.json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
