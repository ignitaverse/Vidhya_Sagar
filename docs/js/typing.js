/* ═══════════════════════════════════════════════════════════════
   VidyaSagar v5 — js/typing.js (FRONTEND)
   Features: Exam list, passage display, char-by-char highlight,
             live WPM/accuracy/errors/keys, timer, result screen
   Reference UI: artypingplatform.com box-style layout
═══════════════════════════════════════════════════════════════ */
const TypingModule = (() => {
  'use strict';

  /* ── State ── */
  let _exams        = [];      // all exams fetched from Supabase
  let _currentExam  = null;    // selected exam object
  let _currentPassage = null;  // { id, text, wordCount, examId, ... }
  let _chars        = [];      // passage split into chars

  let _timerStarted = false;
  let _timerInterval = null;
  let _totalSecs    = 600;     // 10 min default
  let _secsLeft     = 600;
  let _finished     = false;

  /* Live stats */
  let _keystrokes   = 0;
  let _errors       = 0;
  let _backspaces   = 0;
  let _typedCorrect = 0;
  let _charIndex    = 0;       // next expected char position

  /* ── Supabase Client ── */
  let _sb = null;
  function _getSupabase() {
    if (_sb) return _sb;
    try {
      if (VS_CONFIG.SUPABASE_URL && VS_CONFIG.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
        _sb = supabase.createClient(VS_CONFIG.SUPABASE_URL, VS_CONFIG.SUPABASE_KEY);
      }
    } catch(e) { console.warn('Supabase init failed:', e.message); }
    return _sb;
  }

  /* ── DOM helpers ── */
  const _el = id => document.getElementById(id);
  const _setTxt = (id, val) => { const e = _el(id); if (e) e.textContent = val; };

  /* ══════════════════════════════════
     EXAM LIST — load from Supabase
  ══════════════════════════════════ */
  async function loadExams() {
    const grid = _el('exam-grid');
    if (!grid) return;
    grid.innerHTML = '<div class="vs-loading-text" style="grid-column:1/-1">Loading exams…</div>';

    try {
      const sb = _getSupabase();
      let exams = [];

      if (sb) {
        const { data, error } = await sb.from('exams').select('*').order('name');
        if (error) throw new Error(error.message);
        exams = data || [];
      } else {
        // Fallback offline exams
        exams = _offlineExams();
      }

      _exams = exams;
      _renderExamGrid(_exams);
      _bindSearch();
      _bindCatTabs();

    } catch(e) {
      // Use offline exams on any error
      _exams = _offlineExams();
      _renderExamGrid(_exams);
      _bindSearch();
      _bindCatTabs();
      console.warn('Supabase exams failed, using offline:', e.message);
    }
  }

  /* Offline exam data (when Supabase not configured) */
  function _offlineExams() {
    return [
      { id:'ssc-cgl',    name:'SSC CGL',          category:'central',  minWpm:35, minAcc:90, timeMins:10, languages:['english'],       emoji:'🏛️', color:'#3b82f6' },
      { id:'ssc-chsl',   name:'SSC CHSL',          category:'central',  minWpm:35, minAcc:90, timeMins:10, languages:['english','hindi'], emoji:'🏛️', color:'#3b82f6' },
      { id:'ssc-mts',    name:'SSC MTS',           category:'central',  minWpm:25, minAcc:90, timeMins:10, languages:['english','hindi'], emoji:'🏛️', color:'#3b82f6' },
      { id:'agniveer',   name:'Army Agniveer LDC',  category:'defence',  minWpm:40, minAcc:90, timeMins:10, languages:['english'],       emoji:'🛡️', color:'#f43f5e' },
      { id:'crpf',       name:'CRPF LDC',          category:'defence',  minWpm:35, minAcc:90, timeMins:10, languages:['english','hindi'], emoji:'🛡️', color:'#f43f5e' },
      { id:'up-police',  name:'UP Police',          category:'state',    minWpm:25, minAcc:80, timeMins:10, languages:['hindi'],          emoji:'🗺️', color:'#8b5cf6' },
      { id:'ahc',        name:'Allahabad HC',       category:'court',    minWpm:30, minAcc:90, timeMins:10, languages:['english','hindi'], emoji:'⚖️', color:'#f59e0b' },
      { id:'rajasthan',  name:'Rajasthan HC',       category:'court',    minWpm:30, minAcc:90, timeMins:10, languages:['english'],        emoji:'⚖️', color:'#f59e0b' },
      { id:'rrb-ntpc',   name:'RRB NTPC',           category:'central',  minWpm:30, minAcc:90, timeMins:10, languages:['english','hindi'], emoji:'🏛️', color:'#3b82f6' },
      { id:'bsnl',       name:'BSNL TTA',           category:'psu',      minWpm:30, minAcc:90, timeMins:10, languages:['english'],        emoji:'🔬', color:'#10b981' },
      { id:'mp-police',  name:'MP Police',          category:'state',    minWpm:25, minAcc:80, timeMins:10, languages:['hindi'],          emoji:'🗺️', color:'#8b5cf6' },
      { id:'bihar-ssc',  name:'Bihar SSC',          category:'state',    minWpm:25, minAcc:85, timeMins:10, languages:['hindi'],          emoji:'🗺️', color:'#8b5cf6' },
    ];
  }

  function _renderExamGrid(exams) {
    const grid = _el('exam-grid');
    if (!grid) return;
    if (!exams.length) {
      grid.innerHTML = '<div class="vs-empty" style="grid-column:1/-1"><span class="ve-icon">⌨️</span>No exams found</div>';
      return;
    }
    grid.innerHTML = exams.map(ex => `
      <div class="exam-card-v2" onclick="TypingModule.openExamDetail('${ex.id}')">
        <div style="display:flex;align-items:flex-start;gap:10px;padding:13px 13px 10px">
          <div style="width:38px;height:38px;border-radius:11px;background:${ex.color||'#3b82f6'}22;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0;border:1.5px solid ${ex.color||'#3b82f6'}33">${ex.emoji||'⌨️'}</div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:800;font-size:.88rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(ex.name)}</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">
              <span style="font-size:.65rem;background:${ex.color||'#3b82f6'}18;color:${ex.color||'#3b82f6'};border-radius:5px;padding:2px 7px;font-weight:700">${ex.minWpm||30} WPM</span>
              <span style="font-size:.65rem;background:rgba(52,211,153,.12);color:#34d399;border-radius:5px;padding:2px 7px;font-weight:700">${ex.minAcc||90}% Acc</span>
              <span style="font-size:.65rem;background:rgba(255,255,255,.07);color:var(--text3);border-radius:5px;padding:2px 7px;font-weight:600">${ex.timeMins||10} min</span>
            </div>
          </div>
        </div>
        <div style="padding:0 13px 13px;display:flex;align-items:center;justify-content:space-between">
          <div style="display:flex;gap:5px">
            ${(ex.languages||['english']).map(l=>`<span style="font-size:.62rem;background:rgba(139,92,246,.12);color:#a78bfa;border-radius:4px;padding:2px 6px;font-weight:700">${l==='english'?'EN':'HI'}</span>`).join('')}
          </div>
          <button class="ecv2-start-btn">Start →</button>
        </div>
      </div>`).join('');
  }

  function _bindSearch() {
    const inp = _el('exam-search-inp');
    if (!inp || inp._bound) return;
    inp._bound = true;
    inp.addEventListener('input', () => {
      const q = inp.value.toLowerCase().trim();
      const activeCat = document.querySelector('.exam-cat-btn.active')?.dataset.cat || 'all';
      const filtered = _exams.filter(ex => {
        const matchCat = activeCat === 'all' || ex.category === activeCat;
        const matchQ   = !q || ex.name.toLowerCase().includes(q) || (ex.category||'').includes(q);
        return matchCat && matchQ;
      });
      _renderExamGrid(filtered);
    });
  }

  function _bindCatTabs() {
    document.querySelectorAll('.exam-cat-btn').forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.exam-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.cat || 'all';
        const q = (_el('exam-search-inp')?.value||'').toLowerCase().trim();
        const filtered = _exams.filter(ex => {
          const matchCat = cat === 'all' || ex.category === cat;
          const matchQ   = !q || ex.name.toLowerCase().includes(q);
          return matchCat && matchQ;
        });
        _renderExamGrid(filtered);
      });
    });
  }

  /* ══════════════════════════════════
     EXAM DETAIL SCREEN
  ══════════════════════════════════ */
  async function openExamDetail(examId) {
    _currentExam = _exams.find(e => e.id === examId) || null;
    if (!_currentExam) return;

    openSubScreen('screen-exam-detail');
    _setTxt('exam-detail-title', _currentExam.name);
    _setTxt('ed-name', _currentExam.name);
    _setTxt('ed-speed', (_currentExam.minWpm || 30) + ' WPM');
    _setTxt('ed-acc',   (_currentExam.minAcc || 90) + '%');
    _setTxt('ed-time',  (_currentExam.timeMins || 10) + ' min');
    _setTxt('ed-lang-tag', (_currentExam.languages||['english']).map(l=>l==='english'?'EN':'HI').join('/'));

    // Language buttons
    const langsEl = _el('ed-langs');
    if (langsEl) {
      langsEl.innerHTML = (_currentExam.languages||['english']).map(l => `
        <button onclick="TypingModule.startTest('${examId}','${l}')"
          style="background:linear-gradient(135deg,#1a56db,#1e40af);color:#fff;border:none;border-radius:10px;padding:11px 22px;font-size:.88rem;font-weight:700;cursor:pointer;box-shadow:0 4px 14px rgba(26,86,219,.4);margin:4px">
          ${l === 'english' ? '🔤 English Start' : '📖 Hindi Start'}
        </button>`).join('');
    }

    // Load passages
    await _loadPassages(examId);
  }

  async function _loadPassages(examId) {
    const list = _el('passages-list');
    const countPill = _el('passage-count-pill');
    if (!list) return;
    list.innerHTML = '<div class="vs-loading-text">Loading passages…</div>';

    let passages = [];
    try {
      const sb = _getSupabase();
      if (sb) {
        const { data, error } = await sb
          .from('passages')
          .select('id, title, text, language, word_count, difficulty')
          .eq('exam_id', examId)
          .order('created_at');
        if (error) throw new Error(error.message);
        passages = (data || []).map(p => ({
          id: p.id, title: p.title||'Passage', text: p.text,
          language: p.language||'english',
          wordCount: p.word_count || p.text.trim().split(/\s+/).length,
          difficulty: _normDifficulty(p.difficulty),
          examId
        }));
      } else {
        passages = _offlinePassages(examId);
      }
    } catch(e) {
      passages = _offlinePassages(examId);
    }

    window._currentPassages = passages;
    if (countPill) countPill.textContent = passages.length + ' passages';

    if (!passages.length) {
      list.innerHTML = '<div class="vs-empty"><span class="ve-icon">📄</span>No passages yet</div>';
      return;
    }

    _renderPassageBoxes(list, passages);
  }

  /* Any unrecognised/missing difficulty value falls back to 'normal' so older
     passages (added before this field existed) still show up somewhere. */
  function _normDifficulty(d) {
    const v = String(d||'').toLowerCase().trim();
    return ['easy','normal','hard'].includes(v) ? v : 'normal';
  }

  /* Renders passages grouped into 3 side-by-side (desktop) / stacked (mobile)
     boxes by difficulty. Each box scrolls independently once it has more
     passages than fit — new Supabase rows just show up in the right box
     next time this screen opens, no other change needed. */
  function _renderPassageBoxes(list, passages) {
    const levels = [
      { key:'easy',   label:'🟢 Easy',   sub:'आसान'   },
      { key:'normal', label:'🟡 Normal', sub:'सामान्य' },
      { key:'hard',   label:'🔴 Hard',   sub:'कठिन'    },
    ];
    list.innerHTML = levels.map(lvl => {
      const items = passages.filter(p => p.difficulty === lvl.key);
      return `
        <div class="passage-box passage-box-${lvl.key}">
          <div class="passage-box-head">
            <span>${lvl.label} <span class="passage-box-sub">${lvl.sub}</span></span>
            <span class="passage-box-count">${items.length}</span>
          </div>
          <div class="passage-box-body">
            ${items.length
              ? items.map((p,i) => _passageCardHtml(p,i)).join('')
              : '<div class="vs-empty" style="padding:22px 8px;font-size:.76rem"><span class="ve-icon" style="font-size:1.5rem">📄</span>अभी कोई passage नहीं</div>'}
          </div>
        </div>`;
    }).join('');
  }

  function _passageCardHtml(p, i) {
    return `
      <div class="passage-card-v2" onclick="TypingModule._startWithText('${p.id}')"
        style="background:var(--card);border:1.5px solid var(--border);border-radius:14px;padding:13px 14px;margin-bottom:10px;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:12px">
        <div style="width:36px;height:36px;border-radius:10px;background:rgba(26,86,219,.12);border:1.5px solid rgba(26,86,219,.2);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:.85rem;color:#3b82f6;flex-shrink:0">${i+1}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:.86rem;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${_esc(p.title||'Passage '+(i+1))}</div>
          <div style="display:flex;gap:8px;font-size:.7rem;color:var(--text3)">
            <span>📝 ${p.wordCount} words</span>
            <span>${p.language==='hindi'?'📖 Hindi':'🔤 English'}</span>
          </div>
        </div>
        <span style="color:#3b82f6;font-size:.85rem;font-weight:700">▶</span>
      </div>`;
  }

  /* Offline passages fallback */
  function _offlinePassages(examId) {
    const texts = {
      english: [
        { title:'The Supreme Court and the SIR Process', text:'The Special Intensive Revision (SIR) process has recently concluded with the release of final electoral rolls across several major states. In the year 2024, the net number of voters removed from the rolls in states like Tamil Nadu reached 11.5%, while Gujarat saw a deletion rate of 13.4%. The SIR process has recently concluded with the release of final electoral rolls across several major states. These high numbers are particularly significant in net in-migrant states, whereas Bihar saw deletions of only 6%. The fact that female deletions outpaced male excisions suggests that the SIR process, as implemented, may have disproportionately affected women voters. The Election Commission of India maintains that the revision was conducted fairly and transparently, following all established protocols and guidelines for maintaining an accurate electoral roll.' },
        { title:'Digital India Initiative', text:'The Digital India programme is a flagship initiative of the Government of India with a vision to transform India into a digitally empowered society and knowledge economy. The programme weaves together a large number of ideas and thoughts into a single, comprehensive vision so that each of them is seen as part of a larger goal. The programme is centred on three key vision areas: digital infrastructure as a core utility to every citizen, governance and services on demand, and digital empowerment of citizens. Each of these three areas is supported by a number of components that together constitute the Digital India programme. The initiative aims to provide high-speed internet as a core utility, digital identity to all citizens, mobile phone and bank account enabling citizen participation in digital and financial space.' },
        { title:'Indian Space Research Organisation', text:'The Indian Space Research Organisation, commonly referred to as ISRO, is the national space agency of India, headquartered in Bengaluru. It operates under the Department of Space which is directly overseen by the Prime Minister of India. ISRO is the primary agency in India responsible for space-based operations, space exploration, international space cooperation and the development of related technologies. Established in 1969, ISRO has made India one of the leading space-faring nations in the world. The organisation has successfully launched numerous satellites and spacecraft, including the Mars Orbiter Mission, which made India the first nation to successfully reach Martian orbit on its maiden attempt and at a relatively low cost compared to other countries.' },
      ],
      hindi: [
        { title:'भारतीय संविधान', text:'भारत का संविधान विश्व का सबसे लंबा लिखित संविधान है। यह 26 जनवरी 1950 को लागू हुआ था। संविधान सभा ने इसे 26 नवंबर 1949 को अपनाया था। डॉ. भीमराव अंबेडकर को भारतीय संविधान का जनक माना जाता है। संविधान में मौलिक अधिकार, नीति निर्देशक तत्व और मौलिक कर्तव्य शामिल हैं। भारत एक संप्रभु, समाजवादी, धर्मनिरपेक्ष और लोकतांत्रिक गणराज्य है। संसदीय शासन प्रणाली में राष्ट्रपति राज्य का प्रमुख होता है। प्रधानमंत्री सरकार का प्रमुख होता है और मंत्रिपरिषद का नेतृत्व करता है।' },
        { title:'स्वतंत्रता आंदोलन', text:'भारत का स्वतंत्रता आंदोलन ब्रिटिश शासन के विरुद्ध एक लंबा संघर्ष था। महात्मा गांधी ने अहिंसा और सत्याग्रह के मार्ग पर चलते हुए इस आंदोलन का नेतृत्व किया। 1857 की क्रांति को भारत का प्रथम स्वतंत्रता संग्राम कहा जाता है। इसके बाद कांग्रेस की स्थापना 1885 में हुई। असहयोग आंदोलन 1920 में शुरू हुआ। नमक सत्याग्रह 1930 में हुआ। भारत छोड़ो आंदोलन 1942 में चलाया गया। अंततः 15 अगस्त 1947 को भारत आजाद हुआ।' },
      ]
    };

    const lang = _currentExam?.languages?.includes('hindi') ? 'hindi' : 'english';
    const levels = ['easy','normal','hard'];
    return (texts[lang] || texts.english).map((t, i) => ({
      id: `offline-${examId}-${i}`,
      title: t.title,
      text: t.text,
      language: lang,
      difficulty: levels[i % levels.length],
      wordCount: t.text.trim().split(/\s+/).length,
      examId
    }));
  }

  /* ══════════════════════════════════
     START TEST
  ══════════════════════════════════ */
  async function startTest(examId, language = 'english') {
    const exam = _exams.find(e => e.id === examId);
    if (!exam) return;
    _currentExam = exam;

    // Get passage from already-loaded list
    const passages = (window._currentPassages || []).filter(p => p.language === language || !language);
    if (passages.length) {
      const p = passages[Math.floor(Math.random() * passages.length)];
      _initTest(p);
    } else {
      // Fetch fresh
      try {
        const sb = _getSupabase();
        if (sb) {
          const { data } = await sb.from('passages')
            .select('id,title,text,language,word_count')
            .eq('exam_id', examId)
            .eq('language', language)
            .limit(20);
          const all = data || [];
          if (all.length) {
            const raw = all[Math.floor(Math.random() * all.length)];
            _initTest({ id: raw.id, title: raw.title, text: raw.text, language: raw.language, wordCount: raw.word_count || raw.text.split(/\s+/).length, examId });
            return;
          }
        }
      } catch(e) {}
      // Fallback offline
      const fallbacks = _offlinePassages(examId).filter(p => p.language === language);
      const p = fallbacks[0] || _offlinePassages(examId)[0];
      _initTest(p);
    }
  }

  /* Start from a specific passage card click */
  function startFromPassage(passageJson, passageId) {
    const passages = window._currentPassages || [];
    const p = passages.find(x => String(x.id) === String(passageId));
    if (p) { _initTest(p); return; }
    try {
      const parsed = JSON.parse(decodeURIComponent(passageJson));
      if (parsed.id) {
        const full = passages.find(x => String(x.id) === String(parsed.id));
        if (full) { _initTest(full); return; }
      }
    } catch(e) {}
  }

  /* Internal: called with passage ID when passage is already in window._currentPassages */
  function _startWithText(passageId) {
    const p = (window._currentPassages || []).find(x => String(x.id) === String(passageId));
    if (p) _initTest(p);
  }

  /* ── Core: initialize the typing test ── */
  function _initTest(passage) {
    if (!passage || !passage.text) { showToast('Passage load नहीं हुआ', 'error'); return; }
    _currentPassage = passage;

    // Reset all state
    _timerStarted = false;
    _finished     = false;
    _keystrokes   = 0;
    _errors       = 0;
    _backspaces   = 0;
    _typedCorrect = 0;
    _charIndex    = 0;
    _chars        = passage.text.split('');
    _secsLeft     = (_currentExam?.timeMins || 10) * 60;
    _totalSecs    = _secsLeft;
    clearInterval(_timerInterval);

    // Update header
    const titleBar = _el('type-test-id-bar');
    if (titleBar) titleBar.innerHTML = `Typing Test — <span>${_esc(passage.title || _currentExam?.name || 'Practice')}</span>`;
    _setTxt('type-exam-title', _currentExam?.name || 'Practice');
    _setTxt('type-exam-title-bar', passage.title || _currentExam?.name || 'Practice');
    _setTxt('type-kb-layout', 'QWERTY');
    _setTxt('type-lang-label', passage.language === 'hindi' ? 'Hindi' : 'English');
    _updateTimer();
    _updateStats();

    // Render passage
    _renderPassage();

    // Clear input
    const inp = _el('typing-inp');
    if (inp) {
      inp.value = '';
      inp.disabled = false;
      inp.style.background = '';
      inp.style.color = '';
    }

    // Reset progress bar
    const prog = _el('type-prog-fill');
    if (prog) prog.style.width = '0%';

    // Open screen
    openSubScreen('screen-typing-active');

    // Timer starts the moment the passage appears — no more waiting for the first keystroke
    _timerStarted = true;
    _startTimer();

    // Focus input after screen transition
    setTimeout(() => {
      const i = _el('typing-inp');
      if (i) i.focus();
    }, 350);
  }

  /* ── Render passage as individual char spans ── */
  function _renderPassage() {
    const disp = _el('passage-display');
    if (!disp) return;
    disp.innerHTML = _chars.map((ch, i) =>
      `<span class="pc ${i === 0 ? 'current' : 'pending'}" data-i="${i}">${ch === ' ' ? '&nbsp;' : _esc(ch)}</span>`
    ).join('');
  }

  /* ── Typing input handler ── */
  function _onInput(e) {
    if (_finished) return;

    const inp = _el('typing-inp');
    if (!inp) return;

    const typed = inp.value;
    const lastChar = typed[typed.length - 1];

    if (e.inputType === 'deleteContentBackward') {
      // Backspace
      _backspaces++;
      if (_charIndex > 0) {
        _charIndex--;
        _typedCorrect = Math.max(0, _typedCorrect - (document.querySelector(`.pc[data-i="${_charIndex}"]`)?.classList.contains('correct') ? 1 : 0));
      }
      _syncHighlight(typed);
      _updateStats();
      return;
    }

    if (!lastChar) return;

    // Count keystroke
    _keystrokes++;

    // Check char
    const expected = _chars[_charIndex];
    if (expected === undefined) {
      // Past end — ignore
      inp.value = _chars.join('').substring(0, _charIndex);
      return;
    }

    const span = document.querySelector(`.pc[data-i="${_charIndex}"]`);
    if (span) {
      if (lastChar === expected) {
        span.classList.remove('pending','current','wrong');
        span.classList.add('correct');
        _typedCorrect++;
      } else {
        span.classList.remove('pending','current');
        span.classList.add('wrong');
        _errors++;
      }
    }

    _charIndex++;

    // Highlight next char
    const next = document.querySelector(`.pc[data-i="${_charIndex}"]`);
    if (next) {
      next.classList.remove('pending');
      next.classList.add('current');
      // Scroll into view if needed
      next.scrollIntoView({ block:'nearest', behavior:'smooth' });
    }

    // Update progress bar
    const prog = _el('type-prog-fill');
    if (prog) prog.style.width = ((_charIndex / _chars.length) * 100).toFixed(1) + '%';

    _updateStats();

    // Auto-finish when all chars typed
    if (_charIndex >= _chars.length) {
      _finishTest(true);
    }
  }

  /* Sync highlight on backspace */
  function _syncHighlight(typed) {
    // Remove current class from all
    document.querySelectorAll('.pc.current').forEach(s => s.classList.remove('current'));
    // Reset all from charIndex onward to pending
    for (let i = _charIndex; i < _chars.length; i++) {
      const s = document.querySelector(`.pc[data-i="${i}"]`);
      if (s) { s.classList.remove('correct','wrong','current'); s.classList.add('pending'); }
    }
    // Mark current
    const cur = document.querySelector(`.pc[data-i="${_charIndex}"]`);
    if (cur) { cur.classList.remove('pending'); cur.classList.add('current'); }
  }

  /* ── Timer ── */
  function _startTimer() {
    clearInterval(_timerInterval);
    _timerInterval = setInterval(() => {
      _secsLeft--;
      _updateTimer();
      _updateStats(); // update WPM every second

      if (_secsLeft <= 0) {
        clearInterval(_timerInterval);
        _finishTest(false);
      }
    }, 1000);
  }

  function _updateTimer() {
    const mins = Math.floor(_secsLeft / 60);
    const secs = _secsLeft % 60;
    const txt = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
    const el = _el('type-timer');
    if (el) {
      el.textContent = txt;
      el.classList.toggle('urgent', _secsLeft < 60 && _timerStarted);
    }
  }

  /* ── Live stats update ── */
  function _updateStats() {
    const elapsed = (_totalSecs - _secsLeft) || 1;
    const mins = elapsed / 60;
    const wpm = _timerStarted ? Math.round(_typedCorrect / 5 / Math.max(mins, 0.1)) : 0;
    const acc = _keystrokes > 0 ? Math.round(((_keystrokes - _errors) / _keystrokes) * 100) : 100;

    _setTxt('tls-wpm', wpm);
    _setTxt('tls-acc', acc + '%');
    _setTxt('tls-err', _errors);
    _setTxt('tls-keys', _keystrokes);
  }

  /* ── Finish test ── */
  function _finishTest(completed) {
    if (_finished) return;
    _finished = true;
    clearInterval(_timerInterval);

    const inp = _el('typing-inp');
    if (inp) { inp.disabled = true; }

    const elapsed = _totalSecs - _secsLeft;
    const mins    = Math.max(elapsed / 60, 0.1);
    const netWpm  = Math.round(_typedCorrect / 5 / mins);
    const acc     = _keystrokes > 0 ? Math.round(((_keystrokes - _errors) / _keystrokes) * 100) : 100;
    const minWpm  = _currentExam?.minWpm || 30;
    const minAcc  = _currentExam?.minAcc || 90;
    const passed  = netWpm >= minWpm && acc >= minAcc;

    // Show result screen
    _showResult({ netWpm, acc, errors: _errors, keystrokes: _keystrokes, elapsed, passed });

    // Save to backend
    if (window.token && _currentPassage) {
      apiFetch('/api/typing/save', {
        method: 'POST',
        body: JSON.stringify({
          examId:     _currentPassage.examId || _currentPassage.id,
          examName:   _currentExam?.name || 'Practice',
          language:   _currentPassage.language || 'english',
          wpm:        netWpm,
          netWpm,
          accuracy:   acc,
          errors:     _errors,
          keystrokes: _keystrokes,
          timeTaken:  elapsed,
          passed
        })
      }).then(() => {
        _setTxt('typing-save-msg', '✅ Result saved!');
      }).catch(e => {
        _setTxt('typing-save-msg', 'Save failed: ' + e.message);
      });
    }
  }

  function _showResult({ netWpm, acc, errors, keystrokes, elapsed, passed }) {
    // Fill result elements
    _setTxt('tr-wpm',  netWpm);
    _setTxt('tr-acc',  acc + '%');
    _setTxt('tr-err',  errors);
    _setTxt('tr-keys', keystrokes);
    _setTxt('typing-save-msg', window.token ? 'Saving…' : 'Login करें to save results');

    // Verdict badge
    const badge = _el('tr-verdict-t');
    const badgeWrap = _el('tr-verdict-badge');
    if (badge) badge.textContent = passed ? '✅ PASS' : '❌ FAIL';
    if (badgeWrap) {
      badgeWrap.className = 'tr-verdict ' + (passed ? 'pass' : 'fail');
    }

    // Emoji + title
    _setTxt('tr-emoji', passed ? '🏆' : netWpm >= (_currentExam?.minWpm || 30) * 0.8 ? '💪' : '😔');
    _setTxt('tr-title', passed ? 'Excellent!' : 'Keep Practicing!');

    // Verdict detail
    const vd = _el('tr-verdict-d');
    if (vd) {
      vd.textContent = passed
        ? `${_currentExam?.name || 'Exam'} qualify! 🎉`
        : `Need: ${_currentExam?.minWpm||30} WPM, ${_currentExam?.minAcc||90}% Accuracy`;
    }

    // Open result screen
    openSubScreen('screen-typing-result');
  }

  /* ── Submit Early (Submit button click) ── */
  function submitEarly() {
    if (!_timerStarted) {
      showToast('पहले type करना शुरू करें!', 'warn');
      return;
    }
    if (_finished) return;
    _finishTest(false);
  }

  /* ── Exit typing ── */
  function exitTyping() {
    _finished = true;
    clearInterval(_timerInterval);
    _timerStarted = false;
    const inp = _el('typing-inp');
    if (inp) { inp.value = ''; inp.disabled = false; }
    closeSubScreen('screen-typing-active');
  }

  /* ── Retry same passage ── */
  function retryTest() {
    if (_currentPassage) {
      closeSubScreen('screen-typing-result');
      setTimeout(() => _initTest(_currentPassage), 200);
    }
  }

  /* ── Helpers ── */
  function _esc(s) {
    return String(s)
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;');
  }

  /* ══════════════════════════════════
     INIT
  ══════════════════════════════════ */
  function init() {
    // Bind typing input
    const inp = _el('typing-inp');
    if (inp) {
      inp.addEventListener('input', _onInput);
      // Prevent paste
      inp.addEventListener('paste', e => e.preventDefault());
      // Prevent right-click
      inp.addEventListener('contextmenu', e => e.preventDefault());
    }

    // Retry button
    _el('btn-retry-typing')?.addEventListener('click', retryTest);

    // Submit button
    _el('btn-typing-submit-main')?.addEventListener('click', submitEarly);
  }

  /* ── Expose ── */
  window.exitTyping = exitTyping;

  return {
    init,
    loadExams,
    openExamDetail,
    startTest,
    startFromPassage,
    _startWithText,
    submitEarly,
    exitTyping,
    retryTest,
  };
})();
