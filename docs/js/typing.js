/* ═══════════════════════════════════════════
   VidyaSagar v3 — typing.js
   AR Typing Platform style engine
═══════════════════════════════════════════ */
const TypingModule = (() => {

  /* ── Exam Data ── */
  const EXAMS = [
    // Central Govt
    { id:'ssc-chsl',    name:'SSC CHSL',           cat:'central', icon:'🏛️', color:'#3b82f6', speed:35, acc:90, time:600,  langs:['english','hindi'] },
    { id:'ssc-cgl',     name:'SSC CGL',             cat:'central', icon:'🏛️', color:'#3b82f6', speed:35, acc:90, time:600,  langs:['english','hindi'] },
    { id:'ssc-steno',   name:'SSC Stenographer',    cat:'central', icon:'✍️', color:'#6366f1', speed:80, acc:95, time:600,  langs:['english','hindi'] },
    { id:'rrb-ntpc',    name:'RRB NTPC',            cat:'central', icon:'🚂', color:'#f97316', speed:30, acc:85, time:600,  langs:['english','hindi'] },
    { id:'cpct',        name:'MP CPCT',             cat:'central', icon:'💻', color:'#8b5cf6', speed:30, acc:85, time:900,  langs:['english','hindi'] },
    { id:'ssc-sel',     name:'SSC Selection Posts', cat:'central', icon:'📋', color:'#3b82f6', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'epfo-ssa',    name:'EPFO SSA',            cat:'central', icon:'💼', color:'#0891b2', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'esic-udc',    name:'ESIC UDC',            cat:'central', icon:'🏥', color:'#10b981', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'isro',        name:'ISRO Assistant/UDC',  cat:'central', icon:'🚀', color:'#f59e0b', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'fci',         name:'FCI Typist',          cat:'central', icon:'🌾', color:'#84cc16', speed:35, acc:85, time:600,  langs:['english','hindi'] },
    { id:'kvs',         name:'KVS LDC/JSA',         cat:'central', icon:'📚', color:'#ec4899', speed:25, acc:85, time:600,  langs:['english','hindi'] },
    { id:'nvs',         name:'NVS LDC/JSA',         cat:'central', icon:'📚', color:'#ec4899', speed:25, acc:85, time:600,  langs:['english','hindi'] },
    { id:'ibps-rrb',    name:'IBPS RRB Office Asst',cat:'central', icon:'🏦', color:'#2563eb', speed:30, acc:85, time:600,  langs:['english'] },
    { id:'drdo',        name:'DRDO CEPTAM',          cat:'central', icon:'🔬', color:'#7c3aed', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'nta',         name:'NTA Recruitment',     cat:'central', icon:'🎓', color:'#0ea5e9', speed:30, acc:85, time:600,  langs:['english'] },
    // Defence & Police
    { id:'cisf-hc',     name:'CISF Head Constable', cat:'defence', icon:'🛡️', color:'#dc2626', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'crpf-hc',     name:'CRPF Head Constable', cat:'defence', icon:'🛡️', color:'#dc2626', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'bsf-hc',      name:'BSF Head Constable',  cat:'defence', icon:'🛡️', color:'#dc2626', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'itbp-hc',     name:'ITBP Head Constable', cat:'defence', icon:'🏔️', color:'#0891b2', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'ssb-hc',      name:'SSB Head Constable',  cat:'defence', icon:'🛡️', color:'#dc2626', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'army-clerk',  name:'Army Clerk SD/SKT',   cat:'defence', icon:'⭐', color:'#16a34a', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'delhi-police',name:'Delhi Police HC',     cat:'defence', icon:'👮', color:'#1d4ed8', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'up-police-asi',name:'UP Police ASI Clerk',cat:'defence', icon:'👮', color:'#1d4ed8', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'ib-sa',       name:'IB SA/Executive',     cat:'defence', icon:'🔍', color:'#374151', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'coast-guard', name:'Coast Guard SA',      cat:'defence', icon:'⚓', color:'#0891b2', speed:25, acc:80, time:600,  langs:['english'] },
    // Courts
    { id:'sc-jca',      name:'Supreme Court JCA',   cat:'court',   icon:'⚖️', color:'#92400e', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'allahabad-hc',name:'Allahabad HC RO/ARO', cat:'court',   icon:'⚖️', color:'#92400e', speed:30, acc:88, time:600,  langs:['hindi'] },
    { id:'delhi-hc',    name:'Delhi HC Clerical',   cat:'court',   icon:'⚖️', color:'#92400e', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'patna-hc',    name:'Patna HC Assistant',  cat:'court',   icon:'⚖️', color:'#92400e', speed:30, acc:88, time:600,  langs:['hindi'] },
    { id:'mp-hc',       name:'MP High Court Asst',  cat:'court',   icon:'⚖️', color:'#92400e', speed:30, acc:88, time:600,  langs:['hindi'] },
    { id:'raj-hc',      name:'Rajasthan HC Clerk',  cat:'court',   icon:'⚖️', color:'#92400e', speed:30, acc:88, time:600,  langs:['hindi','english'] },
    { id:'calc-hc',     name:'Calcutta HC PA/Typist',cat:'court',  icon:'⚖️', color:'#92400e', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'bombay-hc',   name:'Bombay HC Clerk',     cat:'court',   icon:'⚖️', color:'#92400e', speed:35, acc:90, time:600,  langs:['english'] },
    // State Level
    { id:'upsssc-jr',   name:'UPSSSC Junior Asst',  cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'rsmssb-ldc',  name:'RSMSSB LDC',          cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'bssc',        name:'BSSC Inter Level',    cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'hssc-clerk',  name:'HSSC Clerk',          cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'dsssb',       name:'DSSSB LDC',           cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'uksssc',      name:'UKSSSC Junior Asst',  cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['hindi'] },
    { id:'psssb-clerk', name:'PSSSB Clerk (Punjab)', cat:'state',  icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['english','hindi'] },
    { id:'osssc',       name:'OSSSC Junior Asst',   cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['english'] },
    { id:'raj-ia',      name:'Rajasthan Informatics',cat:'state',  icon:'💻', color:'#0891b2', speed:30, acc:85, time:600,  langs:['english','hindi'] },
    { id:'jkssb',       name:'JKSSB Junior Asst',   cat:'state',   icon:'🗺️', color:'#059669', speed:25, acc:80, time:600,  langs:['english'] },
    { id:'vidhan-sabha',name:'Vidhan Sabha/Parishad',cat:'state',  icon:'🏛️', color:'#7c3aed', speed:30, acc:88, time:600,  langs:['hindi'] },
    // PSU & Autonomous
    { id:'aai',         name:'AAI Junior Assistant',cat:'psu',     icon:'✈️', color:'#0284c7', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'barc',        name:'BARC UDC',            cat:'psu',     icon:'☢️', color:'#7c3aed', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'aiims',       name:'AIIMS Office Asst',   cat:'psu',     icon:'🏥', color:'#dc2626', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'iit-jrf',     name:'IIT/NIT Junior Asst', cat:'psu',     icon:'🔬', color:'#f59e0b', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'dda',         name:'DDA Junior Sec Asst', cat:'psu',     icon:'🏙️', color:'#0891b2', speed:30, acc:85, time:600,  langs:['english'] },
    { id:'icar',        name:'ICAR IARI Assistant', cat:'psu',     icon:'🌱', color:'#16a34a', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'ignou-jat',   name:'IGNOU JAT',           cat:'psu',     icon:'🎓', color:'#7c3aed', speed:30, acc:88, time:600,  langs:['english','hindi'] },
    { id:'cabinet-sec', name:'Cabinet Secretariat LDC',cat:'psu',  icon:'🏛️', color:'#374151', speed:35, acc:90, time:600,  langs:['english'] },
    { id:'nhai',        name:'NHAI Asst Manager',   cat:'psu',     icon:'🛣️', color:'#f97316', speed:35, acc:90, time:600,  langs:['english'] },
  ];

  /* ── State ── */
  let currentExam = null, currentLang = 'english', currentPassage = null;
  let passageChars = [], currentCharIdx = 0, correctChars = 0, wrongChars = 0;
  let keystrokes = 0, timerInterval = null, totalSeconds = 0, elapsedSeconds = 0;
  let timerStarted = false, typingFinished = false;
  let supabase = null;

  /* ── Init Supabase ── */
  function init() {
    try {
      if (typeof window.supabase !== 'undefined' && VS_CONFIG.SUPABASE_URL !== 'https://YOUR_PROJECT.supabase.co') {
        supabase = window.supabase.createClient(VS_CONFIG.SUPABASE_URL, VS_CONFIG.SUPABASE_KEY);
      }
    } catch(e) { console.warn('Supabase not initialized:', e.message); }
    // Bind category tabs
    document.querySelectorAll('.exam-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.exam-cat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderExamGrid(btn.dataset.cat);
      });
    });
    // Bind language buttons (delegated)
    document.getElementById('ed-langs')?.addEventListener('click', e => {
      const btn = e.target.closest('.lang-btn'); if (!btn) return;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentLang = btn.dataset.lang;
      loadPassages(currentExam);
    });
    // Bind typing input
    const inp = document.getElementById('typing-inp');
    if (inp) {
      inp.addEventListener('input', handleTypingInput);
      inp.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault(); });
      inp.addEventListener('paste', e => e.preventDefault());
    }
    // Bind retry button
    document.getElementById('btn-retry-typing')?.addEventListener('click', () => {
      closeSubScreen('screen-typing-result');
      if (currentPassage) startTyping(currentPassage);
    });
  }

  /* ── Load Exams ── */
  function loadExams() { renderExamGrid('all'); }

  function renderExamGrid(cat) {
    const grid = document.getElementById('exam-grid');
    if (!grid) return;
    const list = cat === 'all' ? EXAMS : EXAMS.filter(e => e.cat === cat);
    if (!list.length) { grid.innerHTML = '<div class="vs-empty">No exams found</div>'; return; }
    grid.innerHTML = '';
    list.forEach(exam => {
      const card = document.createElement('div');
      card.className = 'exam-card';
      card.style.setProperty('--c', exam.color);
      const langs = exam.langs.map(l => l === 'english' ? '🔤 EN' : '📖 HI').join(' · ');
      card.innerHTML = `
        <div class="exam-icon" style="--c:${exam.color}">${exam.icon}</div>
        <div class="exam-info">
          <div class="exam-name">${exam.name}</div>
          <div class="exam-meta">
            <span class="exam-tag">⚡ ${exam.speed} WPM</span>
            <span class="exam-tag">🎯 ${exam.acc}%</span>
            <span class="exam-tag">⏱ ${exam.time/60} min</span>
            <span class="exam-tag">${langs}</span>
          </div>
        </div>
        <span class="exam-arrow">›</span>`;
      card.addEventListener('click', () => openExamDetail(exam));
      grid.appendChild(card);
    });
  }

  /* ── Exam Detail ── */
  function openExamDetail(exam) {
    currentExam = exam;
    currentLang = exam.langs[0] || 'english';
    document.getElementById('exam-detail-title').textContent = exam.name;
    document.getElementById('ed-name').textContent = exam.name;
    document.getElementById('ed-speed').textContent = exam.speed;
    document.getElementById('ed-acc').textContent = exam.acc + '%';
    document.getElementById('ed-time').textContent = (exam.time / 60) + ' min';
    document.getElementById('ed-lang-tag').textContent = exam.langs.map(l => l === 'english' ? 'EN' : 'HI').join('+');
    // Language buttons
    const langsEl = document.getElementById('ed-langs');
    langsEl.innerHTML = '';
    exam.langs.forEach((lang, i) => {
      const btn = document.createElement('button');
      btn.className = `lang-btn${i === 0 ? ' active' : ''}`;
      btn.dataset.lang = lang;
      btn.textContent = lang === 'english' ? '🔤 English' : '📖 Hindi';
      langsEl.appendChild(btn);
    });
    openSubScreen('screen-exam-detail');
    loadPassages(exam);
  }

  /* ── Load Passages from Supabase ── */
  async function loadPassages(exam) {
    const list = document.getElementById('passages-list');
    const countPill = document.getElementById('passage-count-pill');
    list.innerHTML = '<div class="vs-loading-text">Loading passages…</div>';
    try {
      let passages = [];
      if (supabase) {
        const { data, error } = await supabase
          .from('typing_passages')
          .select('id,title,content,word_count,difficulty')
          .eq('exam_id', exam.id)
          .eq('language', currentLang)
          .eq('is_active', true)
          .order('created_at');
        if (!error && data?.length) passages = data;
      }
      // Fallback: demo passages if Supabase not set up
      if (!passages.length) passages = getDemoPassages(exam, currentLang);
      if (countPill) countPill.textContent = `${passages.length} passages`;
      list.innerHTML = '';
      passages.forEach((p, i) => {
        const words = p.word_count || p.content.split(' ').length;
        const diff = p.difficulty || (words < 80 ? 'Easy' : words < 120 ? 'Medium' : 'Hard');
        const diffColor = diff.toLowerCase() === 'easy' ? '#10b981' : diff.toLowerCase() === 'medium' ? '#f59e0b' : '#f43f5e';
        const card = document.createElement('div');
        card.className = 'passage-card';
        card.innerHTML = `
          <div class="pc-title">${p.title || `Passage ${i + 1}`}</div>
          <div class="pc-meta">
            <span class="pc-tag">📝 ${words} words</span>
            <span class="pc-tag" style="color:${diffColor}">${diff}</span>
            <span class="pc-tag">⏱ ~${Math.ceil(words / exam.speed)} min</span>
          </div>`;
        card.addEventListener('click', () => startTyping(p));
        list.appendChild(card);
      });
      if (!passages.length) list.innerHTML = '<div class="vs-empty"><span class="ve-icon">📄</span>No passages found. Add passages in Supabase.</div>';
    } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  /* ── Demo Passages (shown when Supabase not configured) ── */
  function getDemoPassages(exam, lang) {
    if (lang === 'hindi') {
      return [
        { id:'demo-h1', title:'भारत का संविधान', difficulty:'Medium', content:'भारत का संविधान विश्व का सबसे लंबा लिखित संविधान है। इसे 26 जनवरी 1950 को लागू किया गया था। डॉ. भीमराव अंबेडकर इसके प्रमुख निर्माता थे। संविधान में मौलिक अधिकार, नीति निदेशक तत्व और मौलिक कर्तव्य शामिल हैं। यह भारत को एक संप्रभु, समाजवादी, धर्मनिरपेक्ष और लोकतांत्रिक गणराज्य घोषित करता है।', word_count:72 },
        { id:'demo-h2', title:'कंप्यूटर का महत्व', difficulty:'Easy', content:'आधुनिक युग में कंप्यूटर का बहुत अधिक महत्व है। यह हमारे दैनिक जीवन का अभिन्न अंग बन गया है। शिक्षा, चिकित्सा, व्यापार और संचार के क्षेत्र में कंप्यूटर ने क्रांति ला दी है। कंप्यूटर के माध्यम से हम इंटरनेट का उपयोग करके विश्व से जुड़ सकते हैं और किसी भी जानकारी को तुरंत प्राप्त कर सकते हैं।', word_count:68 },
        { id:'demo-h3', title:'स्वस्थ जीवन शैली', difficulty:'Hard', content:'स्वस्थ जीवन जीने के लिए नियमित व्यायाम, संतुलित आहार और पर्याप्त नींद आवश्यक है। प्रतिदिन प्रातःकाल टहलने से शरीर और मन दोनों स्वस्थ रहते हैं। हरी सब्जियां, फल और पर्याप्त मात्रा में पानी पीना हमारे स्वास्थ्य के लिए लाभदायक है। धूम्रपान और मद्यपान से बचना चाहिए। तनाव मुक्त जीवन के लिए ध्यान और योग का अभ्यास करना चाहिए।', word_count:80 },
      ];
    }
    return [
      { id:'demo-e1', title:'Introduction to Computers', difficulty:'Easy', content:'A computer is an electronic device that processes data according to a set of instructions called a program. Computers can perform arithmetic and logical operations at very high speeds. They are used in various fields such as science, medicine, education, and business. The basic components of a computer include the central processing unit, memory, and input and output devices.', word_count:62 },
      { id:'demo-e2', title:'Indian Democracy', difficulty:'Medium', content:'India is the largest democracy in the world. The Constitution of India was adopted on 26th November 1949 and came into effect on 26th January 1950. The Constitution provides for a parliamentary form of government. The President is the constitutional head of the country, while the Prime Minister is the head of the government. The Parliament consists of two houses — Lok Sabha and Rajya Sabha.', word_count:66 },
      { id:'demo-e3', title:'Digital India', difficulty:'Hard', content:'The Digital India programme is a flagship initiative of the Government of India with a vision to transform India into a digitally empowered society and knowledge economy. It was launched in 2015 with the aim of bridging the digital divide and ensuring that government services are made available to citizens electronically by improving online infrastructure, increasing Internet connectivity, and making the country technologically advanced.', word_count:64 },
    ];
  }

  /* ── Start Typing ── */
  function startTyping(passage) {
    currentPassage = passage;
    openSubScreen('screen-typing-active');
    document.getElementById('type-exam-title').textContent = `${currentExam.icon} ${currentExam.name}`;
    totalSeconds = currentExam.time;
    elapsedSeconds = 0; correctChars = 0; wrongChars = 0; keystrokes = 0;
    currentCharIdx = 0; timerStarted = false; typingFinished = false;
    // Render passage
    passageChars = passage.content.split('');
    const display = document.getElementById('passage-display');
    display.innerHTML = '';
    passageChars.forEach((ch, i) => {
      const span = document.createElement('span');
      span.className = 'pc' + (i === 0 ? ' current' : ' pending');
      span.dataset.i = i;
      span.textContent = ch;
      display.appendChild(span);
    });
    // Reset UI
    updateTypingStats();
    document.getElementById('type-timer').textContent = formatTime(totalSeconds);
    document.getElementById('type-timer').className = 'type-timer';
    document.getElementById('type-prog-fill').style.width = '0%';
    const inp = document.getElementById('typing-inp');
    inp.value = ''; inp.disabled = false; inp.focus();
    document.getElementById('typing-inp-hint').textContent = 'Type करते रहें — Timer तब शुरू होगा';
  }

  /* ── Handle Typing Input ── */
  function handleTypingInput(e) {
    if (typingFinished) return;
    const inp = document.getElementById('typing-inp');
    const val = inp.value;
    // Start timer on first keystroke
    if (!timerStarted) { timerStarted = true; startTimer(); }
    // Compare each char typed against passage
    const newCharCount = val.length;
    if (newCharCount > currentCharIdx) {
      // Forward — user typed new char(s)
      for (let i = currentCharIdx; i < Math.min(newCharCount, passageChars.length); i++) {
        const typed = val[i];
        const expected = passageChars[i];
        const span = document.querySelector(`.pc[data-i="${i}"]`);
        if (!span) continue;
        keystrokes++;
        if (typed === expected) {
          span.className = 'pc correct'; correctChars++;
        } else {
          span.className = 'pc wrong'; wrongChars++;
        }
        // Set current cursor
        const next = document.querySelector(`.pc[data-i="${i + 1}"]`);
        if (next) next.className = 'pc current';
      }
      currentCharIdx = newCharCount;
    } else if (newCharCount < currentCharIdx) {
      // Backspace
      for (let i = newCharCount; i < currentCharIdx; i++) {
        const span = document.querySelector(`.pc[data-i="${i}"]`);
        if (!span) continue;
        const wasWrong = span.classList.contains('wrong');
        if (wasWrong) wrongChars = Math.max(0, wrongChars - 1);
        else if (span.classList.contains('correct')) correctChars = Math.max(0, correctChars - 1);
        span.className = 'pc pending';
      }
      // Set cursor at new position
      const curSpan = document.querySelector(`.pc[data-i="${newCharCount}"]`);
      if (curSpan) curSpan.className = 'pc current';
      currentCharIdx = newCharCount;
    }
    updateTypingStats();
    // Check completion
    if (currentCharIdx >= passageChars.length) { finishTyping(false); }
  }

  /* ── Timer ── */
  function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      elapsedSeconds++;
      const remaining = totalSeconds - elapsedSeconds;
      document.getElementById('type-timer').textContent = formatTime(Math.max(0, remaining));
      if (remaining <= 30) document.getElementById('type-timer').className = 'type-timer warning';
      if (remaining <= 0) finishTyping(true);
      updateTypingStats();
    }, 1000);
  }

  function formatTime(secs) {
    const m = String(Math.floor(secs / 60)).padStart(2, '0');
    const s = String(secs % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ── Update live stats ── */
  function updateTypingStats() {
    const elMin = elapsedSeconds > 0 ? elapsedSeconds / 60 : 1/60;
    const gross = Math.round((correctChars / 5) / elMin);
    const net   = Math.max(0, Math.round(gross - (wrongChars / elMin)));
    const total = correctChars + wrongChars;
    const acc   = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    document.getElementById('tls-wpm').textContent  = elapsedSeconds > 0 ? net : 0;
    document.getElementById('tls-acc').textContent  = acc + '%';
    document.getElementById('tls-err').textContent  = wrongChars;
    document.getElementById('tls-keys').textContent = keystrokes;
    // Progress bar
    const pct = passageChars.length > 0 ? Math.round((currentCharIdx / passageChars.length) * 100) : 0;
    document.getElementById('type-prog-fill').style.width = pct + '%';
  }

  /* ── Finish Typing ── */
  function finishTyping(timedOut) {
    if (typingFinished) return;
    typingFinished = true;
    clearInterval(timerInterval);
    const inp = document.getElementById('typing-inp');
    if (inp) inp.disabled = true;
    // Final stats
    const elMin = Math.max(elapsedSeconds, 1) / 60;
    const gross = Math.round((correctChars / 5) / elMin);
    const netWPM = Math.max(0, Math.round(gross - (wrongChars / elMin)));
    const total  = correctChars + wrongChars;
    const acc    = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    setTimeout(() => showTypingResult(netWPM, acc, wrongChars, keystrokes, timedOut), 600);
  }

  /* ── Typing Result ── */
  function showTypingResult(wpm, acc, errors, keys, timedOut) {
    openSubScreen('screen-typing-result');
    document.getElementById('tr-wpm').textContent  = wpm;
    document.getElementById('tr-acc').textContent  = acc + '%';
    document.getElementById('tr-err').textContent  = errors;
    document.getElementById('tr-keys').textContent = keys;
    const passed = wpm >= currentExam.speed && acc >= currentExam.acc;
    const verdictEl = document.getElementById('tr-verdict');
    verdictEl.className = `tr-verdict ${passed ? 'tr-pass' : 'tr-fail'}`;
    document.getElementById('tr-verdict-t').textContent = passed ? '✅ PASS!' : '❌ FAIL';
    document.getElementById('tr-verdict-d').textContent = passed
      ? `बहुत बढ़िया! आपकी speed ${wpm} WPM और accuracy ${acc}% है जो ${currentExam.name} के लिए required है।`
      : `Required: ${currentExam.speed} WPM & ${currentExam.acc}% accuracy. आपकी speed ${wpm} WPM और accuracy ${acc}% है। और practice करें!`;
    const emojis = wpm >= currentExam.speed * 1.5 ? '🏆' : passed ? '🎉' : wpm >= currentExam.speed * 0.8 ? '💪' : '📖';
    document.getElementById('tr-emoji').textContent = emojis;
    document.getElementById('tr-title').textContent = passed ? 'Excellent Result!' : timedOut ? 'Time\'s Up!' : 'Keep Practicing!';
    // Save to backend
    const msgEl = document.getElementById('typing-save-msg');
    if (token) {
      apiFetch('/api/typing/save', { method:'POST', body: JSON.stringify({
        examId: currentExam.id, examName: currentExam.name, language: currentLang,
        wpm, netWpm: wpm, accuracy: acc, errors, keystrokes: keys, timeTaken: elapsedSeconds, passed
      })}).then(() => { if (msgEl) msgEl.textContent = '✅ Result saved!'; })
        .catch(() => { if (msgEl) msgEl.textContent = '⚠️ Could not save'; });
    } else { if (msgEl) msgEl.textContent = '💡 Sign in to save results'; }
  }

  /* ── Exit ── */
  function exitTyping() {
    clearInterval(timerInterval);
    typingFinished = true;
    const inp = document.getElementById('typing-inp');
    if (inp) { inp.value = ''; inp.disabled = false; }
    closeSubScreen('screen-typing-active');
  }

  // expose
  window.exitTyping = exitTyping;
  return { init, loadExams };
})();
