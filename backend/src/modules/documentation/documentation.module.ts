import { Module } from '@nestjs/common';
import { DocumentationController } from './documentation.controller';
import { DocumentationService } from './documentation.service';
import { AdrGeneratorService } from './adr-generator.service';
import { DiagramGeneratorService } from './diagram-generator.service';
import { ApiDocsGeneratorService } from './api-docs-generator.service';

@Module({
  controllers: [DocumentationController],
  providers: [
    DocumentationService,
    AdrGeneratorService,
    DiagramGeneratorService,
    ApiDocsGeneratorService,
  ],
  exports: [
    DocumentationService,
    AdrGeneratorService,
    DiagramGeneratorService,
    ApiDocsGeneratorService,
  ],
})
export class DocumentationModule {}
