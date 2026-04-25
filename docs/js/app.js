/* ═══════════════════════════════════════════════════════
   VidyaSagar — app.js
   Backend: https://vidhya-sagar.onrender.com
   ═══════════════════════════════════════════════════════ */

const API = 'https://vidhya-sagar.onrender.com';

/* ── STATE ─────────────────────────────────────────────── */
let currentSubject  = null;
let currentCategory = null;
let currentState    = null;
let questions       = [];
let currentQ        = 0;
let score           = 0;
let wrongCount      = 0;
let answered        = false;
let timerInterval   = null;
let elapsedSeconds  = 0;
let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');

/* ── SCREEN MANAGER ─────────────────────────────────────── */
function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const s = document.getElementById(`screen-${name}`);
  if (s) s.classList.add('active');
  window.scrollTo(0, 0);
}

/* ── TOAST ──────────────────────────────────────────────── */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), 3000);
}

/* ── API HELPER ─────────────────────────────────────────── */
async function apiFetch(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Server error');
  return data;
}

/* ══════════════════════════════════════════════════════════
   LOADING SCREEN — fade out and reveal app
══════════════════════════════════════════════════════════ */
function hideLoader() {
  const loader = document.getElementById('screen-loading');
  const app    = document.getElementById('app');
  loader.classList.add('fade-out');
  app.classList.remove('app-hidden');
  app.classList.add('app-visible');
}

/* ══════════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════════ */
function updateAuthUI() {
  const btnAuth  = document.getElementById('btn-auth');
  const btnOut   = document.getElementById('btn-logout');
  const chip     = document.getElementById('user-chip');
  const nameEl   = document.getElementById('user-name-display');
  const avEl     = document.getElementById('user-avatar');

  if (token && userData) {
    btnAuth.classList.add('hidden');
    btnOut.classList.remove('hidden');
    chip.classList.remove('hidden');
    nameEl.textContent = userData.name?.split(' ')[0] || 'User';
    avEl.textContent   = (userData.name?.[0] || 'U').toUpperCase();
  } else {
    btnAuth.classList.remove('hidden');
    btnOut.classList.add('hidden');
    chip.classList.add('hidden');
  }
}

async function doLogin(email, password) {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  btn.textContent = 'Logging in…';  btn.disabled = true;
  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password })
    });
    token = data.token;  userData = data.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showToast(`Welcome back, ${userData.name}! 🎉`, 'success');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.textContent = 'Log In';  btn.disabled = false;
  }
}

async function doSignup(name, email, password) {
  const btn = document.getElementById('signup-btn');
  const err = document.getElementById('signup-error');
  btn.textContent = 'Creating…';  btn.disabled = true;
  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST', body: JSON.stringify({ name, email, password })
    });
    token = data.token;  userData = data.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showToast(`Account created! Welcome, ${name} 🚀`, 'success');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.textContent = 'Create Account';  btn.disabled = false;
  }
}

function doLogout() {
  token = null;  userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  updateAuthUI();
  showToast('Logged out successfully', 'info');
}

function openModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchTab(tab);
}
function closeModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}
function switchTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
}

/* ══════════════════════════════════════════════════════════
   LOAD SUBJECTS FROM LOCAL JSON
══════════════════════════════════════════════════════════ */
async function loadSubjects() {
  try {
    const res  = await fetch('data/subjects.json');
    const json = await res.json();

    // Subject cards
    const grid = document.getElementById('subject-grid');
    grid.innerHTML = '';
    json.subjects.forEach(sub => {
      const btn = document.createElement('button');
      btn.className = 'subj-card';
      btn.style.setProperty('--c', sub.color);
      btn.innerHTML = `
        <span class="subj-emoji">${sub.emoji}</span>
        <span class="subj-name">${sub.name}</span>
        <span class="subj-count">${sub.count} questions</span>
        <span class="subj-arrow">Attempt →</span>
      `;
      btn.addEventListener('click', () => openCategoryScreen(sub));
      grid.appendChild(btn);
    });

    // State pills
    const sw = document.getElementById('states-scroll');
    sw.innerHTML = '';
    json.states.forEach(state => {
      const btn = document.createElement('button');
      btn.className = 'state-pill';
      btn.textContent = state;
      btn.addEventListener('click', () => startStateQuiz(state));
      sw.appendChild(btn);
    });

  } catch (e) {
    console.error('Subjects load error:', e);
  }
}

/* ══════════════════════════════════════════════════════════
   CATEGORY SCREEN
══════════════════════════════════════════════════════════ */
async function openCategoryScreen(sub) {
  currentSubject  = sub;
  currentCategory = null;
  currentState    = null;

  document.getElementById('cat-emoji').textContent        = sub.emoji;
  document.getElementById('cat-subject-name').textContent = sub.name;

  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '<p class="loading-text">Loading categories…</p>';
  showScreen('category');

  try {
    const data = await apiFetch(`/quiz/${sub.id}/categories`);
    const cats = data.categories || [];

    grid.innerHTML = '';
    if (!cats.length) {
      grid.innerHTML = '<p class="empty-state">No categories found</p>';
      return;
    }
    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-item';
      btn.innerHTML = `<span>${cat}</span><span class="cat-arrow">→</span>`;
      btn.addEventListener('click', () => { currentCategory = cat; startQuiz(); });
      grid.appendChild(btn);
    });
  } catch (e) {
    grid.innerHTML = `<p class="error-state">❌ ${e.message}</p>`;
  }
}

