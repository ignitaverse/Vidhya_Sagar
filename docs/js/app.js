/* ═══════════════════════════════════════════
   विद्यासागर — Main App JS
   JSON से questions + Resume Progress
   ═══════════════════════════════════════════ */

const API_BASE = 'https://vidhya-sagar.onrender.com';

const SUBJECTS = [
  { id:'math',    emoji:'🔢', name:'गणित',          count:'850+', color:'#f4820a' },
  { id:'english', emoji:'🔤', name:'English',        count:'720+', color:'#3b82f6' },
  { id:'hindi',   emoji:'📖', name:'हिंदी',          count:'600+', color:'#8b5cf6' },
  { id:'science', emoji:'🔬', name:'विज्ञान',        count:'540+', color:'#10b981' },
  { id:'gk',      emoji:'🌍', name:'सामान्य ज्ञान', count:'980+', color:'#ef4444' },
  { id:'computer',emoji:'💻', name:'Computer',       count:'430+', color:'#06b6d4' },
  { id:'sanskrit',emoji:'🕉️', name:'संस्कृत',        count:'280+', color:'#f59e0b' },
  { id:'current', emoji:'📰', name:'करंट अफेयर्स',  count:'320+', color:'#ec4899' }
];

// ─── SERVER SE QUESTIONS LANEY KA LOGIC ───
async function fetchQuestionsFromServer(subjectId, subCategory = 'all') {
  try {
    // API URL banayein (Subcategory ke saath)
    let url = `${API_BASE}/quiz/${subjectId}`;
    if (subCategory && subCategory !== 'all') {
      url += `?category=${encodeURIComponent(subCategory)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.success) {
      return data.data; // Questions array return karega
    } else {
      showToast(data.message, 'error');
      return [];
    }
  } catch (error) {
    console.error("Fetch Error:", error);
    showToast("सर्वर से कनेक्ट नहीं हो पा रहा है", "error");
    return [];
  }

const STATES = [
  'उत्तर प्रदेश','मध्य प्रदेश','राजस्थान','बिहार','महाराष्ट्र',
  'गुजरात','पंजाब','हरियाणा','उत्तराखंड','हिमाचल प्रदेश',
  'दिल्ली','छत्तीसगढ़','झारखंड','ओडिशा','पश्चिम बंगाल',
  'आंध्र प्रदेश','तेलंगाना','कर्नाटक','केरल','तमिलनाडु',
  'असम','गोवा','जम्मू-कश्मीर','मणिपुर','मेघालय',
  'नागालैंड','सिक्किम','त्रिपुरा'
];

const FILE_MAP = {
  math:'math.json', english:'english.json', hindi:'hindi.json',
  science:'science.json', gk:'gk.json', computer:'computer.json',
  sanskrit:'sanskrit.json', current:'current_affairs.json', states:'states_gk.json'
};

// GitHub Pages पर exact base URL
const BASE_URL = 'https://raw.githubusercontent.com/megagrand100/game/refs/heads/main/docs/questions/';

const App = {
  user:null, token:null,
  selectedSubject:null, selectedSub:null, selectedState:null,
  quizQuestions:[], quizIdx:0, score:0,
  quizLabel:'', quizEmoji:'📝',
  historyData:[], quizStartTime:null,
  loadedJSON:{},
};

/* ══ PROGRESS ══ */
function getProgressKey() {
  if (App.selectedState) return 'vs_prog__state__'+App.selectedState;
  return 'vs_prog__'+App.selectedSubject+'__'+App.selectedSub;
}
function saveProgress() {
  try {
    localStorage.setItem(getProgressKey(), JSON.stringify({
      quizIdx:App.quizIdx, score:App.score,
      questions:App.quizQuestions, savedAt:Date.now()
    }));
  } catch{}
}
function loadProgress() {
  try { const s=localStorage.getItem(getProgressKey()); return s?JSON.parse(s):null; } catch { return null; }
}
function clearProgress() { try { localStorage.removeItem(getProgressKey()); } catch{} }

/* ══ INIT ══ */
document.addEventListener('DOMContentLoaded', () => {
  const t=localStorage.getItem('vs_token'), u=localStorage.getItem('vs_user');
  if(t&&u){App.token=t; App.user=JSON.parse(u);}
  setTimeout(()=>{
    if(App.token&&App.user) enterApp(App.user,false);
    else showScreen('screen-login');
  },2400);
});

/* ══ JSON LOAD ══ */
async function startQuiz(subjectId, subCategory = 'all') {
  // 1. Loader dikhayein (Optional)
  showToast("प्रश्न लोड हो रहे हैं...", "info");

  // 2. Database se questions mangwayein
  const questions = await fetchQuestionsFromServer(subjectId, subCategory);

  if (!questions || questions.length === 0) {
    showToast("इस विषय में अभी प्रश्न उपलब्ध नहीं हैं", "warning");
    return;
  }

  // 3. Quiz State set karein
  App.currentQuestions = questions;
  App.currentSubject = SUBJECTS.find(s => s.id === subjectId);
  App.score = 0;
  App.currentIndex = 0;
  App.userAnswers = [];
  App.startTime = Date.now();

  // 4. Screen change karein aur pehla sawal dikhayein
  showScreen('screen-quiz');
  renderQuestion();
}

/* ══ SCREEN ══ */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  setTimeout(()=>{document.getElementById(id).scrollTop=0;},50);
}

/* ══ AUTH ══ */
function switchAuthTab(tab){
  document.getElementById('form-login').style.display=tab==='login'?'block':'none';
  document.getElementById('form-signup').style.display=tab==='signup'?'block':'none';
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-signup').classList.toggle('active',tab==='signup');
  const el=document.getElementById('auth-msg'); el.className='auth-error'; el.textContent='';
}
function showAuthError(msg){const el=document.getElementById('auth-msg'); el.className='auth-error show'; el.textContent='⚠️ '+msg;}
function showAuthSuccess(msg){const el=document.getElementById('auth-msg'); el.className='auth-success show'; el.textContent='✅ '+msg;}

async function doLogin(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-pass').value.trim();
  if(!email||!password) return showAuthError('ईमेल और पासवर्ड दर्ज करें');
  const btn=document.getElementById('btn-login');
  btn.textContent='लॉगिन हो रहा है...'; btn.disabled=true;
  try{
    const r=await fetch(API_BASE+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    const d=await r.json(); if(!d.success) throw new Error(d.message);
    App.token=d.token; App.user=d.user;
    localStorage.setItem('vs_token',d.token); localStorage.setItem('vs_user',JSON.stringify(d.user));
    showAuthSuccess('लॉगिन सफल! 🎉');
    setTimeout(()=>enterApp(d.user,true),800);
  }catch(e){showAuthError(e.message||'Server से जुड़ नहीं पाए। Skip करके जारी रखें।'); btn.textContent='लॉगिन करें →'; btn.disabled=false;}
}

async function doSignup(){
  const name=document.getElementById('signup-name').value.trim();
  const email=document.getElementById('signup-email').value.trim();
  const password=document.getElementById('signup-pass').value.trim();
  if(!name||!email||!password) return showAuthError('सभी fields भरें');
  if(password.length<6) return showAuthError('पासवर्ड कम से कम 6 अक्षर का होना चाहिए');
  const btn=document.getElementById('btn-signup');
  btn.textContent='बन रहा है...'; btn.disabled=true;
  try{
    const r=await fetch(API_BASE+'/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,email,password})});
    const d=await r.json(); if(!d.success) throw new Error(d.message);
    App.token=d.token; App.user=d.user;
    localStorage.setItem('vs_token',d.token); localStorage.setItem('vs_user',JSON.stringify(d.user));
    showAuthSuccess('Account बन गया! Welcome 🎉');
    setTimeout(()=>enterApp(d.user,true),800);
  }catch(e){showAuthError(e.message||'Server से जुड़ नहीं पाए। Skip करके जारी रखें।'); btn.textContent='Account बनाएं →'; btn.disabled=false;}
}

function skipLogin(){App.user={name:'अतिथि',email:'',isGuest:true}; App.token=null; enterApp(App.user,false);}
function doLogout(){
  App.user=null; App.token=null;
  localStorage.removeItem('vs_token'); localStorage.removeItem('vs_user');
  showScreen('screen-login'); showToast('लॉगआउट हो गए','success');
}

/* ══ ENTER APP ══ */
function enterApp(user,fetchHistory){
  App.user=user;
  const i=user.name.charAt(0).toUpperCase();
  document.getElementById('nav-avatar').textContent=i;
  document.getElementById('nav-username').textContent=user.name;
  document.getElementById('hist-avatar').textContent=i;
  document.getElementById('hist-name').textContent=user.name;
  document.getElementById('hist-joined').textContent=user.isGuest?'अतिथि मोड — History save नहीं होगी':'जुड़े: '+formatDate(user.joinedAt||new Date())+' • '+user.email;
  if(user.totalQuizzes!==undefined){
    document.getElementById('hist-total').textContent=user.totalQuizzes||0;
    document.getElementById('hist-correct').textContent=user.totalCorrect||0;
    document.getElementById('hist-wrong').textContent=user.totalWrong||0;
  }
  renderSubjectGrid(); renderStatesGrid();
  showScreen('screen-main'); switchTab('home');
  if(fetchHistory&&App.token) loadHistory();
}

/* ══ TABS ══ */
function switchTab(tab){
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
  const n=document.getElementById('nav-'+tab), p=document.getElementById('panel-'+tab);
  if(n) n.classList.add('active'); if(p) p.classList.add('active');
  if(tab==='history') renderHistory();
}

/* ══ SUBJECT GRID ══ */
function renderSubjectGrid(){
  document.getElementById('subject-grid').innerHTML=SUBJECTS.map(s=>`
    <button class="subject-card" id="subj-${s.id}" onclick="selectSubject('${s.id}')" style="--card-color:${s.color}">
      <span class="subject-emoji">${s.emoji}</span>
      <span class="subject-name">${s.name}</span>
      <span class="subject-count">${s.count} प्रश्न</span>
    </button>`).join('');
}

async function selectSubject(id){
  App.selectedSubject=id; App.selectedSub=null; App.selectedState=null;
  document.querySelectorAll('.subject-card').forEach(b=>b.classList.remove('selected'));
  document.getElementById('subj-'+id).classList.add('selected');
  document.querySelectorAll('.state-chip').forEach(b=>b.classList.remove('selected'));

  const area=document.getElementById('subcategory-area');
  area.style.display='block';
  area.innerHTML='<div class="subcategory-box"><div class="subcategory-label">⏳ लोड हो रहा है...</div></div>';

  const data=await loadJSON(id);
  const subj=SUBJECTS.find(s=>s.id===id);
  const cats=data?.categories?Object.keys(data.categories):[];

  if(cats.length){
    area.innerHTML=`
      <div class="subcategory-box">
        <div class="subcategory-label">${subj?.emoji||''} ${subj?.name||id} — भाग चुनें:</div>
        <div class="sub-chips">
          ${cats.map(c=>{
            // Check saved progress for this sub
            App.selectedSub=c;
            const prog=loadProgress();
            App.selectedSub=null;
            const resumed=prog&&prog.quizIdx>0&&prog.quizIdx<prog.questions.length;
            const badge=resumed?` <span style="font-size:10px;background:rgba(244,130,10,0.3);padding:2px 6px;border-radius:10px">${prog.quizIdx}/${prog.questions.length}</span>`:'';
            return `<button class="sub-chip" id="sub-${safeId(c)}" onclick="selectSub('${c.replace(/'/g,"\\'")}','${safeId(c)}')">${c}${badge}</button>`;
          }).join('')}
        </div>
      </div>`;
  } else {
    const dbgUrl=API_BASE+'/debug/'+id;
    area.innerHTML='<div class="subcategory-box"><div class="subcategory-label" style="color:#ff9090">⚠️ Subcategories load नहीं हुईं।<br><small style="font-size:11px">Debug: <a href="'+dbgUrl+'" target="_blank" style="color:#ffa040">'+dbgUrl+'</a></small></div></div>';
  }
  checkCanStart();
}

function selectSub(name,safeid){
  App.selectedSub=name; App.selectedState=null;
  document.querySelectorAll('.sub-chip').forEach(b=>b.classList.remove('selected'));
  const el=document.getElementById('sub-'+safeid); if(el) el.classList.add('selected');
  document.querySelectorAll('.state-chip').forEach(b=>b.classList.remove('selected'));
  checkCanStart();
}

/* ══ STATES GRID ══ */
function renderStatesGrid(){
  document.getElementById('states-grid').innerHTML=STATES.map(s=>`
    <button class="state-chip" id="state-${safeId(s)}" onclick="selectState('${s.replace(/'/g,"\\'")}','${safeId(s)}')">${s}</button>`).join('');
}

function selectState(name,safeid){
  App.selectedState=name; App.selectedSubject=null; App.selectedSub=null;
  document.querySelectorAll('.subject-card').forEach(b=>b.classList.remove('selected'));
  document.querySelectorAll('.sub-chip').forEach(b=>b.classList.remove('selected'));
  document.getElementById('subcategory-area').style.display='none';
  document.querySelectorAll('.state-chip').forEach(b=>b.classList.remove('selected'));
  document.getElementById('state-'+safeid).classList.add('selected');
  checkCanStart();
}

function checkCanStart(){
  const ready=(App.selectedSubject&&App.selectedSub)||App.selectedState;
  const btn=document.getElementById('btn-start');
  btn.disabled=!ready;
  if(ready){
    const prog=loadProgress();
    const resumed=prog&&prog.quizIdx>0&&prog.quizIdx<prog.questions.length;
    if(resumed){
      btn.textContent='▶ प्रश्न '+(prog.quizIdx+1)+' से जारी रखें';
      btn.style.background='linear-gradient(135deg,#27ae60,#1a7a40)';
    } else {
      btn.textContent='▶ क्विज़ शुरू करें';
      btn.style.background='';
    }
  }
}

/* ══ START QUIZ ══ */
async function startQuiz(){
  const btn=document.getElementById('btn-start');
  btn.textContent='⏳ लोड हो रहा है...'; btn.disabled=true;
  let all=[];

  if(App.selectedState){
    App.quizLabel=App.selectedState+' — राज्य GK'; App.quizEmoji='🗺️';
    const d=await loadJSON('states'); all=d?.states?.[App.selectedState]||[];
  } else {
    const subj=SUBJECTS.find(s=>s.id===App.selectedSubject);
    App.quizLabel=(subj?.name||App.selectedSubject)+' — '+App.selectedSub;
    App.quizEmoji=subj?.emoji||'📝';
    const d=await loadJSON(App.selectedSubject); all=d?.categories?.[App.selectedSub]||[];
  }

  if(!all.length){
    showToast('Questions load नहीं हुए। Internet check करें!','error');
    btn.textContent='▶ क्विज़ शुरू करें'; btn.disabled=false; return;
  }

  // Resume या fresh start
  const prog=loadProgress();
  const canResume=prog&&prog.quizIdx>0&&prog.quizIdx<prog.questions.length;

  if(canResume){
    App.quizQuestions=prog.questions;
    App.quizIdx=prog.quizIdx;
    App.score=prog.score;
    showToast('प्रश्न '+(prog.quizIdx+1)+' से जारी है! 🔄','success');
  } else {
    App.quizQuestions=shuffle(all);
    App.quizIdx=0; App.score=0;
    clearProgress();
  }

  App.quizStartTime=Date.now();
  document.getElementById('quiz-topic-label').textContent=App.quizLabel;
  showScreen('screen-quiz');
  renderQuestion();
}

/* ══ QUIZ ENGINE ══ */
function renderQuestion(){
  const total=App.quizQuestions.length, q=App.quizQuestions[App.quizIdx];
  const pct=((App.quizIdx+1)/total*100).toFixed(0);
  document.getElementById('quiz-counter').textContent='प्रश्न '+(App.quizIdx+1)+' / '+total;
  document.getElementById('quiz-progress-bar').style.width=pct+'%';
  const L=['A','B','C','D'];
  document.getElementById('quiz-body').innerHTML=`
    <div class="q-num">प्रश्न ${App.quizIdx+1} / ${total}</div>
    <div class="q-text">${q.q}</div>
    <div class="options-grid">
      ${q.opts.map((o,i)=>`<button class="option-btn" id="opt-${i}" onclick="selectOption(${i})"><span class="option-label">${L[i]}</span><span>${o}</span></button>`).join('')}
    </div>
    <div class="quiz-footer">
      <div class="score-live">स्कोर: <strong>${App.score}/${App.quizIdx}</strong></div>
      <div class="quiz-actions">
        <button class="btn-quit" onclick="quitAndSave()">💾 Save & बाहर</button>
        <button class="btn-next" id="btn-next" onclick="nextQuestion()">अगला →</button>
      </div>
    </div>`;
}

function selectOption(idx){
  const q=App.quizQuestions[App.quizIdx];
  document.querySelectorAll('.option-btn').forEach(b=>b.disabled=true);
  document.getElementById('opt-'+q.ans).classList.add('correct');
  if(idx!==q.ans) document.getElementById('opt-'+idx).classList.add('wrong');
  else App.score++;
  document.querySelector('.score-live strong').textContent=App.score+'/'+(App.quizIdx+1);
  saveProgress(); // हर जवाब के बाद save
  const nb=document.getElementById('btn-next');
  nb.style.display='block';
  nb.textContent=App.quizIdx+1>=App.quizQuestions.length?'परिणाम देखें ✓':'अगला →';
}

function nextQuestion(){
  App.quizIdx++;
  saveProgress();
  if(App.quizIdx>=App.quizQuestions.length){showResult(); return;}
  renderQuestion();
}

function quitAndSave(){
  showToast('💾 प्रश्न '+(App.quizIdx+1)+' तक save हो गया!','success');
  setTimeout(()=>{
    showScreen('screen-main'); switchTab('quiz');
    if(App.selectedSubject) selectSubject(App.selectedSubject);
  },1200);
}

async function showResult(){
  clearProgress(); // पूरा हो गया — progress reset
  const total=App.quizQuestions.length;
  const pct=Math.round(App.score/total*100);
  const timeTaken=Math.round((Date.now()-App.quizStartTime)/1000);
  const emoji=pct>=80?'🏆':pct>=60?'🎯':pct>=40?'📚':'💪';
  const msg=pct>=80?'शानदार प्रदर्शन!':pct>=60?'बहुत अच्छा!':pct>=40?'और मेहनत करें!':'हार मत मानो!';
  const grade=pct>=80?'A':pct>=60?'B':pct>=40?'C':'D';
  document.getElementById('quiz-body').innerHTML=`
    <div class="result-wrap"><div class="result-card">
      <span class="result-emoji">${emoji}</span>
      <div class="result-title">${msg}</div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:4px">${App.quizLabel}</div>
      <div class="result-score">${pct}%</div>
      <div class="result-sub">Grade: ${grade} &nbsp;|&nbsp; समय: ${formatTime(timeTaken)} &nbsp;|&nbsp; ${App.score}/${total} सही</div>
      <div class="result-stats">
        <div class="r-stat"><div class="r-stat-num r-correct">${App.score}</div><div class="r-stat-label">✅ सही</div></div>
        <div class="r-stat"><div class="r-stat-num r-wrong">${total-App.score}</div><div class="r-stat-label">❌ गलत</div></div>
        <div class="r-stat"><div class="r-stat-num" style="color:var(--gold)">${grade}</div><div class="r-stat-label">🎖️ Grade</div></div>
      </div>
      <div class="result-btns">
        <button class="btn-secondary" onclick="restartQuiz()">🔄 फिर से शुरू</button>
        <button class="btn-primary" style="max-width:160px;padding:12px 20px;font-size:14px" onclick="goBackHome()">🏠 होम</button>
      </div>
    </div></div>`;
  const entry={subject:App.quizLabel,score:App.score,total,percentage:pct,emoji:App.quizEmoji,date:new Date().toLocaleDateString('hi-IN'),timeTaken};
  App.historyData.unshift(entry); updateLocalHistoryStats();
  if(App.token&&!App.user?.isGuest){
    try{
      await fetch(API_BASE+'/history/save',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+App.token},
        body:JSON.stringify({subject:App.selectedSubject||'states',subCategory:App.selectedSub||'',state:App.selectedState||'',score:App.score,total,timeTaken})});
    }catch{}
  }
}

