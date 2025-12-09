import { Injectable } from '@nestjs/common';
import {
  DeployRequirementsDto,
  DeployProvider,
  DeployRecommendation,
  DeployArchitecture,
  AppComponent,
  TrafficTier,
  InfraComplexity,
  HostingBudget,
  DevOpsLevel,
} from './dto/deploy-recommendation.dto';

@Injectable()
export class DeployRecommendationService {
  private frontendProviders: DeployProvider[] = [
    {
      id: 'vercel',
      name: 'Vercel',
      type: 'frontend',
      score: 0,
      setupTime: '5 min',
      developerExperience: 5,
      pricing: {
        hobby: {
          price: '$0',
          includes: ['Unlimited sites', '100 GB bandwidth', 'Preview deploys'],
        },
        pro: {
          price: '$20/month',
          includes: [
            'Unlimited bandwidth',
            'Analytics',
            'Password protection',
          ],
        },
        team: {
          price: '$20/member/month',
          includes: ['Team features', 'Advanced analytics', 'SLA'],
        },
      },
      features: [
        'Automatic deployments from Git',
        'Preview deployments per PR',
        'Edge functions',
        'Built-in CDN',
        'Automatic HTTPS',
        'Analytics',
      ],
      limitations: [
        'Serverless function timeout 10s (Hobby) / 60s (Pro)',
        'Build time limit 45 min',
      ],
    },
    {
      id: 'netlify',
      name: 'Netlify',
      type: 'frontend',
      score: 0,
      setupTime: '5 min',
      developerExperience: 4,
      pricing: {
        hobby: {
          price: '$0',
          includes: ['100 GB bandwidth', '300 build minutes', 'Preview deploys'],
        },
        pro: {
          price: '$19/month',
          includes: ['Unlimited bandwidth', 'Forms', 'Identity'],
        },
        team: {
          price: '$99/month',
          includes: ['Team features', 'SSO', 'SLA'],
        },
      },
      features: [
        'Automatic deployments',
        'Preview deployments',
        'Serverless functions',
        'Forms handling',
        'Identity/Auth',
      ],
      limitations: [
        'Build minutes limited on free tier',
        'Some features require paid addons',
      ],
    },
  ];

  private backendProviders: DeployProvider[] = [
    {
      id: 'railway',
      name: 'Railway',
      type: 'backend',
      score: 0,
      setupTime: '10 min',
      developerExperience: 5,
      pricing: {
        hobby: {
          price: '$5 credit',
          includes: ['$5 free usage', '512 MB RAM', '1 GB disk'],
        },
        pro: {
          price: 'Usage-based',
          includes: ['8 GB RAM', 'Unlimited services', 'Private networking'],
        },
        team: {
          price: '$20/seat + usage',
          includes: ['Team features', 'Priority support', 'SOC 2'],
        },
      },
      features: [
        'One-click deploys',
        'Built-in PostgreSQL, Redis, MySQL',
        'Automatic HTTPS',
        'Environment variables',
        'Logs and metrics',
        'Private networking',
      ],
      limitations: [
        'Usage-based pricing can be unpredictable',
        'Limited to 512MB RAM on hobby',
      ],
    },
    {
      id: 'render',
      name: 'Render',
      type: 'backend',
      score: 0,
      setupTime: '10 min',
      developerExperience: 4,
      pricing: {
        hobby: {
          price: '$0',
          includes: ['Free tier services', '750 hours/month', 'Auto sleep'],
        },
        pro: {
          price: '$7/month',
          includes: ['Always on', '512 MB RAM', 'Custom domains'],
        },
        team: {
          price: '$19/month',
          includes: ['1 GB RAM', 'Priority builds', 'Persistent disk'],
        },
      },
      features: [
        'Free tier for web services',
        'Managed PostgreSQL',
        'Managed Redis',
        'Auto-scaling',
        'DDoS protection',
      ],
      limitations: [
        'Free tier services sleep after 15 min',
        'Cold starts on free tier',
      ],
    },
    {
      id: 'fly',
      name: 'Fly.io',
      type: 'backend',
      score: 0,
      setupTime: '15 min',
      developerExperience: 4,
      pricing: {
        hobby: {
          price: '$0',
          includes: ['3 shared VMs', '3 GB storage', '160 GB bandwidth'],
        },
        pro: {
          price: 'Usage-based',
          includes: ['Dedicated VMs', 'Unlimited apps', 'Priority support'],
        },
        team: {
          price: '$29/month + usage',
          includes: ['Team features', 'SOC 2', 'Private networking'],
        },
      },
      features: [
        'Global edge deployment',
        'Built-in PostgreSQL',
        'Persistent volumes',
        'Auto-scaling',
        'Machines API',
      ],
      limitations: [
        'CLI-focused workflow',
        'Steeper learning curve',
        'Docker knowledge required',
      ],
    },
  ];

