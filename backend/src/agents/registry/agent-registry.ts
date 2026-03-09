import { Injectable, Logger } from '@nestjs/common';
import { IAgent, TaskDefinition } from '../protocol';

@Injectable()
export class AgentRegistry {
  private readonly logger = new Logger(AgentRegistry.name);
  private readonly agents = new Map<string, IAgent>();

  register(agent: IAgent): void {
    const { id, name, role, capabilities } = agent.profile;

    if (!id || !name || !role) {
      throw new Error(
        `Invalid agent profile: missing required fields (id=${id}, name=${name}, role=${role})`,
      );
    }

    if (this.agents.has(id)) {
      throw new Error(`Agent with id '${id}' is already registered`);
    }

    this.agents.set(id, agent);
    this.logger.log(
      `Registered agent: ${name} (${id}) [${capabilities.join(', ')}]`,
    );
  }

  get(agentId: string): IAgent {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent '${agentId}' not found in registry`);
    }
    return agent;
  }

  has(agentId: string): boolean {
    return this.agents.has(agentId);
  }

  getAll(): IAgent[] {
    return Array.from(this.agents.values());
  }

  getByCapability(capability: string): IAgent[] {
    return this.getAll().filter((agent) =>
      agent.profile.capabilities.includes(capability),
    );
  }

  canHandle(task: TaskDefinition): IAgent[] {
    return this.getAll().filter((agent) => agent.canHandle(task));
  }

  getRegisteredIds(): string[] {
    return Array.from(this.agents.keys());
  }
}
