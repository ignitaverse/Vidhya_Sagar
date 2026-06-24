// ══════════════════════════════════════════
// server.js mein yeh line add karo
// (app.use('/api/typing'...) ke baad)
// ══════════════════════════════════════════

app.use('/api/game', require('./routes/game'));

// ══════════════════════════════════════════
// .env mein yeh 2 lines add karo
// ══════════════════════════════════════════

// UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
// UPSTASH_REDIS_REST_TOKEN=your_token_here

// ══════════════════════════════════════════
// package.json mein install karo
// ══════════════════════════════════════════

// npm install @upstash/redis
