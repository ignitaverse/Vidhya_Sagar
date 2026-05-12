/* ═══════════════════════════════════════════════════════
   VidyaSagar — app.js (Premium Edition v2)
   Backend: https://vidhya-sagar.onrender.com
═══════════════════════════════════════════════════════ */
const API = 'https://vidhya-sagar.onrender.com';

let currentSubject  = null;
let currentCategory = null;
let currentState    = null;
let questions = [], currentQ = 0, score = 0, wrongCount = 0;
let answered = false, timerInterval = null, elapsedSeconds = 0;
let nestedStructure = null, nestedStack = [];
let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');

// ── Pause / Previous question ──
let isPaused       = false;
let timerStarted   = false;
let prevQuestions  = [];   // history of {q, userIdx, correctIdx, qNum}
let isReviewing    = false;

// ── Chat polling ──
let chatPollInterval = null;
let lastChatMsgId    = null;

/* ─── HELPERS ─────────────────────────────────────────── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(`screen-${name}`);
  if (s) s.classList.add('active');
  window.scrollTo(0, 0);
  // Stop chat polling when leaving chat screen
  if (name !== 'chat' && chatPollInterval) {
    clearInterval(chatPollInterval);
    chatPollInterval = null;
  }
}
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg; t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3200);
}
async function apiFetch(path, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...opts, headers: h });
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Server error');
  return d;
}

/* ─── LOADING ─────────────────────────────────────────── */
function hideLoader() {
  document.getElementById('screen-loading').classList.add('out');
  const app = document.getElementById('app');
  app.classList.remove('app-hidden');
  app.classList.add('app-visible');
}

