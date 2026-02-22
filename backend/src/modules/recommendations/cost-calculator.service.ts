import { Injectable } from '@nestjs/common';
import {
  CostProjectionDto,
  PhaseCost,
  CostProjection,
} from './dto/cost-calculator.dto';
import { PRICING_DEFAULTS } from '../../config/defaults';

@Injectable()
export class CostCalculatorService {
  private neonPricing = PRICING_DEFAULTS.neon;
  private vercelPricing = PRICING_DEFAULTS.vercel;
  private railwayPricing = PRICING_DEFAULTS.railway;
  private awsEquivalent = PRICING_DEFAULTS.awsEquivalent;

  calculateProjection(dto: CostProjectionDto): CostProjection {
    const phases = [
      this.calculateMVPPhase(dto),
      this.calculateGrowthPhase(dto),
      this.calculateScalePhase(dto),
    ];

    const year1Total = this.calculateYear1Total(phases);
    const totalUsers = dto.scaleUsers * 30; // Monthly active users estimate
    const costPerUser = totalUsers > 0 ? year1Total / totalUsers : 0;

    return {
      phases,
      year1Total,
      costPerUser: Math.round(costPerUser * 100) / 100,
      breakEvenPoint: this.calculateBreakEvenPoint(phases),
      recommendations: this.generateRecommendations(dto, phases),
      comparisonWithAWS: this.compareWithAWS(phases),
    };
  }

  private calculateMVPPhase(dto: CostProjectionDto): PhaseCost {
    const storageGB = dto.mvpStorageGB || 0.5;
    const users = dto.mvpUsers;

    const databaseCost = this.calculateNeonCost(storageGB, users);
    const hostingCost = this.calculateVercelCost(users, 'mvp');
    const backendCost = this.calculateRailwayCost(users, 'mvp');

    const totalMonthly =
      databaseCost.monthly + hostingCost.monthly + backendCost.monthly;

    return {
      name: 'MVP',
      duration: 3, // months
      users,
      costs: {
        database: databaseCost,
        hosting: hostingCost,
        cache: backendCost, // Railway includes compute
      },
      totalMonthly,
      totalForPhase: totalMonthly * 3,
    };
  }

  private calculateGrowthPhase(dto: CostProjectionDto): PhaseCost {
    const storageGB = dto.growthStorageGB || 5;
    const users = dto.growthUsers;

    const databaseCost = this.calculateNeonCost(storageGB, users);
    const hostingCost = this.calculateVercelCost(users, 'growth');
    const backendCost = this.calculateRailwayCost(users, 'growth');

    const totalMonthly =
      databaseCost.monthly + hostingCost.monthly + backendCost.monthly;

    return {
      name: 'Growth',
      duration: 6, // months
      users,
      costs: {
        database: databaseCost,
        hosting: hostingCost,
        cache: backendCost,
      },
      totalMonthly,
      totalForPhase: totalMonthly * 6,
    };
  }

  private calculateScalePhase(dto: CostProjectionDto): PhaseCost {
    const storageGB = dto.scaleStorageGB || 25;
    const users = dto.scaleUsers;

    const databaseCost = this.calculateNeonCost(storageGB, users);
    const hostingCost = this.calculateVercelCost(users, 'scale');
    const backendCost = this.calculateRailwayCost(users, 'scale');

    const totalMonthly =
      databaseCost.monthly + hostingCost.monthly + backendCost.monthly;

    return {
      name: 'Scale',
      duration: 12, // months (ongoing)
      users,
      costs: {
        database: databaseCost,
        hosting: hostingCost,
        cache: backendCost,
      },
      totalMonthly,
      totalForPhase: totalMonthly * 12,
    };
  }

  private calculateNeonCost(
    storageGB: number,
    _usersPerDay: number,
  ): { provider: string; tier: string; monthly: number } {
    if (storageGB <= this.neonPricing.free.maxStorage) {
      return { provider: 'Neon', tier: 'Free', monthly: 0 };
    }

    if (storageGB <= this.neonPricing.launch.maxStorage) {
      return {
        provider: 'Neon',
        tier: 'Launch',
        monthly: this.neonPricing.launch.monthly,
      };
    }

    if (storageGB <= this.neonPricing.scale.maxStorage) {
      return {
        provider: 'Neon',
        tier: 'Scale',
        monthly: this.neonPricing.scale.monthly,
      };
    }

    const extraStorage = storageGB - 50;
    const monthly =
      this.neonPricing.business.baseMonthly +
      extraStorage * this.neonPricing.business.extraStoragePerGB;

    return { provider: 'Neon', tier: 'Business', monthly: Math.round(monthly) };
  }

