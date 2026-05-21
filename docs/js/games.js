/* ═══════════════════════════════════════
   VidyaSagar v4 — games.js
   Number Guessing + Word Scramble
═══════════════════════════════════════ */
const GamesModule = (() => {

  /* ── Number Guessing Game ── */
  const NG = {
    secret: 0, min: 1, max: 100,
    attempts: 0, maxAttempts: 10,
    history: [], gameOver: false,

    reset() {
      this.secret = Math.floor(Math.random() * 100) + 1;
      this.attempts = 0; this.history = []; this.gameOver = false;
      document.getElementById('ng-num-display').textContent = '?';
      document.getElementById('ng-hint').textContent = `1 से 100 के बीच एक number सोचा है`;
      document.getElementById('ng-hint').className = 'ng-hint';
      document.getElementById('ng-input').value = '';
      document.getElementById('ng-tries').textContent = '0';
      document.getElementById('ng-left').textContent = this.maxAttempts;
      document.getElementById('ng-history-list').innerHTML = '';
      document.getElementById('ng-win-banner').classList.remove('show');
      document.getElementById('ng-input').disabled = false;
      document.getElementById('ng-submit-btn').disabled = false;
    },

    guess(num) {
      if (this.gameOver) return;
      num = parseInt(num);
      if (isNaN(num) || num < 1 || num > 100) { showToast('1-100 के बीच number डालें', 'error'); return; }
      this.attempts++;
      const left = this.maxAttempts - this.attempts;
      document.getElementById('ng-tries').textContent = this.attempts;
      document.getElementById('ng-left').textContent = Math.max(0, left);
      const diff = Math.abs(num - this.secret);
      let hint = '', cls = '';
      if (num === this.secret) {
        hint = `🎉 सही! ${this.attempts} tries में guess किया!`;
        cls = 'hot'; this.gameOver = true;
        document.getElementById('ng-num-display').textContent = this.secret;
        document.getElementById('ng-win-banner').classList.add('show');
        document.getElementById('ng-win-sub').textContent = `${this.attempts} tries में किया! 🏆`;
        document.getElementById('ng-input').disabled = true;
        document.getElementById('ng-submit-btn').disabled = true;
      } else if (left <= 0) {
        hint = `😔 Game Over! Answer था: ${this.secret}`;
        cls = 'cold'; this.gameOver = true;
        document.getElementById('ng-num-display').textContent = this.secret;
        document.getElementById('ng-input').disabled = true;
        document.getElementById('ng-submit-btn').disabled = true;
      } else {
        if (num < this.secret) {
          if (diff <= 5) { hint = `🔥 बहुत गर्म! और बड़ा`; cls = 'hot'; }
          else if (diff <= 15) { hint = `♨️ गर्म! और बड़ा number डालो`; cls = 'warm'; }
          else { hint = `❄️ ठंडा! और बड़ा number डालो`; cls = 'cold'; }
        } else {
          if (diff <= 5) { hint = `🔥 बहुत गर्म! और छोटा`; cls = 'hot'; }
          else if (diff <= 15) { hint = `♨️ गर्म! और छोटा number डालो`; cls = 'warm'; }
          else { hint = `❄️ ठंडा! और छोटा number डालो`; cls = 'cold'; }
        }
      }
      const hEl = document.getElementById('ng-hint');
      hEl.textContent = hint; hEl.className = `ng-hint ${cls}`;
      // History
      const tryEl = document.createElement('div');
      tryEl.className = 'ng-try';
      const arrow = num < this.secret ? '↑ बड़ा' : num > this.secret ? '↓ छोटा' : '✅ सही!';
      tryEl.innerHTML = `<span class="ng-try-num">Try ${this.attempts}: ${num}</span><span style="color:var(--text3)">${arrow}</span>`;
      document.getElementById('ng-history-list').prepend(tryEl);
      document.getElementById('ng-input').value = '';
      document.getElementById('ng-input').focus();
    }
  };

  /* ── Word Scramble Game ── */
  const WORDS = [
    { word:'COMPUTER',   hint:'Electronic device',       cat:'Technology' },
    { word:'KEYBOARD',   hint:'Typing device',           cat:'Technology' },
    { word:'MINISTER',   hint:'Government official',     cat:'Civics' },
    { word:'PARLIAMENT',hint:'Law making body',         cat:'Civics' },
    { word:'SCIENCE',    hint:'Study of nature',         cat:'Academics' },
    { word:'HISTORY',    hint:'Study of past',           cat:'Academics' },
    { word:'RAILWAY',    hint:'Train transport',         cat:'GK' },
    { word:'CAPITAL',    hint:'City of government',      cat:'GK' },
    { word:'BANKING',    hint:'Financial service',       cat:'Finance' },
    { word:'REPUBLIC',   hint:'Democratic nation',       cat:'Civics' },
    { word:'LANGUAGE',   hint:'Communication system',    cat:'Academics' },
    { word:'ELECTION',   hint:'Voting process',          cat:'Civics' },
    { word:'FREEDOM',    hint:'Independence',            cat:'GK' },
    { word:'VILLAGE',    hint:'Rural settlement',        cat:'GK' },
    { word:'OFFICER',    hint:'Government employee',     cat:'Jobs' },
    { word:'PRACTICE',   hint:'Repeated exercise',       cat:'Study' },
    { word:'MILITARY',   hint:'Armed forces',            cat:'Defence' },
    { word:'DISTRICT',   hint:'Administrative unit',     cat:'Civics' },
    { word:'HOSPITAL',   hint:'Medical facility',        cat:'GK' },
    { word:'STUDENT',    hint:'Person who studies',      cat:'Study' },
    { word:'QUESTION',   hint:'Query or inquiry',        cat:'Study' },
    { word:'NATIONAL',   hint:'Related to a country',    cat:'GK' },
    { word:'DIGITAL',    hint:'Electronic/computer',     cat:'Technology' },
    { word:'FOREST',     hint:'Dense trees area',        cat:'Nature' },
    { word:'POLICE',     hint:'Law enforcement',         cat:'Jobs' },
  ];

  const WS = {
    current: null, score: 0, skipped: 0, usedIndices: [],

    scramble(word) {
      const arr = word.split('');
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      const s = arr.join('');
      return s === word ? this.scramble(word) : s;
    },

    newWord() {
      if (this.usedIndices.length >= WORDS.length) { this.usedIndices = []; }
      let idx;
      do { idx = Math.floor(Math.random() * WORDS.length); } while (this.usedIndices.includes(idx));
      this.usedIndices.push(idx);
      this.current = WORDS[idx];
      const scrambled = this.scramble(this.current.word);
      document.getElementById('ws-scrambled').textContent = scrambled;
      document.getElementById('ws-hint-text').textContent = `Hint: ${this.current.hint}`;
      document.getElementById('ws-hint-cat').textContent = this.current.cat;
      document.getElementById('ws-input').value = '';
      document.getElementById('ws-result').textContent = '';
      document.getElementById('ws-result').className = 'ws-result';
      document.getElementById('ws-score').textContent = this.score;
      document.getElementById('ws-skipped').textContent = this.skipped;
      document.getElementById('ws-input').focus();
    },

    check() {
      const inp = document.getElementById('ws-input').value.trim().toUpperCase();
      const resultEl = document.getElementById('ws-result');
      if (!inp) return;
      if (inp === this.current.word) {
        resultEl.textContent = `✅ Correct! "${this.current.word}" 🎉`;
        resultEl.className = 'ws-result correct';
        this.score++;
        document.getElementById('ws-score').textContent = this.score;
        setTimeout(() => this.newWord(), 1200);
      } else {
        resultEl.textContent = `❌ Wrong! Try again… (${this.current.word.length} letters)`;
        resultEl.className = 'ws-result wrong';
        document.getElementById('ws-input').value = '';
        setTimeout(() => {
          if (resultEl.classList.contains('wrong')) {
            resultEl.textContent = ''; resultEl.className = 'ws-result';
          }
        }, 2000);
      }
    },

    skip() {
      const resultEl = document.getElementById('ws-result');
      resultEl.textContent = `Skipped! Answer was: ${this.current.word}`;
      resultEl.className = 'ws-result wrong';
      this.skipped++;
      document.getElementById('ws-skipped').textContent = this.skipped;
      setTimeout(() => this.newWord(), 1400);
    }
  };

  /* ── Init ── */
  function init() {
    // NG bindings
    document.getElementById('ng-submit-btn')?.addEventListener('click', () => {
      NG.guess(document.getElementById('ng-input').value);
    });
    document.getElementById('ng-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') NG.guess(document.getElementById('ng-input').value);
    });
    document.getElementById('ng-new-game')?.addEventListener('click', () => NG.reset());
    // WS bindings
    document.getElementById('ws-submit-btn')?.addEventListener('click', () => WS.check());
    document.getElementById('ws-input')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') WS.check();
    });
    document.getElementById('ws-skip-btn')?.addEventListener('click', () => WS.skip());
    document.getElementById('ws-new-btn')?.addEventListener('click', () => {
      WS.score = 0; WS.skipped = 0; WS.usedIndices = []; WS.newWord();
    });
  }

  function openNumberGame() {
    openSubScreen('screen-number-game');
    NG.reset();
  }

  function openWordGame() {
    openSubScreen('screen-word-game');
    WS.score = 0; WS.skipped = 0; WS.usedIndices = []; WS.newWord();
  }

  window.openNumberGame = openNumberGame;
  window.openWordGame   = openWordGame;
  return { init };
})();
