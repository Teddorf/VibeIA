import { Test, TestingModule } from '@nestjs/testing';
import { DocumentationService } from './documentation.service';
import { AdrGeneratorService } from './adr-generator.service';
import { DiagramGeneratorService } from './diagram-generator.service';
import { ApiDocsGeneratorService } from './api-docs-generator.service';
import {
  DocumentationType,
  DiagramType,
  ADRStatus,
} from './dto/documentation.dto';

describe('AdrGeneratorService', () => {
  let service: AdrGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdrGeneratorService],
    }).compile();

    service = module.get<AdrGeneratorService>(AdrGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate an ADR document', () => {
    const adr = service.generateADR({
      projectId: 'proj-1',
      title: 'Use PostgreSQL as Primary Database',
      context: 'We need a reliable database for our application.',
      decision: 'We will use PostgreSQL.',
      consequences: {
        positive: ['ACID compliance', 'Wide support'],
        negative: ['Requires more setup than NoSQL'],
      },
    });

    expect(adr.id).toContain('adr-');
    expect(adr.title).toBe('Use PostgreSQL as Primary Database');
    expect(adr.status).toBe(ADRStatus.ACCEPTED);
    expect(adr.content).toContain('# ADR');
    expect(adr.content).toContain('PostgreSQL');
    expect(adr.filePath).toContain('ADR-');
    expect(adr.filePath).toContain('.md');
  });

  it('should include alternatives in ADR', () => {
    const adr = service.generateADR({
      projectId: 'proj-1',
      title: 'Use Event-Driven Architecture',
      context: 'Need scalable messaging.',
      decision: 'Use Redis Pub/Sub.',
      consequences: {
        positive: ['Scalable', 'Fast'],
        negative: ['Complexity'],
      },
      alternatives: [
        {
          name: 'Polling',
          description: 'Simple polling approach',
          rejected_reason: 'Not scalable',
        },
      ],
    });

    expect(adr.content).toContain('Alternatives Considered');
    expect(adr.content).toContain('Polling');
    expect(adr.content).toContain('Not scalable');
  });

  it('should generate database ADR template', () => {
    const adr = service.generateDatabaseADR(
      'Neon',
      ['Serverless', 'Database branching', 'Cost-effective'],
      [{ name: 'Supabase', rejected_reason: 'No branching support' }],
    );

    expect(adr.title).toContain('Neon');
    expect(adr.content).toContain('Neon');
    expect(adr.content).toContain('Supabase');
  });

  it('should generate architecture ADR template', () => {
    const adr = service.generateArchitectureADR(
      'Microservices',
      'Split the monolith into services.',
      ['Scalability', 'Team autonomy'],
      ['Network complexity', 'Debugging'],
    );

    expect(adr.title).toContain('Microservices');
    expect(adr.content).toContain('Microservices');
    expect(adr.content).toContain('Scalability');
    expect(adr.content).toContain('Network complexity');
  });

  it('should generate ADR index', () => {
    const adrs = [
      service.generateADR({
        projectId: 'proj-1',
        title: 'ADR One',
        context: 'Context',
        decision: 'Decision',
        consequences: { positive: ['Good'], negative: ['Bad'] },
      }),
      service.generateADR({
        projectId: 'proj-1',
        title: 'ADR Two',
        context: 'Context',
        decision: 'Decision',
        consequences: { positive: ['Good'], negative: ['Bad'] },
      }),
    ];

    const index = service.generateADRIndex(adrs);

    expect(index).toContain('Architecture Decision Records');
    expect(index).toContain('ADR One');
    expect(index).toContain('ADR Two');
  });
});

