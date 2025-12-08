// Subscription Plans based on spec section 15.2
export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  CANCELLED = 'cancelled',
  PAST_DUE = 'past_due',
  TRIALING = 'trialing',
  EXPIRED = 'expired',
}

export enum BillingCycle {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export interface PlanLimits {
  maxTasks: number;
  maxProjects: number;
  maxPlans: number;
  maxTeamMembers: number;
  qualityGates: boolean;
  customArchetypes: boolean;
  prioritySupport: boolean;
  whiteLabel: boolean;
  sso: boolean;
  apiAccess: boolean;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface PlanDefinition {
  id: SubscriptionPlan;
  name: string;
  description: string;
  limits: PlanLimits;
  pricing: PlanPricing;
  features: string[];
  popular?: boolean;
}

export const PLAN_DEFINITIONS: Record<SubscriptionPlan, PlanDefinition> = {
  [SubscriptionPlan.FREE]: {
    id: SubscriptionPlan.FREE,
    name: 'Free',
    description: 'Perfect for trying out the platform',
    limits: {
      maxTasks: 10,
      maxProjects: 1,
      maxPlans: 3,
      maxTeamMembers: 1,
      qualityGates: true,
      customArchetypes: false,
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
      apiAccess: false,
    },
    pricing: { monthly: 0, yearly: 0, currency: 'USD' },
    features: [
      '10 tasks/month',
      '1 project',
      '3 plans',
      'Basic quality gates',
      'Community support',
    ],
  },
  [SubscriptionPlan.BASIC]: {
    id: SubscriptionPlan.BASIC,
    name: 'Basic',
    description: 'For individual developers',
    limits: {
      maxTasks: 50,
      maxProjects: 1,
      maxPlans: 10,
      maxTeamMembers: 1,
      qualityGates: true,
      customArchetypes: false,
      prioritySupport: false,
      whiteLabel: false,
      sso: false,
      apiAccess: true,
    },
    pricing: { monthly: 29, yearly: 290, currency: 'USD' },
    features: [
      '50 tasks/month',
      '1 project',
      '10 plans',
      'All quality gates',
      'API access',
      'Email support',
    ],
  },
  [SubscriptionPlan.PRO]: {
    id: SubscriptionPlan.PRO,
    name: 'Pro',
    description: 'For professional developers and small teams',
    limits: {
      maxTasks: 500,
      maxProjects: -1, // unlimited
      maxPlans: -1, // unlimited
      maxTeamMembers: 5,
      qualityGates: true,
      customArchetypes: true,
      prioritySupport: true,
      whiteLabel: false,
      sso: false,
      apiAccess: true,
    },
    pricing: { monthly: 99, yearly: 990, currency: 'USD' },
    features: [
      '500 tasks/month',
      'Unlimited projects',
      'Unlimited plans',
      'Up to 5 team members',
      'Custom archetypes',
      'Priority support',
      'API access',
    ],
    popular: true,
  },
  [SubscriptionPlan.ENTERPRISE]: {
    id: SubscriptionPlan.ENTERPRISE,
    name: 'Enterprise',
    description: 'For large teams and organizations',
    limits: {
      maxTasks: -1, // unlimited
      maxProjects: -1,
      maxPlans: -1,
      maxTeamMembers: -1,
      qualityGates: true,
      customArchetypes: true,
      prioritySupport: true,
      whiteLabel: true,
      sso: true,
      apiAccess: true,
    },
    pricing: { monthly: 499, yearly: 4990, currency: 'USD' },
    features: [
      'Unlimited tasks',
      'Unlimited everything',
      'Unlimited team members',
      'White-label option',
      'SSO/SAML',
      'Dedicated support',
      'Custom integrations',
      'SLA guarantee',
    ],
  },
};

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UsageRecord {
  id: string;
  userId: string;
  type: UsageType;
  count: number;
  period: string; // YYYY-MM format
  createdAt: Date;
  updatedAt: Date;
}

export enum UsageType {
  TASKS = 'tasks',
  PLANS = 'plans',
  PROJECTS = 'projects',
  API_CALLS = 'api_calls',
  LLM_TOKENS = 'llm_tokens',
}

export interface UsageSummary {
  userId: string;
  period: string;
  tasks: { used: number; limit: number; percentage: number };
  plans: { used: number; limit: number; percentage: number };
  projects: { used: number; limit: number; percentage: number };
  apiCalls: { used: number; limit: number; percentage: number };
}

export interface Invoice {
  id: string;
  userId: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: Date;
  periodEnd: Date;
  paidAt?: Date;
  stripeInvoiceId?: string;
  items: InvoiceItem[];
  createdAt: Date;
}

export enum InvoiceStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  VOID = 'void',
  UNCOLLECTIBLE = 'uncollectible',
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

// Analytics Types
export interface AnalyticsMetric {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercent?: number;
  trend?: 'up' | 'down' | 'stable';
}

export interface DailyMetrics {
  date: string;
  activeUsers: number;
  newUsers: number;
  plansCreated: number;
  tasksCompleted: number;
  qualityGatePassRate: number;
  avgTestCoverage: number;
  revenue: number;
}

export interface UserAnalytics {
  userId: string;
  firstSeen: Date;
  lastSeen: Date;
  totalSessions: number;
  totalPlansCreated: number;
  totalTasksCompleted: number;
  avgSessionDuration: number;
  retentionDays: number;
}

export interface PlatformAnalytics {
  period: string;
  mau: number; // Monthly Active Users
  dau: number; // Daily Active Users
  dauMauRatio: number;
  retention30: number;
  retention90: number;
  avgPlansPerUser: number;
  avgTasksPerUser: number;
  qualityGatePassRate: number;
  avgTestCoverage: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
  ltv: number; // Lifetime Value
  cac: number; // Customer Acquisition Cost
}

export interface TimeSeriesData {
  labels: string[];
  datasets: {
    name: string;
    data: number[];
    color?: string;
  }[];
}

// DTOs
export interface CreateSubscriptionDto {
  userId: string;
  plan: SubscriptionPlan;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}

export interface UpdateSubscriptionDto {
  plan?: SubscriptionPlan;
  billingCycle?: BillingCycle;
  cancelAtPeriodEnd?: boolean;
}

export interface RecordUsageDto {
  userId: string;
  type: UsageType;
  count?: number;
}

export interface GetAnalyticsDto {
  startDate: string;
  endDate: string;
  granularity?: 'day' | 'week' | 'month';
}

export interface ROICalculation {
  hoursWithoutVibe: number;
  hoursWithVibe: number;
  hourlyRate: number;
  costWithoutVibe: number;
  costWithVibe: number;
  savings: number;
  savingsPercent: number;
  monthlyFeatures: number;
  monthlySavings: number;
  vibeCost: number;
  roi: number;
}
