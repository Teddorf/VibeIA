import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';

describe('EncryptionService', () => {
    let service: EncryptionService;
    const originalEnv = process.env;

    beforeEach(async () => {
        // Set required environment variables for encryption
        process.env = {
            ...originalEnv,
            ENCRYPTION_KEY: 'test-encryption-key-32-chars-long!',
            ENCRYPTION_SALT: 'test-salt-16-chars',
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [EncryptionService],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('getKey', () => {
        it('should throw error if ENCRYPTION_KEY is not set', () => {
            delete process.env.ENCRYPTION_KEY;

            expect(() => (service as any).getKey()).toThrow(
                'ENCRYPTION_KEY and ENCRYPTION_SALT must be configured',
            );
        });

        it('should throw error if ENCRYPTION_SALT is not set', () => {
            delete process.env.ENCRYPTION_SALT;

            expect(() => (service as any).getKey()).toThrow(
                'ENCRYPTION_KEY and ENCRYPTION_SALT must be configured',
            );
        });

        it('should generate different keys with different salts', () => {
            process.env.ENCRYPTION_SALT = 'salt-one-16-chars';
            const key1 = (service as any).getKey();

            process.env.ENCRYPTION_SALT = 'salt-two-16-chars';
            const key2 = (service as any).getKey();

            expect(key1).not.toEqual(key2);
        });

        it('should generate 32-byte key', () => {
            const key = (service as any).getKey();
            expect(key.length).toBe(32);
        });
    });

    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt successfully', () => {
            const text = 'secret-text';
            const encrypted = service.encrypt(text);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(text);
            expect(encrypted).not.toBe(text);
            expect(encrypted).toContain(':'); // iv:tag:content
        });

        it('should produce different ciphertext for same plaintext (due to random IV)', () => {
            const text = 'same-text';
            const encrypted1 = service.encrypt(text);
            const encrypted2 = service.encrypt(text);

            expect(encrypted1).not.toBe(encrypted2);
            expect(service.decrypt(encrypted1)).toBe(text);
            expect(service.decrypt(encrypted2)).toBe(text);
        });

        it('should fail with invalid encrypted format', () => {
            expect(() => service.decrypt('invalid')).toThrow('Failed to decrypt data');
        });

        it('should fail with tampered auth tag', () => {
            const encrypted = service.encrypt('test');
            const [iv, tag, content] = encrypted.split(':');
            // Flip a bit in the auth tag to simulate tampering
            const tamperedTag = (parseInt(tag.slice(0, 2), 16) ^ 1).toString(16).padStart(2, '0') + tag.slice(2);
            const tampered = `${iv}:${tamperedTag}:${content}`;

            expect(() => service.decrypt(tampered)).toThrow('Failed to decrypt data');
        });
    });

    describe('maskApiKey', () => {
        it('should mask API key showing only last 4 chars', () => {
            expect(service.maskApiKey('sk-ant-api-key-12345')).toBe('••••••••2345');
        });

        it('should return masked placeholder for short keys', () => {
            expect(service.maskApiKey('short')).toBe('••••••••');
        });

        it('should return masked placeholder for empty keys', () => {
            expect(service.maskApiKey('')).toBe('••••••••');
        });
    });
});