describe('DiagramGeneratorService', () => {
  let service: DiagramGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DiagramGeneratorService],
    }).compile();

    service = module.get<DiagramGeneratorService>(DiagramGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate a sequence diagram', () => {
    const diagram = service.generateDiagram({
      projectId: 'proj-1',
      type: DiagramType.SEQUENCE,
      title: 'API Flow',
      steps: [
        { actor: 'Client', action: 'Request', target: 'API' },
        { actor: 'API', action: 'Query', target: 'Database' },
        { actor: 'Database', action: 'Response', target: 'API' },
      ],
    });

    expect(diagram.type).toBe(DiagramType.SEQUENCE);
    expect(diagram.code).toContain('sequenceDiagram');
    expect(diagram.code).toContain('Client');
    expect(diagram.code).toContain('API');
    expect(diagram.code).toContain('Database');
  });

  it('should generate a flowchart diagram', () => {
    const diagram = service.generateDiagram({
      projectId: 'proj-1',
      type: DiagramType.FLOWCHART,
      title: 'System Architecture',
      entities: [
        { name: 'Frontend', type: 'service' },
        { name: 'Backend', type: 'service' },
        { name: 'Database', type: 'database' },
      ],
      relationships: [
        { from: 'Frontend', to: 'Backend', label: 'API' },
        { from: 'Backend', to: 'Database', label: 'Query' },
      ],
    });

    expect(diagram.type).toBe(DiagramType.FLOWCHART);
    expect(diagram.code).toContain('graph TB');
    expect(diagram.code).toContain('Frontend');
    expect(diagram.code).toContain('Backend');
  });

  it('should generate an ERD diagram', () => {
    const diagram = service.generateDiagram({
      projectId: 'proj-1',
      type: DiagramType.ERD,
      title: 'Data Model',
      entities: [
        { name: 'User', type: 'entity', attributes: ['uuid id', 'string email', 'string name'] },
        { name: 'Post', type: 'entity', attributes: ['uuid id', 'string title', 'text content'] },
      ],
      relationships: [
        { from: 'User', to: 'Post', type: 'one-to-many', label: 'creates' },
      ],
    });

    expect(diagram.type).toBe(DiagramType.ERD);
    expect(diagram.code).toContain('erDiagram');
    expect(diagram.code).toContain('USER');
    expect(diagram.code).toContain('POST');
  });

  it('should generate system architecture diagram', () => {
    const diagram = service.generateSystemArchitectureDiagram(
      [
        { name: 'Client', type: 'user' },
        { name: 'API', type: 'service' },
        { name: 'DB', type: 'database' },
      ],
      [
        { from: 'Client', to: 'API', label: 'HTTPS' },
        { from: 'API', to: 'DB', label: 'Query' },
      ],
    );

    expect(diagram.code).toContain('graph TB');
    expect(diagram.code).toContain('Client');
    expect(diagram.code).toContain('HTTPS');
  });

  it('should generate data model diagram', () => {
    const diagram = service.generateDataModelDiagram(
      [
        { name: 'User', fields: ['uuid id', 'string email'] },
        { name: 'Order', fields: ['uuid id', 'decimal total'] },
      ],
      [
        { from: 'User', to: 'Order', type: 'one-to-many', label: 'places' },
      ],
    );

    expect(diagram.code).toContain('erDiagram');
    expect(diagram.code).toContain('USER');
    expect(diagram.code).toContain('ORDER');
  });
});

describe('ApiDocsGeneratorService', () => {
  let service: ApiDocsGeneratorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiDocsGeneratorService],
    }).compile();

    service = module.get<ApiDocsGeneratorService>(ApiDocsGeneratorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate API documentation', () => {
    const docs = service.generateAPIDocumentation(
      'Test API',
      '1.0.0',
      'Test API description',
      'http://localhost:3000',
      [
        {
          method: 'GET',
          path: '/api/users',
          summary: 'Get all users',
          responses: [{ status: 200, description: 'Success' }],
          tags: ['Users'],
        },
      ],
    );

    expect(docs.title).toBe('Test API');
    expect(docs.version).toBe('1.0.0');
    expect(docs.endpoints).toHaveLength(1);
    expect(docs.openApiSpec).toContain('openapi');
  });

  it('should generate OpenAPI spec', () => {
    const docs = service.generateAPIDocumentation(
      'Test API',
      '1.0.0',
      'Description',
      'http://localhost:3000',
      [
        {
          method: 'POST',
          path: '/api/users',
          summary: 'Create user',
          requestBody: {
            type: 'User',
            properties: {
              email: { type: 'string', description: 'Email' },
              name: { type: 'string', description: 'Name' },
            },
            required: ['email'],
          },
          responses: [
            { status: 201, description: 'Created' },
            { status: 400, description: 'Bad Request' },
          ],
          tags: ['Users'],
        },
      ],
    );

    const spec = JSON.parse(docs.openApiSpec);
    expect(spec.openapi).toBe('3.0.3');
    expect(spec.paths['/api/users'].post).toBeDefined();
    expect(spec.paths['/api/users'].post.requestBody).toBeDefined();
  });

  it('should generate markdown documentation', () => {
    const docs = service.generateAPIDocumentation(
      'Test API',
      '1.0.0',
      'Test Description',
      'http://localhost:3000',
      [
        {
          method: 'GET',
          path: '/api/users',
          summary: 'List users',
          responses: [{ status: 200, description: 'Success' }],
          tags: ['Users'],
        },
      ],
    );

    const markdown = service.generateMarkdownDocs(docs);

    expect(markdown).toContain('# Test API');
    expect(markdown).toContain('**Version:** 1.0.0');
    expect(markdown).toContain('GET /api/users');
  });

  it('should generate CRUD endpoints', () => {
    const endpoints = service.generateCRUDEndpoints(
      'User',
      'Users',
      {
        email: { type: 'string', description: 'User email' },
        name: { type: 'string', description: 'User name' },
      },
    );

    expect(endpoints).toHaveLength(5);
    expect(endpoints.map((e) => e.method)).toContain('GET');
    expect(endpoints.map((e) => e.method)).toContain('POST');
    expect(endpoints.map((e) => e.method)).toContain('PATCH');
    expect(endpoints.map((e) => e.method)).toContain('DELETE');
  });
});

