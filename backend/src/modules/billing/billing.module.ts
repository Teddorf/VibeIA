import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { SubscriptionService } from './subscription.service';
import { UsageService } from './usage.service';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [BillingController],
  providers: [SubscriptionService, UsageService, AnalyticsService],
  exports: [SubscriptionService, UsageService, AnalyticsService],
})
export class BillingModule {}
