/* ═══════════════════════════════════════════════════
   VidyaSagar v5 — routes/game.js
   Redis  → Temporary room storage (2 hour TTL)
   MongoDB → Permanent game history
═══════════════════════════════════════════════════ */

const express = require('express');
const { Redis } = require('@upstash/redis');
const mongoose = require('mongoose');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

/* ── Redis Client ── */
const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const ROOM_TTL = 60 * 60 * 2; // 2 hours (seconds)
const roomKey  = id => `game:room:${id}`;

/* ── MongoDB Schema (Permanent History) ── */
const gameHistorySchema = new mongoose.Schema({
  roomId:       { type: String, required: true },
  gameType:     { type: String, enum: ['ttt', 'chess'], required: true },
  host:         { type: String, required: true },
  hostAvatar:   { type: String, default: '🎓' },
  guest:        { type: String, required: true },
  guestAvatar:  { type: String, default: '🎓' },
  winner:       { type: String, default: null }, // null = draw
  moves:        { type: Number, default: 0 },
  playedAt:     { type: Date,   default: Date.now },
});
const GameHistory = mongoose.models.GameHistory
  || mongoose.model('GameHistory', gameHistorySchema);

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */

/* Chess default board */
function initChessBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const order = ['R','N','B','Q','K','B','N','R'];
  order.forEach((p, i) => {
    b[0][i] = { piece: p, color: 'black' };
    b[7][i] = { piece: p, color: 'white' };
  });
  for (let i = 0; i < 8; i++) {
    b[1][i] = { piece: 'P', color: 'black' };
    b[6][i] = { piece: 'P', color: 'white' };
  }
  return b;
}

/* TTT winner check */
function checkTTTWinner(board) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  for (const [a,b,c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c])
      return board[a]; // 'X' or 'O'
  }
  if (board.every(c => c)) return 'draw';
  return null;
}

/* Chess path clear check */
function pathClear(board, fr, fc, tr, tc) {
  const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
  let r = fr + dr, c = fc + dc;
  while (r !== tr || c !== tc) {
    if (board[r][c]) return false;
    r += dr; c += dc;
  }
  return true;
}

/* Chess move validation */
function isValidChessMove(board, fr, fc, tr, tc, color) {
  const piece = board[fr][fc];
  if (!piece || piece.color !== color) return false;
  const target = board[tr][tc];
  if (target && target.color === color) return false;

  const dr = tr - fr, dc = tc - fc;
  const adr = Math.abs(dr), adc = Math.abs(dc);

  switch (piece.piece) {
    case 'P': {
      const dir = color === 'white' ? -1 : 1;
      const startRow = color === 'white' ? 6 : 1;
      if (dc === 0 && dr === dir && !target) return true;
      if (dc === 0 && dr === 2 * dir && fr === startRow && !target && !board[fr+dir][fc]) return true;
      if (adc === 1 && dr === dir && target) return true;
      return false;
    }
    case 'R': return (dr===0||dc===0) && pathClear(board,fr,fc,tr,tc);
    case 'N': return (adr===2&&adc===1)||(adr===1&&adc===2);
    case 'B': return adr===adc && pathClear(board,fr,fc,tr,tc);
    case 'Q': return ((dr===0||dc===0)||(adr===adc)) && pathClear(board,fr,fc,tr,tc);
    case 'K': return adr<=1 && adc<=1;
    default:  return false;
  }
}

/* ══════════════════════════════════════
   ROUTES
══════════════════════════════════════ */

