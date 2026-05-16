/* ═══════════════════════════════════════════════════
   VidyaSagar v3 — app.js (Core: Auth, Nav, Home, Stats)
═══════════════════════════════════════════════════ */
'use strict';

// ─── Global State ───
let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');
let chatPollInterval = null;

// ─── Helpers ───
async function apiFetch(path, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${VS_CONFIG.API}${path}`, { ...opts, headers: h });
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Server error');
  return d;
}

function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg; t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3200);
}

function hideLoader() {
  const ld = document.getElementById('vs-loading');
  const app = document.getElementById('app');
  ld.classList.add('out');
  app.classList.add('ready');
}

// ─── NAVIGATION ───
function switchTab(tab) {
  document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const scr = document.getElementById(`screen-${tab}`);
  const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (scr) scr.classList.add('active');
  if (btn) btn.classList.add('active');
  // Lazy load tab content
  if (tab === 'quiz' && !window._quizLoaded) { window._quizLoaded = true; QuizModule.loadSubjects(); }
  if (tab === 'typing' && !window._typingLoaded) { window._typingLoaded = true; TypingModule.loadExams(); }
  if (tab === 'profile') { ProfileModule.render(); }
}

function openSubScreen(id) {
  const s = document.getElementById(id);
  if (s) { s.classList.add('open'); }
}

function closeSubScreen(id) {
  const s = document.getElementById(id);
  if (s) s.classList.remove('open');
}

function openChatList() { openSubScreen('screen-chat-list'); }

// ─── AUTH UI ───
function updateAuthUI() {
  const topAv = document.getElementById('top-avatar');
  const profLogged = document.getElementById('profile-logged');
  const profNotLogged = document.getElementById('profile-not-logged');
  if (token && userData) {
    if (topAv) topAv.textContent = userData.avatar || userData.name?.[0]?.toUpperCase() || 'U';
    if (profLogged) profLogged.style.display = 'block';
    if (profNotLogged) profNotLogged.style.display = 'none';
  } else {
    if (topAv) topAv.textContent = '👤';
    if (profLogged) profLogged.style.display = 'none';
    if (profNotLogged) profNotLogged.style.display = 'block';
  }
}

// ─── AUTH MODAL ───
function openAuth(tab = 'login') {
  const m = document.getElementById('auth-modal');
  m.classList.remove('hidden');
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

// ─── GHIBLI BOY SCENE ───
let ghibliReady = false;
function initGhibliScene() {
  if (ghibliReady) return;
  ghibliReady = true;
  const stage = document.getElementById('ghibli-stage');
  const stars = document.getElementById('g-stars');
  if (!stars) return;
  // Generate stars
  for (let i = 0; i < 35; i++) {
    const s = document.createElement('div');
    s.className = 'g-star';
    const size = Math.random() * 2 + 1;
    s.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*60}%;animation-delay:${Math.random()*3}s;animation-duration:${Math.random()*2+2}s`;
    stars.appendChild(s);
  }
  const boy = document.getElementById('g-boy');
  // After walk animation ends, boy stops
  boy.addEventListener('animationend', () => { boy.classList.add('stopped'); }, { once: true });
}

function openBriefcase() {
  const boy = document.getElementById('g-boy');
  const hint = document.getElementById('g-scene-hint');
  const form = document.getElementById('signup-form-inner');
  const openBtn = document.getElementById('g-open-btn');
  boy.classList.add('opening');
  if (hint) hint.style.display = 'none';
  if (openBtn) openBtn.style.display = 'none';
  setTimeout(() => {
    if (form) form.classList.add('show');
    document.getElementById('s-name')?.focus();
  }, 700);
}

// ─── DO LOGIN ───
async function doLogin(email, password) {
  const btn = document.getElementById('l-btn');
  const err = document.getElementById('l-err');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeAuth();
    showToast(`Welcome back, ${userData.name}! 👋`, 'success');
    ProfileModule.render();
    loadStats();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = 'Log In'; btn.disabled = false; }
}

// ─── DO SIGNUP ───
async function doSignup(name, email, password) {
  const btn = document.getElementById('s-btn');
  const err = document.getElementById('s-err');
  btn.textContent = 'Creating…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeAuth();
    showCelebration();
    showToast(`Welcome, ${name}! 🚀`, 'success');
    ProfileModule.render();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = '🚀 Create My Account'; btn.disabled = false; }
}

// ─── LOGOUT ───
function doLogout() {
  const ov = document.getElementById('logout-overlay');
  ov.classList.add('show');
  token = null; userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  ChatModule.stopPolling();
  setTimeout(() => window.location.reload(), 2400);
}

