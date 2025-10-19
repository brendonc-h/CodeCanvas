import { Router } from "express";
import { requireAuth } from "../auth";
import { dbStorage as storage } from "../db-storage";
import { templateConfigs } from "@shared/schema";
import { fileSync } from "../file-sync";
import { dockerManager } from "../docker-manager";
import { metricsService } from "../metrics";
import { netlifyDeploy } from "../netlify-deploy";

const router = Router();

// Get deployment history for a project
router.get("/:id/deployments", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.id);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const deploymentHistory = await storage.getDeploymentsByProjectId(req.params.id);
    res.json(deploymentHistory);
  } catch (error: any) {
    console.error("Get deployments error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Rollback to a previous deployment
router.post("/rollback", requireAuth, async (req, res) => {
  try {
    const { deploymentId } = req.body;

    if (!deploymentId) {
      return res.status(400).json({ error: "Deployment ID required" });
    }

    const deployment = await storage.getDeployment(deploymentId);
    if (!deployment) {
      return res.status(404).json({ error: "Deployment not found" });
    }

    // Check ownership
    if (deployment.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Only allow rollback of successful deployments
    if (deployment.status !== "success") {
      return res.status(400).json({ error: "Can only rollback successful deployments" });
    }

    const project = await storage.getProject(deployment.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    const template = templateConfigs[project.template as keyof typeof templateConfigs];

    // Parse file snapshot from the deployment we're rolling back to
    if (!deployment.fileSnapshot) {
      return res.status(400).json({ error: "Deployment has no file snapshot" });
    }

    const snapshotFiles = JSON.parse(deployment.fileSnapshot);

    // Create new deployment record (with same snapshot)
    const newDeployment = await storage.createDeployment({
      projectId: deployment.projectId,
      userId: req.user!.id,
      siteId: deployment.siteId || null,
      status: "pending",
      deployUrl: null,
      buildLog: null,
      fileSnapshot: deployment.fileSnapshot, // Keep same snapshot
    });

    // Start deployment in background using snapshot files
    (async () => {
      try {
        await storage.updateDeployment(newDeployment.id, { status: "building" });

        // Restore files in database to match snapshot
        const currentFiles = await storage.getFilesByProjectId(deployment.projectId);

        // Delete files that don't exist in snapshot
        const snapshotPaths = new Set(snapshotFiles.map((f: any) => f.path));
        for (const file of currentFiles) {
          if (!snapshotPaths.has(file.path)) {
            await storage.deleteFileByPath(deployment.projectId, file.path);
          }
        }

        // Update or create files from snapshot
        for (const snapshotFile of snapshotFiles) {
          const existing = currentFiles.find(f => f.path === snapshotFile.path);
          if (existing) {
            await storage.updateFileByPath(deployment.projectId, snapshotFile.path, snapshotFile.content);
          } else {
            await storage.createFile({
              projectId: deployment.projectId,
              path: snapshotFile.path,
              content: snapshotFile.content,
            });
          }
        }

        // Sync snapshot files to disk (restore previous version)
        await fileSync.syncAllFiles(deployment.projectId, snapshotFiles);

        const projectDir = fileSync.getProjectDir(deployment.projectId);

        // Run build command if not vanilla
        if (project.template !== 'vanilla-js') {
          const sandbox = await storage.getSandboxByProjectId(deployment.projectId);
          if (sandbox && sandbox.containerId && template.buildCommand) {
            await dockerManager.execCommand(
              sandbox.containerId,
              template.buildCommand.split(' '),
              (output) => console.log('Build:', output),
              (error) => console.error('Build error:', error)
            );
          }
        }

        // Determine build directory based on template
        let buildDir = 'dist'; // default for Vite
        if (project.template === 'next-static') {
          buildDir = 'out';
        } else if (project.template === 'vanilla-js') {
          buildDir = '.';
        }

        const result = await netlifyDeploy.deploy({
          projectPath: projectDir,
          buildDir,
          siteId: deployment.siteId || undefined,
        });

        await storage.updateDeployment(newDeployment.id, {
          status: "success",
          siteId: result.siteId,
          deployUrl: result.deployUrl,
        });
      } catch (error: any) {
        await storage.updateDeployment(newDeployment.id, {
          status: "failed",
          buildLog: error.message,
        });
      }
    })();

    res.json({ deploymentId: newDeployment.id, message: "Rollback initiated" });
  } catch (error: any) {
    console.error("Rollback error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Netlify deployment
router.post("/netlify", requireAuth, async (req, res) => {
  try {
    const { projectId, siteId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: "Project ID required" });
    }

    const project = await storage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Check ownership
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const template = templateConfigs[project.template as keyof typeof templateConfigs];

    // Get current files for snapshot
    const files = await storage.getFilesByProjectId(projectId);
    const fileSnapshot = JSON.stringify(files.map(f => ({ path: f.path, content: f.content })));

    // Create deployment record with snapshot
    const deployment = await storage.createDeployment({
      projectId,
      userId: req.user!.id,
      siteId: siteId || null,
      status: "pending",
      deployUrl: null,
      buildLog: null,
      fileSnapshot,
    });

    // Track deployment usage
    await metricsService.trackResourceUsage(req.user!.id, 'deployments', 1, 'count', projectId);

    res.json({ deploymentId: deployment.id, deployUrl: null });

    (async () => {
      try {
        await storage.updateDeployment(deployment.id, { status: "building" });

        // Ensure files are synced to disk
        const files = await storage.getFilesByProjectId(projectId);
        await fileSync.syncAllFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));

        const projectDir = fileSync.getProjectDir(projectId);

        // Run build command if not vanilla
        if (project.template !== 'vanilla-js') {
          const sandbox = await storage.getSandboxByProjectId(projectId);
          if (sandbox && sandbox.containerId && template.buildCommand) {
            await dockerManager.execCommand(
              sandbox.containerId,
              template.buildCommand.split(' '),
              (output) => console.log('Build:', output),
              (error) => console.error('Build error:', error)
            );
          }
        }

        // Determine build directory based on template
        let buildDir = 'dist'; // default for Vite
        if (project.template === 'next-static') {
          buildDir = 'out';
        } else if (project.template === 'vanilla-js') {
          buildDir = '.';
        }

        const result = await netlifyDeploy.deploy({
          projectPath: projectDir,
          buildDir,
          siteId: siteId || undefined,
        });

        await storage.updateDeployment(deployment.id, {
          status: "success",
          siteId: result.siteId,
          deployUrl: result.deployUrl,
        });
      } catch (error: any) {
        await storage.updateDeployment(deployment.id, {
          status: "failed",
          buildLog: error.message,
        });
      }
    })();

    res.json({ deploymentId: deployment.id, deployUrl: null });
  } catch (error: any) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Preview route
router.get("/preview/:projectId", requireAuth, async (req, res) => {
  try {
    const project = await storage.getProject(req.params.projectId);
    if (!project || project.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const sandbox = await storage.getSandboxByProjectId(req.params.projectId);

    if (!sandbox || !sandbox.port) {
      return res.status(404).send("Preview not available. Start the dev server first.");
    }

    // Proxy to the container's port
    res.redirect(`http://localhost:${sandbox.port}`);
  } catch (error: any) {
    res.status(500).send("Preview error: " + error.message);
  }
});

export default router;
