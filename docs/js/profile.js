/* VidyaSagar v4 — profile.js (IMPROVED) */
const ProfileModule = (() => {
  const AVATARS = ['🎓','🦁','🐯','🦅','🔥','⚡','🌟','💡','🚀','🏆','💎','🎯','🛡️','🌙','🎪'];
  let selectedAvatar = '🎓';

  function _avatarHtml(user) {
    if (user?.photo) return `<img src="${user.photo}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    return user?.avatar || '🎓';
  }

  function init() {
    const row = document.getElementById('emoji-picker-row');
    if (row) {
      AVATARS.forEach(em => {
        const btn = document.createElement('button');
        btn.textContent = em;
        btn.type = 'button';
        btn.style.cssText = 'background:rgba(255,255,255,.06);border:2px solid transparent;border-radius:10px;padding:8px;font-size:1.4rem;cursor:pointer;transition:.2s';
        btn.addEventListener('click', () => {
          selectedAvatar = em;
          document.querySelectorAll('#emoji-picker-row button').forEach(b => b.style.borderColor = 'transparent');
          btn.style.borderColor = 'var(--blue2)';
          pendingPhoto = ''; // picking an emoji overrides any pending photo upload
          document.getElementById('ph-avatar-wrap').innerHTML = em;
          document.getElementById('top-avatar').innerHTML = em;
          if (userData) { userData.avatar = em; localStorage.setItem('vs_user', JSON.stringify(userData)); }
        });
        row.appendChild(btn);
      });
    }

    document.getElementById('btn-save-profile')?.addEventListener('click', saveInfo);
    document.getElementById('btn-change-pw')?.addEventListener('click', changePassword);
    document.getElementById('pqs-quizzes-btn')?.addEventListener('click', loadHistory);
    document.getElementById('pqs-typing-btn')?.addEventListener('click', loadTypingHistory);
    document.getElementById('pqs-online-btn')?.addEventListener('click', () => {
      if (window.OnlineGames) OnlineGames.showOnlineHistory();
    });

    bindPhotoUpload();
    bindUsernameCheck();
    document.getElementById('btn-share-profile-main')?.addEventListener('click', shareProfile);
    document.getElementById('btn-edit-profile-main')?.addEventListener('click', () => {
      window.openEmojiPicker ? window.openEmojiPicker() : openSubScreen('screen-account-info');
    });

    // Re-init password eye toggles for dynamically added fields
    initEyeToggles();
  }

  /* ── Photo upload (resized client-side, sent as base64) ── */
  let pendingPhoto = undefined; // undefined = no change, '' = removed, 'data:...' = new photo
  function bindPhotoUpload() {
    const inp = document.getElementById('photo-upload-inp');
    inp?.addEventListener('change', async () => {
      const file = inp.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) { showToast('कृपया एक image चुनें', 'error'); return; }
      try {
        const dataUrl = await _resizeImage(file, 512, 0.82);
        pendingPhoto = dataUrl;
        const av = document.getElementById('ph-avatar-wrap');
        if (av) av.innerHTML = `<img src="${dataUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
        showToast('फोटो चुनी गई — Save Changes दबाएं ✅', 'info');
      } catch (e) { showToast('Photo process नहीं हो पाई', 'error'); }
      inp.value = '';
    });
    document.getElementById('btn-remove-photo')?.addEventListener('click', () => {
      pendingPhoto = '';
      const av = document.getElementById('ph-avatar-wrap');
      if (av) av.textContent = selectedAvatar;
      showToast('Photo हटाई गई — Save Changes दबाएं ✅', 'info');
    });
  }

  function _resizeImage(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
          else if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── Username live-availability check ── */
  let usernameCheckTimer = null;
  function bindUsernameCheck() {
    const inp = document.getElementById('ai-username');
    inp?.addEventListener('input', () => {
      clearTimeout(usernameCheckTimer);
      const msg = document.getElementById('username-avail-msg');
      const val = inp.value.toLowerCase().trim();
      if (!msg) return;
      if (val === (userData?.username || '')) { msg.textContent = ''; return; }
      if (!/^[a-z0-9_]{3,30}$/.test(val)) { msg.textContent = '3-30 chars: a-z, 0-9, _'; msg.style.color = 'var(--rose)'; return; }
      msg.textContent = 'Checking…'; msg.style.color = 'var(--text3)';
      usernameCheckTimer = setTimeout(async () => {
        try {
          const d = await apiFetch(`/api/auth/check-username?u=${encodeURIComponent(val)}`);
          msg.textContent = d.available ? '✅ Available' : '❌ पहले से लिया गया';
          msg.style.color = d.available ? 'var(--green)' : 'var(--rose)';
        } catch (e) { msg.textContent = ''; }
      }, 400);
    });
  }

  function shareProfile() {
    const uname = userData?.username;
    const text = uname ? `मुझे VidyaSagar पर follow करें: @${uname}` : 'VidyaSagar पर मेरी profile देखें!';
    if (navigator.share) {
      navigator.share({ title: 'VidyaSagar', text }).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('Copied to clipboard ✅', 'success'));
    } else {
      showToast(text, 'info');
    }
  }

  function initEyeToggles() {
    document.querySelectorAll('.pw-eye').forEach(btn => {
      // Avoid double-binding
      if (btn._eyeBound) return;
      btn._eyeBound = true;
      btn.addEventListener('click', () => {
        const inp = btn.previousElementSibling;
        if (!inp) return;
        const show = inp.type === 'password';
        inp.type = show ? 'text' : 'password';
        btn.textContent = show ? '🙈' : '👁️';
      });
    });
  }

  function render() {
    if (!token || !userData) {
      // Show not-logged state
      document.getElementById('profile-not-logged')?.style.setProperty('display', 'block');
      document.getElementById('profile-logged')?.style.setProperty('display', 'none');
      return;
    }

    document.getElementById('profile-not-logged')?.style.setProperty('display', 'none');
    document.getElementById('profile-logged')?.style.setProperty('display', 'block');

    selectedAvatar = userData.avatar || '🎓';

    // Avatar (photo takes priority over emoji)
    const av = document.getElementById('ph-avatar'); if (av) av.innerHTML = _avatarHtml(userData);
    const topAv = document.getElementById('top-avatar'); if (topAv) topAv.innerHTML = _avatarHtml(userData);

    // Username + auto-delete notice
    const un = document.getElementById('ph-username');
    if (un) un.textContent = userData.username ? '@' + userData.username : '';
    renderAutoDeleteNotice();
    loadFriendsSection();
    loadFriendRequests();

    // Highlight selected avatar in picker
    document.querySelectorAll('#emoji-picker-row button').forEach(btn => {
      btn.style.borderColor = btn.textContent === selectedAvatar ? 'var(--blue2)' : 'transparent';
    });

    // Profile card
    const nm = document.getElementById('ph-name'); if (nm) nm.textContent = userData.name || 'User';
    const em = document.getElementById('ph-email'); if (em) em.textContent = userData.email || '';
    const jn = document.getElementById('ph-joined');
    if (jn && userData.joinedAt)
      jn.textContent = 'Member since ' + new Date(userData.joinedAt).toLocaleDateString('en-IN', { month:'long', year:'numeric' });
    const bio = document.getElementById('ph-bio');
    if (bio) bio.textContent = userData.bio || (userData.examPrep ? `🎯 ${userData.examPrep}` : '');

    // ── PRE-FILL Account Info fields ──
    const ain = document.getElementById('ai-name');
    if (ain) {
      ain.value = userData.name || '';
      const left = 2 - (userData.nameChanges || 0);
      ain.disabled = left <= 0;
      const b = document.getElementById('name-changes-left');
      if (b) b.textContent = left > 0 ? `(${left} बार बदल सकते हैं)` : '(locked)';
    }
    const aiu = document.getElementById('ai-username');
    if (aiu) {
      aiu.value = userData.username || '';
      const uleft = 2 - (userData.usernameChanges || 0);
      aiu.disabled = uleft <= 0;
      const ub = document.getElementById('username-changes-left');
      if (ub) ub.textContent = uleft > 0 ? `(${uleft} बार बदल सकते हैं)` : '(locked)';
      const um = document.getElementById('username-avail-msg'); if (um) um.textContent = '';
    }
    pendingPhoto = undefined; // reset any unsaved photo selection whenever we (re)render from fresh data
    const aie = document.getElementById('ai-email');
    if (aie) { aie.value = userData.email || ''; aie.disabled = true; }
    const aid = document.getElementById('ai-dob');  if (aid)  aid.value  = userData.dob      || '';
    const aiex = document.getElementById('ai-exam'); if (aiex) aiex.value = userData.examPrep || '';
    const aib = document.getElementById('ai-bio');   if (aib)  aib.value  = userData.bio      || '';

    // Stats
    loadProfileStats();

    // Theme indicator
    const sv = localStorage.getItem('vs_theme') || 'dark';
    document.querySelectorAll('.theme-card').forEach(c => c.classList.toggle('active', c.dataset.theme === sv));

    // Privacy toggles
    const togPublic   = document.getElementById('tog-public');
    const togOnline   = document.getElementById('tog-online');
    const togLastseen = document.getElementById('tog-lastseen');
    if (togPublic)   togPublic.checked   = userData.isPublic    !== false;
    if (togOnline)   togOnline.checked   = userData.showOnline   !== false;
    if (togLastseen) togLastseen.checked = userData.showLastSeen !== false;
  }

  function renderAutoDeleteNotice() {
    const box = document.getElementById('profile-autodelete-note');
    if (!box || !userData?.lastActive) { if (box) box.textContent = ''; return; }
    const last = new Date(userData.lastActive);
    const deleteDate = new Date(last); deleteDate.setFullYear(deleteDate.getFullYear() + 1);
    const daysLeft = Math.max(0, Math.ceil((deleteDate - Date.now()) / 86400000));
    const fmt = d => d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
    box.innerHTML = `🕒 Last active: <b>${fmt(last)}</b> · 1 साल तक login न करने पर account अपने आप delete हो जाएगा (लगभग <b>${fmt(deleteDate)}</b>, ${daysLeft} दिन बाकी)`;
  }

  async function loadFriendsSection() {
    const grid = document.getElementById('profile-friends-grid');
    const countEl = document.getElementById('profile-friends-count');
    if (!grid || !userData) return;
    grid.innerHTML = '<div class="vs-loading-text" style="padding:10px">Loading…</div>';
    try {
      const d = await apiFetch(`/api/users/${userData.id}/friends`);
      const friends = d.friends || [];
      if (countEl) countEl.textContent = friends.length;
      if (!friends.length) {
        grid.innerHTML = '<div class="vs-empty" style="padding:16px"><span class="ve-icon">🧑‍🤝‍🧑</span>अभी कोई friend नहीं — Search से friends जोड़ें</div>';
        return;
      }
      grid.innerHTML = '';
      friends.forEach(f => grid.appendChild(_friendTile(f)));
    } catch (e) { grid.innerHTML = ''; }
  }

  function _friendTile(f) {
    const tile = document.createElement('div');
    tile.className = 'friend-tile';
    tile.innerHTML = `
      <div class="friend-tile-avatar">${_avatarHtml(f)}</div>
      <div class="friend-tile-name">${f.username ? '@' + f.username : f.name}</div>`;
    // FIX: window.SocialModule bug - SocialModule top-level const hai.
    tile.addEventListener('click', () => { if (typeof SocialModule !== 'undefined') SocialModule.openUserProfile(f.id); });
    return tile;
  }

  async function loadFriendRequests() {
    const box = document.getElementById('profile-friend-requests');
    if (!box || !userData) return;
    try {
      const d = await apiFetch('/api/users/me/friend-requests');
      const reqs = d.requests || [];
      if (!reqs.length) { box.innerHTML = ''; box.classList.add('hidden'); return; }
      box.classList.remove('hidden');
      box.innerHTML = `<div class="fr-heading">📩 Friend Requests (${reqs.length})</div>`;
      reqs.forEach(r => {
        const row = document.createElement('div');
        row.className = 'fr-row';
        row.innerHTML = `
          <div class="friend-tile-avatar" style="width:38px;height:38px;font-size:1.2rem">${_avatarHtml(r.from)}</div>
          <div class="fr-name">${r.from.name}</div>
          <button class="fr-accept">✓</button>
          <button class="fr-decline">✕</button>`;
        row.querySelector('.fr-name').addEventListener('click', () => { if (typeof SocialModule !== 'undefined') SocialModule.openUserProfile(r.from.id); });
        row.querySelector('.fr-accept').addEventListener('click', () => _respondRequest(r.from.id, 'accept', row));
        row.querySelector('.fr-decline').addEventListener('click', () => _respondRequest(r.from.id, 'decline', row));
        box.appendChild(row);
      });
    } catch (e) { box.innerHTML = ''; }
  }

  async function _respondRequest(fromId, action, row) {
    try {
      await apiFetch(`/api/users/${fromId}/friend-${action}`, { method: 'POST' });
      row.remove();
      if (action === 'accept') { showToast('Friend request accept हुई 🎉', 'success'); loadFriendsSection(); }
    } catch (e) { showToast(e.message, 'error'); }
  }

  async function loadProfileStats() {
    try {
      const [qH, tH] = await Promise.all([
        apiFetch('/api/history').catch(() => ({ history: [] })),
        apiFetch('/api/typing/history').catch(() => ({ history: [] })),
      ]);
      const qList = qH.history || [];
      const tList = tH.history || [];
      const avgAcc = tList.length ? Math.round(tList.reduce((s, h) => s + h.accuracy, 0) / tList.length) : 0;
      const qEl = document.getElementById('pqs-quizzes');  if (qEl) qEl.textContent = qList.length;
      const tEl = document.getElementById('pqs-typing');    if (tEl) tEl.textContent = tList.length;
      const aEl = document.getElementById('pqs-accuracy'); if (aEl) aEl.textContent = tList.length ? avgAcc + '%' : '—';
    } catch(e) { console.warn('[Profile stats display failed]', e); }
  }

  async function saveInfo() {
    const btn = document.getElementById('btn-save-profile');
    const msg = document.getElementById('ai-msg');
    if (msg) { msg.className = ''; msg.classList.remove('hidden'); msg.textContent = 'Saving…'; msg.style.color = 'var(--text2)'; }
    if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }
    try {
      const name     = document.getElementById('ai-name')?.value.trim();
      const username = document.getElementById('ai-username')?.value.trim();
      const dob      = document.getElementById('ai-dob')?.value;
      const examPrep = document.getElementById('ai-exam')?.value.trim();
      const bio      = document.getElementById('ai-bio')?.value.trim();
      const body = { name: name || undefined, dob, examPrep, bio, avatar: selectedAvatar };
      if (username !== undefined) body.username = username;
      if (pendingPhoto !== undefined) body.photo = pendingPhoto;
      const d = await apiFetch('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(body)
      });
      userData = { ...userData, ...d.user };
      localStorage.setItem('vs_user', JSON.stringify(userData));
      updateAuthUI?.();
      render();
      if (msg) { msg.style.color = 'var(--green)'; msg.textContent = '✅ Saved!'; }
      showToast('Profile updated ✅', 'success');
      setTimeout(() => { if (msg) msg.classList.add('hidden'); }, 3000);
    } catch(e) {
      if (msg) { msg.style.color = 'var(--rose)'; msg.textContent = e.message; }
      showToast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '💾 Save Changes'; }
    }
  }

  async function changePassword() {
    const btn    = document.getElementById('btn-change-pw');
    const msg    = document.getElementById('cp-msg');
    const oldPw  = document.getElementById('cp-old')?.value;
    const newPw  = document.getElementById('cp-new')?.value;
    const confPw = document.getElementById('cp-confirm')?.value;

    if (!oldPw || !newPw || !confPw) {
      if (msg) { msg.classList.remove('hidden'); msg.style.color = 'var(--rose)'; msg.textContent = 'All fields required'; }
      return;
    }
    if (newPw !== confPw) {
      if (msg) { msg.classList.remove('hidden'); msg.style.color = 'var(--rose)'; msg.textContent = 'Passwords do not match'; }
      return;
    }
    if (newPw.length < 6) {
      if (msg) { msg.classList.remove('hidden'); msg.style.color = 'var(--rose)'; msg.textContent = 'Min 6 characters'; }
      return;
    }

    if (msg) { msg.classList.remove('hidden'); msg.style.color = 'var(--text2)'; msg.textContent = '…'; }
    if (btn) { btn.disabled = true; btn.textContent = 'Changing…'; }
    try {
      await apiFetch('/api/auth/password', { method: 'PUT', body: JSON.stringify({ currentPassword: oldPw, newPassword: newPw }) });
      if (msg) { msg.style.color = 'var(--green)'; msg.textContent = '✅ Changed!'; }
      showToast('Password changed ✅', 'success');
      ['cp-old','cp-new','cp-confirm'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    } catch(e) {
      if (msg) { msg.style.color = 'var(--rose)'; msg.textContent = e.message; }
      showToast(e.message, 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '🔒 Change Password'; }
    }
  }

  async function loadHistory() {
    openSubScreen('screen-history');
    const list = document.getElementById('history-list');
    list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    if (!token) { list.innerHTML = '<div class="vs-empty">Login करें</div>'; return; }
    try {
      const d = await apiFetch('/api/history');
      const h = d.history || [];
      if (!h.length) {
        list.innerHTML = '<div class="vs-empty"><span class="ve-icon">📊</span>No quiz history yet</div>';
        return;
      }
      list.innerHTML = '';
      h.forEach(x => {
        const date = new Date(x.playedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const cls  = x.percentage >= 70 ? '#34d399' : x.percentage >= 50 ? '#fbbf24' : '#fb7185';
        const subj = [x.subject, x.subCategory, x.state].filter(Boolean).join(' › ');
        const card = document.createElement('div');
        card.className = 'hist-card';
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:700;font-size:.87rem">${subj}</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span style="background:rgba(0,0,0,.2);border-radius:6px;padding:3px 10px;font-weight:800;font-size:.84rem;color:${cls}">${x.percentage}%</span>
              <button data-id="${x._id}" style="background:rgba(244,63,94,.1);border:1px solid rgba(244,63,94,.3);color:#f43f5e;border-radius:6px;padding:3px 8px;font-size:.72rem;cursor:pointer">🗑️</button>
            </div>
          </div>
          <div style="height:4px;background:var(--card2);border-radius:4px;overflow:hidden;margin-bottom:8px">
            <div style="height:100%;width:${x.percentage}%;background:${cls};border-radius:4px;transition:width .5s ease"></div>
          </div>
          <div style="display:flex;gap:14px;font-size:.73rem;color:var(--text3)">
            <span>✅ ${x.score}/${x.total}</span>
            <span>⏱ ${x.timeTaken}s</span>
            <span>📅 ${date}</span>
          </div>`;
        card.querySelector('[data-id]').addEventListener('click', async btn2 => {
          const id = btn2.target.dataset.id || btn2.currentTarget.dataset.id;
          if (!confirm('Delete this result?')) return;
          try {
            await apiFetch(`/api/history/${id}`, { method: 'DELETE' });
            card.remove();
            showToast('Deleted ✅', 'success');
          } catch(e) { showToast('Error: ' + e.message, 'error'); }
        });
        list.appendChild(card);
      });
    } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  async function loadTypingHistory() {
    openSubScreen('screen-typing-history');
    const list = document.getElementById('typing-history-list');
    list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    if (!token) { list.innerHTML = '<div class="vs-empty">Login करें</div>'; return; }
    try {
      const d = await apiFetch('/api/typing/history');
      const h = d.history || [];
      if (!h.length) {
        list.innerHTML = '<div class="vs-empty"><span class="ve-icon">⌨️</span>No typing history yet</div>';
        return;
      }
      list.innerHTML = '';
      h.forEach(x => {
        const date = new Date(x.playedAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
        const pc = x.passed ? '#34d399' : '#fb7185';
        const card = document.createElement('div');
        card.className = 'hist-card';
        card.innerHTML = `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <span style="font-weight:700;font-size:.87rem">${x.examName}</span>
            <span style="font-weight:800;font-size:.82rem;color:${pc}">${x.passed ? '✅ PASS' : '❌ FAIL'}</span>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:7px;margin-bottom:6px">
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:#34d399">${x.wpm}</div><div style="font-size:.65rem;color:var(--text3)">WPM</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--blue2)">${x.accuracy}%</div><div style="font-size:.65rem;color:var(--text3)">Accuracy</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--rose)">${x.errors}</div><div style="font-size:.65rem;color:var(--text3)">Errors</div></div>
            <div style="text-align:center"><div style="font-weight:800;font-size:1.1rem;color:var(--amber)">${x.keystrokes}</div><div style="font-size:.65rem;color:var(--text3)">Keys</div></div>
          </div>
          <div style="display:flex;gap:10px;font-size:.72rem;color:var(--text3)">
            <span>🌐 ${x.language}</span>
            <span>⏱ ${x.timeTaken}s</span>
            <span>📅 ${date}</span>
          </div>`;
        list.appendChild(card);
      });
    } catch(e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  window.openEmojiPicker = () => { render(); openSubScreen('screen-account-info'); };
  window.applyTheme      = applyTheme;
  window.applyFont       = applyFont;
  window.applyZoom       = applyZoom;
  window.setChatBg       = setChatBg;
  window.uploadChatBg    = uploadChatBg;
  window.openSubScreen   = openSubScreen;
  window.closeSubScreen  = closeSubScreen;
  window.doLogout        = doLogout;

  return { init, render, saveInfo, changePassword, loadHistory, loadTypingHistory };
})();
