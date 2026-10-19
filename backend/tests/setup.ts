import process from 'node:process';

// Runs before the test files (via --import) so config sees NODE_ENV=test. Keeps
// side-effects like real email sends from firing during tests. loadEnvFile won't
// override an already-set var, so this wins over .env.
process.env.NODE_ENV = 'test';
