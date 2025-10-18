import { eq, and, sql } from 'drizzle-orm';
import { db } from './db';
import {
  users,
  projects,
  files,
  sandboxes,
  aiInteractions,
  deployments,
  teams,
  teamMembers,
  userSettings,
  gitRepositories,
  gitCommits,
  resourceUsage,
  metrics,
  sharedTemplates,
  templateRatings,
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
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type UserSetting,
  type InsertUserSetting,
  type GitRepository,
  type InsertGitRepository,
  type GitCommit,
  type InsertGitCommit,
  type ResourceUsage,
  type InsertResourceUsage,
  type Metric,
  type InsertMetric,
  type SharedTemplate,
  type InsertSharedTemplate,
  type TemplateRating,
  type InsertTemplateRating,
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

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async getTeamsByUserId(userId: string): Promise<Team[]> {
    const result = await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        createdAt: teams.createdAt,
      })
      .from(teamMembers)
      .innerJoin(teams, eq(teamMembers.teamId, teams.id))
      .where(eq(teamMembers.userId, userId));
    return result;
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const result = await db.insert(teams).values(insertTeam).returning();
    return result[0];
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    const result = await db
      .update(teams)
      .set(data)
      .where(eq(teams.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Team not found');
    return result[0];
  }

  async deleteTeam(id: string): Promise<void> {
    await db.delete(teams).where(eq(teams.id, id));
  }

  // Team Members
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return db.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const result = await db.insert(teamMembers).values(insertMember).returning();
    return result[0];
  }

  async updateTeamMember(teamId: string, userId: string, role: string): Promise<TeamMember> {
    const result = await db
      .update(teamMembers)
      .set({ role })
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)))
      .returning();
    
    if (!result[0]) throw new Error('Team member not found');
    return result[0];
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    await db
      .delete(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSetting[]> {
    return db.select().from(userSettings).where(eq(userSettings.userId, userId));
  }

  async getUserSetting(userId: string, key: string): Promise<UserSetting | undefined> {
    const result = await db
      .select()
      .from(userSettings)
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)))
      .limit(1);
    return result[0];
  }

  async setUserSetting(userId: string, key: string, value: string | null): Promise<UserSetting> {
    const existing = await this.getUserSetting(userId, key);
    
    if (existing) {
      const result = await db
        .update(userSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(userSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db
        .insert(userSettings)
        .values({ userId, key, value })
        .returning();
      return result[0];
    }
  }

  async deleteUserSetting(userId: string, key: string): Promise<void> {
    await db
      .delete(userSettings)
      .where(and(eq(userSettings.userId, userId), eq(userSettings.key, key)));
  }

  // Git Repositories
  async getGitRepository(id: string): Promise<GitRepository | undefined> {
    const result = await db.select().from(gitRepositories).where(eq(gitRepositories.id, id)).limit(1);
    return result[0];
  }

  async getGitRepositoriesByProjectId(projectId: string): Promise<GitRepository[]> {
    return db.select().from(gitRepositories).where(eq(gitRepositories.projectId, projectId));
  }

  async createGitRepository(insertRepo: InsertGitRepository): Promise<GitRepository> {
    const result = await db.insert(gitRepositories).values(insertRepo).returning();
    return result[0];
  }

  async updateGitRepository(id: string, data: Partial<GitRepository>): Promise<GitRepository> {
    const result = await db
      .update(gitRepositories)
      .set(data)
      .where(eq(gitRepositories.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Git repository not found');
    return result[0];
  }

  async deleteGitRepository(id: string): Promise<void> {
    await db.delete(gitRepositories).where(eq(gitRepositories.id, id));
  }

  // Git Commits
  async createGitCommit(insertCommit: InsertGitCommit): Promise<GitCommit> {
    const result = await db.insert(gitCommits).values(insertCommit).returning();
    return result[0];
  }

  async getGitCommitsByRepositoryId(repositoryId: string): Promise<GitCommit[]> {
    return db
      .select()
      .from(gitCommits)
      .where(eq(gitCommits.repositoryId, repositoryId))
      .orderBy(gitCommits.createdAt);
  }

  // Resource Usage
  async createResourceUsage(insertUsage: InsertResourceUsage): Promise<ResourceUsage> {
    const result = await db.insert(resourceUsage).values(insertUsage).returning();
    return result[0];
  }

  async getResourceUsageByUserId(userId: string, limit = 100): Promise<ResourceUsage[]> {
    return db
      .select()
      .from(resourceUsage)
      .where(eq(resourceUsage.userId, userId))
      .orderBy(resourceUsage.createdAt)
      .limit(limit);
  }

  async getResourceUsageByProjectId(projectId: string): Promise<ResourceUsage[]> {
    return db
      .select()
      .from(resourceUsage)
      .where(eq(resourceUsage.projectId, projectId))
      .orderBy(resourceUsage.createdAt);
  }

  // Metrics
  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const result = await db.insert(metrics).values(insertMetric).returning();
    return result[0];
  }

  async getMetricsByType(metricType: string, limit = 50): Promise<Metric[]> {
    return db
      .select()
      .from(metrics)
      .where(eq(metrics.metricType, metricType))
      .orderBy(metrics.timestamp)
      .limit(limit);
  }

  async getLatestMetrics(): Promise<Metric[]> {
    // Get the latest metric for each type
    const result = await db.execute(sql`
      SELECT DISTINCT ON (metric_type) *
      FROM metrics
      ORDER BY metric_type, timestamp DESC
    `);
    return result.rows as Metric[];
  }

  // Shared Templates
  async getSharedTemplates(limit = 50): Promise<SharedTemplate[]> {
    return db
      .select()
      .from(sharedTemplates)
      .where(eq(sharedTemplates.isPublic, true))
      .orderBy(sharedTemplates.createdAt)
      .limit(limit);
  }

  async getSharedTemplate(id: string): Promise<SharedTemplate | undefined> {
    const result = await db.select().from(sharedTemplates).where(eq(sharedTemplates.id, id)).limit(1);
    return result[0];
  }

  async createSharedTemplate(insertTemplate: InsertSharedTemplate): Promise<SharedTemplate> {
    const result = await db.insert(sharedTemplates).values(insertTemplate).returning();
    return result[0];
  }

  async updateSharedTemplate(id: string, data: Partial<SharedTemplate>): Promise<SharedTemplate> {
    const result = await db
      .update(sharedTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(sharedTemplates.id, id))
      .returning();
    
    if (!result[0]) throw new Error('Shared template not found');
    return result[0];
  }

  async deleteSharedTemplate(id: string): Promise<void> {
    await db.delete(sharedTemplates).where(eq(sharedTemplates.id, id));
  }

  // Template Ratings
  async createTemplateRating(insertRating: InsertTemplateRating): Promise<TemplateRating> {
    const result = await db.insert(templateRatings).values(insertRating).returning();
    return result[0];
  }

  async getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
    return db
      .select()
      .from(templateRatings)
      .where(eq(templateRatings.templateId, templateId))
      .orderBy(templateRatings.createdAt);
  }
}

export const dbStorage = new DbStorage();
