import { Injectable } from '@nestjs/common';
import {
  GenerateDiagramDto,
  DiagramType,
  MermaidDiagram,
} from './dto/documentation.dto';

@Injectable()
export class DiagramGeneratorService {
  generateDiagram(dto: GenerateDiagramDto): MermaidDiagram {
    let code: string;

    switch (dto.type) {
      case DiagramType.SEQUENCE:
        code = this.generateSequenceDiagram(dto);
        break;
      case DiagramType.FLOWCHART:
        code = this.generateFlowchartDiagram(dto);
        break;
      case DiagramType.ERD:
        code = this.generateERDDiagram(dto);
        break;
      case DiagramType.CLASS:
        code = this.generateClassDiagram(dto);
        break;
      case DiagramType.STATE:
        code = this.generateStateDiagram(dto);
        break;
      default:
        code = this.generateFlowchartDiagram(dto);
    }

    return {
      type: dto.type,
      title: dto.title,
      code,
    };
  }

  private generateSequenceDiagram(dto: GenerateDiagramDto): string {
    const lines: string[] = ['sequenceDiagram'];

    if (dto.steps && dto.steps.length > 0) {
      // Extract unique actors
      const actors = new Set<string>();
      for (const step of dto.steps) {
        actors.add(step.actor);
        if (step.target) {
          actors.add(step.target);
        }
      }

      // Add participants
      for (const actor of actors) {
        lines.push(`    participant ${actor}`);
      }
      lines.push('');

      // Add interactions
      for (const step of dto.steps) {
        if (step.target) {
          lines.push(`    ${step.actor}->>${step.target}: ${step.action}`);
        } else {
          lines.push(`    Note over ${step.actor}: ${step.action}`);
        }
      }
    }

    return lines.join('\n');
  }

  private generateFlowchartDiagram(dto: GenerateDiagramDto): string {
    const lines: string[] = ['graph TB'];

    if (dto.entities && dto.entities.length > 0) {
      // Create nodes
      for (const entity of dto.entities) {
        const shape = this.getNodeShape(entity.type);
        lines.push(`    ${this.sanitizeId(entity.name)}${shape.start}"${entity.name}"${shape.end}`);
      }
      lines.push('');

      // Create connections
      if (dto.relationships) {
        for (const rel of dto.relationships) {
          const fromId = this.sanitizeId(rel.from);
          const toId = this.sanitizeId(rel.to);
          const arrow = rel.label ? `-->|${rel.label}|` : '-->';
          lines.push(`    ${fromId}${arrow}${toId}`);
        }
      }
    }

    return lines.join('\n');
  }

  private generateERDDiagram(dto: GenerateDiagramDto): string {
    const lines: string[] = ['erDiagram'];

    if (dto.entities && dto.entities.length > 0) {
      // Create entities with attributes
      for (const entity of dto.entities) {
        lines.push(`    ${entity.name.toUpperCase()} {`);
        if (entity.attributes) {
          for (const attr of entity.attributes) {
            // Parse attribute format: "type name" or just "name"
            const parts = attr.split(' ');
            if (parts.length >= 2) {
              lines.push(`        ${parts[0]} ${parts.slice(1).join(' ')}`);
            } else {
              lines.push(`        string ${attr}`);
            }
          }
        }
        lines.push('    }');
      }
      lines.push('');

      // Create relationships
      if (dto.relationships) {
        for (const rel of dto.relationships) {
          const relSymbol = this.getERDRelationship(rel.type);
          const label = rel.label || '';
          lines.push(`    ${rel.from.toUpperCase()} ${relSymbol} ${rel.to.toUpperCase()} : "${label}"`);
        }
      }
    }

    return lines.join('\n');
  }

  private generateClassDiagram(dto: GenerateDiagramDto): string {
    const lines: string[] = ['classDiagram'];

    if (dto.entities && dto.entities.length > 0) {
      // Create classes
      for (const entity of dto.entities) {
        lines.push(`    class ${entity.name} {`);
        if (entity.attributes) {
          for (const attr of entity.attributes) {
            lines.push(`        +${attr}`);
          }
        }
        if (entity.methods) {
          for (const method of entity.methods) {
            lines.push(`        +${method}()`);
          }
        }
        lines.push('    }');
      }
      lines.push('');

      // Create relationships
      if (dto.relationships) {
        for (const rel of dto.relationships) {
          const relSymbol = this.getClassRelationship(rel.type);
          lines.push(`    ${rel.from} ${relSymbol} ${rel.to}`);
          if (rel.label) {
            lines.push(`    ${rel.from} : ${rel.label}`);
          }
        }
      }
    }

    return lines.join('\n');
  }