  recommend(requirements: DeployRequirementsDto): DeployRecommendation {
    const scoredFrontend = this.scoreFrontendProviders(requirements);
    const scoredBackend = this.scoreBackendProviders(requirements);

    const bestFrontend = scoredFrontend.sort((a, b) => b.score - a.score)[0];
    const bestBackend = scoredBackend.sort((a, b) => b.score - a.score)[0];

    const primaryArchitecture = this.buildArchitecture(
      bestFrontend,
      bestBackend,
      requirements,
    );

    const alternatives = this.buildAlternatives(
      scoredFrontend,
      scoredBackend,
      requirements,
    );

    return {
      architecture: primaryArchitecture,
      alternatives,
      reasoning: this.generateReasoning(requirements, primaryArchitecture),
      estimatedSetupTime: this.calculateSetupTime(primaryArchitecture),
      estimatedMonthlyCost: this.calculateCosts(requirements),
      migrationTriggers: this.getMigrationTriggers(),
    };
  }

  private scoreFrontendProviders(
    requirements: DeployRequirementsDto,
  ): DeployProvider[] {
    return this.frontendProviders.map((provider) => ({
      ...provider,
      score: this.calculateFrontendScore(provider, requirements),
    }));
  }

  private scoreBackendProviders(
    requirements: DeployRequirementsDto,
  ): DeployProvider[] {
    return this.backendProviders.map((provider) => ({
      ...provider,
      score: this.calculateBackendScore(provider, requirements),
    }));
  }

  private calculateFrontendScore(
    provider: DeployProvider,
    requirements: DeployRequirementsDto,
  ): number {
    let score = 50;

    // Preview deployments bonus
    if (requirements.needsPreviewDeployments && provider.id === 'vercel') {
      score += 20;
    }

    // Budget scoring
    if (requirements.budget === HostingBudget.HOBBY) {
      if (provider.pricing.hobby.price === '$0') {
        score += 15;
      }
    }

    // DevOps level
    if (requirements.devOpsLevel === DevOpsLevel.LOW) {
      score += provider.developerExperience * 3;
    }

    // Traffic tier
    if (requirements.trafficTier === TrafficTier.GROWTH || requirements.trafficTier === TrafficTier.SCALE) {
      if (provider.id === 'vercel') {
        score += 15; // Better for high traffic
      }
    }

    return Math.min(100, score);
  }

  private calculateBackendScore(
    provider: DeployProvider,
    requirements: DeployRequirementsDto,
  ): number {
    let score = 50;

    // Component requirements
    if (
      requirements.components.includes(AppComponent.WORKERS) &&
      provider.id === 'railway'
    ) {
      score += 15;
    }

    if (
      requirements.components.includes(AppComponent.WEBSOCKET) &&
      (provider.id === 'railway' || provider.id === 'fly')
    ) {
      score += 15;
    }

    // Budget scoring
    if (requirements.budget === HostingBudget.HOBBY) {
      if (provider.id === 'render') {
        score += 20; // Best free tier
      }
    } else if (requirements.budget === HostingBudget.STARTUP) {
      if (provider.id === 'railway') {
        score += 15;
      }
    }

    // Infrastructure complexity
    if (requirements.infraComplexity === InfraComplexity.COMPLEX) {
      if (provider.id === 'railway' || provider.id === 'fly') {
        score += 10;
      }
    }

    // DevOps level
    if (requirements.devOpsLevel === DevOpsLevel.LOW) {
      score += provider.developerExperience * 3;
    } else if (requirements.devOpsLevel === DevOpsLevel.HIGH) {
      if (provider.id === 'fly') {
        score += 15; // More control
      }
    }

    return Math.min(100, score);
  }

