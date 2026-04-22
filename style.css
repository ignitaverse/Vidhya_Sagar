/* ═══════════════════════════════════════════
   विद्यासागर Quiz App — Complete Stylesheet
   ═══════════════════════════════════════════ */

:root {
  --navy:         #0d1b3e;
  --navy-mid:     #152752;
  --navy-light:   #1e3570;
  --saffron:      #f4820a;
  --saffron-light:#ffa040;
  --gold:         #e6b422;
  --cream:        #fdf8ef;
  --white:        #ffffff;
  --text-primary: #fdf8ef;
  --text-secondary:#b8c9e8;
  --text-muted:   #7a8aad;
  --success:      #27ae60;
  --danger:       #e74c3c;
  --border:       rgba(244,130,10,0.2);
  --shadow:       0 8px 32px rgba(13,27,62,0.4);
  --transition:   0.32s cubic-bezier(0.4,0,0.2,1);
  --radius-sm:    8px;
  --radius-md:    12px;
  --radius-lg:    16px;
  --radius-xl:    20px;
}

/* ── RESET & BASE ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { scroll-behavior: smooth; }

body {
  font-family: 'Baloo 2', 'Noto Sans Devanagari', 'Segoe UI', sans-serif;
  background: var(--navy);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
  line-height: 1.6;
}

/* ── SCROLLBAR ── */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--navy); }
::-webkit-scrollbar-thumb { background: rgba(244,130,10,0.4); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--saffron); }

/* ── BACKGROUND ── */
.bg-pattern {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    radial-gradient(circle at 20% 20%, rgba(244,130,10,0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(230,180,34,0.06) 0%, transparent 50%);
}

.mandala {
  position: fixed; pointer-events: none; z-index: 0;
  opacity: 0.035;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Ccircle cx='100' cy='100' r='95' fill='none' stroke='%23f4820a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='75' fill='none' stroke='%23f4820a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='55' fill='none' stroke='%23f4820a' stroke-width='1'/%3E%3Ccircle cx='100' cy='100' r='35' fill='none' stroke='%23f4820a' stroke-width='1'/%3E%3Cline x1='5' y1='100' x2='195' y2='100' stroke='%23f4820a' stroke-width='0.5'/%3E%3Cline x1='100' y1='5' x2='100' y2='195' stroke='%23f4820a' stroke-width='0.5'/%3E%3Cline x1='29' y1='29' x2='171' y2='171' stroke='%23f4820a' stroke-width='0.5'/%3E%3Cline x1='171' y1='29' x2='29' y2='171' stroke='%23f4820a' stroke-width='0.5'/%3E%3C/svg%3E") center/contain no-repeat;
  animation: rotateMandala 60s linear infinite;
}
.mandala-1 { top: -200px; right: -200px; width: 600px; height: 600px; }
.mandala-2 { bottom: -150px; left: -150px; width: 400px; height: 400px; animation-direction: reverse; animation-duration: 45s; opacity: 0.025; }
@keyframes rotateMandala { to { transform: rotate(360deg); } }

/* ── SCREENS ── */
.screen {
  position: fixed; inset: 0;
  display: flex; flex-direction: column;
  opacity: 0; pointer-events: none;
  transform: translateY(24px);
  transition: opacity var(--transition), transform var(--transition);
  z-index: 1; overflow-y: auto; overflow-x: hidden;
}
.screen.active { opacity: 1; pointer-events: all; transform: translateY(0); }

/* ══════════════════════════════════
   LOADING SCREEN
══════════════════════════════════ */
#screen-loading {
  align-items: center; justify-content: center;
  background: var(--navy);
}

.loader-wrap { text-align: center; position: relative; z-index: 2; }

.lotus-loader {
  width: 80px; height: 80px;
  margin: 0 auto 24px;
  position: relative;
}

