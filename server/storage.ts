import {
  type User,
  type InsertUser,
  type Project,
  type InsertProject,
  type File,
  type InsertFile,
  type Sandbox,
  type InsertSandbox,
  type AiInteraction,
  type InsertAiInteraction,
  type Deployment,
  type InsertDeployment,
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Projects
  getProject(id: string): Promise<Project | undefined>;
  getProjectsByUserId(userId: string): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, data: Partial<Project>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Files
  getFile(id: string): Promise<File | undefined>;
  getFilesByProjectId(projectId: string): Promise<File[]>;
  getFileByPath(projectId: string, path: string): Promise<File | undefined>;
  createFile(file: InsertFile): Promise<File>;
  updateFile(id: string, content: string): Promise<File>;
  updateFileByPath(projectId: string, path: string, content: string): Promise<File>;
  deleteFile(id: string): Promise<void>;
  deleteFileByPath(projectId: string, path: string): Promise<void>;

  // Sandboxes
  getSandbox(id: string): Promise<Sandbox | undefined>;
  getSandboxByProjectId(projectId: string): Promise<Sandbox | undefined>;
  getSandboxByUserId(userId: string): Promise<Sandbox | undefined>;
  createSandbox(sandbox: InsertSandbox): Promise<Sandbox>;
  updateSandbox(id: string, data: Partial<Sandbox>): Promise<Sandbox>;
  deleteSandbox(id: string): Promise<void>;

  // AI Interactions
  createAiInteraction(interaction: InsertAiInteraction): Promise<AiInteraction>;
  getAiInteractionsByProjectId(projectId: string): Promise<AiInteraction[]>;

  // Deployments
  createDeployment(deployment: InsertDeployment): Promise<Deployment>;
  getDeploymentsByProjectId(projectId: string): Promise<Deployment[]>;
  updateDeployment(id: string, data: Partial<Deployment>): Promise<Deployment>;

  // Sandbox utilities
  getAllSandboxes(): Promise<Sandbox[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private projects: Map<string, Project>;
  private files: Map<string, File>;
  private sandboxes: Map<string, Sandbox>;
  private aiInteractions: Map<string, AiInteraction>;
  private deployments: Map<string, Deployment>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.sandboxes = new Map();
    this.aiInteractions = new Map();
    this.deployments = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      passwordHash: insertUser.passwordHash || null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return Array.from(this.projects.values()).filter((p) => p.userId === userId);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = randomUUID();
    const now = new Date();
    const project: Project = {
      ...insertProject,
      description: insertProject.description ?? null,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) throw new Error("Project not found");
    const updated = { ...project, ...data, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    // Also delete related files
    Array.from(this.files.entries())
      .filter(([, file]) => file.projectId === id)
      .forEach(([fileId]) => this.files.delete(fileId));
  }

  // Files
  async getFile(id: string): Promise<File | undefined> {
    return this.files.get(id);
  }

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    return Array.from(this.files.values()).filter((f) => f.projectId === projectId);
  }

  async getFileByPath(projectId: string, path: string): Promise<File | undefined> {
    return Array.from(this.files.values()).find(
      (f) => f.projectId === projectId && f.path === path
    );
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const id = randomUUID();
    const now = new Date();
    const file: File = {
      ...insertFile,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.files.set(id, file);
    return file;
  }

  async updateFile(id: string, content: string): Promise<File> {
    const file = this.files.get(id);
    if (!file) throw new Error("File not found");
    const updated = { ...file, content, updatedAt: new Date() };
    this.files.set(id, updated);
    return updated;
  }

  async updateFileByPath(projectId: string, path: string, content: string): Promise<File> {
    const file = await this.getFileByPath(projectId, path);
    if (!file) throw new Error("File not found");
    const updated = { ...file, content, updatedAt: new Date() };
    this.files.set(file.id, updated);
    return updated;
  }

  async deleteFile(id: string): Promise<void> {
    this.files.delete(id);
  }

  async deleteFileByPath(projectId: string, path: string): Promise<void> {
    const file = await this.getFileByPath(projectId, path);
    if (file) this.files.delete(file.id);
  }

  // Sandboxes
  async getSandbox(id: string): Promise<Sandbox | undefined> {
    return this.sandboxes.get(id);
  }

  async getSandboxByProjectId(projectId: string): Promise<Sandbox | undefined> {
    return Array.from(this.sandboxes.values()).find((s) => s.projectId === projectId);
  }

  async getSandboxByUserId(userId: string): Promise<Sandbox | undefined> {
    return Array.from(this.sandboxes.values()).find((s) => s.userId === userId);
  }

  async createSandbox(insertSandbox: InsertSandbox): Promise<Sandbox> {
    const id = randomUUID();
    const sandbox: Sandbox = {
      ...insertSandbox,
      containerId: insertSandbox.containerId ?? null,
      port: insertSandbox.port ?? null,
      lastActivity: insertSandbox.lastActivity ?? new Date(),
      id,
      createdAt: new Date(),
    };
    this.sandboxes.set(id, sandbox);
    return sandbox;
  }

  async updateSandbox(id: string, data: Partial<Sandbox>): Promise<Sandbox> {
    const sandbox = this.sandboxes.get(id);
    if (!sandbox) throw new Error("Sandbox not found");
    const updated = { ...sandbox, ...data };
    this.sandboxes.set(id, updated);
    return updated;
  }

  async deleteSandbox(id: string): Promise<void> {
    this.sandboxes.delete(id);
  }

  // AI Interactions
  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const id = randomUUID();
    const interaction: AiInteraction = {
      ...insertInteraction,
      projectId: insertInteraction.projectId ?? null,
      response: insertInteraction.response ?? null,
      filePath: insertInteraction.filePath ?? null,
      id,
      createdAt: new Date(),
    };
    this.aiInteractions.set(id, interaction);
    return interaction;
  }

  async getAiInteractionsByProjectId(projectId: string): Promise<AiInteraction[]> {
    return Array.from(this.aiInteractions.values()).filter(
      (i) => i.projectId === projectId
    );
  }

  // Deployments
  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const id = randomUUID();
    const deployment: Deployment = {
      ...insertDeployment,
      siteId: insertDeployment.siteId ?? null,
      deployUrl: insertDeployment.deployUrl ?? null,
      buildLog: insertDeployment.buildLog ?? null,
      id,
      createdAt: new Date(),
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async getDeploymentsByProjectId(projectId: string): Promise<Deployment[]> {
    return Array.from(this.deployments.values()).filter((d) => d.projectId === projectId);
  }

  async updateDeployment(id: string, data: Partial<Deployment>): Promise<Deployment> {
    const deployment = this.deployments.get(id);
    if (!deployment) throw new Error("Deployment not found");
    const updated = { ...deployment, ...data };
    this.deployments.set(id, updated);
    return updated;
  }

  async getAllSandboxes(): Promise<Sandbox[]> {
    return Array.from(this.sandboxes.values());
  }
}

export const storage = new MemStorage();
