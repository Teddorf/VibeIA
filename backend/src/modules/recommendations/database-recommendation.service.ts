import { Injectable } from '@nestjs/common';
import {
  DatabaseRequirementsDto,
  DatabaseProvider,
  DatabaseRecommendation,
  DataType,
  DataVolume,
  TrafficLevel,
  BudgetRange,
} from './dto/database-recommendation.dto';

@Injectable()
export class DatabaseRecommendationService {
  private providers: DatabaseProvider[] = [
    {
      id: 'neon',
      name: 'Neon',
      type: 'PostgreSQL Serverless',
      score: 0,
      pros: [
        'Database branching (unique feature)',
        'Serverless (scales to zero)',
        'Excellent free tier',
        'Instant setup',
        'Compatible with Prisma, Drizzle, TypeORM',
        'Automatic backups',
      ],
      cons: ['PostgreSQL only (no NoSQL)', 'Relatively new service'],
      pricing: {
        free: {
          storage: '0.5 GB',
          compute: '191.9 hours/month',
          price: '$0',
        },
        starter: { storage: '10 GB', compute: 'Unlimited', price: '$19/month' },
        pro: {
          storage: '50 GB',
          compute: 'Autoscaling',
          price: '$69/month',
        },
      },
      compatibility: {
        prisma: true,
        drizzle: true,
        typeorm: true,
        vercel: 'Native integration',
      },
      hasBranching: true,
    },
    {
      id: 'supabase',
      name: 'Supabase',
      type: 'PostgreSQL + BaaS',
      score: 0,
      pros: [
        'Built-in Auth',
        'Real-time subscriptions',
        'Storage included',
        'Row Level Security',
        'Great dashboard',
      ],
      cons: [
        'No database branching',
        'More expensive at scale',
        'Vendor lock-in for BaaS features',
      ],
      pricing: {
        free: { storage: '500 MB', compute: 'Shared', price: '$0' },
        starter: { storage: '8 GB', compute: 'Dedicated', price: '$25/month' },
        pro: { storage: '100 GB', compute: 'High perf', price: '$599/month' },
      },
      compatibility: {
        prisma: true,
        drizzle: true,
        typeorm: true,
        vercel: 'Integration available',
      },
      hasBranching: false,
    },
    {
      id: 'planetscale',
      name: 'PlanetScale',
      type: 'MySQL Serverless',
      score: 0,
      pros: [
        'Database branching',
        'Non-blocking schema changes',
        'Excellent for high traffic',
        'Good free tier',
      ],
      cons: [
        'MySQL only',
        'No foreign keys (Vitess limitation)',
        'Higher pricing at scale',
      ],
      pricing: {
        free: { storage: '5 GB', compute: '1B row reads', price: '$0' },
        starter: {
          storage: '10 GB',
          compute: '100B row reads',
          price: '$29/month',
        },
        pro: { storage: 'Unlimited', compute: 'Unlimited', price: '$39/month' },
      },
      compatibility: {
        prisma: true,
        drizzle: true,
        typeorm: true,
        vercel: 'Native integration',
      },
      hasBranching: true,
    },
    {
      id: 'mongodb-atlas',
      name: 'MongoDB Atlas',
      type: 'NoSQL Document DB',
      score: 0,
      pros: [
        'Flexible schema',
        'Great for document data',
        'Global clusters',
        'Built-in search',
      ],
      cons: [
        'No branching',
        'Expensive at scale',
        'Not ideal for relational data',
      ],
      pricing: {
        free: { storage: '512 MB', compute: 'Shared', price: '$0' },
        starter: { storage: '10 GB', compute: 'Dedicated', price: '$57/month' },
        pro: { storage: '100 GB', compute: 'High perf', price: '$230/month' },
      },
      compatibility: {
        prisma: true,
        drizzle: false,
        typeorm: true,
        vercel: 'Manual setup',
      },
      hasBranching: false,
    },
    {
      id: 'railway-postgres',
      name: 'Railway PostgreSQL',
      type: 'PostgreSQL Managed',
      score: 0,
      pros: [
        'Simple setup',
        'Pay-as-you-go',
        'Good for small projects',
        'Integrated with Railway hosting',
      ],
      cons: [
        'No branching',
        'Limited features',
        'Variable pricing can be unpredictable',
      ],
      pricing: {
        free: { storage: '$5 credit', compute: 'Shared', price: '$5 credit' },
        starter: {
          storage: '10 GB',
          compute: 'Dedicated',
          price: '~$20/month',
        },
        pro: { storage: '50 GB', compute: 'High perf', price: '~$50/month' },
      },
      compatibility: {
        prisma: true,
        drizzle: true,
        typeorm: true,
        vercel: 'Manual setup',
      },
      hasBranching: false,
    },
  ];

