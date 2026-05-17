/* ═══════════════════════════════════════════════════
   VidyaSagar v3 — app.js FIXED
   Fixes: tab navigation, sub-screen overlap,
          theme/font toast, light theme support
═══════════════════════════════════════════════════ */
'use strict';

let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');
let chatPollInterval = null;

/* ─── API helper ─── */
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
  t._t = setTimeout(() => t.classList.add('hidden'), 3000);
}

function hideLoader() {
  document.getElementById('vs-loading').classList.add('out');
  document.getElementById('app').classList.add('ready');
}

/* ═════════════════════════════════════════════════
   NAVIGATION  ← KEY FIX
   switchTab closes ALL open sub-screens first
═════════════════════════════════════════════════ */
function switchTab(tab) {
  // 1. Close every open sub-screen
  document.querySelectorAll('.sub-screen.open').forEach(s => s.classList.remove('open'));

  // 2. Stop chat polling when leaving chat
  if (tab !== 'chat') ChatModule.stopPolling();

  // 3. Activate new tab
  document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  const scr = document.getElementById(`screen-${tab}`);
  const btn = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
  if (scr) scr.classList.add('active');
  if (btn) btn.classList.add('active');

  // 4. Lazy-load tab content
  if (tab === 'quiz'    && !window._quizLoaded)   { window._quizLoaded   = true; QuizModule.loadSubjects(); }
  if (tab === 'typing'  && !window._typingLoaded) { window._typingLoaded = true; TypingModule.loadExams(); }
  if (tab === 'profile') ProfileModule.render();
}

/* Only one sub-screen open at a time */
function openSubScreen(id) {
  // Close all others at same z-level (don't close nested ones like settings on top of profile)
  const target = document.getElementById(id);
  if (!target) return;
  // Only close siblings, not parent
  target.classList.add('open');
}

function closeSubScreen(id) {
  const s = document.getElementById(id);
  if (s) s.classList.remove('open');
}

function openChatList() { openSubScreen('screen-chat-list'); }

/* ═════════════════════════════════════════════════
   AUTH UI
═════════════════════════════════════════════════ */
function updateAuthUI() {
  const topAv = document.getElementById('top-avatar');
  const pL = document.getElementById('profile-logged');
  const pN = document.getElementById('profile-not-logged');
  if (token && userData) {
    if (topAv) topAv.textContent = userData.avatar || userData.name?.[0]?.toUpperCase() || 'U';
    if (pL) pL.style.display = 'block';
    if (pN) pN.style.display = 'none';
  } else {
    if (topAv) topAv.textContent = '👤';
    if (pL) pL.style.display = 'none';
    if (pN) pN.style.display = 'block';
  }
}

/* ── Auth modal ── */
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

/* ═════════════════════════════════════════════════
   GHIBLI BOY ANIMATION (improved)
═════════════════════════════════════════════════ */
let ghibliReady = false, ghibliBriefcaseOpen = false;

