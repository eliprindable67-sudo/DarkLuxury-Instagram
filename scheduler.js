// ─────────────────────────────────────────────
//  SCHEDULER
//  Runs two jobs:
//  1. Daily at 6 AM → generate a new post package
//  2. Every 5 min → check if approved posts should publish
// ─────────────────────────────────────────────

import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import { generatePost } from './generator.js';
import { publishApprovedPost } from './poster.js';

const APPROVED_DIR = '/home/claude/darkluxury/queue/approved';

// ── Check if now is a posting window ──────────

function isPostingWindow() {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const windows = CONFIG.SCHEDULE[dayName] || [];
  // Match within a 10-minute window of scheduled time
  return windows.some(w => {
    const [wh, wm] = w.split(':').map(Number);
    const diff = Math.abs((now.getHours() * 60 + now.getMinutes()) - (wh * 60 + wm));
    return diff <= 10;
  });
}

// ── Auto-publisher: runs every 5 minutes ──────

async function checkAndPublishApproved() {
  if (!isPostingWindow()) return;

  let files;
  try {
    files = await fs.readdir(APPROVED_DIR);
  } catch {
    return;
  }

  const jsonFiles = files.filter(f => f.endsWith('.json'));
  if (jsonFiles.length === 0) return;

  // Publish the oldest approved post
  const oldest = jsonFiles.sort()[0];
  const filePath = path.join(APPROVED_DIR, oldest);

  try {
    const post = JSON.parse(await fs.readFile(filePath, 'utf8'));

    if (!post.imageUrls || post.imageUrls.length === 0) {
      console.log(`[Scheduler] Skipping ${post.id} — no image URLs set yet. Add them in the approval UI.`);
      return;
    }

    console.log(`\n[Scheduler] Posting window detected — publishing ${post.id}`);
    await publishApprovedPost(post);
    console.log(`[Scheduler] Success!`);
  } catch (e) {
    console.error(`[Scheduler] Publish failed:`, e.message);
    await fs.appendFile(
      '/home/claude/darkluxury/logs/errors.log',
      `${new Date().toISOString()} | ${e.message}\n`
    );
  }
}

// ── Daily generator: runs at 6 AM ─────────────

async function runDailyGeneration() {
  try {
    console.log('\n[Scheduler] Running daily content generation...');
    const post = await generatePost();
    console.log(`[Scheduler] Generated: ${post.id} (${post.type})`);
    console.log(`[Scheduler] Open your approval UI to review it!`);

    await fs.appendFile(
      '/home/claude/darkluxury/logs/generated.log',
      `${new Date().toISOString()} | ${post.id} | ${post.type} | ${post.topic}\n`
    );
  } catch (e) {
    console.error('[Scheduler] Generation failed:', e.message);
    await fs.appendFile(
      '/home/claude/darkluxury/logs/errors.log',
      `${new Date().toISOString()} | GENERATION FAILED | ${e.message}\n`
    );
  }
}

// ── Start scheduler ───────────────────────────

export function startScheduler() {
  // Generate content daily at 6 AM
  cron.schedule('0 6 * * *', runDailyGeneration, { timezone: 'America/New_York' });

  // Check posting windows every 5 minutes
  cron.schedule('*/5 * * * *', checkAndPublishApproved);

  console.log('[Scheduler] Started — content generates daily at 6 AM ET');
  console.log('[Scheduler] Posting windows checked every 5 minutes');
}