function restartQuiz(){
  clearProgress();
  App.quizIdx=0; App.score=0; App.quizStartTime=Date.now();
  App.quizQuestions=shuffle(App.quizQuestions);
  document.getElementById('quiz-body').innerHTML='';
  renderQuestion();
}

function goBackHome(){document.getElementById('quiz-body').innerHTML=''; showScreen('screen-main'); switchTab('home');}

/* ══ HISTORY ══ */
async function loadHistory(){
  if(!App.token) return;
  try{
    const r=await fetch(API_BASE+'/history',{headers:{Authorization:'Bearer '+App.token}});
    const d=await r.json();
    if(d.success){
      App.historyData=d.history.map(h=>({subject:h.subject,score:h.score,total:h.total,percentage:h.percentage,emoji:'📝',date:new Date(h.playedAt).toLocaleDateString('hi-IN'),timeTaken:h.timeTaken}));
      updateLocalHistoryStats();
    }
  }catch{}
}

function renderHistory(){
  updateLocalHistoryStats();
  const list=document.getElementById('history-list');
  if(!App.historyData.length){
    list.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-title">अभी कोई Quiz नहीं खेली</div><div class="empty-desc">Quiz सेक्शन में जाएं और शुरुआत करें!</div></div>';
    return;
  }
  list.innerHTML='<div class="history-list">'+App.historyData.map(h=>{
    const pct=h.percentage||Math.round(h.score/h.total*100);
    const cls=pct>=70?'good':pct>=40?'avg':'low';
    return '<div class="history-item"><div class="hist-icon">'+h.emoji+'</div><div class="hist-info"><div class="hist-title">'+h.subject+'</div><div class="hist-date">📅 '+h.date+(h.timeTaken?' &nbsp;⏱️ '+formatTime(h.timeTaken):'')+'</div></div><div class="hist-badge '+cls+'">'+h.score+'/'+h.total+' — '+pct+'%</div></div>';
  }).join('')+'</div>';
}

