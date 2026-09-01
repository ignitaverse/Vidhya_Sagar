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
    // FIX (asli root cause): config.js mein `const VS_CONFIG` hai - top-level
    // const/let KABHI window ka property nahi banta, isliye `window.VS_CONFIG`
    // hamesha undefined tha, chahe VS_CONFIG khud available ho. Isse har API
    // call ka base HAMESHA '' ban jaata tha - matlab fetch VidyaSagar ke apne
    // domain (ignitaverse.github.io) par jaati thi, clevra-bot par nahi, aur
    // wahan se GitHub Pages ka apna 404 HTML page wapas aata tha (isiliye
    // "Unexpected token '<', <!DOCTYPE" wali JSON-parse error). Ab `typeof`
    // se check karte hain, jo bare identifier ko sahi dhoondh leta hai.
    const base = (typeof VS_CONFIG !== 'undefined' && VS_CONFIG.WATCH_API) ? VS_CONFIG.WATCH_API : '';
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
      const detail = (e && e.message) ? e.message : String(e);
      console.error('[Player] catalog load failed - actual error:', e);
      if (grid) {
        grid.innerHTML =
          '<div class="pl-empty">⚠️ Catalog load nahi ho paya।<br>' +
          '<small style="opacity:.65;word-break:break-all">Technical: ' + _esc(detail) + '</small></div>';
      }
    } finally {
      _loading = false;
    }
  }

  function _formatDuration(totalSeconds) {
    const s = Number(totalSeconds);
    if (!s || s <= 0) return null;
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
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
    grid.innerHTML = _items.map(it => {
      const dur = _formatDuration(it.duration_seconds);
      const thumbSrc = it.thumb_id ? _api('/api/thumbnail?id=' + encodeURIComponent(it.thumb_id)) : null;
      return `
      <div class="pl-card" data-title="${_esc(it.name)}">
        <div class="pl-card-thumb">
          ${thumbSrc
            ? `<img src="${_esc(thumbSrc)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'pl-card-icon',textContent:'🎬'}))">`
            : `<div class="pl-card-icon">🎬</div>`}
          ${dur ? `<span class="pl-card-duration">${_esc(dur)}</span>` : ''}
        </div>
        <div class="pl-card-title">${_esc(it.name)}</div>
        <div class="pl-card-meta">
          ${it.year ? `<span class="pl-tag pl-tag-year">${_esc(it.year)}</span>` : ''}
          ${(it.qualities || []).slice(0, 2).map(q => `<span class="pl-tag pl-tag-q">${_esc(q)}</span>`).join('')}
        </div>
        ${it.channel_title ? `<div class="pl-card-channel">📡 ${_esc(it.channel_title)}</div>` : ''}
      </div>
    `;
    }).join('');
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

  /* ── Deep-link se aaya token (Telegram ke Watch Online button se) -
     ye token bot ki taraf se already force-sub/rate-limit check karke
     bana hai, isliye yahan koi anonymous/login cooldown check nahi -
     seedha player khol dete hain. ── */
  function openDirectToken(token) {
    if (!token) return;
    _openPlayer(_api('/stream/' + token), '🎬 Video');
  }

  /* ── Video modal ── */
  const _MEDIA_ERROR_TEXT = {
    1: 'MEDIA_ERR_ABORTED - load beech mein rok diya gaya',
    2: 'MEDIA_ERR_NETWORK - network/stream fail hui (URL, CORS, ya server error ho sakta hai)',
    3: 'MEDIA_ERR_DECODE - video decode nahi ho paya (corrupt/unsupported encoding)',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - is URL/format ko browser support nahi karta (galat URL ho sakta hai)',
  };

  function _openPlayer(streamUrl, title) {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const titleEl = document.getElementById('pl-video-title');
    const errEl = document.getElementById('pl-video-error');
    if (!modal || !video) return;
    if (titleEl) titleEl.textContent = title;
    if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }

    video.onerror = () => {
      const err = video.error;
      const detail = err ? (_MEDIA_ERROR_TEXT[err.code] || `Unknown error code ${err.code}`) : 'Unknown error';
      console.error('[Player] video playback error:', err, '| src:', streamUrl);
      if (errEl) {
        errEl.textContent = '⚠️ Video load nahi ho paya - ' + detail;
        errEl.classList.remove('hidden');
      }
    };

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

  return { loadCatalog, playTitle, closePlayer, openDirectToken };
})();
