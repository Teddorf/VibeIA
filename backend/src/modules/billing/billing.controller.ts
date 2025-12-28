import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { AnalyticsService } from './analytics.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  RecordUsageDto,
  GetAnalyticsDto,
  SubscriptionPlan,
  UsageType,
} from './dto/billing.dto';

@Controller('api/billing')
@UseGuards(ThrottlerGuard)
export class BillingController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly usageService: UsageService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  /**
   * Validate that the current user owns the subscription
   * @throws ForbiddenException if user doesn't own the subscription
   */
  private async validateSubscriptionOwnership(subscriptionId: string, userId: string): Promise<void> {
    const subscription = await this.subscriptionService.getSubscription(subscriptionId);
    if (!subscription) {
      throw new ForbiddenException('Subscription not found');
    }
    if (subscription.userId !== userId) {
      throw new ForbiddenException('Access denied to this subscription');
    }
  }

  /**
   * Validate that the current user owns the invoice
   * Note: Since invoices are fetched per-user, we validate by checking
   * if the invoice belongs to any of the user's subscriptions
   */
  private async validateInvoiceOwnership(invoiceId: string, userId: string): Promise<void> {
    // Get all invoices for this user and check if the invoiceId is among them
    const invoices = await this.subscriptionService.getInvoices(userId);
    const ownsInvoice = invoices.some((inv: any) => inv._id?.toString() === invoiceId || inv.id === invoiceId);
    if (!ownsInvoice) {
      throw new ForbiddenException('Access denied to this invoice');
    }
  }

  // Subscription Endpoints
  @Post('subscriptions')
  async createSubscription(
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    // Override DTO userId with authenticated user's ID to prevent spoofing
    return this.subscriptionService.createSubscription({ ...dto, userId });
  }

  @Get('subscriptions/me')
  async getMySubscription(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const subscription = await this.subscriptionService.getSubscriptionByUserId(userId);
    if (!subscription) {
      return { hasSubscription: false, plan: SubscriptionPlan.FREE };
    }
    return { hasSubscription: true, subscription };
  }

  @Get('subscriptions/:id')
  async getSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateSubscriptionOwnership(subscriptionId, userId);
    return this.subscriptionService.getSubscription(subscriptionId);
  }

  @Patch('subscriptions/:id')
  async updateSubscription(
    @Param('id') subscriptionId: string,
    @Body() dto: UpdateSubscriptionDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateSubscriptionOwnership(subscriptionId, userId);
    return this.subscriptionService.updateSubscription(subscriptionId, dto);
  }

  @Post('subscriptions/:id/cancel')
  async cancelSubscription(
    @Param('id') subscriptionId: string,
    @Body() body: { immediately?: boolean },
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateSubscriptionOwnership(subscriptionId, userId);
    return this.subscriptionService.cancelSubscription(subscriptionId, body.immediately);
  }

  @Post('subscriptions/:id/reactivate')
  async reactivateSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateSubscriptionOwnership(subscriptionId, userId);
    return this.subscriptionService.reactivateSubscription(subscriptionId);
  }

  @Post('subscriptions/:id/renew')
  async renewSubscription(
    @Param('id') subscriptionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateSubscriptionOwnership(subscriptionId, userId);
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
  async getInvoices(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.subscriptionService.getInvoices(userId);
  }

  @Post('invoices/:id/pay')
  async payInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.validateInvoiceOwnership(invoiceId, userId);
    return this.subscriptionService.payInvoice(invoiceId);
  }

  // Usage Endpoints
  @Post('usage')
  async recordUsage(@Body() dto: RecordUsageDto) {
    return this.usageService.recordUsage(dto);
  }

  @Get('usage/me')
  async getMyUsage(
    @CurrentUser('userId') userId: string,
    @Query('period') period?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.usageService.getUsageSummary(userId, period);
  }

  @Get('usage/check/:type')
  async checkLimit(
    @Param('type') type: UsageType,
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.usageService.checkLimit(userId, type);
  }

  @Get('usage/history/:type')
  async getUsageHistory(
    @Param('type') type: UsageType,
    @CurrentUser('userId') userId: string,
    @Query('months') months?: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    return this.usageService.getUsageHistory(userId, type, months ? parseInt(months) : 6);
  }

  @Get('usage/top-users/:type')
  @Roles('admin')
  async getTopUsers(
    @Param('type') type: UsageType,
    @Query('limit') limit?: string,
    @Query('period') period?: string,
  ) {
    return this.usageService.getTopUsers(type, limit ? parseInt(limit) : 10, period);
  }

  // Analytics Endpoints (Admin Only)
  @Get('analytics/overview')
  @Roles('admin')
  async getOverviewMetrics() {
    return this.analyticsService.getOverviewMetrics();
  }

  @Get('analytics/platform')
  @Roles('admin')
  async getPlatformAnalytics(@Query('period') period?: string) {
    return this.analyticsService.getPlatformAnalytics(period);
  }

  @Get('analytics/daily')
  @Roles('admin')
  async getDailyMetrics(@Query('date') date?: string) {
    return this.analyticsService.getDailyMetrics(date ? new Date(date) : undefined);
  }

  @Post('analytics/range')
  @Roles('admin')
  @HttpCode(HttpStatus.OK)
  async getMetricsRange(@Body() dto: GetAnalyticsDto) {
    return this.analyticsService.getMetricsRange(dto);
  }

  @Get('analytics/user/:userId')
  async getUserAnalytics(
    @Param('userId') targetUserId: string,
    @CurrentUser('userId') currentUserId: string,
    @CurrentUser('role') role: string,
  ) {
    if (!currentUserId) {
      throw new UnauthorizedException('Authentication required');
    }
    // Users can view their own analytics, admins can view anyone's
    if (targetUserId !== currentUserId && role !== 'admin') {
      throw new ForbiddenException('Access denied to this user\'s analytics');
    }
    return this.analyticsService.getUserAnalytics(targetUserId);
  }

  @Get('analytics/timeseries/:metric')
  @Roles('admin')
  async getTimeSeries(
    @Param('metric') metric: 'users' | 'plans' | 'tasks' | 'revenue',
    @Query('days') days?: string,
  ) {
    return this.analyticsService.getTimeSeriesData(metric, days ? parseInt(days) : 30);
  }

  @Get('analytics/subscriptions/breakdown')
  @Roles('admin')
  async getSubscriptionBreakdown() {
    return this.analyticsService.getSubscriptionBreakdown();
  }

  @Get('analytics/features/top')
  @Roles('admin')
  async getTopFeatures() {
    return this.analyticsService.getTopFeatures();
  }

  // Tracking Endpoints (for internal use)
  @Post('track/activity')
  @HttpCode(HttpStatus.OK)
  async trackActivity(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.analyticsService.trackUserActivity(userId);
    return { tracked: true };
  }

  @Post('track/plan-created')
  @HttpCode(HttpStatus.OK)
  async trackPlanCreated(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.analyticsService.trackPlanCreated(userId);
    await this.usageService.incrementPlan(userId);
    return { tracked: true };
  }

  @Post('track/task-completed')
  @HttpCode(HttpStatus.OK)
  async trackTaskCompleted(@CurrentUser('userId') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    await this.analyticsService.trackTaskCompleted(userId);
    await this.usageService.incrementTask(userId);
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
    @CurrentUser('userId') userId: string,
  ) {
    if (!userId) {
      throw new UnauthorizedException('Authentication required');
    }
    const hasAccess = await this.subscriptionService.checkFeatureAccess(
      userId,
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
