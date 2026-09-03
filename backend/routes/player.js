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
  let _currentItem = null; // abhi khula hua catalog item (language/up-next ke liye)

  async function playTitle(title, opts) {
    if (!title) return;
    opts = opts || {};
    const language = opts.language || null;
    const banner = document.getElementById('pl-cooldown-banner');
    if (banner) banner.classList.add('hidden');
    _currentItem = _items.find(it => it.name === title) || null;

    const usedFreeAlready = localStorage.getItem(FREE_WATCH_FLAG) === '1';

    if (!usedFreeAlready) {
      // Pehla, anonymous watch - login zaroori nahi.
      try {
        const res = await fetch(_api('/api/web-watch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title, visitor_id: _getVisitorId(), language: language }),
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
        body: JSON.stringify({ title: title, language: language }),
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
    _currentItem = null; // deep-link ke paas catalog item info nahi hota (sirf token)
    _openPlayer(_api('/stream/' + token), '🎬 Video');
  }

  /* ── Video modal ── */
  const _MEDIA_ERROR_TEXT = {
    1: 'MEDIA_ERR_ABORTED - load beech mein rok diya gaya',
    2: 'MEDIA_ERR_NETWORK - network/stream fail hui (URL, CORS, ya server error ho sakta hai)',
    3: 'MEDIA_ERR_DECODE - video decode nahi ho paya (corrupt/unsupported encoding)',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - is URL/format ko browser support nahi karta (galat URL ho sakta hai)',
  };

  function _toast(msg, type) {
    if (typeof showToast === 'function') showToast(msg, type || 'info');
    else alert(msg);
  }

  function _formatTime(sec) {
    sec = isFinite(sec) && sec > 0 ? sec : 0;
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  // Local (device se select ki gayi) file ka blob URL yahan track karte
  // hain - closePlayer() par revoke karna zaroori hai warna memory leak
  // hoti rehti hai (har naye file select par purana blob RAM mein reh
  // jaata, tab band hone tak).
  let _activeBlobUrl = null;
  let _diagTimer = null;

  // FEATURE: kabhi-kabhi video.onerror kabhi fire hi nahi hota - file
  // "successfully" load ho jaati hai par ek track (video ya audio) us
  // device/browser ke codec se decode hi nahi ho paata (jaise HEVC video
  // jo purane Android WebView support nahi karte, par AAC audio chal
  // jaata hai) - result: sirf awaaz, tasveer nahi (ya ulta). Ye koi
  // MEDIA_ERROR nahi hai, isliye alag se detect karna padta hai.
  function _hasAudioTrack(video) {
    if (typeof video.mozHasAudio === 'boolean') return video.mozHasAudio;
    if (typeof video.webkitAudioDecodedByteCount === 'number') return video.webkitAudioDecodedByteCount > 0;
    if (video.audioTracks && typeof video.audioTracks.length === 'number') return video.audioTracks.length > 0;
    return null; // is browser mein pata karne ka koi tareeka nahi hai
  }

  function _runDiagnostics(video, warnEl) {
    clearTimeout(_diagTimer);
    if (!warnEl) return;
    warnEl.classList.add('hidden');
    _diagTimer = setTimeout(() => {
      if (video.paused || video.ended || video.readyState < 2) return;
      const hasVideo = video.videoWidth > 0 && video.videoHeight > 0;
      const hasAudio = _hasAudioTrack(video);
      let msg = null;
      if (!hasVideo) {
        msg = '⚠️ Sirf awaaz chal rahi hai, tasveer nahi dikh rahi - is file ka video is device/browser ke codec se decode nahi ho pa raha. Koi doosra browser (Chrome) ya device try karo.';
      } else if (hasAudio === false) {
        msg = '⚠️ Sirf tasveer dikh rahi hai, awaaz nahi aa rahi - is file ka audio is device/browser ke codec se decode nahi ho pa raha.';
      }
      if (msg) { warnEl.textContent = msg; warnEl.classList.remove('hidden'); }
    }, 2500);
  }

  function _openPlayer(streamUrl, title) {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const wrap = document.getElementById('pl-video-wrap');
    const titleEl = document.getElementById('pl-video-title');
    const errEl = document.getElementById('pl-video-error');
    const warnEl = document.getElementById('pl-video-warning');
    const loadingEl = document.getElementById('pl-video-loading');
    if (!modal || !video) return;
    if (titleEl) titleEl.textContent = title;
    if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
    if (warnEl) { warnEl.classList.add('hidden'); warnEl.textContent = ''; }
    if (loadingEl) loadingEl.classList.remove('hidden');
    if (wrap) wrap.classList.remove('pl-rotated');
    document.getElementById('pl-lang-panel')?.classList.add('hidden');
    document.getElementById('pl-cc-panel')?.classList.add('hidden');

    video.onerror = () => {
      const err = video.error;
      const detail = err ? (_MEDIA_ERROR_TEXT[err.code] || `Unknown error code ${err.code}`) : 'Unknown error';
      console.error('[Player] video playback error:', err, '| src:', streamUrl);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errEl) {
        errEl.textContent = '⚠️ Video load nahi ho paya - ' + detail;
        errEl.classList.remove('hidden');
      }
    };
    // Pehla frame ready hote hi spinner hata dete hain - 'loadeddata' se
    // pehle video area khaali/black dikhta tha, ab spinner user ko batata
    // hai ki load ho raha hai.
    video.onloadeddata = () => { if (loadingEl) loadingEl.classList.add('hidden'); };
    video.onplaying = () => _runDiagnostics(video, warnEl);

    video.src = streamUrl;
    modal.classList.remove('hidden');
    video.play().catch(() => { /* autoplay block ho sakta hai - controls se chala sakte hain */ });

    _updateLangButton(_currentItem);
    _populateUpNext(title);
  }

  /* ── Language variants (agar isi title ki alag-alag language mein
     multiple files upload hui hain to catalog API `languages: [...]`
     bhejta hai) ── */
  function _updateLangButton(item) {
    const btn = document.getElementById('pl-ctrl-lang');
    const panel = document.getElementById('pl-lang-panel');
    if (!btn || !panel) return;
    const langs = (item && Array.isArray(item.languages)) ? item.languages.filter(Boolean) : [];
    if (langs.length > 1) {
      btn.classList.remove('hidden');
      panel.innerHTML = langs.map(l => `<div class="pl-pick-item" data-lang="${_esc(l)}">${_esc(l)}</div>`).join('');
    } else {
      btn.classList.add('hidden');
      panel.classList.add('hidden');
      panel.innerHTML = '';
    }
  }

  /* ── "Aur videos" - already loaded catalog se strip banata hai, taaki
     playing video band kiye bina koi doosra video choose kiya ja sake ── */
  function _populateUpNext(excludeTitle) {
    const box = document.getElementById('pl-upnext');
    const row = document.getElementById('pl-upnext-row');
    if (!box || !row) return;
    if (!_items.length) {
      // Deep-link se seedha khula ho sakta hai jab catalog abhi load hi
      // nahi hua - background mein load karke phir se try karte hain.
      box.classList.add('hidden');
      if (!_loading) loadCatalog('').then(() => _populateUpNext(excludeTitle));
      return;
    }
    const pick = _items.filter(it => it.name !== excludeTitle).slice(0, 20);
    if (!pick.length) { box.classList.add('hidden'); row.innerHTML = ''; return; }
    row.innerHTML = pick.map(it => {
      const thumbSrc = it.thumb_id ? _api('/api/thumbnail?id=' + encodeURIComponent(it.thumb_id)) : null;
      return `
      <div class="pl-upnext-card" data-title="${_esc(it.name)}">
        <div class="pl-upnext-thumb">
          ${thumbSrc
            ? `<img src="${_esc(thumbSrc)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('div'),{textContent:'🎬'}))">`
            : '🎬'}
        </div>
        <div class="pl-upnext-title">${_esc(it.name)}</div>
      </div>`;
    }).join('');
    box.classList.remove('hidden');
  }

  /* ── Apne device se file select karke chalana (koi bot/API involved nahi -
     bilkul local, browser hi file ko seedha read karke play karta hai) ── */
  function _playLocalFile(file) {
    if (!file) return;
    if (!file.type || !file.type.startsWith('video/')) {
      alert('Sirf video files chalayi ja sakti hain।');
      return;
    }
    const banner = document.getElementById('pl-cooldown-banner');
    if (banner) banner.classList.add('hidden');

    // Purana blob (agar koi tha) revoke karke naya banate hain.
    if (_activeBlobUrl) {
      URL.revokeObjectURL(_activeBlobUrl);
      _activeBlobUrl = null;
    }
    _activeBlobUrl = URL.createObjectURL(file);
    _currentItem = null; // local file ke liye koi language/up-next data nahi hai
    _openPlayer(_activeBlobUrl, '📂 ' + file.name);
    document.getElementById('pl-upnext')?.classList.add('hidden');
  }

  function closePlayer() {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const wrap = document.getElementById('pl-video-wrap');
    const loadingEl = document.getElementById('pl-video-loading');
    clearTimeout(_diagTimer);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (wrap) wrap.classList.remove('pl-rotated', 'pl-ctrls-visible');
    if (modal) modal.classList.add('hidden');
    if (loadingEl) loadingEl.classList.add('hidden');
    if (document.fullscreenElement) document.exitFullscreen?.();
    if (_activeBlobUrl) {
      URL.revokeObjectURL(_activeBlobUrl);
      _activeBlobUrl = null;
    }
  }

  /* ── Custom (YouTube-style) control bar - native `controls` jaan-bujh
     kar use nahi kiya, kyunki kai devices (jaise MIUI/Xiaomi WebView) apna
     khud ka floating system player thop dete hain jo rotate/language/CC
     jaisa kuch support nahi karta. Ye ek hi baar (module load par) wire
     hota hai - DOM elements poori session mein wahi rehte hain. ── */
  function _wireControls() {
    const wrap = document.getElementById('pl-video-wrap');
    const video = document.getElementById('pl-video');
    if (!wrap || !video) return;

    const seek = document.getElementById('pl-ctrl-seek');
    const timeEl = document.getElementById('pl-ctrl-time');
    const playBtn = document.getElementById('pl-ctrl-playpause');
    const centerBtn = document.getElementById('pl-ctrl-center');
    const volBtn = document.getElementById('pl-ctrl-vol');
    const rotateBtn = document.getElementById('pl-ctrl-rotate');
    const fsBtn = document.getElementById('pl-ctrl-fullscreen');
    const ccBtn = document.getElementById('pl-ctrl-cc');
    const langBtn = document.getElementById('pl-ctrl-lang');
    const langPanel = document.getElementById('pl-lang-panel');
    const ccPanel = document.getElementById('pl-cc-panel');

    let _hideTimer = null;
    let _scrubbing = false;

    function showControls() {
      wrap.classList.add('pl-ctrls-visible');
      clearTimeout(_hideTimer);
      if (!video.paused) _hideTimer = setTimeout(() => wrap.classList.remove('pl-ctrls-visible'), 3000);
    }
    function updatePlayIcon() {
      const icon = video.paused ? '▶' : '⏸';
      if (playBtn) playBtn.textContent = icon;
      if (centerBtn) centerBtn.textContent = icon;
    }

    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.pl-controls, .pl-ctrl-center, .pl-pick-panel, .pl-modal-close')) return;
      if (video.paused) video.play().catch(() => {}); else video.pause();
      showControls();
    });

    video.addEventListener('play', () => { updatePlayIcon(); showControls(); });
    video.addEventListener('pause', () => { updatePlayIcon(); showControls(); clearTimeout(_hideTimer); });
    video.addEventListener('ended', () => { updatePlayIcon(); wrap.classList.add('pl-ctrls-visible'); });

    [playBtn, centerBtn].forEach(btn => btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (video.paused) video.play().catch(() => {}); else video.pause();
      showControls();
    }));

    video.addEventListener('loadedmetadata', () => {
      if (timeEl) timeEl.textContent = _formatTime(0) + ' / ' + _formatTime(video.duration || 0);
    });
    video.addEventListener('timeupdate', () => {
      if (_scrubbing) return;
      const dur = video.duration || 0;
      if (seek) seek.value = dur ? String((video.currentTime / dur) * 1000) : '0';
      if (timeEl) timeEl.textContent = _formatTime(video.currentTime) + ' / ' + _formatTime(dur);
    });

    seek?.addEventListener('input', () => {
      _scrubbing = true;
      const dur = video.duration || 0;
      if (dur && timeEl) timeEl.textContent = _formatTime((seek.value / 1000) * dur) + ' / ' + _formatTime(dur);
      showControls();
    });
    seek?.addEventListener('change', () => {
      const dur = video.duration || 0;
      if (dur) video.currentTime = (seek.value / 1000) * dur;
      _scrubbing = false;
    });

    volBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      volBtn.textContent = video.muted ? '🔇' : '🔊';
      showControls();
    });

    rotateBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      wrap.classList.toggle('pl-rotated');
      showControls();
    });

    fsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      } else {
        (wrap.requestFullscreen || wrap.webkitRequestFullscreen)?.call(wrap);
        // Fullscreen ke andar hi landscape lock kaam karta hai (browser
        // policy) - is baaki jagah try karne se sirf console error aata hai.
        screen.orientation?.lock?.('landscape').catch(() => {});
      }
      showControls();
    });
    document.addEventListener('fullscreenchange', () => {
      if (fsBtn) fsBtn.textContent = document.fullscreenElement ? '⤢' : '⛶';
      if (!document.fullscreenElement) screen.orientation?.unlock?.();
    });

    ccBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      const tracks = video.textTracks;
      if (!tracks || tracks.length === 0) {
        _toast('Is video ke liye abhi subtitles/captions available nahi hain।', 'info');
        return;
      }
      const t = tracks[0];
      const turningOn = t.mode !== 'showing';
      t.mode = turningOn ? 'showing' : 'hidden';
      ccBtn.classList.toggle('pl-cc-active', turningOn);
    });

    langBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      ccPanel?.classList.add('hidden');
      langPanel?.classList.toggle('hidden');
    });
    langPanel?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.pl-pick-item');
      if (!item || !_currentItem) return;
      langPanel.classList.add('hidden');
      playTitle(_currentItem.name, { language: item.dataset.lang });
    });
  }

  /* ── Event delegation (grid + search box dono dynamically render hote hain) ── */
  document.addEventListener('click', (e) => {
    const card = e.target.closest('.pl-card');
    if (card) playTitle(card.dataset.title);
    const upnextCard = e.target.closest('.pl-upnext-card');
    if (upnextCard) playTitle(upnextCard.dataset.title);
  });

  document.addEventListener('input', (e) => {
    if (e.target.id !== 'pl-search-input') return;
    clearTimeout(_searchTimer);
    const val = e.target.value;
    _searchTimer = setTimeout(() => loadCatalog(val), 350);
  });

  document.addEventListener('click', (e) => {
    if (e.target.id !== 'pl-local-file-btn') return;
    document.getElementById('pl-local-file-input')?.click();
  });

  document.addEventListener('change', (e) => {
    if (e.target.id !== 'pl-local-file-input') return;
    const file = e.target.files && e.target.files[0];
    _playLocalFile(file);
    e.target.value = ''; // reset - taaki wahi file dobara select karne par bhi 'change' fire ho
  });

  _wireControls();

  return { loadCatalog, playTitle, closePlayer, openDirectToken, playLocalFile: _playLocalFile };
})();
