import { startApprovalServer } from './server.js';
import { startScheduler } from './scheduler.js';
import { generatePost } from './generator.js';
import fs from 'fs/promises';

console.log(`
╔══════════════════════════════════════════╗
║   DARK LUXURY INSTAGRAM AUTOMATION       ║
║   Starting up...                         ║
╚══════════════════════════════════════════╝
`);

// Create queue folders if they don't exist
const dirs = [
  '/home/claude/darkluxury/queue/pending',
  '/home/claude/darkluxury/queue/approved',
  '/home/claude/darkluxury/queue/posted',
  '/home/claude/darkluxury/logs',
];
for (const dir of dirs) {
  await fs.mkdir(dir, { recursive: true });
}
console.log('[Startup] Queue folders ready');

// Validate required env vars
const required = ['ANTHROPIC_API_KEY', 'META_ACCESS_TOKEN', 'INSTAGRAM_ACCOUNT_ID'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn(`[Startup] WARNING: Missing env vars: ${missing.join(', ')}`);
}

startApprovalServer();
startScheduler();

if (process.env.GENERATE_ON_STARTUP === 'true') {
  console.log('[Startup] GENERATE_ON_STARTUP=true — generating first post now...');
  generatePost().then(post => {
    console.log(`[Startup] First post ready: ${post.id}`);
    console.log(`[Startup] Open the approval UI to review it.`);
  }).catch(e => {
    console.error('[Startup] Generation failed:', e.message);
  });
}

process.on('SIGTERM', () => {
  console.log('[Shutdown] Received SIGTERM — shutting down cleanly');
  process.exit(0);
});
