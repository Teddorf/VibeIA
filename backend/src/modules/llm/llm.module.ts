import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { InputSanitizer } from './sanitization/input-sanitizer';

@Module({
  providers: [LlmService, InputSanitizer],
  exports: [LlmService, InputSanitizer],
})
export class LlmModule {}
