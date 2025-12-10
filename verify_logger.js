
// Mock console methods
const originalLog = console.log;
const originalError = console.error;

console.log = (arg) => process.stdout.write(`[LOG] ${arg}\n`);
console.error = (arg1, arg2) => {
    if (arg2) process.stdout.write(`[ERROR] ${arg1} ${JSON.stringify(arg2)}\n`);
    else process.stdout.write(`[ERROR] ${arg1}\n`);
};

// Mock process.env
const setEnv = (env) => {
    process.env.NODE_ENV = env;
    // Clear require cache for logger to pick up new env
    delete require.cache[require.resolve('./frontend/src/lib/logger.ts')];
};

async function testLogger() {
    console.log('--- Testing Development Mode ---');
    setEnv('development');
    const { logger: devLogger } = require('./frontend/src/lib/logger.ts');

    devLogger.info('This is an info message');
    devLogger.error('This is an error with payload', { sensitive: 'secret data' });

    console.log('\n--- Testing Production Mode ---');
    setEnv('production');
    const { logger: prodLogger } = require('./frontend/src/lib/logger.ts');

    prodLogger.info('This info should NOT appear');
    prodLogger.error('This error should appear without payload', { sensitive: 'should not see this' });
}

testLogger().catch(err => {
    console.error('Test failed:', err);
}).finally(() => {
    // Restore console
    console.log = originalLog;
    console.error = originalError;
});
