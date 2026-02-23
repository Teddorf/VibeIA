import { Module } from '@nestjs/common';
import { PromptCompiler } from './prompt-compiler';
import { DecisionCache } from './decision-cache';
import { EarlyTermination } from './early-termination';
import { CostTracker } from './cost-tracker';

@Module({
  providers: [PromptCompiler, DecisionCache, EarlyTermination, CostTracker],
  exports: [PromptCompiler, DecisionCache, EarlyTermination, CostTracker],
})
export class OptimizationModule {}