/* ── CREATE ROOM ── */
router.post('/create', protect, async (req, res) => {
  try {
    const { gameType } = req.body;
    if (!['ttt','chess'].includes(gameType))
      return res.status(400).json({ success: false, message: 'gameType must be ttt or chess' });

    const roomId = Math.random().toString(36).slice(2,8).toUpperCase();

    const room = {
      id:          roomId,
      game:        gameType,
      host:        req.user.name,
      hostAvatar:  req.user.avatar || '🎓',
      guest:       null,
      guestAvatar: null,
      status:      'waiting',   // waiting | playing | finished
      board:       gameType === 'ttt' ? Array(9).fill('') : initChessBoard(),
      selected:    null,        // for chess piece selection
      turn:        req.user.name,
      turnSymbol:  gameType === 'chess' ? 'white' : 'X',
      captured:    { white: [], black: [] },
      moves:       [],
      winner:      null,
      created:     Date.now(),
    };

    /* Save to Redis with 2-hour TTL */
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL });

    res.json({ success: true, roomId, room });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── JOIN ROOM ── */
router.post('/join', protect, async (req, res) => {
  try {
    const { roomId } = req.body;
    if (!roomId) return res.status(400).json({ success: false, message: 'roomId required' });

    const raw = await redis.get(roomKey(roomId.toUpperCase()));
    if (!raw) return res.status(404).json({ success: false, message: 'Room नहीं मिला! ID check करें' });

    const room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (room.status !== 'waiting')
      return res.status(400).json({ success: false, message: 'Game already start हो गया!' });
    if (room.host === req.user.name)
      return res.status(400).json({ success: false, message: 'खुद से नहीं खेल सकते!' });

    room.guest       = req.user.name;
    room.guestAvatar = req.user.avatar || '🎓';
    room.status      = 'playing';

    /* Save updated room, reset TTL */
    await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL });

    res.json({ success: true, room });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── GET ROOM STATE (Polling) ── */
/* NOTE: Static routes (/history/me, /leaderboard/top, /matchmake/check/:gt)
   must be defined BEFORE this dynamic route */
router.get('/:roomId', protect, async (req, res) => {
  // Guard: skip known static sub-paths that shouldn't hit here
  if (['history', 'leaderboard', 'matchmake'].includes(req.params.roomId)) {
    return res.status(404).json({ success: false, message: 'Route not found' });
  }

  try {
    const raw = await redis.get(roomKey(req.params.roomId.toUpperCase()));
    if (!raw) return res.status(404).json({ success: false, message: 'Room expired या नहीं मिला' });
    const room = typeof raw === 'string' ? JSON.parse(raw) : raw;
    res.json({ success: true, room });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── MAKE MOVE ── */
router.post('/:roomId/move', protect, async (req, res) => {
  try {
    const raw = await redis.get(roomKey(req.params.roomId.toUpperCase()));
    if (!raw) return res.status(404).json({ success: false, message: 'Room नहीं मिला' });

    const room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (room.status !== 'playing')
      return res.status(400).json({ success: false, message: 'Game अभी चल नहीं रहा' });
    if (room.turn !== req.user.name)
      return res.status(400).json({ success: false, message: 'आपकी बारी नहीं है!' });

    const { moveData } = req.body;
    // moveData for TTT: { idx: 4 }
    // moveData for Chess: { from: [r,c], to: [r,c] }

    /* ── TTT Move ── */
    if (room.game === 'ttt') {
      const { idx } = moveData;
      if (room.board[idx])
        return res.status(400).json({ success: false, message: 'Already filled!' });

      room.board[idx] = room.turnSymbol;
      room.moves.push({ player: req.user.name, idx, symbol: room.turnSymbol });

      const winner = checkTTTWinner(room.board);
      if (winner) {
        room.status = 'finished';
        room.winner = winner === 'draw' ? null : req.user.name;

        /* Save to MongoDB history */
        await GameHistory.create({
          roomId:      room.id,
          gameType:    'ttt',
          host:        room.host,
          hostAvatar:  room.hostAvatar,
          guest:       room.guest,
          guestAvatar: room.guestAvatar,
          winner:      room.winner,
          moves:       room.moves.length,
        });
      } else {
        /* Switch turn */
        room.turnSymbol = room.turnSymbol === 'X' ? 'O' : 'X';
        room.turn = room.turn === room.host ? room.guest : room.host;
      }
    }

    /* ── Chess Move ── */
    else if (room.game === 'chess') {
      const { from, to } = moveData;
      const [fr, fc] = from, [tr, tc] = to;
      const myColor = room.host === req.user.name ? 'white' : 'black';
      const board   = room.board;

      if (!isValidChessMove(board, fr, fc, tr, tc, myColor))
        return res.status(400).json({ success: false, message: 'Invalid move!' });

      const srcPiece = board[fr][fc];
      const captured = board[tr][tc];

      /* Capture */
      if (captured) room.captured[myColor].push(captured.piece);

      board[tr][tc] = srcPiece;
      board[fr][fc] = null;

      /* Pawn promotion */
      if (srcPiece.piece === 'P') {
        if (myColor === 'white' && tr === 0) board[tr][tc] = { piece:'Q', color:'white' };
        if (myColor === 'black' && tr === 7) board[tr][tc] = { piece:'Q', color:'black' };
      }

      room.moves.push({ player: req.user.name, from, to, piece: srcPiece.piece, color: myColor });
      room.board = board;

      /* King captured = game over */
      if (captured?.piece === 'K') {
        room.status = 'finished';
        room.winner = req.user.name;

        await GameHistory.create({
          roomId:      room.id,
          gameType:    'chess',
          host:        room.host,
          hostAvatar:  room.hostAvatar,
          guest:       room.guest,
          guestAvatar: room.guestAvatar,
          winner:      room.winner,
          moves:       room.moves.length,
        });
      } else {
        /* Switch turn */
        room.turnSymbol = myColor === 'white' ? 'black' : 'white';
        room.turn       = room.turn === room.host ? room.guest : room.host;
      }
    }

    /* Save updated room back to Redis */
    await redis.set(roomKey(room.id), JSON.stringify(room), { ex: ROOM_TTL });

    res.json({ success: true, room });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── LEAVE / FORFEIT ── */
router.post('/:roomId/leave', protect, async (req, res) => {
  try {
    const raw = await redis.get(roomKey(req.params.roomId.toUpperCase()));
    if (!raw) return res.json({ success: true }); // already gone

    const room = typeof raw === 'string' ? JSON.parse(raw) : raw;

    if (room.status === 'playing') {
      /* Other player wins by forfeit */
      room.winner = room.host === req.user.name ? room.guest : room.host;
      room.status = 'finished';

      await GameHistory.create({
        roomId:      room.id,
        gameType:    room.game,
        host:        room.host,
        hostAvatar:  room.hostAvatar,
        guest:       room.guest  || 'Unknown',
        guestAvatar: room.guestAvatar || '🎓',
        winner:      room.winner,
        moves:       room.moves.length,
      });

      await redis.set(roomKey(room.id), JSON.stringify(room), { ex: 300 }); // 5 min so other sees result
    } else {
      /* Just delete if waiting */
      await redis.del(roomKey(room.id));
    }

    res.json({ success: true, winner: room.winner });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── GAME HISTORY (permanent, from MongoDB) ── */
router.get('/history/me', protect, async (req, res) => {
  try {
    const history = await GameHistory.find({
      $or: [{ host: req.user.name }, { guest: req.user.name }]
    })
    .sort({ playedAt: -1 })
    .limit(50)
    .lean();

    /* Add result field for each player */
    const withResult = history.map(h => ({
      ...h,
      result: h.winner === null
        ? 'draw'
        : h.winner === req.user.name
          ? 'win'
          : 'loss',
      opponent: h.host === req.user.name ? h.guest : h.host,
      opponentAvatar: h.host === req.user.name ? h.guestAvatar : h.hostAvatar,
    }));

    res.json({ success: true, history: withResult });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

/* ── LEADERBOARD (from MongoDB) ── */
router.get('/leaderboard/top', async (req, res) => {
  try {
    /* Aggregate wins per player */
    const data = await GameHistory.aggregate([
      { $match: { winner: { $ne: null } } }, // exclude draws
      { $group: {
          _id: '$winner',
          wins: { $sum: 1 },
          // Get avatar from most recent win
          avatar: { $last: {
            $cond: [
              { $eq: ['$winner', '$host'] },
              '$hostAvatar',
              '$guestAvatar'
            ]
          }}
        }
      },
      { $sort: { wins: -1 } },
      { $limit: 20 }
    ]);

    /* Also count losses and draws */
    const allGames = await GameHistory.find().lean();
    const stats = {};

    allGames.forEach(g => {
      [g.host, g.guest].forEach(name => {
        if (!name) return;
        if (!stats[name]) stats[name] = { wins:0, losses:0, draws:0, points:0, avatar:'🎓' };
      });
      if (g.winner === null) {
        // draw
        if (stats[g.host])  { stats[g.host].draws++;  stats[g.host].points  += 1; }
        if (stats[g.guest]) { stats[g.guest].draws++; stats[g.guest].points += 1; }
      } else {
        const loser = g.winner === g.host ? g.guest : g.host;
        if (stats[g.winner]) { stats[g.winner].wins++;   stats[g.winner].points += 3; stats[g.winner].avatar = g.winner === g.host ? g.hostAvatar : g.guestAvatar; }
        if (stats[loser])    { stats[loser].losses++; }
      }
    });

    const leaderboard = Object.entries(stats)
      .map(([name, s]) => ({ name, ...s }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);

    res.json({ success: true, leaderboard });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


/* ── MATCHMAKING ── */
router.post('/matchmake', protect, async (req, res) => {
  try {
    const { gameType } = req.body;
    if (!['ttt','chess'].includes(gameType))
      return res.status(400).json({ success:false, message:'Invalid gameType' });

    const qKey   = `queue:${gameType}`;          // waiting queue
    const myName = req.user.name;

    /* Check if someone already waiting */
    const waiting = await redis.lpop(qKey);

    if (waiting && waiting !== myName) {
      /* Match found! Create room */
      const roomId = Math.random().toString(36).slice(2,8).toUpperCase();
      const room = {
        id: roomId, game: gameType,
        host: waiting, hostAvatar: '🎓',   // avatar fetch later
        guest: myName, guestAvatar: req.user.avatar || '🎓',
        status: 'playing',
        board: gameType === 'ttt' ? Array(9).fill('') : initChessBoard(),
        selected: null,
        turn: waiting,                      // host goes first
        turnSymbol: gameType === 'chess' ? 'white' : 'X',
        captured: { white:[], black:[] },
        moves: [], winner: null,
        created: Date.now(),
        matchmade: true,                    // flag: auto-matched
      };

      /* Notify waiting player via Redis key */
      const matchKey = `match:${waiting}:${gameType}`;
      await redis.set(matchKey, JSON.stringify({ roomId, symbol: gameType==='chess'?'white':'X' }), { ex: 60 });

      /* Save room */
      await redis.set(roomKey(roomId), JSON.stringify(room), { ex: ROOM_TTL });

      return res.json({
        success: true, matched: true, roomId,
        mySymbol: gameType === 'chess' ? 'black' : 'O',
        isHost: false
      });
    } else {
      /* Add to queue */
      if (waiting === myName) {
        /* Already in queue — check if matched meanwhile */
      }
      await redis.rpush(qKey, myName);
      await redis.expire(qKey, 90);         // 90s queue TTL

      return res.json({ success: true, matched: false });
    }
  } catch(e) {
    res.status(500).json({ success:false, message: e.message });
  }
});

/* ── CHECK MATCH (polling by waiting player) ── */
router.get('/matchmake/check/:gameType', protect, async (req, res) => {
  try {
    const matchKey = `match:${req.user.name}:${req.params.gameType}`;
    const raw = await redis.get(matchKey);
    if (!raw) return res.json({ success:true, matched:false });

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    await redis.del(matchKey);              // consume once

    return res.json({
      success: true, matched: true,
      roomId: data.roomId,
      mySymbol: data.symbol,
      isHost: true
    });
  } catch(e) {
    res.status(500).json({ success:false, message:e.message });
  }
});

/* ── CANCEL MATCHMAKING ── */
router.post('/matchmake/cancel', protect, async (req, res) => {
  try {
    const { gameType } = req.body;
    const qKey = `queue:${gameType}`;
    /* Remove from queue — get all, filter out, re-push */
    const all = await redis.lrange(qKey, 0, -1);
    const filtered = all.filter(n => n !== req.user.name);
    await redis.del(qKey);
    if (filtered.length) {
      await redis.rpush(qKey, ...filtered);
      await redis.expire(qKey, 90);
    }
    res.json({ success:true });
  } catch(e) {
    res.status(500).json({ success:false, message:e.message });
  }
});

module.exports = router;
