import { Injectable } from '@nestjs/common';
import { AdrGeneratorService } from './adr-generator.service';
import { DiagramGeneratorService } from './diagram-generator.service';
import { ApiDocsGeneratorService } from './api-docs-generator.service';
import {
  DocumentationType,
  GenerateDocumentationDto,
  GenerateADRDto,
  GenerateDiagramDto,
  GeneratedDocument,
  ADRDocument,
  MermaidDiagram,
  APIDocumentation,
  DocumentationStructure,
  DiagramType,
} from './dto/documentation.dto';

@Injectable()
export class DocumentationService {
  constructor(
    private readonly adrGenerator: AdrGeneratorService,
    private readonly diagramGenerator: DiagramGeneratorService,
    private readonly apiDocsGenerator: ApiDocsGeneratorService,
  ) {}

  generateDocument(dto: GenerateDocumentationDto): GeneratedDocument {
    const createdAt = new Date();
    let content: string;
    let title: string;
    let filePath: string;

    switch (dto.type) {
      case DocumentationType.README:
        title = 'README';
        content = this.generateReadme(dto);
        filePath = 'README.md';
        break;

      case DocumentationType.ARCHITECTURE:
        title = 'Architecture Overview';
        content = this.generateArchitectureDoc(dto);
        filePath = 'docs/ARCHITECTURE.md';
        break;

      case DocumentationType.CHANGELOG:
        title = 'Changelog';
        content = this.generateChangelog(dto);
        filePath = 'CHANGELOG.md';
        break;

      case DocumentationType.COMPONENT:
        title = dto.context?.featureName || 'Component';
        content = this.generateComponentDoc(dto);
        filePath = `docs/components/${this.slugify(title)}.md`;
        break;

      default:
        title = 'Documentation';
        content = '# Documentation\n\nNo content generated.';
        filePath = 'docs/README.md';
    }

    return {
      type: dto.type,
      title,
      content,
      filePath,
      createdAt,
    };
  }

  generateADR(dto: GenerateADRDto): ADRDocument {
    return this.adrGenerator.generateADR(dto);
  }

  generateDiagram(dto: GenerateDiagramDto): MermaidDiagram {
    return this.diagramGenerator.generateDiagram(dto);
  }

  generateAPIDocumentation(
    title: string,
    version: string,
    description: string,
    baseUrl: string,
    endpoints: any[],
    schemas?: Record<string, any>,
  ): APIDocumentation {
    return this.apiDocsGenerator.generateAPIDocumentation(
      title,
      version,
      description,
      baseUrl,
      endpoints,
      schemas,
    );
  }

  generateFullDocumentation(
    projectName: string,
    projectDescription: string,
    features: string[],
    stack: { frontend: string; backend: string; database: string },
  ): DocumentationStructure {
    // Generate README
    const readme = this.generateDocument({
      projectId: '',
      type: DocumentationType.README,
      context: {
        featureName: projectName,
        description: projectDescription,
      },
    });

    // Generate Architecture doc
    const architecture = this.generateDocument({
      projectId: '',
      type: DocumentationType.ARCHITECTURE,
      context: {
        featureName: projectName,
        description: projectDescription,
      },
    });

    // Generate system architecture diagram
    const archDiagram = this.diagramGenerator.generateSystemArchitectureDiagram(
      [
        { name: 'Client', type: 'user' },
        { name: stack.frontend, type: 'service' },
        { name: stack.backend, type: 'service' },
        { name: stack.database, type: 'database' },
      ],
      [
        { from: 'Client', to: stack.frontend, label: 'HTTPS' },
        { from: stack.frontend, to: stack.backend, label: 'API' },
        { from: stack.backend, to: stack.database, label: 'Query' },
      ],
    );

    return {
      readme,
      architecture,
      adrs: [],
      diagrams: [archDiagram],
      components: [],
    };
  }

