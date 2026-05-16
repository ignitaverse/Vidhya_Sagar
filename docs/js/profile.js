/* ═══════════════════════════════════════════
   VidyaSagar v3 — profile.js
   Profile, Settings, History
═══════════════════════════════════════════ */
const ProfileModule = (() => {
  const AVATARS = ['🎓','🦁','🐯','🦅','🔥','⚡','🌟','💡','🚀','🏆'];
  let selectedAvatar = '🎓';

  function init() {
    // Populate emoji picker
    const row = document.getElementById('emoji-picker-row');
    if (row) {
      AVATARS.forEach(em => {
        const btn = document.createElement('button');
        btn.textContent = em;
        btn.style.cssText = 'background:rgba(255,255,255,.06);border:2px solid transparent;border-radius:10px;padding:8px;font-size:1.4rem;cursor:pointer;transition:.2s';
        btn.addEventListener('click', () => {
          selectedAvatar = em;
          document.querySelectorAll('#emoji-picker-row button').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--blue2)';
          document.getElementById('ph-avatar').textContent = em;
          document.getElementById('top-avatar').textContent = em;
          if (userData) { userData.avatar = em; localStorage.setItem('vs_user', JSON.stringify(userData)); }
        });
        row.appendChild(btn);
      });
    }
  }

  function render() {
    const pLogged = document.getElementById('profile-logged');
    const pNot    = document.getElementById('profile-not-logged');
    if (!token || !userData) {
      if (pLogged) pLogged.style.display = 'none';
      if (pNot)    pNot.style.display    = 'block';
      return;
    }
    if (pLogged) pLogged.style.display = 'block';
    if (pNot)    pNot.style.display    = 'none';

    selectedAvatar = userData.avatar || '🎓';
    const av = document.getElementById('ph-avatar');
    if (av) av.textContent = selectedAvatar;
    const topAv = document.getElementById('top-avatar');
    if (topAv) topAv.textContent = selectedAvatar;

    const nameEl = document.getElementById('ph-name');
    if (nameEl) nameEl.textContent = userData.name || 'User';
    const emailEl = document.getElementById('ph-email');
    if (emailEl) emailEl.textContent = userData.email || '';
    const joinedEl = document.getElementById('ph-joined');
    if (joinedEl && userData.joinedAt) {
      joinedEl.textContent = 'Member since ' + new Date(userData.joinedAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    }
    const bioEl = document.getElementById('ph-bio');
    if (bioEl) bioEl.textContent = userData.bio || userData.examPrep ? `🎯 ${userData.examPrep}` : '';

    // Fill account info screen
    const aiName = document.getElementById('ai-name');
    if (aiName) aiName.value = userData.name || '';
    const aiEmail = document.getElementById('ai-email');
    if (aiEmail) aiEmail.value = userData.email || '';
    const aiDob = document.getElementById('ai-dob');
    if (aiDob) aiDob.value = userData.dob || '';
    const aiExam = document.getElementById('ai-exam');
    if (aiExam) aiExam.value = userData.examPrep || '';
    const aiBio = document.getElementById('ai-bio');
    if (aiBio) aiBio.value = userData.bio || '';

    const left = 2 - (userData.nameChanges || 0);
    const ncBadge = document.getElementById('name-changes-left');
    if (ncBadge) ncBadge.textContent = left > 0 ? `(${left} बार बदल सकते हैं)` : '(नाम lock है)';
    if (aiName) aiName.disabled = left <= 0;

    // Stats
    loadProfileStats();
    // Mark selected avatar
    document.querySelectorAll('#emoji-picker-row button').forEach((btn, i) => {
      btn.style.borderColor = AVATARS[i] === selectedAvatar ? 'var(--blue2)' : 'transparent';
    });
    // Mark theme
    const savedTheme = localStorage.getItem('vs_theme') || 'dark';
    document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === savedTheme));
  }

  async function loadProfileStats() {
    try {
      const [qHist, tHist] = await Promise.all([
        apiFetch('/api/history').catch(() => ({ history:[] })),
        apiFetch('/api/typing/history').catch(() => ({ history:[] })),
      ]);
      const qList = qHist.history || [];
      const tList = tHist.history || [];
      const avgAcc = tList.length ? Math.round(tList.reduce((s, h) => s + h.accuracy, 0) / tList.length) : 0;
      document.getElementById('pqs-quizzes').textContent = qList.length;
      document.getElementById('pqs-typing').textContent  = tList.length;
      document.getElementById('pqs-accuracy').textContent = tList.length ? avgAcc + '%' : '—';
    } catch(e) {}
  }

  async function saveInfo() {
    const btn = document.getElementById('btn-save-profile');
    const msg = document.getElementById('ai-msg');
    if (msg) { msg.className = ''; msg.classList.remove('hidden'); msg.textContent = 'Saving…'; }
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const name    = document.getElementById('ai-name')?.value.trim();
      const dob     = document.getElementById('ai-dob')?.value;
      const examPrep= document.getElementById('ai-exam')?.value.trim();
      const bio     = document.getElementById('ai-bio')?.value.trim();
      const d = await apiFetch('/api/auth/profile', {
        method:'PUT',
        body: JSON.stringify({ name: name || undefined, dob, examPrep, bio, avatar: selectedAvatar })
      });
      userData = { ...userData, ...d.user };
      localStorage.setItem('vs_user', JSON.stringify(userData));
      render();
      if (msg) { msg.style.color = 'var(--green)'; msg.textContent = '✅ Profile saved!'; }
      setTimeout(() => { if (msg) msg.classList.add('hidden'); }, 3000);
    } catch(e) {
      if (msg) { msg.style.color = 'var(--rose)'; msg.textContent = e.message; }
    } finally { if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; } }
  }

  async function changePassword() {
    const btn  = document.getElementById('btn-change-pw');
    const msg  = document.getElementById('cp-msg');
    const oldPw  = document.getElementById('cp-old')?.value;
    const newPw  = document.getElementById('cp-new')?.value;
    const confPw = document.getElementById('cp-confirm')?.value;
    if (msg) { msg.classList.remove('hidden'); msg.textContent = '…'; }
    if (newPw !== confPw) { if (msg) { msg.style.color = 'var(--rose)'; msg.textContent = 'Passwords do not match'; } return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Changing…'; }
    try {
      await apiFetch('/api/auth/password', { method:'PUT', body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }) });
      if (msg) { msg.style.color = 'var(--green)'; msg.textContent = '✅ Password changed!'; }
      ['cp-old','cp-new','cp-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    } catch(e) { if (msg) { msg.style.color = 'var(--rose)'; msg.textContent = e.message; } }
    finally { if (btn) { btn.disabled = false; btn.textContent = '🔒 Change Password'; } }
  }

  /* ── Quiz History ── */
  async function loadHistory() {
    openSubScreen('screen-history');
    const list = document.getElementById('history-list');
    list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    if (!token) { list.innerHTML = '<div class="vs-empty">Login करें</div>'; return; }
    try {
      const d = await apiFetch('/api/history');
      const h = d.history || [];
      if (!h.length) { list.innerHTML = '<div class="vs-empty"><span class="ve-icon">📊</span>No quiz history yet</div>'; return; }
      list.innerHTML = '';
      h.forEach(x => {
        const date = new Date(x.playedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const cls  = x.percentage >= 70 ? '#34d399' : x.percentage >= 50 ? '#fbbf24' : '#fb7185';
        const subj = [x.subject, x.subCategory, x.state].filter(Boolean).join(' › ');
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;margin-bottom:9px';
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:700;font-size:.87rem">${subj}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="background:rgba(0,0,0,.2);border-radius:6px;padding:3px 10px;font-weight:800;font-size:.84rem;color:${cls}">${x.percentage}%</span>
              <button data-id="${x._id}" style="background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);color:#f43f5e;border-radius:6px;padding:3px 8px;font-size:.72rem;cursor:pointer">🗑️</button>
            </div>
          </div>
          <div style="height:4px;background:var(--card2);border-radius:4px;overflow:hidden;margin-bottom:8px"><div style="height:100%;width:${x.percentage}%;background:${cls};border-radius:4px"></div></div>
          <div style="display:flex;gap:14px;font-size:.73rem;color:var(--text3)"><span>✅ ${x.score}/${x.total}</span><span>⏱ ${x.timeTaken}s</span><span>📅 ${date}</span></div>`;
        card.querySelector('[data-id]').addEventListener('click', async btn2 => {
          const id = btn2.target.dataset.id || btn2.currentTarget.dataset.id;
          if (!confirm('Delete this entry?')) return;
          try { await apiFetch(`/api/history/${id}`, { method:'DELETE' }); card.remove(); showToast('Deleted ✅', 'success'); } catch(e) { showToast('Error: '+e.message,'error'); }
        });
        list.appendChild(card);
      });
    } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  /* ── Typing History ── */
  async function loadTypingHistory() {
    openSubScreen('screen-typing-history');
    const list = document.getElementById('typing-history-list');
    list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    if (!token) { list.innerHTML = '<div class="vs-empty">Login करें</div>'; return; }
    try {
      const d = await apiFetch('/api/typing/history');
      const h = d.history || [];
      if (!h.length) { list.innerHTML = '<div class="vs-empty"><span class="ve-icon">⌨️</span>No typing history yet</div>'; return; }
      list.innerHTML = '';
      h.forEach(x => {
        const date = new Date(x.playedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const passedColor = x.passed ? '#34d399' : '#fb7185';
        const card = document.createElement('div');
        card.style.cssText = 'background:var(--card);border:1px solid var(--border);border-radius:var(--r2);padding:14px 16px;margin-bottom:9px';
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:700;font-size:.87rem">${x.examName}</span>
            <span style="background:rgba(0,0,0,.2);border-radius:6px;padding:3px 10px;font-weight:800;font-size:.82rem;color:${passedColor}">${x.passed ? '✅ PASS' : '❌ FAIL'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;margin-bottom:6px">
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:#34d399">${x.wpm}</div><div style="font-size:.65rem;color:var(--text3)">WPM</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--blue2)">${x.accuracy}%</div><div style="font-size:.65rem;color:var(--text3)">Accuracy</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--rose)">${x.errors}</div><div style="font-size:.65rem;color:var(--text3)">Errors</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--amber)">${x.keystrokes}</div><div style="font-size:.65rem;color:var(--text3)">Keys</div></div>
          </div>
          <div style="display:flex;gap:10px;font-size:.72rem;color:var(--text3)"><span>🌐 ${x.language}</span><span>⏱ ${x.timeTaken}s</span><span>📅 ${date}</span></div>`;
        list.appendChild(card);
      });
    } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  // expose internal helpers needed by HTML onclick
  window.openEmojiPicker = () => openSubScreen('screen-account-info');
  window.applyTheme  = applyTheme;
  window.applyFont   = applyFont;
  window.applyZoom   = applyZoom;
  window.setChatBg   = setChatBg;
  window.uploadChatBg= uploadChatBg;
  window.openSubScreen = openSubScreen;
  window.closeSubScreen= closeSubScreen;

  // Bind settings row clicks that open sub-screens
  document.addEventListener('DOMContentLoaded', () => {
    // History links from profile stats
    document.getElementById('pqs-quizzes')?.closest('.pqs')?.addEventListener('click', loadHistory);
    document.getElementById('pqs-typing')?.closest('.pqs')?.addEventListener('click', loadTypingHistory);
    // Settings rows already have onclick inline in HTML
  });

  return { init, render, saveInfo, changePassword, loadHistory, loadTypingHistory };
})();
