// ─────────────────────────────────────────────
//  DARK LUXURY INSTAGRAM AUTOMATION — CONFIG
//  Fill in your keys before deploying to Railway
// ─────────────────────────────────────────────

export const CONFIG = {

  // ── ANTHROPIC (Claude) ──────────────────────
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // ── META / INSTAGRAM GRAPH API ──────────────
  // Get these from developers.facebook.com after
  // connecting your Business IG account to a Meta App
  META_ACCESS_TOKEN:    process.env.META_ACCESS_TOKEN || '',
  INSTAGRAM_ACCOUNT_ID: process.env.INSTAGRAM_ACCOUNT_ID || '',

  // ── IMAGE GENERATION ────────────────────────
  // Optional: Higgsfield API key (leave blank to use ChatGPT prompts only)
  HIGGSFIELD_API_KEY: process.env.HIGGSFIELD_API_KEY || '',

  // ── APPROVAL INTERFACE ──────────────────────
  // Secret token you type to approve posts
  APPROVAL_SECRET: process.env.APPROVAL_SECRET || 'darklux2026',
  // Port for the local approval web UI
  PORT: process.env.PORT || 3000,

  // ── POSTING SCHEDULE ────────────────────────
  // Cron format: minute hour * * dayOfWeek
  // Best windows: 7am and 6pm Tue–Thu, 7am Mon/Fri
  SCHEDULE: {
    monday:    ['07:00'],
    tuesday:   ['07:00', '18:00'],
    wednesday: ['07:00'],
    thursday:  ['07:00', '18:00'],
    friday:    ['07:00'],
    saturday:  [],
    sunday:    [],
  },

  // ── CONTENT SETTINGS ────────────────────────
  NICHE: 'dark luxury wealth mindset',
  ACCOUNT_VOICE: 'cold, direct, aspirational — never desperate, never loud. Think: midnight boardroom, not hustle bro.',
  COLOR_PALETTE: 'deep black, muted gold, slate grey, off-white',

  POST_TYPES: {
    monday:    'carousel',   // saves-first content
    tuesday:   'reel',       // reach/discovery
    wednesday: 'quote',      // DM-share trigger
    thursday:  'carousel',   // saves-first content
    friday:    'reel',       // reach/discovery
  },

  HASHTAG_SETS: {
    wealth:     '#wealthmindset #darkluxury #millionairemindset #richlifestyle #luxurylife #moneyminds #financialfreedom #elitemindset',
    discipline: '#discipline #mentalstrength #stoicmindset #silentwealth #focusedmind #grindculture #darkambition #buildingempires',
    quotes:     '#powerquotes #successquotes #motivationaldaily #mindsetshift #levelup #ambitionquotes #darkquotes #luxuryquotes',
  },
};
