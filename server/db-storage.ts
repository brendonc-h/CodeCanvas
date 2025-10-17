import { eq, and } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  projects,
  files,
  sandboxes,
  aiInteractions,
  deployments,
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
} from '@shared/schema';
import type { IStorage } from './storage';

export class DbStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Projects
  async getProject(id: string): Promise<Project | undefined> {
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
  }

  async getProjectsByUserId(userId: string): Promise<Project[]> {
    return db.select().from(projects).where(eq(projects.userId, userId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const result = await db.insert(projects).values(insertProject).returning();
    return result[0];
  }

  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const result = await db
      .update(projects)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Project not found');
    return result[0];
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Files
  async getFile(id: string): Promise<File | undefined> {
    const result = await db.select().from(files).where(eq(files.id, id)).limit(1);
    return result[0];
  }

  async getFilesByProjectId(projectId: string): Promise<File[]> {
    return db.select().from(files).where(eq(files.projectId, projectId));
  }

  async getFileByPath(projectId: string, path: string): Promise<File | undefined> {
    const result = await db
      .select()
      .from(files)
      .where(and(eq(files.projectId, projectId), eq(files.path, path)))
      .limit(1);
    return result[0];
  }

  async createFile(insertFile: InsertFile): Promise<File> {
    const result = await db.insert(files).values(insertFile).returning();
    return result[0];
  }

  async updateFile(id: string, content: string): Promise<File> {
    const result = await db
      .update(files)
      .set({ content, updatedAt: new Date() })
      .where(eq(files.id, id))
      .returning();
    
    if (!result[0]) throw new Error('File not found');
    return result[0];
  }

  async updateFileByPath(projectId: string, path: string, content: string): Promise<File> {
    const result = await db
      .update(files)
      .set({ content, updatedAt: new Date() })
      .where(and(eq(files.projectId, projectId), eq(files.path, path)))
      .returning();
    
    if (!result[0]) throw new Error('File not found');
    return result[0];
  }

  async deleteFile(id: string): Promise<void> {
    await db.delete(files).where(eq(files.id, id));
  }

  async deleteFileByPath(projectId: string, path: string): Promise<void> {
    await db.delete(files).where(and(eq(files.projectId, projectId), eq(files.path, path)));
  }

  // Sandboxes
  async getSandbox(id: string): Promise<Sandbox | undefined> {
    const result = await db.select().from(sandboxes).where(eq(sandboxes.id, id)).limit(1);
    return result[0];
  }

  async getSandboxByProjectId(projectId: string): Promise<Sandbox | undefined> {
    const result = await db
      .select()
      .from(sandboxes)
      .where(eq(sandboxes.projectId, projectId))
      .limit(1);
    return result[0];
  }

  async getSandboxByUserId(userId: string): Promise<Sandbox | undefined> {
    const result = await db
      .select()
      .from(sandboxes)
      .where(eq(sandboxes.userId, userId))
      .limit(1);
    return result[0];
  }

  async createSandbox(insertSandbox: InsertSandbox): Promise<Sandbox> {
    const result = await db.insert(sandboxes).values(insertSandbox).returning();
    return result[0];
  }

  async updateSandbox(id: string, data: Partial<Sandbox>): Promise<Sandbox> {
    const result = await db
      .update(sandboxes)
      .set(data)
      .where(eq(sandboxes.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Sandbox not found');
    return result[0];
  }

  async deleteSandbox(id: string): Promise<void> {
    await db.delete(sandboxes).where(eq(sandboxes.id, id));
  }

  async getAllSandboxes(): Promise<Sandbox[]> {
    return db.select().from(sandboxes);
  }

  // AI Interactions
  async createAiInteraction(insertInteraction: InsertAiInteraction): Promise<AiInteraction> {
    const result = await db.insert(aiInteractions).values(insertInteraction).returning();
    return result[0];
  }

  async getAiInteractionsByProjectId(projectId: string): Promise<AiInteraction[]> {
    return db.select().from(aiInteractions).where(eq(aiInteractions.projectId, projectId));
  }

  // Deployments
  async createDeployment(insertDeployment: InsertDeployment): Promise<Deployment> {
    const result = await db.insert(deployments).values(insertDeployment).returning();
    return result[0];
  }

  async getDeploymentsByProjectId(projectId: string): Promise<Deployment[]> {
    return db
      .select()
      .from(deployments)
      .where(eq(deployments.projectId, projectId))
      .orderBy(deployments.createdAt);
  }

  async getDeployment(id: string): Promise<Deployment | null> {
    const result = await db.select().from(deployments).where(eq(deployments.id, id));
    return result[0] || null;
  }

  async updateDeployment(id: string, data: Partial<Deployment>): Promise<Deployment> {
    const result = await db
      .update(deployments)
      .set(data)
      .where(eq(deployments.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Deployment not found');
    return result[0];
  }
}

export const dbStorage = new DbStorage();
