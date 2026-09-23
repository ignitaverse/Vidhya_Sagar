/* VidyaSagar — owner.js (naya)
   ═══════════════════════════════════════════════════════════════════
   Owner Panel ka poora frontend: exam/paragraph add karna, premium code
   generate/cancel karna. Har privileged action `x-admin-secret` header
   ke saath backend ko jaata hai (dekho backend/middleware/adminMiddleware.js)
   - asli security WAHIN hai, yahan ka "locked/unlocked" view sirf UX hai.

   Secret ek baar verify hone ke baad is DEVICE ke localStorage mein
   save ho jaata hai, taaki baar-baar na poochhna pade. Agar kabhi
   backend secret badal jaaye (ya galti se purana secret save ho), to
   agli hi admin action 403 dega - us waqt hum khud localStorage saaf
   karke wapas "locked" dikha dete hain. */
const OwnerModule = (() => {
  'use strict';
  const SECRET_KEY = 'vs_owner_secret';

  function _secret() { return localStorage.getItem(SECRET_KEY) || ''; }

  // apiFetch() jaisa hi, lekin Authorization ke bajaye x-admin-secret
  // header bhejta hai - ye USER login se bilkul alag cheez hai.
  async function _adminFetch(path, opts = {}) {
    const r = await fetch(`${VS_CONFIG.API}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': _secret(),
        ...(opts.headers || {}),
      },
    });
    let d = {};
    try { d = await r.json(); } catch (e) { /* body khaali ho sakta hai */ }
    if (r.status === 403) {
      // Stored secret ab kaam nahi kar raha - saaf karke locked view.
      localStorage.removeItem(SECRET_KEY);
      _showLocked();
      throw new Error('Secret galat hai ya expire ho gaya - dobara enter karein');
    }
    if (!r.ok) throw new Error(d.message || 'Server error');
    return d;
  }

  function _showLocked() {
    document.getElementById('owner-locked-view')?.classList.remove('hidden');
    document.getElementById('owner-unlocked-view')?.classList.add('hidden');
  }
  function _showUnlocked() {
    document.getElementById('owner-locked-view')?.classList.add('hidden');
    document.getElementById('owner-unlocked-view')?.classList.remove('hidden');
  }

  function openPanel() {
    openSubScreen('screen-owner-panel');
    if (_secret()) { _showUnlocked(); loadCodes(); loadOwnerChats(); } else { _showLocked(); }
  }

  async function unlock() {
    const entered = prompt('Owner secret enter karein:');
    if (!entered) return;
    localStorage.setItem(SECRET_KEY, entered.trim());
    try {
      // Ek halke, read-only admin route se verify karte hain.
      await _adminFetch('/api/premium/list');
      _showUnlocked();
      showToast('Unlock ho gaya ✅', 'success');
      loadCodes();
      loadOwnerChats();
    } catch (e) {
      showToast('Galat secret', 'error');
    }
  }

  function lock() {
    localStorage.removeItem(SECRET_KEY);
    _showLocked();
  }

  async function createExam() {
    const examId = document.getElementById('own-exam-id')?.value.trim();
    const name = document.getElementById('own-exam-name')?.value.trim();
    const category = document.getElementById('own-exam-category')?.value;
    const languages = [];
    if (document.getElementById('own-exam-lang-en')?.checked) languages.push('english');
    if (document.getElementById('own-exam-lang-hi')?.checked) languages.push('hindi');
    const resultEl = document.getElementById('own-exam-result');
    if (!examId || !name) { if (resultEl) resultEl.innerHTML = '<span style="color:var(--rose)">Exam ID aur Name dono chahiye</span>'; return; }
    try {
      const d = await _adminFetch('/api/typing/exams', { method: 'POST', body: JSON.stringify({ examId, name, category, languages }) });
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--green)">✅ "${escapeHtml(d.exam.name)}" ban gaya (id: ${escapeHtml(d.exam.examId)})</span>`;
      document.getElementById('own-exam-id').value = '';
      document.getElementById('own-exam-name').value = '';
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--rose)">${escapeHtml(e.message)}</span>`;
    }
  }

  async function addParagraphs() {
    const examId = document.getElementById('own-para-exam-id')?.value.trim();
    const language = document.querySelector('input[name="own-para-lang"]:checked')?.value || 'english';
    const bulkText = document.getElementById('own-para-text')?.value;
    const resultEl = document.getElementById('own-para-result');
    if (!examId || !bulkText?.trim()) { if (resultEl) resultEl.innerHTML = '<span style="color:var(--rose)">Exam ID aur paragraph text dono chahiye</span>'; return; }
    try {
      const d = await _adminFetch('/api/typing/passages', { method: 'POST', body: JSON.stringify({ examId, language, bulkText }) });
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--green)">✅ ${d.count} paragraph save ho gaye</span>`;
      document.getElementById('own-para-text').value = '';
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--rose)">${escapeHtml(e.message)}</span>`;
    }
  }

  async function generateCode() {
    const durationDays = Number(document.getElementById('own-code-days')?.value);
    const note = document.getElementById('own-code-note')?.value.trim();
    const resultEl = document.getElementById('own-code-result');
    if (!durationDays || durationDays <= 0) { if (resultEl) resultEl.innerHTML = '<span style="color:var(--rose)">Kitne din, ye batayein</span>'; return; }
    try {
      const d = await _adminFetch('/api/premium/generate', { method: 'POST', body: JSON.stringify({ durationDays, note }) });
      if (resultEl) resultEl.innerHTML = `
        <div style="background:var(--bg2);border:1.5px dashed var(--blue);border-radius:10px;padding:12px">
          <div style="font-size:1.15rem;font-weight:800;letter-spacing:1px;color:var(--blue)">${escapeHtml(d.code.code)}</div>
          <div style="font-size:.74rem;color:var(--text3);margin-top:4px">${durationDays} din ka - user ko ye code bhej dein</div>
        </div>`;
      loadCodes();
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--rose)">${escapeHtml(e.message)}</span>`;
    }
  }

  async function cancelSubscription() {
    const userIdentifier = document.getElementById('own-cancel-user')?.value.trim();
    const resultEl = document.getElementById('own-cancel-result');
    if (!userIdentifier) { if (resultEl) resultEl.innerHTML = '<span style="color:var(--rose)">Username ya email daalein</span>'; return; }
    const ok = await showConfirm({
      icon: '🚫', title: 'Subscription cancel karein?',
      body: `${userIdentifier} ka premium turant band ho jaayega.`,
      okText: 'Haan, cancel karein', cancelText: 'Nahi', danger: true,
    });
    if (!ok) return;
    try {
      const d = await _adminFetch('/api/premium/cancel', { method: 'POST', body: JSON.stringify({ user: userIdentifier }) });
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--green)">✅ ${escapeHtml(d.message)}</span>`;
      document.getElementById('own-cancel-user').value = '';
    } catch (e) {
      if (resultEl) resultEl.innerHTML = `<span style="color:var(--rose)">${escapeHtml(e.message)}</span>`;
    }
  }

  async function loadCodes() {
    const listEl = document.getElementById('own-codes-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:10px">Loading...</div>';
    try {
      const d = await _adminFetch('/api/premium/list');
      if (!d.codes.length) { listEl.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:10px">Koi code abhi tak nahi bana</div>'; return; }
      listEl.innerHTML = d.codes.map(c => {
        const used = !!c.redeemedBy;
        const expired = !used && new Date(c.redeemBy) < new Date();
        const status = used ? `✅ ${escapeHtml(c.redeemedBy.name || c.redeemedBy.username || '')}` : (expired ? '⌛ Expired' : '🟡 Unused');
        return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border);font-size:.78rem">
          <div><div style="font-weight:700">${escapeHtml(c.code)}</div><div style="color:var(--text3)">${c.durationDays} din${c.note ? ' · ' + escapeHtml(c.note) : ''}</div></div>
          <div>${status}</div>
        </div>`;
      }).join('');
    } catch (e) {
      listEl.innerHTML = `<div style="text-align:center;color:var(--rose);font-size:.8rem;padding:10px">${escapeHtml(e.message)}</div>`;
    }
  }

  async function loadOwnerChats() {
    const listEl = document.getElementById('own-chats-list');
    if (!listEl) return;
    listEl.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:10px">Loading...</div>';
    try {
      const d = await _adminFetch('/api/messages/owner-chat-threads');
      if (!d.threads.length) { listEl.innerHTML = '<div style="text-align:center;color:var(--text3);font-size:.8rem;padding:10px">Koi message abhi tak nahi aaya</div>'; return; }
      listEl.innerHTML = d.threads.map(t => `
        <div class="settings-row" style="cursor:pointer" data-user-id="${escapeHtml(t.userId)}" data-user-name="${escapeHtml(t.user.name)}">
          <div class="sr-icon">${t.user.avatar || '🎓'}</div>
          <div class="sr-text">
            <div class="sr-label">${escapeHtml(t.user.name)}${t.unread ? ` <span style="color:var(--rose)">● ${t.unread} new</span>` : ''}</div>
            <div class="sr-sub">${t.lastMessageMine ? 'Aap: ' : ''}${escapeHtml((t.lastMessage || '').slice(0, 50))}</div>
          </div>
          <span class="sr-arrow">›</span>
        </div>`).join('');
      // Event delegation - reply karne ke liye owner apne hi normal account
      // se DM thread kholta hai (koi alag reply-UI banane ki zaroorat nahi).
      listEl.querySelectorAll('[data-user-id]').forEach(row => {
        row.addEventListener('click', () => {
          if (typeof SocialModule !== 'undefined') {
            SocialModule.openDMThread(row.dataset.userId, { name: row.dataset.userName });
          }
        });
      });
    } catch (e) {
      listEl.innerHTML = `<div style="text-align:center;color:var(--rose);font-size:.8rem;padding:10px">${escapeHtml(e.message)}</div>`;
    }
  }

  return { openPanel, unlock, lock, createExam, addParagraphs, generateCode, cancelSubscription, loadCodes, loadOwnerChats };
})();
window.OwnerModule = OwnerModule;
