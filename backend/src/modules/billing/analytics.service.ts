import { Injectable, Logger } from '@nestjs/common';
import {
  AnalyticsMetric,
  DailyMetrics,
  UserAnalytics,
  PlatformAnalytics,
  TimeSeriesData,
  GetAnalyticsDto,
  UsageType,
  PLAN_DEFINITIONS,
  SubscriptionPlan,
} from './dto/billing.dto';
import { UsageService } from './usage.service';
import { SubscriptionService } from './subscription.service';

interface UserActivity {
  userId: string;
  lastSeen: Date;
  firstSeen: Date;
  sessions: number;
  plansCreated: number;
  tasksCompleted: number;
}

interface QualityMetric {
  date: string;
  passRate: number;
  avgCoverage: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);
  private userActivities: Map<string, UserActivity> = new Map();
  private dailyMetrics: Map<string, DailyMetrics> = new Map();
  private qualityMetrics: Map<string, QualityMetric> = new Map();

  constructor(
    private readonly usageService: UsageService,
    private readonly subscriptionService: SubscriptionService,
  ) {}

  // Track user activity
  async trackUserActivity(userId: string): Promise<void> {
    const now = new Date();
    let activity = this.userActivities.get(userId);

    if (!activity) {
      activity = {
        userId,
        lastSeen: now,
        firstSeen: now,
        sessions: 1,
        plansCreated: 0,
        tasksCompleted: 0,
      };
    } else {
      activity.lastSeen = now;
      activity.sessions++;
    }

    this.userActivities.set(userId, activity);
    await this.updateDailyMetrics('activeUsers', 1);
  }

  async trackNewUser(userId: string): Promise<void> {
    await this.trackUserActivity(userId);
    await this.updateDailyMetrics('newUsers', 1);
  }

  async trackPlanCreated(userId: string): Promise<void> {
    const activity = this.userActivities.get(userId);
    if (activity) {
      activity.plansCreated++;
    }
    await this.updateDailyMetrics('plansCreated', 1);
  }

  async trackTaskCompleted(userId: string): Promise<void> {
    const activity = this.userActivities.get(userId);
    if (activity) {
      activity.tasksCompleted++;
    }
    await this.updateDailyMetrics('tasksCompleted', 1);
  }

  async trackQualityGate(passed: boolean, coverage?: number): Promise<void> {
    const today = this.getDateKey(new Date());
    let metric = this.qualityMetrics.get(today);

    if (!metric) {
      metric = { date: today, passRate: 100, avgCoverage: 0 };
    }

    // Update pass rate (rolling average)
    metric.passRate = passed ? metric.passRate : Math.max(0, metric.passRate - 1);

    if (coverage !== undefined) {
      metric.avgCoverage = (metric.avgCoverage + coverage) / 2;
    }

    this.qualityMetrics.set(today, metric);
  }

  async trackRevenue(amount: number): Promise<void> {
    await this.updateDailyMetrics('revenue', amount);
  }

  // Get metrics
  async getDailyMetrics(date?: Date): Promise<DailyMetrics> {
    const dateKey = this.getDateKey(date || new Date());
    return this.dailyMetrics.get(dateKey) || this.createEmptyDailyMetrics(dateKey);
  }

  async getMetricsRange(dto: GetAnalyticsDto): Promise<DailyMetrics[]> {
    const start = new Date(dto.startDate);
    const end = new Date(dto.endDate);
    const metrics: DailyMetrics[] = [];

    const current = new Date(start);
    while (current <= end) {
      const dateKey = this.getDateKey(current);
      metrics.push(this.dailyMetrics.get(dateKey) || this.createEmptyDailyMetrics(dateKey));
      current.setDate(current.getDate() + 1);
    }

    return metrics;
  }

  async getUserAnalytics(userId: string): Promise<UserAnalytics | null> {
    const activity = this.userActivities.get(userId);
    if (!activity) return null;

    const retentionDays = Math.floor(
      (activity.lastSeen.getTime() - activity.firstSeen.getTime()) / (24 * 60 * 60 * 1000),
    );

    return {
      userId,
      firstSeen: activity.firstSeen,
      lastSeen: activity.lastSeen,
      totalSessions: activity.sessions,
      totalPlansCreated: activity.plansCreated,
      totalTasksCompleted: activity.tasksCompleted,
      avgSessionDuration: 30, // Default placeholder
      retentionDays,
    };
  }

  async getPlatformAnalytics(period?: string): Promise<PlatformAnalytics> {
    const targetPeriod = period || this.getCurrentPeriod();

    // Calculate MAU/DAU
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let mau = 0;
    let dau = 0;
    let retention30 = 0;
    let retention90 = 0;

    this.userActivities.forEach((activity) => {
      if (activity.lastSeen >= thirtyDaysAgo) mau++;
      if (activity.lastSeen >= oneDayAgo) dau++;

      const retention = Math.floor(
        (activity.lastSeen.getTime() - activity.firstSeen.getTime()) / (24 * 60 * 60 * 1000),
      );
      if (retention >= 30) retention30++;
      if (retention >= 90) retention90++;
    });

    const totalUsers = this.userActivities.size;
    const ret30Percent = totalUsers > 0 ? (retention30 / totalUsers) * 100 : 0;
    const ret90Percent = totalUsers > 0 ? (retention90 / totalUsers) * 100 : 0;

    // Calculate averages
    const totalTasks = await this.usageService.getTotalUsage(UsageType.TASKS, targetPeriod);
    const totalPlans = await this.usageService.getTotalUsage(UsageType.PLANS, targetPeriod);
    const avgTasksPerUser = mau > 0 ? totalTasks / mau : 0;
    const avgPlansPerUser = mau > 0 ? totalPlans / mau : 0;

    // Get quality metrics
    const qualityMetric = this.qualityMetrics.get(this.getDateKey(now));
    const qualityGatePassRate = qualityMetric?.passRate || 95;
    const avgTestCoverage = qualityMetric?.avgCoverage || 80;

    // Calculate revenue metrics (simplified)
    const mrr = this.calculateMRR();
    const arr = mrr * 12;
    const churnRate = 5; // Placeholder
    const ltv = mrr * 24; // Simplified: 24 month average lifetime
    const cac = 50; // Placeholder

    return {
      period: targetPeriod,
      mau,
      dau,
      dauMauRatio: mau > 0 ? dau / mau : 0,
      retention30: ret30Percent,
      retention90: ret90Percent,
      avgPlansPerUser,
      avgTasksPerUser,
      qualityGatePassRate,
      avgTestCoverage,
      mrr,
      arr,
      churnRate,
      ltv,
      cac,
    };
  }

  async getOverviewMetrics(): Promise<AnalyticsMetric[]> {
    const analytics = await this.getPlatformAnalytics();
    const previousPeriod = this.getPreviousPeriod();
    const previousAnalytics = await this.getPlatformAnalytics(previousPeriod);

    return [
      this.createMetric('Monthly Active Users', analytics.mau, previousAnalytics.mau),
      this.createMetric('Daily Active Users', analytics.dau, previousAnalytics.dau),
      this.createMetric('Plans Created', analytics.avgPlansPerUser * analytics.mau, previousAnalytics.avgPlansPerUser * previousAnalytics.mau),
      this.createMetric('Tasks Completed', analytics.avgTasksPerUser * analytics.mau, previousAnalytics.avgTasksPerUser * previousAnalytics.mau),
      this.createMetric('Quality Pass Rate', analytics.qualityGatePassRate, previousAnalytics.qualityGatePassRate),
      this.createMetric('Avg Test Coverage', analytics.avgTestCoverage, previousAnalytics.avgTestCoverage),
      this.createMetric('MRR', analytics.mrr, previousAnalytics.mrr),
      this.createMetric('Churn Rate', analytics.churnRate, previousAnalytics.churnRate),
    ];
  }

  async getTimeSeriesData(
    metric: 'users' | 'plans' | 'tasks' | 'revenue',
    days = 30,
  ): Promise<TimeSeriesData> {
    const labels: string[] = [];
    const data: number[] = [];

    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = this.getDateKey(date);
      const metrics = this.dailyMetrics.get(dateKey) || this.createEmptyDailyMetrics(dateKey);

      labels.push(dateKey);

      switch (metric) {
        case 'users':
          data.push(metrics.activeUsers);
          break;
        case 'plans':
          data.push(metrics.plansCreated);
          break;
        case 'tasks':
          data.push(metrics.tasksCompleted);
          break;
        case 'revenue':
          data.push(metrics.revenue);
          break;
      }
    }

    return {
      labels,
      datasets: [
        {
          name: metric.charAt(0).toUpperCase() + metric.slice(1),
          data,
          color: this.getMetricColor(metric),
        },
      ],
    };
  }

  async getSubscriptionBreakdown(): Promise<{
    plan: string;
    count: number;
    percentage: number;
    revenue: number;
  }[]> {
    const breakdown: Record<string, { count: number; revenue: number }> = {};

    // Initialize all plans
    Object.values(SubscriptionPlan).forEach((plan) => {
      breakdown[plan] = { count: 0, revenue: 0 };
    });

    // Count subscriptions (simplified since we're using in-memory storage)
    // In production, this would query the database
    const totalUsers = this.userActivities.size || 1;

    // Placeholder distribution for demo
    breakdown[SubscriptionPlan.FREE].count = Math.floor(totalUsers * 0.6);
    breakdown[SubscriptionPlan.BASIC].count = Math.floor(totalUsers * 0.2);
    breakdown[SubscriptionPlan.PRO].count = Math.floor(totalUsers * 0.15);
    breakdown[SubscriptionPlan.ENTERPRISE].count = Math.floor(totalUsers * 0.05);

    return Object.entries(breakdown).map(([plan, data]) => ({
      plan,
      count: data.count,
      percentage: totalUsers > 0 ? (data.count / totalUsers) * 100 : 0,
      revenue: data.count * PLAN_DEFINITIONS[plan as SubscriptionPlan].pricing.monthly,
    }));
  }

  async getTopFeatures(): Promise<{
    feature: string;
    usage: number;
    trend: 'up' | 'down' | 'stable';
  }[]> {
    return [
      { feature: 'Plan Generation', usage: 85, trend: 'up' },
      { feature: 'Quality Gates', usage: 78, trend: 'stable' },
      { feature: 'Git Integration', usage: 72, trend: 'up' },
      { feature: 'Manual Tasks', usage: 45, trend: 'down' },
      { feature: 'Documentation Gen', usage: 38, trend: 'up' },
    ];
  }

  private async updateDailyMetrics(
    field: keyof Omit<DailyMetrics, 'date'>,
    increment: number,
  ): Promise<void> {
    const today = this.getDateKey(new Date());
    let metrics = this.dailyMetrics.get(today);

    if (!metrics) {
      metrics = this.createEmptyDailyMetrics(today);
    }

    (metrics[field] as number) += increment;
    this.dailyMetrics.set(today, metrics);
  }

  private calculateMRR(): number {
    const breakdown = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.BASIC]: 0,
      [SubscriptionPlan.PRO]: 0,
      [SubscriptionPlan.ENTERPRISE]: 0,
    };

    // In production, iterate through actual subscriptions
    const totalUsers = this.userActivities.size || 10;
    breakdown[SubscriptionPlan.BASIC] = Math.floor(totalUsers * 0.2);
    breakdown[SubscriptionPlan.PRO] = Math.floor(totalUsers * 0.15);
    breakdown[SubscriptionPlan.ENTERPRISE] = Math.floor(totalUsers * 0.05);

    let mrr = 0;
    Object.entries(breakdown).forEach(([plan, count]) => {
      mrr += count * PLAN_DEFINITIONS[plan as SubscriptionPlan].pricing.monthly;
    });

    return mrr;
  }

  private createMetric(
    name: string,
    value: number,
    previousValue?: number,
  ): AnalyticsMetric {
    const change = previousValue !== undefined ? value - previousValue : undefined;
    const changePercent =
      previousValue !== undefined && previousValue !== 0
        ? ((value - previousValue) / previousValue) * 100
        : undefined;

    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (change !== undefined) {
      if (change > 0) trend = 'up';
      else if (change < 0) trend = 'down';
    }

    return {
      name,
      value: Math.round(value * 100) / 100,
      previousValue: previousValue !== undefined ? Math.round(previousValue * 100) / 100 : undefined,
      change: change !== undefined ? Math.round(change * 100) / 100 : undefined,
      changePercent: changePercent !== undefined ? Math.round(changePercent * 100) / 100 : undefined,
      trend,
    };
  }

  private createEmptyDailyMetrics(date: string): DailyMetrics {
    return {
      date,
      activeUsers: 0,
      newUsers: 0,
      plansCreated: 0,
      tasksCompleted: 0,
      qualityGatePassRate: 100,
      avgTestCoverage: 0,
      revenue: 0,
    };
  }

  private getDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private getCurrentPeriod(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private getPreviousPeriod(): string {
    const now = new Date();
    const previous = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}`;
  }

  private getMetricColor(metric: string): string {
    const colors: Record<string, string> = {
      users: '#3b82f6',
      plans: '#10b981',
      tasks: '#8b5cf6',
      revenue: '#f59e0b',
    };
    return colors[metric] || '#6b7280';
  }
}
