import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { AnalyticsService } from './analytics.service';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  UsageType,
  PLAN_DEFINITIONS,
} from './dto/billing.dto';

describe('SubscriptionService', () => {
  let service: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubscriptionService],
    }).compile();

    service = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('createSubscription', () => {
    it('should create a free subscription', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-1',
        plan: SubscriptionPlan.FREE,
        billingCycle: BillingCycle.MONTHLY,
      });

      expect(subscription.id).toBeDefined();
      expect(subscription.userId).toBe('user-1');
      expect(subscription.plan).toBe(SubscriptionPlan.FREE);
      expect(subscription.status).toBe(SubscriptionStatus.ACTIVE);
    });

    it('should create a paid subscription with trial', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-2',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.MONTHLY,
      });

      expect(subscription.status).toBe(SubscriptionStatus.TRIALING);
      expect(subscription.trialEnd).toBeDefined();
    });

    it('should throw if user already has subscription', async () => {
      await service.createSubscription({
        userId: 'user-3',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      await expect(
        service.createSubscription({
          userId: 'user-3',
          plan: SubscriptionPlan.PRO,
          billingCycle: BillingCycle.MONTHLY,
        }),
      ).rejects.toThrow('User already has an active subscription');
    });

    it('should set correct period end for monthly billing', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-4',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const monthDiff =
        subscription.currentPeriodEnd.getMonth() -
        subscription.currentPeriodStart.getMonth();
      expect(monthDiff === 1 || monthDiff === -11).toBe(true);
    });

    it('should set correct period end for yearly billing', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-5',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.YEARLY,
      });

      const yearDiff =
        subscription.currentPeriodEnd.getFullYear() -
        subscription.currentPeriodStart.getFullYear();
      expect(yearDiff).toBe(1);
    });
  });

  describe('getSubscription', () => {
    it('should retrieve a subscription by id', async () => {
      const created = await service.createSubscription({
        userId: 'user-6',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const subscription = await service.getSubscription(created.id);
      expect(subscription).toBeDefined();
      expect(subscription?.id).toBe(created.id);
    });

    it('should return null for non-existent subscription', async () => {
      const subscription = await service.getSubscription('invalid-id');
      expect(subscription).toBeNull();
    });
  });

  describe('getSubscriptionByUserId', () => {
    it('should retrieve subscription by user id', async () => {
      await service.createSubscription({
        userId: 'user-7',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.MONTHLY,
      });

      const subscription = await service.getSubscriptionByUserId('user-7');
      expect(subscription).toBeDefined();
      expect(subscription?.userId).toBe('user-7');
    });
  });

  describe('updateSubscription', () => {
    it('should update billing cycle', async () => {
      const created = await service.createSubscription({
        userId: 'user-8',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const updated = await service.updateSubscription(created.id, {
        billingCycle: BillingCycle.YEARLY,
      });

      expect(updated.billingCycle).toBe(BillingCycle.YEARLY);
    });

    it('should upgrade plan immediately', async () => {
      const created = await service.createSubscription({
        userId: 'user-9',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const updated = await service.updateSubscription(created.id, {
        plan: SubscriptionPlan.PRO,
      });

      expect(updated.plan).toBe(SubscriptionPlan.PRO);
    });

    it('should throw for non-existent subscription', async () => {
      await expect(
        service.updateSubscription('invalid-id', { plan: SubscriptionPlan.PRO }),
      ).rejects.toThrow();
    });
  });

  describe('cancelSubscription', () => {
    it('should schedule cancellation at period end', async () => {
      const created = await service.createSubscription({
        userId: 'user-10',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const cancelled = await service.cancelSubscription(created.id);
      expect(cancelled.cancelAtPeriodEnd).toBe(true);
      expect(cancelled.status).not.toBe(SubscriptionStatus.CANCELLED);
    });

    it('should cancel immediately when requested', async () => {
      const created = await service.createSubscription({
        userId: 'user-11',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const cancelled = await service.cancelSubscription(created.id, true);
      expect(cancelled.status).toBe(SubscriptionStatus.CANCELLED);
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate a scheduled cancellation', async () => {
      const created = await service.createSubscription({
        userId: 'user-12',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.MONTHLY,
      });

      await service.cancelSubscription(created.id);
      const reactivated = await service.reactivateSubscription(created.id);

      expect(reactivated.cancelAtPeriodEnd).toBe(false);
    });

    it('should throw for cancelled subscription', async () => {
      const created = await service.createSubscription({
        userId: 'user-13',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      await service.cancelSubscription(created.id, true);

      await expect(service.reactivateSubscription(created.id)).rejects.toThrow();
    });
  });

  describe('getPlans', () => {
    it('should return all plan definitions', () => {
      const plans = service.getPlans();
      expect(plans.length).toBe(4);
      expect(plans.map((p) => p.id)).toContain(SubscriptionPlan.FREE);
      expect(plans.map((p) => p.id)).toContain(SubscriptionPlan.PRO);
    });
  });

  describe('getPlan', () => {
    it('should return specific plan details', () => {
      const plan = service.getPlan(SubscriptionPlan.PRO);
      expect(plan.name).toBe('Pro');
      expect(plan.pricing.monthly).toBe(99);
      expect(plan.limits.maxTasks).toBe(500);
    });
  });

  describe('checkFeatureAccess', () => {
    it('should check feature access for subscribed user', async () => {
      await service.createSubscription({
        userId: 'user-14',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.MONTHLY,
      });

      const hasAccess = await service.checkFeatureAccess('user-14', 'customArchetypes');
      expect(hasAccess).toBe(true);
    });

    it('should deny feature for free plan', async () => {
      await service.createSubscription({
        userId: 'user-15',
        plan: SubscriptionPlan.FREE,
        billingCycle: BillingCycle.MONTHLY,
      });

      const hasAccess = await service.checkFeatureAccess('user-15', 'customArchetypes');
      expect(hasAccess).toBe(false);
    });
  });

  describe('calculateROI', () => {
    it('should calculate ROI correctly', () => {
      const roi = service.calculateROI(14, 2.25, 80, 4);

      expect(roi.costWithoutVibe).toBe(1120);
      expect(roi.costWithVibe).toBe(180);
      expect(roi.savings).toBe(940);
      expect(roi.monthlySavings).toBe(3760);
      expect(roi.roi).toBeGreaterThan(3000);
    });
  });

  describe('createInvoice', () => {
    it('should create an invoice for subscription', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-16',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      const invoice = await service.createInvoice(subscription);
      expect(invoice.id).toBeDefined();
      expect(invoice.amount).toBe(29);
      expect(invoice.items.length).toBe(1);
    });
  });

  describe('payInvoice', () => {
    it('should mark invoice as paid', async () => {
      const subscription = await service.createSubscription({
        userId: 'user-17',
        plan: SubscriptionPlan.PRO,
        billingCycle: BillingCycle.MONTHLY,
      });

      const invoice = await service.createInvoice(subscription);
      const paid = await service.payInvoice(invoice.id);

      expect(paid.status).toBe('paid');
      expect(paid.paidAt).toBeDefined();
    });
  });
});

describe('UsageService', () => {
  let service: UsageService;
  let subscriptionService: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsageService, SubscriptionService],
    }).compile();

    service = module.get<UsageService>(UsageService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('recordUsage', () => {
    it('should record usage for a user', async () => {
      const record = await service.recordUsage({
        userId: 'user-1',
        type: UsageType.TASKS,
        count: 5,
      });

      expect(record.userId).toBe('user-1');
      expect(record.type).toBe(UsageType.TASKS);
      expect(record.count).toBe(5);
    });

    it('should increment existing usage', async () => {
      await service.recordUsage({ userId: 'user-2', type: UsageType.TASKS, count: 3 });
      const record = await service.recordUsage({ userId: 'user-2', type: UsageType.TASKS, count: 2 });

      expect(record.count).toBe(5);
    });

    it('should default to count of 1', async () => {
      const record = await service.recordUsage({ userId: 'user-3', type: UsageType.PLANS });
      expect(record.count).toBe(1);
    });
  });

  describe('getUsage', () => {
    it('should get current period usage', async () => {
      await service.recordUsage({ userId: 'user-4', type: UsageType.TASKS, count: 10 });
      const usage = await service.getUsage('user-4', UsageType.TASKS);
      expect(usage).toBe(10);
    });

    it('should return 0 for no usage', async () => {
      const usage = await service.getUsage('user-5', UsageType.TASKS);
      expect(usage).toBe(0);
    });
  });

  describe('getUsageSummary', () => {
    it('should return usage summary', async () => {
      await subscriptionService.createSubscription({
        userId: 'user-6',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      await service.recordUsage({ userId: 'user-6', type: UsageType.TASKS, count: 25 });

      const summary = await service.getUsageSummary('user-6');
      expect(summary.tasks.used).toBe(25);
      expect(summary.tasks.limit).toBe(50);
      expect(summary.tasks.percentage).toBe(50);
    });
  });

  describe('checkLimit', () => {
    it('should allow usage within limit', async () => {
      await subscriptionService.createSubscription({
        userId: 'user-7',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      await service.recordUsage({ userId: 'user-7', type: UsageType.TASKS, count: 10 });
      const result = await service.checkLimit('user-7', UsageType.TASKS);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(40);
    });

    it('should deny when limit exceeded', async () => {
      await subscriptionService.createSubscription({
        userId: 'user-8',
        plan: SubscriptionPlan.BASIC,
        billingCycle: BillingCycle.MONTHLY,
      });

      await service.recordUsage({ userId: 'user-8', type: UsageType.TASKS, count: 50 });
      const result = await service.checkLimit('user-8', UsageType.TASKS);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should handle unlimited plans', async () => {
      await subscriptionService.createSubscription({
        userId: 'user-9',
        plan: SubscriptionPlan.ENTERPRISE,
        billingCycle: BillingCycle.YEARLY,
      });

      await service.recordUsage({ userId: 'user-9', type: UsageType.TASKS, count: 1000 });
      const result = await service.checkLimit('user-9', UsageType.TASKS);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(-1);
    });
  });

  describe('incrementTask', () => {
    it('should increment and check limit', async () => {
      await subscriptionService.createSubscription({
        userId: 'user-10',
        plan: SubscriptionPlan.FREE,
        billingCycle: BillingCycle.MONTHLY,
      });

      const result = await service.incrementTask('user-10');
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });
  });

  describe('getUsageHistory', () => {
    it('should return usage history', async () => {
      await service.recordUsage({ userId: 'user-11', type: UsageType.TASKS, count: 20 });
      const history = await service.getUsageHistory('user-11', UsageType.TASKS, 3);

      expect(history.length).toBe(3);
      expect(history[history.length - 1].count).toBe(20);
    });
  });

  describe('getTotalUsage', () => {
    it('should sum usage across all users', async () => {
      await service.recordUsage({ userId: 'user-12', type: UsageType.PLANS, count: 5 });
      await service.recordUsage({ userId: 'user-13', type: UsageType.PLANS, count: 3 });

      const total = await service.getTotalUsage(UsageType.PLANS);
      expect(total).toBe(8);
    });
  });
});

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let usageService: UsageService;
  let subscriptionService: SubscriptionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnalyticsService, UsageService, SubscriptionService],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
    usageService = module.get<UsageService>(UsageService);
    subscriptionService = module.get<SubscriptionService>(SubscriptionService);
  });

  describe('trackUserActivity', () => {
    it('should track user activity', async () => {
      await service.trackUserActivity('user-1');
      const analytics = await service.getUserAnalytics('user-1');

      expect(analytics).toBeDefined();
      expect(analytics?.userId).toBe('user-1');
      expect(analytics?.totalSessions).toBe(1);
    });

    it('should increment sessions on repeat activity', async () => {
      await service.trackUserActivity('user-2');
      await service.trackUserActivity('user-2');
      await service.trackUserActivity('user-2');

      const analytics = await service.getUserAnalytics('user-2');
      expect(analytics?.totalSessions).toBe(3);
    });
  });

  describe('trackPlanCreated', () => {
    it('should track plan creation', async () => {
      await service.trackUserActivity('user-3');
      await service.trackPlanCreated('user-3');

      const analytics = await service.getUserAnalytics('user-3');
      expect(analytics?.totalPlansCreated).toBe(1);
    });
  });

  describe('trackTaskCompleted', () => {
    it('should track task completion', async () => {
      await service.trackUserActivity('user-4');
      await service.trackTaskCompleted('user-4');
      await service.trackTaskCompleted('user-4');

      const analytics = await service.getUserAnalytics('user-4');
      expect(analytics?.totalTasksCompleted).toBe(2);
    });
  });

  describe('trackQualityGate', () => {
    it('should track quality gate results', async () => {
      await service.trackQualityGate(true, 85);
      // Quality tracking is internal, verify no error
    });
  });

  describe('getDailyMetrics', () => {
    it('should return daily metrics', async () => {
      const metrics = await service.getDailyMetrics();
      expect(metrics).toBeDefined();
      expect(metrics.date).toBeDefined();
    });
  });

  describe('getPlatformAnalytics', () => {
    it('should return platform analytics', async () => {
      await service.trackUserActivity('user-5');
      await service.trackUserActivity('user-6');

      const analytics = await service.getPlatformAnalytics();

      expect(analytics).toBeDefined();
      expect(analytics.mau).toBeGreaterThanOrEqual(0);
      expect(analytics.dau).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getOverviewMetrics', () => {
    it('should return overview metrics', async () => {
      const metrics = await service.getOverviewMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].name).toBeDefined();
      expect(metrics[0].value).toBeDefined();
    });
  });

  describe('getTimeSeriesData', () => {
    it('should return time series data for users', async () => {
      const data = await service.getTimeSeriesData('users', 7);

      expect(data.labels.length).toBe(7);
      expect(data.datasets.length).toBe(1);
      expect(data.datasets[0].data.length).toBe(7);
    });

    it('should return time series for different metrics', async () => {
      const plans = await service.getTimeSeriesData('plans', 7);
      const tasks = await service.getTimeSeriesData('tasks', 7);
      const revenue = await service.getTimeSeriesData('revenue', 7);

      expect(plans.datasets[0].name).toBe('Plans');
      expect(tasks.datasets[0].name).toBe('Tasks');
      expect(revenue.datasets[0].name).toBe('Revenue');
    });
  });

  describe('getSubscriptionBreakdown', () => {
    it('should return subscription breakdown', async () => {
      const breakdown = await service.getSubscriptionBreakdown();

      expect(breakdown.length).toBe(4);
      expect(breakdown.find((b) => b.plan === 'free')).toBeDefined();
    });
  });

  describe('getTopFeatures', () => {
    it('should return top features', async () => {
      const features = await service.getTopFeatures();

      expect(features.length).toBeGreaterThan(0);
      expect(features[0].feature).toBeDefined();
      expect(features[0].usage).toBeDefined();
      expect(features[0].trend).toBeDefined();
    });
  });

  describe('getUserAnalytics', () => {
    it('should return null for unknown user', async () => {
      const analytics = await service.getUserAnalytics('unknown-user');
      expect(analytics).toBeNull();
    });

    it('should calculate retention days', async () => {
      await service.trackUserActivity('user-7');
      const analytics = await service.getUserAnalytics('user-7');

      expect(analytics?.retentionDays).toBeDefined();
      expect(analytics?.retentionDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getMetricsRange', () => {
    it('should return metrics for date range', async () => {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

      const metrics = await service.getMetricsRange({
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
      });

      expect(metrics.length).toBeGreaterThan(0);
    });
  });
});
