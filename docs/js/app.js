/* VidyaSagar v5 — app.js FUTURISTIC UPGRADE */
'use strict';

// FIX: Telegram ke "Watch Online" se ?watch=<token> ke saath aane wala deep
// link - isse SABSE PEHLE, script load hote hi capture karte hain (init()
// ke end tak WAIT nahi karte). Pehle ye init() ke bilkul end mein padha
// jaata tha, jab tak wahan pahunchte-pahunchte (QuizModule.init(),
// ChatModule.init(), history.replaceState(), waghera) beech mein URL ka
// query-string kho jaata tha - isliye Player tab tak kabhi pahunchta hi
// nahi tha, seedha Home reh jaata tha. Ab is line ke chalte, baad mein
// URL ke saath kuch bhi ho, humare paas token pehle se surakshit hai.
const _deepLinkWatchToken = new URLSearchParams(window.location.search).get('watch');

let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');

/* ── Auto-logout: 10 din inactivity ── */
const INACTIVE_LIMIT = 10 * 24 * 60 * 60 * 1000;
(function () {
  const last = parseInt(localStorage.getItem('vs_last_active') || '0');
  if (last && token && Date.now() - last > INACTIVE_LIMIT) {
    token = null; userData = null;
    localStorage.removeItem('vs_token');
    localStorage.removeItem('vs_user');
    localStorage.setItem('vs_session_expired', '1');
  }
})();
function touchActivity() {
  if (token) localStorage.setItem('vs_last_active', String(Date.now()));
}
touchActivity();
document.addEventListener('click', touchActivity, { passive: true });
document.addEventListener('keydown', touchActivity, { passive: true });

/* ── API Fetch ── */
async function apiFetch(path, opts = {}) {
  const h = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (token) h['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${VS_CONFIG.API}${path}`, { ...opts, headers: h });
  const d = await res.json();
  if (!res.ok) throw new Error(d.message || 'Error');
  return d;
}

/* ── Toast — futuristic with icons ── */
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  const icons = { success: '✅', error: '❌', info: '💡', warn: '⚠️' };
  const icon = icons[type] || icons.info;
  t.innerHTML = `<span>${icon}</span> ${msg}`;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.add('hidden'), 3400);
}

/* ── Loader ── */
function hideLoader() {
  document.getElementById('vs-loading').classList.add('out');
  document.getElementById('app').classList.add('ready');
}

/* ══════════════════════════════════════
   NAVIGATION
══════════════════════════════════════ */
let _subStack = [];

function switchTab(tab) {
  document.querySelectorAll('.sub-screen.open').forEach(s => s.classList.remove('open'));
  _subStack = [];
  ChatModule.stopPolling();
  document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const scr = document.getElementById(`screen-${tab}`);
  const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (scr) scr.classList.add('active');
  if (btn) btn.classList.add('active');
  if (tab === 'quiz' && !window._qLoaded) { window._qLoaded = true; QuizModule.loadSubjects(); }
  if (tab === 'typing' && !window._tLoaded) { window._tLoaded = true; TypingModule.loadExams(); }
  if (tab === 'player' && !window._plLoaded) { window._plLoaded = true; PlayerModule.loadCatalog(); }
  history.pushState({ tab, type: 'tab' }, '', `#${tab}`);
  // Futuristic nav ripple
  if (btn) {
    btn.style.transform = 'scale(.92)';
    setTimeout(() => btn.style.transform = '', 150);
  }
}

function openSubScreen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('open');
  _subStack.push(id);
  history.pushState({ id, type: 'sub' }, '', '#s');
  setTimeout(() => { el.scrollTop = 0; }, 30);
}

function closeSubScreen(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('open');
  const i = _subStack.lastIndexOf(id);
  if (i !== -1) _subStack.splice(i, 1);
  // Some screens run background polling that must stop no matter how the screen closes
  // (explicit back arrow, hardware/ESC back, or switching tabs) — not just their own button.
  if (id === 'screen-dm-thread') window.SocialModule?.stopDmPolling?.();
  if (id === 'screen-online-game') window.OnlineGames?.stopPolling?.();
}

