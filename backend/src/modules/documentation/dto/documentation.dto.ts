export enum DocumentationType {
  ADR = 'adr',
  README = 'readme',
  API = 'api',
  ARCHITECTURE = 'architecture',
  COMPONENT = 'component',
  CHANGELOG = 'changelog',
}

export enum DiagramType {
  SEQUENCE = 'sequence',
  FLOWCHART = 'flowchart',
  ERD = 'erd',
  CLASS = 'class',
  STATE = 'state',
}

export enum ADRStatus {
  PROPOSED = 'proposed',
  ACCEPTED = 'accepted',
  DEPRECATED = 'deprecated',
  SUPERSEDED = 'superseded',
}

export class GenerateDocumentationDto {
  projectId: string;
  type: DocumentationType;
  context?: {
    featureName?: string;
    description?: string;
    files?: string[];
    components?: string[];
  };
}

export class GenerateADRDto {
  projectId: string;
  title: string;
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives?: {
    name: string;
    description: string;
    rejected_reason: string;
  }[];
  status?: ADRStatus;
}

export class GenerateDiagramDto {
  projectId: string;
  type: DiagramType;
  title: string;
  entities?: {
    name: string;
    type: string;
    attributes?: string[];
    methods?: string[];
  }[];
  relationships?: {
    from: string;
    to: string;
    label?: string;
    type?: 'one-to-one' | 'one-to-many' | 'many-to-many';
  }[];
  steps?: {
    actor: string;
    action: string;
    target?: string;
  }[];
}

export interface GeneratedDocument {
  type: DocumentationType;
  title: string;
  content: string;
  filePath: string;
  createdAt: Date;
}

export interface ADRDocument {
  id: string;
  title: string;
  status: ADRStatus;
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
  };
  alternatives?: {
    name: string;
    description: string;
    rejected_reason: string;
  }[];
  references?: string[];
  content: string;
  filePath: string;
  createdAt: Date;
}

export interface MermaidDiagram {
  type: DiagramType;
  title: string;
  code: string;
  preview?: string;
}

export interface APIEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  summary: string;
  description?: string;
  parameters?: {
    name: string;
    in: 'path' | 'query' | 'body' | 'header';
    type: string;
    required: boolean;
    description?: string;
  }[];
  requestBody?: {
    type: string;
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
  responses: {
    status: number;
    description: string;
    schema?: Record<string, any>;
  }[];
  tags?: string[];
}

export interface APIDocumentation {
  title: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  schemas: Record<string, any>;
  openApiSpec: string;
}

export interface DocumentationStructure {
  readme: GeneratedDocument;
  architecture?: GeneratedDocument;
  changelog?: GeneratedDocument;
  adrs: ADRDocument[];
  apiDocs?: APIDocumentation;
  diagrams: MermaidDiagram[];
  components: GeneratedDocument[];
}