function initGhibliScene() {
  if (ghibliReady) return;
  ghibliReady = true;
  // Generate stars
  const stars = document.getElementById('g-stars');
  if (!stars) return;
  for (let i = 0; i < 40; i++) {
    const s = document.createElement('div');
    s.className = 'g-star';
    const sz = Math.random() * 2.5 + 0.5;
    s.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;top:${Math.random()*65}%;animation-delay:${Math.random()*4}s;animation-duration:${Math.random()*2+2}s`;
    stars.appendChild(s);
  }
  // After walk animation ends (2.4s), boy stops
  const boy = document.getElementById('g-boy');
  if (boy) {
    boy.addEventListener('animationend', () => {
      boy.classList.add('stopped');
      // Show click hint
      const hint = document.getElementById('g-scene-hint');
      if (hint) hint.style.opacity = '1';
    }, { once: true });
  }
}

function openBriefcase() {
  if (ghibliBriefcaseOpen) return;
  ghibliBriefcaseOpen = true;
  const boy = document.getElementById('g-boy');
  const hint = document.getElementById('g-scene-hint');
  const openBtn = document.getElementById('g-open-btn');
  const form = document.getElementById('signup-form-inner');
  const stage = document.getElementById('ghibli-stage');

  if (boy) boy.classList.add('opening');
  if (hint) hint.style.opacity = '0';
  if (openBtn) { openBtn.style.opacity = '0'; openBtn.style.pointerEvents = 'none'; }

  // Shrink stage and show form
  setTimeout(() => {
    if (stage) { stage.style.height = '120px'; stage.style.transition = 'height .4s ease'; }
    setTimeout(() => {
      if (form) form.classList.add('show');
      document.getElementById('s-name')?.focus();
    }, 400);
  }, 800);
}

/* ── Login ── */
async function doLogin(email, password) {
  const btn = document.getElementById('l-btn');
  const err = document.getElementById('l-err');
  btn.textContent = 'Logging in…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/login', { method:'POST', body:JSON.stringify({email,password}) });
    token = d.token; userData = d.user;
    localStorage.setItem('vs_token', token);
    localStorage.setItem('vs_user', JSON.stringify(userData));
    updateAuthUI(); closeAuth();
    showToast(`Welcome back, ${userData.name}! 👋`, 'success');
    ProfileModule.render(); loadStats();
  } catch(e) { err.textContent = e.message; err.classList.remove('hidden'); }
  finally { btn.textContent = 'Log In'; btn.disabled = false; }
}

/* ── Signup ── */
async function doSignup(name, email, password) {
  const btn = document.getElementById('s-btn');
  const err = document.getElementById('s-err');
  btn.textContent = 'Creating…'; btn.disabled = true;
  err.classList.add('hidden');
  try {
    const d = await apiFetch('/api/auth/signup', { method:'POST', body:JSON.stringify({name,email,password}) });
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

/* ── Logout ── */
function doLogout() {
  const ov = document.getElementById('logout-overlay');
  ov.classList.add('show');
  token = null; userData = null;
  localStorage.removeItem('vs_token'); localStorage.removeItem('vs_user');
  ChatModule.stopPolling();
  setTimeout(() => window.location.reload(), 2400);
}

/* ── Celebrate ── */
function showCelebration() {
  const ov = document.getElementById('celebrate-ov');
  const wrap = document.getElementById('fp-wrap');
  ov.classList.remove('hidden');
  wrap.innerHTML = '';
  const colors = ['#3b82f6','#a855f7','#10b981','#f59e0b','#f43f5e','#22d3ee','#fff'];
  for (let i = 0; i < 40; i++) {
    const p = document.createElement('div'); p.className = 'fp';
    const sz = Math.random()*10+4;
    p.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random()*100}%;background:${colors[~~(Math.random()*colors.length)]};animation-duration:${Math.random()*3+2}s;animation-delay:${Math.random()*1.5}s`;
    wrap.appendChild(p);
  }
  setTimeout(() => { ov.classList.add('out'); setTimeout(() => ov.classList.add('hidden'), 500); }, 2800);
}

/* ═════════════════════════════════════════════════
   THEME / FONT / ZOOM  ← FIXED: show toast
═════════════════════════════════════════════════ */
function applyTheme(theme, el) {
  document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  const body = document.documentElement; // use :root for cleaner variable overrides
  body.removeAttribute('data-theme');
  if (theme === 'light') body.setAttribute('data-theme','light');
  else if (theme === 'system') {
    if (!window.matchMedia('(prefers-color-scheme: dark)').matches)
      body.setAttribute('data-theme','light');
  }
  localStorage.setItem('vs_theme', theme);
  const label = theme === 'dark' ? '🌙 Dark' : theme === 'light' ? '☀️ Light' : '📱 System';
  const el2 = document.getElementById('sr-theme-val');
  if (el2) el2.textContent = label;
  showToast(`Theme changed to ${label} ✅`, 'success'); // ← ADDED TOAST
}

const FONT_MAP = {
  default:  "'Plus Jakarta Sans','Noto Sans Devanagari',system-ui,sans-serif",
  syne:     "'Syne',sans-serif", noto:"'Noto Sans Devanagari',sans-serif",
  arial:    'Arial,sans-serif', georgia:'Georgia,serif',
  manga:    "'Comic Sans MS',cursive", italic:'inherit',
  cursive:  'cursive', mono:"'Courier New',monospace"
};

function applyFont(type, font, el) {
  // Update active state within same font list only
  const list = el?.closest('[style*="overflow:hidden"]') || el?.parentElement;
  if (list) list.querySelectorAll('.font-opt').forEach(o => o.classList.remove('sel'));
  if (el) el.classList.add('sel');

  const ff = FONT_MAP[font] || FONT_MAP.default;
  if (type === 'website') {
    document.body.style.fontFamily = ff;
    localStorage.setItem('vs_font_web', font);
    const lbl = el?.querySelector('.fo-prev')?.textContent || font;
    const srEl = document.getElementById('sr-font-val');
    if (srEl) srEl.textContent = lbl;
    showToast(`Website font: ${lbl} ✅`, 'success'); // ← TOAST
  } else {
    localStorage.setItem('vs_font_chat', font);
    document.querySelectorAll('.chat-ta,.ai-inp,.chat-bub,.ai-bub').forEach(e2 => {
      e2.style.fontFamily = ff;
      e2.style.fontStyle = font === 'italic' ? 'italic' : '';
    });
    showToast(`Chat font changed ✅`, 'success'); // ← TOAST
  }
}

