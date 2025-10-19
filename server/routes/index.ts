import { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Import modular routers
import authRouter from "./auth";
import teamsRouter from "./teams";
import projectsRouter from "./projects";
import filesRouter from "./files";
import gitRouter from "./git";
import aiRouter from "./ai";
import deploymentsRouter from "./deployments";
import templatesRouter from "./templates";
import backupsRouter from "./backups";
import metricsRouter from "./metrics";
import settingsRouter from "./settings";

import { dbStorage as storage } from "../db-storage";
import { dockerManager } from "../docker-manager";
import { RunService } from "../services/run";

// Security middleware
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// Input sanitization middleware
const sanitizeInput = (req: any, res: any, next: any) => {
  // Basic input sanitization
  for (const key in req.body) {
    if (typeof req.body[key] === 'string') {
      // Remove potentially dangerous characters
      req.body[key] = req.body[key].replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
      req.body[key] = req.body[key].replace(/javascript:/gi, '');
    }
  }
  next();
};

// SQL injection protection (additional layer)
const sqlInjectionCheck = (req: any, res: any, next: any) => {
  const suspicious = ['union', 'select', 'insert', 'update', 'delete', 'drop', 'exec', 'script'];
  const checkString = (str: string) => suspicious.some(word =>
    str.toLowerCase().includes(word) && str.toLowerCase().includes('--')
  );

  for (const key in req.body) {
    if (typeof req.body[key] === 'string' && checkString(req.body[key])) {
      return res.status(400).json({ error: 'Invalid input detected' });
    }
  }
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP for easier development
    crossOriginEmbedderPolicy: false,
    hsts: false,
  }));

  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || false
      : true,
    credentials: true,
  }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 1000 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit auth attempts to 50 per 15 minutes
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  app.use("/api/auth", authLimiter);

  // Apply sanitization to POST/PUT routes
  app.use(['/api/projects', '/api/teams', '/api/templates', '/api/settings'], sanitizeInput);
  app.use(['/api/projects', '/api/files', '/api/ai'], sqlInjectionCheck);

  // Request logging middleware
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
    });
    next();
  });

  // Ensure demo user exists for backward compatibility
  let demoUser = await storage.getUserByEmail("demo@webide.dev");
  if (!demoUser) {
    const bcrypt = await import("bcrypt");
    const demoPasswordHash = await bcrypt.default.hash("demo", 10);
    demoUser = await storage.createUser({
      email: "demo@webide.dev",
      username: "demo",
      passwordHash: demoPasswordHash,
    });
  }

  // Mount modular routers
  app.use("/api/auth", authRouter);
  app.use("/api/teams", teamsRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/projects", filesRouter);
  app.use("/api/projects", gitRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api/deploy", deploymentsRouter);
  app.use("/api/templates", templatesRouter);
  app.use("/api/backup", backupsRouter);
  app.use("/api/metrics", metricsRouter);
  app.use("/api/settings", settingsRouter);

  // Preview route - proxy to sandbox dev server
  app.get("/preview/:projectId", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session || !session.userId) {
        return res.status(401).send("Unauthorized");
      }

      const project = await storage.getProject(req.params.projectId);
      if (!project || project.userId !== session.userId) {
        return res.status(403).send("Forbidden");
      }

      const sandbox = await storage.getSandboxByProjectId(req.params.projectId);

      if (!sandbox || !sandbox.port) {
        return res.status(503).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Preview Not Available</title>
              <style>
                body {
                  font-family: system-ui, -apple-system, sans-serif;
                  display: flex;
                  align-items: center;
                  justify-content: center;
                  height: 100vh;
                  margin: 0;
                  background: #1a1a1f;
                  color: #e5e7eb;
                }
                .container {
                  text-align: center;
                  max-width: 500px;
                  padding: 2rem;
                }
                h1 { color: #f59e0b; margin-bottom: 1rem; }
                p { color: #9ca3af; line-height: 1.6; }
                .icon { font-size: 4rem; margin-bottom: 1rem; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="icon">🚀</div>
                <h1>Preview Not Available</h1>
                <p>The development server is not running.</p>
                <p>Click the <strong>"Dev"</strong> button in the toolbar to start your app, then the preview will load automatically.</p>
              </div>
            </body>
          </html>
        `);
      }

      // Proxy to the container's port
      res.redirect(`http://localhost:${sandbox.port}`);
    } catch (error: any) {
      res.status(500).send(`Preview error: ${error.message}`);
    }
  });

  // Get sandbox status for a project
  app.get("/api/projects/:id/sandbox", async (req, res) => {
    try {
      const session = (req as any).session;
      if (!session || !session.userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const project = await storage.getProject(req.params.id);
      if (!project || project.userId !== session.userId) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const sandbox = await storage.getSandboxByProjectId(req.params.id);
      
      if (!sandbox) {
        return res.json(null);
      }

      res.json({
        id: sandbox.id,
        containerId: sandbox.containerId,
        port: sandbox.port,
        status: sandbox.containerId ? 'running' : 'stopped',
        createdAt: sandbox.createdAt,
        lastActivity: sandbox.lastActivity,
      });
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

      const result = await RunService.runCommand(req.user!.id, projectId, command);
      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error("Run error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // WebSocket server for terminal
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    const url = request.url || '';

    if (url.startsWith('/ws/terminal/')) {
      // Parse session to authenticate WebSocket connection
      const sessionParser = app.get('sessionParser');
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
    const sandboxes = await storage.getAllSandboxes();

    for (const sandbox of sandboxes) {
      const idleTime = now - sandbox.lastActivity.getTime();

      // Kill if idle > 60 seconds or runtime > 120 seconds
      const maxIdleTime = 60 * 1000;
      const maxRuntime = 120 * 1000;
      const runtime = now - sandbox.createdAt.getTime();

      if (idleTime > maxIdleTime || runtime > maxRuntime) {
        if (sandbox.containerId) {
          await dockerManager.stopAndReleaseContainer(sandbox.containerId, sandbox.port ?? undefined);
        }
        await storage.deleteSandbox(sandbox.id);
        console.log(`Cleaned up sandbox ${sandbox.id}`);
      }
    }
  }, 30000);

  return httpServer;
}