/* ══════════════════════════════════════════════════════
   POST-SIGNUP CELEBRATION
══════════════════════════════════════════════════════ */
function showCelebration(name) {
  const ov = document.getElementById('celebrate-overlay');
  ov.classList.remove('hidden');
  const fp = document.getElementById('float-particles');
  fp.innerHTML = '';
  const colors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#22d3ee', '#fff'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div');
    p.className = 'fp';
    const size = Math.random() * 10 + 4;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random() * 100}%;background:${colors[Math.floor(Math.random() * colors.length)]};animation-duration:${Math.random() * 3 + 2}s;animation-delay:${Math.random() * 2}s;`;
    fp.appendChild(p);
  }
  setTimeout(() => {
    ov.classList.add('cel-out');
    setTimeout(() => ov.classList.add('hidden'), 600);
  }, 3500);
}

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function updateAuthUI() {
  const btnAuth = document.getElementById('btn-auth');
  const btnOut  = document.getElementById('btn-logout');
  const chip    = document.getElementById('user-chip');
  const btnProfile = document.getElementById('btn-profile');
  const btnChat    = document.getElementById('btn-chat');

  if (token && userData) {
    btnAuth.classList.add('hidden');
    btnOut.classList.remove('hidden');
    chip.classList.remove('hidden');
    document.getElementById('user-name-display').textContent = userData.name?.split(' ')[0] || 'User';
    document.getElementById('user-avatar').textContent = userData.avatar || (userData.name?.[0] || 'U').toUpperCase();
    btnProfile?.classList.add('vis');
    btnChat?.classList.add('vis');
    // Update feedback form visibility
    updateFeedbackFormUI();
  } else {
    btnAuth.classList.remove('hidden');
    btnOut.classList.add('hidden');
    chip.classList.add('hidden');
    btnProfile?.classList.remove('vis');
    btnChat?.classList.remove('vis');
    updateFeedbackFormUI();
  }
}

function updateFeedbackFormUI() {
  const gate    = document.getElementById('fb-login-gate');
  const formArea= document.getElementById('fb-form-area');
  const greeting= document.getElementById('fb-greeting');
  if (!gate || !formArea) return;
  if (token && userData) {
    gate.style.display    = 'none';
    formArea.style.display = 'block';
    if (greeting) greeting.textContent = `${userData.name}, आपका feedback काम आता है!`;
  } else {
    gate.style.display    = 'block';
    formArea.style.display = 'none';
  }
}

async function doLogin(email, password) {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showToast(`Welcome back, ${userData.name}! 👋`, 'success');
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  } finally {
    btn.textContent = 'Log In'; btn.disabled = false;
  }
}

async function doSignup(name, email, password) {
  const btn = document.getElementById('signup-btn');
  const err = document.getElementById('signup-error');
  btn.textContent = 'Creating…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showCelebration(name);
    showToast(`Welcome, ${name}! 🚀`, 'success');
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  } finally {
    btn.textContent = '🚀 Create My Account'; btn.disabled = false;
  }
}

function doLogout() {
  token = null; userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

/* ─── MODAL ── */
function openModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchTab(tab);
}
function closeModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  resetSignupScene();
}
function switchTab(tab) {
  document.getElementById('login-panel').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-panel').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
  if (tab === 'signup') initSignupScene();
}

/* ── Signup scene ── */
let sceneInitialized = false;
function initSignupScene() {
  if (sceneInitialized) return;
  sceneInitialized = true;
  const scene = document.getElementById('signup-scene');
  const form  = document.getElementById('signup-form');
  scene.style.display = 'block';
  form.className = 'aform signup-form-hidden';
}
function resetSignupScene() {
  sceneInitialized = false;
  const scene = document.getElementById('signup-scene');
  const form  = document.getElementById('signup-form');
  if (scene) scene.style.display = 'block';
  if (form) form.className = 'aform signup-form-hidden';
  const boxGroup = document.getElementById('box-group');
  if (boxGroup) boxGroup.classList.remove('box-lid-open');
}
function openBoxAnimation() {
  const btn = document.getElementById('open-box-btn');
  btn.disabled = true; btn.textContent = '📭 Opening…';
  const boxG = document.getElementById('box-group');
  boxG.style.animation = 'boxShake 0.4s ease';
  boxG.addEventListener('animationend', () => {
    boxG.style.animation = '';
    boxG.classList.add('box-lid-open');
    setTimeout(() => {
      const mouth = document.getElementById('boy-mouth');
      if (mouth) mouth.setAttribute('d', 'M81 43 Q88 50 95 43');
    }, 400);
    setTimeout(() => {
      const scene = document.getElementById('signup-scene');
      const form  = document.getElementById('signup-form');
      scene.style.transition = 'opacity .4s ease,transform .4s ease';
      scene.style.opacity    = '0';
      scene.style.transform  = 'scale(.95)';
      setTimeout(() => {
        scene.style.display = 'none';
        form.className = 'aform signup-form-visible';
        setTimeout(() => document.getElementById('signup-name')?.focus(), 100);
      }, 400);
    }, 900);
  }, { once: true });
}

const _ks = document.createElement('style');
_ks.textContent = `@keyframes boxShake{0%,100%{transform:translateX(0) rotate(0)}20%{transform:translateX(-4px) rotate(-2deg)}40%{transform:translateX(4px) rotate(2deg)}60%{transform:translateX(-3px) rotate(-1deg)}80%{transform:translateX(3px) rotate(1deg)}}`;
document.head.appendChild(_ks);

/* ══════════════════════════════════════════════════════
   PROFILE MODAL
══════════════════════════════════════════════════════ */
let selectedAvatar = '🎓';

function openProfileModal() {
  if (!token || !userData) { openModal('login'); return; }
  const modal = document.getElementById('profile-modal');
  modal.classList.remove('hidden');

  // Fill in current values
  selectedAvatar = userData.avatar || '🎓';
  document.getElementById('profile-avatar-display').textContent = selectedAvatar;
  document.getElementById('profile-name').value  = userData.name || '';
  document.getElementById('profile-dob').value   = userData.dob  || '';
  document.getElementById('profile-exam').value  = userData.examPrep || '';

  const nameChanges = userData.nameChanges || 0;
  const remaining   = 2 - nameChanges;
  document.getElementById('name-changes-left').textContent =
    remaining > 0 ? `(अभी ${remaining} बार बदल सकते हैं)` : '(नाम अब नहीं बदला जा सकता)';
  document.getElementById('profile-name').disabled = remaining <= 0;

  // Stats tab
  document.getElementById('prof-quizzes').textContent = userData.totalQuizzes || 0;
  document.getElementById('prof-correct').textContent = userData.totalCorrect  || 0;
  document.getElementById('prof-wrong').textContent   = userData.totalWrong    || 0;
  const joined = userData.joinedAt ? new Date(userData.joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  document.getElementById('prof-joined').textContent = `सदस्य बने: ${joined}`;

  // Mark selected emoji
  document.querySelectorAll('.emoji-pick-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.emoji === selectedAvatar);
  });

  // Switch to info tab
  switchProfileTab('info');
}

function switchProfileTab(tab) {
  document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.ptab-panel').forEach(p => p.classList.toggle('active', p.id === `ptab-${tab}`));
}

async function saveProfile() {
  const btn = document.getElementById('profile-save-btn');
  const err = document.getElementById('profile-err');
  const ok  = document.getElementById('profile-ok');
  err.classList.add('hidden'); ok.classList.add('hidden');

  const name    = document.getElementById('profile-name').value.trim();
  const dob     = document.getElementById('profile-dob').value;
  const examPrep= document.getElementById('profile-exam').value.trim();

  btn.disabled = true; btn.textContent = 'Saving…';
  try {
    const d = await apiFetch('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ name: name || undefined, dob, examPrep, avatar: selectedAvatar })
    });
    userData = { ...userData, ...d.user };
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI();

    ok.textContent = '✅ Profile save हो गई!';
    ok.className   = 'fb-status ok'; ok.classList.remove('hidden');
    setTimeout(() => ok.classList.add('hidden'), 3000);

    const nameChanges = userData.nameChanges || 0;
    const remaining   = 2 - nameChanges;
    document.getElementById('name-changes-left').textContent =
      remaining > 0 ? `(अभी ${remaining} बार बदल सकते हैं)` : '(नाम अब नहीं बदला जा सकता)';
    document.getElementById('profile-name').disabled = remaining <= 0;
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = '💾 Save Profile';
  }
}

async function changePassword() {
  const btn     = document.getElementById('change-pw-btn');
  const err     = document.getElementById('pw-err');
  const ok      = document.getElementById('pw-ok');
  const oldPw   = document.getElementById('old-password').value;
  const newPw   = document.getElementById('new-password').value;
  const confPw  = document.getElementById('confirm-password').value;
  err.classList.add('hidden'); ok.classList.add('hidden');

  if (newPw !== confPw) {
    err.textContent = 'New passwords do not match'; err.classList.remove('hidden'); return;
  }
  btn.disabled = true; btn.textContent = 'Changing…';
  try {
    await apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }) });
    ok.textContent = '✅ Password बदल गया!';
    ok.className   = 'fb-status ok'; ok.classList.remove('hidden');
    document.getElementById('old-password').value     = '';
    document.getElementById('new-password').value     = '';
    document.getElementById('confirm-password').value = '';
  } catch (e) {
    err.textContent = e.message; err.classList.remove('hidden');
  } finally {
    btn.disabled = false; btn.textContent = '🔒 Change Password';
  }
}

async function deleteAccount() {
  if (!confirm('क्या आप सच में अपना account delete करना चाहते हैं?\n\nयह action वापस नहीं होगी — सारा data हमेशा के लिए हट जाएगा।')) return;
  try {
    await apiFetch('/api/auth/account', { method: 'DELETE' });
    token = null; userData = null;
    localStorage.removeItem('vs_token'); localStorage.removeItem('vs_user');
    document.getElementById('profile-modal').classList.add('hidden');
    updateAuthUI();
    showToast('Account delete हो गया', 'info');
    showScreen('home');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

/* ══════════════════════════════════════════════════════
   LOAD SUBJECTS
══════════════════════════════════════════════════════ */
async function loadSubjects() {
  try {
    const res  = await fetch('data/subjects.json');
    const json = await res.json();
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = '';
    json.subjects.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subj-card';
      btn.style.setProperty('--c', sub.color);
      btn.innerHTML = `<span class="subj-emoji">${sub.emoji}</span><span class="subj-name">${sub.name}</span><span class="subj-count">${sub.count} questions</span><span class="subj-arrow">Attempt →</span>`;
      btn.addEventListener('click', () => openCategoryScreen(sub));
      grid.appendChild(btn);
    });
    const sw = document.getElementById('states-scroll');
    sw.innerHTML = '';
    json.states.forEach(state => {
      const btn = document.createElement('button');
      btn.className = 'state-pill';
      btn.textContent = state;
      btn.addEventListener('click', () => startStateQuiz(state));
      sw.appendChild(btn);
    });
  } catch (e) { console.error('Subjects error:', e); }
}

/* ══════════════════════════════════════════════════════
   NESTED NAVIGATION (Computer)
══════════════════════════════════════════════════════ */
async function loadNestedStructure() {
  if (nestedStructure) return nestedStructure;
  const res = await fetch('data/computer_structure.json');
  nestedStructure = await res.json();
  return nestedStructure;
}
async function openNestedCategoryScreen(sub) {
  currentSubject = sub; currentCategory = null; currentState = null; nestedStack = [];
  showScreen('category');
  document.getElementById('cat-emoji').textContent       = sub.emoji;
  document.getElementById('cat-subject-name').textContent = sub.name;
  document.getElementById('cat-sub-hint').textContent    = 'Select a category to continue';
  document.getElementById('btn-all-cat').classList.add('hidden');
  document.getElementById('level-indicator').classList.remove('hidden');
  document.getElementById('cat-grid').innerHTML = '<p class="loading-text">Loading…</p>';
  try {
    const s = await loadNestedStructure();
    renderNestedLevel(s.categories, 'Select Category');
  } catch (e) {
    document.getElementById('cat-grid').innerHTML = `<p class="error-state">❌ ${e.message}</p>`;
  }
}
function renderNestedLevel(nodes, levelLabel) {
  updateBreadcrumb();
  document.getElementById('level-label').textContent = levelLabel;
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = ''; grid.className = 'cat-list nested-grid';
  nodes.forEach(node => {
    const isLeaf = node.books !== undefined;
    const card   = document.createElement('button');
    card.className = 'nested-card';
    card.style.setProperty('--nc', node.color || '#3b82f6');
    const count = isLeaf ? `${node.books.length} books` : `${countLeaves(node)} topics`;
    card.innerHTML = `<span class="nc-icon">${node.icon || '📂'}</span><div class="nc-info"><span class="nc-name">${node.name}</span><span class="nc-count">${count}</span></div><span class="nc-arrow">→</span>`;
    card.addEventListener('click', () => {
      nestedStack.push({ label: node.name, nodes });
      isLeaf ? renderBookLevel(node.books, node.name, node.icon, node.color)
             : renderNestedLevel(node.children, node.name);
    });
    grid.appendChild(card);
  });
}
function renderBookLevel(books, parentName, parentIcon, parentColor) {
  updateBreadcrumb();
  document.getElementById('level-label').textContent = parentName + ' — Select Book';
  const grid = document.getElementById('cat-grid');
  grid.innerHTML = ''; grid.className = 'cat-list book-grid';
  books.forEach((book, i) => {
    const card = document.createElement('button');
    card.className = 'book-card';
    card.style.setProperty('--bc', parentColor || '#3b82f6');
    card.innerHTML = `<span class="book-num">${String(i + 1).padStart(2, '0')}</span><div class="book-info"><span class="book-name">${book.name}</span><span class="book-cat">${book.dbCategory}</span></div><span class="book-start">Start →</span>`;
    card.addEventListener('click', () => { currentCategory = book.dbCategory; startQuiz(); });
    grid.appendChild(card);
  });
}
function countLeaves(n) { return n.books ? n.books.length : n.children ? n.children.reduce((s, c) => s + countLeaves(c), 0) : 0; }
function updateBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  if (!nestedStack.length) { bc.innerHTML = ''; return; }
  const crumbs = [{ label: currentSubject?.name || 'Computer', idx: -1 }];
  nestedStack.forEach((s, i) => crumbs.push({ label: s.label, idx: i }));
  bc.innerHTML = crumbs.map((c, i) =>
    i < crumbs.length - 1
      ? `<button class="crumb" data-idx="${c.idx}">${c.label}</button><span class="crumb-sep">›</span>`
      : `<span class="crumb active">${c.label}</span>`
  ).join('');
  bc.querySelectorAll('.crumb[data-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      if (idx === -1) { nestedStack = []; loadNestedStructure().then(s => renderNestedLevel(s.categories, 'Select Category')); }
      else { const t = nestedStack[idx]; nestedStack = nestedStack.slice(0, idx); renderNestedLevel(t.nodes, t.label); }
    });
  });
}

/* ══════════════════════════════════════════════════════
   CATEGORY SCREEN
══════════════════════════════════════════════════════ */
async function openCategoryScreen(sub) {
  if (sub.id === 'computer') return openNestedCategoryScreen(sub);
  currentSubject = sub; currentCategory = null; currentState = null; nestedStack = [];
  document.getElementById('cat-emoji').textContent       = sub.emoji;
  document.getElementById('cat-subject-name').textContent = sub.name;
  document.getElementById('cat-sub-hint').textContent    = 'Pick a category or take all questions';
  document.getElementById('breadcrumb').innerHTML = '';
  document.getElementById('level-indicator').classList.add('hidden');
  document.getElementById('btn-all-cat').classList.remove('hidden');
  const grid = document.getElementById('cat-grid');
  grid.className = 'cat-list';
  grid.innerHTML = '<p class="loading-text">Loading categories…</p>';
  showScreen('category');
  checkResumeCard();
  try {
    const d    = await apiFetch(`/quiz/${sub.id}/categories`);
    const cats = d.categories || [];
    grid.innerHTML = '';
    if (!cats.length) { grid.innerHTML = '<p class="empty-state">No categories found</p>'; return; }
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-item';
      btn.innerHTML = `<span>${cat}</span><span class="cat-arrow">→</span>`;
      btn.addEventListener('click', () => { currentCategory = cat; startQuiz(); });
      grid.appendChild(btn);
    });
  } catch (e) { grid.innerHTML = `<p class="error-state">❌ ${e.message}</p>`; }
}

/* ══════════════════════════════════════════════════════
   PROGRESS TRACKER
══════════════════════════════════════════════════════ */
function progKey() {
  const sub = currentState ? 'states' : (currentSubject?.id || 'unknown');
  const cat = currentState || currentCategory || 'all';
  return `vs_prog_${sub}_${cat}`;
}
function saveProgress() {
  const data = {
    seenIds:  quizState.seenIds,
    score:    quizState.score,
    wrong:    quizState.wrong,
    answered: quizState.answered,
    total:    quizState.total,
    elapsed:  elapsedSeconds
  };
  localStorage.setItem(progKey(), JSON.stringify(data));
}
function loadProgress() {
  try { const raw = localStorage.getItem(progKey()); return raw ? JSON.parse(raw) : null; }
  catch { return null; }
}
function clearProgress() { localStorage.removeItem(progKey()); }

/* ── Seen IDs (for full reset) ── */
function clearSeenIds() {
  quizState.seenIds  = [];
  quizState.score    = 0;
  quizState.wrong    = 0;
  quizState.answered = 0;
  quizState.total    = 0;
  clearProgress();
}

/* ── Quiz state ── */
let quizState = {
  seenIds:  [],
  score:    0,
  wrong:    0,
  answered: 0,
  total:    0,
  isLast:   false
};

/* ── Fetch one batch ── */
async function fetchBatch() {
  const excl = quizState.seenIds.length > 0 ? `&exclude=${quizState.seenIds.join(',')}` : '';
  if (currentState) {
    return await apiFetch(`/quiz/states?state=${encodeURIComponent(currentState)}${excl}`);
  }
  let url = `/quiz/${currentSubject.id}?a=1`;
  if (currentCategory) url += `&category=${encodeURIComponent(currentCategory)}`;
  url += excl;
  return await apiFetch(url);
}

/* ── START QUIZ ── */
async function startQuiz(resuming = false) {
  showScreen('quiz');
  questions   = [];
  currentQ    = 0;
  elapsedSeconds = 0;
  timerStarted   = false;  // ← timer will start only when first question renders
  isPaused       = false;
  prevQuestions  = [];
  isReviewing    = false;

  if (!resuming) {
    quizState = { seenIds: [], score: 0, wrong: 0, answered: 0, total: 0, isLast: false };
  }

  // Reset pause button
  const pauseBtn = document.getElementById('btn-pause');
  if (pauseBtn) { pauseBtn.textContent = '⏸ Pause'; pauseBtn.classList.remove('paused'); }

  document.getElementById('quiz-subject-badge').textContent =
    currentState || `${currentSubject?.emoji || ''} ${currentSubject?.name || 'Quiz'}`;
  document.getElementById('score-correct').textContent = quizState.score;
  document.getElementById('score-wrong').textContent   = quizState.wrong;
  document.getElementById('score-left').textContent    = '…';
  updateProgressHeader();

  if (resuming) showToast(`Resuming from Q${quizState.answered + 1} 📖`, 'info');

  await loadNextBatch();
}

/* ── Load next batch ── */
async function loadNextBatch() {
  // Show loading state in question card immediately to avoid flash of old Q
  document.getElementById('q-text').textContent = '⏳ अगले प्रश्न लोड हो रहे हैं…';
  document.getElementById('q-number').textContent = '';
  document.querySelectorAll('.opt').forEach(btn => {
    btn.disabled = true; btn.className = 'opt';
    const lbl = btn.querySelector('span:last-child');
    if (lbl) lbl.textContent = '—';
  });
  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('desc-box').classList.add('hidden');
  document.getElementById('review-banner').style.display = 'none';

  try {
    const d = await fetchBatch();

    if (d.exhausted || !d.data || d.data.length === 0) {
      clearProgress();
      showFinalResult();
      return;
    }

    questions = d.data;
    currentQ  = 0;

    if (quizState.total === 0) {
      quizState.total = (d.remaining || 0) + quizState.seenIds.length + questions.length;
    }
    quizState.isLast = (d.remaining === 0);

    updateProgressHeader();
    renderQuestion();
  } catch (e) {
    showToast(`Error loading questions: ${e.message}`, 'error');
    stopTimer();
    showScreen('home');
  }
}

/* ── Update progress header ── */
function updateProgressHeader() {
  const done  = quizState.answered;
  const total = quizState.total || '?';
  document.getElementById('quiz-progress-text').textContent = `${done + 1} / ${total}`;
  const pct = quizState.total > 0 ? (done / quizState.total) * 100 : 0;
  document.getElementById('progress-bar-fill').style.width = pct + '%';
  document.getElementById('score-left').textContent = quizState.total - done;
}

async function startStateQuiz(state) {
  currentState    = state;
  currentSubject  = { id: 'states', name: 'State Exam', emoji: '🗺️', color: '#10b981' };
  currentCategory = null;
  await startQuiz(false);
}

/* ── RENDER QUESTION ── */
function renderQuestion() {
  isReviewing = false;
  document.getElementById('review-banner').style.display = 'none';

  if (currentQ >= questions.length) {
    if (quizState.isLast) { clearProgress(); showFinalResult(); }
    else { loadNextBatch(); }
    return;
  }

  // Start timer on first question render (FIX: timer was starting before questions loaded)
  if (!timerStarted) {
    startTimer();
    timerStarted = true;
  }

  answered = false;
  const q  = questions[currentQ];

  document.getElementById('q-number').textContent = `Q${quizState.answered + 1}`;
  document.getElementById('q-text').textContent   = q.q || q.question;
  updateProgressHeader();

  const opts = q.opts || q.options || [];
  document.querySelectorAll('.opt').forEach((btn, i) => {
    btn.className = 'opt';
    btn.disabled  = false;
    btn.querySelector('.opt-lbl').className = `opt-lbl ${'la lb lc ld'.split(' ')[i]}`;
    btn.querySelector('span:last-child').textContent = opts[i] ?? '';
    btn.style.display = opts[i] !== undefined ? '' : 'none';
  });

  document.getElementById('btn-next').classList.add('hidden');
  document.getElementById('btn-next').textContent = 'Next →';
  document.getElementById('desc-box').classList.add('hidden');

  // Update prev button state
  document.getElementById('btn-prev').disabled = (prevQuestions.length === 0);

  const card = document.getElementById('question-card');
  card.style.animation = 'none'; void card.offsetWidth; card.style.animation = '';
}

/* ── REVIEW MODE: Show previous question ── */
function showPrevQuestion() {
  if (prevQuestions.length === 0) {
    showToast('कोई पिछला प्रश्न नहीं है', 'info');
    return;
  }
  if (isPaused) return; // don't allow in paused state

  const entry = prevQuestions[prevQuestions.length - 1];
  isReviewing = true;

  document.getElementById('review-banner').style.display = 'block';
  document.getElementById('q-number').textContent = `Q${entry.qNum} — समीक्षा`;
  document.getElementById('q-text').textContent   = entry.q.q || entry.q.question;

  const opts = entry.q.opts || entry.q.options || [];
  document.querySelectorAll('.opt').forEach((btn, i) => {
    btn.className = 'opt';
    btn.disabled  = true;
    btn.querySelector('.opt-lbl').className = `opt-lbl ${'la lb lc ld'.split(' ')[i]}`;
    btn.querySelector('span:last-child').textContent = opts[i] ?? '';
    btn.style.display = opts[i] !== undefined ? '' : 'none';
    if (i === entry.correctIdx) btn.classList.add('correct');
    if (i === entry.userIdx && entry.userIdx !== entry.correctIdx) btn.classList.add('wrong');
  });

  // Auto-show explanation in review
  if (entry.q.description && entry.q.description.trim()) {
    document.getElementById('desc-text').textContent = entry.q.description;
    document.getElementById('desc-box').classList.remove('hidden');
  } else {
    document.getElementById('desc-box').classList.add('hidden');
  }

  // Change Next to "Back to current"
  const nextBtn = document.getElementById('btn-next');
  nextBtn.textContent = '↩ वापस जाएं';
  nextBtn.classList.remove('hidden');

  document.getElementById('btn-prev').disabled = true;
}

/* ── HANDLE ANSWER ── */
function handleAnswer(idx) {
  if (answered || isReviewing) return;
  answered = true;

  const q       = questions[currentQ];
  const correct = q.ans !== undefined ? q.ans : Number(q.answer);

  document.querySelectorAll('.opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)              btn.classList.add('correct');
    if (i === idx && idx !== correct) btn.classList.add('wrong');
  });

  if (idx === correct) {
    quizState.score++;
    document.getElementById('score-correct').textContent = quizState.score;
  } else {
    quizState.wrong++;
    document.getElementById('score-wrong').textContent = quizState.wrong;
  }

  if (q.id) quizState.seenIds.push(q.id);
  quizState.answered++;

  // Store in prev history
  prevQuestions.push({ q, userIdx: idx, correctIdx: correct, qNum: quizState.answered });

  saveProgress();

  // AUTO-SHOW EXPLANATION (no button needed)
  if (q.description && q.description.trim()) {
    document.getElementById('desc-text').textContent = q.description;
    document.getElementById('desc-box').classList.remove('hidden');
  }

  document.getElementById('btn-next').textContent = 'Next →';
  document.getElementById('btn-next').classList.remove('hidden');
  document.getElementById('btn-prev').disabled = false;
}

/* ── TIMER ── */
function startTimer() {
  stopTimer();
  elapsedSeconds = quizState.elapsed || elapsedSeconds || 0;
  updateTimer();
  timerInterval = setInterval(() => {
    if (!isPaused) { elapsedSeconds++; updateTimer(); saveProgress(); }
  }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }
function updateTimer() {
  const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const s = String(elapsedSeconds % 60).padStart(2, '0');
  document.getElementById('quiz-timer').textContent = `${m}:${s}`;
}

/* ── PAUSE ── */
function togglePause() {
  isPaused = !isPaused;
  const btn  = document.getElementById('btn-pause');
  const card = document.getElementById('question-card');

  if (isPaused) {
    btn.textContent = '▶ Resume';
    btn.classList.add('paused');
    // Add overlay on question card
    let ov = document.getElementById('pause-overlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'pause-overlay';
      ov.className = 'quiz-paused-overlay';
      ov.innerHTML = '<span>⏸</span>';
      card.appendChild(ov);
    }
    ov.style.display = 'flex';
    document.querySelectorAll('.opt').forEach(b => b.disabled = true);
  } else {
    btn.textContent = '⏸ Pause';
    btn.classList.remove('paused');
    const ov = document.getElementById('pause-overlay');
    if (ov) ov.style.display = 'none';
    if (answered) {
      document.querySelectorAll('.opt').forEach(b => b.disabled = true); // keep disabled after answered
    } else {
      document.querySelectorAll('.opt').forEach(b => b.disabled = false);
    }
  }
}

/* ── SUBMIT (mid-quiz) ── */
function submitQuizNow() {
  stopTimer();
  saveProgress();
  showFinalResult();
}

/* ── FINAL RESULT ── */
function showFinalResult() {
  stopTimer();
  showScreen('result');

  const total   = quizState.answered;
  const correct = quizState.score;
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0;

  const emojis = ['💪', '💪', '👍', '🎉', '🏆'];
  const titles = ['Keep Practicing!', 'Keep Practicing!', 'Good Effort!', 'Well Done!', 'Outstanding!'];
  const ei     = pct >= 90 ? 4 : pct >= 70 ? 3 : pct >= 50 ? 2 : pct >= 30 ? 1 : 0;

  document.getElementById('result-emoji').textContent = emojis[ei];
  document.getElementById('result-title').textContent = titles[ei];
  document.getElementById('ring-pct').textContent     = pct + '%';
  document.getElementById('rs-correct').textContent   = correct;
  document.getElementById('rs-wrong').textContent     = quizState.wrong;
  document.getElementById('rs-time').textContent      = `${elapsedSeconds}s`;
  document.getElementById('rs-total').textContent     = total;

  setTimeout(() => {
    document.getElementById('ring-circle').style.strokeDashoffset = 352 - (pct / 100) * 352;
  }, 150);

  const badge = document.getElementById('seen-count-badge');
  badge.textContent = `${total} of ${quizState.total || total} questions attempted`;
  badge.classList.remove('hidden');

  const isComplete = quizState.isLast && quizState.answered >= (quizState.total || 1);
  if (isComplete) clearProgress();

  if (token) saveHistory();
  else document.getElementById('save-msg').textContent = '💡 Sign in to save your results!';

  // Show/hide "Change Topic" button based on whether subject has categories
  const ctBtn = document.getElementById('btn-change-topic');
  if (ctBtn) ctBtn.style.display = currentSubject && !currentState ? '' : 'none';
}

function endQuiz() { showFinalResult(); }

async function saveHistory() {
  const el = document.getElementById('save-msg');
  try {
    await apiFetch('/api/history/save', {
      method: 'POST',
      body: JSON.stringify({
        subject:     currentSubject?.name || 'Unknown',
        subCategory: currentCategory || '',
        state:       currentState || '',
        score:       quizState.score,
        total:       quizState.answered,
        timeTaken:   elapsedSeconds
      })
    });
    el.textContent = '✅ Result saved!'; el.style.color = 'var(--grn)';
  } catch (e) {
    el.textContent = '⚠️ Could not save: ' + e.message; el.style.color = 'var(--rose)';
  }
}

/* ══════════════════════════════════════════════════════
   RESUME CARD
══════════════════════════════════════════════════════ */
function checkResumeCard() {
  const card = document.getElementById('resume-card');
  const prog = loadProgress();
  if (prog && prog.answered > 0 && prog.answered < (prog.total || 999)) {
    const pct = prog.total > 0 ? Math.round((prog.score / prog.answered) * 100) : 0;
    document.getElementById('resume-stats').textContent =
      `${prog.answered} done · ${prog.score} correct · ${pct}% · ⏱ ${Math.floor((prog.elapsed || 0) / 60)}m`;
    card.classList.remove('hidden');
  } else {
    card.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════ */
async function loadHistory() {
  if (!token) { openModal('login'); return; }
  showScreen('history');
  const list = document.getElementById('history-list');
  list.innerHTML = '<p class="empty-state">Loading…</p>';
  try {
    const d = await apiFetch('/api/history');
    const h = d.history || [];
    if (!h.length) { list.innerHTML = '<p class="empty-state">No quiz history yet. Start playing!</p>'; return; }
    list.innerHTML = '';
    h.forEach(x => {
      const date = new Date(x.playedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const cls  = x.percentage >= 70 ? 'hp-good' : x.percentage >= 50 ? 'hp-mid' : 'hp-low';
      const col  = x.percentage >= 70 ? 'var(--grn)' : x.percentage >= 50 ? 'var(--amb)' : 'var(--rose)';
      const subj = [x.subject, x.subCategory, x.state].filter(Boolean).join(' › ');
      const card = document.createElement('div');
      card.className = 'hist-card';
      card.dataset.id = x._id;
      card.innerHTML = `
        <div class="hist-top">
          <span class="hist-subject">${subj}</span>
          <div style="display:flex;align-items:center;gap:8px">
            <span class="hist-pct ${cls}">${x.percentage}%</span>
            <button class="hist-del-btn" data-id="${x._id}">🗑️ Delete</button>
          </div>
        </div>
        <div class="hist-bar"><div class="hist-bar-fill" style="width:${x.percentage}%;background:${col}"></div></div>
        <div class="hist-meta"><span>✅ ${x.score}/${x.total}</span><span>⏱ ${x.timeTaken}s</span><span>📅 ${date}</span></div>`;
      list.appendChild(card);
    });
    // Bind delete buttons
    list.querySelectorAll('.hist-del-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('इस entry को delete करें?')) return;
        const id = btn.dataset.id;
        try {
          await apiFetch(`/api/history/${id}`, { method: 'DELETE' });
          btn.closest('.hist-card').remove();
          showToast('Entry delete हो गई', 'success');
          if (!list.querySelector('.hist-card')) {
            list.innerHTML = '<p class="empty-state">No quiz history yet. Start playing!</p>';
          }
        } catch (e) { showToast('Error: ' + e.message, 'error'); }
      });
    });
  } catch (e) { list.innerHTML = `<p class="error-state">❌ ${e.message}</p>`; }
}

/* ══════════════════════════════════════════════════════
   CHAT
══════════════════════════════════════════════════════ */
function openChat() {
  if (!token) { openModal('login'); return; }
  showScreen('chat');
  renderChatArea();
}

function renderChatArea() {
  const area = document.getElementById('chat-area');
  area.innerHTML = `
    <div class="chat-messages" id="chat-messages">
      <p class="chat-loading">Loading messages…</p>
    </div>
    <div class="chat-input-row">
      <input type="text" class="chat-input" id="chat-input" placeholder="Message लिखें… (max 500 chars)" maxlength="500">
      <button class="chat-send-btn" id="chat-send">➤</button>
    </div>`;

  document.getElementById('chat-send').addEventListener('click', sendChatMessage);
  document.getElementById('chat-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
  });

  loadChatMessages();
  // Poll for new messages every 5 seconds
  chatPollInterval = setInterval(loadChatMessages, 5000);
}

async function loadChatMessages(isRefresh = false) {
  try {
    const d    = await apiFetch('/api/chat');
    const msgs = d.messages || [];
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 60;

    container.innerHTML = '';
    if (!msgs.length) {
      container.innerHTML = '<p class="chat-loading">कोई message नहीं — पहले message भेजें! 💬</p>';
      return;
    }
    msgs.forEach(msg => container.appendChild(buildChatBubble(msg)));

    // Auto-scroll to bottom if was at bottom
    if (wasAtBottom || !isRefresh) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (e) {
    const c = document.getElementById('chat-messages');
    if (c) c.innerHTML = `<p class="chat-loading">❌ ${e.message}</p>`;
  }
}

function buildChatBubble(msg) {
  const isMe   = msg.user === (userData?.id || userData?._id);
  const time   = new Date(msg.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const wrap   = document.createElement('div');
  wrap.className = `chat-msg${isMe ? ' me' : ''}`;
  wrap.innerHTML = `
    <div class="chat-avatar">${msg.userAvatar || '🎓'}</div>
    <div class="chat-bubble">
      ${!isMe ? `<div class="chat-sender">${msg.userName}</div>` : ''}
      <div class="chat-text">${escapeHtml(msg.message)}</div>
      <div class="chat-time">${time}</div>
    </div>`;
  return wrap;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const msg   = input?.value.trim();
  if (!msg) return;
  input.value = '';
  try {
    await apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: msg }) });
    loadChatMessages();
  } catch (e) { showToast('Message नहीं भेजा जा सका: ' + e.message, 'error'); input.value = msg; }
}

/* ══════════════════════════════════════════════════════
   BIND EVENTS
══════════════════════════════════════════════════════ */
function bindEvents() {
  // Auth
  document.getElementById('btn-auth').addEventListener('click',    () => openModal('login'));
  document.getElementById('btn-logout').addEventListener('click',  doLogout);
  document.getElementById('btn-history').addEventListener('click', loadHistory);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('auth-modal').addEventListener('click',  e => { if (e.target.id === 'auth-modal') closeModal(); });
  document.getElementById('tab-login').addEventListener('click',   () => switchTab('login'));
  document.getElementById('tab-signup').addEventListener('click',  () => switchTab('signup'));
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(document.getElementById('login-email').value.trim(), document.getElementById('login-password').value);
  });
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(document.getElementById('signup-name').value.trim(), document.getElementById('signup-email').value.trim(), document.getElementById('signup-password').value);
  });
  document.getElementById('open-box-btn').addEventListener('click', openBoxAnimation);

  // Chat & Profile nav buttons
  document.getElementById('btn-chat')?.addEventListener('click', openChat);
  document.getElementById('btn-profile')?.addEventListener('click', openProfileModal);
  document.getElementById('chat-back')?.addEventListener('click', () => { if (chatPollInterval) { clearInterval(chatPollInterval); chatPollInterval = null; } showScreen('home'); });

  // Profile modal
  document.getElementById('profile-modal-close')?.addEventListener('click', () => document.getElementById('profile-modal').classList.add('hidden'));
  document.getElementById('profile-modal')?.addEventListener('click', e => { if (e.target.id === 'profile-modal') document.getElementById('profile-modal').classList.add('hidden'); });
  document.querySelectorAll('.ptab').forEach(btn => btn.addEventListener('click', () => switchProfileTab(btn.dataset.tab)));
  document.getElementById('profile-save-btn')?.addEventListener('click', saveProfile);
  document.getElementById('change-pw-btn')?.addEventListener('click', changePassword);
  document.getElementById('btn-delete-account')?.addEventListener('click', deleteAccount);
  document.getElementById('profile-avatar-display')?.addEventListener('click', () => {
    document.getElementById('emoji-picker').classList.toggle('hidden');
  });
  document.querySelectorAll('.emoji-pick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAvatar = btn.dataset.emoji;
      document.getElementById('profile-avatar-display').textContent = selectedAvatar;
      document.querySelectorAll('.emoji-pick-btn').forEach(b => b.classList.toggle('selected', b.dataset.emoji === selectedAvatar));
      document.getElementById('emoji-picker').classList.add('hidden');
    });
  });

  // Quiz option buttons
  document.querySelectorAll('.opt').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx)));
  });

  // Next button
  document.getElementById('btn-next').addEventListener('click', () => {
    if (isReviewing) {
      // Exit review mode → go back to current question
      renderQuestion();
      return;
    }
    currentQ++;
    renderQuestion();
  });

  // Prev button
  document.getElementById('btn-prev').addEventListener('click', showPrevQuestion);

  // Pause button
  document.getElementById('btn-pause')?.addEventListener('click', togglePause);

  // Quiz back — save progress, go home
  document.getElementById('quiz-back').addEventListener('click', () => {
    if (answered || quizState.answered > 0) {
      saveProgress();
      showToast('Progress save हो गया। जहाँ छोड़ा था, वहीं से resume होगा।', 'info');
    }
    stopTimer();
    // Do NOT reset currentSubject/currentState/currentCategory — needed for resume
    showScreen('home');
  });

  document.getElementById('hist-back').addEventListener('click', () => showScreen('home'));

  // Quiz submit button
  document.getElementById('btn-submit-quiz').addEventListener('click', () => {
    if (confirm('Submit quiz now? Your current score will be saved.')) submitQuizNow();
  });

  // Result screen buttons
  document.getElementById('btn-retry').addEventListener('click', () => {
    const prog = loadProgress();
    if (prog && prog.answered > 0) {
      quizState = { seenIds: prog.seenIds || [], score: prog.score || 0, wrong: prog.wrong || 0, answered: prog.answered || 0, total: prog.total || 0, elapsed: prog.elapsed || 0, isLast: false };
      startQuiz(true);
    } else {
      startQuiz(false);
    }
  });
  document.getElementById('btn-restart-result').addEventListener('click', () => {
    clearProgress();
    quizState = { seenIds: [], score: 0, wrong: 0, answered: 0, total: 0, elapsed: 0, isLast: false };
    startQuiz(false);
  });
  document.getElementById('btn-home-from-result').addEventListener('click', () => { currentState = null; showScreen('home'); });

  // Quick change topic (same subject, go to category screen)
  document.getElementById('btn-change-topic')?.addEventListener('click', () => {
    if (currentSubject) openCategoryScreen(currentSubject);
    else showScreen('home');
  });
  // Quick change subject (go home)
  document.getElementById('btn-change-subject')?.addEventListener('click', () => {
    currentState = null;
    showScreen('home');
  });

  // Resume from category screen
  document.getElementById('btn-resume').addEventListener('click', () => {
    const prog = loadProgress();
    if (!prog) return startQuiz(false);
    quizState = { seenIds: prog.seenIds || [], score: prog.score || 0, wrong: prog.wrong || 0, answered: prog.answered || 0, total: prog.total || 0, elapsed: prog.elapsed || 0, isLast: false };
    startQuiz(true);
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    clearProgress();
    quizState = { seenIds: [], score: 0, wrong: 0, answered: 0, total: 0, elapsed: 0, isLast: false };
    startQuiz(false);
  });

  document.getElementById('btn-reset-seen').addEventListener('click', () => {
    clearSeenIds();
    showToast('Reset done! Starting from Q1 🔄', 'success');
    currentQ = 0; startQuiz();
  });
  document.getElementById('btn-all-cat').addEventListener('click', () => { currentCategory = null; startQuiz(); });

  // Category back
  document.getElementById('cat-back').addEventListener('click', () => {
    if (nestedStack.length > 0) {
      const prev = nestedStack.pop();
      renderNestedLevel(prev.nodes, prev.label);
    } else { currentState = null; nestedStack = []; showScreen('home'); }
  });
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
async function init() {
  bindEvents();
  updateAuthUI();
  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
      updateAuthUI();
    } catch {
      token = null; userData = null;
      localStorage.removeItem('vs_token'); localStorage.removeItem('vs_user');
      updateAuthUI();
    }
  }
  await loadSubjects();
  await new Promise(r => setTimeout(r, 1800));
  hideLoader();
  startGuestPing();
  loadStats();
  initFeedback();
  setInterval(loadStats, 60000);
}

document.addEventListener('DOMContentLoaded', init);

/* ══════════════════════════════════════════════════════
   LIVE STATS TICKER
══════════════════════════════════════════════════════ */
function getSessionId() {
  let sid = sessionStorage.getItem('vs_sid');
  if (!sid) { sid = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('vs_sid', sid); }
  return sid;
}
function startGuestPing() {
  if (token) return;
  const sid = getSessionId();
  const ping = () => fetch(`${API}/api/stats/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) }).catch(() => {});
  ping(); setInterval(ping, 30000);
}
function animateCount(el, target, suffix = '') {
  const duration = 1200, startTime = performance.now();
  const update = (now) => {
    const p   = Math.min((now - startTime) / duration, 1);
    const ease = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(ease * target).toLocaleString('en-IN') + suffix;
    if (p < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}
async function loadStats() {
  try {
    const d = await apiFetch('/api/stats');
    const usersEl  = document.getElementById('stat-users');
    const guestsEl = document.getElementById('stat-guests');
    const qsEl     = document.getElementById('stat-qs');
    if (usersEl)  animateCount(usersEl,  d.totalUsers || 0);
    if (guestsEl) animateCount(guestsEl, (d.activeGuests || 0) + (d.totalUsers ? 3 : 1));
    if (qsEl)     animateCount(qsEl, (d.totalUsers || 1) * 12 + Math.floor(Math.random() * 200));
  } catch (e) {
    ['stat-users', 'stat-guests', 'stat-qs'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  }
}

/* ══════════════════════════════════════════════════════
   FEEDBACK
══════════════════════════════════════════════════════ */
let selectedRating = 5;

function initFeedback() {
  const stars = document.querySelectorAll('.star-btn');
  stars.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
    });
    btn.addEventListener('mouseover', () => {
      const hover = parseInt(btn.dataset.val);
      stars.forEach((s, i) => s.classList.toggle('active', i < hover));
    });
    btn.addEventListener('mouseout', () => {
      stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
    });
  });

  const ta = document.getElementById('fb-msg');
  if (ta) ta.addEventListener('input', () => {
    const el = document.getElementById('fb-char');
    if (el) el.textContent = ta.value.length;
  });

  const submitBtn = document.getElementById('fb-submit');
  if (submitBtn) submitBtn.addEventListener('click', submitFeedback);

  loadFeedback();
}

