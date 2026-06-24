/* ═══════════════════════════════════════════════════════
   VidyaSagar v5 — games.js
   ✅ Number Guessing + Word Scramble (offline)
   ✅ Online Games: Chess + Tic Tac Toe (2-player)
   ✅ Leaderboard/Rankings
   ✅ Online Game History
═══════════════════════════════════════════════════════ */
const GamesModule = (() => {

  /* ═══════════════════════════
     OFFLINE: NUMBER GUESSING
  ═══════════════════════════ */
  const NG = {
    secret: 0, attempts: 0, maxAttempts: 10,
    history: [], gameOver: false,

    reset() {
      this.secret = Math.floor(Math.random() * 100) + 1;
      this.attempts = 0; this.history = []; this.gameOver = false;
      const els = {
        disp: 'ng-num-display', hint: 'ng-hint',
        inp: 'ng-input', tries: 'ng-tries', left: 'ng-left',
        hist: 'ng-history-list', win: 'ng-win-banner'
      };
      _el(els.disp).textContent = '?';
      _el(els.hint).textContent = '1 से 100 के बीच एक number सोचा है';
      _el(els.hint).className = 'ng-hint';
      _el(els.inp).value = '';
      _el(els.tries).textContent = '0';
      _el(els.left).textContent = this.maxAttempts;
      _el(els.hist).innerHTML = '';
      _el(els.win).classList.remove('show');
      _el(els.inp).disabled = false;
      _el('ng-submit-btn').disabled = false;
    },

    guess(num) {
      if (this.gameOver) return;
      num = parseInt(num);
      if (isNaN(num) || num < 1 || num > 100) { showToast('1-100 के बीच number डालें', 'error'); return; }
      this.attempts++;
      const left = this.maxAttempts - this.attempts;
      _el('ng-tries').textContent = this.attempts;
      _el('ng-left').textContent = Math.max(0, left);
      const diff = Math.abs(num - this.secret);
      let hint = '', cls = '';
      if (num === this.secret) {
        hint = `🎉 सही! ${this.attempts} tries में guess किया!`;
        cls = 'hot'; this.gameOver = true;
        _el('ng-num-display').textContent = this.secret;
        _el('ng-win-banner').classList.add('show');
        _el('ng-win-sub').textContent = `${this.attempts} tries में किया! 🏆`;
        _el('ng-input').disabled = true; _el('ng-submit-btn').disabled = true;
      } else if (left <= 0) {
        hint = `😔 Game Over! Answer था: ${this.secret}`;
        cls = 'cold'; this.gameOver = true;
        _el('ng-num-display').textContent = this.secret;
        _el('ng-input').disabled = true; _el('ng-submit-btn').disabled = true;
      } else {
        const dir = num < this.secret ? 'बड़ा' : 'छोटा';
        if (diff <= 5) { hint = `🔥 बहुत गर्म! और ${dir}`; cls = 'hot'; }
        else if (diff <= 15) { hint = `♨️ गर्म! और ${dir} number डालो`; cls = 'warm'; }
        else { hint = `❄️ ठंडा! और ${dir} number डालो`; cls = 'cold'; }
      }
      const hEl = _el('ng-hint'); hEl.textContent = hint; hEl.className = `ng-hint ${cls}`;
      const arrow = num < this.secret ? '↑ बड़ा' : num > this.secret ? '↓ छोटा' : '✅ सही!';
      const tryEl = document.createElement('div'); tryEl.className = 'ng-try';
      tryEl.innerHTML = `<span class="ng-try-num">Try ${this.attempts}: ${num}</span><span style="color:var(--text3)">${arrow}</span>`;
      _el('ng-history-list').prepend(tryEl);
      _el('ng-input').value = ''; _el('ng-input').focus();
    }
  };

  /* ═══════════════════════════
     OFFLINE: WORD SCRAMBLE
  ═══════════════════════════ */
  const WORDS = [
    { word:'COMPUTER', hint:'Electronic device', cat:'Technology' },
    { word:'KEYBOARD', hint:'Typing device', cat:'Technology' },
    { word:'MINISTER', hint:'Government official', cat:'Civics' },
    { word:'PARLIAMENT', hint:'Law making body', cat:'Civics' },
    { word:'SCIENCE', hint:'Study of nature', cat:'Academics' },
    { word:'HISTORY', hint:'Study of past', cat:'Academics' },
    { word:'RAILWAY', hint:'Train transport', cat:'GK' },
    { word:'CAPITAL', hint:'City of government', cat:'GK' },
    { word:'BANKING', hint:'Financial service', cat:'Finance' },
    { word:'REPUBLIC', hint:'Democratic nation', cat:'Civics' },
    { word:'LANGUAGE', hint:'Communication system', cat:'Academics' },
    { word:'ELECTION', hint:'Voting process', cat:'Civics' },
    { word:'FREEDOM', hint:'Independence', cat:'GK' },
    { word:'VILLAGE', hint:'Rural settlement', cat:'GK' },
    { word:'OFFICER', hint:'Government employee', cat:'Jobs' },
    { word:'PRACTICE', hint:'Repeated exercise', cat:'Study' },
    { word:'MILITARY', hint:'Armed forces', cat:'Defence' },
    { word:'DISTRICT', hint:'Administrative unit', cat:'Civics' },
    { word:'HOSPITAL', hint:'Medical facility', cat:'GK' },
    { word:'STUDENT', hint:'Person who studies', cat:'Study' },
    { word:'QUESTION', hint:'Query or inquiry', cat:'Study' },
    { word:'NATIONAL', hint:'Related to a country', cat:'GK' },
    { word:'DIGITAL', hint:'Electronic/computer', cat:'Technology' },
    { word:'FOREST', hint:'Dense trees area', cat:'Nature' },
    { word:'POLICE', hint:'Law enforcement', cat:'Jobs' },
    { word:'JUSTICE', hint:'Fairness and law', cat:'Civics' },
    { word:'ECONOMY', hint:'Financial system', cat:'Finance' },
    { word:'CULTURE', hint:'Way of life', cat:'GK' },
    { word:'VILLAGE', hint:'Small settlement', cat:'GK' },
    { word:'CLIMATE', hint:'Long-term weather', cat:'Nature' },
  ];

  const WS = {
    current: null, score: 0, skipped: 0, usedIndices: [],
    streak: 0, maxStreak: 0,

    scramble(word) {
      const arr = word.split('');
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr.join('') === word ? this.scramble(word) : arr.join('');
    },

    newWord() {
      if (this.usedIndices.length >= WORDS.length) this.usedIndices = [];
      let idx;
      do { idx = Math.floor(Math.random() * WORDS.length); } while (this.usedIndices.includes(idx));
      this.usedIndices.push(idx);
      this.current = WORDS[idx];
      _el('ws-scrambled').textContent = this.scramble(this.current.word);
      _el('ws-hint-text').textContent = `Hint: ${this.current.hint}`;
      _el('ws-hint-cat').textContent = this.current.cat;
      _el('ws-input').value = '';
      _el('ws-result').textContent = '';
      _el('ws-result').className = 'ws-result';
      _el('ws-score').textContent = this.score;
      _el('ws-skipped').textContent = this.skipped;
      const sEl = _el('ws-streak'); if (sEl) sEl.textContent = this.streak;
      _el('ws-input').focus();
    },

    check() {
      const inp = _el('ws-input').value.trim().toUpperCase();
      const resultEl = _el('ws-result');
      if (!inp) return;
      if (inp === this.current.word) {
        this.score++; this.streak++;
        if (this.streak > this.maxStreak) this.maxStreak = this.streak;
        resultEl.textContent = `✅ Correct! "${this.current.word}" 🎉${this.streak > 1 ? ` 🔥 ${this.streak} streak!` : ''}`;
        resultEl.className = 'ws-result correct';
        _el('ws-score').textContent = this.score;
        const sEl = _el('ws-streak'); if (sEl) sEl.textContent = this.streak;
        setTimeout(() => this.newWord(), 1200);
      } else {
        this.streak = 0;
        resultEl.textContent = `❌ Wrong! Try again… (${this.current.word.length} letters)`;
        resultEl.className = 'ws-result wrong';
        _el('ws-input').value = '';
        setTimeout(() => {
          if (resultEl.classList.contains('wrong')) { resultEl.textContent = ''; resultEl.className = 'ws-result'; }
        }, 2000);
      }
    },

    skip() {
      this.streak = 0;
      _el('ws-result').textContent = `Skipped! Answer was: ${this.current.word}`;
      _el('ws-result').className = 'ws-result wrong';
      this.skipped++;
      _el('ws-skipped').textContent = this.skipped;
      setTimeout(() => this.newWord(), 1400);
    }
  };

  /* ═══════════════════════════════════════════════════
     ONLINE GAMES — Peer-to-Peer via Shared State
     (Uses backend API for room management)
  ═══════════════════════════════════════════════════ */
  const OnlineGames = {
    currentRoom: null,
    currentGame: null,
    pollTimer: null,
    mySymbol: null, // 'X' or 'O' for TTT, 'white' or 'black' for chess
    myTurn: false,
    gameData: null,

    /* ── Room Management ── */
    async createRoom(gameType) {
      if (!token || !userData) { openAuth('login'); return; }
      const roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
      this.currentRoom = roomId;
      this.currentGame = gameType;
      this.mySymbol = gameType === 'chess' ? 'white' : 'X';
      this.myTurn = true;

      const initState = gameType === 'ttt' ? this._tttInitState() : this._chessInitState();
      localStorage.setItem(`og_room_${roomId}`, JSON.stringify({
        id: roomId, game: gameType, host: userData.name,
        hostAvatar: userData.avatar || '🎓',
        guest: null, guestAvatar: null,
        state: initState, turn: userData.name,
        turnSymbol: gameType === 'chess' ? 'white' : 'X',
        status: 'waiting', winner: null,
        created: Date.now(), updated: Date.now(),
        moves: []
      }));

      this._openOnlineScreen(gameType, roomId, true);
    },

    async joinRoom(roomId) {
      if (!token || !userData) { openAuth('login'); return; }
      roomId = roomId.toUpperCase().trim();
      const raw = localStorage.getItem(`og_room_${roomId}`);
      if (!raw) { showToast('Room नहीं मिला! ID check करें', 'error'); return; }
      const room = JSON.parse(raw);
      if (room.status !== 'waiting') { showToast('Game already started!', 'error'); return; }
      if (room.host === userData.name) { showToast('खुद से नहीं खेल सकते!', 'warn'); return; }

      room.guest = userData.name;
      room.guestAvatar = userData.avatar || '🎓';
      room.status = 'playing';
      room.updated = Date.now();
      localStorage.setItem(`og_room_${roomId}`, JSON.stringify(room));

      this.currentRoom = roomId;
      this.currentGame = room.game;
      this.mySymbol = room.game === 'chess' ? 'black' : 'O';
      this.myTurn = false;

      this._openOnlineScreen(room.game, roomId, false);
    },

    _getRoom() {
      if (!this.currentRoom) return null;
      const raw = localStorage.getItem(`og_room_${this.currentRoom}`);
      return raw ? JSON.parse(raw) : null;
    },

    _saveRoom(room) {
      room.updated = Date.now();
      localStorage.setItem(`og_room_${this.currentRoom}`, JSON.stringify(room));
    },

    /* ── Polling ── */
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => this._pollUpdate(), 800);
    },

    stopPolling() {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    },

    _pollUpdate() {
      const room = this._getRoom();
      if (!room) return;
      // Check if guest joined (for host waiting screen)
      const waitEl = _el('og-waiting');
      if (waitEl && !waitEl.classList.contains('hidden') && room.status === 'playing') {
        waitEl.classList.add('hidden');
        _el('og-board-wrap')?.classList.remove('hidden');
        showToast(`${room.guest} joined! Game shuru! 🎮`, 'success');
      }
      this._renderBoardFromRoom(room);
    },

    /* ═══════════════════
       TIC TAC TOE
    ═══════════════════ */
    _tttInitState() {
      return { board: Array(9).fill(''), xIsNext: true };
    },

    _openOnlineScreen(gameType, roomId, isHost) {
      openSubScreen('screen-online-game');
      _el('og-room-id').textContent = roomId;
      _el('og-my-symbol').textContent = isHost
        ? (gameType === 'chess' ? '♔ White' : '✖️ X')
        : (gameType === 'chess' ? '♚ Black' : '⭕ O');
      _el('og-game-title').textContent = gameType === 'chess' ? '♟️ Chess' : '⭕ Tic Tac Toe';
      const codeDisp = _el('og-room-code-display');
      if (codeDisp) codeDisp.textContent = roomId;

      const waitEl = _el('og-waiting');
      const boardWrap = _el('og-board-wrap');
      if (isHost) {
        waitEl?.classList.remove('hidden');
        boardWrap?.classList.add('hidden');
      } else {
        waitEl?.classList.add('hidden');
        boardWrap?.classList.remove('hidden');
      }

      if (gameType === 'ttt') this._renderTTT();
      else if (gameType === 'chess') this._renderChess();

      this.startPolling();
    },

    _renderTTT() {
      const wrap = _el('og-board-wrap');
      if (!wrap) return;
      const room = this._getRoom();
      const board = room?.state?.board || Array(9).fill('');
      wrap.innerHTML = `
        <div class="ttt-board" id="ttt-board">
          ${board.map((cell, i) => `
            <div class="ttt-cell ${cell ? 'filled' : ''}" data-i="${i}">
              <span class="ttt-sym ${cell === 'X' ? 'x-sym' : 'o-sym'}">${cell}</span>
            </div>`).join('')}
        </div>
        <div class="og-turn-bar" id="og-turn-bar">Loading…</div>`;
      wrap.querySelectorAll('.ttt-cell').forEach(cell => {
        cell.addEventListener('click', () => this._tttMove(parseInt(cell.dataset.i)));
      });
      this._updateTurnBar(room);
    },

    _tttMove(idx) {
      const room = this._getRoom();
      if (!room || room.status !== 'playing') return;
      const board = room.state.board;
      if (board[idx]) { showToast('Already filled!', 'warn'); return; }

      const isMyTurn = room.turnSymbol === this.mySymbol;
      if (!isMyTurn) { showToast('आपकी बारी नहीं है!', 'warn'); return; }

      board[idx] = this.mySymbol;
      room.state.board = board;
      room.state.xIsNext = !room.state.xIsNext;
      room.turnSymbol = room.state.xIsNext ? 'X' : 'O';
      room.turn = room.turnSymbol === this.mySymbol ? userData.name : (this.mySymbol === 'X' ? room.guest : room.host);
      room.moves.push({ player: userData.name, idx, symbol: this.mySymbol });

      const winner = this._tttCheckWinner(board);
      if (winner) {
        room.status = 'finished';
        room.winner = winner === 'draw' ? 'Draw' : userData.name;
        this._saveRoom(room);
        this._tttShowResult(winner === 'draw' ? null : true);
        this._saveOnlineHistory(room.game, winner === 'draw' ? 'draw' : 'win',
          this.mySymbol === 'X' ? room.guest || '?' : room.host);
        return;
      }

      this._saveRoom(room);
      this._renderTTT();
    },

    _tttCheckWinner(board) {
      const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
      for (const [a,b,c] of lines) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
      }
      if (board.every(c => c)) return 'draw';
      return null;
    },

    _updateTurnBar(room) {
      const bar = _el('og-turn-bar');
      if (!bar || !room) return;
      if (room.status === 'waiting') { bar.textContent = '⏳ Opponent का इंतज़ार…'; return; }
      if (room.status === 'finished') { bar.textContent = room.winner === 'Draw' ? '🤝 Draw!' : `🏆 ${room.winner} जीते!`; return; }
      const myTurn = room.turnSymbol === this.mySymbol;
      bar.textContent = myTurn ? '✅ आपकी बारी है!' : `⏳ ${room.turn} की बारी…`;
      bar.style.color = myTurn ? 'var(--green)' : 'var(--text3)';
    },

    _tttShowResult(won) {
      const room = this._getRoom();
      setTimeout(() => {
        showToast(won === null ? '🤝 Draw!' : won ? '🏆 आप जीते!' : '😔 आप हारे!', won ? 'success' : 'info');
      }, 300);
    },

    /* ═══════════════════
       CHESS
    ═══════════════════ */
    _chessInitState() {
      return {
        board: this._chessDefaultBoard(),
        selected: null,
        captured: { white: [], black: [] },
        moveHistory: [],
        check: false
      };
    },

    _chessDefaultBoard() {
      const b = Array(8).fill(null).map(() => Array(8).fill(null));
      // Black pieces (top)
      const order = ['R','N','B','Q','K','B','N','R'];
      order.forEach((p, i) => { b[0][i] = { piece: p, color: 'black' }; b[7][i] = { piece: p, color: 'white' }; });
      for (let i = 0; i < 8; i++) { b[1][i] = { piece: 'P', color: 'black' }; b[6][i] = { piece: 'P', color: 'white' }; }
      return b;
    },

    _pieceSymbol(piece, color) {
      const symbols = {
        white: { K:'♔', Q:'♕', R:'♖', B:'♗', N:'♘', P:'♙' },
        black: { K:'♚', Q:'♛', R:'♜', B:'♝', N:'♞', P:'♟' }
      };
      return symbols[color]?.[piece] || '';
    },

    _renderChess() {
      const wrap = _el('og-board-wrap');
      if (!wrap) return;
      const room = this._getRoom();
      const state = room?.state || this._chessInitState();
      const board = state.board;
      const selected = state.selected;

      let html = `<div class="chess-board" id="chess-board">`;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const light = (r + c) % 2 === 0;
          const cell = board[r][c];
          const isSel = selected && selected[0] === r && selected[1] === c;
          const sym = cell ? this._pieceSymbol(cell.piece, cell.color) : '';
          html += `<div class="chess-cell ${light ? 'light' : 'dark'} ${isSel ? 'selected' : ''}" 
            data-r="${r}" data-c="${c}">
            <span class="chess-piece ${cell?.color || ''}">${sym}</span>
          </div>`;
        }
      }
      html += `</div>
        <div class="chess-info-row">
          <div class="chess-captured" id="chess-cap-black">⚫ ${(state.captured?.white || []).map(p => this._pieceSymbol(p, 'black')).join('')}</div>
          <div class="chess-captured" id="chess-cap-white">⚪ ${(state.captured?.black || []).map(p => this._pieceSymbol(p, 'white')).join('')}</div>
        </div>
        <div class="og-turn-bar" id="og-turn-bar">Loading…</div>`;
      wrap.innerHTML = html;

      wrap.querySelectorAll('.chess-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          this._chessClick(parseInt(cell.dataset.r), parseInt(cell.dataset.c));
        });
      });
      this._updateTurnBar(room);
    },

    _chessClick(r, c) {
      const room = this._getRoom();
      if (!room || room.status !== 'playing') return;
      const isMyTurn = room.turnSymbol === this.mySymbol;
      if (!isMyTurn) { showToast('आपकी बारी नहीं है!', 'warn'); return; }

      const state = room.state;
      const board = state.board;
      const cell = board[r][c];

      if (state.selected) {
        const [sr, sc] = state.selected;
        if (sr === r && sc === c) { state.selected = null; this._saveRoom(room); this._renderChess(); return; }

        const srcPiece = board[sr][sc];
        // Simple move validation (no full chess rules — educational version)
        if (srcPiece && this._isValidMove(board, sr, sc, r, c, this.mySymbol)) {
          const captured = board[r][c];
          if (captured) state.captured[this.mySymbol].push(captured.piece);
          board[r][c] = srcPiece;
          board[sr][sc] = null;
          state.selected = null;
          room.moves.push({ from: [sr,sc], to: [r,c], piece: srcPiece.piece, color: this.mySymbol });

          // Pawn promotion
          if (srcPiece.piece === 'P') {
            if (this.mySymbol === 'white' && r === 0) board[r][c] = { piece: 'Q', color: 'white' };
            if (this.mySymbol === 'black' && r === 7) board[r][c] = { piece: 'Q', color: 'black' };
          }

          // Check king capture (win condition)
          if (captured?.piece === 'K') {
            room.status = 'finished'; room.winner = userData.name;
            this._saveRoom(room);
            showToast('🏆 आपने King capture किया! जीत गए!', 'success');
            this._saveOnlineHistory('chess', 'win', this.mySymbol === 'white' ? room.guest : room.host);
            this._renderChess(); return;
          }

          room.turnSymbol = this.mySymbol === 'white' ? 'black' : 'white';
          room.turn = room.turnSymbol === this.mySymbol ? userData.name : (this.mySymbol === 'white' ? room.guest : room.host);
          this._saveRoom(room); this._renderChess();
        } else {
          // Select new piece if same color
          if (cell && cell.color === this.mySymbol) {
            state.selected = [r, c]; this._saveRoom(room); this._renderChess();
          } else {
            state.selected = null; this._saveRoom(room); this._renderChess();
          }
        }
      } else {
        if (cell && cell.color === this.mySymbol) {
          state.selected = [r, c]; this._saveRoom(room); this._renderChess();
        }
      }
    },

    _isValidMove(board, fr, fc, tr, tc, color) {
      const piece = board[fr][fc];
      if (!piece || piece.color !== color) return false;
      const target = board[tr][tc];
      if (target && target.color === color) return false; // Can't capture own piece

      const dr = tr - fr, dc = tc - fc;
      const adr = Math.abs(dr), adc = Math.abs(dc);

      switch (piece.piece) {
        case 'P': {
          const dir = color === 'white' ? -1 : 1;
          const startRow = color === 'white' ? 6 : 1;
          if (dc === 0 && dr === dir && !target) return true;
          if (dc === 0 && dr === 2 * dir && fr === startRow && !target && !board[fr + dir][fc]) return true;
          if (adc === 1 && dr === dir && target) return true;
          return false;
        }
        case 'R': return (dr === 0 || dc === 0) && this._pathClear(board, fr, fc, tr, tc);
        case 'N': return (adr === 2 && adc === 1) || (adr === 1 && adc === 2);
        case 'B': return adr === adc && this._pathClear(board, fr, fc, tr, tc);
        case 'Q': return ((dr === 0 || dc === 0) || (adr === adc)) && this._pathClear(board, fr, fc, tr, tc);
        case 'K': return adr <= 1 && adc <= 1;
        default: return false;
      }
    },

    _pathClear(board, fr, fc, tr, tc) {
      const dr = Math.sign(tr - fr), dc = Math.sign(tc - fc);
      let r = fr + dr, c = fc + dc;
      while (r !== tr || c !== tc) {
        if (board[r][c]) return false;
        r += dr; c += dc;
      }
      return true;
    },

    _renderBoardFromRoom(room) {
      if (!room) return;
      if (room.game === 'ttt') this._renderTTT();
      else if (room.game === 'chess') this._renderChess();
      this._updateTurnBar(room);
      if (room.status === 'finished') { this.stopPolling(); }
    },

    /* ═══════════════════════
       ONLINE HISTORY & RANKS
    ═══════════════════════ */
    _saveOnlineHistory(game, result, opponent) {
      const h = JSON.parse(localStorage.getItem('og_history') || '[]');
      h.unshift({
        game, result, opponent,
        myName: userData?.name || 'You',
        date: new Date().toISOString()
      });
      localStorage.setItem('og_history', JSON.stringify(h.slice(0, 100)));
      this._updateRankings(game, result);
    },

    _updateRankings(game, result) {
      const r = JSON.parse(localStorage.getItem('og_rankings') || '{}');
      const key = userData?.name || 'You';
      if (!r[key]) r[key] = { name: key, avatar: userData?.avatar || '🎓', wins: 0, losses: 0, draws: 0, points: 0 };
      if (result === 'win') { r[key].wins++; r[key].points += 3; }
      else if (result === 'loss') { r[key].losses++; }
      else { r[key].draws++; r[key].points += 1; }
      localStorage.setItem('og_rankings', JSON.stringify(r));
    },

    showOnlineHistory() {
      openSubScreen('screen-online-history');
      const list = _el('online-hist-list');
      if (!list) return;
      const h = JSON.parse(localStorage.getItem('og_history') || '[]');
      if (!h.length) {
        list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🎮</span>कोई online game नहीं खेला अभी तक</div>';
        return;
      }
      const oppGroups = {};
      h.forEach(x => {
        if (!oppGroups[x.opponent]) oppGroups[x.opponent] = { wins:0, losses:0, draws:0 };
        if (x.result === 'win') oppGroups[x.opponent].wins++;
        else if (x.result === 'loss') oppGroups[x.opponent].losses++;
        else oppGroups[x.opponent].draws++;
      });
      list.innerHTML = `
        <div class="oh-section-title">👥 Opponent-wise Stats</div>
        ${Object.entries(oppGroups).map(([opp, stats]) => `
          <div class="oh-opp-card">
            <div class="oh-opp-name">🎮 vs ${_esc(opp)}</div>
            <div class="oh-opp-stats">
              <span style="color:var(--green)">✅ ${stats.wins}W</span>
              <span style="color:var(--rose)">❌ ${stats.losses}L</span>
              <span style="color:var(--amber)">🤝 ${stats.draws}D</span>
            </div>
          </div>`).join('')}
        <div class="oh-section-title" style="margin-top:20px">📋 Recent Games</div>
        ${h.slice(0,20).map(x => {
          const d = new Date(x.date).toLocaleDateString('en-IN', {day:'numeric',month:'short'});
          const rc = x.result === 'win' ? '#34d399' : x.result === 'draw' ? '#fbbf24' : '#fb7185';
          const ri = x.result === 'win' ? '🏆' : x.result === 'draw' ? '🤝' : '😔';
          return `<div class="oh-game-row">
            <span class="oh-game-icon">${x.game === 'chess' ? '♟️' : '⭕'}</span>
            <div class="oh-game-info"><div style="font-weight:700;font-size:.84rem">vs ${_esc(x.opponent)}</div><div style="font-size:.72rem;color:var(--text3)">${d}</div></div>
            <span style="font-weight:800;font-size:.9rem;color:${rc}">${ri} ${x.result.toUpperCase()}</span>
          </div>`;
        }).join('')}`;
    },

    showLeaderboard() {
      openSubScreen('screen-leaderboard');
      const list = _el('leaderboard-list');
      if (!list) return;
      const r = JSON.parse(localStorage.getItem('og_rankings') || '{}');
      const sorted = Object.values(r).sort((a, b) => b.points - a.points);
      if (!sorted.length) {
        list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🏆</span>कोई ranking नहीं। Game खेलें!</div>';
        return;
      }
      const medals = ['🥇','🥈','🥉'];
      list.innerHTML = sorted.map((p, i) => `
        <div class="lb-row ${i < 3 ? 'top3' : ''}">
          <div class="lb-rank">${medals[i] || `#${i+1}`}</div>
          <div class="lb-av">${p.avatar}</div>
          <div class="lb-info">
            <div class="lb-name">${_esc(p.name)}</div>
            <div class="lb-sub">${p.wins}W · ${p.losses}L · ${p.draws}D</div>
          </div>
          <div class="lb-pts"><span>${p.points}</span><small>pts</small></div>
        </div>`).join('');
    },

    shareRoom() {
      const id = document.getElementById('og-room-id')?.textContent;
      if (!id) return;
      if (navigator.share) {
        navigator.share({ title: 'VidyaSagar Game', text: `Join my game! Room ID: ${id}` });
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(id);
        showToast(`Room ID ${id} copied! 📋`, 'success');
      }
    },

    copyRoomId() {
      const id = document.getElementById('og-room-id')?.textContent;
      if (!id) return;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(id);
        showToast(`Room ID ${id} copied! 📋`, 'success');
      }
      const disp = document.getElementById('og-room-code-display');
      if (disp) disp.textContent = id;
    },

    leaveRoom() {
      this.stopPolling();
      this.currentRoom = null;
      this.currentGame = null;
      closeSubScreen('screen-online-game');
    }
  };

  /* ── Helpers ── */
  function _el(id) { return document.getElementById(id); }
  function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ══════════════════════════════
     PUBLIC OPEN FUNCTIONS
  ══════════════════════════════ */
  function openNumberGame() { openSubScreen('screen-number-game'); NG.reset(); }
  function openWordGame() {
    openSubScreen('screen-word-game');
    WS.score = 0; WS.skipped = 0; WS.streak = 0; WS.usedIndices = []; WS.newWord();
  }
  function openOnlineHub() { openSubScreen('screen-online-hub'); }

  /* ── Init ── */
  function init() {
    // Number Game
    _el('ng-submit-btn')?.addEventListener('click', () => NG.guess(_el('ng-input').value));
    _el('ng-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') NG.guess(_el('ng-input').value); });
    _el('ng-new-game')?.addEventListener('click', () => NG.reset());

    // Word Scramble
    _el('ws-submit-btn')?.addEventListener('click', () => WS.check());
    _el('ws-input')?.addEventListener('keydown', e => { if (e.key === 'Enter') WS.check(); });
    _el('ws-skip-btn')?.addEventListener('click', () => WS.skip());
    _el('ws-new-btn')?.addEventListener('click', () => {
      WS.score = 0; WS.skipped = 0; WS.streak = 0; WS.usedIndices = []; WS.newWord();
    });

    // Online Hub
    _el('btn-create-ttt')?.addEventListener('click', () => OnlineGames.createRoom('ttt'));
    _el('btn-create-chess')?.addEventListener('click', () => OnlineGames.createRoom('chess'));
    _el('btn-join-room')?.addEventListener('click', () => {
      const id = _el('join-room-input')?.value;
      if (!id) { showToast('Room ID डालें', 'error'); return; }
      OnlineGames.joinRoom(id);
    });
    _el('btn-og-leave')?.addEventListener('click', () => OnlineGames.leaveRoom());
    _el('btn-og-history')?.addEventListener('click', () => OnlineGames.showOnlineHistory());
    _el('btn-og-leaderboard')?.addEventListener('click', () => OnlineGames.showLeaderboard());
    _el('btn-og-share-room')?.addEventListener('click', () => {
      const id = _el('og-room-id')?.textContent;
      if (navigator.clipboard && id) {
        navigator.clipboard.writeText(id);
        showToast(`Room ID ${id} copied! 📋`, 'success');
      }
    });
  }

  // Expose globals
  window.openNumberGame = openNumberGame;
  window.openWordGame   = openWordGame;
  window.openOnlineHub  = openOnlineHub;
  window.OnlineGames    = OnlineGames;

  return { init };
})();
