import { Module } from '@nestjs/common';
import { RecommendationsController } from './recommendations.controller';
import { DatabaseRecommendationService } from './database-recommendation.service';
import { DeployRecommendationService } from './deploy-recommendation.service';
import { CostCalculatorService } from './cost-calculator.service';

@Module({
  controllers: [RecommendationsController],
  providers: [
    DatabaseRecommendationService,
    DeployRecommendationService,
    CostCalculatorService,
  ],
  exports: [
    DatabaseRecommendationService,
    DeployRecommendationService,
    CostCalculatorService,
  ],
})
export class RecommendationsModule {}
