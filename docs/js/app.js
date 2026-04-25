/* ═══════════════════════════════════════════════════════
   विद्यासागर — app.js  (Fixed & Production-Ready)
   Backend: https://vidhya-sagar.onrender.com
   ═══════════════════════════════════════════════════════ */

const API = 'https://vidhya-sagar.onrender.com';

/* ── STATE ─────────────────────────────────────────── */
let currentSubject   = null;   // { id, name, emoji, color }
let currentCategory  = null;   // string or null
let currentState     = null;   // string or null
let questions        = [];
let currentQ         = 0;
let score            = 0;
let wrongCount       = 0;
let answered         = false;
let timerInterval    = null;
let elapsedSeconds   = 0;
let token            = localStorage.getItem('vs_token') || null;
let userData         = JSON.parse(localStorage.getItem('vs_user') || 'null');

/* ── DOM REFS ───────────────────────────────────────── */
const screens = {
  loading:  document.getElementById('screen-loading'),
  home:     document.getElementById('screen-home'),
  category: document.getElementById('screen-category'),
  quiz:     document.getElementById('screen-quiz'),
  result:   document.getElementById('screen-result'),
  history:  document.getElementById('screen-history'),
};

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[name].classList.add('active');
  window.scrollTo(0, 0);
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 3000);
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Server error');
  return data;
}

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function updateAuthUI() {
  const btnAuth   = document.getElementById('btn-auth');
  const btnLogout = document.getElementById('btn-logout');
  const userInfo  = document.getElementById('user-info');
  const userName  = document.getElementById('user-name-display');
  const userAvatar= document.getElementById('user-avatar');

  if (token && userData) {
    btnAuth.classList.add('hidden');
    btnLogout.classList.remove('hidden');
    userInfo.classList.remove('hidden');
    userName.textContent  = userData.name?.split(' ')[0] || 'User';
    userAvatar.textContent = (userData.name?.[0] || 'U').toUpperCase();
  } else {
    btnAuth.classList.remove('hidden');
    btnLogout.classList.add('hidden');
    userInfo.classList.add('hidden');
  }
}

async function doLogin(email, password) {
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  btn.textContent = 'लॉगिन हो रहा है...';
  btn.disabled = true;
  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    token    = data.token;
    userData = data.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI();
    closeModal();
    showToast(`स्वागत है, ${userData.name}! 🎉`, 'success');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.textContent = 'Login करें';
    btn.disabled = false;
  }
}

async function doSignup(name, email, password) {
  const btn = document.getElementById('signup-btn');
  const err = document.getElementById('signup-error');
  btn.textContent = 'बन रहा है...';
  btn.disabled = true;
  err.classList.add('hidden');
  try {
    const data = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    token    = data.token;
    userData = data.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI();
    closeModal();
    showToast(`Account बन गया! स्वागत है ${name} 🚀`, 'success');
  } catch (e) {
    err.textContent = e.message;
    err.classList.remove('hidden');
  } finally {
    btn.textContent = 'Account बनाएँ';
    btn.disabled = false;
  }
}

function doLogout() {
  token    = null;
  userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  updateAuthUI();
  showToast('लॉगआउट हो गए!', 'info');
}

/* ── Modal ── */
function openModal(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
}
function closeModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}
function switchAuthTab(tab) {
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-form').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
}

/* ══════════════════════════════════════════════════════
   SUBJECTS — load from local JSON
══════════════════════════════════════════════════════ */
async function loadSubjects() {
  try {
    const res  = await fetch('data/subjects.json');
    const json = await res.json();

    const grid = document.getElementById('subject-grid');
    grid.innerHTML = '';
    json.subjects.forEach(sub => {
      const card = document.createElement('button');
      card.className = 'subject-card';
      card.style.setProperty('--sub-color', sub.color);
      card.innerHTML = `
        <span class="sub-emoji">${sub.emoji}</span>
        <span class="sub-name">${sub.name}</span>
        <span class="sub-count">${sub.count} प्रश्न</span>
      `;
      card.addEventListener('click', () => openCategoryScreen(sub));
      grid.appendChild(card);
    });

    const statesScroll = document.getElementById('states-scroll');
    statesScroll.innerHTML = '';
    json.states.forEach(state => {
      const btn = document.createElement('button');
      btn.className = 'state-chip';
      btn.textContent = state;
      btn.addEventListener('click', () => startStateQuiz(state));
      statesScroll.appendChild(btn);
    });

  } catch (e) {
    console.error('Subjects load error:', e);
  }
}

