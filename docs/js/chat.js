/* ═══════════════════════════════════════════
   VidyaSagar v3 — chat.js
   Firebase Group Chat + AI Chat
═══════════════════════════════════════════ */
const ChatModule = (() => {
  let db = null, groupUnsubscribe = null, pollInterval = null;
  let chatBgUrl = localStorage.getItem('vs_chat_bg_custom') || null;

  function init() {
    // Init Firebase
    try {
      if (VS_CONFIG.FIREBASE.apiKey !== 'YOUR_FIREBASE_API_KEY') {
        if (!firebase.apps.length) firebase.initializeApp(VS_CONFIG.FIREBASE);
        db = firebase.firestore();
        // Auto-delete messages older than 3 months handled by querying
      }
    } catch(e) { console.warn('Firebase not configured:', e.message); }
    // Apply saved chat background
    if (chatBgUrl) {
      const msgs = document.getElementById('group-msgs');
      if (msgs) msgs.style.background = `url(${chatBgUrl}) center/cover no-repeat`;
    }
    // Bind AI chat
    bindAIChat();
    // Bind group chat swipe
    bindGroupChatSwipe();
  }

  /* ── Group Chat ── */
  function openGroupChat() {
    if (!token || !userData) { openAuth('login'); return; }
    openSubScreen('screen-group-chat');
    loadGroupMessages();
    startPolling();
  }

  function loadGroupMessages() {
    const container = document.getElementById('group-msgs');
    if (!container) return;
    if (!db) { loadGroupFromBackend(container); return; }
    // Firebase version
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    db.collection('group_chat')
      .where('createdAt', '>', firebase.firestore.Timestamp.fromDate(threeMonthsAgo))
      .orderBy('createdAt', 'asc')
      .limitToLast(60)
      .get()
      .then(snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGroupMessages(container, msgs);
      })
      .catch(() => loadGroupFromBackend(container));
  }

  async function loadGroupFromBackend(container) {
    try {
      const d = await apiFetch('/api/chat');
      renderGroupMessages(container, d.messages || []);
    } catch(e) { container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3)">${e.message}</div>`; }
  }

  function renderGroupMessages(container, msgs) {
    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
    container.innerHTML = '';
    if (!msgs.length) { container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">पहले message भेजें! 💬</div>'; return; }
    let lastDate = '';
    msgs.forEach(msg => {
      const createdAt = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt);
      const dateStr = createdAt.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      if (dateStr !== lastDate) {
        const div = document.createElement('div');
        div.className = 'chat-date-div';
        div.innerHTML = `<span>${dateStr}</span>`;
        container.appendChild(div);
        lastDate = dateStr;
      }
      container.appendChild(buildGroupBubble(msg, createdAt));
    });
    if (wasAtBottom) container.scrollTop = container.scrollHeight;
    // Apply chat bg
    if (chatBgUrl) container.style.background = `url(${chatBgUrl}) center/cover no-repeat`;
  }

  function buildGroupBubble(msg, date) {
    const myId = userData?.id || userData?._id;
    const isMe = String(msg.user || msg.userId) === String(myId);
    const time = date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    const row = document.createElement('div');
    row.className = `chat-row ${isMe ? 'sent' : 'recv'}`;
    if (isMe) {
      row.innerHTML = `<div class="chat-bub"><div class="chat-txt">${escHtml(msg.message || msg.text || '')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span><span class="chat-tks">✓✓</span></div></div>`;
    } else {
      row.innerHTML = `<div class="chat-av">${msg.userAvatar || '🎓'}</div><div class="chat-bub"><span class="chat-sender">${msg.userName || 'User'}</span><div class="chat-txt">${escHtml(msg.message || msg.text || '')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span></div></div>`;
    }
    return row;
  }

  async function sendGroupMessage() {
    if (!token || !userData) { openAuth('login'); return; }
    const inp = document.getElementById('group-inp');
    const text = inp?.value.trim();
    if (!text) return;
    const orig = text; inp.value = ''; inp.style.height = 'auto';
    try {
      if (db) {
        await db.collection('group_chat').add({
          userId: userData.id || userData._id, user: userData.id || userData._id,
          userName: userData.name, userAvatar: userData.avatar || '🎓',
          text, message: text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      } else {
        await apiFetch('/api/chat', { method:'POST', body: JSON.stringify({ message: text }) });
      }
      loadGroupMessages();
    } catch(e) { showToast('Message नहीं गया: ' + e.message, 'error'); inp.value = orig; }
  }

  function startPolling() {
    stopPolling();
    pollInterval = setInterval(loadGroupMessages, 5000);
  }

  function stopPolling() { clearInterval(pollInterval); pollInterval = null; }

  /* ── Swipe to send (group chat) ── */
  function bindGroupChatSwipe() {
    const wrap = document.getElementById('group-inp-box');
    const sendBtn = document.getElementById('group-send-btn');
    const inp = document.getElementById('group-inp');
    if (!wrap || !sendBtn || !inp) return;

    // Auto-resize textarea
    inp.addEventListener('input', () => {
      inp.style.height = 'auto';
      inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    });

    // Enter to send
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendGroupMessage(); }
    });

    sendBtn.addEventListener('click', sendGroupMessage);

    // Swipe right to send
    let tx = 0, ty = 0;
    wrap.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive:true });
    wrap.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - tx;
      const dy = Math.abs(e.touches[0].clientY - ty);
      if (dx > 22 && dy < 30) { wrap.classList.add('swipe-ready'); sendBtn.classList.add('ready'); }
      else { wrap.classList.remove('swipe-ready'); sendBtn.classList.remove('ready'); }
    }, { passive:true });
    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = Math.abs(e.changedTouches[0].clientY - ty);
      wrap.classList.remove('swipe-ready'); sendBtn.classList.remove('ready');
      if (dx > 60 && dy < 40) {
        sendBtn.classList.add('sending');
        sendGroupMessage();
        setTimeout(() => sendBtn.classList.remove('sending'), 350);
      }
    }, { passive:true });
  }

  /* ── AI Chat ── */
  function bindAIChat() {
    const inp = document.getElementById('ai-inp');
    const btn = document.getElementById('ai-send-btn');
    if (!inp || !btn) return;
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendAIMessage(); } });
    btn.addEventListener('click', sendAIMessage);
  }

  async function sendAIMessage() {
    if (!token) { openAuth('login'); return; }
    const inp = document.getElementById('ai-inp');
    const text = inp?.value.trim();
    if (!text) return;
    inp.value = '';
    const container = document.getElementById('ai-msgs');
    // Add user bubble
    const userRow = document.createElement('div');
    userRow.className = 'ai-msg-wrap user';
    userRow.innerHTML = `<div class="ai-bub">${escHtml(text)}</div>`;
    container.appendChild(userRow);
    container.scrollTop = container.scrollHeight;
    // Show typing indicator
    const typingRow = document.createElement('div');
    typingRow.className = 'ai-msg-wrap'; typingRow.id = 'ai-typing-ind';
    typingRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub" style="padding:10px 14px"><div class="ai-typing-ind"><div class="ai-td"></div><div class="ai-td"></div><div class="ai-td"></div></div></div>`;
    container.appendChild(typingRow);
    container.scrollTop = container.scrollHeight;
    try {
      const d = await apiFetch('/api/ai/chat', { method:'POST', body: JSON.stringify({ message: text }) });
      typingRow.remove();
      const aiRow = document.createElement('div');
      aiRow.className = 'ai-msg-wrap';
      aiRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub">${escHtml(d.reply || 'Sorry, could not get response.')}</div>`;
      container.appendChild(aiRow);
      container.scrollTop = container.scrollHeight;
    } catch(e) {
      typingRow.remove();
      const errRow = document.createElement('div');
      errRow.className = 'ai-msg-wrap';
      errRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub" style="color:var(--rose)">Error: ${e.message}</div>`;
      container.appendChild(errRow);
    }
  }

  function openAIChat() { openSubScreen('screen-ai-chat'); document.getElementById('ai-inp')?.focus(); }
  function openGroupChat_ext() { openGroupChat(); }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  // expose
  window.openAIChat = openAIChat;
  window.openGroupChat = openGroupChat_ext;
  return { init, stopPolling };
})();
