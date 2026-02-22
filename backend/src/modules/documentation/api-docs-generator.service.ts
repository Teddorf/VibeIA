import { Injectable } from '@nestjs/common';
import { APIEndpoint, APIDocumentation } from './dto/documentation.dto';
import { splitLines } from '../../platform';

@Injectable()
export class ApiDocsGeneratorService {
  generateAPIDocumentation(
    title: string,
    version: string,
    description: string,
    baseUrl: string,
    endpoints: APIEndpoint[],
    schemas: Record<string, any> = {},
  ): APIDocumentation {
    const openApiSpec = this.generateOpenAPISpec(
      title,
      version,
      description,
      baseUrl,
      endpoints,
      schemas,
    );

    return {
      title,
      version,
      description,
      baseUrl,
      endpoints,
      schemas,
      openApiSpec,
    };
  }

  private generateOpenAPISpec(
    title: string,
    version: string,
    description: string,
    baseUrl: string,
    endpoints: APIEndpoint[],
    schemas: Record<string, any>,
  ): string {
    const spec: any = {
      openapi: '3.0.3',
      info: {
        title,
        version,
        description,
      },
      servers: [
        {
          url: baseUrl,
          description: 'API Server',
        },
      ],
      paths: {},
      components: {
        schemas: schemas,
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
      tags: this.extractTags(endpoints),
    };

    // Group endpoints by path
    for (const endpoint of endpoints) {
      if (!spec.paths[endpoint.path]) {
        spec.paths[endpoint.path] = {};
      }

      spec.paths[endpoint.path][endpoint.method.toLowerCase()] =
        this.buildPathItem(endpoint);
    }

    return JSON.stringify(spec, null, 2);
  }

  private buildPathItem(endpoint: APIEndpoint): any {
    const item: any = {
      summary: endpoint.summary,
      description: endpoint.description || endpoint.summary,
      tags: endpoint.tags || [],
      responses: {},
    };

    // Add parameters
    if (endpoint.parameters && endpoint.parameters.length > 0) {
      item.parameters = endpoint.parameters
        .filter((p) => p.in !== 'body')
        .map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: { type: p.type },
        }));
    }

    // Add request body
    if (endpoint.requestBody) {
      item.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: endpoint.requestBody.properties,
              required: endpoint.requestBody.required,
            },
          },
        },
      };
    }

    // Add responses
    for (const response of endpoint.responses) {
      item.responses[response.status.toString()] = {
        description: response.description,
        content: response.schema
          ? {
              'application/json': {
                schema: response.schema,
              },
            }
          : undefined,
      };
    }

    return item;
  }

  private extractTags(
    endpoints: APIEndpoint[],
  ): { name: string; description: string }[] {
    const tagSet = new Set<string>();
    for (const endpoint of endpoints) {
      if (endpoint.tags) {
        for (const tag of endpoint.tags) {
          tagSet.add(tag);
        }
      }
    }

    return Array.from(tagSet).map((tag) => ({
      name: tag,
      description: `Operations related to ${tag}`,
    }));
  }

  generateMarkdownDocs(apiDocs: APIDocumentation): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${apiDocs.title}`);
    lines.push('');
    lines.push(`**Version:** ${apiDocs.version}`);
    lines.push('');
    lines.push(apiDocs.description);
    lines.push('');
    lines.push(`**Base URL:** \`${apiDocs.baseUrl}\``);
    lines.push('');

    // Table of Contents
    lines.push('## Table of Contents');
    lines.push('');
    const groupedEndpoints = this.groupByTag(apiDocs.endpoints);
    for (const [tag] of Object.entries(groupedEndpoints)) {
      lines.push(`- [${tag}](#${tag.toLowerCase().replace(/\s+/g, '-')})`);
    }
    lines.push('');

    // Endpoints by tag
    for (const [tag, endpoints] of Object.entries(groupedEndpoints)) {
      lines.push(`## ${tag}`);
      lines.push('');

      for (const endpoint of endpoints) {
        lines.push(`### ${endpoint.method} ${endpoint.path}`);
        lines.push('');
        lines.push(endpoint.summary);
        lines.push('');

        if (endpoint.description) {
          lines.push(endpoint.description);
          lines.push('');
        }

        // Parameters
        if (endpoint.parameters && endpoint.parameters.length > 0) {
          lines.push('**Parameters:**');
          lines.push('');
          lines.push('| Name | In | Type | Required | Description |');
          lines.push('|------|-----|------|----------|-------------|');
          for (const param of endpoint.parameters) {
            lines.push(
              `| ${param.name} | ${param.in} | ${param.type} | ${param.required ? 'Yes' : 'No'} | ${param.description || '-'} |`,
            );
          }
          lines.push('');
        }

        // Request body
        if (endpoint.requestBody) {
          lines.push('**Request Body:**');
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(endpoint.requestBody, null, 2));
          lines.push('```');
          lines.push('');
        }

        // Responses
        lines.push('**Responses:**');
        lines.push('');
        for (const response of endpoint.responses) {
          lines.push(`- **${response.status}**: ${response.description}`);
          if (response.schema) {
            lines.push('  ```json');
            lines.push(
              '  ' +
                splitLines(JSON.stringify(response.schema, null, 2)).join(
                  '\n  ',
                ),
            );
            lines.push('  ```');
          }
        }
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    // Schemas
    if (Object.keys(apiDocs.schemas).length > 0) {
      lines.push('## Schemas');
      lines.push('');
      for (const [name, schema] of Object.entries(apiDocs.schemas)) {
        lines.push(`### ${name}`);
        lines.push('');
        lines.push('```json');
        lines.push(JSON.stringify(schema, null, 2));
        lines.push('```');
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
    lines.push('*Generated by Vibe Coding Platform*');

    return lines.join('\n');
  }

  private groupByTag(endpoints: APIEndpoint[]): Record<string, APIEndpoint[]> {
    const grouped: Record<string, APIEndpoint[]> = {};

    for (const endpoint of endpoints) {
      const tag =
        endpoint.tags && endpoint.tags.length > 0 ? endpoint.tags[0] : 'Other';
      if (!grouped[tag]) {
        grouped[tag] = [];
      }
      grouped[tag].push(endpoint);
    }

    return grouped;
  }

  // Generate common API endpoints
  generateCRUDEndpoints(
    resourceName: string,
    resourcePlural: string,
    schema: Record<string, { type: string; description?: string }>,
  ): APIEndpoint[] {
    const basePath = `/api/${resourcePlural.toLowerCase()}`;
    const tag = resourceName;

    return [
      {
        method: 'GET',
        path: basePath,
        summary: `List all ${resourcePlural}`,
        description: `Retrieve a list of all ${resourcePlural}`,
        tags: [tag],
        parameters: [
          {
            name: 'page',
            in: 'query',
            type: 'integer',
            required: false,
            description: 'Page number',
          },
          {
            name: 'limit',
            in: 'query',
            type: 'integer',
            required: false,
            description: 'Items per page',
          },
        ],
        responses: [
          {
            status: 200,
            description: `List of ${resourcePlural}`,
            schema: {
              type: 'array',
              items: { $ref: `#/components/schemas/${resourceName}` },
            },
          },
          { status: 401, description: 'Unauthorized' },
        ],
      },
      {
        method: 'GET',
        path: `${basePath}/:id`,
        summary: `Get ${resourceName} by ID`,
        description: `Retrieve a single ${resourceName} by its ID`,
        tags: [tag],
        parameters: [
          {
            name: 'id',
            in: 'path',
            type: 'string',
            required: true,
            description: `${resourceName} ID`,
          },
        ],
        responses: [
          {
            status: 200,
            description: `${resourceName} details`,
            schema: { $ref: `#/components/schemas/${resourceName}` },
          },
          { status: 404, description: `${resourceName} not found` },
          { status: 401, description: 'Unauthorized' },
        ],
      },
      {
        method: 'POST',
        path: basePath,
        summary: `Create ${resourceName}`,
        description: `Create a new ${resourceName}`,
        tags: [tag],
        requestBody: {
          type: resourceName,
          properties: schema,
          required: Object.keys(schema).filter((k) => !k.includes('?')),
        },
        responses: [
          {
            status: 201,
            description: `${resourceName} created`,
            schema: { $ref: `#/components/schemas/${resourceName}` },
          },
          { status: 400, description: 'Validation error' },
          { status: 401, description: 'Unauthorized' },
        ],
      },
      {
        method: 'PATCH',
        path: `${basePath}/:id`,
        summary: `Update ${resourceName}`,
        description: `Update an existing ${resourceName}`,
        tags: [tag],
        parameters: [
          {
            name: 'id',
            in: 'path',
            type: 'string',
            required: true,
            description: `${resourceName} ID`,
          },
        ],
        requestBody: {
          type: resourceName,
          properties: schema,
        },
        responses: [
          {
            status: 200,
            description: `${resourceName} updated`,
            schema: { $ref: `#/components/schemas/${resourceName}` },
          },
          { status: 404, description: `${resourceName} not found` },
          { status: 400, description: 'Validation error' },
          { status: 401, description: 'Unauthorized' },
        ],
      },
      {
        method: 'DELETE',
        path: `${basePath}/:id`,
        summary: `Delete ${resourceName}`,
        description: `Delete a ${resourceName}`,
        tags: [tag],
        parameters: [
          {
            name: 'id',
            in: 'path',
            type: 'string',
            required: true,
            description: `${resourceName} ID`,
          },
        ],
        responses: [
          { status: 204, description: `${resourceName} deleted` },
          { status: 404, description: `${resourceName} not found` },
          { status: 401, description: 'Unauthorized' },
        ],
      },
    ];
  }
}