  private buildArchitecture(
    frontend: DeployProvider,
    backend: DeployProvider,
    requirements: DeployRequirementsDto,
  ): DeployArchitecture {
    const needsCache = requirements.infraComplexity !== InfraComplexity.SIMPLE;
    const needsStorage = requirements.infraComplexity === InfraComplexity.COMPLEX;

    return {
      frontend,
      backend,
      database: 'Neon PostgreSQL',
      cache: needsCache ? 'Railway Redis' : undefined,
      storage: needsStorage ? 'AWS S3 / Cloudflare R2' : undefined,
      diagram: this.generateMermaidDiagram(frontend, backend, needsCache, needsStorage),
    };
  }

  private generateMermaidDiagram(
    frontend: DeployProvider,
    backend: DeployProvider,
    hasCache: boolean,
    hasStorage: boolean,
  ): string {
    let diagram = `graph TB
    subgraph Frontend
        FE[${frontend.name}<br/>Next.js]
    end

    subgraph Backend
        BE[${backend.name}<br/>NestJS]
    end

    subgraph Database
        DB[(Neon<br/>PostgreSQL)]
    end

    FE <--> BE
    BE <--> DB`;

    if (hasCache) {
      diagram += `

    subgraph Cache
        REDIS[(Redis)]
    end
    BE <--> REDIS`;
    }

    if (hasStorage) {
      diagram += `

    subgraph Storage
        S3[(S3/R2)]
    end
    BE <--> S3`;
    }

    return diagram;
  }

  private buildAlternatives(
    frontendProviders: DeployProvider[],
    backendProviders: DeployProvider[],
    requirements: DeployRequirementsDto,
  ): DeployArchitecture[] {
    const alternatives: DeployArchitecture[] = [];
    const sortedFrontend = frontendProviders.sort((a, b) => b.score - a.score);
    const sortedBackend = backendProviders.sort((a, b) => b.score - a.score);

    // Alternative 1: Different backend
    if (sortedBackend.length > 1) {
      alternatives.push(
        this.buildArchitecture(sortedFrontend[0], sortedBackend[1], requirements),
      );
    }

    // Alternative 2: Different frontend + different backend
    if (sortedFrontend.length > 1 && sortedBackend.length > 1) {
      alternatives.push(
        this.buildArchitecture(sortedFrontend[1], sortedBackend[1], requirements),
      );
    }

    return alternatives.slice(0, 2);
  }

  private generateReasoning(
    requirements: DeployRequirementsDto,
    architecture: DeployArchitecture,
  ): string[] {
    const reasons: string[] = [];

    reasons.push(
      `${architecture.frontend.name} provides excellent DX with automatic deployments and preview environments`,
    );
    reasons.push(
      `${architecture.backend.name} offers simple setup with built-in databases and good pricing`,
    );

    if (requirements.needsPreviewDeployments) {
      reasons.push('Preview deployments enable easy PR reviews and testing');
    }

    if (requirements.devOpsLevel === DevOpsLevel.LOW) {
      reasons.push(
        'This stack minimizes DevOps overhead with managed infrastructure',
      );
    }

    if (architecture.cache) {
      reasons.push('Redis cache improves performance for high-traffic scenarios');
    }

    return reasons;
  }

  private calculateSetupTime(architecture: DeployArchitecture): string {
    const frontendTime = parseInt(architecture.frontend.setupTime) || 10;
    const backendTime = parseInt(architecture.backend.setupTime) || 15;
    const total = frontendTime + backendTime + 10; // +10 for database
    return `~${total} minutes`;
  }

  private calculateCosts(requirements: DeployRequirementsDto): {
    mvp: number;
    growth: number;
    scale: number;
  } {
    switch (requirements.budget) {
      case HostingBudget.HOBBY:
        return { mvp: 5, growth: 74, scale: 189 };
      case HostingBudget.STARTUP:
        return { mvp: 25, growth: 100, scale: 250 };
      case HostingBudget.GROWTH:
        return { mvp: 50, growth: 150, scale: 400 };
      case HostingBudget.ENTERPRISE:
        return { mvp: 100, growth: 300, scale: 800 };
      default:
        return { mvp: 5, growth: 74, scale: 189 };
    }
  }

  private getMigrationTriggers(): string[] {
    return [
      '> 100,000 users/day',
      '> $500/month in costs',
      'Need for HIPAA, SOC2 compliance',
      'Dedicated DevOps team (3+ engineers)',
      'Custom infrastructure requirements',
    ];
  }

  getFrontendProviders(): DeployProvider[] {
    return this.frontendProviders;
  }

  getBackendProviders(): DeployProvider[] {
    return this.backendProviders;
  }
}
