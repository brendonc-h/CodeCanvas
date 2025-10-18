import { dbStorage } from './db-storage';

export class MetricsService {
  // Track resource usage
  async trackResourceUsage(userId: string, resourceType: string, amount: number, unit: string, projectId?: string) {
    await dbStorage.createResourceUsage({
      userId,
      projectId: projectId || null,
      resourceType,
      amount,
      unit,
    });
  }

  // Track AI usage
  async trackAIUsage(userId: string, model: string, tokensUsed: number, projectId?: string) {
    await this.trackResourceUsage(userId, 'ai_tokens', tokensUsed, 'tokens', projectId);
  }

  // Track sandbox usage
  async trackSandboxUsage(userId: string, durationSeconds: number, projectId?: string) {
    await this.trackResourceUsage(userId, 'sandbox_time', durationSeconds, 'seconds', projectId);
  }

  // Update metrics dashboard
  async updateMetrics() {
    // Count active users (users with activity in last 24 hours)
    const activeUsers = await this.getActiveUsersCount();
    await dbStorage.createMetric({
      metricType: 'active_users',
      value: activeUsers,
    });

    // Count total projects
    const totalProjects = await this.getTotalProjectsCount();
    await dbStorage.createMetric({
      metricType: 'total_projects',
      value: totalProjects,
    });

    // Count AI requests today
    const aiRequestsToday = await this.getAIRequestsTodayCount();
    await dbStorage.createMetric({
      metricType: 'ai_requests_today',
      value: aiRequestsToday,
    });

    // Count deployments today
    const deploymentsToday = await this.getDeploymentsTodayCount();
    await dbStorage.createMetric({
      metricType: 'deployments_today',
      value: deploymentsToday,
    });
  }

  // Helper methods for metrics
  private async getActiveUsersCount(): Promise<number> {
    // In a real implementation, you'd query for users with recent activity
    // For now, return a mock count
    return 42; // Mock data
  }

  private async getTotalProjectsCount(): Promise<number> {
    // In a real implementation, you'd count projects
    return 156; // Mock data
  }

  private async getAIRequestsTodayCount(): Promise<number> {
    // In a real implementation, you'd count AI interactions today
    return 89; // Mock data
  }

  private async getDeploymentsTodayCount(): Promise<number> {
    // In a real implementation, you'd count deployments today
    return 23; // Mock data
  }

  // Get user resource usage summary
  async getUserResourceSummary(userId: string) {
    const usage = await dbStorage.getResourceUsageByUserId(userId);

    const summary = {
      totalAITokens: 0,
      totalSandboxTime: 0,
      totalMemoryUsed: 0,
      totalDeployments: 0,
    };

    for (const item of usage) {
      switch (item.resourceType) {
        case 'ai_tokens':
          summary.totalAITokens += item.amount;
          break;
        case 'sandbox_time':
          summary.totalSandboxTime += item.amount;
          break;
        case 'memory':
          summary.totalMemoryUsed += item.amount;
          break;
        case 'deployments':
          summary.totalDeployments += item.amount;
          break;
      }
    }

    return summary;
  }
}

export const metricsService = new MetricsService();