function _closeTopSub() {
  if (_subStack.length > 0) {
    closeSubScreen(_subStack[_subStack.length - 1]);
    return true;
  }
  return false;
}

window.addEventListener('popstate', () => {
  if (_closeTopSub()) return;
  const activeTab = document.querySelector('.nav-tab.active')?.dataset.tab;
  if (activeTab && activeTab !== 'home') { switchTab('home'); return; }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') _closeTopSub();
});

function openChatList() { openSubScreen('screen-chat-list'); }

/* ══════════════════════════════════════
   AUTH UI
══════════════════════════════════════ */
function updateAuthUI() {
  const av = document.getElementById('top-avatar');
  if (token && userData) {
    if (av) {
      if (userData.photo) {
        av.innerHTML = `<img src="${userData.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
      } else {
        av.textContent = userData.avatar || (userData.name?.[0]?.toUpperCase() || 'U');
      }
      av.style.background = 'linear-gradient(135deg,var(--blue),var(--purple))';
    }
  } else {
    if (av) av.textContent = '👤';
  }
}

function openAuth(tab = 'login') {
  document.getElementById('auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
  if (tab === 'signup') setTimeout(initGhibliScene, 100);
}
function closeAuth() { document.getElementById('auth-modal').classList.add('hidden'); }
function switchAuthTab(tab) {
  document.getElementById('login-panel').classList.toggle('hidden', tab !== 'login');
  document.getElementById('signup-panel').classList.toggle('hidden', tab !== 'signup');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  if (tab === 'signup') initGhibliScene();
}

/* ── Ghibli Scene ── */
let gReady = false, gOpen = false;
function initGhibliScene() {
  if (gReady) return; gReady = true;
  const stars = document.getElementById('g-stars');
  if (!stars) return;
  for (let i = 0; i < 42; i++) {
    const s = document.createElement('div'); s.className = 'g-star';
    const sz = Math.random() * 2.8 + .4;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;top:${Math.random() * 65}%;animation-delay:${Math.random() * 4}s;animation-duration:${Math.random() * 2 + 2}s`;
    stars.appendChild(s);
  }
}
function openBriefcase() {
  if (gOpen) return; gOpen = true;
  const openBtn = document.getElementById('g-open-btn');
  const form = document.getElementById('signup-form-inner');
  const stage = document.getElementById('ghibli-stage');
  const hint = document.getElementById('g-scene-hint');
  if (hint) hint.style.opacity = '0';
  if (openBtn) { openBtn.style.opacity = '0'; openBtn.style.pointerEvents = 'none'; }
  setTimeout(() => {
    if (stage) { stage.style.height = '90px'; stage.style.transition = 'height .4s ease'; }
    setTimeout(() => {
      if (form) form.classList.add('show');
      document.getElementById('s-name')?.focus();
    }, 420);
  }, 600);
}

/* ── Login / Signup / Logout ── */
async function doLogin(email, password) {
  const btn = document.getElementById('l-btn'), err = document.getElementById('l-err');
  btn.textContent = '⏳ Logging in…'; btn.disabled = true; err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    touchActivity();
    updateAuthUI(); closeAuth();
    showToast(`Welcome back, ${userData.name}! 👋`, 'success');
    loadStats();
    ProfileModule.render();
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = 'Log In'; btn.disabled = false; }
}

async function doSignup(name, email, password) {
  const btn = document.getElementById('s-btn'), err = document.getElementById('s-err');
  btn.textContent = '⏳ Creating…'; btn.disabled = true; err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email, password }) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    touchActivity();
    updateAuthUI(); closeAuth(); showCelebration();
    showToast(`Welcome, ${name}! 🚀`, 'success');
  } catch (e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = '🚀 Create Account'; btn.disabled = false; }
}

