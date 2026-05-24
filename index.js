// ─────────────────────────────────────────────
//  DARK LUXURY INSTAGRAM AUTOMATION
//  Main entry point — starts server + scheduler
// ─────────────────────────────────────────────

import { startApprovalServer } from './server.js';
import { startScheduler } from './scheduler.js';
import { generatePost } from './generator.js';

console.log(`
╔══════════════════════════════════════════╗
║   DARK LUXURY INSTAGRAM AUTOMATION       ║
║   Starting up...                         ║
╚══════════════════════════════════════════╝
`);

// Validate required env vars
const required = ['ANTHROPIC_API_KEY', 'META_ACCESS_TOKEN', 'INSTAGRAM_ACCOUNT_ID'];
const missing = required.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.warn(`[Startup] WARNING: Missing env vars: ${missing.join(', ')}`);
  console.warn('[Startup] Add them to Railway environment variables before deploying.');
}

// Start the approval web server
startApprovalServer();

// Start the daily scheduler
startScheduler();

// On first launch, generate a post immediately so you have something to review
if (process.env.GENERATE_ON_STARTUP === 'true') {
  console.log('[Startup] GENERATE_ON_STARTUP=true — generating first post now...');
  generatePost().then(post => {
    console.log(`[Startup] First post ready: ${post.id}`);
    console.log(`[Startup] Open the approval UI to review it.`);
  }).catch(e => {
    console.error('[Startup] Generation failed:', e.message);
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[Shutdown] Received SIGTERM — shutting down cleanly');
  process.exit(0);
});