.lotus-petal {
  position: absolute;
  width: 18px; height: 32px;
  background: linear-gradient(180deg, var(--saffron) 0%, var(--gold) 100%);
  border-radius: 50% 50% 0 0;
  transform-origin: bottom center;
  animation: petalBloom 1.6s ease-in-out infinite;
  left: 31px; top: 0;
}
.lotus-petal:nth-child(1) { transform: rotate(0deg);   animation-delay: 0s;    --r: 0deg; }
.lotus-petal:nth-child(2) { transform: rotate(45deg);  animation-delay: 0.2s;  --r: 45deg; }
.lotus-petal:nth-child(3) { transform: rotate(90deg);  animation-delay: 0.4s;  --r: 90deg; }
.lotus-petal:nth-child(4) { transform: rotate(135deg); animation-delay: 0.6s;  --r: 135deg; }
.lotus-petal:nth-child(5) { transform: rotate(180deg); animation-delay: 0.8s;  --r: 180deg; }
.lotus-petal:nth-child(6) { transform: rotate(225deg); animation-delay: 1.0s;  --r: 225deg; }
.lotus-petal:nth-child(7) { transform: rotate(270deg); animation-delay: 1.2s;  --r: 270deg; }
.lotus-petal:nth-child(8) { transform: rotate(315deg); animation-delay: 1.4s;  --r: 315deg; }

@keyframes petalBloom {
  0%, 100% { opacity: 0.25; transform: rotate(var(--r)) scaleY(0.65); }
  50%       { opacity: 1;   transform: rotate(var(--r)) scaleY(1.05); }
}

.loader-brand { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, var(--saffron), var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; letter-spacing: 2px; }
.loader-sub   { font-size: 13px; color: var(--text-muted); margin-top: 6px; letter-spacing: 1px; }
.loader-bar   { width: 200px; height: 3px; background: rgba(255,255,255,0.08); border-radius: 2px; margin: 24px auto 0; overflow: hidden; }
.loader-fill  { height: 100%; background: linear-gradient(90deg, var(--saffron), var(--gold)); border-radius: 2px; animation: fillBar 2.2s cubic-bezier(0.4,0,0.2,1) forwards; }
@keyframes fillBar { from { width: 0; } to { width: 100%; } }

/* ══════════════════════════════════
   AUTH / LOGIN SCREEN
══════════════════════════════════ */
#screen-login {
  align-items: center; justify-content: center; padding: 20px;
  background: radial-gradient(ellipse at center, rgba(21,39,82,0.8) 0%, var(--navy) 100%);
}

.auth-card {
  background: rgba(15,29,65,0.96);
  border: 1px solid rgba(244,130,10,0.25);
  border-radius: var(--radius-xl);
  padding: 44px 40px;
  width: 100%; max-width: 420px;
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.5), 0 0 0 1px rgba(244,130,10,0.08);
  position: relative; z-index: 2;
  animation: cardIn 0.5s cubic-bezier(0.4,0,0.2,1);
}
@keyframes cardIn { from { opacity: 0; transform: translateY(30px) scale(0.97); } to { opacity: 1; transform: none; } }

