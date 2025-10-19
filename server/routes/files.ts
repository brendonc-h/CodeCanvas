import { Router } from "express";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { fileSync } from "../file-sync";

const router = Router();

// File routes
router.get("/:id/files", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const files = await storage.getFilesByProjectId(req.params.id);
    res.json(files);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/:id/files", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { path: filePath, content } = req.body;

    const file = await storage.createFile({
      projectId: req.params.id,
      path: filePath,
      content: content || "",
    });

    await fileSync.writeFile(req.params.id, filePath, content || "");

    res.json(file);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put("/:id/files", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { path: filePath, content } = req.body;

    const existing = await storage.getFileByPath(req.params.id, filePath);
    let file;

    if (existing) {
      file = await storage.updateFileByPath(req.params.id, filePath, content);
    } else {
      file = await storage.createFile({
        projectId: req.params.id,
        path: filePath,
        content,
      });
    }

    await fileSync.writeFile(req.params.id, filePath, content);

    res.json(file);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.delete("/:id/files", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { path: filePath } = req.body;
    await storage.deleteFileByPath(req.params.id, filePath);
    await fileSync.deleteFile(req.params.id, filePath);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
