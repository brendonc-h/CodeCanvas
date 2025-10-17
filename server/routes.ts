import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./db-storage";
import { dockerManager } from "./docker-manager";
import { ollamaClient } from "./ollama-client";
import { netlifyDeploy } from "./netlify-deploy";
import { fileSync } from "./file-sync";
import { templateConfigs } from "@shared/schema";
import * as path from "path";

import { requireAuth, optionalAuth } from "./auth";
import bcrypt from "bcrypt";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { email, username, password } = req.body;

      if (!email || !username || !password) {
        return res.status(400).json({ error: "Email, username, and password required" });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      const user = await storage.createUser({
        email,
        username,
        passwordHash,
      });

      // Set session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Set session
      req.session.userId = user.id;

      res.json({
        id: user.id,
        email: user.email,
        username: user.username,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", optionalAuth, (req, res) => {
    if (req.user) {
      res.json(req.user);
    } else {
      res.status(401).json({ error: "Not authenticated" });
    }
  });

  // Ensure demo user exists for backward compatibility
  let demoUser = await storage.getUserByEmail("demo@webide.dev");
  if (!demoUser) {
    const demoPasswordHash = await bcrypt.hash("demo", 10);
    demoUser = await storage.createUser({
      email: "demo@webide.dev",
      username: "demo",
      passwordHash: demoPasswordHash,
    });
  }

  // Project routes
  app.get("/api/projects", requireAuth, async (req, res) => {
    try {
      const projects = await storage.getProjectsByUserId(req.user!.id);
      res.json(projects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Check ownership
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      res.json(project);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects", requireAuth, async (req, res) => {
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
        userId: req.user!.id,
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

  app.delete("/api/projects/:id", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      // Check ownership
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden" });
      }
      
      await storage.deleteProject(req.params.id);
      await fileSync.deleteProject(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // File routes
  app.get("/api/projects/:id/files", requireAuth, async (req, res) => {
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

  app.post("/api/projects/:id/files", requireAuth, async (req, res) => {
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

  app.put("/api/projects/:id/files", requireAuth, async (req, res) => {
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

  app.delete("/api/projects/:id/files", requireAuth, async (req, res) => {
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

  // Run command (creates sandbox if needed)
  app.post("/api/runs", requireAuth, async (req, res) => {
    try {
      const { projectId, command } = req.body;

      if (!projectId || !command || !Array.isArray(command)) {
        return res.status(400).json({ error: "Invalid request" });
      }

      // Check project ownership
      const project = await storage.getProject(projectId);
      if (!project || project.userId !== req.user!.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Kill any existing sandbox for this user (1 per user limit)
      const existingSandbox = await storage.getSandboxByUserId(req.user!.id);
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
          userId: req.user!.id,
          workingDir: projectDir,
          cpus: 0.5,
          memory: 512,
          pidsLimit: 256,
        });

        sandbox = await storage.createSandbox({
          projectId,
          userId: req.user!.id,
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
  app.post("/api/ai/complete", requireAuth, async (req, res) => {
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
        userId: req.user!.id,
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
  app.post("/api/deploy/netlify", requireAuth, async (req, res) => {
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
      
      // Create deployment record
      const deployment = await storage.createDeployment({
        projectId,
        userId: req.user!.id,
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
  app.get("/preview/:projectId", requireAuth, async (req, res) => {
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

  // WebSocket server for terminal - handle routing manually
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url || '';
    
    if (url.startsWith('/ws/terminal/')) {
      // Parse session to authenticate WebSocket connection
      const sessionParser = app.get('sessionParser'); // We'll set this below
      sessionParser(request as any, {} as any, async () => {
        const session = (request as any).session;
        
        if (!session || !session.userId) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Extract project ID and verify ownership
        const match = url.match(/\/ws\/terminal\/([^/?]+)/);
        const projectId = match ? match[1] : null;
        
        if (!projectId) {
          socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
          socket.destroy();
          return;
        }

        const project = await storage.getProject(projectId);
        if (!project || project.userId !== session.userId) {
          socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
          socket.destroy();
          return;
        }

        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
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

    // Handle terminal WebSocket (already authenticated in upgrade)
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
    const sandboxes = await storage.getAllSandboxes();
    
    for (const sandbox of sandboxes) {
      const idleTime = now - sandbox.lastActivity.getTime();
      
      // Kill if idle > 60 seconds or runtime > 120 seconds
      const maxIdleTime = 60 * 1000;
      const maxRuntime = 120 * 1000;
      const runtime = now - sandbox.createdAt.getTime();
      
      if (idleTime > maxIdleTime || runtime > maxRuntime) {
        if (sandbox.containerId) {
          await dockerManager.stopContainer(sandbox.containerId);
        }
        await storage.deleteSandbox(sandbox.id);
        console.log(`Cleaned up sandbox ${sandbox.id}`);
      }
    }
  }, 30000);

  return httpServer;
}
