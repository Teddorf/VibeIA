/**
 * Base provider interface — SPEC v2.2 Section 4
 * All infrastructure providers extend this contract.
 */

export type ProviderType =
  | 'llm'
  | 'database'
  | 'cache'
  | 'queue'
  | 'vcs'
  | 'deploy'
  | 'sandbox'
  | 'filesystem'
  | 'git-host';

export interface ProviderConfig {
  [key: string]: unknown;
}

export interface HealthStatus {
  healthy: boolean;
  latencyMs?: number;
  message?: string;
  lastCheckedAt: Date;
}

export interface IProvider {
  readonly providerId: string;
  readonly providerType: ProviderType;
  initialize(config: ProviderConfig): Promise<void>;
  healthCheck(): Promise<HealthStatus>;
  shutdown(): Promise<void>;
}
