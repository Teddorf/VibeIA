import { Injectable, Logger } from '@nestjs/common';
import {
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  PLAN_DEFINITIONS,
  PlanDefinition,
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  Invoice,
  InvoiceStatus,
  InvoiceItem,
} from './dto/billing.dto';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private subscriptions: Map<string, Subscription> = new Map();
  private invoices: Map<string, Invoice> = new Map();
  private userSubscriptions: Map<string, string> = new Map(); // userId -> subscriptionId

  async createSubscription(dto: CreateSubscriptionDto): Promise<Subscription> {
    const existingSub = this.userSubscriptions.get(dto.userId);
    if (existingSub) {
      throw new Error('User already has an active subscription');
    }

    const subscriptionId = this.generateId('sub');
    const now = new Date();
    const periodEnd = this.calculatePeriodEnd(now, dto.billingCycle);

    const subscription: Subscription = {
      id: subscriptionId,
      userId: dto.userId,
      plan: dto.plan,
      status: dto.plan === SubscriptionPlan.FREE ? SubscriptionStatus.ACTIVE : SubscriptionStatus.TRIALING,
      billingCycle: dto.billingCycle,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: false,
      trialEnd: dto.plan !== SubscriptionPlan.FREE ? new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) : undefined,
      createdAt: now,
      updatedAt: now,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.userSubscriptions.set(dto.userId, subscriptionId);

    this.logger.log(`Created subscription ${subscriptionId} for user ${dto.userId} with plan ${dto.plan}`);

    return subscription;
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getSubscriptionByUserId(userId: string): Promise<Subscription | null> {
    const subscriptionId = this.userSubscriptions.get(userId);
    if (!subscriptionId) return null;
    return this.subscriptions.get(subscriptionId) || null;
  }

  async updateSubscription(subscriptionId: string, dto: UpdateSubscriptionDto): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (dto.plan !== undefined) {
      const currentPlan = PLAN_DEFINITIONS[subscription.plan];
      const newPlan = PLAN_DEFINITIONS[dto.plan];

      // Handle upgrade/downgrade
      if (this.getPlanRank(dto.plan) > this.getPlanRank(subscription.plan)) {
        // Upgrade: Apply immediately
        subscription.plan = dto.plan;
        this.logger.log(`Subscription ${subscriptionId} upgraded to ${dto.plan}`);
      } else {
        // Downgrade: Apply at period end
        this.logger.log(`Subscription ${subscriptionId} will downgrade to ${dto.plan} at period end`);
      }
    }

    if (dto.billingCycle !== undefined) {
      subscription.billingCycle = dto.billingCycle;
    }

    if (dto.cancelAtPeriodEnd !== undefined) {
      subscription.cancelAtPeriodEnd = dto.cancelAtPeriodEnd;
      if (dto.cancelAtPeriodEnd) {
        this.logger.log(`Subscription ${subscriptionId} scheduled for cancellation`);
      }
    }

    subscription.updatedAt = new Date();
    return subscription;
  }

  async cancelSubscription(subscriptionId: string, immediately = false): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (immediately) {
      subscription.status = SubscriptionStatus.CANCELLED;
      this.userSubscriptions.delete(subscription.userId);
      this.logger.log(`Subscription ${subscriptionId} cancelled immediately`);
    } else {
      subscription.cancelAtPeriodEnd = true;
      this.logger.log(`Subscription ${subscriptionId} will cancel at period end`);
    }

    subscription.updatedAt = new Date();
    return subscription;
  }

  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.status === SubscriptionStatus.CANCELLED) {
      throw new Error('Cannot reactivate a cancelled subscription');
    }

    subscription.cancelAtPeriodEnd = false;
    subscription.updatedAt = new Date();

    this.logger.log(`Subscription ${subscriptionId} reactivated`);
    return subscription;
  }

  async renewSubscription(subscriptionId: string): Promise<{ subscription: Subscription; invoice: Invoice }> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    if (subscription.cancelAtPeriodEnd) {
      subscription.status = SubscriptionStatus.CANCELLED;
      this.userSubscriptions.delete(subscription.userId);
      return { subscription, invoice: null as any };
    }

    const now = new Date();
    const newPeriodEnd = this.calculatePeriodEnd(now, subscription.billingCycle);

    // Create invoice
    const invoice = await this.createInvoice(subscription);

    // Update subscription period
    subscription.currentPeriodStart = now;
    subscription.currentPeriodEnd = newPeriodEnd;
    subscription.status = SubscriptionStatus.ACTIVE;
    subscription.updatedAt = now;

    this.logger.log(`Subscription ${subscriptionId} renewed until ${newPeriodEnd}`);

    return { subscription, invoice };
  }

  async createInvoice(subscription: Subscription): Promise<Invoice> {
    const plan = PLAN_DEFINITIONS[subscription.plan];
    const amount = subscription.billingCycle === BillingCycle.MONTHLY
      ? plan.pricing.monthly
      : plan.pricing.yearly;

    const invoiceId = this.generateId('inv');
    const now = new Date();

    const items: InvoiceItem[] = [
      {
        description: `${plan.name} Plan (${subscription.billingCycle})`,
        quantity: 1,
        unitPrice: amount,
        amount: amount,
      },
    ];

    const invoice: Invoice = {
      id: invoiceId,
      userId: subscription.userId,
      subscriptionId: subscription.id,
      amount,
      currency: plan.pricing.currency,
      status: InvoiceStatus.OPEN,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
      items,
      createdAt: now,
    };

    this.invoices.set(invoiceId, invoice);
    this.logger.log(`Created invoice ${invoiceId} for $${amount}`);

    return invoice;
  }

  async payInvoice(invoiceId: string): Promise<Invoice> {
    const invoice = this.invoices.get(invoiceId);
    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    invoice.status = InvoiceStatus.PAID;
    invoice.paidAt = new Date();

    // Activate subscription if it was past due
    const subscription = this.subscriptions.get(invoice.subscriptionId);
    if (subscription && subscription.status === SubscriptionStatus.PAST_DUE) {
      subscription.status = SubscriptionStatus.ACTIVE;
    }

    this.logger.log(`Invoice ${invoiceId} paid`);
    return invoice;
  }

  async getInvoices(userId: string): Promise<Invoice[]> {
    const invoices: Invoice[] = [];
    this.invoices.forEach((invoice) => {
      if (invoice.userId === userId) {
        invoices.push(invoice);
      }
    });
    return invoices.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getPlans(): PlanDefinition[] {
    return Object.values(PLAN_DEFINITIONS);
  }

  getPlan(plan: SubscriptionPlan): PlanDefinition {
    return PLAN_DEFINITIONS[plan];
  }

  async checkFeatureAccess(userId: string, feature: keyof PlanDefinition['limits']): Promise<boolean> {
    const subscription = await this.getSubscriptionByUserId(userId);
    if (!subscription) {
      // Default to free plan limits
      return PLAN_DEFINITIONS[SubscriptionPlan.FREE].limits[feature] as boolean;
    }

    const plan = PLAN_DEFINITIONS[subscription.plan];
    return plan.limits[feature] as boolean;
  }

  async getUsageLimit(userId: string, limitType: 'maxTasks' | 'maxProjects' | 'maxPlans'): Promise<number> {
    const subscription = await this.getSubscriptionByUserId(userId);
    if (!subscription) {
      return PLAN_DEFINITIONS[SubscriptionPlan.FREE].limits[limitType];
    }

    return PLAN_DEFINITIONS[subscription.plan].limits[limitType];
  }

  calculateROI(hoursWithoutVibe: number, hoursWithVibe: number, hourlyRate = 80, monthlyFeatures = 4): {
    costWithoutVibe: number;
    costWithVibe: number;
    savings: number;
    savingsPercent: number;
    monthlySavings: number;
    roi: number;
  } {
    const costWithoutVibe = hoursWithoutVibe * hourlyRate;
    const costWithVibe = hoursWithVibe * hourlyRate;
    const savings = costWithoutVibe - costWithVibe;
    const savingsPercent = (savings / costWithoutVibe) * 100;
    const monthlySavings = savings * monthlyFeatures;
    const vibeCost = PLAN_DEFINITIONS[SubscriptionPlan.PRO].pricing.monthly;
    const roi = ((monthlySavings - vibeCost) / vibeCost) * 100;

    return {
      costWithoutVibe,
      costWithVibe,
      savings,
      savingsPercent,
      monthlySavings,
      roi,
    };
  }

  private calculatePeriodEnd(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    if (cycle === BillingCycle.MONTHLY) {
      end.setMonth(end.getMonth() + 1);
    } else {
      end.setFullYear(end.getFullYear() + 1);
    }
    return end;
  }

  private getPlanRank(plan: SubscriptionPlan): number {
    const ranks = {
      [SubscriptionPlan.FREE]: 0,
      [SubscriptionPlan.BASIC]: 1,
      [SubscriptionPlan.PRO]: 2,
      [SubscriptionPlan.ENTERPRISE]: 3,
    };
    return ranks[plan];
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
