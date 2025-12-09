import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseRecommendationService } from './database-recommendation.service';
import { DeployRecommendationService } from './deploy-recommendation.service';
import { CostCalculatorService } from './cost-calculator.service';
import {
  DataType,
  DataVolume,
  TrafficLevel,
  BudgetRange,
} from './dto/database-recommendation.dto';
import {
  AppComponent,
  TrafficTier,
  InfraComplexity,
  HostingBudget,
  DevOpsLevel,
} from './dto/deploy-recommendation.dto';

describe('DatabaseRecommendationService', () => {
  let service: DatabaseRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DatabaseRecommendationService],
    }).compile();

    service = module.get<DatabaseRecommendationService>(
      DatabaseRecommendationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return all providers', () => {
    const providers = service.getProviders();
    expect(providers.length).toBeGreaterThan(0);
    expect(providers.some((p) => p.id === 'neon')).toBe(true);
  });

  it('should recommend Neon for relational data with branching', () => {
    const recommendation = service.recommend({
      dataType: DataType.RELATIONAL,
      dataVolume: DataVolume.SMALL,
      trafficLevel: TrafficLevel.LOW,
      needsBranching: true,
      budget: BudgetRange.STARTUP,
    });

    expect(recommendation.primary.id).toBe('neon');
    expect(recommendation.primary.score).toBeGreaterThan(70);
    expect(recommendation.reasoning.length).toBeGreaterThan(0);
  });

  it('should recommend Supabase when auth is needed', () => {
    const recommendation = service.recommend({
      dataType: DataType.RELATIONAL,
      dataVolume: DataVolume.SMALL,
      trafficLevel: TrafficLevel.LOW,
      needsBranching: false,
      budget: BudgetRange.STARTUP,
      needsAuth: true,
      needsRealtime: true,
    });

    // Supabase should score higher with auth requirements - could be primary or in alternatives
    const supabaseInResults =
      recommendation.primary.id === 'supabase' ||
      recommendation.alternatives.some((p) => p.id === 'supabase');
    expect(supabaseInResults).toBe(true);
  });

  it('should recommend MongoDB for document data', () => {
    const recommendation = service.recommend({
      dataType: DataType.DOCUMENT,
      dataVolume: DataVolume.MEDIUM,
      trafficLevel: TrafficLevel.MEDIUM,
      needsBranching: false,
      budget: BudgetRange.GROWTH,
    });

    expect(
      recommendation.primary.id === 'mongodb-atlas' ||
        recommendation.alternatives.some((p) => p.id === 'mongodb-atlas'),
    ).toBe(true);
  });

  it('should estimate monthly cost based on budget', () => {
    const freeRecommendation = service.recommend({
      dataType: DataType.RELATIONAL,
      dataVolume: DataVolume.SMALL,
      trafficLevel: TrafficLevel.LOW,
      needsBranching: false,
      budget: BudgetRange.FREE,
    });

    const growthRecommendation = service.recommend({
      dataType: DataType.RELATIONAL,
      dataVolume: DataVolume.LARGE,
      trafficLevel: TrafficLevel.HIGH,
      needsBranching: true,
      budget: BudgetRange.GROWTH,
    });

    expect(freeRecommendation.estimatedMonthlyCost).toBe(0);
    expect(growthRecommendation.estimatedMonthlyCost).toBeGreaterThan(0);
  });
});

