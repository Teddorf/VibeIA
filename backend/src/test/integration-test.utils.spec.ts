/**
 * Tests for Integration Test Utilities
 *
 * These tests verify that the mongodb-memory-server setup works correctly.
 */

import mongoose from 'mongoose';
import {
  setupTestDatabase,
  teardownTestDatabase,
  clearDatabase,
  getTestDatabaseUri,
  createTestTimestamps,
  waitFor,
} from './integration-test.utils';

// Extended timeout for Windows MongoDB startup
const DB_TEST_TIMEOUT = 60000; // 60 seconds

describe('Integration Test Utilities', () => {
  describe('Database Setup', () => {
    afterAll(async () => {
      await teardownTestDatabase();
    }, DB_TEST_TIMEOUT);

    it('should setup an in-memory database', async () => {
      const uri = await setupTestDatabase();

      expect(uri).toBeDefined();
      expect(uri).toContain('mongodb://');
      expect(mongoose.connection.readyState).toBe(1); // Connected
    }, DB_TEST_TIMEOUT);

    it('should allow creating and querying documents', async () => {
      // Create a simple test schema
      const TestSchema = new mongoose.Schema({
        name: String,
        value: Number,
      });

      const TestModel = mongoose.model('IntegrationTest', TestSchema);

      // Create a document
      const doc = await TestModel.create({ name: 'test', value: 42 });
      expect(doc._id).toBeDefined();
      expect(doc.name).toBe('test');

      // Query the document
      const found = await TestModel.findById(doc._id);
      expect(found).toBeDefined();
      expect(found?.value).toBe(42);

      // Cleanup
      await TestModel.deleteMany({});
    }, DB_TEST_TIMEOUT);

    it('should return the database URI', () => {
      const uri = getTestDatabaseUri();

      expect(uri).toBeDefined();
      expect(uri).toContain('mongodb://');
    });
  });

  describe('clearDatabase', () => {
    beforeAll(async () => {
      // Ensure database is setup
      if (mongoose.connection.readyState !== 1) {
        await setupTestDatabase();
      }
    }, DB_TEST_TIMEOUT);

    afterAll(async () => {
      await teardownTestDatabase();
    }, DB_TEST_TIMEOUT);

    it('should clear all documents from all collections', async () => {
      const TestSchema = new mongoose.Schema({ name: String });
      const TestModel =
        mongoose.models.ClearTest || mongoose.model('ClearTest', TestSchema);

      // Create some documents
      await TestModel.create({ name: 'doc1' });
      await TestModel.create({ name: 'doc2' });

      let count = await TestModel.countDocuments();
      expect(count).toBe(2);

      // Clear database
      await clearDatabase();

      count = await TestModel.countDocuments();
      expect(count).toBe(0);
    }, DB_TEST_TIMEOUT);
  });

  describe('createTestTimestamps', () => {
    it('should return createdAt and updatedAt dates', () => {
      const timestamps = createTestTimestamps();

      expect(timestamps.createdAt).toBeInstanceOf(Date);
      expect(timestamps.updatedAt).toBeInstanceOf(Date);
      expect(timestamps.createdAt.getTime()).toBe(timestamps.updatedAt.getTime());
    });
  });

  describe('waitFor', () => {
    it('should resolve when condition becomes true', async () => {
      let counter = 0;
      const interval = setInterval(() => counter++, 50);

      await waitFor(() => counter >= 3, 1000, 50);

      clearInterval(interval);
      expect(counter).toBeGreaterThanOrEqual(3);
    });

    it('should timeout if condition is never met', async () => {
      await expect(waitFor(() => false, 200, 50)).rejects.toThrow(
        'Condition not met within 200ms',
      );
    });

    it('should work with async conditions', async () => {
      let value = false;
      setTimeout(() => (value = true), 100);

      await waitFor(async () => value, 500, 50);

      expect(value).toBe(true);
    });
  });
});
