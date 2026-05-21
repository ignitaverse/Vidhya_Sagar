/* ═══════════════════════════════════════════════════
   VidyaSagar v3 — config.js
   ⚠️  इस file में अपनी API keys भरें
═══════════════════════════════════════════════════ */

const VS_CONFIG = {
  /* ── Backend API ── */
  API: 'https://vidhya-sagar.onrender.com',

  /* ── Supabase (Typing Passages) ──
     Supabase dashboard → Settings → API */
  SUPABASE_URL:  'https://YOUR_PROJECT.supabase.co',
  SUPABASE_KEY:  'YOUR_SUPABASE_ANON_KEY',

  /* ── Firebase (Chat) ──
     Firebase console → Project Settings → Your apps */
  FIREBASE: {
    apiKey:            'YOUR_FIREBASE_API_KEY',
    authDomain:        'YOUR_PROJECT.firebaseapp.com',
    projectId:         'YOUR_PROJECT_ID',
    storageBucket:     'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId:             'YOUR_APP_ID',
    databaseURL:       'https://YOUR_PROJECT-default-rtdb.firebaseio.com'
  },

  /* ── Anthropic AI Chat ──
     (backend proxy के through call होगी — key server.js में) */
  AI_MODEL: 'claude-sonnet-4-20250514',

  /* ── App Settings ── */
  APP_NAME:    'VidyaSagar',
  APP_VERSION: '3.0.0',

  /* ── Chat auto-delete (milliseconds) ── */
  CHAT_TTL_MS: 90 * 24 * 60 * 60 * 1000, // 3 months

  /* ── Default theme ── */
  DEFAULT_THEME: 'dark',
};
