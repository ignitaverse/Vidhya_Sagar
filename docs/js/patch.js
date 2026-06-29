/* ═══════════════════════════════════════════════════════════════
   VidyaSagar v5 — PATCH JS
   Loads AFTER all other scripts
   Fixes: typing UI upgrade, timer urgent, submit early,
          quiz animation, tr-verdict badge, game bugs,
          language bar, passage-scroll dark bg fix
═══════════════════════════════════════════════════════════════ */
(function() {
  'use strict';

  /* ── Wait for DOM ── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(function() {

    /* ══════════════════════════════════════
       1. TYPING MODULE PATCHES
    ══════════════════════════════════════ */

    /* Patch timer to add 'urgent' class when < 60s */
    const _origSetTimer = window._setTypeTimer;
    function patchTimer() {
      const timerEl = document.getElementById('type-timer');
      if (!timerEl) return;
      const obs = new MutationObserver(() => {
        const txt = timerEl.textContent || '';
        const parts = txt.replace('-','').split(':');
        if (parts.length >= 2) {
          const mins = parseInt(parts[0]) || 0;
          const secs = parseInt(parts[1]) || 0;
          const total = mins * 60 + secs;
          timerEl.classList.toggle('urgent', total < 60 && total > 0);
        }
      });
      obs.observe(timerEl, { childList: true, characterData: true, subtree: true });
    }
    patchTimer();

    /* Patch: update language bar when exam starts */
    const origOpen = window.openSubScreen;
    if (origOpen) {
      window.openSubScreen = function(id) {
        origOpen.apply(this, arguments);
        if (id === 'screen-typing-active') {
          // Update test id bar with exam title
          const examTitle = document.getElementById('type-exam-title');
          const titleBar = document.getElementById('type-exam-title-bar');
          if (examTitle && titleBar) {
            titleBar.textContent = examTitle.textContent || 'Practice';
          }
          // Dark bg for passage scroll area
          const scrollArea = document.getElementById('passage-scroll-area');
          const isDark = !document.documentElement.getAttribute('data-theme');
          if (scrollArea) {
            scrollArea.style.background = isDark ? '#0f172a' : '#fff';
          }
        }
      };
    }

    /* Patch: submitEarly function for TypingModule */
    if (window.TypingModule && !window.TypingModule.submitEarly) {
      window.TypingModule.submitEarly = function() {
        if (typeof window.TypingModule._submitResult === 'function') {
          window.TypingModule._submitResult();
        } else if (typeof window.TypingModule.finish === 'function') {
          window.TypingModule.finish();
        } else {
          // Fallback: trigger timer end manually
          const timer = document.getElementById('type-timer');
          if (timer) timer.textContent = '00:00';
          showToast('Submitted ✅', 'success');
        }
      };
    }
    // Also expose globally for onclick
    window.typingSubmitEarly = function() {
      if (window.TypingModule && typeof window.TypingModule.submitEarly === 'function') {
        window.TypingModule.submitEarly();
      }
    };

    /* Fix: typing result verdict badge */
    const origShowTypingResult = window._showTypingResult;
    function patchTypingResult() {
      // Intercept when tr-title is set to update badge
      const badge = document.getElementById('tr-verdict-badge');
      const verdictT = document.getElementById('tr-verdict-t');
      if (!badge || !verdictT) return;
      const obs = new MutationObserver(() => {
        const txt = (verdictT.textContent || '').toUpperCase();
        badge.className = 'tr-verdict ' + (txt.includes('PASS') ? 'pass' : 'fail');
      });
      obs.observe(verdictT, { childList: true, characterData: true, subtree: true });
    }
    patchTypingResult();

    /* ══════════════════════════════════════
       2. PASSAGE SCROLL AREA — DARK THEME SYNC
    ══════════════════════════════════════ */
    function syncPassageBg() {
      const scrollArea = document.getElementById('passage-scroll-area');
      const passDisp = document.getElementById('passage-display');
      if (!scrollArea || !passDisp) return;
      const isDark = !document.documentElement.getAttribute('data-theme') ||
                     document.documentElement.getAttribute('data-theme') === 'dark';
      const bg = isDark ? '#0f172a' : '#fff';
      scrollArea.style.background = bg;
      passDisp.style.background   = bg;
    }
    // Run on theme change
    const htmlEl = document.documentElement;
    new MutationObserver(syncPassageBg).observe(htmlEl, { attributes: true, attributeFilter: ['data-theme'] });
    syncPassageBg();

    /* ══════════════════════════════════════
       3. QUIZ — Q-CARD ANIMATION ON NEW Q
    ══════════════════════════════════════ */
    const qText = document.getElementById('q-text');
    if (qText) {
      const qCard = document.getElementById('q-card');
      new MutationObserver(() => {
        if (!qCard) return;
        qCard.classList.remove('animating');
        void qCard.offsetWidth; // force reflow
        qCard.classList.add('animating');
      }).observe(qText, { childList: true, characterData: true, subtree: true });
    }

    /* ══════════════════════════════════════
       4. GAMES — FIX _el helper if not present
    ══════════════════════════════════════ */
    if (!window._el) {
      window._el = function(id) { return document.getElementById(id); };
    }

    /* ══════════════════════════════════════
       5. FIX: submitEarly button onclick
    ══════════════════════════════════════ */
    const submitMainBtn = document.getElementById('btn-typing-submit-main');
    if (submitMainBtn) {
      submitMainBtn.onclick = function() {
        if (window.TypingModule) {
          if (typeof window.TypingModule.submitEarly === 'function') window.TypingModule.submitEarly();
          else if (typeof window.TypingModule.finish === 'function') window.TypingModule.finish();
        }
      };
    }

    /* ══════════════════════════════════════
       6. FIX: WPM label should say WPM not Keystrokes Count
       (ref image shows separate keystroke stats — keep our WPM)
    ══════════════════════════════════════ */
    const wpmLbl = document.querySelector('.tls-wpm .tls-lbl');
    if (wpmLbl) wpmLbl.textContent = 'WPM';
    const keysLbl = document.querySelector('.tls-keys .tls-lbl');
    if (keysLbl) keysLbl.textContent = 'Keys';

    /* ══════════════════════════════════════
       7. FIX: Exam grid padding
    ══════════════════════════════════════ */
    const examGrid = document.getElementById('exam-grid');
    if (examGrid) {
      examGrid.style.padding = '0 14px';
    }

    /* ══════════════════════════════════════
       8. FIX: Chess — stop polling on leave
    ══════════════════════════════════════ */
    const leaveBtn = document.getElementById('og-leave-btn');
    if (leaveBtn && window.OnlineGames) {
      leaveBtn.addEventListener('click', function() {
        OnlineGames.leaveRoom();
      });
    }

    /* ══════════════════════════════════════
       9. FIX: Typing language bar — update when passage loaded
    ══════════════════════════════════════ */
    const passageDisp = document.getElementById('passage-display');
    if (passageDisp) {
      new MutationObserver(function() {
        // Auto-detect language from passage text (Hindi/English)
        const langLabel = document.getElementById('type-lang-label');
        const text = passageDisp.textContent || '';
        // Devanagari range: \u0900-\u097F
        const hasHindi = /[\u0900-\u097F]/.test(text);
        if (langLabel) {
          langLabel.textContent = hasHindi ? 'Hindi' : 'English';
        }
      }).observe(passageDisp, { childList: true, subtree: true });
    }

    /* ══════════════════════════════════════
       10. FIX: Number game — reset button
    ══════════════════════════════════════ */
    document.querySelectorAll('[onclick*="openNumberGame"], [onclick*="NG.reset"]').forEach(el => {
      el.addEventListener('click', function() {
        if (window.GamesModule && window.GamesModule._initNumberGame) {
          window.GamesModule._initNumberGame();
        }
      });
    });

    /* ══════════════════════════════════════
       11. FIX: Mobile — prevent double-tap zoom on buttons
    ══════════════════════════════════════ */
    document.querySelectorAll('button, .nav-tab, .sub-screen').forEach(el => {
      el.style.touchAction = el.style.touchAction || 'manipulation';
    });

    /* ══════════════════════════════════════
       12. FIX: Auth modal — proper close on backdrop
    ══════════════════════════════════════ */
    const authModal = document.getElementById('auth-modal');
    if (authModal) {
      authModal.addEventListener('click', function(e) {
        if (e.target === authModal) {
          if (typeof closeAuth === 'function') closeAuth();
        }
      });
    }

    /* ══════════════════════════════════════
       13. FIX: Escape key closes auth modal
    ══════════════════════════════════════ */
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        const modal = document.getElementById('auth-modal');
        if (modal && !modal.classList.contains('hidden')) {
          if (typeof closeAuth === 'function') closeAuth();
        }
      }
    });

    /* ══════════════════════════════════════
       14. FIX: Bottom nav always visible
    ══════════════════════════════════════ */
    const botNav = document.querySelector('.bottom-nav');
    if (botNav) {
      botNav.style.display = 'flex';
      botNav.style.visibility = 'visible';
      botNav.style.opacity = '1';
    }

    /* ══════════════════════════════════════
       15. UI POLISH: Add current char cursor blink
    ══════════════════════════════════════ */
    const styleEl = document.createElement('style');
    styleEl.textContent = `
      .pc.current {
        position: relative;
        animation: cursorBlink .8s ease infinite;
      }
      @keyframes cursorBlink {
        0%,100% { box-shadow: none; }
        50% { box-shadow: 0 2px 0 0 #1a56db; }
      }
      /* Typing result — ensure save msg visible */
      #typing-save-msg { min-height: 20px; display: block; }
      /* Fix: games tab active border */
      .gtab.active { border-bottom: 3px solid transparent !important; }
      /* Fix: online history scroll */
      #screen-online-history { overflow-y: auto !important; }
      /* Fix: ng-win-banner text */
      .ng-win-title { font-family: 'Syne', sans-serif; font-size: 1.3rem; font-weight: 900; color: #34d399; margin-bottom: 6px; }
      .ng-win-sub   { font-size: .84rem; color: var(--text2); }
      /* Fix: word scramble result alignment */
      .ws-result.correct { color: #34d399 !important; font-weight: 700; }
      .ws-result.wrong   { color: #fb7185 !important; font-weight: 600; }
      /* Fix: history cards delete btn */
      .hist-card [data-id]:hover { background: rgba(244,63,94,.2) !important; }
      /* Fix: search dropdown border radius */
      #search-results-dropdown {
        background: var(--card2) !important;
        border: 1.5px solid var(--border2) !important;
        border-radius: 16px !important;
        overflow: hidden !important;
        box-shadow: 0 8px 30px rgba(0,0,0,.35) !important;
      }
      /* Fix: profile-header dark gradient */
      .profile-header-card {
        background: linear-gradient(160deg, rgba(29,110,245,.2), rgba(139,92,246,.18)) !important;
        border: 1.5px solid rgba(99,102,241,.2) !important;
        border-radius: 20px !important;
        margin: 12px !important;
        padding: 24px 16px !important;
        text-align: center !important;
      }
      /* Fix: ph-avatar size */
      .ph-avatar {
        width: 72px !important;
        height: 72px !important;
        border-radius: 50% !important;
        background: linear-gradient(135deg, var(--blue), var(--purple)) !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        font-size: 2.4rem !important;
        cursor: pointer !important;
        margin: 0 auto 6px !important;
        box-shadow: 0 0 0 3px rgba(139,92,246,.3), 0 8px 24px rgba(0,0,0,.35) !important;
      }
      .ph-name { font-family: 'Syne', sans-serif; font-size: 1.15rem; font-weight: 800; margin-bottom: 3px; }
      .ph-email { font-size: .78rem; color: var(--text3); margin-bottom: 4px; }
      .ph-joined { font-size: .72rem; color: var(--text3); }
      /* Typing inp dark placeholder */
      [data-theme="dark"] .typing-inp::placeholder,
      :not([data-theme]) .typing-inp::placeholder { color: rgba(255,255,255,.25) !important; }
    `;
    document.head.appendChild(styleEl);

    console.log('[VidyaSagar Patch v5] ✅ All patches applied');
  });

})();