/* ══════════════════════════════════════════════════════
   CATEGORY SCREEN
══════════════════════════════════════════════════════ */
async function openCategoryScreen(sub) {
  currentSubject  = sub;
  currentCategory = null;

  document.getElementById('cat-emoji').textContent       = sub.emoji;
  document.getElementById('cat-subject-name').textContent = sub.name;

  const grid = document.getElementById('cat-grid');
  grid.innerHTML = '<p class="loading-cats">Categories लोड हो रही हैं...</p>';
  showScreen('category');

  try {
    // FIX: correct endpoint /quiz/:subject/categories
    const data = await apiFetch(`/quiz/${sub.id}/categories`);
    const cats  = data.categories || [];

    grid.innerHTML = '';
    if (cats.length === 0) {
      grid.innerHTML = '<p class="empty-msg">कोई category नहीं मिली</p>';
      return;
    }

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'cat-chip';
      btn.innerHTML = `<span class="cat-chip-name">${cat}</span><span class="cat-chip-arrow">→</span>`;
      btn.addEventListener('click', () => {
        currentCategory = cat;
        startQuiz();
      });
      grid.appendChild(btn);
    });
  } catch (e) {
    grid.innerHTML = `<p class="error-msg">❌ ${e.message}</p>`;
    console.error('Categories error:', e);
  }
}

/* ══════════════════════════════════════════════════════
   QUIZ — START
══════════════════════════════════════════════════════ */
async function startQuiz() {
  showScreen('quiz');
  questions    = [];
  currentQ     = 0;
  score        = 0;
  wrongCount   = 0;
  elapsedSeconds = 0;

  document.getElementById('quiz-subject-badge').textContent =
    currentState ? currentState : `${currentSubject.emoji} ${currentSubject.name}`;
  document.getElementById('score-correct').textContent = '0';
  document.getElementById('score-wrong').textContent   = '0';
  document.getElementById('score-left').textContent    = '10';

  startTimer();

  try {
    let data;
    if (currentState) {
      // FIX: correct state quiz endpoint
      data = await apiFetch(`/quiz/states?state=${encodeURIComponent(currentState)}`);
    } else {
      // FIX: correct quiz endpoint with optional category
      let url = `/quiz/${currentSubject.id}`;
      if (currentCategory) url += `?category=${encodeURIComponent(currentCategory)}`;
      data = await apiFetch(url);
    }

    questions = data.data || [];
    if (questions.length === 0) {
      showToast('कोई प्रश्न नहीं मिले, बाद में कोशिश करें', 'error');
      showScreen('home');
      return;
    }

    document.getElementById('score-left').textContent = questions.length;
    renderQuestion();
  } catch (e) {
    console.error('Quiz load error:', e);
    showToast(`प्रश्न लोड नहीं हुए: ${e.message}`, 'error');
    stopTimer();
    showScreen('home');
  }
}

async function startStateQuiz(state) {
  currentState    = state;
  currentSubject  = { id: 'states', name: 'राज्य परीक्षा', emoji: '🗺️', color: '#10b981' };
  currentCategory = null;
  await startQuiz();
}

