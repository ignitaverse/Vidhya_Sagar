/* VidyaSagar v4 — app.js (IMPROVED) */
'use strict';

let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');

/* ── Auto-logout: 10 days inactivity ── */
const INACTIVITY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
(function checkInactivity() {
  const last = parseInt(localStorage.getItem('vs_last_active') || '0');
  if (last && token && Date.now() - last > INACTIVITY_MS) {
    token = null; userData = null;
    localStorage.removeItem('vs_token');
    localStorage.removeItem('vs_user');
    localStorage.setItem('vs_session_expired', '1');
  }
})();
function touchActivity() {
  localStorage.setItem('vs_last_active', String(Date.now()));
}
touchActivity();
document.addEventListener('click', touchActivity, { passive: true });
document.addEventListener('keydown', touchActivity, { passive: true });

/* ── API Helper ── */
async function apiFetch(path, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${VS_CONFIG.API}${path}`, { ...opts, headers: h });
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Error');
  return d;
}

/* ── Toast ── */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3200);
}

/* ── Loader ── */
function hideLoader() {
  document.getElementById('vs-loading').classList.add('out');
  document.getElementById('app').classList.add('ready');
}

/* ══════════════════════════════════════
   NAVIGATION — with History API (back button fix)
══════════════════════════════════════ */
let _navHistory = ['home']; // tab history stack
let _subScreenStack = [];   // sub-screen history stack

function switchTab(tab) {
  // Close all sub-screens
  document.querySelectorAll('.sub-screen.open').forEach(s => s.classList.remove('open'));
  _subScreenStack = [];

  ChatModule.stopPolling();

  document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));

  const scr = document.getElementById(`screen-${tab}`);
  const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (scr) scr.classList.add('active');
  if (btn) btn.classList.add('active');

  if (tab === 'quiz' && !window._qLoaded) { window._qLoaded = true; QuizModule.loadSubjects(); }
  if (tab === 'typing' && !window._tLoaded) { window._tLoaded = true; TypingModule.loadExams(); }

  // Push state for back button
  if (_navHistory[_navHistory.length - 1] !== tab) {
    _navHistory.push(tab);
    history.pushState({ tab, type: 'tab' }, '', `#${tab}`);
  }
}

function openSubScreen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  _subScreenStack.push(id);
  history.pushState({ id, type: 'sub' }, '', `#sub-${id}`);
  // Scroll sub-screen to top
  setTimeout(() => { el.scrollTop = 0; }, 30);
}

function closeSubScreen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const idx = _subScreenStack.lastIndexOf(id);
  if (idx !== -1) _subScreenStack.splice(idx, 1);
}

function closeTopSubScreen() {
  if (_subScreenStack.length > 0) {
    const top = _subScreenStack[_subScreenStack.length - 1];
    closeSubScreen(top);
    return true;
  }
  return false;
}

/* Browser back button handler */
window.addEventListener('popstate', (e) => {
  // If there's an open sub-screen, close it
  if (_subScreenStack.length > 0) {
    const top = _subScreenStack[_subScreenStack.length - 1];
    closeSubScreen(top);
    return;
  }
  // If on a non-home tab, go to home
  const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
  if (activeTab && activeTab !== 'home') {
    switchTab('home');
    return;
  }
  // On home with nothing open — let browser handle (or confirm exit)
});

/* Android hardware back button (via beforeunload / keyboard) */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!closeTopSubScreen()) {
      const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
      if (activeTab && activeTab !== 'home') switchTab('home');
    }
  }
});

/* ══════════════════════════════════════
   CHAT
══════════════════════════════════════ */
function openChatList() { openSubScreen('screen-chat-list'); }

/* ══════════════════════════════════════
   AUTH UI
══════════════════════════════════════ */
function updateAuthUI() {
  const av = document.getElementById('top-avatar');
  if (token && userData) {
    if (av) av.textContent = userData.avatar || (userData.name?.[0]?.toUpperCase() || 'U');
  } else {
    if (av) av.textContent = '👤';
  }
}

/* ══════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════ */
function openAuth(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
  if (tab === 'signup') setTimeout(initGhibliScene, 100);
}
function closeAuth() {
  document.getElementById('auth-modal').classList.add('hidden');
}
function switchAuthTab(tab) {
  document.getElementById('login-panel').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-panel').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  if (tab === 'signup') initGhibliScene();
}