function updateLocalHistoryStats(){
  const tc=App.historyData.reduce((a,b)=>a+b.score,0);
  const tw=App.historyData.reduce((a,b)=>a+(b.total-b.score),0);
  document.getElementById('hist-total').textContent=App.historyData.length;
  document.getElementById('hist-correct').textContent=tc;
  document.getElementById('hist-wrong').textContent=tw;
}

/* ══ TOAST ══ */
function showToast(msg,type='info'){
  const icons={success:'✅',error:'❌',info:'ℹ️',warning:'⚠️'};
  const t=document.createElement('div'); t.className='toast '+type;
  t.innerHTML='<span>'+icons[type]+'</span><span>'+msg+'</span>';
  document.body.appendChild(t);
  setTimeout(()=>{t.style.animation='toastOut 0.3s ease forwards'; setTimeout(()=>t.remove(),300);},3000);
}

/* ══ UTILS ══ */
function safeId(s){return s.replace(/[^a-zA-Z0-9\u0900-\u097F]/g,'_');}
function shuffle(arr){const a=[...arr]; for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;}
function formatDate(d){try{return new Date(d).toLocaleDateString('hi-IN');}catch{return '—';}}
function formatTime(s){if(!s)return '—'; const m=Math.floor(s/60),sec=s%60; return m>0?m+'मि '+sec+'से':sec+'से';}