/* ══════════════════════════════════════════════════════
   QUIZ — RENDER
══════════════════════════════════════════════════════ */
function renderQuestion() {
  if (currentQ >= questions.length) {
    endQuiz();
    return;
  }

  answered = false;
  const q = questions[currentQ];

  document.getElementById('q-number').textContent = `Q${currentQ + 1}`;
  document.getElementById('q-text').textContent   = q.q || q.question;
  document.getElementById('quiz-progress-text').textContent = `${currentQ + 1}/${questions.length}`;
  document.getElementById('score-left').textContent = questions.length - currentQ;

  // Progress bar
  const pct = (currentQ / questions.length) * 100;
  document.getElementById('progress-bar-fill').style.width = pct + '%';

  // Normalise options — API returns q.opts OR q.options
  const opts = q.opts || q.options || [];

  const optBtns = document.querySelectorAll('.option-btn');
  optBtns.forEach((btn, i) => {
    btn.className = 'option-btn';
    btn.disabled  = false;
    const textEl  = btn.querySelector('.opt-text');
    textEl.textContent = opts[i] !== undefined ? opts[i] : '';
    btn.style.display  = opts[i] !== undefined ? '' : 'none';
  });

  document.getElementById('btn-next').classList.add('hidden');

  // Question card entrance animation
  const card = document.getElementById('question-card');
  card.classList.remove('slide-in');
  void card.offsetWidth;
  card.classList.add('slide-in');
}

/* ── ANSWER ── */
function handleAnswer(selectedIdx) {
  if (answered) return;
  answered = true;

  const q      = questions[currentQ];
  // API returns ans as 0-based index (already set in server)
  const correct = q.ans !== undefined ? q.ans : Number(q.answer);

  const optBtns = document.querySelectorAll('.option-btn');
  optBtns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === correct)    btn.classList.add('correct');
    if (i === selectedIdx && selectedIdx !== correct) btn.classList.add('wrong');
  });

  if (selectedIdx === correct) {
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
  elapsedSeconds = 0;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    elapsedSeconds++;
    updateTimerDisplay();
  }, 1000);
}
function stopTimer() {
  if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
}
function updateTimerDisplay() {
  const m = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const s = String(elapsedSeconds % 60).padStart(2, '0');
  document.getElementById('quiz-timer').textContent = `⏱ ${m}:${s}`;
}

/* ══════════════════════════════════════════════════════
   QUIZ — END / RESULT
══════════════════════════════════════════════════════ */
function endQuiz() {
  stopTimer();
  showScreen('result');

  const total  = questions.length;
  const pct    = Math.round((score / total) * 100);

  // Emoji & title
  let emoji, title;
  if (pct >= 90)      { emoji = '🏆'; title = 'शानदार! अद्भुत प्रदर्शन!'; }
  else if (pct >= 70) { emoji = '🎉'; title = 'बहुत बढ़िया!'; }
  else if (pct >= 50) { emoji = '👍'; title = 'अच्छा प्रयास!'; }
  else                { emoji = '💪'; title = 'अभ्यास जारी रखें!'; }

  document.getElementById('result-emoji').textContent = emoji;
  document.getElementById('result-title').textContent = title;
  document.getElementById('ring-pct').textContent     = pct + '%';
  document.getElementById('rs-correct').textContent   = score;
  document.getElementById('rs-wrong').textContent     = wrongCount;
  document.getElementById('rs-time').textContent      = `${elapsedSeconds}s`;

  // Animate ring
  const circumference = 314;
  const offset = circumference - (pct / 100) * circumference;
  setTimeout(() => {
    document.getElementById('ring-circle').style.strokeDashoffset = offset;
  }, 100);

  // Save to history if logged in
  if (token) {
    saveHistory(pct, total);
  } else {
    document.getElementById('save-msg').textContent = '💡 Login करें तो results save होंगे!';
  }
}

async function saveHistory(total, totalQ) {
  const saveMsg = document.getElementById('save-msg');
  try {
    await apiFetch('/api/history/save', {
      method: 'POST',
      body: JSON.stringify({
        subject:     currentSubject?.name || 'Unknown',
        subCategory: currentCategory  || '',
        state:       currentState     || '',
        score:       score,
        total:       questions.length,
        timeTaken:   elapsedSeconds
      })
    });
    saveMsg.textContent = '✅ Result save हो गया!';
    saveMsg.style.color = '#10b981';
  } catch (e) {
    saveMsg.textContent = '⚠️ Save नहीं हुआ: ' + e.message;
    saveMsg.style.color = '#ef4444';
  }
}

