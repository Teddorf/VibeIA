import { Test, TestingModule } from '@nestjs/testing';
import { OAuthStateService } from './oauth-state.service';

describe('OAuthStateService', () => {
  let service: OAuthStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OAuthStateService],
    }).compile();

    service = module.get<OAuthStateService>(OAuthStateService);
  });

  describe('generateState', () => {
    it('should generate a base64 encoded state with nonce', () => {
      const state = service.generateState('login');

      expect(state).toBeTruthy();
      expect(typeof state).toBe('string');

      // Should be valid base64
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      expect(decoded.nonce).toBeTruthy();
      expect(decoded.type).toBe('login');
    });

    it('should include userId for connect flow', () => {
      const userId = 'user-123';
      const state = service.generateState('connect', userId);

      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      expect(decoded.userId).toBe(userId);
      expect(decoded.type).toBe('connect');
    });

    it('should generate unique nonces', () => {
      const state1 = service.generateState('login');
      const state2 = service.generateState('login');

      const decoded1 = JSON.parse(Buffer.from(state1, 'base64').toString());
      const decoded2 = JSON.parse(Buffer.from(state2, 'base64').toString());

      expect(decoded1.nonce).not.toBe(decoded2.nonce);
    });
  });

  describe('validateAndConsumeState', () => {
    it('should validate and consume a valid state', async () => {
      const state = service.generateState('login');

      const result = await service.validateAndConsumeState(state);

      expect(result).not.toBeNull();
      expect(result?.type).toBe('login');
      expect(result?.nonce).toBeTruthy();
    });

    it('should return userId for connect flow', async () => {
      const userId = 'user-123';
      const state = service.generateState('connect', userId);

      const result = await service.validateAndConsumeState(state);

      expect(result?.userId).toBe(userId);
      expect(result?.type).toBe('connect');
    });

    it('should reject invalid base64 state', async () => {
      const result = await service.validateAndConsumeState('not-valid-base64!!!');

      expect(result).toBeNull();
    });

    it('should reject state with invalid JSON', async () => {
      const invalidState = Buffer.from('not-json').toString('base64');

      const result = await service.validateAndConsumeState(invalidState);

      expect(result).toBeNull();
    });

    it('should reject state with missing nonce', async () => {
      const stateWithoutNonce = Buffer.from(JSON.stringify({ type: 'login' })).toString('base64');

      const result = await service.validateAndConsumeState(stateWithoutNonce);

      expect(result).toBeNull();
    });

    it('should reject state with unknown nonce (forged state)', async () => {
      // Attacker creates their own state with a fake nonce
      const forgedState = Buffer.from(JSON.stringify({
        nonce: 'attacker-fake-nonce',
        type: 'connect',
        userId: 'victim-user-id',
      })).toString('base64');

      const result = await service.validateAndConsumeState(forgedState);

      expect(result).toBeNull();
    });

    it('should prevent nonce reuse (replay attack)', async () => {
      const state = service.generateState('login');

      // First use: should succeed
      const result1 = await service.validateAndConsumeState(state);
      expect(result1).not.toBeNull();

      // Second use: should fail (nonce already consumed)
      const result2 = await service.validateAndConsumeState(state);
      expect(result2).toBeNull();
    });

    it('should reject expired nonce', async () => {
      // Generate state
      const state = service.generateState('login');

      // Manually expire the nonce by manipulating internal state
      // This tests the expiration logic
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());
      service['expireNonce'](decoded.nonce);

      const result = await service.validateAndConsumeState(state);

      expect(result).toBeNull();
    });
  });

  describe('security scenarios', () => {
    it('should prevent account takeover via forged connect state', async () => {
      // Attacker tries to connect their GitHub to victim's account
      // by crafting a state with victim's userId

      const victimUserId = 'victim-user-id';

      // Attacker creates forged state
      const forgedState = Buffer.from(JSON.stringify({
        nonce: 'attacker-controlled-nonce',
        type: 'connect',
        userId: victimUserId,
      })).toString('base64');

      // The forged state should be rejected because the nonce is unknown
      const result = await service.validateAndConsumeState(forgedState);
      expect(result).toBeNull();
    });

    it('should validate that userId in state matches original', async () => {
      // Generate legitimate state for user A
      const userAId = 'user-a';
      const state = service.generateState('connect', userAId);

      // Extract nonce from legitimate state
      const decoded = JSON.parse(Buffer.from(state, 'base64').toString());

      // Attacker tries to reuse the nonce but with different userId
      const tamperedState = Buffer.from(JSON.stringify({
        nonce: decoded.nonce,
        type: 'connect',
        userId: 'victim-user-b', // Different user!
      })).toString('base64');

      // Should reject because userId doesn't match stored userId for this nonce
      const result = await service.validateAndConsumeState(tamperedState);
      expect(result).toBeNull();
    });
  });
});