function applyZoom(type, val) {
  const pct = parseInt(val);
  const lbl = `${pct}% — ${pct===100?'Default':pct<100?'Smaller':'Larger'}`;
  if (type === 'website') {
    document.documentElement.style.fontSize = (pct/100*15)+'px';
    localStorage.setItem('vs_zoom_web', val);
    const el = document.getElementById('zoom-website-label');
    if (el) el.textContent = lbl;
    const sr = document.getElementById('sr-zoom-val');
    if (sr) sr.textContent = pct+'%';
  } else {
    document.querySelectorAll('.chat-ta,.chat-bub,.ai-bub').forEach(e2 => e2.style.fontSize = (pct/100*14)+'px');
    localStorage.setItem('vs_zoom_chat', val);
    const el = document.getElementById('zoom-chat-label');
    if (el) el.textContent = lbl;
  }
}

function setChatBg(bg, el) {
  document.querySelectorAll('.cbg-card').forEach(c => c.classList.remove('sel'));
  if (el) el.classList.add('sel');
  const msgs = document.getElementById('group-msgs');
  if (!msgs) return;
  if (bg === 'default') { msgs.style.background=''; msgs.style.backgroundImage=''; }
  else msgs.style.background = el?.style.background || '';
  localStorage.setItem('vs_chat_bg', bg);
  showToast('Chat background updated ✅', 'success');
}

function uploadChatBg(inp) {
  const file = inp.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const url = e.target.result;
    localStorage.setItem('vs_chat_bg_custom', url);
    const msgs = document.getElementById('group-msgs');
    if (msgs) msgs.style.backgroundImage = `url(${url})`;
    document.querySelectorAll('.cbg-card').forEach(c => c.classList.remove('sel'));
    showToast('Background set ✅', 'success');
  };
  reader.readAsDataURL(file);
}

/* ─── Apply stored prefs ─── */
function applyStoredPrefs() {
  const theme = localStorage.getItem('vs_theme');
  if (theme) { const c = document.querySelector(`.theme-card[data-theme="${theme}"]`); applyTheme(theme,c); }
  const fontWeb = localStorage.getItem('vs_font_web');
  if (fontWeb) { const c = document.querySelector(`#screen-font .font-opt[data-font="${fontWeb}"]`); if(c) applyFont('website',fontWeb,c); }
  const fontChat = localStorage.getItem('vs_font_chat');
  if (fontChat) applyFont('chat',fontChat,null);
  const zoomWeb = localStorage.getItem('vs_zoom_web');
  if (zoomWeb) { const s=document.getElementById('zoom-website'); if(s)s.value=zoomWeb; applyZoom('website',zoomWeb); }
  const zoomChat = localStorage.getItem('vs_zoom_chat');
  if (zoomChat) { const s=document.getElementById('zoom-chat'); if(s)s.value=zoomChat; applyZoom('chat',zoomChat); }
}

/* ═════════════════════════════════════════════════
   STATS
═════════════════════════════════════════════════ */
function animateNum(el, target) {
  if (!el) return;
  const dur=1100, st=performance.now();
  const run=now=>{ const p=Math.min((now-st)/dur,1); const e=1-Math.pow(1-p,3); el.textContent=Math.floor(e*target).toLocaleString('en-IN'); if(p<1) requestAnimationFrame(run); };
  requestAnimationFrame(run);
}

async function loadStats() {
  try {
    const d = await apiFetch('/api/stats');
    animateNum(document.getElementById('stat-users'), d.totalUsers||0);
    animateNum(document.getElementById('stat-quizzes'), d.totalQuizzes||0);
    animateNum(document.getElementById('stat-live'), (d.liveGuests||0)+1);
  } catch(e) {
    ['stat-users','stat-quizzes','stat-live'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent='—';});
  }
}

function startGuestPing() {
  if(token) return;
  let sid=sessionStorage.getItem('vs_sid');
  if(!sid){sid='g_'+Math.random().toString(36).slice(2);sessionStorage.setItem('vs_sid',sid);}
  const ping=()=>fetch(`${VS_CONFIG.API}/api/stats/ping`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:sid})}).catch(()=>{});
  ping(); setInterval(ping,30000);
}