/* ══════════════════════════════════════
   GHIBLI SCENE
══════════════════════════════════════ */
let gReady = false, gOpen = false;
function initGhibliScene() {
  if (gReady) return; gReady = true;
  const stars = document.getElementById('g-stars');
  if (!stars) return;
  for (let i = 0; i < 38; i++) {
    const s = document.createElement('div'); s.className = 'g-star';
    const sz = Math.random() * 2.5 + .5;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;top:${Math.random() * 65}%;animation-delay:${Math.random() * 4}s;animation-duration:${Math.random() * 2 + 2}s`;
    stars.appendChild(s);
  }
  const boy = document.getElementById('g-boy');
  boy?.addEventListener('animationend', () => {
    boy.classList.add('stopped');
    const hint = document.getElementById('g-scene-hint');
    if (hint) hint.style.opacity = '1';
  }, { once: true });
}
function openBriefcase() {
  if (gOpen) return; gOpen = true;
  const boy = document.getElementById('g-boy');
  const hint = document.getElementById('g-scene-hint');
  const openBtn = document.getElementById('g-open-btn');
  const form = document.getElementById('signup-form-inner');
  const stage = document.getElementById('ghibli-stage');
  if (boy) boy.classList.add('opening');
  if (hint) hint.style.opacity = '0';
  if (openBtn) { openBtn.style.opacity = '0'; openBtn.style.pointerEvents = 'none'; }
  setTimeout(() => {
    if (stage) { stage.style.height = '110px'; stage.style.transition = 'height .4s ease'; }
    setTimeout(() => { if (form) form.classList.add('show'); document.getElementById('s-name')?.focus(); }, 400);
  }, 800);
}

/* ══════════════════════════════════════
   LOGIN / SIGNUP / LOGOUT
══════════════════════════════════════ */
async function doLogin(email, password) {
  const btn = document.getElementById('l-btn'), err = document.getElementById('l-err');
  btn.textContent = 'Logging in…'; btn.disabled = true; err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    touchActivity();
    updateAuthUI(); closeAuth();
    showToast(`Welcome back, ${userData.name}! 👋`, 'success');
    loadStats();
    if (ProfileModule) ProfileModule.render();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = 'Log In'; btn.disabled = false; }
}

async function doSignup(name, email, password) {
  const btn = document.getElementById('s-btn'), err = document.getElementById('s-err');
  btn.textContent = 'Creating…'; btn.disabled = true; err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    touchActivity();
    updateAuthUI(); closeAuth(); showCelebration();
    showToast(`Welcome, ${name}! 🚀`, 'success');
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = '🚀 Create Account'; btn.disabled = false; }
}

function doLogout() {
  document.getElementById('logout-overlay').classList.add('show');
  token = null; userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  localStorage.removeItem('vs_last_active');
  ChatModule.stopPolling();
  setTimeout(() => window.location.reload(), 2400);
}

/* ══════════════════════════════════════
   CELEBRATE
══════════════════════════════════════ */
function showCelebration() {
  const ov = document.getElementById('celebrate-ov'), wrap = document.getElementById('fp-wrap');
  ov.classList.remove('hidden'); wrap.innerHTML = '';
  const colors = ['#3b82f6','#a855f7','#10b981','#f59e0b','#f43f5e','#22d3ee'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'fp';
    const sz = Math.random() * 10 + 4;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;background:${colors[~~(Math.random() * colors.length)]};animation-duration:${Math.random() * 3 + 2}s;animation-delay:${Math.random() * 1.5}s`;
    wrap.appendChild(p);
  }
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.classList.add('hidden'), 500); }, 2800);
}

/* ══════════════════════════════════════
   THEME / FONT / ZOOM
══════════════════════════════════════ */
function applyTheme(theme, el) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const root = document.documentElement;
  root.removeAttribute('data-theme');
  if (theme === 'light') root.setAttribute('data-theme', 'light');
  else if (theme === 'system' && !window.matchMedia('(prefers-color-scheme: dark)').matches)
    root.setAttribute('data-theme', 'light');
  localStorage.setItem('vs_theme', theme);
  const lbl = theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '📱 System';
  const sr = document.getElementById('sr-theme-val'); if (sr) sr.textContent = lbl;
  showToast(`Theme: ${lbl} ✅`, 'success');
}

