import { NullDeployAdapter } from './null-deploy.adapter';

describe('NullDeployAdapter', () => {
  let adapter: NullDeployAdapter;

  beforeEach(() => {
    adapter = new NullDeployAdapter();
  });

  it('should return success from deploy()', async () => {
    const result = await adapter.deploy('/some/path');
    expect(result.status).toBe('success');
    expect(result.url).toBeDefined();
    expect(result.deploymentId).toContain('null-deploy-');
  });

  it('should return success from getStatus()', async () => {
    const result = await adapter.getStatus('test-id');
    expect(result.status).toBe('success');
    expect(result.deploymentId).toBe('test-id');
  });

  it('should return success from rollback()', async () => {
    const result = await adapter.rollback('test-id');
    expect(result.status).toBe('success');
    expect(result.logs).toBeDefined();
  });
});
