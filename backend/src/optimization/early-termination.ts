import { Injectable, Logger } from '@nestjs/common';
import { LLMStreamChunk } from '../providers/interfaces/llm-provider.interface';

export interface StopCondition {
  pattern: RegExp;
  action: 'abort' | 'warn';
  reason: string;
}

export interface EarlyTerminationResult {
  output: string;
  terminated: boolean;
  reason?: string;
}

const DEFAULT_STOP_CONDITIONS: StopCondition[] = [
  {
    pattern: /error:\s*maximum\s*(?:context|token)\s*length/i,
    action: 'abort',
    reason: 'Token limit exceeded',
  },
  {
    pattern:
      /(?:I\s+(?:cannot|can't|am unable to))\s+(?:generate|create|write)/i,
    action: 'abort',
    reason: 'LLM refused to generate',
  },
  {
    pattern: /(?:infinite|endless)\s+loop/i,
    action: 'abort',
    reason: 'Infinite loop detected',
  },
  {
    pattern: /(?:I\s+don't\s+understand|unclear\s+(?:what|how))/i,
    action: 'warn',
    reason: 'LLM indicates confusion',
  },
];

@Injectable()
export class EarlyTermination {
  private readonly logger = new Logger(EarlyTermination.name);

  executeWithEarlyTermination(
    output: string,
    stopConditions: StopCondition[] = DEFAULT_STOP_CONDITIONS,
  ): EarlyTerminationResult {
    for (const condition of stopConditions) {
      if (condition.pattern.test(output)) {
        this.logger.warn(
          `Early termination triggered: ${condition.reason} (action: ${condition.action})`,
        );

        if (condition.action === 'abort') {
          return {
            output,
            terminated: true,
            reason: condition.reason,
          };
        }
      }
    }

    return { output, terminated: false };
  }

  async *streamWithEarlyTermination(
    source: AsyncIterable<LLMStreamChunk>,
    stopConditions: StopCondition[] = DEFAULT_STOP_CONDITIONS,
  ): AsyncGenerator<LLMStreamChunk> {
    let accumulated = '';
    for await (const chunk of source) {
      accumulated += chunk.delta;
      // Check stop conditions on accumulated text
      for (const condition of stopConditions) {
        if (
          condition.action === 'abort' &&
          condition.pattern.test(accumulated)
        ) {
          this.logger.warn(`Stream early termination: ${condition.reason}`);
          yield { delta: '', finishReason: 'stop' };
          return;
        }
      }
      yield chunk;
    }
  }

  getDefaultStopConditions(): StopCondition[] {
    return [...DEFAULT_STOP_CONDITIONS];
  }
}
