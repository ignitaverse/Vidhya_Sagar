/* ═══════════════════════════════════════════════════
   VidyaSagar v3 — config.js
   ⚠️  इस file में अपनी API keys भरें
═══════════════════════════════════════════════════ */

const VS_CONFIG = {
  /* ── Backend API ── */
  API: 'https://vidhya-sagar.onrender.com',

  /* ── Watch Online (Player tab) - clevra_bot ka /api/catalog + /api/web-watch ── */
  WATCH_API: 'https://clevra-bot.onrender.com',

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

  /* ── Gemini AI Chat ──
     (backend proxy के through call होगी — key server.js में, GEMINI_API_KEY)
     FIX: pehle Claude tha, ab Gemini - model naam yahan sirf reference ke
     liye hai (asli model backend ke GEMINI_MODEL env var se decide hota
     hai, taaki client-side se badla na ja sake). */
  AI_MODEL: 'gemini-2.5-flash',

  /* ── App Settings ── */
  APP_NAME:    'VidyaSagar',
  APP_VERSION: '3.0.0',

  /* ── Chat auto-delete (milliseconds) ── */
  CHAT_TTL_MS: 90 * 24 * 60 * 60 * 1000, // 3 months

  /* ── Default theme ── */
  DEFAULT_THEME: 'dark',
};
