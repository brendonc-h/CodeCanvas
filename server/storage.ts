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
  getDeployment(id: string): Promise<Deployment | null>;
  getDeploymentsByProjectId(projectId: string): Promise<Deployment[]>;
  updateDeployment(id: string, data: Partial<Deployment>): Promise<Deployment>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByUserId(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team>;
  deleteTeam(id: string): Promise<void>;

  // Team Members
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(teamId: string, userId: string, role: string): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;

  // User Settings
  getUserSettings(userId: string): Promise<UserSetting[]>;
  getUserSetting(userId: string, key: string): Promise<UserSetting | undefined>;
  setUserSetting(userId: string, key: string, value: string | null): Promise<UserSetting>;
  deleteUserSetting(userId: string, key: string): Promise<void>;

  // Git Repositories
  getGitRepository(id: string): Promise<GitRepository | undefined>;
  getGitRepositoriesByProjectId(projectId: string): Promise<GitRepository[]>;
  createGitRepository(repo: InsertGitRepository): Promise<GitRepository>;
  updateGitRepository(id: string, data: Partial<GitRepository>): Promise<GitRepository>;
  deleteGitRepository(id: string): Promise<void>;

  // Git Commits
  createGitCommit(commit: InsertGitCommit): Promise<GitCommit>;
  getGitCommitsByRepositoryId(repositoryId: string): Promise<GitCommit[]>;

  // Resource Usage
  createResourceUsage(usage: InsertResourceUsage): Promise<ResourceUsage>;
  getResourceUsageByUserId(userId: string, limit?: number): Promise<ResourceUsage[]>;
  getResourceUsageByProjectId(projectId: string): Promise<ResourceUsage[]>;

  // Metrics
  createMetric(metric: InsertMetric): Promise<Metric>;
  getMetricsByType(metricType: string, limit?: number): Promise<Metric[]>;
  getLatestMetrics(): Promise<Metric[]>;

  // Shared Templates
  getSharedTemplates(limit?: number): Promise<SharedTemplate[]>;
  getSharedTemplate(id: string): Promise<SharedTemplate | undefined>;
  createSharedTemplate(template: InsertSharedTemplate): Promise<SharedTemplate>;
  updateSharedTemplate(id: string, data: Partial<SharedTemplate>): Promise<SharedTemplate>;
  deleteSharedTemplate(id: string): Promise<void>;

  // Template Ratings
  createTemplateRating(rating: InsertTemplateRating): Promise<TemplateRating>;
  getTemplateRatings(templateId: string): Promise<TemplateRating[]>;

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
  private teams: Map<string, Team>;
  private teamMembers: Map<string, TeamMember>;
  private userSettings: Map<string, UserSetting>;
  private gitRepositories: Map<string, GitRepository>;
  private gitCommits: Map<string, GitCommit>;
  private resourceUsage: Map<string, ResourceUsage>;
  private metrics: Map<string, Metric>;
  private sharedTemplates: Map<string, SharedTemplate>;
  private templateRatings: Map<string, TemplateRating>;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.files = new Map();
    this.sandboxes = new Map();
    this.aiInteractions = new Map();
    this.deployments = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.userSettings = new Map();
    this.gitRepositories = new Map();
    this.gitCommits = new Map();
    this.resourceUsage = new Map();
    this.metrics = new Map();
    this.sharedTemplates = new Map();
    this.templateRatings = new Map();
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
      teamId: insertProject.teamId ?? null,
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
      fileSnapshot: insertDeployment.fileSnapshot ?? null,
      id,
      createdAt: new Date(),
    };
    this.deployments.set(id, deployment);
    return deployment;
  }

  async getDeployment(id: string): Promise<Deployment | null> {
    return this.deployments.get(id) || null;
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

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    return this.teams.get(id);
  }

  async getTeamsByUserId(userId: string): Promise<Team[]> {
    const memberTeams = Array.from(this.teamMembers.values())
      .filter((member) => member.userId === userId)
      .map((member) => member.teamId);
    return Array.from(this.teams.values())
      .filter((team) => memberTeams.includes(team.id));
  }

  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = randomUUID();
    const team: Team = {
      ...insertTeam,
      description: insertTeam.description ?? null,
      id,
      createdAt: new Date(),
    };
    this.teams.set(id, team);
    return team;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team> {
    const team = this.teams.get(id);
    if (!team) throw new Error("Team not found");
    const updated = { ...team, ...data };
    this.teams.set(id, updated);
    return updated;
  }

  async deleteTeam(id: string): Promise<void> {
    this.teams.delete(id);
    // Also delete related team members
    Array.from(this.teamMembers.entries())
      .filter(([, member]) => member.teamId === id)
      .forEach(([memberId]) => this.teamMembers.delete(memberId));
  }

  // Team Members
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values()).filter((member) => member.teamId === teamId);
  }

  async addTeamMember(insertMember: InsertTeamMember): Promise<TeamMember> {
    const id = randomUUID();
    const member: TeamMember = {
      ...insertMember,
      id,
      createdAt: new Date(),
    };
    this.teamMembers.set(id, member);
    return member;
  }

  async updateTeamMember(teamId: string, userId: string, role: string): Promise<TeamMember> {
    const member = Array.from(this.teamMembers.values()).find(
      (m) => m.teamId === teamId && m.userId === userId
    );
    if (!member) throw new Error("Team member not found");
    const updated = { ...member, role };
    this.teamMembers.set(member.id, updated);
    return updated;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const member = Array.from(this.teamMembers.values()).find(
      (m) => m.teamId === teamId && m.userId === userId
    );
    if (member) this.teamMembers.delete(member.id);
  }

  // User Settings
  async getUserSettings(userId: string): Promise<UserSetting[]> {
    return Array.from(this.userSettings.values()).filter((setting) => setting.userId === userId);
  }

  async getUserSetting(userId: string, key: string): Promise<UserSetting | undefined> {
    return Array.from(this.userSettings.values()).find(
      (setting) => setting.userId === userId && setting.key === key
    );
  }

  async setUserSetting(userId: string, key: string, value: string | null): Promise<UserSetting> {
    const existing = await this.getUserSetting(userId, key);
    
    if (existing) {
      const updated = { ...existing, value, updatedAt: new Date() };
      this.userSettings.set(existing.id, updated);
      return updated;
    } else {
      const id = randomUUID();
      const setting: UserSetting = {
        id,
        userId,
        key,
        value,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.userSettings.set(id, setting);
      return setting;
    }
  }

  async deleteUserSetting(userId: string, key: string): Promise<void> {
    const setting = await this.getUserSetting(userId, key);
    if (setting) this.userSettings.delete(setting.id);
  }

  // Git Repositories
  async getGitRepository(id: string): Promise<GitRepository | undefined> {
    return this.gitRepositories.get(id);
  }

  async getGitRepositoriesByProjectId(projectId: string): Promise<GitRepository[]> {
    return Array.from(this.gitRepositories.values()).filter((repo) => repo.projectId === projectId);
  }

  async createGitRepository(insertRepo: InsertGitRepository): Promise<GitRepository> {
    const id = randomUUID();
    const repo: GitRepository = {
      ...insertRepo,
      url: insertRepo.url ?? null,
      owner: insertRepo.owner ?? null,
      repo: insertRepo.repo ?? null,
      branch: insertRepo.branch ?? "main",
      isConnected: insertRepo.isConnected ?? false,
      lastSync: insertRepo.lastSync ?? null,
      id,
      createdAt: new Date(),
    };
    this.gitRepositories.set(id, repo);
    return repo;
  }

  async updateGitRepository(id: string, data: Partial<GitRepository>): Promise<GitRepository> {
    const repo = this.gitRepositories.get(id);
    if (!repo) throw new Error("Git repository not found");
    const updated = { ...repo, ...data };
    this.gitRepositories.set(id, updated);
    return updated;
  }

  async deleteGitRepository(id: string): Promise<void> {
    this.gitRepositories.delete(id);
    // Also delete related commits
    Array.from(this.gitCommits.entries())
      .filter(([, commit]) => commit.repositoryId === id)
      .forEach(([commitId]) => this.gitCommits.delete(commitId));
  }

  // Git Commits
  async createGitCommit(insertCommit: InsertGitCommit): Promise<GitCommit> {
    const id = randomUUID();
    const commit: GitCommit = {
      ...insertCommit,
      id,
      createdAt: new Date(),
    };
    this.gitCommits.set(id, commit);
    return commit;
  }

  async getGitCommitsByRepositoryId(repositoryId: string): Promise<GitCommit[]> {
    return Array.from(this.gitCommits.values())
      .filter((commit) => commit.repositoryId === repositoryId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Resource Usage
  async createResourceUsage(insertUsage: InsertResourceUsage): Promise<ResourceUsage> {
    const id = randomUUID();
    const usage: ResourceUsage = {
      ...insertUsage,
      projectId: insertUsage.projectId ?? null,
      id,
      createdAt: new Date(),
    };
    this.resourceUsage.set(id, usage);
    return usage;
  }

  async getResourceUsageByUserId(userId: string, limit = 100): Promise<ResourceUsage[]> {
    return Array.from(this.resourceUsage.values())
      .filter((usage) => usage.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getResourceUsageByProjectId(projectId: string): Promise<ResourceUsage[]> {
    return Array.from(this.resourceUsage.values())
      .filter((usage) => usage.projectId === projectId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  // Metrics
  async createMetric(insertMetric: InsertMetric): Promise<Metric> {
    const id = randomUUID();
    const metric: Metric = {
      ...insertMetric,
      id,
      timestamp: new Date(),
    };
    this.metrics.set(id, metric);
    return metric;
  }

  async getMetricsByType(metricType: string, limit = 50): Promise<Metric[]> {
    return Array.from(this.metrics.values())
      .filter((metric) => metric.metricType === metricType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async getLatestMetrics(): Promise<Metric[]> {
    const metricTypes = new Set(Array.from(this.metrics.values()).map(m => m.metricType));
    const latest: Metric[] = [];

    for (const type of Array.from(metricTypes)) {
      const typeMetrics = Array.from(this.metrics.values())
        .filter(m => m.metricType === type)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      if (typeMetrics.length > 0) {
        latest.push(typeMetrics[0]);
      }
    }

    return latest;
  }

  // Shared Templates
  async getSharedTemplates(limit = 50): Promise<SharedTemplate[]> {
    return Array.from(this.sharedTemplates.values())
      .filter(template => template.isPublic)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async getSharedTemplate(id: string): Promise<SharedTemplate | undefined> {
    return this.sharedTemplates.get(id);
  }

  async createSharedTemplate(insertTemplate: InsertSharedTemplate): Promise<SharedTemplate> {
    const id = randomUUID();
    const template: SharedTemplate = {
      ...insertTemplate,
      description: insertTemplate.description ?? null,
      tags: insertTemplate.tags ?? null,
      downloads: insertTemplate.downloads ?? 0,
      rating: insertTemplate.rating ?? 0,
      isPublic: insertTemplate.isPublic ?? true,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.sharedTemplates.set(id, template);
    return template;
  }

  async updateSharedTemplate(id: string, data: Partial<SharedTemplate>): Promise<SharedTemplate> {
    const template = this.sharedTemplates.get(id);
    if (!template) throw new Error("Shared template not found");
    const updated = { ...template, ...data, updatedAt: new Date() };
    this.sharedTemplates.set(id, updated);
    return updated;
  }

  async deleteSharedTemplate(id: string): Promise<void> {
    this.sharedTemplates.delete(id);
    // Also delete related ratings
    Array.from(this.templateRatings.entries())
      .filter(([, rating]) => rating.templateId === id)
      .forEach(([ratingId]) => this.templateRatings.delete(ratingId));
  }

  // Template Ratings
  async createTemplateRating(insertRating: InsertTemplateRating): Promise<TemplateRating> {
    const id = randomUUID();
    const rating: TemplateRating = {
      ...insertRating,
      review: insertRating.review ?? null,
      id,
      createdAt: new Date(),
    };
    this.templateRatings.set(id, rating);
    return rating;
  }

  async getTemplateRatings(templateId: string): Promise<TemplateRating[]> {
    return Array.from(this.templateRatings.values())
      .filter(rating => rating.templateId === templateId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAllSandboxes(): Promise<Sandbox[]> {
    return Array.from(this.sandboxes.values());
  }
}

export const storage = new MemStorage();
