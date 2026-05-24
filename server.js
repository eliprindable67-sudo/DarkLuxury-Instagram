// ─────────────────────────────────────────────
//  APPROVAL SERVER
//  Opens a web UI at your Railway URL so you can:
//  1. See the generated post (copy, image prompt, slides)
//  2. Add your image URLs after creating in Canva/ChatGPT
//  3. Hit "Approve" → queues for next posting window
//  4. Hit "Reject" → removes from queue
// ─────────────────────────────────────────────

import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';
import { publishApprovedPost } from './poster.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PENDING_DIR  = '/home/claude/darkluxury/queue/pending';
const APPROVED_DIR = '/home/claude/darkluxury/queue/approved';
const POSTED_DIR   = '/home/claude/darkluxury/queue/posted';

// ── Auth middleware ────────────────────────────

function requireAuth(req, res, next) {
  const token = req.query.token || req.body.token || req.headers['x-approval-token'];
  if (token !== CONFIG.APPROVAL_SECRET) {
    return res.status(401).send('<h2>Unauthorized — add ?token=YOUR_SECRET to the URL</h2>');
  }
  next();
}

// ── Helper: render a post card ─────────────────

function renderPost(post, status = 'pending') {
  const c = post.content;
  const isCarousel = post.type === 'carousel';
  const isReel = post.type === 'reel';

  let slidesHtml = '';
  if (isCarousel && c.slides) {
    slidesHtml = c.slides.map(s =>
      `<div style="border-left:3px solid #c9a84c;padding:8px 12px;margin:6px 0">
        <strong>Slide ${s.slide_number}:</strong> ${s.headline}<br>
        <span style="color:#888;font-size:13px">${s.body}</span>
      </div>`
    ).join('');
  }

  const actionButtons = status === 'pending' ? `
    <div style="margin-top:20px">
      <form method="POST" action="/approve?token=${CONFIG.APPROVAL_SECRET}" style="display:inline">
        <input type="hidden" name="postId" value="${post.id}">
        <label style="display:block;margin-bottom:8px;font-size:13px;color:#888">
          Public image URL(s) — paste CDN/Imgur/Cloudinary link(s), comma-separated:
        </label>
        <input type="text" name="imageUrls" placeholder="https://i.imgur.com/xxx.jpg, https://..." 
          style="width:100%;padding:8px;background:#111;color:#fff;border:1px solid #333;border-radius:6px;margin-bottom:8px">
        <label style="display:block;margin-bottom:8px;font-size:13px;color:#888">
          Video URL (Reels only — leave blank for image post):
        </label>
        <input type="text" name="videoUrl" placeholder="https://..." 
          style="width:100%;padding:8px;background:#111;color:#fff;border:1px solid #333;border-radius:6px;margin-bottom:12px">
        <button type="submit" style="background:#c9a84c;color:#000;border:none;padding:10px 24px;border-radius:6px;font-weight:bold;cursor:pointer;margin-right:10px">
          APPROVE + QUEUE
        </button>
      </form>
      <form method="POST" action="/reject?token=${CONFIG.APPROVAL_SECRET}" style="display:inline">
        <input type="hidden" name="postId" value="${post.id}">
        <button type="submit" style="background:#333;color:#fff;border:none;padding:10px 24px;border-radius:6px;cursor:pointer">
          REJECT
        </button>
      </form>
      <form method="POST" action="/post-now?token=${CONFIG.APPROVAL_SECRET}" style="display:inline;margin-left:10px">
        <input type="hidden" name="postId" value="${post.id}">
        <input type="hidden" name="imageUrls" id="nowImgUrls">
        <button type="submit" style="background:#1a1a2e;color:#c9a84c;border:1px solid #c9a84c;padding:10px 24px;border-radius:6px;cursor:pointer">
          POST NOW
        </button>
      </form>
    </div>` : `<div style="color:#4caf50;font-weight:bold;margin-top:12px">
      ${status === 'approved' ? 'APPROVED — scheduled for next posting window' : 'POSTED to Instagram'}
    </div>`;

  return `
    <div style="background:#0d0d0d;border:1px solid #222;border-radius:10px;padding:20px;margin-bottom:24px;font-family:sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div>
          <span style="background:#c9a84c22;color:#c9a84c;padding:4px 10px;border-radius:20px;font-size:12px;text-transform:uppercase">${post.type}</span>
          <span style="color:#666;font-size:12px;margin-left:10px">${new Date(post.generatedAt).toLocaleString()}</span>
        </div>
        <span style="color:#444;font-size:12px">${post.id}</span>
      </div>

      <div style="background:#c9a84c11;border-left:4px solid #c9a84c;padding:12px;border-radius:6px;margin-bottom:16px">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px">Topic</div>
        <div style="color:#fff;font-size:14px;margin-top:4px">${post.topic}</div>
      </div>

      ${isCarousel ? `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Hook slide</div>
          <div style="color:#c9a84c;font-size:18px;font-weight:bold">${c.hook_slide}</div>
          ${slidesHtml}
          <div style="border-left:3px solid #4caf50;padding:8px 12px;margin:6px 0;color:#4caf50">${c.cta_slide}</div>
        </div>` : ''}

      ${isReel ? `
        <div style="margin-bottom:16px">
          <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">Text sequence</div>
          ${(c.text_sequence || []).map(t =>
            `<div style="color:#fff;padding:4px 0"><span style="color:#666;font-size:12px">@${t.second}s</span> ${t.text}</div>`
          ).join('')}
          <div style="color:#888;font-size:13px;margin-top:8px">Audio vibe: ${c.audio_suggestion}</div>
        </div>` : ''}

      ${!isCarousel && !isReel ? `
        <div style="margin-bottom:16px">
          <div style="color:#c9a84c;font-size:20px;font-weight:bold;line-height:1.4">"${c.quote}"</div>
          ${c.subtext ? `<div style="color:#888;margin-top:8px">${c.subtext}</div>` : ''}
        </div>` : ''}

      <div style="background:#111;border-radius:6px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Caption</div>
        <div style="color:#ccc;font-size:13px;line-height:1.6">${c.caption}</div>
      </div>

      <div style="background:#111;border-radius:6px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Image prompt (paste into ChatGPT / Higgsfield)</div>
        <div style="color:#aaa;font-size:12px;font-family:monospace;line-height:1.6">${c.image_prompt}</div>
      </div>

      <div style="background:#111;border-radius:6px;padding:12px;margin-bottom:12px">
        <div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">Hashtags</div>
        <div style="color:#666;font-size:12px">${post.hashtags}</div>
      </div>

      ${actionButtons}
    </div>`;
}

