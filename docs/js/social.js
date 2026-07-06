/* VidyaSagar v5 — social.js
   Handles: viewing other users' profiles, friend request actions from that view,
   and 1:1 direct messages (inbox + thread). Keeps this separate from profile.js,
   which only deals with the logged-in user's own account/settings. */
const SocialModule = (() => {
  let viewedUser = null;   // the profile currently open in screen-user-profile
  let dmThreadUser = null; // the other user's id/info for the currently-open DM thread
  let dmPollTimer = null;

  function _avatarHtml(u) {
    if (u?.photo) return `<img src="${u.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:inherit">`;
    return u?.avatar || '🎓';
  }
  function _e(s) {
    return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  /* ══════════════════════════════════════
     VIEW A USER'S PROFILE (Instagram-style)
  ══════════════════════════════════════ */
  async function openUserProfile(userId) {
    if (!userId) return;
    if (userData && String(userId) === String(userData.id)) {
      // Tapped your own name somewhere — just show your own profile screen instead
      ProfileModule.render();
      openSubScreen('screen-profile-panel');
      return;
    }
    openSubScreen('screen-user-profile');
    const body = document.getElementById('uprofile-body');
    if (body) body.innerHTML = '<div class="vs-loading-text" style="padding:40px 0">Loading…</div>';
    try {
      const d = await apiFetch(`/api/users/${userId}`);
      viewedUser = d.user;
      _renderUserProfile(viewedUser);
      _checkWatchLive(viewedUser.id);
    } catch (e) {
      if (body) body.innerHTML = `<div class="vs-empty" style="padding:40px 0">${e.message}</div>`;
    }
  }

  function openUserProfileByUsername(username) {
    return _openByLookup(`/api/users/by-username/${encodeURIComponent(username)}`);
  }
  async function _openByLookup(url) {
    openSubScreen('screen-user-profile');
    const body = document.getElementById('uprofile-body');
    if (body) body.innerHTML = '<div class="vs-loading-text" style="padding:40px 0">Loading…</div>';
    try {
      const d = await apiFetch(url);
      viewedUser = d.user;
      _renderUserProfile(viewedUser);
      _checkWatchLive(viewedUser.id);
    } catch (e) {
      if (body) body.innerHTML = `<div class="vs-empty" style="padding:40px 0">${e.message}</div>`;
    }
  }

  function _renderUserProfile(u) {
    const body = document.getElementById('uprofile-body');
    if (!body) return;

    if (u.limited) {
      body.innerHTML = `
        <div class="uprofile-header">
          <div class="uprofile-avatar">${_avatarHtml(u)}</div>
          <div class="uprofile-id">
            <div class="uprofile-name">${_e(u.name)}</div>
            ${u.username ? `<div class="uprofile-username">@${_e(u.username)}</div>` : ''}
          </div>
        </div>
        <div class="uprofile-actions" id="uprofile-actions"></div>
        <div class="vs-empty" style="padding:30px 0"><span class="ve-icon">🔒</span>यह profile private है</div>`;
      _renderActionButtons(u);
      return;
    }

    const onlineDot = u.online === true ? '<span class="online-dot"></span>' : '';
    const lastSeenTxt = (!u.online && u.lastSeen) ? `Last seen ${_timeAgo(u.lastSeen)}` : '';

    body.innerHTML = `
      <div class="uprofile-header">
        <div class="uprofile-avatar">${_avatarHtml(u)}${onlineDot}</div>
        <div class="uprofile-id">
          <div class="uprofile-name">${_e(u.name)}</div>
          ${u.username ? `<div class="uprofile-username">@${_e(u.username)}</div>` : ''}
          <div class="uprofile-meta">${u.online ? 'Online अभी' : lastSeenTxt}</div>
        </div>
      </div>
      ${u.bio ? `<div class="uprofile-bio">${_e(u.bio)}</div>` : ''}
      <div class="uprofile-actions" id="uprofile-actions"></div>
      <div id="uprofile-watchlive"></div>
      <div class="pqs" style="margin-top:14px">
        <div class="pqs-item"><div class="pqs-num">${u.stats.quizzes}</div><div class="pqs-lbl">Quizzes</div></div>
        <div class="pqs-item"><div class="pqs-num">${u.stats.typing}</div><div class="pqs-lbl">Typing</div></div>
        <div class="pqs-item"><div class="pqs-num">${u.stats.avgAccuracy ?? '—'}${u.stats.avgAccuracy!=null?'%':''}</div><div class="pqs-lbl">Accuracy</div></div>
        <div class="pqs-item"><div class="pqs-num">${u.stats.friends}</div><div class="pqs-lbl">Friends</div></div>
      </div>
      <div class="settings-section-title" style="margin-top:18px">Friends</div>
      <div class="friend-grid" id="uprofile-friends-grid"><div class="vs-loading-text" style="padding:10px">Loading…</div></div>`;

    _renderActionButtons(u);
    _loadUserFriends(u.id);
  }

  function _renderActionButtons(u) {
    const box = document.getElementById('uprofile-actions');
    if (!box) return;
    const btns = [];
    if (u.friendStatus === 'friends') {
      btns.push(`<button class="uact-btn uact-friends" id="uact-unfriend">✓ Friends</button>`);
    } else if (u.friendStatus === 'pending_sent') {
      btns.push(`<button class="uact-btn uact-muted" disabled>⏳ Request Sent</button>`);
    } else if (u.friendStatus === 'pending_received') {
      btns.push(`<button class="uact-btn uact-primary" id="uact-accept">✓ Accept</button>`);
      btns.push(`<button class="uact-btn uact-muted" id="uact-decline">✕ Decline</button>`);
    } else {
      btns.push(`<button class="uact-btn uact-primary" id="uact-add">➕ Add Friend</button>`);
    }
    if (!u.limited) btns.push(`<button class="uact-btn" id="uact-message">💬 Message</button>`);
    box.innerHTML = btns.join('');

    document.getElementById('uact-add')?.addEventListener('click', () => sendFriendRequest(u.id));
    document.getElementById('uact-accept')?.addEventListener('click', () => respondFriendRequest(u.id, 'accept'));
    document.getElementById('uact-decline')?.addEventListener('click', () => respondFriendRequest(u.id, 'decline'));
    document.getElementById('uact-unfriend')?.addEventListener('click', () => unfriend(u.id));
    document.getElementById('uact-message')?.addEventListener('click', () => openDMThread(u.id, u));
  }

  async function _loadUserFriends(userId) {
    const grid = document.getElementById('uprofile-friends-grid');
    if (!grid) return;
    try {
      const d = await apiFetch(`/api/users/${userId}/friends`);
      const friends = d.friends || [];
      if (!friends.length) { grid.innerHTML = '<div class="vs-empty" style="padding:14px">कोई friend नहीं</div>'; return; }
      grid.innerHTML = '';
      friends.forEach(f => {
        const tile = document.createElement('div');
        tile.className = 'friend-tile';
        tile.innerHTML = `<div class="friend-tile-avatar">${_avatarHtml(f)}</div><div class="friend-tile-name">${f.username ? '@'+_e(f.username) : _e(f.name)}</div>`;
        tile.addEventListener('click', () => openUserProfile(f.id));
        grid.appendChild(tile);
      });
    } catch (e) { grid.innerHTML = ''; }
  }

  async function _checkWatchLive(userId) {
    const box = document.getElementById('uprofile-watchlive');
    if (!box) return;
    try {
      const d = await apiFetch(`/api/game/active/${userId}`);
      if (d.active) {
        box.innerHTML = `<button class="uact-btn uact-live" id="uact-watch">👁️ Watch Live — ${d.gameType==='chess'?'♟️ Chess':'⭕ TicTacToe'}</button>`;
        document.getElementById('uact-watch')?.addEventListener('click', () => {
          window.OnlineGames?.spectate(d.roomId);
        });
      } else {
        box.innerHTML = '';
      }
    } catch (e) { box.innerHTML = ''; }
  }

  function _timeAgo(dateStr) {
    const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (s < 60) return 'अभी';
    if (s < 3600) return Math.floor(s/60) + ' मिनट पहले';
    if (s < 86400) return Math.floor(s/3600) + ' घंटे पहले';
    return Math.floor(s/86400) + ' दिन पहले';
  }

  /* ══════════════════════════════════════
     FRIEND ACTIONS
  ══════════════════════════════════════ */
  async function sendFriendRequest(userId) {
    try {
      const d = await apiFetch(`/api/users/${userId}/friend-request`, { method: 'POST' });
      showToast(d.message || 'Request भेजी गई', 'success');
      if (viewedUser?.id === userId) { viewedUser.friendStatus = d.status; _renderActionButtons(viewedUser); }
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function respondFriendRequest(userId, action) {
    try {
      const d = await apiFetch(`/api/users/${userId}/friend-${action}`, { method: 'POST' });
      showToast(d.message || 'Done', 'success');
      if (viewedUser?.id === userId) { viewedUser.friendStatus = d.status; _renderActionButtons(viewedUser); _loadUserFriends(userId); }
    } catch (e) { showToast(e.message, 'error'); }
  }
  async function unfriend(userId) {
    if (!confirm('Friend list से हटाएं?')) return;
    try {
      await apiFetch(`/api/users/${userId}/friend`, { method: 'DELETE' });
      showToast('Friend हटाया गया', 'info');
      if (viewedUser?.id === userId) { viewedUser.friendStatus = 'none'; _renderActionButtons(viewedUser); }
    } catch (e) { showToast(e.message, 'error'); }
  }

  /* ══════════════════════════════════════
     DIRECT MESSAGES — INBOX
  ══════════════════════════════════════ */
  function openDMInbox() {
    if (!token || !userData) { openAuth('login'); return; }
    openSubScreen('screen-dm-inbox');
    _loadConversations();
  }

  async function _loadConversations() {
    const list = document.getElementById('dm-inbox-list');
    if (!list) return;
    list.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    try {
      const d = await apiFetch('/api/messages/conversations');
      const convos = d.conversations || [];
      if (!convos.length) {
        list.innerHTML = '<div class="vs-empty"><span class="ve-icon">💬</span>अभी कोई messages नहीं — किसी की profile से Message भेजें</div>';
        return;
      }
      list.innerHTML = '';
      convos.forEach(c => {
        const row = document.createElement('div');
        row.className = 'dm-inbox-row';
        row.innerHTML = `
          <div class="dm-inbox-avatar">${_avatarHtml(c.user)}${c.online ? '<span class="online-dot"></span>' : ''}</div>
          <div class="dm-inbox-mid">
            <div class="dm-inbox-name">${c.user.username ? '@'+_e(c.user.username) : _e(c.user.name)}</div>
            <div class="dm-inbox-preview">${c.lastMessageMine ? 'आप: ' : ''}${_e(c.lastMessage).slice(0,45)}</div>
          </div>
          ${c.unread ? `<span class="dm-unread-badge">${c.unread}</span>` : ''}`;
        row.addEventListener('click', () => openDMThread(c.userId, c.user));
        list.appendChild(row);
      });
    } catch (e) { list.innerHTML = `<div class="vs-empty">${e.message}</div>`; }
  }

  /* ══════════════════════════════════════
     DIRECT MESSAGES — THREAD
  ══════════════════════════════════════ */
  function openDMThread(userId, userHint) {
    if (!token || !userData) { openAuth('login'); return; }
    dmThreadUser = { id: userId, ...userHint };
    openSubScreen('screen-dm-thread');
    const nameEl = document.getElementById('dm-thread-name');
    if (nameEl && userHint) nameEl.textContent = userHint.username ? '@' + userHint.username : userHint.name;
    _loadThread(userId);
    _stopDmPolling();
    dmPollTimer = setInterval(() => _loadThread(userId, true), 4000);
    setTimeout(() => { const i = document.getElementById('dm-inp'); if (i && window.innerWidth < 768) i.focus(); }, 400);
  }

  function closeDMThread() {
    _stopDmPolling();
    dmThreadUser = null;
    closeSubScreen('screen-dm-thread');
  }
  function _stopDmPolling() { if (dmPollTimer) { clearInterval(dmPollTimer); dmPollTimer = null; } }
  // Exposed so closeSubScreen() can stop polling even when the thread is closed via
  // hardware/ESC back navigation rather than the screen's own back arrow.
  function stopDmPolling() { _stopDmPolling(); dmThreadUser = null; }

  async function _loadThread(userId, silent) {
    const container = document.getElementById('dm-msgs');
    if (!container) return;
    if (!silent) container.innerHTML = '<div class="vs-loading-text">Loading…</div>';
    try {
      const d = await apiFetch(`/api/messages/${userId}`);
      const nameEl = document.getElementById('dm-thread-name');
      if (nameEl) nameEl.textContent = d.user.username ? '@' + d.user.username : d.user.name;
      _renderThreadMsgs(container, d.messages || []);
    } catch (e) {
      if (!silent) container.innerHTML = `<div class="vs-empty">${e.message}</div>`;
    }
  }

  function _renderThreadMsgs(container, msgs) {
    const atBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
    container.innerHTML = '';
    if (!msgs.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">पहले message भेजें! 💬</div>';
      return;
    }
    let lastDate = '';
    msgs.forEach(m => {
      const at = new Date(m.createdAt);
      const ds = at.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      if (ds !== lastDate) {
        const div = document.createElement('div'); div.className = 'chat-date-div';
        div.innerHTML = `<span>${ds}</span>`; container.appendChild(div); lastDate = ds;
      }
      const time = at.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
      const row = document.createElement('div');
      row.className = `chat-row ${m.mine ? 'sent' : 'recv'}`;
      row.innerHTML = `<div class="chat-bub"><div class="chat-txt">${_e(m.message)}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span>${m.mine?'<span class="chat-tks">✓✓</span>':''}</div></div>`;
      container.appendChild(row);
    });
    if (atBottom) container.scrollTop = container.scrollHeight;
  }

  let _sendingDM = false;
  async function sendDM() {
    if (!dmThreadUser) return;
    if (_sendingDM) return;
    const inp = document.getElementById('dm-inp');
    const text = inp?.value.trim();
    if (!text) return;
    _sendingDM = true;
    inp.value = ''; inp.style.height = 'auto';
    try {
      await apiFetch(`/api/messages/${dmThreadUser.id}`, { method: 'POST', body: JSON.stringify({ message: text }) });
      _loadThread(dmThreadUser.id, true);
    } catch (e) {
      showToast('Message नहीं गया: ' + e.message, 'error');
      if (inp && !inp.value) inp.value = text;
    } finally {
      _sendingDM = false;
      if (inp) { inp.disabled = false; inp.focus(); }
    }
  }

  function _bindDMInput() {
    const inp = document.getElementById('dm-inp');
    const btn = document.getElementById('dm-send-btn');
    if (!inp || !btn) return;
    inp.addEventListener('input', () => {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendDM(); } });
    btn.addEventListener('click', sendDM);
  }

  /* ══════════════════════════════════════
     SEARCH RESULTS → PROFILE (wired from app.js)
  ══════════════════════════════════════ */
  function init() {
    _bindDMInput();
  }

  window.openUserProfile = openUserProfile;
  window.closeDMThread   = closeDMThread;
  window.openDMInbox     = openDMInbox;

  return { init, openUserProfile, openUserProfileByUsername, openDMInbox, openDMThread, closeDMThread, stopDmPolling, sendFriendRequest, respondFriendRequest, unfriend };
})();