describe('DocumentationService', () => {
  let service: DocumentationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentationService,
        AdrGeneratorService,
        DiagramGeneratorService,
        ApiDocsGeneratorService,
      ],
    }).compile();

    service = module.get<DocumentationService>(DocumentationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate README document', () => {
    const doc = service.generateDocument({
      projectId: 'proj-1',
      type: DocumentationType.README,
      context: {
        featureName: 'My Project',
        description: 'A great project',
      },
    });

    expect(doc.type).toBe(DocumentationType.README);
    expect(doc.title).toBe('README');
    expect(doc.content).toContain('# My Project');
    expect(doc.content).toContain('Getting Started');
    expect(doc.filePath).toBe('README.md');
  });

  it('should generate Architecture document', () => {
    const doc = service.generateDocument({
      projectId: 'proj-1',
      type: DocumentationType.ARCHITECTURE,
      context: {
        featureName: 'My Project',
      },
    });

    expect(doc.type).toBe(DocumentationType.ARCHITECTURE);
    expect(doc.content).toContain('Architecture');
    expect(doc.content).toContain('mermaid');
    expect(doc.filePath).toContain('ARCHITECTURE.md');
  });

  it('should generate Changelog document', () => {
    const doc = service.generateDocument({
      projectId: 'proj-1',
      type: DocumentationType.CHANGELOG,
    });

    expect(doc.type).toBe(DocumentationType.CHANGELOG);
    expect(doc.content).toContain('Changelog');
    expect(doc.content).toContain('Unreleased');
    expect(doc.filePath).toBe('CHANGELOG.md');
  });

  it('should generate component documentation', () => {
    const doc = service.generateDocument({
      projectId: 'proj-1',
      type: DocumentationType.COMPONENT,
      context: {
        featureName: 'Button',
        description: 'A reusable button component',
      },
    });

    expect(doc.type).toBe(DocumentationType.COMPONENT);
    expect(doc.content).toContain('Button');
    expect(doc.content).toContain('Props');
    expect(doc.filePath).toContain('button.md');
  });

  it('should generate full documentation structure', () => {
    const structure = service.generateFullDocumentation(
      'My SaaS',
      'A SaaS application',
      ['Auth', 'Billing', 'Dashboard'],
      {
        frontend: 'Next.js',
        backend: 'NestJS',
        database: 'PostgreSQL',
      },
    );

    expect(structure.readme).toBeDefined();
    expect(structure.architecture).toBeDefined();
    expect(structure.diagrams).toHaveLength(1);
    expect(structure.readme.content).toContain('My SaaS');
  });

  it('should generate feature documentation bundle', () => {
    const bundle = service.generateFeatureDocumentation(
      'Notifications',
      'Real-time notification system',
      [
        { name: 'NotificationBell', description: 'Bell icon component' },
        { name: 'NotificationPanel', description: 'Notification list panel' },
      ],
      [
        {
          method: 'GET',
          path: '/api/notifications',
          summary: 'List notifications',
          responses: [{ status: 200, description: 'Success' }],
          tags: ['Notifications'],
        },
      ],
      [
        { name: 'Notification', fields: ['uuid id', 'string title', 'boolean read'] },
      ],
    );

    expect(bundle.readme).toBeDefined();
    expect(bundle.componentDocs).toHaveLength(2);
    expect(bundle.diagram).toBeDefined();
    expect(bundle.apiDocs).toContain('Notifications');
  });
});