.brand-block { text-align: center; margin-bottom: 30px; }
.brand-icon  { font-size: 44px; display: block; margin-bottom: 6px; animation: iconBounce 2s ease infinite; }
@keyframes iconBounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
.brand-name  { font-size: 28px; font-weight: 800; background: linear-gradient(135deg, var(--saffron) 30%, var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.brand-tagline { font-size: 12px; color: var(--text-muted); margin-top: 3px; letter-spacing: 0.5px; }

.auth-tabs { display: flex; background: rgba(255,255,255,0.04); border-radius: 10px; padding: 4px; margin-bottom: 26px; }
.auth-tab  { flex: 1; padding: 10px; text-align: center; font-size: 14px; font-weight: 700; cursor: pointer; border-radius: 7px; color: var(--text-muted); transition: all 0.2s; border: none; background: none; font-family: inherit; }
.auth-tab.active { background: var(--saffron); color: white; box-shadow: 0 2px 12px rgba(244,130,10,0.4); }

.form-group   { margin-bottom: 16px; }
.form-label   { font-size: 11px; font-weight: 700; color: var(--text-muted); margin-bottom: 7px; display: block; text-transform: uppercase; letter-spacing: 0.8px; }
.form-input   { width: 100%; padding: 12px 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 15px; font-family: inherit; transition: all 0.2s; outline: none; }
.form-input:focus { border-color: var(--saffron); background: rgba(244,130,10,0.04); box-shadow: 0 0 0 3px rgba(244,130,10,0.12); }
.form-input::placeholder { color: var(--text-muted); font-size: 14px; }

.btn-primary { width: 100%; padding: 14px; background: linear-gradient(135deg, var(--saffron) 0%, #cc6600 100%); color: white; font-size: 16px; font-weight: 700; border: none; border-radius: var(--radius-sm); cursor: pointer; font-family: inherit; transition: all 0.2s; box-shadow: 0 4px 20px rgba(244,130,10,0.35); margin-top: 4px; }
.btn-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 28px rgba(244,130,10,0.45); }
.btn-primary:active { transform: translateY(0); }

.divider { text-align: center; color: var(--text-muted); font-size: 12px; margin: 18px 0; position: relative; }
.divider::before, .divider::after { content: ''; position: absolute; top: 50%; width: 42%; height: 1px; background: rgba(255,255,255,0.08); }
.divider::before { left: 0; } .divider::after { right: 0; }

.btn-skip { width: 100%; padding: 12px; background: transparent; border: 1px solid rgba(255,255,255,0.12); color: var(--text-muted); font-size: 14px; font-weight: 600; border-radius: var(--radius-sm); cursor: pointer; font-family: inherit; transition: all 0.2s; }
.btn-skip:hover { border-color: rgba(244,130,10,0.4); color: var(--saffron); background: rgba(244,130,10,0.04); }

.auth-error { background: rgba(231,76,60,0.12); border: 1px solid rgba(231,76,60,0.3); color: #ff9090; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 14px; display: none; }
.auth-error.show { display: block; animation: shake 0.3s ease; }
@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }

.auth-success { background: rgba(39,174,96,0.12); border: 1px solid rgba(39,174,96,0.3); color: #90ffb0; padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 14px; display: none; }
.auth-success.show { display: block; }

/* ══════════════════════════════════
   NAVBAR
══════════════════════════════════ */
.navbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 28px;
  background: rgba(10,20,50,0.92);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(244,130,10,0.12);
  position: sticky; top: 0; z-index: 100;
  flex-shrink: 0;
}

.nav-brand { font-size: 20px; font-weight: 800; background: linear-gradient(135deg, var(--saffron), var(--gold)); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; cursor: pointer; }

.nav-links { display: flex; gap: 4px; }
.nav-link  { padding: 8px 16px; border-radius: var(--radius-sm); font-size: 14px; font-weight: 600; cursor: pointer; color: var(--text-muted); transition: all 0.2s; border: none; background: none; font-family: inherit; }
.nav-link:hover  { color: var(--text-primary); background: rgba(255,255,255,0.05); }
.nav-link.active { color: var(--saffron); background: rgba(244,130,10,0.1); }

.nav-right { display: flex; align-items: center; gap: 10px; }
.nav-avatar { width: 34px; height: 34px; border-radius: 50%; background: linear-gradient(135deg, var(--saffron), var(--gold)); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 800; color: white; cursor: pointer; flex-shrink: 0; }
.nav-username { font-size: 13px; color: var(--text-muted); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* ══════════════════════════════════
   MAIN SCREEN & TAB PANELS
══════════════════════════════════ */
#screen-main { flex-direction: column; overflow-y: auto; }
.main-content { flex: 1; padding-bottom: 48px; }

.tab-panel { display: none; animation: fadeIn 0.3s ease; }
.tab-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

/* ── Section Title ── */
.section-title {
  font-size: 18px; font-weight: 700; color: var(--text-primary);
  margin-bottom: 16px; padding-bottom: 10px;
  border-bottom: 2px solid rgba(244,130,10,0.25);
  display: flex; align-items: center; gap: 10px;
}
.section-title::before { content: ''; width: 4px; height: 20px; background: var(--saffron); border-radius: 2px; display: block; }

/* ══════════════════════════════════
   HOME TAB
══════════════════════════════════ */
.home-hero {
  padding: 60px 28px 44px;
  text-align: center;
  background: linear-gradient(180deg, rgba(244,130,10,0.05) 0%, transparent 100%);
  border-bottom: 1px solid rgba(244,130,10,0.08);
  position: relative; overflow: hidden;
}
.home-hero::after { content: '🕉️'; position: absolute; top: 20px; right: 32px; font-size: 80px; opacity: 0.04; }

.hero-title {
  font-size: 44px; font-weight: 800; line-height: 1.2;
  background: linear-gradient(135deg, var(--cream) 30%, var(--saffron));
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 16px;
}
.hero-sub  { font-size: 16px; color: var(--text-muted); max-width: 520px; margin: 0 auto 36px; line-height: 1.7; }

.hero-stats { display: flex; justify-content: center; gap: 48px; flex-wrap: wrap; }
.stat-item  { text-align: center; }
.stat-num   { font-size: 30px; font-weight: 800; color: var(--saffron); }
.stat-label { font-size: 12px; color: var(--text-muted); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }

.features-section { padding: 32px 28px; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
.feature-card {
  background: rgba(21,39,82,0.5);
  border: 1px solid rgba(244,130,10,0.12);
  border-radius: var(--radius-lg); padding: 24px;
  transition: all 0.25s; cursor: default;
}
.feature-card:hover { border-color: rgba(244,130,10,0.3); transform: translateY(-3px); background: rgba(21,39,82,0.8); }
.feature-icon  { font-size: 32px; margin-bottom: 12px; }
.feature-title { font-size: 16px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px; }
.feature-desc  { font-size: 13px; color: var(--text-muted); line-height: 1.65; }

/* ══════════════════════════════════
   QUIZ TAB
══════════════════════════════════ */
.quiz-section { padding: 28px; }

.subject-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-bottom: 28px; }
.subject-card {
  padding: 20px 14px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.08);
  background: rgba(21,39,82,0.4);
  cursor: pointer; text-align: center;
  transition: all 0.2s; font-family: inherit;
  color: var(--text-primary); position: relative; overflow: hidden;
}
.subject-card::before { content: ''; position: absolute; inset: 0; background: var(--card-color, var(--saffron)); opacity: 0; transition: opacity 0.2s; }
.subject-card:hover { border-color: rgba(244,130,10,0.4); transform: translateY(-2px); }
.subject-card:hover::before { opacity: 0.05; }
.subject-card.selected { border-color: var(--saffron); background: rgba(244,130,10,0.1); box-shadow: 0 0 0 3px rgba(244,130,10,0.12); }
.subject-emoji { font-size: 30px; display: block; margin-bottom: 8px; position: relative; }
.subject-name  { font-size: 13px; font-weight: 700; position: relative; }
.subject-count { font-size: 11px; color: var(--text-muted); margin-top: 4px; position: relative; }

.subcategory-box {
  background: rgba(15,29,65,0.6); border: 1px solid rgba(244,130,10,0.15);
  border-radius: var(--radius-md); padding: 20px; margin-bottom: 24px;
  animation: slideDown 0.3s ease;
}
@keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: none; } }
.subcategory-label { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; font-weight: 600; }
.sub-chips { display: flex; flex-wrap: wrap; gap: 10px; }
.sub-chip  { padding: 9px 18px; border-radius: 24px; border: 1.5px solid rgba(244,130,10,0.2); background: transparent; color: var(--text-primary); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.sub-chip:hover, .sub-chip.selected { background: var(--saffron); border-color: var(--saffron); color: white; box-shadow: 0 3px 12px rgba(244,130,10,0.35); }

.states-section { margin-bottom: 28px; }
.states-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(125px, 1fr)); gap: 8px; }
.state-chip  { padding: 10px 8px; border-radius: var(--radius-sm); border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); cursor: pointer; text-align: center; font-size: 12px; font-weight: 600; color: var(--text-muted); font-family: inherit; transition: all 0.2s; }
.state-chip:hover  { border-color: rgba(244,130,10,0.35); color: var(--saffron); background: rgba(244,130,10,0.04); }
.state-chip.selected { border-color: var(--saffron); color: var(--saffron); background: rgba(244,130,10,0.1); }