/* ══════════════════════════════════════════════════════════
   QUIZ — START
══════════════════════════════════════════════════════════ */
async function startQuiz() {
  showScreen('quiz');
  questions = [];  currentQ = 0;  score = 0;  wrongCount = 0;  elapsedSeconds = 0;

  const badge = currentState
    ? currentState
    : `${currentSubject.emoji} ${currentSubject.name}`;
  document.getElementById('quiz-subject-badge').textContent = badge;
  document.getElementById('score-correct').textContent = '0';
  document.getElementById('score-wrong').textContent   = '0';
  document.getElementById('score-left').textContent    = '10';

  startTimer();

  try {
    let data;
    if (currentState) {
      data = await apiFetch(`/quiz/states?state=${encodeURIComponent(currentState)}`);
    } else {
      let url = `/quiz/${currentSubject.id}`;
      if (currentCategory) url += `?category=${encodeURIComponent(currentCategory)}`;
      data = await apiFetch(url);
    }

    questions = data.data || [];
    if (!questions.length) {
      showToast('No questions found, try again later', 'error');
      stopTimer(); showScreen('home'); return;
    }
    document.getElementById('score-left').textContent = questions.length;
    renderQuestion();
  } catch (e) {
    showToast(`Failed to load questions: ${e.message}`, 'error');
    stopTimer(); showScreen('home');
  }
}

async function startStateQuiz(state) {
  currentState   = state;
  currentSubject = { id: 'states', name: 'State Exam', emoji: '🗺️', color: '#10b981' };
  currentCategory = null;
  await startQuiz();
}

/* ══════════════════════════════════════════════════════════
   QUIZ — RENDER QUESTION
══════════════════════════════════════════════════════════ */
function renderQuestion() {
  if (currentQ >= questions.length) { endQuiz(); return; }

  answered = false;
  const q  = questions[currentQ];

  document.getElementById('q-number').textContent       = `Q${currentQ + 1}`;
  document.getElementById('q-text').textContent         = q.q || q.question;
  document.getElementById('quiz-progress-text').textContent = `${currentQ + 1} / ${questions.length}`;
  document.getElementById('score-left').textContent     = questions.length - currentQ;
  document.getElementById('progress-bar-fill').style.width = `${(currentQ / questions.length) * 100}%`;

  const opts = q.opts || q.options || [];

  document.querySelectorAll('.opt').forEach((btn, i) => {
    btn.className = 'opt';
    btn.disabled  = false;
    const label   = btn.querySelector('.opt-lbl');
    const text    = btn.querySelector('.opt-txt');
    // restore label class
    label.className = `opt-lbl lbl-${'abcd'[i]}`;
    text.textContent = opts[i] !== undefined ? opts[i] : '';
    btn.style.display = opts[i] !== undefined ? '' : 'none';
  });

  document.getElementById('btn-next').classList.add('hidden');

  // Slide animation
  const card = document.getElementById('question-card');
  card.style.animation = 'none';
  void card.offsetWidth;
  card.style.animation = '';
}

/* ── ANSWER ── */
function handleAnswer(idx) {
  if (answered) return;
  answered = true;

  const q       = questions[currentQ];
  const correct = q.ans !== undefined ? q.ans : Number(q.answer);

  document.querySelectorAll('.opt').forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)               btn.classList.add('correct');
    if (i === idx && idx !== correct) btn.classList.add('wrong');
  });

  if (idx === correct) {
    score++;
    document.getElementById('score-correct').textContent = score;
  } else {
    wrongCount++;
    document.getElementById('score-wrong').textContent = wrongCount;
  }

  document.getElementById('btn-next').classList.remove('hidden');
}

/* ── TIMER ── */
function startTimer() {
  stopTimer();
  elapsedSeconds = 0; updateTimer();
  timerInterval = setInterval(() => { elapsedSeconds++; updateTimer(); }, 1000);
}
function stopTimer() { clearInterval(timerInterval); timerInterval = null; }
function updateTimer() {
  const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const s = String(elapsedSeconds % 60).padStart(2, '0');
  document.getElementById('quiz-timer').textContent = `⏱ ${m}:${s}`;
}

