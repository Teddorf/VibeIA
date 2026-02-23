import { Injectable, Logger } from '@nestjs/common';
import { LLM_DEFAULTS } from '../config/defaults';

export interface PromptModule {
  id: string;
  content: string;
  tokenCount: number;
  applicableTo: string[];
  requiredFor: string[];
}

@Injectable()
export class PromptCompiler {
  private readonly logger = new Logger(PromptCompiler.name);
  private readonly modules = new Map<string, PromptModule>();

  registerModule(module: PromptModule): void {
    this.modules.set(module.id, module);
  }

  compileSystemPrompt(
    agentId: string,
    taskType: string,
    additionalModules: string[] = [],
  ): string {
    const applicable = Array.from(this.modules.values()).filter(
      (m) =>
        m.applicableTo.includes(agentId) ||
        m.applicableTo.includes(taskType) ||
        m.applicableTo.includes('*') ||
        additionalModules.includes(m.id),
    );

    // Sort by required first, then by token count (smaller first)
    applicable.sort((a, b) => {
      const aRequired =
        a.requiredFor.includes(agentId) || a.requiredFor.includes(taskType);
      const bRequired =
        b.requiredFor.includes(agentId) || b.requiredFor.includes(taskType);
      if (aRequired && !bRequired) return -1;
      if (!aRequired && bRequired) return 1;
      return a.tokenCount - b.tokenCount;
    });

    const parts = applicable.map((m) => m.content);
    const compiled = parts.join('\n\n');

    this.logger.debug(
      `Compiled system prompt for ${agentId}/${taskType}: ${applicable.length} modules, ~${this.estimateTokens(compiled)} tokens`,
    );

    return compiled;
  }

  getModuleCount(): number {
    return this.modules.size;
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / LLM_DEFAULTS.charsPerToken);
  }
}
