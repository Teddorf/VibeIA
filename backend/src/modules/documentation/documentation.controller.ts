import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { DocumentationService } from './documentation.service';
import { AdrGeneratorService } from './adr-generator.service';
import { DiagramGeneratorService } from './diagram-generator.service';
import { ApiDocsGeneratorService } from './api-docs-generator.service';
import { Public } from '../auth/decorators/public.decorator';
import {
  GenerateDocumentationDto,
  GenerateADRDto,
  GenerateDiagramDto,
  DocumentationType,
  DiagramType,
} from './dto/documentation.dto';

@Controller('api/documentation')
export class DocumentationController {
  constructor(
    private readonly documentationService: DocumentationService,
    private readonly adrGenerator: AdrGeneratorService,
    private readonly diagramGenerator: DiagramGeneratorService,
    private readonly apiDocsGenerator: ApiDocsGeneratorService,
  ) {}

  @Public()
  @Post('generate')
  generateDocument(@Body() dto: GenerateDocumentationDto) {
    return this.documentationService.generateDocument(dto);
  }

  @Public()
  @Post('adr')
  generateADR(@Body() dto: GenerateADRDto) {
    return this.documentationService.generateADR(dto);
  }

  @Public()
  @Post('diagram')
  generateDiagram(@Body() dto: GenerateDiagramDto) {
    return this.documentationService.generateDiagram(dto);
  }

  @Public()
  @Post('api-docs')
  generateAPIDocs(
    @Body()
    body: {
      title: string;
      version: string;
      description: string;
      baseUrl: string;
      endpoints: any[];
      schemas?: Record<string, any>;
    },
  ) {
    const docs = this.documentationService.generateAPIDocumentation(
      body.title,
      body.version,
      body.description,
      body.baseUrl,
      body.endpoints,
      body.schemas,
    );

    return {
      ...docs,
      markdown: this.apiDocsGenerator.generateMarkdownDocs(docs),
    };
  }

  @Public()
  @Post('full')
  generateFullDocumentation(
    @Body()
    body: {
      projectName: string;
      projectDescription: string;
      features: string[];
      stack: { frontend: string; backend: string; database: string };
    },
  ) {
    return this.documentationService.generateFullDocumentation(
      body.projectName,
      body.projectDescription,
      body.features,
      body.stack,
    );
  }

  @Public()
  @Post('feature')
  generateFeatureDocumentation(
    @Body()
    body: {
      featureName: string;
      featureDescription: string;
      components: { name: string; description: string }[];
      apiEndpoints: any[];
      dataModels: { name: string; fields: string[] }[];
    },
  ) {
    return this.documentationService.generateFeatureDocumentation(
      body.featureName,
      body.featureDescription,
      body.components,
      body.apiEndpoints,
      body.dataModels,
    );
  }

  @Public()
  @Post('crud-endpoints')
  generateCRUDEndpoints(
    @Body()
    body: {
      resourceName: string;
      resourcePlural: string;
      schema: Record<string, { type: string; description?: string }>;
    },
  ) {
    return this.apiDocsGenerator.generateCRUDEndpoints(
      body.resourceName,
      body.resourcePlural,
      body.schema,
    );
  }

  @Public()
  @Post('system-diagram')
  generateSystemDiagram(
    @Body()
    body: {
      components: { name: string; type: string }[];
      connections: { from: string; to: string; label?: string }[];
    },
  ) {
    return this.diagramGenerator.generateSystemArchitectureDiagram(
      body.components,
      body.connections,
    );
  }

  @Public()
  @Post('data-model-diagram')
  generateDataModelDiagram(
    @Body()
    body: {
      models: { name: string; fields: string[] }[];
      relations: { from: string; to: string; type: string; label?: string }[];
    },
  ) {
    return this.diagramGenerator.generateDataModelDiagram(
      body.models,
      body.relations,
    );
  }

  @Public()
  @Post('feature-flow-diagram')
  generateFeatureFlowDiagram(
    @Body()
    body: {
      featureName: string;
      actors: string[];
      flow: { from: string; action: string; to: string }[];
    },
  ) {
    return this.diagramGenerator.generateFeatureFlowDiagram(
      body.featureName,
      body.actors,
      body.flow,
    );
  }

  @Public()
  @Post('database-adr')
  generateDatabaseADR(
    @Body()
    body: {
      dbProvider: string;
      reasoning: string[];
      alternatives: { name: string; rejected_reason: string }[];
    },
  ) {
    return this.adrGenerator.generateDatabaseADR(
      body.dbProvider,
      body.reasoning,
      body.alternatives,
    );
  }

  @Public()
  @Post('architecture-adr')
  generateArchitectureADR(
    @Body()
    body: {
      pattern: string;
      description: string;
      pros: string[];
      cons: string[];
    },
  ) {
    return this.adrGenerator.generateArchitectureADR(
      body.pattern,
      body.description,
      body.pros,
      body.cons,
    );
  }

  @Public()
  @Get('types')
  getDocumentationTypes() {
    return {
      documentTypes: Object.values(DocumentationType),
      diagramTypes: Object.values(DiagramType),
    };
  }
}
