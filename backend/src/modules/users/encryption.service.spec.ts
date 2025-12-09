
import { Test, TestingModule } from '@nestjs/testing';
import { EncryptionService } from './encryption.service';
import * as crypto from 'crypto';

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [EncryptionService],
        }).compile();

        service = module.get<EncryptionService>(EncryptionService);
    });

    describe('getKey', () => {
        it('should use default salt if env not set', () => {
            // Access private method via any
            const key = (service as any).getKey();
            // Should be 32 bytes
            expect(key.length).toBe(32);
        });

        it('should use ENCRYPTION_SALT from env', () => {
            process.env.ENCRYPTION_SALT = 'test-salt';
            const key1 = (service as any).getKey();

            process.env.ENCRYPTION_SALT = 'different-salt';
            const key2 = (service as any).getKey();

            expect(key1).not.toEqual(key2);

            // Cleanup
            delete process.env.ENCRYPTION_SALT;
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

        it('should fail with invalid encrypted format', () => {
            expect(() => service.decrypt('invalid')).toThrow('Failed to decrypt data');
        });
    });
});
