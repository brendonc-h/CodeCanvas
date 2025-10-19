import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { dbStorage as storage } from "./db-storage";
import { dockerManager } from "./docker-manager";
import { aiClient } from "./ai-client";
import { gitManager } from "./git-manager";
import { metricsService } from "./metrics";
import { backupService } from "./backup";
import { netlifyDeploy } from "./netlify-deploy";
import { fileSync } from "./file-sync";
import { templateConfigs } from "@shared/schema";
import * as path from "path";

import { requireAuth, optionalAuth } from "./auth";
import bcrypt from "bcrypt";

// Security middleware
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";
import Joi from "joi";

// Input validation schemas
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
});

const projectSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  template: Joi.string().required(),
  teamId: Joi.string().uuid().optional(),
});

const teamSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
});

const gitCommitSchema = Joi.object({
  message: Joi.string().min(1).max(500).required(),
  files: Joi.array().items(Joi.string()).optional(),
});

const templateSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  description: Joi.string().max(500).optional(),
  template: Joi.string().required(),
  files: Joi.object().required(),
  tags: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().optional(),
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    } : false, // Disable CSP in development
    crossOriginEmbedderPolicy: false, // Disable COEP in development
    hsts: false, // Disable HSTS in development
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
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit auth attempts
    message: "Too many authentication attempts, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use(limiter);
  app.use("/api/auth", authLimiter);

  // Authentication routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { error, value } = userSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { email, username, password } = value;

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Create user in our database
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await storage.createUser({
        email,
        username,
        passwordHash,
      });

      res.json({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error: any) {
      console.error("Signup error:", error);
      res.status(500).json({ error: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      // Get user from database
      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Set session
      if (req.session) {
        req.session.userId = user.id;
      }

      res.json({ 
        success: true,
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
        }
      });
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ success: true });
      });
    } else {
      res.json({ success: true });
    }
  });

  app.get("/api/auth/me", requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

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

  // Apply sanitization to POST/PUT routes
  app.use(['/api/projects', '/api/teams', '/api/templates', '/api/settings'], sanitizeInput);

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

  // Helper function to check project access (user ownership or team membership)
  async function checkProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const project = await storage.getProject(projectId);
    if (!project) return false;

    // Direct ownership
    if (project.userId === userId) return true;

    // Team membership
    if (project.teamId) {
      const members = await storage.getTeamMembers(project.teamId);
      return members.some(m => m.userId === userId);
    }

    return false;
  }

  // Team routes
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const teams = await storage.getTeamsByUserId(req.user!.id);
      res.json(teams);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const { name, description } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Team name required" });
      }

      const team = await storage.createTeam({
        name,
        description,
      });

      // Add creator as admin
      await storage.addTeamMember({
        teamId: team.id,
        userId: req.user!.id,
        role: "admin",
      });

      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is a member
      const members = await storage.getTeamMembers(team.id);
      const isMember = members.some(m => m.userId === req.user!.id);
      if (!isMember) {
        return res.status(403).json({ error: "Not a team member" });
      }

      res.json(team);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is admin
      const members = await storage.getTeamMembers(team.id);
      const member = members.find(m => m.userId === req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const updatedTeam = await storage.updateTeam(req.params.id, req.body);
      res.json(updatedTeam);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is admin
      const members = await storage.getTeamMembers(team.id);
      const member = members.find(m => m.userId === req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.deleteTeam(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Team member routes
  app.get("/api/teams/:id/members", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is a member
      const members = await storage.getTeamMembers(team.id);
      const isMember = members.some(m => m.userId === req.user!.id);
      if (!isMember) {
        return res.status(403).json({ error: "Not a team member" });
      }

      res.json(members);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/teams/:id/members", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is admin
      const members = await storage.getTeamMembers(team.id);
      const member = members.find(m => m.userId === req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId, role = "member" } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const newMember = await storage.addTeamMember({
        teamId: req.params.id,
        userId,
        role,
      });

      res.json(newMember);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/teams/:id/members/:userId", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is admin
      const members = await storage.getTeamMembers(team.id);
      const member = members.find(m => m.userId === req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { role } = req.body;
      if (!role) {
        return res.status(400).json({ error: "Role required" });
      }

      const updatedMember = await storage.updateTeamMember(req.params.id, req.params.userId, role);
      res.json(updatedMember);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/teams/:id/members/:userId", requireAuth, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found" });
      }

      // Check if user is admin
      const members = await storage.getTeamMembers(team.id);
      const member = members.find(m => m.userId === req.user!.id);
      if (!member || member.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }

      await storage.removeTeamMember(req.params.id, req.params.userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // User Settings routes
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      const settings = await storage.getUserSettings(req.user!.id);
      res.json(settings);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      if (!key) {
        return res.status(400).json({ error: "Setting key required" });
      }

      const setting = await storage.setUserSetting(req.user!.id, key, value);
      res.json(setting);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/settings/:key", requireAuth, async (req, res) => {
    try {
      await storage.deleteUserSetting(req.user!.id, req.params.key);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Models route
  app.get("/api/ai/models", requireAuth, async (req, res) => {
    try {
      const { provider } = req.query;
      if (!provider || typeof provider !== 'string') {
        return res.status(400).json({ error: "Provider required" });
      }

      const models = await aiClient.listModels(provider, req.user!.id);
      res.json({ models });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // AI Health check route
  app.get("/api/ai/health", requireAuth, async (req, res) => {
    try {
      const { provider } = req.query;
      if (!provider || typeof provider !== 'string') {
        return res.status(400).json({ error: "Provider required" });
      }

      const healthy = await aiClient.checkProviderHealth(provider, req.user!.id);
      res.json({ healthy });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Metrics routes
  app.get("/api/metrics", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getLatestMetrics();
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/metrics/:type", requireAuth, async (req, res) => {
    try {
      const metrics = await storage.getMetricsByType(req.params.type);
      res.json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/user/resource-usage", requireAuth, async (req, res) => {
    try {
      const summary = await metricsService.getUserResourceSummary(req.user!.id);
      const usage = await storage.getResourceUsageByUserId(req.user!.id);
      res.json({ summary, usage });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/resource-usage", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const usage = await storage.getResourceUsageByProjectId(req.params.id);
      res.json(usage);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Template sharing routes
  app.get("/api/templates", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const templates = await storage.getSharedTemplates(limit);
      res.json(templates);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/templates/:id", async (req, res) => {
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

  app.post("/api/templates", requireAuth, async (req, res) => {
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

  app.put("/api/templates/:id", requireAuth, async (req, res) => {
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

  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
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

  app.post("/api/templates/:id/rate", requireAuth, async (req, res) => {
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

  app.get("/api/templates/:id/ratings", async (req, res) => {
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

  app.post("/api/templates/:id/use", requireAuth, async (req, res) => {
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

  // Backup routes
  app.post("/api/backup", requireAuth, async (req, res) => {
    try {
      const { projectId } = req.body;
      const backupId = await backupService.createBackup(req.user!.id, projectId);
      res.json({ backupId });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/backups", requireAuth, async (req, res) => {
    try {
      const backups = await backupService.listBackups(req.user!.id);
      res.json(backups);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/backup/:backupId/restore", requireAuth, async (req, res) => {
    try {
      if (!req.params.backupId.startsWith(`${req.user!.id}_`)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await backupService.restoreBackup(req.user!.id, req.params.backupId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/backup/:backupId", requireAuth, async (req, res) => {
    try {
      if (!req.params.backupId.startsWith(`${req.user!.id}_`)) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await backupService.deleteBackup(req.user!.id, req.params.backupId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Git routes
  app.get("/api/projects/:id/git", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const repos = await storage.getGitRepositoriesByProjectId(req.params.id);
      res.json(repos);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/git/init", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      await gitManager.initRepository(req.params.id);

      // Create repository record
      const repo = await storage.createGitRepository({
        projectId: req.params.id,
        name: `${project.name}-repo`,
        provider: 'local',
      });

      res.json(repo);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/git/commit", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { message, files = ['.'] } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Commit message required" });
      }

      await gitManager.addFiles(req.params.id, files);
      const result = await gitManager.commit(req.params.id, message);

      // Store commit record
      const repos = await storage.getGitRepositoriesByProjectId(req.params.id);
      if (repos.length > 0) {
        await storage.createGitCommit({
          repositoryId: repos[0].id,
          userId: req.user!.id,
          sha: result.split(' ')[0], // Extract commit hash
          message,
          author: req.user!.username,
        });
      }

      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/git/status", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const status = await gitManager.getStatus(req.params.id);
      res.json({ status });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/git/log", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const log = await gitManager.getLog(req.params.id);
      res.json({ log });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/projects/:id/git/branches", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const branches = await gitManager.getBranches(req.params.id);
      const current = await gitManager.getCurrentBranch(req.params.id);
      res.json({ branches, current });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/git/branch", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Branch name required" });
      }

      await gitManager.createBranch(req.params.id, name);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/projects/:id/git/checkout", requireAuth, async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !(await checkProjectAccess(req.params.id, req.user!.id))) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const { branch } = req.body;
      if (!branch) {
        return res.status(400).json({ error: "Branch name required" });
      }

      await gitManager.switchBranch(req.params.id, branch);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
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
      const { error, value } = projectSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const { name, template, teamId } = value;
      
      if (!name || !template) {
        return res.status(400).json({ error: "Name and template required" });
      }

      const templateConfig = templateConfigs[template as keyof typeof templateConfigs];
      if (!templateConfig) {
        return res.status(400).json({ error: "Invalid template" });
      }

      // If teamId provided, check if user is a member
      let projectTeamId = null;
      if (teamId) {
        const team = await storage.getTeam(teamId);
        if (!team) {
          return res.status(400).json({ error: "Team not found" });
        }
        const members = await storage.getTeamMembers(teamId);
        const isMember = members.some(m => m.userId === req.user!.id);
        if (!isMember) {
          return res.status(403).json({ error: "Not a team member" });
        }
        projectTeamId = teamId;
      }

      const project = await storage.createProject({
        userId: req.user!.id,
        teamId: projectTeamId,
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
      const { provider = 'ollama', model, prompt, projectId, filePath, apiKey } = req.body;

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

  // Get deployment history for a project
  app.get("/api/projects/:id/deployments", requireAuth, async (req, res) => {
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
  app.post("/api/deploy/rollback", requireAuth, async (req, res) => {
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

      // Trigger a redeploy using the same siteId (this will rollback to current state)
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
