export interface IDeployResult {
  url: string;
  deploymentId: string;
  status: 'success' | 'failed' | 'pending';
  logs?: string[];
}

export interface IDeployProvider {
  deploy(
    projectPath: string,
    options?: Record<string, unknown>,
  ): Promise<IDeployResult>;
  getStatus(deploymentId: string): Promise<IDeployResult>;
  rollback(deploymentId: string): Promise<IDeployResult>;
}