// ─── CELEBRATE ───
function showCelebration() {
  const ov = document.getElementById('celebrate-ov');
  const wrap = document.getElementById('fp-wrap');
  ov.classList.remove('hidden');
  wrap.innerHTML = '';
  const colors = ['#3b82f6','#a855f7','#10b981','#f59e0b','#f43f5e','#22d3ee'];
  for (let i = 0; i < 38; i++) {
    const p = document.createElement('div');
    p.className = 'fp';
    const sz = Math.random() * 10 + 4;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;background:${colors[~~(Math.random()*colors.length)]};animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*1.5}s`;
    wrap.appendChild(p);
  }
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.classList.add('hidden'), 500); }, 2800);
}

// ─── STATS ───
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
  } catch(e) {
    ['stat-users','stat-quizzes','stat-live'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '—'; });
  }
}

// Guest ping
function startGuestPing() {
  if (token) return;
  let sid = sessionStorage.getItem('vs_sid');
  if (!sid) { sid = 'g_' + Math.random().toString(36).slice(2); sessionStorage.setItem('vs_sid', sid); }
  const ping = () => fetch(`${VS_CONFIG.API}/api/stats/ping`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({sessionId:sid}) }).catch(()=>{});
  ping(); setInterval(ping, 30000);
}

// ─── NOTIFICATIONS ───
async function loadNotifications() {
  openSubScreen('screen-notifications');
  const list = document.getElementById('notif-list');
  list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
  try {
    const d = await apiFetch('/api/notifications');
    const items = d.notifications || [];
    // Update badge
    const badge = document.getElementById('notif-badge');
    const unread = items.filter(n => !n.read).length;
    if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
    if (!items.length) { list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🔔</span>कोई notification नहीं</div>'; return; }
    list.innerHTML = '';
    items.forEach(n => {
      const d2 = new Date(n.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      const card = document.createElement('div');
      card.className = `notif-card${n.read ? '' : ' unread'}`;
      card.innerHTML = `<div class="notif-title">${n.title || 'Notification'}</div><div class="notif-body">${n.body || ''}</div><div class="notif-time">${d2}</div>`;
      list.appendChild(card);
    });
    // Mark all as read
    apiFetch('/api/notifications/read', { method:'PUT' }).catch(()=>{});
  } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
}

// ─── THEME, FONT, ZOOM ───
function applyTheme(theme, el) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const body = document.body;
  if (theme === 'light') body.setAttribute('data-theme','light');
  else if (theme === 'dark') body.removeAttribute('data-theme');
  else { // system
    const pref = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    if (pref === 'light') body.setAttribute('data-theme','light'); else body.removeAttribute('data-theme');
  }
  localStorage.setItem('vs_theme', theme);
  document.getElementById('sr-theme-val').textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
}

function applyFont(type, font, el) {
  const parent = el?.closest('.settings-list') || el?.closest('div');
  if (parent) parent.querySelectorAll('.font-opt').forEach(o => o.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const fontMap = { default: "'Plus Jakarta Sans','Noto Sans Devanagari',system-ui,sans-serif", syne:"'Syne',sans-serif", noto:"'Noto Sans Devanagari',sans-serif", arial:'Arial,sans-serif', georgia:'Georgia,serif', manga:"'Comic Sans MS',cursive", italic:'inherit', cursive:'cursive', mono:'monospace' };
  if (type === 'website') {
    document.body.style.fontFamily = fontMap[font] || fontMap.default;
    localStorage.setItem('vs_font_web', font);
    document.getElementById('sr-font-val').textContent = el?.querySelector('.fo-prev')?.textContent || font;
  } else {
    // Chat font stored and applied to chat elements
    localStorage.setItem('vs_font_chat', font);
    document.querySelectorAll('.chat-ta,.ai-inp,.chat-bub,.ai-bub').forEach(el2 => el2.style.fontFamily = fontMap[font] || fontMap.default);
    if (font === 'italic') document.querySelectorAll('.chat-ta,.chat-bub,.ai-bub').forEach(el2 => el2.style.fontStyle = 'italic');
  }
}

function applyZoom(type, val) {
  const pct = parseInt(val);
  if (type === 'website') {
    document.documentElement.style.fontSize = (pct / 100 * 15) + 'px';
    localStorage.setItem('vs_zoom_web', val);
    document.getElementById('zoom-website-label').textContent = `${pct}% — ${pct===100?'Default':pct<100?'Smaller':'Larger'}`;
    document.getElementById('sr-zoom-val').textContent = pct + '%';
  } else {
    document.querySelectorAll('.chat-ta,.chat-bub,.ai-bub').forEach(el => el.style.fontSize = (pct/100*14) + 'px');
    localStorage.setItem('vs_zoom_chat', val);
    document.getElementById('zoom-chat-label').textContent = `${pct}%`;
  }
}

function setChatBg(bg, el) {
  document.querySelectorAll('.cbg-card').forEach(c => c.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const msgsEl = document.getElementById('group-msgs');
  if (!msgsEl) return;
  if (bg === 'default') msgsEl.style.background = '#0b141a';
  else msgsEl.style.background = el?.style.background || '#0b141a';
  localStorage.setItem('vs_chat_bg', bg);
}

function uploadChatBg(inp) {
  const file = inp.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    localStorage.setItem('vs_chat_bg_custom', url);
    const msgsEl = document.getElementById('group-msgs');
    if (msgsEl) { msgsEl.style.background = `url(${url}) center/cover no-repeat`; }
    document.querySelectorAll('.cbg-card').forEach(c => c.classList.remove('sel'));
    showToast('Background set! ✅', 'success');
  };
  reader.readAsDataURL(file);
}

// ─── APPLY SAVED PREFERENCES ───
function applyStoredPrefs() {
  const theme = localStorage.getItem('vs_theme');
  if (theme) { const card = document.querySelector(`.theme-card[data-theme="${theme}"]`); applyTheme(theme, card); }
  const fontWeb = localStorage.getItem('vs_font_web');
  if (fontWeb) { const el = document.querySelector(`.font-opt[data-font="${fontWeb}"]`); if (el) applyFont('website', fontWeb, el); }
  const fontChat = localStorage.getItem('vs_font_chat');
  if (fontChat) applyFont('chat', fontChat, null);
  const zoomWeb = localStorage.getItem('vs_zoom_web');
  if (zoomWeb) { const sl = document.getElementById('zoom-website'); if(sl) sl.value = zoomWeb; applyZoom('website', zoomWeb); }
  const zoomChat = localStorage.getItem('vs_zoom_chat');
  if (zoomChat) { const sl = document.getElementById('zoom-chat'); if(sl) sl.value = zoomChat; applyZoom('chat', zoomChat); }
}

// ─── BIND EVENTS ───
function bindEvents() {
  // Auth modal
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(document.getElementById('l-email').value.trim(), document.getElementById('l-pass').value);
  });
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(document.getElementById('s-name').value.trim(), document.getElementById('s-email').value.trim(), document.getElementById('s-pass').value);
  });
  document.getElementById('g-open-btn').addEventListener('click', openBriefcase);
  document.getElementById('ghibli-stage').addEventListener('click', openBriefcase);
  document.getElementById('auth-modal').addEventListener('click', e => { if (e.target === document.getElementById('auth-modal')) closeAuth(); });

  // Top bar actions
  document.getElementById('btn-notif').addEventListener('click', loadNotifications);
  document.getElementById('btn-chat-top').addEventListener('click', openChatList);
  document.getElementById('top-avatar').addEventListener('click', () => {
    if (token) switchTab('profile'); else openAuth('login');
  });

  // Delete account confirm
  document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
    const inp = document.getElementById('delete-confirm-inp').value;
    if (inp !== 'DELETE') { showToast('"DELETE" type करें', 'error'); return; }
    try {
      await apiFetch('/api/auth/account', { method: 'DELETE' });
      showToast('Account deleted', 'info');
      doLogout();
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  });

  // Save profile
  document.getElementById('btn-save-profile')?.addEventListener('click', ProfileModule.saveInfo);

  // Change password
  document.getElementById('btn-change-pw')?.addEventListener('click', ProfileModule.changePassword);
}

// ─── INIT ───
async function init() {
  applyStoredPrefs();
  bindEvents();

  // Verify token
  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
    } catch(e) {
      token = null; userData = null;
      localStorage.removeItem('vs_token'); localStorage.removeItem('vs_user');
    }
  }

  updateAuthUI();

  // Initialize modules
  QuizModule.init();
  TypingModule.init();
  ChatModule.init();
  ProfileModule.init();

  // Load home data
  loadStats();
  startGuestPing();
  setInterval(loadStats, 60000);

  // Check for unread notifications
  if (token) {
    try {
      const d = await apiFetch('/api/notifications');
      const unread = (d.notifications || []).filter(n => !n.read).length;
      const badge = document.getElementById('notif-badge');
      if (badge && unread > 0) { badge.textContent = unread; badge.classList.remove('hidden'); }
    } catch(e) {}
  }

  await new Promise(r => setTimeout(r, 1500));
  hideLoader();
}

document.addEventListener('DOMContentLoaded', init);