const FMAP = {
  default: "'Plus Jakarta Sans','Noto Sans Devanagari',sans-serif",
  syne: "'Syne',sans-serif",
  noto: "'Noto Sans Devanagari',sans-serif",
  arial: 'Arial,sans-serif',
  georgia: 'Georgia,serif',
  manga: "'Comic Sans MS',cursive",
  italic: 'inherit',
  cursive: 'cursive',
  mono: 'monospace'
};

function applyFont(type, font, el) {
  const list = el?.parentElement;
  if (list) list.querySelectorAll('.font-opt').forEach(o => o.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const ff = FMAP[font] || FMAP.default;
  if (type === 'website') {
    document.body.style.fontFamily = ff;
    localStorage.setItem('vs_font_web', font);
    showToast('Font changed ✅', 'success');
  } else {
    document.querySelectorAll('.chat-ta,.ai-inp,.chat-bub,.ai-bub').forEach(e => e.style.fontFamily = ff);
    localStorage.setItem('vs_font_chat', font);
    showToast('Chat font changed ✅', 'success');
  }
}

function applyZoom(type, val) {
  const pct = parseInt(val);
  if (type === 'website') {
    document.documentElement.style.fontSize = (pct / 100 * 15) + 'px';
    localStorage.setItem('vs_zoom_web', val);
    const el = document.getElementById('zoom-website-label'); if (el) el.textContent = `${pct}%`;
    const sr = document.getElementById('sr-zoom-val'); if (sr) sr.textContent = pct + '%';
  } else {
    document.querySelectorAll('.chat-ta,.chat-bub,.ai-bub').forEach(e => e.style.fontSize = (pct / 100 * 14) + 'px');
    localStorage.setItem('vs_zoom_chat', val);
    const el = document.getElementById('zoom-chat-label'); if (el) el.textContent = `${pct}%`;
  }
}

function setChatBg(bg, el) {
  document.querySelectorAll('.cbg-card').forEach(c => c.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const msgs = document.getElementById('group-msgs');
  if (!msgs) return;
  if (bg === 'default') { msgs.style.background = ''; msgs.style.backgroundImage = ''; }
  else msgs.style.background = el?.style.background || '';
  localStorage.setItem('vs_chat_bg', bg);
  showToast('Background updated ✅', 'success');
}

function uploadChatBg(inp) {
  const file = inp.files[0]; if (!file) return;
  if (file.size > 3 * 1024 * 1024) { showToast('Image too large (max 3MB)', 'error'); return; }
  const r = new FileReader();
  r.onload = e => {
    const url = e.target.result;
    localStorage.setItem('vs_chat_bg_custom', url);
    const msgs = document.getElementById('group-msgs');
    if (msgs) msgs.style.backgroundImage = `url(${url})`;
    showToast('Background set ✅', 'success');
  };
  r.readAsDataURL(file);
}

function applyStoredPrefs() {
  const theme = localStorage.getItem('vs_theme');
  if (theme) { const c = document.querySelector(`.theme-card[data-theme="${theme}"]`); applyTheme(theme, c); }
  const fw = localStorage.getItem('vs_font_web'); if (fw) applyFont('website', fw, null);
  const fc = localStorage.getItem('vs_font_chat'); if (fc) applyFont('chat', fc, null);
  const zw = localStorage.getItem('vs_zoom_web');
  if (zw) { const s = document.getElementById('zoom-website'); if (s) s.value = zw; applyZoom('website', zw); }
  const zc = localStorage.getItem('vs_zoom_chat');
  if (zc) { const s = document.getElementById('zoom-chat'); if (s) s.value = zc; applyZoom('chat', zc); }
}

/* ══════════════════════════════════════
   STATS
══════════════════════════════════════ */
function animateNum(el, target) {
  if (!el) return;
  const dur = 1100, st = performance.now();
  const run = now => {
    const p = Math.min((now - st) / dur, 1);
    const e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.floor(e * target).toLocaleString('en-IN');
    if (p < 1) requestAnimationFrame(run);
  };
  requestAnimationFrame(run);
}

async function loadStats() {
  try {
    const d = await apiFetch('/api/stats');
    animateNum(document.getElementById('stat-users'), d.totalUsers || 0);
    animateNum(document.getElementById('stat-quizzes'), d.totalQuizzes || 0);
    animateNum(document.getElementById('stat-live'), (d.liveGuests || 0) + 1);
    // Also update ticker
    animateNum(document.getElementById('stat-users2'), d.totalUsers || 0);
    animateNum(document.getElementById('stat-live2'), (d.liveGuests || 0) + 1);
    animateNum(document.getElementById('stat-q2'), d.totalQuizzes || 0);
  } catch(e) {}
}

function startGuestPing() {
  if (token) return;
  let sid = sessionStorage.getItem('vs_sid');
  if (!sid) { sid = 'g_' + Math.random().toString(36).slice(2); sessionStorage.setItem('vs_sid', sid); }
  const ping = () => fetch(`${VS_CONFIG.API}/api/stats/ping`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sid })
  }).catch(() => {});
  ping();
  setInterval(ping, 30000);
}