// ── Routes ─────────────────────────────────────

// Dashboard
app.get('/', requireAuth, async (req, res) => {
  const [pendingFiles, approvedFiles, postedFiles] = await Promise.all([
    fs.readdir(PENDING_DIR).catch(() => []),
    fs.readdir(APPROVED_DIR).catch(() => []),
    fs.readdir(POSTED_DIR).catch(() => []),
  ]);

  const loadPosts = async (dir, files) =>
    Promise.all(files.filter(f => f.endsWith('.json')).map(async f => {
      const content = await fs.readFile(path.join(dir, f), 'utf8');
      return JSON.parse(content);
    }));

  const [pending, approved, posted] = await Promise.all([
    loadPosts(PENDING_DIR, pendingFiles),
    loadPosts(APPROVED_DIR, approvedFiles),
    loadPosts(POSTED_DIR, postedFiles),
  ]);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dark Luxury — Approval Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0 }
    body { background: #050505; color: #fff; padding: 24px; max-width: 800px; margin: 0 auto; font-family: system-ui, sans-serif }
    h1 { color: #c9a84c; font-size: 20px; margin-bottom: 4px }
    h2 { color: #888; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 12px }
    .stats { display: flex; gap: 12px; margin: 16px 0 }
    .stat { background: #111; border-radius: 8px; padding: 12px 20px; flex: 1; text-align: center }
    .stat .num { font-size: 28px; font-weight: bold; color: #c9a84c }
    .stat .lbl { font-size: 11px; color: #666; text-transform: uppercase; margin-top: 4px }
  </style>
</head>
<body>
  <h1>Dark Luxury — Content Approval</h1>
  <p style="color:#666;font-size:13px;margin-top:4px">Review, add image URLs, then approve or reject.</p>
  
  <div class="stats">
    <div class="stat"><div class="num">${pending.length}</div><div class="lbl">Pending</div></div>
    <div class="stat"><div class="num">${approved.length}</div><div class="lbl">Approved</div></div>
    <div class="stat"><div class="num">${posted.length}</div><div class="lbl">Posted</div></div>
  </div>

  ${pending.length > 0 ? `<h2>Needs your review</h2>${pending.map(p => renderPost(p, 'pending')).join('')}` : ''}
  ${approved.length > 0 ? `<h2>Approved — queued</h2>${approved.map(p => renderPost(p, 'approved')).join('')}` : ''}
  ${posted.length > 0 ? `<h2>Posted</h2>${posted.slice(-5).reverse().map(p => renderPost(p, 'posted')).join('')}` : ''}
  
  ${pending.length === 0 && approved.length === 0 ? '<div style="color:#444;text-align:center;padding:60px 0">No posts queued — generator runs at 6 AM daily.</div>' : ''}
</body>
</html>`;

  res.send(html);
});

// Approve route
app.post('/approve', requireAuth, async (req, res) => {
  const { postId, imageUrls, videoUrl } = req.body;
  const filePath = path.join(PENDING_DIR, `${postId}.json`);
  const post = JSON.parse(await fs.readFile(filePath, 'utf8'));

  post.status = 'approved';
  post.approvedAt = new Date().toISOString();
  post.imageUrls = imageUrls ? imageUrls.split(',').map(u => u.trim()).filter(Boolean) : [];
  post.videoUrl = videoUrl?.trim() || null;

  await fs.writeFile(path.join(APPROVED_DIR, `${postId}.json`), JSON.stringify(post, null, 2));
  await fs.unlink(filePath);

  res.redirect(`/?token=${CONFIG.APPROVAL_SECRET}&msg=approved`);
});

// Reject route
app.post('/reject', requireAuth, async (req, res) => {
  const { postId } = req.body;
  await fs.unlink(path.join(PENDING_DIR, `${postId}.json`)).catch(() => {});
  res.redirect(`/?token=${CONFIG.APPROVAL_SECRET}&msg=rejected`);
});

// Post immediately route
app.post('/post-now', requireAuth, async (req, res) => {
  const { postId, imageUrls, videoUrl } = req.body;
  const filePath = path.join(PENDING_DIR, `${postId}.json`).replace('pending', 'approved');
  const pendingPath = path.join(PENDING_DIR, `${postId}.json`);

  try {
    let post;
    try {
      post = JSON.parse(await fs.readFile(filePath, 'utf8'));
    } catch {
      post = JSON.parse(await fs.readFile(pendingPath, 'utf8'));
    }

    post.status = 'approved';
    post.imageUrls = imageUrls ? imageUrls.split(',').map(u => u.trim()).filter(Boolean) : post.imageUrls || [];
    post.videoUrl = videoUrl?.trim() || post.videoUrl || null;

    await publishApprovedPost(post);
    res.redirect(`/?token=${CONFIG.APPROVAL_SECRET}&msg=posted`);
  } catch (e) {
    res.status(500).send(`<h2>Error: ${e.message}</h2><a href="/?token=${CONFIG.APPROVAL_SECRET}">Back</a>`);
  }
});

// Health check for Railway
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

export function startApprovalServer() {
  app.listen(CONFIG.PORT, () => {
    console.log(`[Server] Approval UI running at http://localhost:${CONFIG.PORT}?token=${CONFIG.APPROVAL_SECRET}`);
  });
}
