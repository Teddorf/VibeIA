/**
 * Integration Test Utilities
 *
 * Provides setup and teardown utilities for integration tests
 * that require a real MongoDB connection using mongodb-memory-server.
 *
 * Usage:
 * ```typescript
 * import { setupTestDatabase, teardownTestDatabase, clearDatabase } from '../test/integration-test.utils';
 *
 * describe('MyService Integration', () => {
 *   beforeAll(async () => {
 *     await setupTestDatabase();
 *   });
 *
 *   afterAll(async () => {
 *     await teardownTestDatabase();
 *   });
 *
 *   beforeEach(async () => {
 *     await clearDatabase();
 *   });
 *
 *   it('should work with real MongoDB', async () => {
 *     // Your test here
 *   });
 * });
 * ```
 */

import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongod: MongoMemoryServer | null = null;

/**
 * Start an in-memory MongoDB server and connect mongoose to it.
 * Call this in beforeAll() of your integration test suite.
 */
export async function setupTestDatabase(): Promise<string> {
  // Close any existing connection
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  // Create new in-memory server with extended timeout for Windows
  mongod = await MongoMemoryServer.create({
    binary: {
      version: '6.0.4',
    },
    instance: {
      launchTimeout: 30000, // 30 seconds for Windows compatibility
    },
  });

  const uri = mongod.getUri();

  await mongoose.connect(uri, {
    // Modern mongoose options
  });

  return uri;
}

/**
 * Stop the in-memory MongoDB server and disconnect mongoose.
 * Call this in afterAll() of your integration test suite.
 */
export async function teardownTestDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongod) {
    await mongod.stop();
    mongod = null;
  }
}

/**
 * Clear all collections in the test database.
 * Call this in beforeEach() to ensure test isolation.
 */
export async function clearDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 1) {
    throw new Error('Database not connected. Call setupTestDatabase() first.');
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}

/**
 * Get the current MongoDB URI (useful for NestJS module configuration).
 */
export function getTestDatabaseUri(): string {
  if (!mongod) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase() first.',
    );
  }
  return mongod.getUri();
}

/**
 * Create a test module with MongoDB connection for NestJS.
 * Use this with Test.createTestingModule() for integration tests.
 *
 * @example
 * ```typescript
 * import { Test } from '@nestjs/testing';
 * import { MongooseModule } from '@nestjs/mongoose';
 * import { createTestingModuleWithDb } from '../test/integration-test.utils';
 *
 * const module = await Test.createTestingModule({
 *   imports: [
 *     MongooseModule.forRootAsync({
 *       useFactory: () => ({
 *         uri: getTestDatabaseUri(),
 *       }),
 *     }),
 *     // Your other modules
 *   ],
 * }).compile();
 * ```
 */
export async function createTestDatabaseConnection(): Promise<typeof mongoose> {
  const uri = await setupTestDatabase();
  return mongoose;
}

/**
 * Helper to create test documents with timestamps
 */
export function createTestTimestamps() {
  const now = new Date();
  return {
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Helper to wait for a condition (useful for async operations)
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Condition not met within ${timeout}ms`);
}