async function submitFeedback() {
  if (!token) { openModal('login'); return; }
  const message = document.getElementById('fb-msg')?.value.trim() || '';
  const btn     = document.getElementById('fb-submit');
  if (!message) { showFbStatus('Please write something before submitting.', 'err'); return; }

  btn.textContent = 'Submitting…'; btn.disabled = true;
  try {
    const d = await apiFetch('/api/feedback', { method: 'POST', body: JSON.stringify({ message, rating: selectedRating }) });
    document.getElementById('fb-msg').value  = '';
    document.getElementById('fb-char').textContent = '0';
    selectedRating = 5;
    document.querySelectorAll('.star-btn').forEach(s => s.classList.add('active'));
    showFbStatus('✅ Thank you! Your feedback has been submitted.', 'ok');
    prependFeedbackCard(d.feedback);
  } catch (e) { showFbStatus('❌ ' + e.message, 'err'); }
  finally { btn.textContent = 'Submit Feedback'; btn.disabled = false; }
}

function showFbStatus(msg, type) {
  const el = document.getElementById('fb-status');
  if (!el) return;
  el.textContent = msg; el.className = `fb-status ${type}`; el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

async function loadFeedback() {
  const list = document.getElementById('fb-list');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading reviews…</p>';
  try {
    const d     = await apiFetch('/api/feedback');
    const items = d.feedback || [];
    if (!items.length) { list.innerHTML = '<p class="empty-state">No reviews yet — be the first! 🌟</p>'; return; }
    list.innerHTML = '';
    items.forEach(fb => list.appendChild(buildFbCard(fb)));
  } catch (e) { list.innerHTML = '<p class="empty-state">Could not load reviews</p>'; }
}

function prependFeedbackCard(fb) {
  const list = document.getElementById('fb-list');
  if (!list) return;
  const emptyMsg = list.querySelector('.empty-state');
  if (emptyMsg) emptyMsg.remove();
  list.prepend(buildFbCard(fb));
}

function buildFbCard(fb) {
  const card  = document.createElement('div');
  card.className = 'fb-card';
  card.dataset.id = fb._id;
  const stars = '★'.repeat(fb.rating || 5) + '☆'.repeat(5 - (fb.rating || 5));
  const date  = new Date(fb.createdAt || fb.postedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const initl = (fb.name || 'A')[0].toUpperCase();
  const isOwn = token && userData && fb.userId && (fb.userId === (userData.id || userData._id));

  card.innerHTML = `
    <div class="fb-card-top">
      <div class="fb-card-left">
        <div class="fb-avatar">${initl}</div>
        <div>
          <div class="fb-username">${fb.name || 'Anonymous'}</div>
          <div class="fb-date">${date}</div>
        </div>
      </div>
      <div class="fb-stars">${stars}</div>
    </div>
    <p class="fb-msg" id="fbmsg-${fb._id}">${fb.message}</p>
    ${isOwn ? `
      <div class="fb-own-btns">
        <button class="fb-edit-btn" data-id="${fb._id}">✏️ Edit</button>
        <button class="fb-del-btn"  data-id="${fb._id}">🗑️ Delete</button>
      </div>
      <div class="fb-edit-area" id="fbedit-${fb._id}">
        <textarea rows="2">${fb.message}</textarea>
        <button class="fb-edit-save" data-id="${fb._id}">💾 Save</button>
      </div>` : ''}`;

  if (isOwn) {
    card.querySelector('.fb-edit-btn')?.addEventListener('click', () => {
      const ea = document.getElementById(`fbedit-${fb._id}`);
      ea.style.display = ea.style.display === 'block' ? 'none' : 'block';
    });
    card.querySelector('.fb-del-btn')?.addEventListener('click', async () => {
      if (!confirm('Feedback delete करें?')) return;
      try {
        await apiFetch(`/api/feedback/${fb._id}`, { method: 'DELETE' });
        card.remove(); showToast('Feedback delete हो गया', 'success');
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
    card.querySelector('.fb-edit-save')?.addEventListener('click', async () => {
      const ta  = card.querySelector(`#fbedit-${fb._id} textarea`);
      const msg = ta.value.trim();
      if (!msg) return;
      try {
        await apiFetch(`/api/feedback/${fb._id}`, { method: 'PUT', body: JSON.stringify({ message: msg, rating: fb.rating }) });
        document.getElementById(`fbmsg-${fb._id}`).textContent = msg;
        document.getElementById(`fbedit-${fb._id}`).style.display = 'none';
        showToast('Feedback edit हो गया ✅', 'success');
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  }
  return card;
}
