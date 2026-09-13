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

  // FIX: pehle DOM-based tha (div.textContent -> div.innerHTML), jo TEXT
  // NODE serialization use karta hai - wo " character ko escape NAHI
  // karta. Isi function ka result yahin file mein attribute ke andar bhi
  // likha jaata hai (jaise data-title="${_esc(it.name)}") - agar kisi
  // catalog item ke naam mein " ho, to wo attribute se bahar nikal ke
  // arbitrary HTML inject kar sakta tha. Ab canonical, attribute-safe
  // escapeHtml() par delegate (dekho js/shared.js).
  function _esc(s) { return escapeHtml(s); }

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
  // FEATURE (naya, language-switch fix ke liye zaroori): is session mein
  // abhi jo video khula hai wo 'anon' (free-watch) ya 'member' (login+
  // cooldown) raaste se aaya - dekho _switchLanguage() neeche, isse pata
  // chalta hai ki language badalte waqt WAHI raasta dobara istemaal karna
  // hai, poora gate (free-watch-flag / cooldown-check) dobara nahi.
  let _lastWatchMode = null;

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
          _lastWatchMode = 'anon';
          _openPlayer(_api(data.stream_url), title, data.file_size);
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
        _lastWatchMode = 'member';
        _openPlayer(_api(data.stream_url), title, data.file_size);
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

  // FIX (real bug): pehle language-panel se koi language chunte hi wapas
  // playTitle() call hota tha - jo poora gate (FREE_WATCH_FLAG check,
  // "pehla video free tha, login karo" wala alert) FIR SE chala deta tha,
  // chahe user isi title ko ABHI-ABHI legitimately unlock kar chuka ho.
  // Matlab: agar wo anonymous user apna EK free-watch pehle hi use kar
  // chuka tha (isi video ko kholne mein), to sirf AUDIO LANGUAGE badalne
  // par bhi "login karo" wala prompt aa jaata - confusing aur galat, kyuki
  // ye naya video nahi hai. Ab language-switch usi WATCH-MODE ('anon' ya
  // 'member', jo pehle se is title ko unlock kar chuka hai) ko seedha
  // dobara istemaal karta hai, poora gate dobara nahi chalata.
  async function _switchLanguage(lang) {
    if (!_currentItem) return;
    const title = _currentItem.name;

    if (_lastWatchMode !== 'anon' && _lastWatchMode !== 'member') {
      // Safety net - kabhi is state mein aana nahi chahiye (lang button
      // sirf _currentItem set hone par hi dikhta hai, dekho
      // _updateLangButton), lekin agar aa bhi jaaye to poore flow se
      // (sahi gating ke saath) guzarna behtar hai chup-chaap fail hone se.
      return playTitle(title, { language: lang });
    }

    try {
      let data;
      if (_lastWatchMode === 'member') {
        if (typeof token === 'undefined' || !token) return playTitle(title, { language: lang });
        const res = await fetch((VS_CONFIG.API || '').replace(/\/$/, '') + '/api/player/watch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
          body: JSON.stringify({ title: title, language: lang }),
        });
        data = await res.json();
      } else {
        const res = await fetch(_api('/api/web-watch'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: title, visitor_id: _getVisitorId(), language: lang }),
        });
        data = await res.json();
      }

      if (data.success) {
        _openPlayer(_api(data.stream_url), title, data.file_size);
        return;
      }
      if (data.reason === 'cooldown') {
        _showCooldown(data.next_allowed_at);
      } else {
        alert(data.message || 'Is language mein video load nahi ho paayi।');
      }
    } catch (e) {
      console.warn('[Player] language switch failed:', e.message);
      alert('Language switch nahi ho paaya, dobara try karein।');
    }
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

  let _currentStreamUrl = null; // FEATURE (naya): favorite-player grid / download / copy-link ke liye

  function _formatFileSize(bytes) {
    if (!bytes || bytes <= 0) return null;
    const gb = bytes / (1024 * 1024 * 1024);
    if (gb >= 1) return gb.toFixed(2) + ' GB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(0) + ' MB';
  }

  let _loadTimeoutTimer = null;

  function _clearLoadTimeout() {
    if (_loadTimeoutTimer) { clearTimeout(_loadTimeoutTimer); _loadTimeoutTimer = null; }
  }

  // FEATURE (naya): "% wala animation" - initial load AUR beech-mein-
  // stall (dekho _setupSmartBuffering) dono jagah reuse hota hai, taaki
  // user ko hamesha pata rahe ki ye genuinely data la raha hai, atka
  // hua/toota hua nahi.
  function _updateLoadingPercent(video) {
    const pctEl = document.getElementById('pl-video-loading-pct');
    if (!pctEl) return;
    if (!video.duration || !isFinite(video.duration) || !video.buffered || video.buffered.length === 0) {
      pctEl.textContent = ''; // duration abhi pata nahi - sirf spinner dikhta rahega
      return;
    }
    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
    const percent = Math.min(100, Math.round((bufferedEnd / video.duration) * 100));
    pctEl.textContent = percent + '%';
  }

  function _openPlayer(streamUrl, title, fileSizeBytes) {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const wrap = document.getElementById('pl-video-wrap');
    const titleEl = document.getElementById('pl-video-title');
    const sizeEl = document.getElementById('pl-video-size');
    const errEl = document.getElementById('pl-video-error');
    const warnEl = document.getElementById('pl-video-warning');
    const loadingEl = document.getElementById('pl-video-loading');
    const pctEl = document.getElementById('pl-video-loading-pct');
    if (!modal || !video) return;
    _currentStreamUrl = streamUrl;
    if (titleEl) titleEl.textContent = title;
    if (sizeEl) {
      const label = _formatFileSize(fileSizeBytes);
      sizeEl.textContent = label ? ('💾 ' + label) : '';
      sizeEl.classList.toggle('hidden', !label);
    }
    _renderFavoritePlayerGrid();
    if (errEl) { errEl.classList.add('hidden'); errEl.textContent = ''; }
    if (warnEl) { warnEl.classList.add('hidden'); warnEl.textContent = ''; }
    if (loadingEl) loadingEl.classList.add('hidden'); // FIX: pehle video khulte hi turant spinner dikhta tha - ab tap se pehle kuch load hi nahi hota
    if (pctEl) pctEl.textContent = '';
    if (wrap) wrap.classList.remove('pl-rotated', 'pl-buffering');
    document.getElementById('pl-lang-panel')?.classList.add('hidden');
    document.getElementById('pl-cc-panel')?.classList.add('hidden');
    document.getElementById('pl-settings-panel')?.classList.add('hidden');
    document.getElementById('pl-ctrl-cc')?.classList.remove('pl-cc-active');
    _resetPlayerVisualSettings(); // FEATURE (naya): speed/aspect/flip/subtitle-offset sab 1 video se dusre video mein carry NAHI hone chahiye
    _resetSmartBuffering(); // FEATURE (naya) - dekho comment neeche
    _clearLoadTimeout();

    // FIX (real bug): pehle video khulte hi turant `video.src` set karke
    // `.play()` call ho jaata tha - koi thumbnail/poster ka mauka hi
    // nahi milta tha, seedha (kabhi kaale screen ke saath) play/buffer
    // shuru ho jaata. Ab pehle sirf ek THUMBNAIL (agar catalog se mila
    // ho) aur ek bada play-button dikhate hain - src tabhi set hota hai
    // jab user khud tap kare (dekho _startPlayback neeche, aur playBtn/
    // centerBtn ke click handler mein).
    video.removeAttribute('src');
    video.load();
    const thumbId = _currentItem && _currentItem.thumb_id;
    video.poster = thumbId ? _api('/api/thumbnail?id=' + encodeURIComponent(thumbId)) : '';
    if (wrap) wrap.classList.add('pl-not-started');

    modal.classList.remove('hidden');
    _updateLangButton(_currentItem);
    _populateUpNext(title);
  }

  function _startPlayback() {
    const video = document.getElementById('pl-video');
    const wrap = document.getElementById('pl-video-wrap');
    const errEl = document.getElementById('pl-video-error');
    const warnEl = document.getElementById('pl-video-warning');
    const loadingEl = document.getElementById('pl-video-loading');
    if (!video || !_currentStreamUrl) return;
    if (wrap) wrap.classList.remove('pl-not-started');
    if (loadingEl) loadingEl.classList.remove('hidden');

    video.onerror = () => {
      _clearLoadTimeout();
      const err = video.error;
      const detail = err ? (_MEDIA_ERROR_TEXT[err.code] || `Unknown error code ${err.code}`) : 'Unknown error';
      console.error('[Player] video playback error:', err, '| src:', _currentStreamUrl);
      if (loadingEl) loadingEl.classList.add('hidden');
      if (errEl) {
        errEl.textContent = '⚠️ Video load nahi ho paya - ' + detail;
        errEl.classList.remove('hidden');
      }
    };
    // Pehla frame ready hote hi spinner hata dete hain - 'loadeddata' se
    // pehle video area khaali/black dikhta tha, ab spinner user ko batata
    // hai ki load ho raha hai.
    video.onloadeddata = () => { _clearLoadTimeout(); if (loadingEl) loadingEl.classList.add('hidden'); };
    video.onplaying = () => _runDiagnostics(video, warnEl);
    video.onprogress = () => _updateLoadingPercent(video);

    // FEATURE (naya): agar pehla frame hi kaafi der (20 second) mein na
    // aaye - na error, na data - to user ko andhere mein mat rakho,
    // saaf warning do (complaint: "warna wait na karna pade").
    _clearLoadTimeout();
    _loadTimeoutTimer = setTimeout(() => {
      if (video.readyState < 2 && warnEl) {
        warnEl.textContent = '⚠️ Video load hone mein arsa lag raha hai - connection dheemi ho sakti hai. Thoda aur intezaar karein, ya upar diye VLC/MX Player button se try karein.';
        warnEl.classList.remove('hidden');
      }
    }, 20000);

    video.src = _currentStreamUrl;
    video.load();
    video.play().catch(() => { /* autoplay block ho sakta hai - controls se chala sakte hain */ });
  }

  /* ── Language variants (agar isi title ki alag-alag language mein
     multiple files upload hui hain to catalog API `languages: [...]`
     bhejta hai) ── */
  /* ══════════════════════════════════════════════════════════════
     FEATURE (naya): "Watch on Your Favorite Player" - VLC/MX Player
     jaise NATIVE apps mein khud stream URL khol dete hain. Ye web
     player se KAHIN zyada smooth chalte hain (hardware decoding,
     apna adaptive buffering, MKV/HEVC jaisi cheezein bhi bina dikkat)
     - is site ke apne player ki kisi bhi buffering-limitation se
     bilkul bahar. Sirf Android par kaam karta hai (Android ka
     `intent:` URI scheme use karte hain) - iOS/desktop par ye grid
     hi nahi dikhta (dekho _isAndroid).

     Package names verify kiye hain (official docs/APK listings se,
     andaza nahi lagaya): VLC = org.videolan.vlc, MX Player (free) =
     com.mxtech.videoplayer.ad, KM Player = com.kmplayer, PLAYit =
     com.playit.videoplayer, XPlayer = video.player.videoplayer.
     "nPlayer" iOS-first app hai, Android par bharosemand nahi -
     iski jagah generic "More Players" (koi bhi installed app chuनने
     ke liye Android ka apna chooser) diya hai.
  ══════════════════════════════════════════════════════════════ */
  const EXTERNAL_PLAYERS = [
    { name: 'VLC Player', icon: '🟠', pkg: 'org.videolan.vlc' },
    { name: 'MX Player', icon: '🔵', pkg: 'com.mxtech.videoplayer.ad' },
    { name: 'KM Player', icon: '🟣', pkg: 'com.kmplayer' },
    { name: 'PLAYit', icon: '🔴', pkg: 'com.playit.videoplayer' },
    { name: 'XPlayer', icon: '🟢', pkg: 'video.player.videoplayer' },
  ];

  function _isAndroid() {
    return /Android/i.test(navigator.userAgent || '');
  }

  function _openInExternalPlayer(pkg) {
    if (!_currentStreamUrl) return;
    // Deep-link (file:// blob wale local playback ya deep-link token
    // mein) relative ho sakta hai - poora absolute URL chahiye external
    // app ko dene ke liye.
    const absUrl = new URL(_currentStreamUrl, window.location.href).href;
    const title = encodeURIComponent((_currentItem && _currentItem.name) || document.title || 'Video');
    const fallback = encodeURIComponent(`https://play.google.com/store/apps/details?id=${pkg}`);
    window.location.href = `intent:${absUrl}#Intent;package=${pkg};S.title=${title};S.browser_fallback_url=${fallback};end`;
  }

  function _openInAnyPlayer() {
    if (!_currentStreamUrl) return;
    const absUrl = new URL(_currentStreamUrl, window.location.href).href;
    // Koi specific package nahi - Android khud "kis app se kholna hai"
    // wala chooser dikhata hai, jitne bhi video players installed hon.
    window.location.href = `intent:${absUrl}#Intent;type=video/*;end`;
  }

  function _downloadCurrentVideo() {
    if (!_currentStreamUrl) return;
    // FIX: cross-origin video URL par `<a download>` attribute browsers
    // ignore kar dete hain (sirf same-origin par kaam karta hai) - isliye
    // seedha stream URL par ?download=1 laga kar navigate karte hain;
    // server (web.py) ab Content-Disposition: attachment header bhejta
    // hai, jo cross-origin hone ke bawajood browser ka native "Save
    // File" download shuru karta hai.
    const sep = _currentStreamUrl.includes('?') ? '&' : '?';
    window.location.href = _currentStreamUrl + sep + 'download=1';
  }

  async function _copyStreamLink() {
    if (!_currentStreamUrl) return;
    const absUrl = new URL(_currentStreamUrl, window.location.href).href;
    try {
      await navigator.clipboard.writeText(absUrl);
      if (typeof showToast === 'function') showToast('Link copy ho gaya ✅', 'success');
    } catch (e) {
      if (typeof showToast === 'function') showToast('Copy nahi ho paya, dobara try karein', 'error');
    }
  }

  function _renderFavoritePlayerGrid() {
    const grid = document.getElementById('pl-fav-grid');
    const section = document.getElementById('pl-fav-section');
    if (!grid || !section) return;
    // FIX: local device file (📂 button se) ka URL ek blob: URL hota hai -
    // ye sirf ISI browser tab ki memory mein valid hai, koi bhi ALAG app
    // (VLC/MX Player) ise access nahi kar sakta. Aisi video ke liye grid
    // dikhana hi galat hoga (har button fail hota).
    const isBlob = (_currentStreamUrl || '').startsWith('blob:');
    if (!_isAndroid() || isBlob) { section.classList.add('hidden'); return; }
    section.classList.remove('hidden');

    const tiles = EXTERNAL_PLAYERS.map(p =>
      `<button type="button" class="pl-fav-tile" data-pkg="${_esc(p.pkg)}"><span class="pl-fav-icon">${p.icon}</span>${_esc(p.name)}</button>`
    );
    tiles.push('<button type="button" class="pl-fav-tile" data-action="more"><span class="pl-fav-icon">📲</span>More Players</button>');
    tiles.push('<button type="button" class="pl-fav-tile" data-action="download"><span class="pl-fav-icon">⬇️</span>Download</button>');
    tiles.push('<button type="button" class="pl-fav-tile" data-action="copy"><span class="pl-fav-icon">🔗</span>Copy Link</button>');
    grid.innerHTML = tiles.join('');
  }

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

  /* ── FEATURE (naya): Settings gear - Play Speed / Aspect Ratio /
     Video Flip / Subtitle Offset, sab EK hi drill-down panel mein
     (jaise reference image mein: gear -> list -> tap se sub-list) ── */
  let _currentSpeed = 1;
  const ASPECT_RATIOS = [
    { key: 'default', label: 'Default', fit: 'contain' },
    { key: 'fill', label: 'Fill (Stretch)', fit: 'fill' },
    { key: 'cover', label: 'Cover (Zoom)', fit: 'cover' },
  ];
  const VIDEO_FLIPS = [
    { key: 'normal', label: 'Normal', css: 'none' },
    { key: 'h', label: 'Horizontal', css: 'scaleX(-1)' },
    { key: 'v', label: 'Vertical', css: 'scaleY(-1)' },
  ];
  let _currentAspect = ASPECT_RATIOS[0];
  let _currentFlip = VIDEO_FLIPS[0];
  let _settingsView = 'root'; // 'root' | 'speed' | 'aspect' | 'flip'
  let _subtitleOffsetSec = 0;
  // Cue timings sirf EK baar shift karne se compounding-error hoti hai
  // (offset dobara badlo to purane shift par NAYA shift jud jaata) -
  // isliye HAR track ke ORIGINAL (bina-shift) cue times yahan yaad
  // rakhte hain, aur har baar offset badalne par UNHI se dobara calculate
  // karte hain.
  let _subtitleOriginalCues = null; // WeakMap<TextTrack, [{cue, start, end}]>

  function _applySpeed(rate) {
    _currentSpeed = rate;
    const video = document.getElementById('pl-video');
    if (video) video.playbackRate = rate;
    if (_settingsView === 'root') _renderSettingsPanel();
  }

  function _applyAspect(ratio) {
    if (!ratio) return;
    _currentAspect = ratio;
    const video = document.getElementById('pl-video');
    if (video) video.style.objectFit = ratio.fit;
  }

  function _applyFlip(flip) {
    if (!flip) return;
    _currentFlip = flip;
    const video = document.getElementById('pl-video');
    if (video) video.style.transform = flip.css === 'none' ? '' : flip.css;
  }

  function _resetPlayerVisualSettings() {
    _applySpeed(1);
    _applyAspect(ASPECT_RATIOS[0]);
    _applyFlip(VIDEO_FLIPS[0]);
    _subtitleOffsetSec = 0;
    _subtitleOriginalCues = new WeakMap();
    _settingsView = 'root';
    document.getElementById('pl-settings-panel')?.classList.add('hidden');
  }

  function _applySubtitleOffset(deltaSec) {
    _subtitleOffsetSec = deltaSec;
    const video = document.getElementById('pl-video');
    if (!video || !_subtitleOriginalCues) return;
    const tracks = video.textTracks;
    for (let i = 0; i < (tracks ? tracks.length : 0); i++) {
      const track = tracks[i];
      if (track.mode !== 'showing' || !track.cues) continue;
      // Pehli baar is track ke liye original timings yaad rakho.
      if (!_subtitleOriginalCues.has(track)) {
        const originals = [];
        for (let c = 0; c < track.cues.length; c++) {
          originals.push({ cue: track.cues[c], start: track.cues[c].startTime, end: track.cues[c].endTime });
        }
        _subtitleOriginalCues.set(track, originals);
      }
      for (const { cue, start, end } of _subtitleOriginalCues.get(track)) {
        cue.startTime = start + deltaSec;
        cue.endTime = end + deltaSec;
      }
    }
  }

  function _renderSettingsPanel() {
    const panel = document.getElementById('pl-settings-panel');
    if (!panel) return;
    const speedLabel = _currentSpeed === 1 ? 'Normal' : (_currentSpeed + 'x');

    if (_settingsView === 'root') {
      panel.innerHTML = `
        <div class="pl-settings-row" data-nav="speed">
          <span class="pl-settings-row-icon">▶</span>
          <span class="pl-settings-row-label">Play Speed</span>
          <span class="pl-settings-row-value">${_esc(speedLabel)} ›</span>
        </div>
        <div class="pl-settings-row" data-nav="aspect">
          <span class="pl-settings-row-icon">◀▶</span>
          <span class="pl-settings-row-label">Aspect Ratio</span>
          <span class="pl-settings-row-value">${_esc(_currentAspect.label)} ›</span>
        </div>
        <div class="pl-settings-row" data-nav="flip">
          <span class="pl-settings-row-icon">⫩</span>
          <span class="pl-settings-row-label">Video Flip</span>
          <span class="pl-settings-row-value">${_esc(_currentFlip.label)} ›</span>
        </div>
        <div class="pl-settings-row pl-settings-offset-row">
          <span class="pl-settings-row-icon">☰</span>
          <span class="pl-settings-row-label">Subtitle Offset</span>
          <span class="pl-settings-row-value" id="pl-offset-value">${_subtitleOffsetSec}s</span>
        </div>
        <input type="range" id="pl-offset-slider" class="pl-offset-slider" min="-10" max="10" step="0.5" value="${_subtitleOffsetSec}">`;
      const slider = document.getElementById('pl-offset-slider');
      slider?.addEventListener('input', () => {
        const val = Number(slider.value);
        _applySubtitleOffset(val);
        const valueEl = document.getElementById('pl-offset-value');
        if (valueEl) valueEl.textContent = val + 's';
      });
    } else if (_settingsView === 'speed') {
      panel.innerHTML = '<div class="pl-settings-back">‹ Back</div>' +
        [1, 1.5, 2, 2.5, 3].map(s =>
          `<div class="pl-pick-item ${s === _currentSpeed ? 'active' : ''}" data-speed="${s}">${s === 1 ? 'Normal' : s + 'x'}</div>`
        ).join('');
    } else if (_settingsView === 'aspect') {
      panel.innerHTML = '<div class="pl-settings-back">‹ Back</div>' +
        ASPECT_RATIOS.map(r =>
          `<div class="pl-pick-item ${r.key === _currentAspect.key ? 'active' : ''}" data-aspect="${r.key}">${_esc(r.label)}</div>`
        ).join('');
    } else if (_settingsView === 'flip') {
      panel.innerHTML = '<div class="pl-settings-back">‹ Back</div>' +
        VIDEO_FLIPS.map(f =>
          `<div class="pl-pick-item ${f.key === _currentFlip.key ? 'active' : ''}" data-flip="${f.key}">${_esc(f.label)}</div>`
        ).join('');
    }
  }

  /* ══════════════════════════════════════════════════════════════
     FIX (real bug - complaint: "video pause ho jaati hai, dubara chalu
     nahi ho rahi"): Pichhle round mein yahan ek "smart buffering" tha -
     buffer khatam hone par video ko KHUD `.pause()` kar deta, aur ek
     healthy margin (buffer aage) jama hone ka intezaar karta, phir
     resume karta - taaki baar-baar ki chhoti atkan ki jagah kam, saaf
     pause milein.

     ASLI PROBLEM: zyadatar browsers (khaaskar mobile par) VIDEO PAUSE
     hote hi background download bhi DHEEMA/BAND kar dete hain (data-
     saving optimization) - matlab jis buffer ka hum intezaar kar rahe
     the, wo `.pause()` karne ki wajah se hi badhna ROOK jaata! Isse
     video "pause ho jaati hai lekin dubara chalu nahi hoti" jaisi
     permanent-atki-hui state mein phas jaati thi - bilkul ulta jo
     chahiye tha.

     FIX: ab hum video ko KABHI khud pause NAHI karte. Browser jo bhi
     apna default "waiting -> jaise hi data mile turant resume" wala
     kaam kare, use hone dete hain (isi se download bhi chalta rehta
     hai) - hum sirf ek SAAF "buffering..." indicator (spinner + %)
     dikhate hain jab tak wo state chale, taaki user ko pata rahe ye
     genuinely data la raha hai, atka/toota hua nahi.
  ════════════════════════════════════════════════════════════════ */
  function _resetSmartBuffering() {
    const loadingEl = document.getElementById('pl-video-loading');
    loadingEl?.classList.add('hidden');
    loadingEl?.classList.remove('pl-loading-inline');
  }

  function _setupSmartBuffering(video) {
    const loadingEl = document.getElementById('pl-video-loading');
    const wrap = document.getElementById('pl-video-wrap');

    video.addEventListener('waiting', () => {
      if (video.seeking) return; // seek karte waqt 'waiting' normal hai, usmein dakhal nahi
      if (loadingEl) {
        // FIX (complaint: "video ki display bhi fade ho jaati hai"): shuru
        // mein (poster ke upar) poori tarah dim karna theek hai - kuch
        // dikhane layak hai hi nahi abhi. Lekin BEECH mein (currentTime>0)
        // video ka CURRENT FRAME already dikh raha hota hai - use poori
        // tarah kaale overlay se dhakna hi "fade ho jaana" wala bug tha.
        // Isliye beech-mein-stall par sirf ek chhota corner-badge
        // dikhate hain (dekho .pl-loading-inline CSS), poora screen dim
        // nahi karte.
        loadingEl.classList.toggle('pl-loading-inline', video.currentTime > 0.5);
        loadingEl.classList.remove('hidden');
      }
      wrap?.classList.add('pl-buffering'); // FIX (complaint: pause-icon galat dikhta tha) - dekho CSS comment
    });
    video.addEventListener('playing', () => {
      if (loadingEl) loadingEl.classList.add('hidden');
      wrap?.classList.remove('pl-buffering');
    });
    // Video khud pause/ended ho (user ne button dabaya, ya khatam hui) to
    // bhi buffering-indicator hata do - warna paused video par bhi
    // "buffering" dikhta reh sakta hai.
    video.addEventListener('pause', () => {
      if (loadingEl) loadingEl.classList.add('hidden');
      wrap?.classList.remove('pl-buffering');
    });
  }

  /* ── FEATURE (rebuilt): Captions/Subtitles ── pehle ye button sirf
     video.textTracks[0] ko on/off karta tha (koi choice nahi, koi label
     nahi). Ab poori list dikhate hain agar file ke andar embedded WebVTT/
     TTML tracks hon.
     ZAROORI LIMITATION (transparently note kar rahe hain): browsers
     zyadatar Telegram-se-aayi MP4/MKV files ke andar muxed .srt/.ass
     subtitles ko HTML5 <video> ke textTracks se EXPOSE nahi karte - ye
     sirf tab kaam karta hai jab file mein WebVTT jaisa browser-native
     format embed ho, jo bahut kam hota hai. Alag-alag language ki asli
     subtitle FILES chunne ke liye backend (bot) ko har title ke saath
     unke .srt/.vtt bhi catalog mein dena hoga - abhi wo data hi nahi
     bhejta, isliye ye UI zyadatar "is video mein koi caption nahi hai"
     hi dikhayegi, jab tak koi file khud hi browser-readable track na
     rakhti ho. ── */
  function _populateCcPanel(video, panel) {
    if (!panel) return;
    const tracks = video.textTracks;
    const n = tracks ? tracks.length : 0;
    if (!n) {
      panel.innerHTML = '<div class="pl-pick-item pl-pick-empty">Is video mein koi caption/subtitle nahi hai</div>';
      return;
    }
    let html = '<div class="pl-pick-item" data-cc="off">Off</div>';
    for (let i = 0; i < n; i++) {
      const label = tracks[i].label || tracks[i].language || `Track ${i + 1}`;
      html += `<div class="pl-pick-item" data-cc="${i}">${_esc(label)}</div>`;
    }
    panel.innerHTML = html;
    _syncCcActive(video, panel);
  }

  function _syncCcActive(video, panel) {
    if (!panel) return;
    const tracks = video.textTracks;
    let activeIdx = -1;
    for (let i = 0; i < (tracks ? tracks.length : 0); i++) {
      if (tracks[i].mode === 'showing') { activeIdx = i; break; }
    }
    panel.querySelectorAll('.pl-pick-item[data-cc]').forEach(el => {
      const v = el.dataset.cc;
      el.classList.toggle('active', v === String(activeIdx) || (v === 'off' && activeIdx === -1));
    });
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
    _openPlayer(_activeBlobUrl, '📂 ' + file.name, file.size);
    document.getElementById('pl-upnext')?.classList.add('hidden');
  }

  function closePlayer() {
    const modal = document.getElementById('pl-modal');
    const video = document.getElementById('pl-video');
    const wrap = document.getElementById('pl-video-wrap');
    const loadingEl = document.getElementById('pl-video-loading');
    clearTimeout(_diagTimer);
    _clearLoadTimeout(); // FEATURE (naya) - stale timer agli baar modal khulne se pehle na chal jaaye
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    if (wrap) wrap.classList.remove('pl-rotated', 'pl-ctrls-visible', 'pl-not-started', 'pl-buffering');
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

    _setupSmartBuffering(video); // FEATURE (naya) - dekho definition ka comment upar

    // FEATURE (naya): "Watch on Your Favorite Player" grid - EK BAAR wire
    // hota hai (event delegation), kyunki tiles har _openPlayer() par
    // dobara render hote hain (_renderFavoritePlayerGrid).
    document.getElementById('pl-fav-grid')?.addEventListener('click', (e) => {
      const tile = e.target.closest('.pl-fav-tile');
      if (!tile) return;
      const action = tile.dataset.action;
      if (action === 'download') _downloadCurrentVideo();
      else if (action === 'copy') _copyStreamLink();
      else if (action === 'more') _openInAnyPlayer();
      else if (tile.dataset.pkg) _openInExternalPlayer(tile.dataset.pkg);
    });

    const seek = document.getElementById('pl-ctrl-seek');
    const timeEl = document.getElementById('pl-ctrl-time');
    const playBtn = document.getElementById('pl-ctrl-playpause');
    const centerBtn = document.getElementById('pl-ctrl-center');
    const volBtn = document.getElementById('pl-ctrl-vol');
    const rotateBtn = document.getElementById('pl-ctrl-rotate');
    const fsBtn = document.getElementById('pl-ctrl-fullscreen');
    const ccBtn = document.getElementById('pl-ctrl-cc');
    const langBtn = document.getElementById('pl-ctrl-lang');
    const settingsBtn = document.getElementById('pl-ctrl-settings');
    const langPanel = document.getElementById('pl-lang-panel');
    const ccPanel = document.getElementById('pl-cc-panel');
    const settingsPanel = document.getElementById('pl-settings-panel');

    function _closeOtherPanels(except) {
      [langPanel, ccPanel, settingsPanel].forEach(p => { if (p && p !== except) p.classList.add('hidden'); });
    }

    let _hideTimer = null;
    let _scrubbing = false;

    function showControls() {
      wrap.classList.add('pl-ctrls-visible');
      clearTimeout(_hideTimer);
      if (!video.paused) _hideTimer = setTimeout(() => wrap.classList.remove('pl-ctrls-visible'), 5000);
    }
    function updatePlayIcon() {
      const icon = video.paused ? '▶' : '⏸';
      if (playBtn) playBtn.textContent = icon;
      if (centerBtn) centerBtn.textContent = icon;
    }

    // FIX (real bug - complaint: "kabhi tap karne pe play/stop dono ho
    // jaate hain, sirf button se hona chahiye"): pehle yahan tap karne
    // par bhi play/pause TOGGLE ho jaata tha - poore video area mein
    // kahin bhi tap karo. Isse do dikkatein: (1) galti se tap hote hi
    // playback toggle ho jaata, aur (2) smart-buffering (dekho
    // _setupSmartBuffering) jab buffer jama karne ke liye khud video
    // ko pause karke rakhta, tab user ka ek "sirf controls dekhne wala"
    // tap bhi turant .play() force kar deta - jisse buffer poora hone
    // se PEHLE hi resume ho jaata, aur turant dobara ruk jaata (yahi
    // "play aur stop dono" wala flicker tha). Ab tap sirf controls
    // dikhata/chhupata hai - play/pause SIRF dedicated button se.
    wrap.addEventListener('click', (e) => {
      if (e.target.closest('.pl-controls, .pl-ctrl-center, .pl-pick-panel, .pl-modal-close')) return;
      if (wrap.classList.contains('pl-not-started')) return; // poster state mein tap sirf play-button se hi kaam kare
      showControls();
    });

    // FIX (real bug - complaint: "video ke neeche player ke buttons nahi
    // aa rahe"): pehle 'play' event par hi showControls() (3-second
    // auto-hide timer) chal jaata tha - lekin 'play' event .play() CALL
    // hote hi turant fire hota hai, video ke ASLI frame render hone se
    // BAHUT PEHLE (jab tak buffering/loading chal rahi ho). Matlab
    // 3-second ka timer video dikhne se pehle hi shuru ho jaata, aur
    // video ACTUALLY chalne tak controls pehle hi gayab ho chuke hote -
    // user ko kabhi dikhte hi nahi the. Ab timer 'playing' (jab video
    // GENUINELY frame render kar raha ho) se shuru hota hai, aur duration
    // bhi thoda badhaya hai.
    video.addEventListener('play', () => { updatePlayIcon(); });
    video.addEventListener('playing', () => { updatePlayIcon(); showControls(); });
    video.addEventListener('pause', () => { updatePlayIcon(); showControls(); clearTimeout(_hideTimer); });
    video.addEventListener('ended', () => { updatePlayIcon(); wrap.classList.add('pl-ctrls-visible'); });

    [playBtn, centerBtn].forEach(btn => btn?.addEventListener('click', (e) => {
      e.stopPropagation();
      // FEATURE (naya): pehla tap (abhi tak src set hi nahi hua - poster
      // state) -> load+play shuru karo. Uske baad har tap normal
      // play/pause toggle hai.
      if (!video.src) { _startPlayback(); return; }
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

    // FEATURE (rebuilt): CC button ab ek panel kholta hai (jaise Language)
    // jisme video ke ANDAR jitne bhi text-tracks embedded hon un sabki
    // list dikhti hai (pehle sirf tracks[0] ko blindly on/off karta tha,
    // koi choice ya label nahi tha). Dekho _populateCcPanel() ka comment
    // upar - kab ye kaam karega uski limitation bhi wahin likhi hai.
    ccBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      _closeOtherPanels(ccPanel);
      if (!ccPanel) return;
      if (ccPanel.classList.contains('hidden')) _populateCcPanel(video, ccPanel);
      ccPanel.classList.toggle('hidden');
      showControls();
    });
    ccPanel?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.pl-pick-item');
      if (!item || item.classList.contains('pl-pick-empty')) return;
      const tracks = video.textTracks;
      for (let i = 0; i < (tracks ? tracks.length : 0); i++) tracks[i].mode = 'disabled';
      const val = item.dataset.cc;
      if (val !== 'off' && tracks && tracks[Number(val)]) {
        tracks[Number(val)].mode = 'showing';
        ccBtn?.classList.add('pl-cc-active');
      } else {
        ccBtn?.classList.remove('pl-cc-active');
      }
      _syncCcActive(video, ccPanel);
      ccPanel.classList.add('hidden');
    });

    langBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      _closeOtherPanels(langPanel);
      langPanel?.classList.toggle('hidden');
      showControls();
    });
    langPanel?.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = e.target.closest('.pl-pick-item');
      if (!item || !_currentItem) return;
      langPanel.classList.add('hidden');
      _switchLanguage(item.dataset.lang);
    });

    // FEATURE (naya): Settings gear - Play Speed / Aspect Ratio / Video
    // Flip / Subtitle Offset, ek hi panel mein "drill-down" list ke
    // roop mein (jaise reference image mein) - dekho _renderSettingsPanel().
    settingsBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      _closeOtherPanels(settingsPanel);
      if (!settingsPanel) return;
      const wasHidden = settingsPanel.classList.contains('hidden');
      if (wasHidden) { _settingsView = 'root'; _renderSettingsPanel(); }
      settingsPanel.classList.toggle('hidden');
      showControls();
    });
    settingsPanel?.addEventListener('click', (e) => {
      e.stopPropagation();
      const back = e.target.closest('.pl-settings-back');
      if (back) { _settingsView = 'root'; _renderSettingsPanel(); return; }

      const row = e.target.closest('.pl-settings-row[data-nav]');
      if (row) { _settingsView = row.dataset.nav; _renderSettingsPanel(); return; }

      const speedItem = e.target.closest('[data-speed]');
      if (speedItem) { _applySpeed(Number(speedItem.dataset.speed)); _settingsView = 'root'; _renderSettingsPanel(); return; }

      const aspectItem = e.target.closest('[data-aspect]');
      if (aspectItem) {
        _applyAspect(ASPECT_RATIOS.find(r => r.key === aspectItem.dataset.aspect));
        _settingsView = 'root'; _renderSettingsPanel();
        return;
      }

      const flipItem = e.target.closest('[data-flip]');
      if (flipItem) {
        _applyFlip(VIDEO_FLIPS.find(f => f.key === flipItem.dataset.flip));
        _settingsView = 'root'; _renderSettingsPanel();
        return;
      }
    });
    // Slider apna 'input' event chahiye (drag karte waqt live update) -
    // ye click listener se catch nahi hota, isliye alag se, aur panel ke
    // dobara render hone par bhi kaam kare isliye event-delegation nahi,
    // seedha render ke baad (dekho _renderSettingsPanel) wire karte hain.
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