  recommend(requirements: DatabaseRequirementsDto): DatabaseRecommendation {
    const scoredProviders = this.scoreProviders(requirements);
    const sorted = scoredProviders.sort((a, b) => b.score - a.score);

    const primary = sorted[0];
    const alternatives = sorted.slice(1, 3);

    return {
      primary,
      alternatives,
      reasoning: this.generateReasoning(requirements, primary),
      estimatedMonthlyCost: this.estimateMonthlyCost(requirements, primary),
      migrationComplexity: this.assessMigrationComplexity(requirements),
    };
  }

  private scoreProviders(
    requirements: DatabaseRequirementsDto,
  ): DatabaseProvider[] {
    return this.providers.map((provider) => ({
      ...provider,
      score: this.calculateScore(provider, requirements),
    }));
  }

  private calculateScore(
    provider: DatabaseProvider,
    requirements: DatabaseRequirementsDto,
  ): number {
    let score = 50; // Base score

    // Data type scoring
    if (requirements.dataType === DataType.RELATIONAL) {
      if (
        provider.type.includes('PostgreSQL') ||
        provider.type.includes('MySQL')
      ) {
        score += 20;
      }
    } else if (requirements.dataType === DataType.DOCUMENT) {
      if (provider.type.includes('NoSQL') || provider.type.includes('MongoDB')) {
        score += 25;
      }
    } else if (requirements.dataType === DataType.MIXED) {
      if (provider.type.includes('PostgreSQL')) {
        score += 15; // PostgreSQL has good JSON support
      }
    }

    // Branching requirement
    if (requirements.needsBranching) {
      if (provider.hasBranching) {
        score += 25;
      } else {
        score -= 15;
      }
    }

    // Budget scoring
    if (requirements.budget === BudgetRange.FREE) {
      if (provider.pricing.free.price === '$0') {
        score += 15;
      }
    } else if (requirements.budget === BudgetRange.STARTUP) {
      const starterPrice = parseInt(
        provider.pricing.starter.price.replace(/\D/g, ''),
      );
      if (starterPrice <= 30) {
        score += 10;
      }
    }

    // Traffic level scoring
    if (requirements.trafficLevel === TrafficLevel.HIGH || requirements.trafficLevel === TrafficLevel.VERY_HIGH) {
      if (provider.id === 'neon' || provider.id === 'planetscale') {
        score += 15; // These are designed for high traffic
      }
    }

    // Data volume scoring
    if (requirements.dataVolume === DataVolume.LARGE || requirements.dataVolume === DataVolume.ENTERPRISE) {
      if (provider.id === 'mongodb-atlas' || provider.id === 'planetscale') {
        score += 10; // Better for large volumes
      }
    }

    // Additional features
    if (requirements.needsAuth && provider.id === 'supabase') {
      score += 20;
    }
    if (requirements.needsRealtime && provider.id === 'supabase') {
      score += 15;
    }
    if (requirements.needsStorage && provider.id === 'supabase') {
      score += 10;
    }

    return Math.min(100, Math.max(0, score));
  }

  private generateReasoning(
    requirements: DatabaseRequirementsDto,
    provider: DatabaseProvider,
  ): string[] {
    const reasons: string[] = [];

    if (requirements.dataType === DataType.RELATIONAL) {
      reasons.push(
        `PostgreSQL is ideal for relational data with strong ACID compliance`,
      );
    }

    if (requirements.needsBranching && provider.hasBranching) {
      reasons.push(
        `Database branching enables isolated development environments per Git branch`,
      );
    }

    if (requirements.budget === BudgetRange.FREE || requirements.budget === BudgetRange.STARTUP) {
      reasons.push(
        `${provider.name} offers a generous free tier suitable for MVP development`,
      );
    }

    if (provider.compatibility.vercel.includes('Native')) {
      reasons.push(`Native integration with Vercel simplifies deployment`);
    }

    reasons.push(
      `Compatible with popular ORMs: Prisma${provider.compatibility.drizzle ? ', Drizzle' : ''}${provider.compatibility.typeorm ? ', TypeORM' : ''}`,
    );

    return reasons;
  }

  private estimateMonthlyCost(
    requirements: DatabaseRequirementsDto,
    provider: DatabaseProvider,
  ): number {
    switch (requirements.budget) {
      case BudgetRange.FREE:
        return 0;
      case BudgetRange.STARTUP:
        return parseInt(provider.pricing.starter.price.replace(/\D/g, '')) || 20;
      case BudgetRange.GROWTH:
        return parseInt(provider.pricing.pro.price.replace(/\D/g, '')) || 70;
      case BudgetRange.ENTERPRISE:
        return 200;
      default:
        return 20;
    }
  }

  private assessMigrationComplexity(
    requirements: DatabaseRequirementsDto,
  ): 'low' | 'medium' | 'high' {
    if (requirements.dataVolume === DataVolume.ENTERPRISE) {
      return 'high';
    }
    if (requirements.dataVolume === DataVolume.LARGE) {
      return 'medium';
    }
    return 'low';
  }

  getProviders(): DatabaseProvider[] {
    return this.providers;
  }

  getProviderById(id: string): DatabaseProvider | undefined {
    return this.providers.find((p) => p.id === id);
  }
}
