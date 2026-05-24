# Dark Luxury Instagram Automation — Setup Guide

## What this system does

- **6 AM daily**: Claude generates a full post package (copy, image prompt, hashtags, slides)
- **You open the approval URL**: Review everything, paste in your image URL, hit Approve
- **Scheduled posting windows**: System auto-posts to your Instagram at the right time
- **You stay in control**: Nothing ever posts without your explicit approval

---

## Step 1 — Get your Meta API credentials

Your Instagram must be a **Business account** linked to a Facebook Page.

1. Go to [developers.facebook.com](https://developers.facebook.com)
2. Create a new App → choose **Business** type
3. Add the **Instagram Graph API** product
4. Under **Instagram** → **API Setup with Instagram Business Login**:
   - Connect your Instagram Business account
   - Generate a **long-lived User Access Token** (valid 60 days — refresh monthly)
5. Get your **Instagram Account ID**:
   ```
   curl "https://graph.facebook.com/v19.0/me/accounts?access_token=YOUR_TOKEN"
   ```
   Then:
   ```
   curl "https://graph.facebook.com/v19.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN"
   ```
   The `id` inside `instagram_business_account` is your `INSTAGRAM_ACCOUNT_ID`.

---

## Step 2 — Deploy to Railway (free tier)

1. Go to [railway.app](https://railway.app) — sign up free
2. Click **New Project** → **Deploy from GitHub repo**
3. Upload this folder as a GitHub repo (or use Railway's CLI: `railway init`)
4. In Railway dashboard → **Variables**, add these:

| Variable | Value |
|---|---|
| `ANTHROPIC_API_KEY` | Your Claude API key from console.anthropic.com |
| `META_ACCESS_TOKEN` | From Step 1 above |
| `INSTAGRAM_ACCOUNT_ID` | From Step 1 above |
| `APPROVAL_SECRET` | Pick any password, e.g. `darklux2026` |
| `GENERATE_ON_STARTUP` | `true` (for first launch only — remove after) |
| `PORT` | `3000` |

5. Deploy — Railway gives you a public URL like `https://darkluxury-production.up.railway.app`

---

## Step 3 — Your daily workflow (takes 10–15 min)

### Morning (when you get the email/notification):

1. Open your Railway URL:
   ```
   https://YOUR-RAILWAY-URL.railway.app?token=YOUR_APPROVAL_SECRET
   ```

2. You'll see today's generated post with:
   - The image prompt to copy
   - All slide copy (for carousels)
   - The caption + hashtags

3. **Create your image:**
   - Paste the image prompt into [ChatGPT](https://chat.openai.com) (free) or [Higgsfield](https://higgsfield.ai) (free tier)
   - Download the image
   - Upload to [Imgur](https://imgur.com) or [Cloudinary](https://cloudinary.com) (both free) to get a public URL

4. **For carousels:** Open Canva (free), use the image as your background, add the slide copy text

5. **Paste the image URL** into the approval form

6. Hit **APPROVE + QUEUE** to schedule at the next posting window
   — or **POST NOW** to publish immediately

---

## Step 4 — Keep your Meta token alive

Meta access tokens expire every 60 days. Set a calendar reminder to refresh:

```bash
# Refresh token command (run in terminal or Railway console):
curl "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_CURRENT_TOKEN"
```

Update the `META_ACCESS_TOKEN` variable in Railway with the new token.

---

## Step 5 — Monetization setup

Once you're posting consistently for 2–4 weeks:

### Affiliate links (start immediately):
- [Amazon Associates](https://affiliate-program.amazon.com) — no minimum followers
- [Impact.com](https://impact.com) — wealth/finance brands, $100–$500/referral
- [ClickBank](https://clickbank.com) — mindset/self-help products

### DM automation (ManyChat — free tier):
1. Sign up at [manychat.com](https://manychat.com)
2. Connect your Instagram Business account
3. Create a keyword trigger: when someone comments "WEALTH" → auto-DM them your freebie link
4. Your freebie = a simple PDF you create once (Claude can write it for you)

### Digital product:
- Create a PDF guide on Canva (free)
- Sell it on [Gumroad](https://gumroad.com) (free to list, 10% fee on sales)
- Price: $7–$27 to start

---

## File structure

```
darkluxury/
├── index.js          ← Entry point (starts everything)
├── config.js         ← Your settings (edit this)
├── generator.js      ← Calls Claude to create post packages
├── poster.js         ← Calls Meta API to publish
├── scheduler.js      ← Daily cron jobs
├── server.js         ← Approval web UI
├── package.json
├── railway.toml      ← Deployment config
├── queue/
│   ├── pending/      ← Generated, awaiting your review
│   ├── approved/     ← Approved, queued to post
│   └── posted/       ← Archive of everything posted
└── logs/
    ├── generated.log
    └── errors.log
```

---

## Troubleshooting

**"Meta API error: (#10) Not enough permission"**
→ Your token doesn't have `instagram_basic` and `instagram_content_publish` permissions. Regenerate with those scopes checked.

**"Carousel requires imageUrls"**
→ You approved without adding image URLs. Go back to the UI, add public image links, re-approve.

**Post generates but never publishes**
→ Check that your posting windows in `config.js` match the timezone Railway is running in (set `TZ=America/New_York` in Railway variables).

**Token expired**
→ Follow Step 4 above to refresh your Meta access token.