  private generateReadme(dto: GenerateDocumentationDto): string {
    const projectName = dto.context?.featureName || 'Project';
    const description = dto.context?.description || 'A project built with Vibe Coding Platform';

    const lines: string[] = [];

    lines.push(`# ${projectName}`);
    lines.push('');
    lines.push(description);
    lines.push('');
    lines.push('## Getting Started');
    lines.push('');
    lines.push('### Prerequisites');
    lines.push('');
    lines.push('- Node.js 20.x or higher');
    lines.push('- npm or yarn');
    lines.push('- Git');
    lines.push('');
    lines.push('### Installation');
    lines.push('');
    lines.push('1. Clone the repository:');
    lines.push('```bash');
    lines.push(`git clone <repository-url>`);
    lines.push(`cd ${this.slugify(projectName)}`);
    lines.push('```');
    lines.push('');
    lines.push('2. Install dependencies:');
    lines.push('```bash');
    lines.push('npm install');
    lines.push('```');
    lines.push('');
    lines.push('3. Set up environment variables:');
    lines.push('```bash');
    lines.push('cp .env.example .env');
    lines.push('```');
    lines.push('');
    lines.push('4. Run the development server:');
    lines.push('```bash');
    lines.push('npm run dev');
    lines.push('```');
    lines.push('');
    lines.push('## Project Structure');
    lines.push('');
    lines.push('```');
    lines.push('├── src/');
    lines.push('│   ├── app/              # Application entry point');
    lines.push('│   ├── components/       # Reusable components');
    lines.push('│   ├── lib/              # Utilities and helpers');
    lines.push('│   └── styles/           # Global styles');
    lines.push('├── docs/                 # Documentation');
    lines.push('├── tests/                # Test files');
    lines.push('└── public/               # Static assets');
    lines.push('```');
    lines.push('');
    lines.push('## Scripts');
    lines.push('');
    lines.push('| Command | Description |');
    lines.push('|---------|-------------|');
    lines.push('| `npm run dev` | Start development server |');
    lines.push('| `npm run build` | Build for production |');
    lines.push('| `npm run test` | Run tests |');
    lines.push('| `npm run lint` | Lint code |');
    lines.push('');
    lines.push('## Documentation');
    lines.push('');
    lines.push('- [Architecture](./docs/ARCHITECTURE.md)');
    lines.push('- [API Documentation](./docs/api/README.md)');
    lines.push('- [Contributing](./CONTRIBUTING.md)');
    lines.push('');
    lines.push('## License');
    lines.push('');
    lines.push('MIT License');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Built with [Vibe Coding Platform](https://vibecoding.com)*');

    return lines.join('\n');
  }

  private generateArchitectureDoc(dto: GenerateDocumentationDto): string {
    const projectName = dto.context?.featureName || 'Project';

    const lines: string[] = [];

    lines.push(`# ${projectName} Architecture`);
    lines.push('');
    lines.push('## Overview');
    lines.push('');
    lines.push('This document describes the high-level architecture of the project.');
    lines.push('');
    lines.push('## System Architecture');
    lines.push('');
    lines.push('```mermaid');
    lines.push('graph TB');
    lines.push('    Client[Client Browser]');
    lines.push('    Frontend[Frontend - Next.js]');
    lines.push('    API[Backend API - NestJS]');
    lines.push('    DB[(Database)]');
    lines.push('    Cache[(Cache - Redis)]');
    lines.push('');
    lines.push('    Client --> Frontend');
    lines.push('    Frontend --> API');
    lines.push('    API --> DB');
    lines.push('    API --> Cache');
    lines.push('```');
    lines.push('');
    lines.push('## Components');
    lines.push('');
    lines.push('### Frontend');
    lines.push('');
    lines.push('- **Framework**: Next.js 14 with App Router');
    lines.push('- **Styling**: Tailwind CSS');
    lines.push('- **State Management**: React Context / Zustand');
    lines.push('- **UI Components**: shadcn/ui');
    lines.push('');
    lines.push('### Backend');
    lines.push('');
    lines.push('- **Framework**: NestJS');
    lines.push('- **Database**: PostgreSQL / MongoDB');
    lines.push('- **Cache**: Redis');
    lines.push('- **Authentication**: JWT');
    lines.push('');
    lines.push('## Data Flow');
    lines.push('');
    lines.push('```mermaid');
    lines.push('sequenceDiagram');
    lines.push('    participant U as User');
    lines.push('    participant F as Frontend');
    lines.push('    participant A as API');
    lines.push('    participant D as Database');
    lines.push('');
    lines.push('    U->>F: User Action');
    lines.push('    F->>A: API Request');
    lines.push('    A->>D: Query Data');
    lines.push('    D-->>A: Return Data');
    lines.push('    A-->>F: JSON Response');
    lines.push('    F-->>U: Update UI');
    lines.push('```');
    lines.push('');
    lines.push('## Security');
    lines.push('');
    lines.push('- JWT-based authentication');
    lines.push('- CORS configuration');
    lines.push('- Input validation');
    lines.push('- Rate limiting');
    lines.push('- HTTPS enforcement');
    lines.push('');
    lines.push('## Deployment');
    lines.push('');
    lines.push('- **Frontend**: Vercel');
    lines.push('- **Backend**: Railway');
    lines.push('- **Database**: Neon / MongoDB Atlas');
    lines.push('');
    lines.push('## Architecture Decision Records');
    lines.push('');
    lines.push('See [ADR directory](./architecture/adr/) for all architectural decisions.');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by Vibe Coding Platform*');

    return lines.join('\n');
  }

  private generateChangelog(dto: GenerateDocumentationDto): string {
    const lines: string[] = [];

    lines.push('# Changelog');
    lines.push('');
    lines.push('All notable changes to this project will be documented in this file.');
    lines.push('');
    lines.push('The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),');
    lines.push('and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).');
    lines.push('');
    lines.push('## [Unreleased]');
    lines.push('');
    lines.push('### Added');
    lines.push('- Initial project setup');
    lines.push('');
    lines.push('### Changed');
    lines.push('');
    lines.push('### Deprecated');
    lines.push('');
    lines.push('### Removed');
    lines.push('');
    lines.push('### Fixed');
    lines.push('');
    lines.push('### Security');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by Vibe Coding Platform*');

    return lines.join('\n');
  }

  private generateComponentDoc(dto: GenerateDocumentationDto): string {
    const componentName = dto.context?.featureName || 'Component';
    const description = dto.context?.description || 'A reusable component.';

    const lines: string[] = [];

    lines.push(`# ${componentName}`);
    lines.push('');
    lines.push(description);
    lines.push('');
    lines.push('## Usage');
    lines.push('');
    lines.push('```tsx');
    lines.push(`import { ${componentName} } from '@/components/${this.slugify(componentName)}';`);
    lines.push('');
    lines.push(`function Example() {`);
    lines.push(`  return <${componentName} />;`);
    lines.push(`}`);
    lines.push('```');
    lines.push('');
    lines.push('## Props');
    lines.push('');
    lines.push('| Prop | Type | Default | Description |');
    lines.push('|------|------|---------|-------------|');
    lines.push('| - | - | - | - |');
    lines.push('');
    lines.push('## Examples');
    lines.push('');
    lines.push('### Basic Usage');
    lines.push('');
    lines.push('```tsx');
    lines.push(`<${componentName} />`);
    lines.push('```');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*Generated by Vibe Coding Platform*');

    return lines.join('\n');
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Generate documentation bundle for a feature
  generateFeatureDocumentation(
    featureName: string,
    featureDescription: string,
    components: { name: string; description: string }[],
    apiEndpoints: any[],
    dataModels: { name: string; fields: string[] }[],
  ): {
    readme: GeneratedDocument;
    componentDocs: GeneratedDocument[];
    diagram: MermaidDiagram;
    apiDocs: string;
  } {
    // Feature README
    const readme = this.generateDocument({
      projectId: '',
      type: DocumentationType.README,
      context: {
        featureName,
        description: featureDescription,
      },
    });

    // Component documentation
    const componentDocs = components.map((comp) =>
      this.generateDocument({
        projectId: '',
        type: DocumentationType.COMPONENT,
        context: {
          featureName: comp.name,
          description: comp.description,
        },
      }),
    );

    // Data model diagram
    const diagram = this.diagramGenerator.generateDataModelDiagram(
      dataModels,
      [],
    );

    // API documentation
    const apiDocumentation = this.apiDocsGenerator.generateAPIDocumentation(
      `${featureName} API`,
      '1.0.0',
      `API documentation for ${featureName}`,
      '/api',
      apiEndpoints,
    );

    return {
      readme,
      componentDocs,
      diagram,
      apiDocs: this.apiDocsGenerator.generateMarkdownDocs(apiDocumentation),
    };
  }
}
