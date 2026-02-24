export type BillingPlanTier = 'free' | 'basic' | 'pro' | 'enterprise';
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface BillingPlan {
  id: string;
  name: string;
  tier: BillingPlanTier;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    projects: number;
    tasksPerMonth: number;
    teamMembers: number;
    storage: number;
  };
}

export interface Subscription {
  _id: string;
  userId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
}

export interface Invoice {
  _id: string;
  userId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed';
  paidAt?: string;
  createdAt: string;
}

export interface UsageSummary {
  projectsUsed: number;
  projectsLimit: number;
  tasksUsed: number;
  tasksLimit: number;
  storageUsed: number;
  storageLimit: number;
}

export interface PlanComparison {
  plans: BillingPlan[];
  currentPlan?: string;
}