/* ══════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════ */
async function loadNotifications() {
  openSubScreen('screen-notifications');
  const list = document.getElementById('notif-list');
  list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
  try {
    const d = await apiFetch('/api/notifications');
    const items = d.notifications || [];
    const badge = document.getElementById('notif-badge');
    const readIds = JSON.parse(localStorage.getItem('vs_read_notifs') || '[]');
    const unread = items.filter(n => !readIds.includes(n._id)).length;
    if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
    if (!items.length) {
      list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🔔</span>No notifications yet</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(n => {
      const d2 = new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const isRead = readIds.includes(n._id);
      const card = document.createElement('div');
      card.className = `notif-card${isRead ? '' : ' unread'}`;
      card.innerHTML = `<div class="notif-title">${n.pinned ? '📌 ' : ''}${n.title}</div><div class="notif-body">${n.body}</div><div class="notif-time">${d2}</div>`;
      list.appendChild(card);
    });
    // Mark all as read
    const allIds = items.map(n => n._id);
    localStorage.setItem('vs_read_notifs', JSON.stringify(allIds));
    if (badge) badge.classList.add('hidden');
    apiFetch('/api/notifications/read', { method: 'PUT' }).catch(() => {});
  } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
}

/* ══════════════════════════════════════
   USER SEARCH
══════════════════════════════════════ */
let _searchTimeout = null;

function initUserSearch() {
  const inp = document.getElementById('user-search-inp');
  const drop = document.getElementById('search-results-dropdown');
  if (!inp || !drop) return;

  inp.addEventListener('input', () => {
    clearTimeout(_searchTimeout);
    const q = inp.value.trim();
    if (!q || q.length < 2) {
      drop.classList.remove('show');
      drop.innerHTML = '';
      return;
    }
    _searchTimeout = setTimeout(() => doUserSearch(q), 320);
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.home-search-wrap')) {
      drop.classList.remove('show');
    }
  });
}

async function doUserSearch(q) {
  const drop = document.getElementById('search-results-dropdown');
  if (!drop) return;
  drop.innerHTML = '<div class="search-empty">Searching…</div>';
  drop.classList.add('show');
  try {
    const d = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const users = d.users || [];
    if (!users.length) {
      drop.innerHTML = '<div class="search-empty">No users found</div>';
      return;
    }
    drop.innerHTML = users.map(u => `
      <div class="search-result-item" onclick="viewUserProfile('${u.id}')">
        <div class="sri-avatar">${u.avatar || '🎓'}</div>
        <div class="sri-info">
          <div class="sri-name">${escHtmlGlobal(u.name)}</div>
          <div class="sri-sub">${escHtmlGlobal(u.examPrep || 'Student')} · Joined ${new Date(u.joinedAt).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</div>
        </div>
      </div>
    `).join('');
  } catch(e) {
    drop.innerHTML = `<div class="search-empty">${e.message}</div>`;
  }
}

function viewUserProfile(userId) {
  const drop = document.getElementById('search-results-dropdown');
  if (drop) drop.classList.remove('show');
  showToast('Public profile coming soon!', 'info');
}

function escHtmlGlobal(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ══════════════════════════════════════
   PASSWORD EYE TOGGLE
══════════════════════════════════════ */
function initPasswordToggles() {
  document.querySelectorAll('.pw-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const inp = btn.previousElementSibling;
      if (!inp) return;
      const show = inp.type === 'password';
      inp.type = show ? 'text' : 'password';
      btn.textContent = show ? '🙈' : '👁️';
    });
  });
}

