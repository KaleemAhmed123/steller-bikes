import { spawn } from 'node:child_process';
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

// Clean up after ourselves. Every run makes a throwaway data folder in the OS temp directory (~150 MB); left alone
// they pile up and can fill the drive, after which every test dies at start-up ("fassert() failure").
// A file with a failing test (exit code not 0) keeps its folder, so you can look at the data.
// ponytail: on exit nothing can be awaited, and the database process is still letting go of its files (Windows
// refuses to delete them until it has). So we hand the folders to a tiny detached helper that retries for up
// to 30 s, then goes away. It never touches this process's exit code. Upgrade path: none needed.
const dataDirs = mem.servers.map((server) => server.instanceInfo?.dbPath).filter((dir): dir is string => Boolean(dir));
const HELPER = `
const fs = require('fs');
const dirs = JSON.parse(process.argv[1]);
let tries = 0;
const timer = setInterval(() => {
  let left = 0;
  for (const dir of dirs) {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* still in use: try again */ }
    if (fs.existsSync(dir)) left++;
  }
  if (!left || ++tries >= 60) clearInterval(timer);
}, 500);`;
process.on('exit', (code) => {
  if (code !== 0 || dataDirs.length === 0) return;
  try {
    spawn(process.execPath, ['-e', HELPER, JSON.stringify(dataDirs)], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  } catch {
    // cleanup is best effort; never fail a run because of it
  }
});

// Ctrl+C or a kill: stop the database and remove its folder (nobody is going to inspect an aborted run).
const abort = (): void => {
  void mem.stop();
};
process.on('SIGINT', abort);
process.on('SIGTERM', abort);
