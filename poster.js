// ─────────────────────────────────────────────
//  INSTAGRAM POSTER
//  Uses Meta Graph API to publish approved posts
//  Requires: Business IG account linked to Meta App
// ─────────────────────────────────────────────

import fs from 'fs/promises';
import path from 'path';
import { CONFIG } from './config.js';

const BASE_URL = 'https://graph.facebook.com/v19.0';

// ── Helper: Meta API call ──────────────────────

async function metaPost(endpoint, body) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...body, access_token: CONFIG.META_ACCESS_TOKEN }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`Meta API error: ${data.error.message}`);
  return data;
}

// ── Step 1: Upload image container ────────────

async function createImageContainer(imageUrl, caption, isCarouselItem = false) {
  const body = {
    image_url: imageUrl,
    caption: isCarouselItem ? undefined : caption,
    is_carousel_item: isCarouselItem || undefined,
  };
  const result = await metaPost(`/${CONFIG.INSTAGRAM_ACCOUNT_ID}/media`, body);
  return result.id; // creation_id
}

// ── Step 2: Publish container ──────────────────

async function publishContainer(creationId) {
  const result = await metaPost(`/${CONFIG.INSTAGRAM_ACCOUNT_ID}/media_publish`, {
    creation_id: creationId,
  });
  return result.id; // post id
}

// ── Step 3: Publish carousel ──────────────────

async function publishCarousel(imageUrls, caption) {
  // Upload each slide as a carousel item
  const itemIds = [];
  for (const url of imageUrls) {
    const id = await createImageContainer(url, null, true);
    itemIds.push(id);
    await new Promise(r => setTimeout(r, 1000)); // rate limit buffer
  }

  // Create the carousel container
  const carouselResult = await metaPost(`/${CONFIG.INSTAGRAM_ACCOUNT_ID}/media`, {
    media_type: 'CAROUSEL',
    children: itemIds.join(','),
    caption,
  });

  // Publish it
  return await publishContainer(carouselResult.id);
}

// ── Step 4: Publish Reel (video) ──────────────

async function publishReel(videoUrl, caption) {
  // Upload video container
  const container = await metaPost(`/${CONFIG.INSTAGRAM_ACCOUNT_ID}/media`, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    share_to_feed: true,
  });

  // Wait for processing (Reels take 30–90s)
  console.log('[Poster] Waiting for Reel to process...');
  await waitForMediaReady(container.id);

  return await publishContainer(container.id);
}

// ── Wait for media processing ─────────────────

async function waitForMediaReady(containerId, maxRetries = 12) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise(r => setTimeout(r, 10000)); // wait 10s
    const url = `${BASE_URL}/${containerId}?fields=status_code&access_token=${CONFIG.META_ACCESS_TOKEN}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log(`[Poster] Media status: ${data.status_code}`);
    if (data.status_code === 'FINISHED') return true;
    if (data.status_code === 'ERROR') throw new Error('Media processing failed on Meta side');
  }
  throw new Error('Media processing timed out');
}

// ── Main publish function ─────────────────────

export async function publishApprovedPost(postPackage) {
  const { type, content, hashtags } = postPackage;

  console.log(`\n[Poster] Publishing ${type} post...`);

  // Build full caption with hashtags
  const buildCaption = (base) => `${base}\n\n.\n.\n.\n${hashtags}`;

  let postId;

  if (type === 'carousel') {
    // imageUrls must be publicly accessible CDN URLs
    // These come from the approval step where user uploads Canva exports
    if (!postPackage.imageUrls || postPackage.imageUrls.length === 0) {
      throw new Error('Carousel requires imageUrls — upload your Canva slides first');
    }
    const caption = buildCaption(content.caption);
    postId = await publishCarousel(postPackage.imageUrls, caption);

  } else if (type === 'reel') {
    if (!postPackage.videoUrl && !postPackage.imageUrls?.[0]) {
      throw new Error('Reel requires videoUrl or at least one imageUrl');
    }
    const caption = buildCaption(content.caption);
    if (postPackage.videoUrl) {
      postId = await publishReel(postPackage.videoUrl, caption);
    } else {
      // Fallback: post as single image if no video yet
      const creationId = await createImageContainer(postPackage.imageUrls[0], caption);
      await new Promise(r => setTimeout(r, 3000));
      postId = await publishContainer(creationId);
    }

  } else {
    // Quote / single image
    if (!postPackage.imageUrls?.[0]) {
      throw new Error('Quote post requires at least one imageUrl');
    }
    const caption = buildCaption(content.caption);
    const creationId = await createImageContainer(postPackage.imageUrls[0], caption);
    await new Promise(r => setTimeout(r, 3000));
    postId = await publishContainer(creationId);
  }

  console.log(`[Poster] Published! Instagram post ID: ${postId}`);

  // Move from approved → posted
  const postedPackage = {
    ...postPackage,
    status: 'posted',
    postedAt: new Date().toISOString(),
    instagramPostId: postId,
  };

  await fs.writeFile(
    path.join('/home/claude/darkluxury/queue/posted', `${postPackage.id}.json`),
    JSON.stringify(postedPackage, null, 2)
  );

  // Remove from approved queue
  try {
    await fs.unlink(path.join('/home/claude/darkluxury/queue/approved', `${postPackage.id}.json`));
  } catch (_) {}

  return postId;
}