/* ═════════════════════════════════════════════════
   NOTIFICATIONS
═════════════════════════════════════════════════ */
async function loadNotifications() {
  openSubScreen('screen-notifications');
  const list = document.getElementById('notif-list');
  list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
  try {
    const d = await apiFetch('/api/notifications');
    const items = d.notifications||[];
    const badge=document.getElementById('notif-badge');
    const unread=items.filter(n=>!n.read).length;
    if(badge){badge.textContent=unread;badge.classList.toggle('hidden',unread===0);}
    if(!items.length){list.innerHTML='<div class="vs-empty"><span class="ve-icon">🔔</span>No notifications</div>';return;}
    list.innerHTML='';
    items.forEach(n=>{
      const d2=new Date(n.createdAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
      const card=document.createElement('div');
      card.className=`notif-card${n.read?'':' unread'}`;
      card.innerHTML=`<div class="notif-title">${n.title}</div><div class="notif-body">${n.body}</div><div class="notif-time">${d2}</div>`;
      list.appendChild(card);
    });
    apiFetch('/api/notifications/read',{method:'PUT'}).catch(()=>{});
  } catch(e){list.innerHTML=`<div class="vs-empty">${e.message}</div>`;}
}

/* ═════════════════════════════════════════════════
   BIND EVENTS
═════════════════════════════════════════════════ */
function bindEvents() {
  // Login form
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    doLogin(document.getElementById('l-email').value.trim(), document.getElementById('l-pass').value);
  });
  // Signup form
  document.getElementById('signup-form').addEventListener('submit', e => {
    e.preventDefault();
    doSignup(document.getElementById('s-name').value.trim(), document.getElementById('s-email').value.trim(), document.getElementById('s-pass').value);
  });
  // Ghibli briefcase
  document.getElementById('g-open-btn')?.addEventListener('click', openBriefcase);
  document.getElementById('ghibli-stage')?.addEventListener('click', openBriefcase);
  // Modal backdrop close
  document.getElementById('auth-modal').addEventListener('click', e => { if(e.target.id==='auth-modal') closeAuth(); });
  // Top bar
  document.getElementById('btn-notif').addEventListener('click', loadNotifications);
  document.getElementById('btn-chat-top').addEventListener('click', openChatList);
  document.getElementById('top-avatar').addEventListener('click', () => { if(token) switchTab('profile'); else openAuth('login'); });
  // Delete account
  document.getElementById('btn-confirm-delete')?.addEventListener('click', async () => {
    if(document.getElementById('delete-confirm-inp').value !== 'DELETE'){showToast('Type "DELETE" to confirm','error');return;}
    try { await apiFetch('/api/auth/account',{method:'DELETE'}); showToast('Account deleted','info'); doLogout(); }
    catch(e){showToast('Error: '+e.message,'error');}
  });
  // Profile actions
  document.getElementById('btn-save-profile')?.addEventListener('click', ProfileModule.saveInfo);
  document.getElementById('btn-change-pw')?.addEventListener('click', ProfileModule.changePassword);

  // Close sub-screens when pressing back on mobile (browser back)
  window.addEventListener('popstate', () => {
    const open = document.querySelector('.sub-screen.open');
    if (open) { open.classList.remove('open'); history.pushState(null,'',location.href); }
  });
}

/* ═════════════════════════════════════════════════
   INIT
═════════════════════════════════════════════════ */
async function init() {
  applyStoredPrefs();
  bindEvents();
  // Verify token
  if (token) {
    try {
      const me = await apiFetch('/api/auth/me');
      userData = me.user; localStorage.setItem('vs_user', JSON.stringify(userData));
    } catch(e) {
      token=null;userData=null;
      localStorage.removeItem('vs_token');localStorage.removeItem('vs_user');
    }
  }
  updateAuthUI();
  QuizModule.init();
  TypingModule.init();
  ChatModule.init();
  ProfileModule.init();
  loadStats(); startGuestPing();
  setInterval(loadStats,60000);
  // Check notifications badge
  if (token) {
    try {
      const d=await apiFetch('/api/notifications');
      const unread=(d.notifications||[]).filter(n=>!n.read).length;
      const badge=document.getElementById('notif-badge');
      if(badge&&unread>0){badge.textContent=unread;badge.classList.remove('hidden');}
    } catch(e){}
  }
  await new Promise(r=>setTimeout(r,1400));
  hideLoader();
}

document.addEventListener('DOMContentLoaded', init);