/* ══════════════════════════════════════
   PROFILE PRIVACY TOGGLES
══════════════════════════════════════ */
function initPrivacyToggles() {
  const togPublic   = document.getElementById('tog-public');
  const togOnline   = document.getElementById('tog-online');
  const togLastseen = document.getElementById('tog-lastseen');

  async function savePrivacy() {
    if (!token) return;
    try {
      await apiFetch('/api/auth/privacy', {
        method: 'PUT',
        body: JSON.stringify({
          isPublic:    togPublic?.checked,
          showOnline:  togOnline?.checked,
          showLastSeen:togLastseen?.checked
        })
      });
    } catch(e) {}
  }

  togPublic?.addEventListener('change', savePrivacy);
  togOnline?.addEventListener('change', savePrivacy);
  togLastseen?.addEventListener('change', savePrivacy);

  // Set initial state from userData
  if (userData) {
    if (togPublic)   togPublic.checked   = userData.isPublic    !== false;
    if (togOnline)   togOnline.checked   = userData.showOnline   !== false;
    if (togLastseen) togLastseen.checked = userData.showLastSeen !== false;
  }
}

/* ══════════════════════════════════════
   BIND EVENTS
══════════════════════════════════════ */
function bindEvents() {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(document.getElementById('l-email').value.trim(), document.getElementById('l-pass').value);
  });
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(
      document.getElementById('s-name').value.trim(),
      document.getElementById('s-email').value.trim(),
      document.getElementById('s-pass').value
    );
  });
  document.getElementById('g-open-btn')?.addEventListener('click', openBriefcase);
  document.getElementById('ghibli-stage')?.addEventListener('click', openBriefcase);
  document.getElementById('auth-modal').addEventListener('click', e => {
    if (e.target.id === 'auth-modal') closeAuth();
  });
  document.getElementById('btn-notif').addEventListener('click', loadNotifications);
  document.getElementById('btn-chat-top').addEventListener('click', openChatList);
  document.getElementById('top-avatar').addEventListener('click', () => {
    if (token) {
      ProfileModule.render();
      openSubScreen('screen-profile-panel');
    } else {
      openAuth('login');
    }
  });
  document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
    if (document.getElementById('delete-confirm-inp').value !== 'DELETE') {
      showToast('Type "DELETE" to confirm', 'error'); return;
    }
    try {
      await apiFetch('/api/auth/account', { method: 'DELETE' });
      showToast('Account deleted', 'info');
      doLogout();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });
}

/* ══════════════════════════════════════
   INIT
══════════════════════════════════════ */
async function init() {
  applyStoredPrefs();
  bindEvents();

  // Show session-expired message
  if (localStorage.getItem('vs_session_expired')) {
    localStorage.removeItem('vs_session_expired');
    setTimeout(() => showToast('Session expired. Please log in again.', 'warn'), 1800);
  }

  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
    } catch(e) {
      token = null; userData = null;
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_user');
    }
  }

  updateAuthUI();
  initPrivacyToggles();
  initPasswordToggles();
  initUserSearch();

  // Init all modules
  QuizModule.init();
  TypingModule.init();
  ChatModule.init();
  ProfileModule.init();
  GamesModule.init();

  loadStats();
  startGuestPing();
  setInterval(loadStats, 60000);

  // Notification badge
  if (token) {
    try {
      const d = await apiFetch('/api/notifications');
      const readIds = JSON.parse(localStorage.getItem('vs_read_notifs') || '[]');
      const u = (d.notifications || []).filter(n => !readIds.includes(n._id)).length;
      const b = document.getElementById('notif-badge');
      if (b && u > 0) { b.textContent = u; b.classList.remove('hidden'); }
    } catch(e) {}
  }

  // Push initial history state
  history.replaceState({ tab: 'home', type: 'tab' }, '', '#home');

  await new Promise(r => setTimeout(r, 1200));
  hideLoader();

  // Init loading particles
  const pw = document.getElementById('ld-particles-wrap');
  if (pw) {
    const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981'];
    for (let i = 0; i < 12; i++) {
      const p = document.createElement('div'); p.className = 'ld-p';
      const sz = Math.random() * 8 + 3;
      p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-duration:${Math.random() * 4 + 3}s;animation-delay:${Math.random() * 3}s`;
      pw.appendChild(p);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