/* ══════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════ */
async function loadHistory() {
  if (!token) {
    openModal('login');
    return;
  }
  showScreen('history');
  const list = document.getElementById('history-list');
  list.innerHTML = '<p class="empty-msg">Loading...</p>';

  try {
    const data = await apiFetch('/api/history');
    const hist = data.history || [];

    if (!hist.length) {
      list.innerHTML = '<p class="empty-msg">अभी तक कोई quiz नहीं खेली!</p>';
      return;
    }

    list.innerHTML = hist.map(h => {
      const date = new Date(h.playedAt).toLocaleDateString('hi-IN');
      const bar  = `<div class="hist-bar"><div class="hist-bar-fill" style="width:${h.percentage}%;background:${h.percentage >= 70 ? '#10b981' : h.percentage >= 50 ? '#f4820a' : '#ef4444'}"></div></div>`;
      return `
        <div class="hist-card">
          <div class="hist-top">
            <strong>${h.subject}${h.subCategory ? ' › ' + h.subCategory : ''}${h.state ? ' › ' + h.state : ''}</strong>
            <span class="hist-pct ${h.percentage >= 70 ? 'good' : 'avg'}">${h.percentage}%</span>
          </div>
          ${bar}
          <div class="hist-bottom">
            <span>✅ ${h.score}/${h.total} सही</span>
            <span>⏱ ${h.timeTaken}s</span>
            <span>📅 ${date}</span>
          </div>
        </div>`;
    }).join('');
  } catch (e) {
    list.innerHTML = `<p class="error-msg">❌ ${e.message}</p>`;
  }
}

/* ══════════════════════════════════════════════════════
   EVENT LISTENERS
══════════════════════════════════════════════════════ */
function bindEvents() {
  // Auth buttons
  document.getElementById('btn-auth').addEventListener('click', () => openModal('login'));
  document.getElementById('btn-logout').addEventListener('click', doLogout);
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target.id === 'auth-modal') closeModal();
  });

  // Auth tabs
  document.getElementById('tab-login').addEventListener('click', () => switchAuthTab('login'));
  document.getElementById('tab-signup').addEventListener('click', () => switchAuthTab('signup'));

  // Login form
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) return;
    doLogin(email, password);
  });

  // Signup form
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    const name     = document.getElementById('signup-name').value.trim();
    const email    = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    if (!name || !email || !password) return;
    doSignup(name, email, password);
  });

  // Quiz options
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleAnswer(parseInt(btn.dataset.idx));
    });
  });

  // Next button
  document.getElementById('btn-next').addEventListener('click', () => {
    currentQ++;
    renderQuestion();
  });

  // Back buttons
  document.getElementById('cat-back').addEventListener('click', () => {
    currentState = null;
    showScreen('home');
  });
  document.getElementById('quiz-back').addEventListener('click', () => {
    stopTimer();
    currentState = null;
    showScreen('home');
  });
  document.getElementById('hist-back').addEventListener('click', () => showScreen('home'));

  // Result actions
  document.getElementById('btn-retry').addEventListener('click', () => {
    currentQ = 0;
    startQuiz();
  });
  document.getElementById('btn-home-from-result').addEventListener('click', () => {
    currentState = null;
    showScreen('home');
  });

  // History
  document.getElementById('btn-history').addEventListener('click', loadHistory);

  // Category — All button
  document.getElementById('btn-all-cat').addEventListener('click', () => {
    currentCategory = null;
    startQuiz();
  });
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
async function init() {
  bindEvents();
  updateAuthUI();

  // Verify stored token is still valid
  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
      updateAuthUI();
    } catch {
      // Token expired — clear it
      token    = null;
      userData = null;
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_user');
      updateAuthUI();
    }
  }

  await loadSubjects();

  // Minimum 1.5s loading screen so lotus animation is visible
  await new Promise(r => setTimeout(r, 1500));
  showScreen('home');
}

document.addEventListener('DOMContentLoaded', init);
