import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { AnalyticsService } from './analytics.service';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  RecordUsageDto,
  GetAnalyticsDto,
  SubscriptionPlan,
  UsageType,
} from './dto/billing.dto';

@Controller('api/billing')
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  // Subscription Endpoints
  @Post('subscriptions')
  async createSubscription(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(dto);
  }

  @Get('subscriptions/me')
  async getMySubscription(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    const subscription = await this.subscriptionService.getSubscriptionByUserId(safeUserId);
    if (!subscription) {
      return { hasSubscription: false, plan: SubscriptionPlan.FREE };
    }
    return { hasSubscription: true, subscription };
  }

  @Get('subscriptions/:id')
  async getSubscription(@Param('id') subscriptionId: string) {
    const subscription = await this.subscriptionService.getSubscription(subscriptionId);
    if (!subscription) {
      return { error: 'Subscription not found' };
    }
    return subscription;
  }

  @Patch('subscriptions/:id')
  async updateSubscription(
    @Param('id') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
  ) {
    return this.subscriptionService.updateSubscription(subscriptionId, dto);
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @Body() body: { immediately?: boolean },
  ) {
    return this.subscriptionService.cancelSubscription(subscriptionId, body.immediately);
  }

  @Post('subscriptions/:id/reactivate')
  async reactivateSubscription(@Param('id') subscriptionId: string) {
    return this.subscriptionService.reactivateSubscription(subscriptionId);
  }

  @Post('subscriptions/:id/renew')
  async renewSubscription(@Param('id') subscriptionId: string) {
    return this.subscriptionService.renewSubscription(subscriptionId);
  }

  // Plans Endpoints
  @Get('plans')
  async getPlans() {
    return this.subscriptionService.getPlans();
  }

  @Get('plans/:plan')
  async getPlan(@Param('plan') plan: SubscriptionPlan) {
    return this.subscriptionService.getPlan(plan);
  }

  @Post('plans/compare')
  @HttpCode(HttpStatus.OK)
  async comparePlans(@Body() body: { plans: SubscriptionPlan[] }) {
    const plans = body.plans.map((plan) => this.subscriptionService.getPlan(plan));
    return { plans };
  }

  // Invoice Endpoints
  @Get('invoices')
  async getInvoices(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    return this.subscriptionService.getInvoices(safeUserId);
  }

  @Post('invoices/:id/pay')
  async payInvoice(@Param('id') invoiceId: string) {
    return this.subscriptionService.payInvoice(invoiceId);
  }

  // Usage Endpoints
  @Post('usage')
  async recordUsage(@Body() dto: RecordUsageDto) {
    return this.usageService.recordUsage(dto);
  }

  @Get('usage/me')
  async getMyUsage(
    @Headers('x-user-id') userId: string,
    @Query('period') period?: string,
  ) {
    const safeUserId = userId || 'default-user';
    return this.usageService.getUsageSummary(safeUserId, period);
  }

  @Get('usage/check/:type')
  async checkLimit(
    @Param('type') type: UsageType,
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';
    return this.usageService.checkLimit(safeUserId, type);
  }

  @Get('usage/history/:type')
  async getUsageHistory(
    @Param('type') type: UsageType,
    @Headers('x-user-id') userId: string,
    @Query('months') months?: string,
  ) {
    const safeUserId = userId || 'default-user';
    return this.usageService.getUsageHistory(safeUserId, type, months ? parseInt(months) : 6);
  }

  @Get('usage/top-users/:type')
  async getTopUsers(
    @Param('type') type: UsageType,
    @Query('limit') limit?: string,
    @Query('period') period?: string,
  ) {
    return this.usageService.getTopUsers(type, limit ? parseInt(limit) : 10, period);
  }

  // Analytics Endpoints
  @Get('analytics/overview')
  async getOverviewMetrics() {
    return this.analyticsService.getOverviewMetrics();
  }

  @Get('analytics/platform')
  async getPlatformAnalytics(@Query('period') period?: string) {
    return this.analyticsService.getPlatformAnalytics(period);
  }

  @Get('analytics/daily')
  async getDailyMetrics(@Query('date') date?: string) {
    return this.analyticsService.getDailyMetrics(date ? new Date(date) : undefined);
  }

  @Post('analytics/range')
  @HttpCode(HttpStatus.OK)
  async getMetricsRange(@Body() dto: GetAnalyticsDto) {
    return this.analyticsService.getMetricsRange(dto);
  }

  @Get('analytics/user/:userId')
  async getUserAnalytics(@Param('userId') userId: string) {
    return this.analyticsService.getUserAnalytics(userId);
  }

  @Get('analytics/timeseries/:metric')
  async getTimeSeries(
    @Param('metric') metric: 'users' | 'plans' | 'tasks' | 'revenue',
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTimeSeriesData(metric, days ? parseInt(days) : 30);
  }

  @Get('analytics/subscriptions/breakdown')
  async getSubscriptionBreakdown() {
    return this.analyticsService.getSubscriptionBreakdown();
  }

  @Get('analytics/features/top')
  async getTopFeatures() {
    return this.analyticsService.getTopFeatures();
  }

  // Tracking Endpoints (for internal use)
  @Post('track/activity')
  @HttpCode(HttpStatus.OK)
  async trackActivity(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    await this.analyticsService.trackUserActivity(safeUserId);
    return { tracked: true };
  }

  @Post('track/plan-created')
  @HttpCode(HttpStatus.OK)
  async trackPlanCreated(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    await this.analyticsService.trackPlanCreated(safeUserId);
    await this.usageService.incrementPlan(safeUserId);
    return { tracked: true };
  }

  @Post('track/task-completed')
  @HttpCode(HttpStatus.OK)
  async trackTaskCompleted(@Headers('x-user-id') userId: string) {
    const safeUserId = userId || 'default-user';
    await this.analyticsService.trackTaskCompleted(safeUserId);
    await this.usageService.incrementTask(safeUserId);
    return { tracked: true };
  }

  @Post('track/quality-gate')
  @HttpCode(HttpStatus.OK)
  async trackQualityGate(@Body() body: { passed: boolean; coverage?: number }) {
    await this.analyticsService.trackQualityGate(body.passed, body.coverage);
    return { tracked: true };
  }

  // ROI Calculator
  @Post('roi/calculate')
  @HttpCode(HttpStatus.OK)
  async calculateROI(
    @Body() body: {
      hoursWithoutVibe?: number;
      hoursWithVibe?: number;
      hourlyRate?: number;
      monthlyFeatures?: number;
    },
  ) {
    return this.subscriptionService.calculateROI(
      body.hoursWithoutVibe || 14,
      body.hoursWithVibe || 2.25,
      body.hourlyRate || 80,
      body.monthlyFeatures || 4,
    );
  }

  // Feature Access
  @Get('features/:feature')
  async checkFeatureAccess(
    @Param('feature') feature: string,
    @Headers('x-user-id') userId: string,
  ) {
    const safeUserId = userId || 'default-user';
    const hasAccess = await this.subscriptionService.checkFeatureAccess(
      safeUserId,
      feature as any,
    );
    return { feature, hasAccess };
  }

  // Health check
  @Get('health')
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        subscriptions: 'active',
        usage: 'active',
        analytics: 'active',
      },
    };
  }
}