function doLogout() {
  document.getElementById('logout-overlay').classList.add('show');
  token = null; userData = null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  localStorage.removeItem('vs_last_active');
  ChatModule.stopPolling();
  setTimeout(() => window.location.reload(), 2600);
}

/* ── Celebration ── */
function showCelebration() {
  const ov = document.getElementById('celebrate-ov'), wrap = document.getElementById('fp-wrap');
  ov.classList.remove('hidden'); wrap.innerHTML = '';
  const colors = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b', '#f43f5e', '#22d3ee', '#f97316', '#ec4899'];
  for (let i = 0; i < 50; i++) {
    const p = document.createElement('div'); p.className = 'fp';
    const sz = Math.random() * 12 + 4;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;background:${colors[~~(Math.random() * colors.length)]};animation-duration:${Math.random() * 3 + 2}s;animation-delay:${Math.random() * 1.8}s;border-radius:${Math.random() > 0.5 ? '50%' : '3px'}`;
    wrap.appendChild(p);
  }
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.classList.add('hidden'), 500); }, 3000);
}

/* ── Theme / Font / Zoom ── */
function applyTheme(theme, el) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const root = document.documentElement; root.removeAttribute('data-theme');
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
  syne: "'Syne',sans-serif", noto: "'Noto Sans Devanagari',sans-serif",
  arial: 'Arial,sans-serif', georgia: 'Georgia,serif',
  manga: "'Comic Sans MS',cursive", cursive: 'cursive', mono: 'monospace'
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
  const bgMap = {
    default: '', nature: 'linear-gradient(135deg,#1a4a1a,#0d4a2a)',
    space: 'linear-gradient(135deg,#060d1f,#1a0a3a)',
    sunset: 'linear-gradient(135deg,#4a1a0d,#2a0a1a)',
    ocean: 'linear-gradient(135deg,#0a2a4a,#0a1a3a)'
  };
  msgs.style.background = bgMap[bg] || el?.style.background || '';
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
  const zw = localStorage.getItem('vs_zoom_web'); if (zw) { const s = document.getElementById('zoom-website'); if (s) s.value = zw; applyZoom('website', zw); }
  const zc = localStorage.getItem('vs_zoom_chat'); if (zc) { const s = document.getElementById('zoom-chat'); if (s) s.value = zc; applyZoom('chat', zc); }
}

/* ── Stats with animated counter ── */
function animateNum(el, target) {
  if (!el) return;
  const dur = 1200, st = performance.now();
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
    animateNum(document.getElementById('stat-users'),   d.totalUsers   || 0);
    animateNum(document.getElementById('stat-quizzes'), d.totalQuizzes || 0);
    animateNum(document.getElementById('stat-live'),   (d.liveGuests  || 0) + 1);
    animateNum(document.getElementById('stat-users2'),  d.totalUsers   || 0);
    animateNum(document.getElementById('stat-live2'),  (d.liveGuests  || 0) + 1);
    animateNum(document.getElementById('stat-q2'),      d.totalQuizzes || 0);
  } catch (e) {
    // Silently fail — stats are non-critical; set visible defaults
    ['stat-users','stat-users2'].forEach(id => { const el = document.getElementById(id); if(el && el.textContent==='0') el.textContent = '—'; });
  }
}
function startGuestPing() {
  if (token) return;
  let sid = sessionStorage.getItem('vs_sid');
  if (!sid) { sid = 'g_' + Math.random().toString(36).slice(2); sessionStorage.setItem('vs_sid', sid); }
  const ping = () => fetch(`${VS_CONFIG.API}/api/stats/ping`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) }).catch(() => { });
  ping(); setInterval(ping, 30000);
}

/* ── Notifications ── */
async function loadNotifications() {
  openSubScreen('screen-notifications');
  const list = document.getElementById('notif-list');
  list.innerHTML = '<div class="vs-loading-text">🔔 Loading notifications…</div>';
  try {
    const d = await apiFetch('/api/notifications');
    const items = d.notifications || [];
    const readIds = JSON.parse(localStorage.getItem('vs_read_notifs') || '[]');
    const unread = items.filter(n => !readIds.includes(String(n._id))).length;
    const badge = document.getElementById('notif-badge');
    if (badge) { badge.textContent = unread; badge.classList.toggle('hidden', unread === 0); }
    if (!items.length) {
      list.innerHTML = '<div class="vs-empty"><span class="ve-icon">🔔</span>No notifications yet</div>';
      return;
    }
    list.innerHTML = '';
    items.forEach(n => {
      const d2 = new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const isRead = readIds.includes(String(n._id));
      const card = document.createElement('div');
      card.className = `notif-card${isRead ? '' : ' unread'}${n.pinned ? ' pinned' : ''}`;
      card.innerHTML = `<div class="notif-title">${n.pinned ? '📌 ' : ''}${n.title}</div><div class="notif-body">${n.body}</div><div class="notif-date">${d2}</div>`;
      list.appendChild(card);
    });
    const allIds = items.map(n => String(n._id));
    localStorage.setItem('vs_read_notifs', JSON.stringify(allIds));
    if (badge) badge.classList.add('hidden');
    apiFetch('/api/notifications/read', { method: 'PUT' }).catch(() => { });
  } catch (e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
}


/* ── Game Tab Switcher ── */
function switchGameTab(panel, btn) {
  document.querySelectorAll('.gtab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.game-panel').forEach(p => p.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById(`gpanel-${panel}`);
  if (el) el.classList.add('active');
  if (panel === 'ranks') loadInlineLeaderboard();
}

async function loadInlineLeaderboard() {
  const list = document.getElementById('inline-leaderboard-list');
  if (!list) return;
  list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
  try {
    const d = await apiFetch('/api/game/leaderboard/top');
    const lb = d.leaderboard || [];
    const medals = ['🥇','🥈','🥉'];
    if (!lb.length) {
      list.innerHTML = '<div class="vs-empty" style="padding:30px 0"><span class="ve-icon">🏆</span>कोई ranking नहीं।<br>Online games खेलें!</div>';
      return;
    }
    list.innerHTML = lb.map((p, i) => `
      <div class="lb-row ${i < 3 ? 'top3' : ''}">
        <div class="lb-rank">${medals[i] || '#'+(i+1)}</div>
        <div class="lb-av">${p.avatar || '🎓'}</div>
        <div class="lb-info"><div class="lb-name">${_escH(p.name)}</div><div class="lb-sub">${p.wins}W · ${p.losses}L · ${p.draws}D</div></div>
        <div class="lb-pts"><span>${p.points}</span><small>pts</small></div>
      </div>`).join('');
  } catch(e) {
    list.innerHTML = '<div class="vs-empty" style="padding:30px 0"><span class="ve-icon">🏆</span>कोई ranking नहीं।<br>Online games खेलें!</div>';
  }
}

/* ── Search History ── */
const SEARCH_HIST_KEY = 'vs_search_hist';
function saveSearchQuery(q) {
  if (!q || q.length < 2) return;
  let h = JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || '[]');
  h = [q, ...h.filter(x => x !== q)].slice(0, 20);
  localStorage.setItem(SEARCH_HIST_KEY, JSON.stringify(h));
}
window.clearSearchHistory = function() {
  localStorage.removeItem(SEARCH_HIST_KEY);
  renderSearchHistory();
  showToast('Search history cleared', 'info');
};
function renderSearchHistory() {
  const list = document.getElementById('search-hist-list');
  if (!list) return;
  const h = JSON.parse(localStorage.getItem(SEARCH_HIST_KEY) || '[]');
  if (!h.length) {
    list.innerHTML = '<div class="vs-empty">कोई recent search नहीं</div>';
    return;
  }
  list.innerHTML = h.map(q => `
    <div class="sh-row" onclick="applySearchFromHistory('${q.replace(/'/g,"\'")}')">
      <span class="sh-icon">🔍</span>
      <span class="sh-text">${q}</span>
      <span class="sh-arrow">→</span>
    </div>`).join('');
}
window.applySearchFromHistory = function(q) {
  const inp = document.getElementById('user-search-inp');
  if (inp) { inp.value = q; inp.dispatchEvent(new Event('input')); }
  closeSubScreen('screen-search-history');
};
window.openSearchHistory = function() {
  openSubScreen('screen-search-history');
  renderSearchHistory();
};
window.switchGameTab = switchGameTab;

/* ── User Search ── */
let _searchTimer = null;
function initUserSearch() {
  const inp = document.getElementById('user-search-inp');
  const drop = document.getElementById('search-results-dropdown');
  const clearBtn = document.getElementById('search-clear-btn');
  if (!inp || !drop) return;
  inp.addEventListener('input', () => {
    const q = inp.value.trim();
    if (clearBtn) clearBtn.style.display = q ? 'block' : 'none';
    clearTimeout(_searchTimer);
    if (!q || q.length < 2) { drop.style.display = 'none'; return; }
    _searchTimer = setTimeout(() => doUserSearch(q), 320);
  });
  inp.addEventListener('blur', () => { setTimeout(() => { drop.style.display = 'none'; }, 200); });
}
window.clearSearch = function () {
  const inp = document.getElementById('user-search-inp');
  const drop = document.getElementById('search-results-dropdown');
  const cb = document.getElementById('search-clear-btn');
  if (inp) inp.value = '';
  if (drop) drop.style.display = 'none';
  if (cb) cb.style.display = 'none';
};
async function doUserSearch(q) {
  const drop = document.getElementById('search-results-dropdown');
  if (!drop) return;
  drop.innerHTML = '<div style="padding:14px;text-align:center;color:var(--text3);font-size:.82rem">🔍 Searching…</div>';
  drop.style.display = 'block';
  try {
    saveSearchQuery(q);
    const d = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`);
    const users = d.users || [];
    if (!users.length) { drop.innerHTML = '<div style="padding:14px;text-align:center;color:var(--text3);font-size:.82rem">No students found</div>'; return; }
    drop.innerHTML = users.map(u => `
      <div style="display:flex;align-items:center;gap:11px;padding:12px 14px;cursor:pointer;border-bottom:1px solid var(--border);transition:background .15s" onmouseover="this.style.background='rgba(59,130,246,.08)'" onmouseout="this.style.background=''" onclick="openUserProfile('${u.id}')">
        <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg,var(--blue),var(--purple));display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0;overflow:hidden">${u.photo ? `<img src="${u.photo}" style="width:100%;height:100%;object-fit:cover">` : (u.avatar || '🎓')}</div>
        <div>
          <div style="font-weight:700;font-size:.88rem">${_escH(u.name)}</div>
          <div style="font-size:.72rem;color:var(--text3)">${u.username ? '@'+_escH(u.username) : _escH(u.examPrep || 'Student')}</div>
        </div>
      </div>`).join('');
  } catch (e) { drop.innerHTML = `<div style="padding:14px;text-align:center;color:var(--rose);font-size:.82rem">${e.message}</div>`; }
}
function _escH(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

/* ── Password Toggle ── */
window.togglePw = function (id, btn) {
  const inp = document.getElementById(id); if (!inp) return;
  const show = inp.type === 'password';
  inp.type = show ? 'text' : 'password';
  btn.textContent = show ? '🙈' : '👁️';
};

/* ── Bind Events ── */
function bindEvents() {
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(document.getElementById('l-email').value.trim(), document.getElementById('l-pass').value);
  });
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(document.getElementById('s-name').value.trim(), document.getElementById('s-email').value.trim(), document.getElementById('s-pass').value);
  });
  document.getElementById('g-open-btn')?.addEventListener('click', openBriefcase);
  document.getElementById('ghibli-stage')?.addEventListener('click', openBriefcase);
  document.getElementById('auth-modal').addEventListener('click', e => { if (e.target.id === 'auth-modal') closeAuth(); });
  document.getElementById('btn-notif').addEventListener('click', loadNotifications);
  document.getElementById('btn-chat-top').addEventListener('click', openChatList);
  document.getElementById('top-avatar').addEventListener('click', () => {
    if (token) { ProfileModule.render(); openSubScreen('screen-profile-panel'); }
    else openAuth('login');
  });
  document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
    if (document.getElementById('delete-confirm-inp').value !== 'DELETE') { showToast('Type "DELETE" to confirm', 'error'); return; }
    try { await apiFetch('/api/auth/account', { method: 'DELETE' }); showToast('Account deleted', 'info'); doLogout(); }
    catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  ['tog-public', 'tog-online', 'tog-lastseen'].forEach(id => {
    document.getElementById(id)?.addEventListener('change', async () => {
      if (!token) return;
      try {
        await apiFetch('/api/auth/privacy', {
          method: 'PUT',
          body: JSON.stringify({
            isPublic: document.getElementById('tog-public')?.checked,
            showOnline: document.getElementById('tog-online')?.checked,
            showLastSeen: document.getElementById('tog-lastseen')?.checked
          })
        });
      } catch (e) { }
    });
  });
}

