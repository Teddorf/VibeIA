export enum AppComponent {
  FRONTEND = 'frontend',
  BACKEND = 'backend',
  WORKERS = 'workers',
  CRON = 'cron',
  WEBSOCKET = 'websocket',
}

export enum TrafficTier {
  MVP = 'mvp', // < 1,000 users/day
  SMALL = 'small', // 1,000-10,000 users/day
  GROWTH = 'growth', // 10,000-100,000 users/day
  SCALE = 'scale', // > 100,000 users/day
}

export enum InfraComplexity {
  SIMPLE = 'simple', // Frontend + API + DB
  MEDIUM = 'medium', // + Redis/Cache + Storage
  COMPLEX = 'complex', // + Queue + Workers + Multiple services
}

export enum HostingBudget {
  HOBBY = 'hobby', // $0-20
  STARTUP = 'startup', // $20-100
  GROWTH = 'growth', // $100-500
  ENTERPRISE = 'enterprise', // $500+
}

export enum DevOpsLevel {
  LOW = 'low', // want managed/simple
  MEDIUM = 'medium', // basic configs OK
  HIGH = 'high', // want full control
}

export class DeployRequirementsDto {
  components: AppComponent[];
  needsPreviewDeployments: boolean;
  trafficTier: TrafficTier;
  infraComplexity: InfraComplexity;
  budget: HostingBudget;
  devOpsLevel: DevOpsLevel;
  needsCustomDomain?: boolean;
  needsSSL?: boolean;
}

export interface DeployProvider {
  id: string;
  name: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'infrastructure';
  score: number;
  setupTime: string;
  developerExperience: number; // 1-5
  pricing: {
    hobby: { price: string; includes: string[] };
    pro: { price: string; includes: string[] };
    team: { price: string; includes: string[] };
  };
  features: string[];
  limitations: string[];
}

export interface DeployArchitecture {
  frontend: DeployProvider;
  backend: DeployProvider;
  database: string;
  cache?: string;
  storage?: string;
  diagram: string; // Mermaid diagram
}

export interface DeployRecommendation {
  architecture: DeployArchitecture;
  alternatives: DeployArchitecture[];
  reasoning: string[];
  estimatedSetupTime: string;
  estimatedMonthlyCost: {
    mvp: number;
    growth: number;
    scale: number;
  };
  migrationTriggers: string[];
}
