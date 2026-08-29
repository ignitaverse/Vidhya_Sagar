/* ═══════════════════════════════════════════════════════════════
   VidyaSagar — js/player.js (FRONTEND)
   "Player" tab - Watch Online, clevra_bot (Telegram bot) ke
   /api/catalog aur /api/web-watch se baat karta hai.

   Login zaroori NAHI hai - har visitor ek localStorage UUID
   (vs_player_visitor_id) se track hota hai. Non-premium Telegram
   users jaisi hi policy: "1 video / N din" - bot ke apne
   POST_TRIAL_COOLDOWN_DAYS jitna hi (dekho backend config.py).
═══════════════════════════════════════════════════════════════ */
const PlayerModule = (() => {
  'use strict';

  let _items = [];
  let _currentQuery = '';
  let _searchTimer = null;
  let _loading = false;

  /* ── Visitor ID (login nahi hai, isliye browser me persist karte hain) ── */
  function _getVisitorId() {
    let id = localStorage.getItem('vs_player_visitor_id');
    if (!id) {
      id = (window.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      localStorage.setItem('vs_player_visitor_id', id);
    }
    return id;
  }

  function _esc(s) {
    const d = document.createElement('div');
    d.textContent = (s === null || s === undefined) ? '' : String(s);
    return d.innerHTML;
  }

  function _api(path) {
    const base = (window.VS_CONFIG && VS_CONFIG.WATCH_API) ? VS_CONFIG.WATCH_API : '';
    return base.replace(/\/$/, '') + path;
  }

  /* ── Catalog load / search ── */
  async function loadCatalog(query) {
    if (_loading) return;
    _loading = true;
    _currentQuery = (query || '').trim();
    const grid = document.getElementById('pl-grid');
    if (grid) grid.innerHTML = '<div class="vs-loading-text">Load हो रहा है…</div>';

    try {
      const url = _api('/api/catalog?q=' + encodeURIComponent(_currentQuery) + '&limit=60');
      const res = await fetch(url);
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Load fail');
      _items = data.items || [];
      _renderGrid();
    } catch (e) {
      console.warn('[Player] catalog load failed:', e.message);
      if (grid) {
        grid.innerHTML = '<div class="pl-empty">⚠️ Catalog load nahi ho paya। Thodi der baad try karein।</div>';
      }
    } finally {
      _loading = false;
    }
  }

  function _renderGrid() {
    const grid = document.getElementById('pl-grid');
    if (!grid) return;
    if (!_items.length) {
      const msg = _currentQuery
        ? `😕 "${_esc(_currentQuery)}" ke liye kuch nahi mila`
        : '😕 Abhi catalog khaali hai';
      grid.innerHTML = `<div class="pl-empty">${msg}</div>`;
      return;
    }
    grid.innerHTML = _items.map(it => `
      <div class="pl-card" data-title="${_esc(it.name)}">
        <div class="pl-card-icon">🎬</div>
        <div class="pl-card-title">${_esc(it.name)}</div>
        <div class="pl-card-meta">
          ${it.year ? `<span class="pl-tag pl-tag-year">${_esc(it.year)}</span>` : ''}
          ${(it.qualities || []).slice(0, 2).map(q => `<span class="pl-tag pl-tag-q">${_esc(q)}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  /* ── Play (pehli baar anonymous, dusri baar se login zaroori) ── */
  const FREE_WATCH_FLAG = 'vs_player_used_free_watch';

  async function playTitle(title) {
    if (!title) return;
    const banner = document.getElementById('pl-cooldown-banner');
    if (banner) banner.classList.add('hidden');

    const usedFreeAlready = localStorage.getItem(FREE_WATCH_FLAG) === '1';

    if (!usedFreeAlready) {
      // Pehla, anonymous watch - login zaroori nahi.
      try {
        const res = await fetch(_api('/api/web-watch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title, visitor_id: _getVisitorId() }),
        });
        const data = await res.json();

        if (data.success) {
          localStorage.setItem(FREE_WATCH_FLAG, '1');
          _openPlayer(_api(data.stream_url), title);
          return;
        }
        if (data.reason === 'login_required') {
          // Backend ke hisaab se bhi free watch use ho chuka hai (jaise
          // kisi doosre tab/session se) - local flag sync kar ke aage
          // login-flow mein badh jaate hain.
          localStorage.setItem(FREE_WATCH_FLAG, '1');
        } else {
          alert(data.message || 'Ye video abhi available nahi hai।');
          return;
        }
      } catch (e) {
        console.warn('[Player] anonymous watch failed:', e.message);
        alert('Kuch gadbad hui, dobara try karein।');
        return;
      }
    }

    // Doosri baar se - login zaroori.
    if (typeof token === 'undefined' || !token) {
      alert('Pehla video free tha 🎉 - agla video dekhne ke liye login/signup karo (bilkul free hai)।');
      if (typeof openAuth === 'function') openAuth('login');
      return;
    }

    try {
      const res = await fetch((VS_CONFIG.API || '').replace(/\/$/, '') + '/api/player/watch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ title: title }),
      });
      const data = await res.json();

      if (data.success) {
        _openPlayer(_api(data.stream_url), title);
        return;
      }
      if (data.reason === 'cooldown') {
        _showCooldown(data.next_allowed_at);
      } else {
        alert(data.message || 'Ye video abhi available nahi hai।');
      }
    } catch (e) {
      console.warn('[Player] member watch failed:', e.message);
      alert('Kuch gadbad hui, dobara try karein।');
    }
  }

  function _showCooldown(nextAllowedAt) {
    const banner = document.getElementById('pl-cooldown-banner');
    if (!banner) return;
    const msLeft = (Number(nextAllowedAt) * 1000) - Date.now();
    if (msLeft <= 0) {
      banner.textContent = '✅ Ab aap ek naya video dekh sakte hain - koi bhi card dabao।';
    } else {
      const totalHrs = Math.ceil(msLeft / 3600000);
      const days = Math.floor(totalHrs / 24);
      const hrs = totalHrs % 24;
      const when = days > 0 ? `${days} din ${hrs} ghante` : `${totalHrs} ghante`;
      banner.textContent =
        `⏳ Free limit khatam - agla video ${when} baad dekh sakte hain। ` +
        `Telegram Bot par Premium lekar ye limit hata sakte hain।`;
    }
    banner.classList.remove('hidden');
    banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ── Video modal ── */
  function _openPlayer(streamUrl, title) {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const titleEl = document.getElementById('pl-video-title');
    if (!modal || !video) return;
    if (titleEl) titleEl.textContent = title;
    video.src = streamUrl;
    modal.classList.remove('hidden');
    video.play().catch(() => { /* autoplay block ho sakta hai - controls se chala sakte hain */ });
  }

  function closePlayer() {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (modal) modal.classList.add('hidden');
  }

  /* ── Event delegation (grid + search box dono dynamically render hote hain) ── */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.pl-card');
    if (card) playTitle(card.dataset.title);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id !== 'pl-search-input') return;
    clearTimeout(_searchTimer);
    const val = e.target.value;
    _searchTimer = setTimeout(() => loadCatalog(val), 350);
  });

  return { loadCatalog, playTitle, closePlayer };
})();