.btn-start {
  display: block; width: 100%; max-width: 380px; margin: 4px auto;
  padding: 17px; text-align: center;
  background: linear-gradient(135deg, var(--saffron) 0%, #b85700 100%);
  color: white; font-size: 18px; font-weight: 700;
  border: none; border-radius: var(--radius-md); cursor: pointer; font-family: inherit;
  transition: all 0.25s; box-shadow: 0 6px 24px rgba(244,130,10,0.35); letter-spacing: 0.5px;
}
.btn-start:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(244,130,10,0.45); }
.btn-start:disabled { opacity: 0.35; cursor: not-allowed; transform: none !important; }

/* ══════════════════════════════════
   HISTORY TAB
══════════════════════════════════ */
.history-section { padding: 28px; }

.user-card {
  background: linear-gradient(135deg, rgba(244,130,10,0.12), rgba(230,180,34,0.08));
  border: 1px solid rgba(244,130,10,0.2); border-radius: var(--radius-lg);
  padding: 24px; margin-bottom: 28px;
  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;
}
.user-avatar-lg { width: 62px; height: 62px; border-radius: 50%; background: linear-gradient(135deg, var(--saffron), var(--gold)); display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 800; color: white; flex-shrink: 0; }
.user-info h3  { font-size: 18px; font-weight: 700; color: var(--text-primary); }
.user-info p   { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
.user-stats    { display: flex; gap: 28px; margin-left: auto; flex-wrap: wrap; }
.user-stat     { text-align: center; }
.user-stat-num { font-size: 24px; font-weight: 800; color: var(--saffron); }
.user-stat-label { font-size: 11px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }

.history-list { display: flex; flex-direction: column; gap: 10px; }
.history-item {
  background: rgba(21,39,82,0.45); border: 1px solid rgba(255,255,255,0.07);
  border-radius: var(--radius-md); padding: 16px 20px;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
  transition: all 0.2s;
}
.history-item:hover { border-color: rgba(244,130,10,0.18); background: rgba(21,39,82,0.7); }
.hist-icon { width: 44px; height: 44px; border-radius: 10px; background: rgba(244,130,10,0.1); border: 1px solid rgba(244,130,10,0.18); display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
.hist-info { flex: 1; min-width: 120px; }
.hist-title { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.hist-date  { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.hist-badge { padding: 5px 14px; border-radius: 20px; font-size: 13px; font-weight: 700; }
.hist-badge.good { background: rgba(39,174,96,0.15);  color: #6dffa0; }
.hist-badge.avg  { background: rgba(244,130,10,0.15); color: var(--saffron); }
.hist-badge.low  { background: rgba(231,76,60,0.15);  color: #ff8888; }

.empty-state { text-align: center; padding: 64px 24px; }
.empty-icon  { font-size: 52px; margin-bottom: 14px; opacity: 0.6; }
.empty-title { font-size: 16px; font-weight: 700; color: var(--text-muted); margin-bottom: 6px; }
.empty-desc  { font-size: 14px; color: var(--text-muted); opacity: 0.7; }

/* ══════════════════════════════════
   QUIZ GAME SCREEN
══════════════════════════════════ */
#screen-quiz { flex-direction: column; overflow-y: auto; }

.quiz-header {
  padding: 16px 28px;
  background: rgba(10,20,50,0.92); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(244,130,10,0.12);
  flex-shrink: 0;
}
.quiz-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.quiz-topic   { font-size: 14px; color: var(--saffron); font-weight: 700; }
.quiz-counter { font-size: 14px; color: var(--text-muted); font-weight: 600; }
.quiz-progress { height: 5px; background: rgba(255,255,255,0.08); border-radius: 3px; overflow: hidden; }
.quiz-progress-bar { height: 100%; background: linear-gradient(90deg, var(--saffron), var(--gold)); border-radius: 3px; transition: width 0.5s ease; }

.quiz-body { padding: 36px 28px; max-width: 740px; margin: 0 auto; width: 100%; }

.q-num  { font-size: 11px; color: var(--text-muted); font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 10px; }
.q-text { font-size: 22px; font-weight: 700; color: var(--text-primary); line-height: 1.55; margin-bottom: 32px; }

.options-grid { display: grid; gap: 12px; }
.option-btn {
  padding: 16px 20px; border-radius: var(--radius-md);
  border: 1.5px solid rgba(255,255,255,0.1);
  background: rgba(21,39,82,0.45);
  color: var(--text-primary); font-size: 16px; font-weight: 500;
  cursor: pointer; text-align: left; font-family: inherit;
  transition: all 0.2s; display: flex; align-items: center; gap: 14px;
}
.option-btn:hover:not(:disabled) { border-color: rgba(244,130,10,0.45); background: rgba(244,130,10,0.07); transform: translateX(4px); }
.option-btn.correct  { border-color: #27ae60; background: rgba(39,174,96,0.13); color: #7fffa0; }
.option-btn.wrong    { border-color: #e74c3c; background: rgba(231,76,60,0.13); color: #ff9090; }
.option-btn:disabled { cursor: not-allowed; }

.option-label {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.07); border: 1.5px solid rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; font-weight: 700; transition: all 0.2s;
}

.quiz-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 28px; flex-wrap: wrap; gap: 10px; }
.score-live  { font-size: 13px; color: var(--text-muted); font-weight: 600; }
.score-live strong { color: var(--saffron); font-size: 16px; }
.quiz-actions { display: flex; gap: 10px; }

.btn-quit { padding: 10px 20px; border-radius: var(--radius-sm); background: transparent; border: 1px solid rgba(255,255,255,0.12); color: var(--text-muted); font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.btn-quit:hover { border-color: rgba(231,76,60,0.4); color: #ff9090; }
.btn-next { padding: 11px 26px; border-radius: var(--radius-sm); background: var(--saffron); color: white; font-size: 15px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; transition: all 0.2s; display: none; }
.btn-next:hover { background: var(--saffron-light); }

/* ── RESULT ── */
.result-wrap { padding: 36px 28px; display: flex; justify-content: center; }
.result-card {
  background: rgba(15,29,65,0.8); border: 1px solid rgba(244,130,10,0.2);
  border-radius: var(--radius-xl); padding: 48px 40px; text-align: center;
  max-width: 500px; width: 100%;
  animation: cardIn 0.5s ease;
}
.result-emoji  { font-size: 64px; margin-bottom: 18px; display: block; animation: pop 0.5s 0.2s both; }
@keyframes pop { from { transform: scale(0); } 70% { transform: scale(1.15); } to { transform: scale(1); } }
.result-title  { font-size: 28px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px; }
.result-score  { font-size: 64px; font-weight: 900; color: var(--saffron); line-height: 1; margin: 16px 0 6px; }
.result-sub    { font-size: 14px; color: var(--text-muted); margin-bottom: 28px; }
.result-stats  { display: flex; justify-content: center; gap: 36px; margin-bottom: 32px; }
.r-stat        { text-align: center; }
.r-stat-num    { font-size: 24px; font-weight: 800; }
.r-stat-label  { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
.r-correct     { color: #7fffa0; }
.r-wrong       { color: #ff9090; }
.result-btns   { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.btn-secondary { padding: 12px 24px; border-radius: var(--radius-sm); border: 1.5px solid rgba(244,130,10,0.3); color: var(--saffron); background: transparent; font-size: 14px; font-weight: 700; cursor: pointer; font-family: inherit; transition: all 0.2s; }
.btn-secondary:hover { background: rgba(244,130,10,0.08); }

/* ══════════════════════════════════
   TOAST NOTIFICATIONS
══════════════════════════════════ */
.toast {
  position: fixed; bottom: 24px; right: 24px; z-index: 9999;
  background: rgba(21,39,82,0.96); border: 1px solid rgba(244,130,10,0.3);
  color: var(--text-primary); padding: 14px 20px; border-radius: var(--radius-md);
  font-size: 14px; font-weight: 600; max-width: 320px;
  backdrop-filter: blur(12px); box-shadow: 0 8px 32px rgba(0,0,0,0.4);
  animation: toastIn 0.3s ease;
  display: flex; align-items: center; gap: 10px;
}
.toast.success { border-color: rgba(39,174,96,0.4); }
.toast.error   { border-color: rgba(231,76,60,0.4); }
@keyframes toastIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: none; } }
@keyframes toastOut { to { opacity: 0; transform: translateX(20px); } }

/* ══════════════════════════════════
   RESPONSIVE
══════════════════════════════════ */
@media (max-width: 600px) {
  .auth-card { padding: 28px 20px; }
  .hero-title { font-size: 28px; }
  .hero-stats { gap: 24px; }
  .quiz-body  { padding: 24px 16px; }
  .q-text     { font-size: 18px; }
  .navbar     { padding: 12px 16px; }
  .nav-username { display: none; }
  .result-card { padding: 32px 20px; }
  .quiz-section, .history-section, .quiz-body { padding-left: 16px; padding-right: 16px; }
}
@media (max-width: 400px) {
  .hero-stats { gap: 16px; }
  .stat-num { font-size: 24px; }
  .subject-grid { grid-template-columns: repeat(2, 1fr); }
  .states-grid  { grid-template-columns: repeat(2, 1fr); }
}
