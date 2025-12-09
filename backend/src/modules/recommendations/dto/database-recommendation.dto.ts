export enum DataType {
  RELATIONAL = 'relational',
  DOCUMENT = 'document',
  MIXED = 'mixed',
  TIME_SERIES = 'time_series',
  CACHE = 'cache',
}

export enum DataVolume {
  SMALL = 'small', // < 1 GB
  MEDIUM = 'medium', // 1-10 GB
  LARGE = 'large', // 10-100 GB
  ENTERPRISE = 'enterprise', // > 100 GB
}

export enum TrafficLevel {
  LOW = 'low', // < 100 req/min
  MEDIUM = 'medium', // 100-1,000 req/min
  HIGH = 'high', // 1,000-10,000 req/min
  VERY_HIGH = 'very_high', // > 10,000 req/min
}

export enum BudgetRange {
  FREE = 'free', // $0-10
  STARTUP = 'startup', // $10-50
  GROWTH = 'growth', // $50-200
  ENTERPRISE = 'enterprise', // $200+
}

export class DatabaseRequirementsDto {
  dataType: DataType;
  dataVolume: DataVolume;
  trafficLevel: TrafficLevel;
  needsBranching: boolean;
  budget: BudgetRange;
  needsAuth?: boolean;
  needsStorage?: boolean;
  needsRealtime?: boolean;
}

export interface DatabaseProvider {
  id: string;
  name: string;
  type: string;
  score: number;
  pros: string[];
  cons: string[];
  pricing: {
    free: { storage: string; compute: string; price: string };
    starter: { storage: string; compute: string; price: string };
    pro: { storage: string; compute: string; price: string };
  };
  compatibility: {
    prisma: boolean;
    drizzle: boolean;
    typeorm: boolean;
    vercel: string;
  };
  hasBranching: boolean;
}

export interface DatabaseRecommendation {
  primary: DatabaseProvider;
  alternatives: DatabaseProvider[];
  reasoning: string[];
  estimatedMonthlyCost: number;
  migrationComplexity: 'low' | 'medium' | 'high';
}