  private calculateVercelCost(
    usersPerDay: number,
    phase: string,
  ): { provider: string; tier: string; monthly: number } {
    if (phase === 'mvp' && usersPerDay < 1000) {
      return {
        provider: 'Vercel',
        tier: 'Hobby',
        monthly: this.vercelPricing.hobby.monthly,
      };
    }

    return {
      provider: 'Vercel',
      tier: 'Pro',
      monthly: this.vercelPricing.pro.monthly,
    };
  }

  private calculateRailwayCost(
    usersPerDay: number,
    phase: string,
  ): { provider: string; tier: string; monthly: number } {
    if (phase === 'mvp' || usersPerDay < 1000) {
      return {
        provider: 'Railway',
        tier: 'Hobby',
        monthly: this.railwayPricing.hobby.monthly,
      };
    }

    if (phase === 'growth' || usersPerDay < 10000) {
      return {
        provider: 'Railway',
        tier: 'Starter',
        monthly: this.railwayPricing.starter.monthly,
      };
    }

    if (usersPerDay < 50000) {
      return {
        provider: 'Railway',
        tier: 'Pro',
        monthly: this.railwayPricing.pro.monthly,
      };
    }

    return {
      provider: 'Railway',
      tier: 'Scale',
      monthly: this.railwayPricing.scale.monthly,
    };
  }

  private calculateYear1Total(phases: PhaseCost[]): number {
    // MVP: 3 months, Growth: 6 months, Scale: 3 months = 12 months
    const mvpCost = phases[0].totalMonthly * 3;
    const growthCost = phases[1].totalMonthly * 6;
    const scaleCost = phases[2].totalMonthly * 3;

    return Math.round(mvpCost + growthCost + scaleCost);
  }

  private calculateBreakEvenPoint(phases: PhaseCost[]): string {
    const avgMonthlyCost =
      phases.reduce((sum, p) => sum + p.totalMonthly, 0) / phases.length;

    if (avgMonthlyCost < 50) {
      return 'Minimal costs - focus on user acquisition';
    }

    if (avgMonthlyCost < 200) {
      return '~100 paying users at $5/month to cover infrastructure';
    }

    return `~${Math.ceil(avgMonthlyCost / 10)} paying users at $10/month to cover infrastructure`;
  }

  private generateRecommendations(
    dto: CostProjectionDto,
    phases: PhaseCost[],
  ): string[] {
    const recommendations: string[] = [];

    // MVP recommendations
    if (phases[0].totalMonthly === 0 || phases[0].totalMonthly <= 5) {
      recommendations.push(
        'MVP phase is nearly free - great for validation without financial risk',
      );
    }

    // Storage recommendations
    if ((dto.scaleStorageGB || 0) > 50) {
      recommendations.push(
        'Consider Neon Business tier or migrating to self-managed PostgreSQL for large storage needs',
      );
    }

    // Traffic recommendations
    if (dto.scaleUsers > 50000) {
      recommendations.push(
        'At this scale, evaluate CDN options for static assets to reduce Vercel bandwidth costs',
      );
    }

    // Cost optimization
    if (phases[2].totalMonthly > 300) {
      recommendations.push(
        'Consider reserved instances or committed use discounts when reaching scale phase',
      );
    }

    // General advice
    recommendations.push(
      'Monitor actual usage - managed platforms allow easy scaling up/down as needed',
    );

    return recommendations;
  }

  private compareWithAWS(phases: PhaseCost[]): {
    managedPlatformsCost: number;
    awsCost: number;
    savings: number;
    savingsPercent: number;
  } {
    const managedPlatformsCost =
      phases[0].totalForPhase +
      phases[1].totalForPhase +
      phases[2].totalMonthly * 3;

    const awsCost =
      this.awsEquivalent.mvp * 3 +
      this.awsEquivalent.growth * 6 +
      this.awsEquivalent.scale * 3;

    const savings = awsCost - managedPlatformsCost;
    const savingsPercent = Math.round((savings / awsCost) * 100);

    return {
      managedPlatformsCost: Math.round(managedPlatformsCost),
      awsCost,
      savings: Math.round(savings),
      savingsPercent: Math.max(0, savingsPercent),
    };
  }

  // Get pricing details for display
  getPricingTiers() {
    return {
      neon: this.neonPricing,
      vercel: this.vercelPricing,
      railway: this.railwayPricing,
    };
  }
}
