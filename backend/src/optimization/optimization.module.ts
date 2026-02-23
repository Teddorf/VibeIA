import { Module } from '@nestjs/common';
import { AgentsModule } from '../agents/agents.module';
import { PromptCompiler } from './prompt-compiler';
import { DecisionCache } from './decision-cache';
import { EarlyTermination } from './early-termination';
import { CostTracker } from './cost-tracker';
import { LLMRateLimiter } from './llm-rate-limiter';

@Module({
  imports: [AgentsModule],
  providers: [
    PromptCompiler,
    DecisionCache,
    EarlyTermination,
    CostTracker,
    LLMRateLimiter,
  ],
  exports: [
    PromptCompiler,
    DecisionCache,
    EarlyTermination,
    CostTracker,
    LLMRateLimiter,
  ],
})
export class OptimizationModule {}
