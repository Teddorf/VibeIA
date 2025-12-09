import { Injectable, Logger } from '@nestjs/common';
import {
  UsageRecord,
  UsageType,
  UsageSummary,
  RecordUsageDto,
  PLAN_DEFINITIONS,
  SubscriptionPlan,
} from './dto/billing.dto';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);
  private usageRecords: Map<string, UsageRecord> = new Map();

  constructor(private readonly subscriptionService: SubscriptionService) {}

  async recordUsage(dto: RecordUsageDto): Promise<UsageRecord> {
    const period = this.getCurrentPeriod();
    const recordId = this.getRecordId(dto.userId, dto.type, period);

    let record = this.usageRecords.get(recordId);

    if (!record) {
      record = {
        id: recordId,
        userId: dto.userId,
        type: dto.type,
        count: 0,
        period,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.usageRecords.set(recordId, record);
    }

    record.count += dto.count || 1;
    record.updatedAt = new Date();

    this.logger.debug(`Recorded usage for ${dto.userId}: ${dto.type} = ${record.count}`);

    return record;
  }

  async getUsage(userId: string, type: UsageType, period?: string): Promise<number> {
    const targetPeriod = period || this.getCurrentPeriod();
    const recordId = this.getRecordId(userId, type, targetPeriod);
    const record = this.usageRecords.get(recordId);
    return record?.count || 0;
  }

  async getUsageSummary(userId: string, period?: string): Promise<UsageSummary> {
    const targetPeriod = period || this.getCurrentPeriod();
    const subscription = await this.subscriptionService.getSubscriptionByUserId(userId);
    const plan = subscription
      ? PLAN_DEFINITIONS[subscription.plan]
      : PLAN_DEFINITIONS[SubscriptionPlan.FREE];

    const tasksUsed = await this.getUsage(userId, UsageType.TASKS, targetPeriod);
    const plansUsed = await this.getUsage(userId, UsageType.PLANS, targetPeriod);
    const projectsUsed = await this.getUsage(userId, UsageType.PROJECTS, targetPeriod);
    const apiCallsUsed = await this.getUsage(userId, UsageType.API_CALLS, targetPeriod);

    return {
      userId,
      period: targetPeriod,
      tasks: this.calculateUsageMetric(tasksUsed, plan.limits.maxTasks),
      plans: this.calculateUsageMetric(plansUsed, plan.limits.maxPlans),
      projects: this.calculateUsageMetric(projectsUsed, plan.limits.maxProjects),
      apiCalls: this.calculateUsageMetric(apiCallsUsed, 10000), // Default API limit
    };
  }

  async checkLimit(userId: string, type: UsageType): Promise<{
    allowed: boolean;
    used: number;
    limit: number;
    remaining: number;
  }> {
    const subscription = await this.subscriptionService.getSubscriptionByUserId(userId);
    const plan = subscription
      ? PLAN_DEFINITIONS[subscription.plan]
      : PLAN_DEFINITIONS[SubscriptionPlan.FREE];

    const used = await this.getUsage(userId, type);
    let limit: number;

    switch (type) {
      case UsageType.TASKS:
        limit = plan.limits.maxTasks;
        break;
      case UsageType.PLANS:
        limit = plan.limits.maxPlans;
        break;
      case UsageType.PROJECTS:
        limit = plan.limits.maxProjects;
        break;
      default:
        limit = -1;
    }

    // -1 means unlimited
    if (limit === -1) {
      return { allowed: true, used, limit: -1, remaining: -1 };
    }

    const remaining = Math.max(0, limit - used);
    const allowed = used < limit;

    return { allowed, used, limit, remaining };
  }

  async incrementTask(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const check = await this.checkLimit(userId, UsageType.TASKS);
    if (!check.allowed) {
      this.logger.warn(`User ${userId} has reached task limit`);
      return { allowed: false, remaining: 0 };
    }

    await this.recordUsage({ userId, type: UsageType.TASKS });
    return { allowed: true, remaining: check.remaining - 1 };
  }

  async incrementPlan(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const check = await this.checkLimit(userId, UsageType.PLANS);
    if (!check.allowed) {
      this.logger.warn(`User ${userId} has reached plan limit`);
      return { allowed: false, remaining: 0 };
    }

    await this.recordUsage({ userId, type: UsageType.PLANS });
    return { allowed: true, remaining: check.remaining - 1 };
  }

  async incrementProject(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const check = await this.checkLimit(userId, UsageType.PROJECTS);
    if (!check.allowed) {
      this.logger.warn(`User ${userId} has reached project limit`);
      return { allowed: false, remaining: 0 };
    }

    await this.recordUsage({ userId, type: UsageType.PROJECTS });
    return { allowed: true, remaining: check.remaining - 1 };
  }

  async getUsageHistory(
    userId: string,
    type: UsageType,
    months = 6,
  ): Promise<{ period: string; count: number }[]> {
    const history: { period: string; count: number }[] = [];
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = this.formatPeriod(date);
      const count = await this.getUsage(userId, type, period);
      history.push({ period, count });
    }

    return history.reverse();
  }

  async resetUsage(userId: string, period?: string): Promise<void> {
    const targetPeriod = period || this.getCurrentPeriod();
    const types = Object.values(UsageType);

    for (const type of types) {
      const recordId = this.getRecordId(userId, type, targetPeriod);
      this.usageRecords.delete(recordId);
    }

    this.logger.log(`Reset usage for user ${userId} in period ${targetPeriod}`);
  }

  async getTopUsers(
    type: UsageType,
    limit = 10,
    period?: string,
  ): Promise<{ userId: string; count: number }[]> {
    const targetPeriod = period || this.getCurrentPeriod();
    const userUsage: Map<string, number> = new Map();

    this.usageRecords.forEach((record) => {
      if (record.type === type && record.period === targetPeriod) {
        userUsage.set(record.userId, record.count);
      }
    });

    return Array.from(userUsage.entries())
      .map(([userId, count]) => ({ userId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }

  async getTotalUsage(type: UsageType, period?: string): Promise<number> {
    const targetPeriod = period || this.getCurrentPeriod();
    let total = 0;

    this.usageRecords.forEach((record) => {
      if (record.type === type && record.period === targetPeriod) {
        total += record.count;
      }
    });

    return total;
  }

  private calculateUsageMetric(
    used: number,
    limit: number,
  ): { used: number; limit: number; percentage: number } {
    if (limit === -1) {
      return { used, limit: -1, percentage: 0 };
    }
    const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
    return { used, limit, percentage };
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return this.formatPeriod(now);
  }

  private formatPeriod(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  private getRecordId(userId: string, type: UsageType, period: string): string {
    return `${userId}:${type}:${period}`;
  }
}
