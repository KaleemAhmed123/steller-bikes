import process from 'node:process';
import { MongoMemoryReplSet } from 'mongodb-memory-server';

// Runs before the test files (via `--import`) so `NODE_ENV` and the database URL
// are in place before any test file's top-level code reads them.
process.env.NODE_ENV = 'test';

// Start an in-memory MongoDB and publish its URL BEFORE the test files read
// MONGODB_URI. It's a **replica set** (not a single node) because the checkout /
// cancel-restock tests use transactions, which only work on a replica set.
//
// Why this exists: the DB-backed tests used to point at the live Atlas cluster —
// they needed a secret + the internet and were flaky in parallel. This throwaway
// server makes `npm test` hermetic: it runs offline, needs no secret, and is safe
// in CI. loadEnvFile() (called inside each test file) never overrides a variable
// that's already set, so this in-memory URL wins over any real backend/.env.
const mem = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
process.env.MONGODB_URI = mem.getUri();

// Best-effort teardown when the test process exits (each test file runs in its own
// child process, so each gets — and stops — its own server).
const stop = (): void => {
  void mem.stop();
};
process.on('beforeExit', stop);
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