  private generateStateDiagram(dto: GenerateDiagramDto): string {
    const lines: string[] = ['stateDiagram-v2'];

    if (dto.entities && dto.entities.length > 0) {
      // First entity is assumed to be initial state
      const states = dto.entities;
      if (states.length > 0) {
        lines.push(`    [*] --> ${states[0].name}`);
      }

      // Add state descriptions
      for (const state of states) {
        if (state.attributes && state.attributes.length > 0) {
          lines.push(`    ${state.name}: ${state.attributes[0]}`);
        }
      }
      lines.push('');

      // Create transitions
      if (dto.relationships) {
        for (const rel of dto.relationships) {
          const label = rel.label ? `: ${rel.label}` : '';
          lines.push(`    ${rel.from} --> ${rel.to}${label}`);
        }
      }

      // Last entity transitions to end
      if (states.length > 0) {
        const lastState = states[states.length - 1];
        lines.push(`    ${lastState.name} --> [*]`);
      }
    }

    return lines.join('\n');
  }

  private getNodeShape(type: string): { start: string; end: string } {
    switch (type.toLowerCase()) {
      case 'database':
        return { start: '[(', end: ')]' };
      case 'decision':
        return { start: '{', end: '}' };
      case 'process':
        return { start: '[', end: ']' };
      case 'service':
        return { start: '([', end: '])' };
      case 'user':
        return { start: '((', end: '))' };
      default:
        return { start: '[', end: ']' };
    }
  }

  private getERDRelationship(type?: string): string {
    switch (type) {
      case 'one-to-one':
        return '||--||';
      case 'one-to-many':
        return '||--o{';
      case 'many-to-many':
        return '}o--o{';
      default:
        return '||--o{';
    }
  }

  private getClassRelationship(type?: string): string {
    switch (type) {
      case 'one-to-one':
        return '<|--';
      case 'one-to-many':
        return 'o--';
      case 'many-to-many':
        return '*--';
      default:
        return '-->';
    }
  }

  private sanitizeId(name: string): string {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
  }

  // Pre-built diagram templates
  generateAPIFlowDiagram(
    endpoints: { method: string; path: string; handler: string }[],
  ): MermaidDiagram {
    const steps = endpoints.map((ep) => ({
      actor: 'Client',
      action: `${ep.method} ${ep.path}`,
      target: ep.handler,
    }));

    // Add response steps
    const allSteps = [];
    for (const step of steps) {
      allSteps.push(step);
      allSteps.push({
        actor: step.target,
        action: 'Response',
        target: 'Client',
      });
    }

    return this.generateDiagram({
      projectId: '',
      type: DiagramType.SEQUENCE,
      title: 'API Flow',
      steps: allSteps,
    });
  }

  generateSystemArchitectureDiagram(
    components: { name: string; type: string }[],
    connections: { from: string; to: string; label?: string }[],
  ): MermaidDiagram {
    return this.generateDiagram({
      projectId: '',
      type: DiagramType.FLOWCHART,
      title: 'System Architecture',
      entities: components,
      relationships: connections,
    });
  }

  generateDataModelDiagram(
    models: { name: string; fields: string[] }[],
    relations: { from: string; to: string; type: string; label?: string }[],
  ): MermaidDiagram {
    return this.generateDiagram({
      projectId: '',
      type: DiagramType.ERD,
      title: 'Data Model',
      entities: models.map((m) => ({
        name: m.name,
        type: 'entity',
        attributes: m.fields,
      })),
      relationships: relations.map((r) => ({
        from: r.from,
        to: r.to,
        type: r.type as 'one-to-one' | 'one-to-many' | 'many-to-many',
        label: r.label,
      })),
    });
  }

  generateFeatureFlowDiagram(
    featureName: string,
    actors: string[],
    flow: { from: string; action: string; to: string }[],
  ): MermaidDiagram {
    return this.generateDiagram({
      projectId: '',
      type: DiagramType.SEQUENCE,
      title: `${featureName} Flow`,
      steps: flow.map((f) => ({
        actor: f.from,
        action: f.action,
        target: f.to,
      })),
    });
  }
}
