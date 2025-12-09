import { Controller, Post, Get, Body } from '@nestjs/common';
import { DatabaseRecommendationService } from './database-recommendation.service';
import { DeployRecommendationService } from './deploy-recommendation.service';
import { CostCalculatorService } from './cost-calculator.service';
import { DatabaseRequirementsDto } from './dto/database-recommendation.dto';
import { DeployRequirementsDto } from './dto/deploy-recommendation.dto';
import { CostProjectionDto } from './dto/cost-calculator.dto';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/recommendations')
export class RecommendationsController {
  constructor(
    private readonly databaseService: DatabaseRecommendationService,
    private readonly deployService: DeployRecommendationService,
    private readonly costService: CostCalculatorService,
  ) {}

  // Database Recommendations
  @Public()
  @Post('database')
  getDatabaseRecommendation(@Body() requirements: DatabaseRequirementsDto) {
    return this.databaseService.recommend(requirements);
  }

  @Public()
  @Get('database/providers')
  getDatabaseProviders() {
    return this.databaseService.getProviders();
  }

  // Deploy Recommendations
  @Public()
  @Post('deploy')
  getDeployRecommendation(@Body() requirements: DeployRequirementsDto) {
    return this.deployService.recommend(requirements);
  }

  @Public()
  @Get('deploy/providers')
  getDeployProviders() {
    return {
      frontend: this.deployService.getFrontendProviders(),
      backend: this.deployService.getBackendProviders(),
    };
  }

  // Cost Calculator
  @Public()
  @Post('cost')
  calculateCostProjection(@Body() dto: CostProjectionDto) {
    return this.costService.calculateProjection(dto);
  }

  @Public()
  @Get('cost/pricing')
  getPricingTiers() {
    return this.costService.getPricingTiers();
  }

  // Combined recommendation for wizard
  @Public()
  @Post('full')
  getFullRecommendation(
    @Body()
    body: {
      database: DatabaseRequirementsDto;
      deploy: DeployRequirementsDto;
      cost: CostProjectionDto;
    },
  ) {
    return {
      database: this.databaseService.recommend(body.database),
      deploy: this.deployService.recommend(body.deploy),
      cost: this.costService.calculateProjection(body.cost),
    };
  }
}
