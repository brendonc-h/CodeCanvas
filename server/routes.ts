import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { dockerManager } from "./docker-manager";
import { ollamaClient } from "./ollama-client";
import { netlifyDeploy } from "./netlify-deploy";
import { fileSync } from "./file-sync";
import { templateConfigs } from "@shared/schema";
import * as path from "path";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Ensure demo user exists
  let demoUser = await storage.getUserByEmail("demo@webide.dev");
  if (!demoUser) {
    demoUser = await storage.createUser({
      email: "demo@webide.dev",
      username: "demo",
    });
  }
  
  const DEMO_USER_ID = demoUser.id;

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(DEMO_USER_ID);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const { name, template } = req.body;
      
      if (!name || !template) {
        return res.status(400).json({ error: "Name and template required" });
      }

      const templateConfig = templateConfigs[template as keyof typeof templateConfigs];
      if (!templateConfig) {
        return res.status(400).json({ error: "Invalid template" });
      }

      const project = await storage.createProject({
        userId: DEMO_USER_ID,
        name,
        template,
        description: templateConfig.description,
      });

      // Create template files in storage and on disk
      for (const [filePath, content] of Object.entries(templateConfig.files)) {
        await storage.createFile({
          projectId: project.id,
          path: filePath,
          content,
        });
        await fileSync.writeFile(project.id, filePath, content);
      }

      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      await fileSync.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File routes
  app.get("/api/projects/:id/files", async (req, res) => {
    try {
      const files = await storage.getFilesByProjectId(req.params.id);
      res.json(files);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/files", async (req, res) => {
    try {
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

  app.put("/api/projects/:id/files", async (req, res) => {
    try {
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

  app.delete("/api/projects/:id/files", async (req, res) => {
    try {
      const { path: filePath } = req.body;
      await storage.deleteFileByPath(req.params.id, filePath);
      await fileSync.deleteFile(req.params.id, filePath);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Run command (creates sandbox if needed)
  app.post("/api/runs", async (req, res) => {
    try {
      const { projectId, command } = req.body;

      if (!projectId || !command || !Array.isArray(command)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Kill any existing sandbox for this user (1 per user limit)
      const existingSandbox = await storage.getSandboxByUserId(DEMO_USER_ID);
      if (existingSandbox && existingSandbox.projectId !== projectId) {
        if (existingSandbox.containerId) {
          await dockerManager.stopContainer(existingSandbox.containerId);
        }
        await storage.deleteSandbox(existingSandbox.id);
      }

      // Check if sandbox exists for this project
      let sandbox = await storage.getSandboxByProjectId(projectId);
      
      if (!sandbox) {
        // Ensure files are synced to disk
        const files = await storage.getFilesByProjectId(projectId);
        await fileSync.syncAllFiles(projectId, files.map(f => ({ path: f.path, content: f.content })));
        
        const projectDir = fileSync.getProjectDir(projectId);

        // Create Docker container
        const { containerId, port } = await dockerManager.createSandbox({
          projectId,
          userId: DEMO_USER_ID,
          workingDir: projectDir,
          cpus: 0.5,
          memory: 512,
          pidsLimit: 256,
        });

        sandbox = await storage.createSandbox({
          projectId,
          userId: DEMO_USER_ID,
          containerId,
          status: "running",
          port,
          lastActivity: new Date(),
        });
      }

      // Execute command in container
      if (sandbox.containerId) {
        await dockerManager.execCommand(
          sandbox.containerId,
          command,
          (output) => {
            console.log(output);
          },
          (error) => {
            console.error(error);
          }
        );

        await storage.updateSandbox(sandbox.id, {
          lastActivity: new Date(),
        });
      }

      res.json({ success: true, sandboxId: sandbox.id, port: sandbox.port });
    } catch (error: any) {
      console.error("Run error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // AI completion
  app.post("/api/ai/complete", async (req, res) => {
    try {
      const { model, prompt, filePath, content } = req.body;

      if (!model || !prompt) {
        return res.status(400).json({ error: "Model and prompt required" });
      }

      const response = await ollamaClient.generate({
        model,
        prompt,
      });

      // Store interaction
      await storage.createAiInteraction({
        userId: DEMO_USER_ID,
        projectId: req.body.projectId || null,
        model,
        prompt,
        response,
        filePath: filePath || null,
      });

      res.json({ response });
    } catch (error: any) {
      console.error("AI error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Netlify deployment
  app.post("/api/deploy/netlify", async (req, res) => {
    try {
      const { projectId, siteId } = req.body;

      if (!projectId) {
        return res.status(400).json({ error: "Project ID required" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const template = templateConfigs[project.template as keyof typeof templateConfigs];
      
      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId,
        userId: DEMO_USER_ID,
        siteId: siteId || null,
        status: "pending",
        deployUrl: null,
        buildLog: null,
      });

      // Start deployment in background
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
  app.get("/preview/:projectId", async (req, res) => {
    try {
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

  // WebSocket server for terminal - handle routing manually
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    
    if (url.startsWith('/ws/terminal/')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    const url = req.url || '';
    const match = url.match(/\/ws\/terminal\/([^/?]+)/);
    const projectId = match ? match[1] : null;
    
    if (!projectId) {
      ws.send('Invalid project ID\r\n');
      ws.close();
      return;
    }

    // Handle terminal WebSocket
    (async () => {
      try {
        let sandbox = await storage.getSandboxByProjectId(projectId);
        
        if (!sandbox) {
          ws.send('No sandbox running. Use the Run buttons to start.\r\n');
          return;
        }

        if (!sandbox.containerId) {
          ws.send('Container not available\r\n');
          return;
        }

        const container = await dockerManager.docker.getContainer(sandbox.containerId);
        const exec = await container.exec({
          Cmd: ['/bin/sh'],
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
        });

        const stream = await exec.start({
          Tty: true,
          stdin: true,
        });

        // Container output -> WebSocket
        stream.on('data', (chunk: Buffer) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(chunk.toString());
          }
        });

        // WebSocket input -> Container
        ws.on('message', (data: Buffer) => {
          stream.write(data);
        });

        ws.on('close', () => {
          stream.end();
        });

        stream.on('end', () => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.close();
          }
        });

        // Update sandbox activity
        await storage.updateSandbox(sandbox.id, {
          lastActivity: new Date(),
        });
      } catch (error: any) {
        ws.send(`Terminal error: ${error.message}\r\n`);
      }
    })();
  });

  // Sandbox cleanup job (run every 30 seconds)
  setInterval(async () => {
    const now = Date.now();
    const sandboxes = (storage as any).sandboxes as Map<string, any>;
    
    for (const [id, sandbox] of Array.from(sandboxes.entries())) {
      const idleTime = now - sandbox.lastActivity.getTime();
      
      // Kill if idle > 60 seconds or runtime > 120 seconds
      const maxIdleTime = 60 * 1000;
      const maxRuntime = 120 * 1000;
      const runtime = now - sandbox.createdAt.getTime();
      
      if (idleTime > maxIdleTime || runtime > maxRuntime) {
        if (sandbox.containerId) {
          await dockerManager.stopContainer(sandbox.containerId);
        }
        await storage.deleteSandbox(id);
        console.log(`Cleaned up sandbox ${id}`);
      }
    }
  }, 30000);

  return httpServer;
}