/* ══════════════════════════════════════════════════════════
   RESULT
══════════════════════════════════════════════════════════ */
function endQuiz() {
  stopTimer();
  showScreen('result');

  const total = questions.length;
  const pct   = Math.round((score / total) * 100);

  let emoji, title;
  if (pct >= 90)      { emoji = '🏆'; title = 'Outstanding!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'Well Done!'; }
  else if (pct >= 50) { emoji = '👍'; title = 'Good Effort!'; }
  else                { emoji = '💪'; title = 'Keep Practicing!'; }

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('ring-pct').textContent     = pct + '%';
  document.getElementById('rs-correct').textContent   = score;
  document.getElementById('rs-wrong').textContent     = wrongCount;
  document.getElementById('rs-time').textContent      = `${elapsedSeconds}s`;

  // Animate ring (circumference = 2π×56 ≈ 352)
  const offset = 352 - (pct / 100) * 352;
  setTimeout(() => {
    document.getElementById('ring-circle').style.strokeDashoffset = offset;
  }, 150);

  if (token) {
    saveHistory();
  } else {
    document.getElementById('save-msg').textContent = '💡 Sign in to save your results!';
  }
}

async function saveHistory() {
  const el = document.getElementById('save-msg');
  try {
    await apiFetch('/api/history/save', {
      method: 'POST',
      body: JSON.stringify({
        subject:     currentSubject?.name || 'Unknown',
        subCategory: currentCategory || '',
        state:       currentState    || '',
        score,
        total:       questions.length,
        timeTaken:   elapsedSeconds
      })
    });
    el.textContent = '✅ Result saved!';
    el.style.color = 'var(--emerald)';
  } catch (e) {
    el.textContent = '⚠️ Could not save: ' + e.message;
    el.style.color = 'var(--rose)';
  }
}

/* ══════════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════════ */
async function loadHistory() {
  if (!token) { openModal('login'); return; }
  showScreen('history');
  const list = document.getElementById('history-list');
  list.innerHTML = '<p class="empty-state">Loading…</p>';

  try {
    const data = await apiFetch('/api/history');
    const hist = data.history || [];

    if (!hist.length) {
      list.innerHTML = '<p class="empty-state">No quiz history yet. Start playing!</p>';
      return;
    }

    list.innerHTML = hist.map(h => {
      const date  = new Date(h.playedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      const pctCls = h.percentage >= 70 ? 'hp-good' : h.percentage >= 50 ? 'hp-mid' : 'hp-low';
      const barCol = h.percentage >= 70 ? 'var(--emerald)' : h.percentage >= 50 ? 'var(--amber)' : 'var(--rose)';
      const subj   = [h.subject, h.subCategory, h.state].filter(Boolean).join(' › ');
      return `
        <div class="hist-card">
          <div class="hist-top">
            <span class="hist-subject">${subj}</span>
            <span class="hist-pct ${pctCls}">${h.percentage}%</span>
          </div>
          <div class="hist-bar-track">
            <div class="hist-bar-fill" style="width:${h.percentage}%;background:${barCol}"></div>
          </div>
          <div class="hist-meta">
            <span>✅ ${h.score}/${h.total}</span>
            <span>⏱ ${h.timeTaken}s</span>
            <span>📅 ${date}</span>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = `<p class="error-state">❌ ${e.message}</p>`;
  }
}

/* ══════════════════════════════════════════════════════════
   BIND ALL EVENTS
══════════════════════════════════════════════════════════ */
function bindEvents() {
  // Nav
  document.getElementById('btn-auth').addEventListener('click', () => openModal('login'));
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('btn-history').addEventListener('click', loadHistory);

  // Modal
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target.id === 'auth-modal') closeModal();
  });
  document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
  document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));

  // Forms
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(
      document.getElementById('login-email').value.trim(),
      document.getElementById('login-password').value
    );
  });
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(
      document.getElementById('signup-name').value.trim(),
      document.getElementById('signup-email').value.trim(),
      document.getElementById('signup-password').value
    );
  });

  // Quiz options
  document.querySelectorAll('.opt').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(parseInt(btn.dataset.idx)));
  });

  // Next
  document.getElementById('btn-next').addEventListener('click', () => {
    currentQ++;
    renderQuestion();
  });

  // Back buttons
  document.getElementById('cat-back').addEventListener('click', () => {
    currentState = null; showScreen('home');
  });
  document.getElementById('quiz-back').addEventListener('click', () => {
    stopTimer(); currentState = null; showScreen('home');
  });
  document.getElementById('hist-back').addEventListener('click', () => showScreen('home'));

  // Result
  document.getElementById('btn-retry').addEventListener('click', () => {
    currentQ = 0; startQuiz();
  });
  document.getElementById('btn-home-from-result').addEventListener('click', () => {
    currentState = null; showScreen('home');
  });

  // All categories
  document.getElementById('btn-all-cat').addEventListener('click', () => {
    currentCategory = null; startQuiz();
  });
}

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
async function init() {
  bindEvents();
  updateAuthUI();

  // Validate stored token
  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
      updateAuthUI();
    } catch {
      token = null; userData = null;
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_user');
      updateAuthUI();
    }
  }

  await loadSubjects();

  // Show app after min 1.6s (so loading animation is visible)
  await new Promise(r => setTimeout(r, 1600));
  hideLoader();
}

document.addEventListener('DOMContentLoaded', init);