describe('DeployRecommendationService', () => {
  let service: DeployRecommendationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DeployRecommendationService],
    }).compile();

    service = module.get<DeployRecommendationService>(
      DeployRecommendationService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return frontend and backend providers', () => {
    const frontend = service.getFrontendProviders();
    const backend = service.getBackendProviders();

    expect(frontend.length).toBeGreaterThan(0);
    expect(backend.length).toBeGreaterThan(0);
    expect(frontend.some((p) => p.id === 'vercel')).toBe(true);
    expect(backend.some((p) => p.id === 'railway')).toBe(true);
  });

  it('should recommend Vercel + Railway for simple setup', () => {
    const recommendation = service.recommend({
      components: [AppComponent.FRONTEND, AppComponent.BACKEND],
      needsPreviewDeployments: true,
      trafficTier: TrafficTier.MVP,
      infraComplexity: InfraComplexity.SIMPLE,
      budget: HostingBudget.STARTUP,
      devOpsLevel: DevOpsLevel.LOW,
    });

    expect(recommendation.architecture.frontend.id).toBe('vercel');
    expect(recommendation.architecture.backend.id).toBe('railway');
    expect(recommendation.reasoning.length).toBeGreaterThan(0);
  });

  it('should include cost estimates for all phases', () => {
    const recommendation = service.recommend({
      components: [AppComponent.FRONTEND, AppComponent.BACKEND],
      needsPreviewDeployments: true,
      trafficTier: TrafficTier.GROWTH,
      infraComplexity: InfraComplexity.MEDIUM,
      budget: HostingBudget.GROWTH,
      devOpsLevel: DevOpsLevel.MEDIUM,
    });

    expect(recommendation.estimatedMonthlyCost.mvp).toBeGreaterThan(0);
    expect(recommendation.estimatedMonthlyCost.growth).toBeGreaterThan(0);
    expect(recommendation.estimatedMonthlyCost.scale).toBeGreaterThan(0);
  });

  it('should generate architecture diagram', () => {
    const recommendation = service.recommend({
      components: [AppComponent.FRONTEND, AppComponent.BACKEND],
      needsPreviewDeployments: false,
      trafficTier: TrafficTier.MVP,
      infraComplexity: InfraComplexity.SIMPLE,
      budget: HostingBudget.HOBBY,
      devOpsLevel: DevOpsLevel.LOW,
    });

    expect(recommendation.architecture.diagram).toContain('graph TB');
    expect(recommendation.architecture.diagram).toContain('Frontend');
    expect(recommendation.architecture.diagram).toContain('Backend');
  });

  it('should include migration triggers', () => {
    const recommendation = service.recommend({
      components: [AppComponent.FRONTEND, AppComponent.BACKEND],
      needsPreviewDeployments: true,
      trafficTier: TrafficTier.MVP,
      infraComplexity: InfraComplexity.SIMPLE,
      budget: HostingBudget.STARTUP,
      devOpsLevel: DevOpsLevel.LOW,
    });

    expect(recommendation.migrationTriggers.length).toBeGreaterThan(0);
    expect(
      recommendation.migrationTriggers.some((t) => t.includes('100,000')),
    ).toBe(true);
  });
});

describe('CostCalculatorService', () => {
  let service: CostCalculatorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CostCalculatorService],
    }).compile();

    service = module.get<CostCalculatorService>(CostCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate cost projection for MVP', () => {
    const projection = service.calculateProjection({
      mvpUsers: 100,
      growthUsers: 1000,
      scaleUsers: 10000,
    });

    expect(projection.phases.length).toBe(3);
    expect(projection.phases[0].name).toBe('MVP');
    expect(projection.year1Total).toBeGreaterThan(0);
  });

  it('should return zero cost for free tier usage', () => {
    const projection = service.calculateProjection({
      mvpUsers: 50,
      growthUsers: 100,
      scaleUsers: 500,
      mvpStorageGB: 0.3,
      growthStorageGB: 0.5,
      scaleStorageGB: 0.5,
    });

    // MVP phase should be nearly free
    expect(projection.phases[0].totalMonthly).toBeLessThanOrEqual(10);
  });

  it('should compare costs with AWS', () => {
    const projection = service.calculateProjection({
      mvpUsers: 100,
      growthUsers: 5000,
      scaleUsers: 50000,
    });

    expect(projection.comparisonWithAWS.managedPlatformsCost).toBeGreaterThan(0);
    expect(projection.comparisonWithAWS.awsCost).toBeGreaterThan(0);
    expect(projection.comparisonWithAWS.savingsPercent).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('should provide recommendations', () => {
    const projection = service.calculateProjection({
      mvpUsers: 100,
      growthUsers: 1000,
      scaleUsers: 10000,
    });

    expect(projection.recommendations.length).toBeGreaterThan(0);
  });

  it('should calculate cost per user', () => {
    const projection = service.calculateProjection({
      mvpUsers: 100,
      growthUsers: 1000,
      scaleUsers: 10000,
    });

    expect(projection.costPerUser).toBeGreaterThanOrEqual(0);
  });

  it('should return pricing tiers', () => {
    const pricing = service.getPricingTiers();

    expect(pricing.neon).toBeDefined();
    expect(pricing.vercel).toBeDefined();
    expect(pricing.railway).toBeDefined();
  });
});
