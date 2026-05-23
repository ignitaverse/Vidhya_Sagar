/* VidyaSagar v4 — chat.js (IMPROVED) */
const ChatModule = (() => {
  let db = null, pollInterval = null;
  let chatBgUrl = localStorage.getItem('vs_chat_bg_custom') || null;
  let replyingTo = null; // { id, text, sender }

  function init() {
    try {
      if (VS_CONFIG.FIREBASE.apiKey !== 'YOUR_FIREBASE_API_KEY') {
        if (!firebase.apps.length) firebase.initializeApp(VS_CONFIG.FIREBASE);
        db = firebase.firestore();
      }
    } catch(e) { console.warn('Firebase not configured:', e.message); }

    if (chatBgUrl) {
      const msgs = document.getElementById('group-msgs');
      if (msgs) msgs.style.backgroundImage = `url(${chatBgUrl})`;
    }
    bindAIChat();
    bindGroupChatSwipe();
  }

  /* ── Group Chat ── */
  function openGroupChat() {
    if (!token || !userData) { openAuth('login'); return; }
    openSubScreen('screen-group-chat');
    loadGroupMessages();
    startPolling();
    // Auto-focus keyboard on mobile
    setTimeout(() => {
      const inp = document.getElementById('group-inp');
      if (inp && window.innerWidth < 768) inp.focus();
    }, 500);
  }

  function loadGroupMessages() {
    const container = document.getElementById('group-msgs');
    if (!container) return;
    if (!db) { loadGroupFromBackend(container); return; }
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
    } catch(e) {
      container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text3)">${e.message}</div>`;
    }
  }

  function renderGroupMessages(container, msgs) {
    const wasAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 80;
    container.innerHTML = '';
    if (!msgs.length) {
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">पहले message भेजें! 💬</div>';
      return;
    }
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
    if (chatBgUrl) container.style.backgroundImage = `url(${chatBgUrl})`;
  }

  function buildGroupBubble(msg, date) {
    const myId = userData?.id || userData?._id;
    const isMe = String(msg.user || msg.userId) === String(myId);
    const time = date.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' });
    const row = document.createElement('div');
    row.className = `chat-row ${isMe ? 'sent' : 'recv'}`;
    row.dataset.msgId = msg.id || '';
    row.dataset.msgText = (msg.message || msg.text || '').substring(0, 80);
    row.dataset.msgSender = isMe ? 'You' : (msg.userName || 'User');

    const replyHtml = msg.replyTo ?
      `<div class="reply-preview">↩️ ${escHtml(msg.replyTo.sender)}: ${escHtml(msg.replyTo.text)}</div>` : '';

    if (isMe) {
      row.innerHTML = `<div class="chat-bub">${replyHtml}<div class="chat-txt">${escHtml(msg.message || msg.text || '')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span><span class="chat-tks">✓✓</span></div></div>`;
    } else {
      row.innerHTML = `<div class="chat-av">${msg.userAvatar || '🎓'}</div><div class="chat-bub">${replyHtml}<span class="chat-sender">${msg.userName || 'User'}</span><div class="chat-txt">${escHtml(msg.message || msg.text || '')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span></div></div>`;
    }

    // Swipe to reply
    addSwipeReply(row);
    return row;
  }

  /* ── Swipe to Reply ── */
  function addSwipeReply(row) {
    let startX = 0, startY = 0, swiping = false;
    row.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      swiping = false;
    }, { passive: true });

    row.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - startX;
      const dy = Math.abs(e.touches[0].clientY - startY);
      if (dx > 40 && dy < 30) {
        swiping = true;
        row.style.transform = `translateX(${Math.min(dx * 0.5, 60)}px)`;
        row.style.transition = 'none';
      }
    }, { passive: true });

    row.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - startX;
      row.style.transform = '';
      row.style.transition = 'transform .2s ease';
      setTimeout(() => { row.style.transition = ''; }, 250);
      if (swiping && dx > 55) {
        setReply({
          text: row.dataset.msgText,
          sender: row.dataset.msgSender
        });
      }
      swiping = false;
    }, { passive: true });
  }

  function setReply(msg) {
    replyingTo = msg;
    const bar = document.getElementById('reply-preview-bar');
    const txt = document.getElementById('reply-preview-text');
    if (bar) bar.classList.add('show');
    if (txt) txt.textContent = `${msg.sender}: ${msg.text}`;
    document.getElementById('group-inp')?.focus();
  }

  window.clearReply = function() {
    replyingTo = null;
    const bar = document.getElementById('reply-preview-bar');
    if (bar) bar.classList.remove('show');
  };

  async function sendGroupMessage() {
    if (!token || !userData) { openAuth('login'); return; }
    const inp = document.getElementById('group-inp');
    const text = inp?.value.trim();
    if (!text) return;
    const orig = text;
    inp.value = '';
    inp.style.height = 'auto';
    const reply = replyingTo ? { ...replyingTo } : null;
    window.clearReply();

    try {
      if (db) {
        const msgData = {
          userId: userData.id || userData._id,
          user: userData.id || userData._id,
          userName: userData.name,
          userAvatar: userData.avatar || '🎓',
          text, message: text,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (reply) msgData.replyTo = reply;
        await db.collection('group_chat').add(msgData);
      } else {
        await apiFetch('/api/chat', { method: 'POST', body: JSON.stringify({ message: text }) });
      }
      loadGroupMessages();
    } catch(e) {
      showToast('Message नहीं गया: ' + e.message, 'error');
      inp.value = orig;
    }
  }

  function startPolling() { stopPolling(); pollInterval = setInterval(loadGroupMessages, 5000); }
  function stopPolling() { clearInterval(pollInterval); pollInterval = null; }

  /* ── Group Chat Input Bindings ── */
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

    // Enter to send (desktop), Shift+Enter for newline
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGroupMessage();
      }
    });

    sendBtn.addEventListener('click', sendGroupMessage);

    // Swipe right on the send button area to send
    let tx = 0, ty = 0;
    wrap.addEventListener('touchstart', e => {
      tx = e.touches[0].clientX;
      ty = e.touches[0].clientY;
    }, { passive: true });

    wrap.addEventListener('touchmove', e => {
      const dx = e.touches[0].clientX - tx;
      const dy = Math.abs(e.touches[0].clientY - ty);
      if (dx > 22 && dy < 30) {
        wrap.classList.add('swipe-ready');
        sendBtn.classList.add('ready');
      } else {
        wrap.classList.remove('swipe-ready');
        sendBtn.classList.remove('ready');
      }
    }, { passive: true });

    wrap.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - tx;
      const dy = Math.abs(e.changedTouches[0].clientY - ty);
      wrap.classList.remove('swipe-ready');
      sendBtn.classList.remove('ready');
      if (dx > 60 && dy < 40) {
        sendBtn.classList.add('sending');
        sendGroupMessage();
        setTimeout(() => sendBtn.classList.remove('sending'), 350);
      }
    }, { passive: true });
  }

  /* ── AI Chat ── */
  const aiHistory = [];

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

    // User bubble
    const userRow = document.createElement('div');
    userRow.className = 'ai-msg-wrap user';
    userRow.innerHTML = `<div class="ai-bub">${escHtml(text)}</div>`;
    container.appendChild(userRow);
    container.scrollTop = container.scrollHeight;

    // Typing indicator
    const typingRow = document.createElement('div');
    typingRow.className = 'ai-msg-wrap';
    typingRow.id = 'ai-typing-ind';
    typingRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub" style="padding:10px 14px"><div class="ai-typing-ind"><div class="ai-td"></div><div class="ai-td"></div><div class="ai-td"></div></div></div>`;
    container.appendChild(typingRow);
    container.scrollTop = container.scrollHeight;

    try {
      const d = await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text, sessionId: 'ai_' + (userData?.id || 'guest') })
      });
      document.getElementById('ai-typing-ind')?.remove();
      const aiRow = document.createElement('div');
      aiRow.className = 'ai-msg-wrap';
      // Format reply — convert **bold** and line breaks
      const formatted = escHtml(d.reply || 'Sorry, could not get response.')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
      aiRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub">${formatted}</div>`;
      container.appendChild(aiRow);
      container.scrollTop = container.scrollHeight;
    } catch(e) {
      document.getElementById('ai-typing-ind')?.remove();
      const errRow = document.createElement('div');
      errRow.className = 'ai-msg-wrap';
      errRow.innerHTML = `<div class="ai-av">🤖</div><div class="ai-bub" style="color:var(--rose)">Error: ${e.message}</div>`;
      container.appendChild(errRow);
    }
  }

  function openAIChat() {
    openSubScreen('screen-ai-chat');
    setTimeout(() => document.getElementById('ai-inp')?.focus(), 300);
  }

  function openGroupChat_ext() { openGroupChat(); }

  function escHtml(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  window.openAIChat   = openAIChat;
  window.openGroupChat= openGroupChat_ext;

  return { init, stopPolling };
})();
