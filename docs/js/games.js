/* ═══════════════════════════════════════════════════════
   VidyaSagar v5 — games.js
   Online Games: Backend API + Redis rooms + MongoDB history
═══════════════════════════════════════════════════════ */
const GamesModule = (() => {

  /* ═══════════════════════════
     OFFLINE: NUMBER GUESSING
  ═══════════════════════════ */
  const NG = {
    secret:0, attempts:0, maxAttempts:10, gameOver:false,

    reset() {
      this.secret = Math.floor(Math.random()*100)+1;
      this.attempts = 0; this.gameOver = false;
      _el('ng-num-display').textContent='?';
      _el('ng-hint').textContent='1 से 100 के बीच एक number सोचा है';
      _el('ng-hint').className='ng-hint';
      _el('ng-input').value='';
      _el('ng-tries').textContent='0';
      _el('ng-left').textContent=this.maxAttempts;
      _el('ng-history-list').innerHTML='';
      _el('ng-win-banner').classList.remove('show');
      _el('ng-input').disabled=false;
      _el('ng-submit-btn').disabled=false;
    },

    guess(num) {
      if(this.gameOver) return;
      num=parseInt(num);
      if(isNaN(num)||num<1||num>100){showToast('1-100 के बीच number डालें','error');return;}
      this.attempts++;
      const left=this.maxAttempts-this.attempts;
      _el('ng-tries').textContent=this.attempts;
      _el('ng-left').textContent=Math.max(0,left);
      const diff=Math.abs(num-this.secret);
      let hint='',cls='';
      if(num===this.secret){
        hint=`🎉 सही! ${this.attempts} tries में guess किया!`;
        cls='hot';this.gameOver=true;
        _el('ng-num-display').textContent=this.secret;
        _el('ng-win-banner').classList.add('show');
        _el('ng-win-sub').textContent=`${this.attempts} tries में किया! 🏆`;
        _el('ng-input').disabled=true;_el('ng-submit-btn').disabled=true;
      } else if(left<=0){
        hint=`😔 Game Over! Answer था: ${this.secret}`;
        cls='cold';this.gameOver=true;
        _el('ng-num-display').textContent=this.secret;
        _el('ng-input').disabled=true;_el('ng-submit-btn').disabled=true;
      } else {
        const dir=num<this.secret?'बड़ा':'छोटा';
        if(diff<=5){hint=`🔥 बहुत गर्म! और ${dir}`;cls='hot';}
        else if(diff<=15){hint=`♨️ गर्म! और ${dir} number डालो`;cls='warm';}
        else{hint=`❄️ ठंडा! और ${dir} number डालो`;cls='cold';}
      }
      const hEl=_el('ng-hint');hEl.textContent=hint;hEl.className=`ng-hint ${cls}`;
      const arrow=num<this.secret?'↑ बड़ा':num>this.secret?'↓ छोटा':'✅ सही!';
      const tryEl=document.createElement('div');tryEl.className='ng-try';
      tryEl.innerHTML=`<span class="ng-try-num">Try ${this.attempts}: ${num}</span><span style="color:var(--text3)">${arrow}</span>`;
      _el('ng-history-list').prepend(tryEl);
      _el('ng-input').value='';_el('ng-input').focus();
    }
  };

  /* ═══════════════════════════
     OFFLINE: WORD SCRAMBLE
  ═══════════════════════════ */
  const WORDS=[
    {word:'COMPUTER',hint:'Electronic device',cat:'Technology'},
    {word:'KEYBOARD',hint:'Typing device',cat:'Technology'},
    {word:'MINISTER',hint:'Government official',cat:'Civics'},
    {word:'PARLIAMENT',hint:'Law making body',cat:'Civics'},
    {word:'SCIENCE',hint:'Study of nature',cat:'Academics'},
    {word:'HISTORY',hint:'Study of past',cat:'Academics'},
    {word:'RAILWAY',hint:'Train transport',cat:'GK'},
    {word:'CAPITAL',hint:'City of government',cat:'GK'},
    {word:'BANKING',hint:'Financial service',cat:'Finance'},
    {word:'REPUBLIC',hint:'Democratic nation',cat:'Civics'},
    {word:'LANGUAGE',hint:'Communication system',cat:'Academics'},
    {word:'ELECTION',hint:'Voting process',cat:'Civics'},
    {word:'FREEDOM',hint:'Independence',cat:'GK'},
    {word:'VILLAGE',hint:'Rural settlement',cat:'GK'},
    {word:'OFFICER',hint:'Government employee',cat:'Jobs'},
    {word:'PRACTICE',hint:'Repeated exercise',cat:'Study'},
    {word:'MILITARY',hint:'Armed forces',cat:'Defence'},
    {word:'DISTRICT',hint:'Administrative unit',cat:'Civics'},
    {word:'HOSPITAL',hint:'Medical facility',cat:'GK'},
    {word:'STUDENT',hint:'Person who studies',cat:'Study'},
    {word:'QUESTION',hint:'Query or inquiry',cat:'Study'},
    {word:'NATIONAL',hint:'Related to a country',cat:'GK'},
    {word:'DIGITAL',hint:'Electronic/computer',cat:'Technology'},
    {word:'FOREST',hint:'Dense trees area',cat:'Nature'},
    {word:'POLICE',hint:'Law enforcement',cat:'Jobs'},
    {word:'JUSTICE',hint:'Fairness and law',cat:'Civics'},
    {word:'ECONOMY',hint:'Financial system',cat:'Finance'},
    {word:'CLIMATE',hint:'Long-term weather',cat:'Nature'},
  ];

  const WS={
    current:null,score:0,skipped:0,streak:0,usedIndices:[],

    scramble(word){
      const arr=word.split('');
      for(let i=arr.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}
      return arr.join('')===word?this.scramble(word):arr.join('');
    },

    newWord(){
      if(this.usedIndices.length>=WORDS.length)this.usedIndices=[];
      let idx;
      do{idx=Math.floor(Math.random()*WORDS.length);}while(this.usedIndices.includes(idx));
      this.usedIndices.push(idx);
      this.current=WORDS[idx];
      _el('ws-scrambled').textContent=this.scramble(this.current.word);
      _el('ws-hint-text').textContent=`Hint: ${this.current.hint}`;
      _el('ws-hint-cat').textContent=this.current.cat;
      _el('ws-input').value='';
      _el('ws-result').textContent='';
      _el('ws-result').className='ws-result';
      _el('ws-score').textContent=this.score;
      _el('ws-skipped').textContent=this.skipped;
      const sEl=_el('ws-streak');if(sEl)sEl.textContent=this.streak;
      _el('ws-input').focus();
    },

    check(){
      const inp=_el('ws-input').value.trim().toUpperCase();
      const resultEl=_el('ws-result');
      if(!inp)return;
      if(inp===this.current.word){
        this.score++;this.streak++;
        resultEl.textContent=`✅ Correct! "${this.current.word}" 🎉${this.streak>1?` 🔥 ${this.streak} streak!`:''}`;
        resultEl.className='ws-result correct';
        _el('ws-score').textContent=this.score;
        const sEl=_el('ws-streak');if(sEl)sEl.textContent=this.streak;
        setTimeout(()=>this.newWord(),1200);
      } else {
        this.streak=0;
        resultEl.textContent=`❌ Wrong! Try again… (${this.current.word.length} letters)`;
        resultEl.className='ws-result wrong';
        _el('ws-input').value='';
        setTimeout(()=>{if(resultEl.classList.contains('wrong')){resultEl.textContent='';resultEl.className='ws-result';}},2000);
      }
    },

    skip(){
      this.streak=0;
      _el('ws-result').textContent=`Skipped! Answer was: ${this.current.word}`;
      _el('ws-result').className='ws-result wrong';
      this.skipped++;
      _el('ws-skipped').textContent=this.skipped;
      setTimeout(()=>this.newWord(),1400);
    }
  };

  /* ═══════════════════════════════════════════════════
     ONLINE GAMES — Backend API Based
  ═══════════════════════════════════════════════════ */
  const OnlineGames = {
    currentRoom: null,
    currentGame: null,
    pollTimer:   null,
    mySymbol:    null,  // 'X'/'O' for TTT, 'white'/'black' for chess
    isHost:      false,
    lastUpdate:  null,


    /* ── Find Random Match ── */
    _mmTimer: null,
    _mmGameType: null,

    async findMatch(gameType) {
      if (!token || !userData) { openAuth('login'); return; }
      this._mmGameType = gameType;

      /* Show matchmaking status */
      const mmEl = document.getElementById('og-mm-status');
      const mmTxt = document.getElementById('og-mm-text');
      if (mmEl) mmEl.classList.remove('hidden');
      if (mmTxt) mmTxt.textContent = `${gameType === 'chess' ? '♟️' : '⭕'} Opponent dhundh rahe hain…`;

      try {
        const d = await apiFetch('/api/game/matchmake', {
          method: 'POST',
          body: JSON.stringify({ gameType })
        });

        if (d.matched) {
          /* Instant match — join as guest */
          this._clearMatchmaking();
          this.currentRoom  = d.roomId;
          this.currentGame  = gameType;
          this.mySymbol     = d.mySymbol;
          this.isHost       = false;
          const rd = await apiFetch(`/api/game/${d.roomId}`);
          this._openGameScreen(rd.room, false);
        } else {
          /* Wait for host to be matched — poll every 2s */
          let elapsed = 0;
          this._mmTimer = setInterval(async () => {
            elapsed += 2;
            if (mmTxt) mmTxt.textContent = `⏳ Opponent dhundh rahe hain… ${elapsed}s`;

            /* Timeout after 90s */
            if (elapsed >= 90) {
              this.cancelMatchmaking();
              showToast('Koi opponent nahi mila। Baad mein try karein।', 'info');
              return;
            }

            try {
              const check = await apiFetch(`/api/game/matchmake/check/${gameType}`);
              if (check.matched) {
                this._clearMatchmaking();
                this.currentRoom  = check.roomId;
                this.currentGame  = gameType;
                this.mySymbol     = check.mySymbol;
                this.isHost       = true;
                const rd = await apiFetch(`/api/game/${check.roomId}`);
                this._openGameScreen(rd.room, true);
                showToast('Match mil gaya! 🎮', 'success');
              }
            } catch {}
          }, 2000);
        }
      } catch(e) {
        this._clearMatchmaking();
        showToast('Error: ' + e.message, 'error');
      }
    },

    async cancelMatchmaking() {
      const gt = this._mmGameType;
      this._clearMatchmaking();
      if (gt) {
        try { await apiFetch('/api/game/matchmake/cancel', { method:'POST', body: JSON.stringify({ gameType: gt }) }); } catch {}
      }
      showToast('Matchmaking cancel', 'info');
    },

    _clearMatchmaking() {
      if (this._mmTimer) { clearInterval(this._mmTimer); this._mmTimer = null; }
      const mmEl = document.getElementById('og-mm-status');
      if (mmEl) mmEl.classList.add('hidden');
    },

    /* ── Create Room ── */
    async createRoom(gameType) {
      if (!token || !userData) { openAuth('login'); return; }
      try {
        showToast('Room बना रहे हैं…', 'info');
        const d = await apiFetch('/api/game/create', {
          method: 'POST',
          body: JSON.stringify({ gameType })
        });
        this.currentRoom = d.roomId;
        this.currentGame = gameType;
        this.mySymbol    = gameType === 'chess' ? 'white' : 'X';
        this.isHost      = true;
        this._openGameScreen(d.room, true);
      } catch(e) {
        showToast('Error: ' + e.message, 'error');
      }
    },

    /* ── Join Room ── */
    async joinRoom(roomId) {
      if (!token || !userData) { openAuth('login'); return; }
      roomId = (roomId||'').toUpperCase().trim();
      if (!roomId) { showToast('Room ID डालें', 'error'); return; }
      try {
        showToast('Room join हो रहे हैं…', 'info');
        const d = await apiFetch('/api/game/join', {
          method: 'POST',
          body: JSON.stringify({ roomId })
        });
        this.currentRoom = roomId;
        this.currentGame = d.room.game;
        this.mySymbol    = d.room.game === 'chess' ? 'black' : 'O';
        this.isHost      = false;
        this._openGameScreen(d.room, false);
      } catch(e) {
        showToast('Error: ' + e.message, 'error');
      }
    },

    /* ── Open game screen ── */
    _openGameScreen(room, isHost) {
      openSubScreen('screen-online-game');
      _el('og-room-id').textContent         = room.id;
      _el('og-room-code-display').textContent = room.id;
      _el('og-game-title').textContent = room.game === 'chess' ? '♟️ Chess' : '⭕ Tic Tac Toe';
      _el('og-my-symbol').textContent  = isHost
        ? (room.game === 'chess' ? '♔ White (आप)' : '✖️ X (आप)')
        : (room.game === 'chess' ? '♚ Black (आप)' : '⭕ O (आप)');

      if (isHost) {
        _el('og-waiting')?.classList.remove('hidden');
        _el('og-board-wrap')?.classList.add('hidden');
      } else {
        _el('og-waiting')?.classList.add('hidden');
        _el('og-board-wrap')?.classList.remove('hidden');
        this._renderBoard(room);
      }
      this._updateTurnBar(room);
      this.startPolling();
    },

    /* ── Polling — every 800ms ── */
    startPolling() {
      this.stopPolling();
      this.pollTimer = setInterval(() => this._poll(), 800);
    },
    stopPolling() {
      if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
    },

    async _poll() {
      if (!this.currentRoom) return;
      try {
        const d = await apiFetch(`/api/game/${this.currentRoom}`);
        const room = d.room;

        // Guest joined — show board
        const waitEl = _el('og-waiting');
        if (waitEl && !waitEl.classList.contains('hidden') && room.status === 'playing') {
          waitEl.classList.add('hidden');
          _el('og-board-wrap')?.classList.remove('hidden');
          showToast(`${room.guest} join हो गया! 🎮`, 'success');
        }

        this._renderBoard(room);
        this._updateTurnBar(room);

        if (room.status === 'finished') {
          this.stopPolling();
          this._showResult(room);
        }
      } catch(e) {
        // Room expired or network error — stop polling silently
        if (e.message?.includes('404') || e.message?.includes('expired')) {
          this.stopPolling();
          showToast('Room expire हो गया', 'info');
        }
      }
    },

    /* ── Make Move ── */
    async makeMove(moveData) {
      if (!this.currentRoom) return;
      try {
        const d = await apiFetch(`/api/game/${this.currentRoom}/move`, {
          method: 'POST',
          body: JSON.stringify({ moveData })
        });
        this._renderBoard(d.room);
        this._updateTurnBar(d.room);
        if (d.room.status === 'finished') {
          this.stopPolling();
          this._showResult(d.room);
        }
      } catch(e) {
        showToast(e.message || 'Invalid move', 'error');
      }
    },

    /* ══════════════
       TTT RENDER
    ══════════════ */
    _renderTTT(room) {
      const wrap = _el('og-board-wrap');
      if (!wrap) return;
      const board = room?.state?.board || room?.board || Array(9).fill('');
      const myTurn = room?.turn === userData?.name && room?.status === 'playing';

      wrap.innerHTML = `
        <div class="ttt-board" id="ttt-board">
          ${board.map((cell, i) => `
            <div class="ttt-cell ${cell?'filled':''} ${myTurn&&!cell?'hoverable':''}" data-i="${i}">
              <span class="ttt-sym ${cell==='X'?'x-sym':'o-sym'}">${cell}</span>
            </div>`).join('')}
        </div>`;

      wrap.querySelectorAll('.ttt-cell:not(.filled)').forEach(cell => {
        cell.addEventListener('click', () => {
          if (!myTurn) { showToast('आपकी बारी नहीं है!', 'warn'); return; }
          this.makeMove({ idx: parseInt(cell.dataset.i) });
        });
      });
    },

    /* ══════════════
       CHESS RENDER
    ══════════════ */
    _pieceSymbol(piece, color) {
      const s = { white:{K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙'}, black:{K:'♚',Q:'♛',R:'♜',B:'♝',N:'♞',P:'♟'} };
      return s[color]?.[piece] || '';
    },

    _selectedCell: null, // [r,c] locally for UI

    _renderChess(room) {
      const wrap = _el('og-board-wrap');
      if (!wrap) return;
      const board = room?.board || [];
      const myColor = this.isHost ? 'white' : 'black';
      const myTurn  = room?.turn === userData?.name && room?.status === 'playing';
      const sel     = this._selectedCell;

      let html = `<div class="chess-board" id="chess-board">`;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const light = (r+c)%2===0;
          const cell  = board[r]?.[c];
          const isSel = sel && sel[0]===r && sel[1]===c;
          const sym   = cell ? this._pieceSymbol(cell.piece, cell.color) : '';
          html += `<div class="chess-cell ${light?'light':'dark'} ${isSel?'selected':''}"
            data-r="${r}" data-c="${c}">
            <span class="chess-piece ${cell?.color||''}">${sym}</span>
          </div>`;
        }
      }
      html += `</div>
        <div class="chess-info-row">
          <div>${(room?.captured?.white||[]).map(p=>this._pieceSymbol(p,'black')).join('')}</div>
          <div>${(room?.captured?.black||[]).map(p=>this._pieceSymbol(p,'white')).join('')}</div>
        </div>`;
      wrap.innerHTML = html;

      wrap.querySelectorAll('.chess-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          const r=parseInt(cell.dataset.r), c=parseInt(cell.dataset.c);
          const piece = board[r]?.[c];

          if (this._selectedCell) {
            const [sr,sc] = this._selectedCell;
            if (sr===r && sc===c) { this._selectedCell=null; this._renderChess(room); return; }

            // Move to target
            this._selectedCell = null;
            this.makeMove({ from:[sr,sc], to:[r,c] });
          } else {
            if (!myTurn) { showToast('आपकी बारी नहीं है!','warn'); return; }
            if (piece && piece.color === myColor) {
              this._selectedCell = [r,c];
              this._renderChess(room);
            }
          }
        });
      });
    },

    /* ── Render board (auto-detect game type) ── */
    _renderBoard(room) {
      if (!room) return;
      if (room.game === 'ttt')   this._renderTTT(room);
      else if (room.game === 'chess') this._renderChess(room);
    },

    /* ── Turn Bar ── */
    _updateTurnBar(room) {
      const bar = _el('og-turn-bar');
      if (!bar || !room) return;
      if (room.status === 'waiting') {
        bar.textContent = '⏳ Opponent का इंतज़ार…';
        bar.style.color = 'var(--text3)';
        return;
      }
      if (room.status === 'finished') {
        bar.textContent = room.winner ? `🏆 ${room.winner} जीते!` : '🤝 Draw!';
        bar.style.color = 'var(--amber)';
        return;
      }
      const myTurn = room.turn === userData?.name;
      bar.textContent = myTurn ? '✅ आपकी बारी है!' : `⏳ ${room.turn} की बारी…`;
      bar.style.color = myTurn ? 'var(--green)' : 'var(--text3)';
    },

    /* ── Show Result ── */
    _showResult(room) {
      const won  = room.winner === userData?.name;
      const draw = room.winner === null;
      setTimeout(() => {
        showToast(draw ? '🤝 Draw!' : won ? '🏆 आप जीते!' : '😔 आप हारे!', won ? 'success' : 'info');
      }, 300);
    },

    /* ── Leave / Forfeit ── */
    async leaveRoom() {
      this.stopPolling();
      this._selectedCell = null;
      if (this.currentRoom) {
        try { await apiFetch(`/api/game/${this.currentRoom}/leave`, { method:'POST' }); } catch {}
      }
      this.currentRoom = null;
      this.currentGame = null;
      closeSubScreen('screen-online-game');
    },

    /* ── Share Room ── */
    shareRoom() {
      const id = _el('og-room-id')?.textContent;
      if (!id) return;
      if (navigator.share) {
        navigator.share({ title:'VidyaSagar Game', text:`मेरे साथ खेलो! Room ID: ${id}` });
      } else {
        navigator.clipboard?.writeText(id);
        showToast(`Room ID "${id}" copied! 📋`, 'success');
      }
    },

    copyRoomId() {
      const id = _el('og-room-id')?.textContent;
      if (!id) return;
      navigator.clipboard?.writeText(id);
      showToast(`Room ID "${id}" copied! 📋`, 'success');
    },

    /* ── Online History (from server) ── */
    async showOnlineHistory() {
      openSubScreen('screen-online-history');
      const list = _el('online-hist-list');
      if (!list) return;
      if (!token) { list.innerHTML='<div class="vs-empty">Login करें</div>'; return; }
      list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
      try {
        const d = await apiFetch('/api/game/history/me');
        const h = d.history || [];
        if (!h.length) {
          list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🎮</span>कोई online game नहीं खेला अभी तक</div>';
          return;
        }
        // Group by opponent
        const oppGroups = {};
        h.forEach(x => {
          if (!oppGroups[x.opponent]) oppGroups[x.opponent] = { wins:0, losses:0, draws:0, avatar: x.opponentAvatar||'🎓' };
          if (x.result==='win')    oppGroups[x.opponent].wins++;
          else if (x.result==='loss') oppGroups[x.opponent].losses++;
          else oppGroups[x.opponent].draws++;
        });

        list.innerHTML = `
          <div class="oh-section-title">👥 Opponent-wise Stats</div>
          ${Object.entries(oppGroups).map(([opp,s])=>`
            <div class="oh-opp-card">
              <div style="display:flex;align-items:center;gap:10px">
                <span style="font-size:1.4rem">${s.avatar}</span>
                <div class="oh-opp-name">vs ${_esc(opp)}</div>
              </div>
              <div class="oh-opp-stats">
                <span style="color:var(--green)">✅ ${s.wins}W</span>
                <span style="color:var(--rose)">❌ ${s.losses}L</span>
                <span style="color:var(--amber)">🤝 ${s.draws}D</span>
              </div>
            </div>`).join('')}
          <div class="oh-section-title" style="margin-top:20px">📋 Recent Games</div>
          ${h.slice(0,20).map(x=>{
            const d2=new Date(x.playedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
            const rc=x.result==='win'?'#34d399':x.result==='draw'?'#fbbf24':'#fb7185';
            const ri=x.result==='win'?'🏆':x.result==='draw'?'🤝':'😔';
            return `<div class="oh-game-row">
              <span class="oh-game-icon">${x.gameType==='chess'?'♟️':'⭕'}</span>
              <div class="oh-game-info">
                <div style="font-weight:700;font-size:.84rem">vs ${_esc(x.opponent)}</div>
                <div style="font-size:.72rem;color:var(--text3)">${x.moves} moves · ${d2}</div>
              </div>
              <span style="font-weight:800;color:${rc}">${ri} ${x.result.toUpperCase()}</span>
            </div>`;
          }).join('')}`;
      } catch(e) {
        list.innerHTML = `<div class="vs-empty">${e.message}</div>`;
      }
    },

    /* ── Leaderboard (from server) ── */
    async showLeaderboard() {
      openSubScreen('screen-leaderboard');
      const list = _el('leaderboard-list');
      if (!list) return;
      list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
      try {
        const d = await apiFetch('/api/game/leaderboard/top');
        const lb = d.leaderboard || [];
        if (!lb.length) {
          list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🏆</span>कोई ranking नहीं। Game खेलें!</div>';
          return;
        }
        const medals = ['🥇','🥈','🥉'];
        list.innerHTML = lb.map((p,i)=>`
          <div class="lb-row ${i<3?'top3':''}">
            <div class="lb-rank">${medals[i]||'#'+(i+1)}</div>
            <div class="lb-av">${p.avatar||'🎓'}</div>
            <div class="lb-info">
              <div class="lb-name">${_esc(p.name)}</div>
              <div class="lb-sub">${p.wins}W · ${p.losses}L · ${p.draws}D</div>
            </div>
            <div class="lb-pts"><span>${p.points}</span><small>pts</small></div>
          </div>`).join('');
      } catch(e) {
        list.innerHTML = `<div class="vs-empty">${e.message}</div>`;
      }
    },
  };

  /* ── Helpers ── */
  function _el(id) { return document.getElementById(id); }
  function _esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  /* ── Open functions ── */
  function openNumberGame() { openSubScreen('screen-number-game'); NG.reset(); }
  function openWordGame() {
    openSubScreen('screen-word-game');
    WS.score=0;WS.skipped=0;WS.streak=0;WS.usedIndices=[];WS.newWord();
  }

  /* ── Init ── */
  function init() {
    _el('ng-submit-btn')?.addEventListener('click', ()=>NG.guess(_el('ng-input').value));
    _el('ng-input')?.addEventListener('keydown', e=>{if(e.key==='Enter')NG.guess(_el('ng-input').value);});
    _el('ng-new-game')?.addEventListener('click', ()=>NG.reset());

    _el('ws-submit-btn')?.addEventListener('click', ()=>WS.check());
    _el('ws-input')?.addEventListener('keydown', e=>{if(e.key==='Enter')WS.check();});
    _el('ws-skip-btn')?.addEventListener('click', ()=>WS.skip());
    _el('ws-new-btn')?.addEventListener('click', ()=>{
      WS.score=0;WS.skipped=0;WS.streak=0;WS.usedIndices=[];WS.newWord();
    });

    _el('btn-og-leave')?.addEventListener('click', ()=>OnlineGames.leaveRoom());
    _el('btn-og-share-room')?.addEventListener('click', ()=>OnlineGames.shareRoom());
  }

  window.openNumberGame = openNumberGame;
  window.openWordGame   = openWordGame;
  window.OnlineGames    = OnlineGames;

  return { init };
})();