/* ── Loading Particles ── */
function spawnParticles() {
  const pw = document.getElementById('ld-particles-wrap');
  if (!pw) return;
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
  for (let i = 0; i < 16; i++) {
    const p = document.createElement('div'); p.className = 'ld-p';
    const sz = Math.random() * 8 + 3;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;background:${colors[i % colors.length]};animation-duration:${Math.random() * 4 + 3}s;animation-delay:${Math.random() * 3}s;border-radius:${Math.random() > 0.5 ? '50%' : '3px'}`;
    pw.appendChild(p);
  }
}

/* ── INIT ── */
async function init() {
  spawnParticles();
  applyStoredPrefs();
  bindEvents();

  if (localStorage.getItem('vs_session_expired')) {
    localStorage.removeItem('vs_session_expired');
    setTimeout(() => showToast('Session expired. Please log in again.', 'info'), 1800);
  }

  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user;
      localStorage.setItem('vs_user', JSON.stringify(userData));
    } catch (e) {
      token = null; userData = null;
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_user');
    }
  }

  updateAuthUI();
  initUserSearch();

  QuizModule.init();
  TypingModule.init();
  ChatModule.init();
  ProfileModule.init();
  GamesModule.init();
  SocialModule.init();

  // FIX: bind typing submit button
  document.getElementById('btn-typing-submit-main')?.addEventListener('click', () => {
    if (window.TypingModule && typeof TypingModule.submitEarly === 'function') {
      TypingModule.submitEarly();
    }
  });

  loadStats();
  startGuestPing();
  setInterval(loadStats, 60000);

  if (token) {
    try {
      const d = await apiFetch('/api/notifications');
      const readIds = JSON.parse(localStorage.getItem('vs_read_notifs') || '[]');
      const u = (d.notifications || []).filter(n => !readIds.includes(String(n._id))).length;
      const b = document.getElementById('notif-badge');
      if (b && u > 0) { b.textContent = u; b.classList.remove('hidden'); }
    } catch (e) { }
  }

  history.replaceState({ tab: 'home', type: 'tab' }, '', '#home');
  await new Promise(r => setTimeout(r, 1100));
  hideLoader();

  if (_deepLinkWatchToken) {
    console.log('[Player] deep-link watch token mila:', _deepLinkWatchToken, '| PlayerModule ready:', !!window.PlayerModule);
    if (window.PlayerModule) {
      switchTab('player');
      PlayerModule.openDirectToken(_deepLinkWatchToken);
    }
  }
}

document.addEventListener('DOMContentLoaded', init);
