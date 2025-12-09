export enum ProjectPhase {
  MVP = 'mvp',
  GROWTH = 'growth',
  SCALE = 'scale',
}

export class CostProjectionDto {
  mvpUsers: number; // users per day
  growthUsers: number;
  scaleUsers: number;
  mvpStorageGB?: number;
  growthStorageGB?: number;
  scaleStorageGB?: number;
  databaseProvider?: string;
  hostingProvider?: string;
}

export interface PhaseCost {
  name: string;
  duration: number; // months
  users: number;
  costs: {
    database: { provider: string; tier: string; monthly: number };
    hosting: { provider: string; tier: string; monthly: number };
    cache?: { provider: string; tier: string; monthly: number };
    storage?: { provider: string; tier: string; monthly: number };
  };
  totalMonthly: number;
  totalForPhase: number;
}

export interface CostProjection {
  phases: PhaseCost[];
  year1Total: number;
  costPerUser: number;
  breakEvenPoint: string;
  recommendations: string[];
  comparisonWithAWS: {
    managedPlatformsCost: number;
    awsCost: number;
    savings: number;
    savingsPercent: number;
  };
}
