// ─────────────────────────────────────────────
//  BUILDIN EMPIRES — SCHEDULER
// ─────────────────────────────────────────────

import cron from 'node-cron';
import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import { generatePost } from './generator.js';
import { publishApprovedPost } from './poster.js';

const APPROVED_DIR = '/app/queue/approved';
const LOG_FILE     = '/app/logs/activity.log';

async function log(msg) {
  const line = `${new Date().toISOString()} | ${msg}\n`;
  console.log(msg);
  await fs.appendFile(LOG_FILE, line).catch(() => {});
}

function isPostingWindow() {
  const now     = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  const windows = CONFIG.SCHEDULE[dayName] || [];
  return windows.some(w => {
    const [wh, wm] = w.split(':').map(Number);
    const diff = Math.abs((now.getHours() * 60 + now.getMinutes()) - (wh * 60 + wm));
    return diff <= 10;
  });
}

async function checkAndPublish() {
  if (!isPostingWindow()) return;
  let files;
  try { files = await fs.readdir(APPROVED_DIR); }
  catch { return; }

  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
  if (jsonFiles.length === 0) return;

  const filePath = path.join(APPROVED_DIR, jsonFiles[0]);
  try {
    const post = JSON.parse(await fs.readFile(filePath, 'utf8'));
    if (!post.imageUrls || post.imageUrls.length === 0) {
      await log(`[Scheduler] Skipping ${post.id} — no image URLs set yet`);
      return;
    }
    await log(`[Scheduler] Posting window — publishing ${post.id}`);
    await publishApprovedPost(post);
    await log(`[Scheduler] Posted successfully!`);
  } catch (e) {
    await log(`[Scheduler] Publish failed: ${e.message}`);
  }
}

async function runDailyGeneration() {
  try {
    await log('[Scheduler] Running daily content generation...');
    const post = await generatePost();
    if (post) await log(`[Scheduler] Generated: ${post.id} (${post.type})`);
  } catch (e) {
    await log(`[Scheduler] Generation failed: ${e.message}`);
  }
}

export function startScheduler() {
  cron.schedule('0 6 * * *', runDailyGeneration, { timezone: 'America/New_York' });
  cron.schedule('*/5 * * * *', checkAndPublish);
  console.log('[Scheduler] Started — generates daily at 6 AM ET, checks posting windows every 5 min');
}
