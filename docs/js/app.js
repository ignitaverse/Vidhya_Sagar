/* ═══════════════════════════════════════════════════════
   VidyaSagar — app.js (Premium Edition)
   Backend: https://vidhya-sagar.onrender.com
═══════════════════════════════════════════════════════ */
const API = 'https://vidhya-sagar.onrender.com';

let currentSubject  = null;
let currentCategory = null;
let currentState    = null;
let questions=[], currentQ=0, score=0, wrongCount=0;
let answered=false, timerInterval=null, elapsedSeconds=0;
let nestedStructure=null, nestedStack=[];
let token    = localStorage.getItem('vs_token') || null;
let userData = JSON.parse(localStorage.getItem('vs_user') || 'null');

/* ── HELPERS ────────────────────────────────────────── */
function showScreen(name){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  const s=document.getElementById(`screen-${name}`);
  if(s) s.classList.add('active');
  window.scrollTo(0,0);
}
function showToast(msg,type='info'){
  const t=document.getElementById('toast');
  t.textContent=msg; t.className=`toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.classList.add('hidden'),3200);
}
async function apiFetch(path,opts={}){
  const h={'Content-Type':'application/json',...(opts.headers||{})};
  if(token) h['Authorization']=`Bearer ${token}`;
  const res=await fetch(`${API}${path}`,{...opts,headers:h});
  const d=await res.json();
  if(!res.ok) throw new Error(d.message||'Server error');
  return d;
}

/* ── LOADING ────────────────────────────────────────── */
function hideLoader(){
  document.getElementById('screen-loading').classList.add('out');
  const app=document.getElementById('app');
  app.classList.remove('app-hidden');
  app.classList.add('app-visible');
}

/* ══════════════════════════════════════════════════════
   POST-SIGNUP CELEBRATION
══════════════════════════════════════════════════════ */
function showCelebration(name){
  const ov=document.getElementById('celebrate-overlay');
  ov.classList.remove('hidden');

  // Generate floating particles
  const fp=document.getElementById('float-particles');
  fp.innerHTML='';
  const colors=['#3b82f6','#a855f7','#10b981','#f59e0b','#f43f5e','#22d3ee','#fff'];
  for(let i=0;i<40;i++){
    const p=document.createElement('div');
    p.className='fp';
    const size=Math.random()*10+4;
    p.style.cssText=`
      width:${size}px;height:${size}px;
      left:${Math.random()*100}%;
      background:${colors[Math.floor(Math.random()*colors.length)]};
      animation-duration:${Math.random()*3+2}s;
      animation-delay:${Math.random()*2}s;
    `;
    fp.appendChild(p);
  }

  // Auto dismiss after 3.5s
  setTimeout(()=>{
    ov.classList.add('cel-out');
    setTimeout(()=>ov.classList.add('hidden'),600);
  },3500);
}

/* ══════════════════════════════════════════════════════
   AUTH
══════════════════════════════════════════════════════ */
function updateAuthUI(){
  const btnAuth=document.getElementById('btn-auth');
  const btnOut=document.getElementById('btn-logout');
  const chip=document.getElementById('user-chip');
  if(token&&userData){
    btnAuth.classList.add('hidden');
    btnOut.classList.remove('hidden');
    chip.classList.remove('hidden');
    document.getElementById('user-name-display').textContent=userData.name?.split(' ')[0]||'User';
    document.getElementById('user-avatar').textContent=(userData.name?.[0]||'U').toUpperCase();
  }else{
    btnAuth.classList.remove('hidden');
    btnOut.classList.add('hidden');
    chip.classList.add('hidden');
  }
}

async function doLogin(email,password){
  const btn=document.getElementById('login-btn');
  const err=document.getElementById('login-error');
  btn.textContent='Logging in…'; btn.disabled=true;
  err.classList.add('hidden');
  try{
    const d=await apiFetch('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})});
    token=d.token; userData=d.user;
    localStorage.setItem('vs_token',token);
    localStorage.setItem('vs_user',JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showToast(`Welcome back, ${userData.name}! 👋`,'success');
  }catch(e){
    err.textContent=e.message; err.classList.remove('hidden');
  }finally{
    btn.textContent='Log In'; btn.disabled=false;
  }
}

async function doSignup(name,email,password){
  const btn=document.getElementById('signup-btn');
  const err=document.getElementById('signup-error');
  btn.textContent='Creating…'; btn.disabled=true;
  err.classList.add('hidden');
  try{
    const d=await apiFetch('/api/auth/signup',{method:'POST',body:JSON.stringify({name,email,password})});
    token=d.token; userData=d.user;
    localStorage.setItem('vs_token',token);
    localStorage.setItem('vs_user',JSON.stringify(userData));
    updateAuthUI(); closeModal();
    showCelebration(name); // 🎉 PLAY CELEBRATION
    showToast(`Welcome, ${name}! 🚀`,'success');
  }catch(e){
    err.textContent=e.message; err.classList.remove('hidden');
  }finally{
    btn.textContent='🚀 Create My Account'; btn.disabled=false;
  }
}

function doLogout(){
  token=null; userData=null;
  localStorage.removeItem('vs_token');
  localStorage.removeItem('vs_user');
  updateAuthUI();
  showToast('Logged out successfully','info');
}

/* ── MODAL ── */
function openModal(tab='login'){
  const modal=document.getElementById('auth-modal');
  modal.classList.remove('hidden');
  switchTab(tab);
}
function closeModal(){
  document.getElementById('auth-modal').classList.add('hidden');
  // Reset signup scene on close
  resetSignupScene();
}
function switchTab(tab){
  document.getElementById('login-panel').classList.toggle('hidden',tab!=='login');
  document.getElementById('signup-panel').classList.toggle('hidden',tab!=='signup');
  document.getElementById('tab-login').classList.toggle('active',tab==='login');
  document.getElementById('tab-signup').classList.toggle('active',tab==='signup');
  document.getElementById('login-error').classList.add('hidden');
  document.getElementById('signup-error').classList.add('hidden');
  if(tab==='signup') initSignupScene();
}

/* ══════════════════════════════════════════════════════
   SIGNUP SCENE — Boy carries box, opens it, form appears
══════════════════════════════════════════════════════ */
let sceneInitialized=false;

function initSignupScene(){
  if(sceneInitialized) return;
  sceneInitialized=true;
  // Reset to initial state (boy walking in with box visible)
  const scene=document.getElementById('signup-scene');
  const form=document.getElementById('signup-form');
  scene.style.display='block';
  form.className='aform signup-form-hidden';
}

function resetSignupScene(){
  sceneInitialized=false;
  const scene=document.getElementById('signup-scene');
  const form=document.getElementById('signup-form');
  if(scene) scene.style.display='block';
  if(form) form.className='aform signup-form-hidden';
  // Remove box-open state
  const boxGroup=document.getElementById('box-group');
  if(boxGroup) boxGroup.classList.remove('box-lid-open');
}

function openBoxAnimation(){
  const btn=document.getElementById('open-box-btn');
  btn.disabled=true;
  btn.textContent='📭 Opening…';

  // Step 1: Box shake
  const boxG=document.getElementById('box-group');
  boxG.style.animation='boxShake 0.4s ease';
  boxG.addEventListener('animationend',()=>{
    boxG.style.animation='';

    // Step 2: Lid opens + sparkles appear
    boxG.classList.add('box-lid-open');

    // Step 3: Boy reacts (smile gets bigger, speech bubble)
    setTimeout(()=>{
      const mouth=document.getElementById('boy-mouth');
      if(mouth) mouth.setAttribute('d','M81 43 Q88 50 95 43');
    },400);

    // Step 4: Hide scene, show form
    setTimeout(()=>{
      const scene=document.getElementById('signup-scene');
      const form=document.getElementById('signup-form');

      // Fade out scene
      scene.style.transition='opacity .4s ease,transform .4s ease';
      scene.style.opacity='0';
      scene.style.transform='scale(.95)';

      setTimeout(()=>{
        scene.style.display='none';
        form.className='aform signup-form-visible';
        // Focus first input
        setTimeout(()=>document.getElementById('signup-name')?.focus(),100);
      },400);
    },900);
  },{once:true});
}

// Inject box shake keyframe dynamically
const _ks=document.createElement('style');
_ks.textContent=`
@keyframes boxShake{
  0%,100%{transform:translateX(0) rotate(0)}
  20%{transform:translateX(-4px) rotate(-2deg)}
  40%{transform:translateX(4px) rotate(2deg)}
  60%{transform:translateX(-3px) rotate(-1deg)}
  80%{transform:translateX(3px) rotate(1deg)}
}`;
document.head.appendChild(_ks);

/* ══════════════════════════════════════════════════════
   LOAD SUBJECTS
══════════════════════════════════════════════════════ */
async function loadSubjects(){
  try{
    const res=await fetch('data/subjects.json');
    const json=await res.json();
    const grid=document.getElementById('subject-grid');
    grid.innerHTML='';
    json.subjects.forEach(sub=>{
      const btn=document.createElement('button');
      btn.className='subj-card';
      btn.style.setProperty('--c',sub.color);
      btn.innerHTML=`
        <span class="subj-emoji">${sub.emoji}</span>
        <span class="subj-name">${sub.name}</span>
        <span class="subj-count">${sub.count} questions</span>
        <span class="subj-arrow">Attempt →</span>`;
      btn.addEventListener('click',()=>openCategoryScreen(sub));
      grid.appendChild(btn);
    });
    const sw=document.getElementById('states-scroll');
    sw.innerHTML='';
    json.states.forEach(state=>{
      const btn=document.createElement('button');
      btn.className='state-pill';
      btn.textContent=state;
      btn.addEventListener('click',()=>startStateQuiz(state));
      sw.appendChild(btn);
    });
  }catch(e){console.error('Subjects error:',e)}
}

/* ══════════════════════════════════════════════════════
   NESTED NAVIGATION (Computer)
══════════════════════════════════════════════════════ */
async function loadNestedStructure(){
  if(nestedStructure) return nestedStructure;
  const res=await fetch('data/computer_structure.json');
  nestedStructure=await res.json();
  return nestedStructure;
}
async function openNestedCategoryScreen(sub){
  currentSubject=sub; currentCategory=null; currentState=null; nestedStack=[];
  showScreen('category');
  document.getElementById('cat-emoji').textContent=sub.emoji;
  document.getElementById('cat-subject-name').textContent=sub.name;
  document.getElementById('cat-sub-hint').textContent='Select a category to continue';
  document.getElementById('btn-all-cat').classList.add('hidden');
  document.getElementById('level-indicator').classList.remove('hidden');
  document.getElementById('cat-grid').innerHTML='<p class="loading-text">Loading…</p>';
  try{
    const s=await loadNestedStructure();
    renderNestedLevel(s.categories,'Select Category');
  }catch(e){
    document.getElementById('cat-grid').innerHTML=`<p class="error-state">❌ ${e.message}</p>`;
  }
}
function renderNestedLevel(nodes,levelLabel){
  updateBreadcrumb();
  document.getElementById('level-label').textContent=levelLabel;
  const grid=document.getElementById('cat-grid');
  grid.innerHTML=''; grid.className='cat-list nested-grid';
  nodes.forEach(node=>{
    const isLeaf=node.books!==undefined;
    const card=document.createElement('button');
    card.className='nested-card';
    card.style.setProperty('--nc',node.color||'#3b82f6');
    const count=isLeaf?`${node.books.length} books`:`${countLeaves(node)} topics`;
    card.innerHTML=`<span class="nc-icon">${node.icon||'📂'}</span>
      <div class="nc-info"><span class="nc-name">${node.name}</span><span class="nc-count">${count}</span></div>
      <span class="nc-arrow">→</span>`;
    card.addEventListener('click',()=>{
      nestedStack.push({label:node.name,nodes});
      isLeaf ? renderBookLevel(node.books,node.name,node.icon,node.color)
              : renderNestedLevel(node.children,node.name);
    });
    grid.appendChild(card);
  });
}
function renderBookLevel(books,parentName,parentIcon,parentColor){
  updateBreadcrumb();
  document.getElementById('level-label').textContent=parentName+' — Select Book';
  const grid=document.getElementById('cat-grid');
  grid.innerHTML=''; grid.className='cat-list book-grid';
  books.forEach((book,i)=>{
    const card=document.createElement('button');
    card.className='book-card';
    card.style.setProperty('--bc',parentColor||'#3b82f6');
    card.innerHTML=`<span class="book-num">${String(i+1).padStart(2,'0')}</span>
      <div class="book-info"><span class="book-name">${book.name}</span><span class="book-cat">${book.dbCategory}</span></div>
      <span class="book-start">Start →</span>`;
    card.addEventListener('click',()=>{currentCategory=book.dbCategory;startQuiz()});
    grid.appendChild(card);
  });
}
function countLeaves(n){return n.books?n.books.length:n.children?n.children.reduce((s,c)=>s+countLeaves(c),0):0}
function updateBreadcrumb(){
  const bc=document.getElementById('breadcrumb');
  if(!nestedStack.length){bc.innerHTML='';return}
  const crumbs=[{label:currentSubject?.name||'Computer',idx:-1}];
  nestedStack.forEach((s,i)=>crumbs.push({label:s.label,idx:i}));
  bc.innerHTML=crumbs.map((c,i)=>
    i<crumbs.length-1
      ?`<button class="crumb" data-idx="${c.idx}">${c.label}</button><span class="crumb-sep">›</span>`
      :`<span class="crumb active">${c.label}</span>`
  ).join('');
  bc.querySelectorAll('.crumb[data-idx]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const idx=parseInt(btn.dataset.idx);
      if(idx===-1){nestedStack=[];loadNestedStructure().then(s=>renderNestedLevel(s.categories,'Select Category'))}
      else{const t=nestedStack[idx];nestedStack=nestedStack.slice(0,idx);renderNestedLevel(t.nodes,t.label)}
    });
  });
}

/* ══════════════════════════════════════════════════════
   CATEGORY SCREEN
══════════════════════════════════════════════════════ */
async function openCategoryScreen(sub){
  if(sub.id==='computer') return openNestedCategoryScreen(sub);
  currentSubject=sub; currentCategory=null; currentState=null; nestedStack=[];
  document.getElementById('cat-emoji').textContent=sub.emoji;
  document.getElementById('cat-subject-name').textContent=sub.name;
  document.getElementById('cat-sub-hint').textContent='Pick a category or take all questions';
  document.getElementById('breadcrumb').innerHTML='';
  document.getElementById('level-indicator').classList.add('hidden');
  document.getElementById('btn-all-cat').classList.remove('hidden');
  const grid=document.getElementById('cat-grid');
  grid.className='cat-list';
  grid.innerHTML='<p class="loading-text">Loading categories…</p>';
  showScreen('category');
  try{
    const d=await apiFetch(`/quiz/${sub.id}/categories`);
    const cats=d.categories||[];
    grid.innerHTML='';
    if(!cats.length){grid.innerHTML='<p class="empty-state">No categories found</p>';return}
    cats.forEach(cat=>{
      const btn=document.createElement('button');
      btn.className='cat-item';
      btn.innerHTML=`<span>${cat}</span><span class="cat-arrow">→</span>`;
      btn.addEventListener('click',()=>{currentCategory=cat;startQuiz()});
      grid.appendChild(btn);
    });
  }catch(e){grid.innerHTML=`<p class="error-state">❌ ${e.message}</p>`}
}

/* ══════════════════════════════════════════════════════
   QUIZ
══════════════════════════════════════════════════════ */
async function startQuiz(){
  showScreen('quiz');
  questions=[]; currentQ=0; score=0; wrongCount=0; elapsedSeconds=0;
  document.getElementById('quiz-subject-badge').textContent=currentState||`${currentSubject.emoji} ${currentSubject.name}`;
  document.getElementById('score-correct').textContent='0';
  document.getElementById('score-wrong').textContent='0';
  document.getElementById('score-left').textContent='10';
  startTimer();
  try{
    let d;
    if(currentState){
      d=await apiFetch(`/quiz/states?state=${encodeURIComponent(currentState)}`);
    }else{
      let url=`/quiz/${currentSubject.id}`;
      if(currentCategory) url+=`?category=${encodeURIComponent(currentCategory)}`;
      d=await apiFetch(url);
    }
    questions=d.data||[];
    if(!questions.length){showToast('No questions found','error');stopTimer();showScreen('home');return}
    document.getElementById('score-left').textContent=questions.length;
    renderQuestion();
  }catch(e){showToast(`Error: ${e.message}`,'error');stopTimer();showScreen('home')}
}
async function startStateQuiz(state){
  currentState=state;
  currentSubject={id:'states',name:'State Exam',emoji:'🗺️',color:'#10b981'};
  currentCategory=null;
  await startQuiz();
}
function renderQuestion(){
  if(currentQ>=questions.length){endQuiz();return}
  answered=false;
  const q=questions[currentQ];
  document.getElementById('q-number').textContent=`Q${currentQ+1}`;
  document.getElementById('q-text').textContent=q.q||q.question;
  document.getElementById('quiz-progress-text').textContent=`${currentQ+1} / ${questions.length}`;
  document.getElementById('score-left').textContent=questions.length-currentQ;
  document.getElementById('progress-bar-fill').style.width=`${(currentQ/questions.length)*100}%`;
  const opts=q.opts||q.options||[];
  document.querySelectorAll('.opt').forEach((btn,i)=>{
    btn.className='opt';
    btn.disabled=false;
    const lbl=btn.querySelector('.opt-lbl');
    lbl.className=`opt-lbl ${'la lb lc ld'.split(' ')[i]}`;
    btn.querySelector('span:last-child').textContent=opts[i]!==undefined?opts[i]:'';
    btn.style.display=opts[i]!==undefined?'':'none';
  });
  document.getElementById('btn-next').classList.add('hidden');
  const card=document.getElementById('question-card');
  card.style.animation='none'; void card.offsetWidth; card.style.animation='';
}
function handleAnswer(idx){
  if(answered) return;
  answered=true;
  const q=questions[currentQ];
  const correct=q.ans!==undefined?q.ans:Number(q.answer);
  document.querySelectorAll('.opt').forEach((btn,i)=>{
    btn.disabled=true;
    if(i===correct) btn.classList.add('correct');
    if(i===idx&&idx!==correct) btn.classList.add('wrong');
  });
  if(idx===correct){score++;document.getElementById('score-correct').textContent=score}
  else{wrongCount++;document.getElementById('score-wrong').textContent=wrongCount}
  document.getElementById('btn-next').classList.remove('hidden');
}
function startTimer(){
  stopTimer();elapsedSeconds=0;updateTimer();
  timerInterval=setInterval(()=>{elapsedSeconds++;updateTimer()},1000);
}
function stopTimer(){clearInterval(timerInterval);timerInterval=null}
function updateTimer(){
  const m=String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
  const s=String(elapsedSeconds%60).padStart(2,'0');
  document.getElementById('quiz-timer').textContent=`${m}:${s}`;
}
function endQuiz(){
  stopTimer(); showScreen('result');
  const total=questions.length;
  const pct=Math.round((score/total)*100);
  const emojis=['💪','💪','👍','🎉','🏆'];
  const titles=['Keep Practicing!','Keep Practicing!','Good Effort!','Well Done!','Outstanding!'];
  const ei=pct>=90?4:pct>=70?3:pct>=50?2:pct>=30?1:0;
  document.getElementById('result-emoji').textContent=emojis[ei];
  document.getElementById('result-title').textContent=titles[ei];
  document.getElementById('ring-pct').textContent=pct+'%';
  document.getElementById('rs-correct').textContent=score;
  document.getElementById('rs-wrong').textContent=wrongCount;
  document.getElementById('rs-time').textContent=`${elapsedSeconds}s`;
  setTimeout(()=>{document.getElementById('ring-circle').style.strokeDashoffset=352-(pct/100)*352},150);
  if(token) saveHistory();
  else document.getElementById('save-msg').textContent='💡 Sign in to save your results!';
}
async function saveHistory(){
  const el=document.getElementById('save-msg');
  try{
    await apiFetch('/api/history/save',{method:'POST',body:JSON.stringify({
      subject:currentSubject?.name||'Unknown',
      subCategory:currentCategory||'',state:currentState||'',
      score,total:questions.length,timeTaken:elapsedSeconds
    })});
    el.textContent='✅ Result saved!'; el.style.color='var(--grn)';
  }catch(e){el.textContent='⚠️ Could not save: '+e.message;el.style.color='var(--rose)'}
}

/* ══════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════ */
async function loadHistory(){
  if(!token){openModal('login');return}
  showScreen('history');
  const list=document.getElementById('history-list');
  list.innerHTML='<p class="empty-state">Loading…</p>';
  try{
    const d=await apiFetch('/api/history');
    const h=d.history||[];
    if(!h.length){list.innerHTML='<p class="empty-state">No quiz history yet. Start playing!</p>';return}
    list.innerHTML=h.map(x=>{
      const date=new Date(x.playedAt).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
      const cls=x.percentage>=70?'hp-good':x.percentage>=50?'hp-mid':'hp-low';
      const col=x.percentage>=70?'var(--grn)':x.percentage>=50?'var(--amb)':'var(--rose)';
      const subj=[x.subject,x.subCategory,x.state].filter(Boolean).join(' › ');
      return`<div class="hist-card">
        <div class="hist-top"><span class="hist-subject">${subj}</span><span class="hist-pct ${cls}">${x.percentage}%</span></div>
        <div class="hist-bar"><div class="hist-bar-fill" style="width:${x.percentage}%;background:${col}"></div></div>
        <div class="hist-meta"><span>✅ ${x.score}/${x.total}</span><span>⏱ ${x.timeTaken}s</span><span>📅 ${date}</span></div>
      </div>`;
    }).join('');
  }catch(e){list.innerHTML=`<p class="error-state">❌ ${e.message}</p>`}
}

/* ══════════════════════════════════════════════════════
   BIND EVENTS
══════════════════════════════════════════════════════ */
function bindEvents(){
  document.getElementById('btn-auth').addEventListener('click',()=>openModal('login'));
  document.getElementById('btn-logout').addEventListener('click',doLogout);
  document.getElementById('btn-history').addEventListener('click',loadHistory);
  document.getElementById('modal-close').addEventListener('click',closeModal);
  document.getElementById('auth-modal').addEventListener('click',e=>{if(e.target.id==='auth-modal')closeModal()});
  document.getElementById('tab-login').addEventListener('click',()=>switchTab('login'));
  document.getElementById('tab-signup').addEventListener('click',()=>switchTab('signup'));
  document.getElementById('login-form').addEventListener('submit',e=>{
    e.preventDefault();
    doLogin(document.getElementById('login-email').value.trim(),document.getElementById('login-password').value);
  });
  document.getElementById('signup-form').addEventListener('submit',e=>{
    e.preventDefault();
    doSignup(document.getElementById('signup-name').value.trim(),
             document.getElementById('signup-email').value.trim(),
             document.getElementById('signup-password').value);
  });
  document.getElementById('open-box-btn').addEventListener('click',openBoxAnimation);
  document.querySelectorAll('.opt').forEach(btn=>{
    btn.addEventListener('click',()=>handleAnswer(parseInt(btn.dataset.idx)));
  });
  document.getElementById('btn-next').addEventListener('click',()=>{currentQ++;renderQuestion()});
  document.getElementById('cat-back').addEventListener('click',()=>{
    if(nestedStack.length>0){
      const prev=nestedStack.pop();
      renderNestedLevel(prev.nodes,prev.label);
    }else{currentState=null;nestedStack=[];showScreen('home')}
  });
  document.getElementById('quiz-back').addEventListener('click',()=>{stopTimer();currentState=null;showScreen('home')});
  document.getElementById('hist-back').addEventListener('click',()=>showScreen('home'));
  document.getElementById('btn-retry').addEventListener('click',()=>{currentQ=0;startQuiz()});
  document.getElementById('btn-home-from-result').addEventListener('click',()=>{currentState=null;showScreen('home')});
  document.getElementById('btn-all-cat').addEventListener('click',()=>{currentCategory=null;startQuiz()});
}

/* ══════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════ */
async function init(){
  bindEvents();
  updateAuthUI();
  if(token){
    try{
      const me=await apiFetch('/api/auth/me');
      userData=me.user;
      localStorage.setItem('vs_user',JSON.stringify(userData));
      updateAuthUI();
    }catch{
      token=null;userData=null;
      localStorage.removeItem('vs_token');
      localStorage.removeItem('vs_user');
      updateAuthUI();
    }
  }
  await loadSubjects();
  await new Promise(r=>setTimeout(r,1800));
  hideLoader();
  // After app visible — load stats, feedback, start ping
  startGuestPing();
  loadStats();
  initFeedback();
  // Refresh stats every 60s
  setInterval(loadStats, 60000);
}

document.addEventListener('DOMContentLoaded',init);

/* ══════════════════════════════════════════════════════════
   LIVE STATS TICKER
══════════════════════════════════════════════════════════ */

// Generate or retrieve a guest session ID
function getSessionId() {
  let sid = sessionStorage.getItem('vs_sid');
  if (!sid) {
    sid = 'g_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem('vs_sid', sid);
  }
  return sid;
}

// Ping server every 30s so we appear in active count (guests only)
function startGuestPing() {
  if (token) return; // logged-in users don't need ping
  const sid = getSessionId();
  const ping = () => fetch(`${API}/api/stats/ping`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId: sid })
  }).catch(() => {});
  ping();
  setInterval(ping, 30000);
}

// Animate number counting up
function animateCount(el, target, suffix = '') {
  const start = 0;
  const duration = 1200;
  const startTime = performance.now();
  const update = (now) => {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(ease * target).toLocaleString('en-IN') + suffix;
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

async function loadStats() {
  try {
    const d = await apiFetch('/api/stats');
    const usersEl  = document.getElementById('stat-users');
    const guestsEl = document.getElementById('stat-guests');
    const qsEl     = document.getElementById('stat-qs');

    if (usersEl)  animateCount(usersEl,  d.totalUsers || 0);
    // Active = logged in users + guests; add small base for realism
    if (guestsEl) animateCount(guestsEl, (d.activeGuests || 0) + (d.totalUsers ? 3 : 1));
    // Simulate questions solved today (total users × avg ~12 per day)
    if (qsEl)     animateCount(qsEl, (d.totalUsers || 1) * 12 + Math.floor(Math.random() * 200));
  } catch (e) {
    ['stat-users','stat-guests','stat-qs'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }
}

/* ══════════════════════════════════════════════════════════
   FEEDBACK
══════════════════════════════════════════════════════════ */
let selectedRating = 5;

function initFeedback() {
  // Star rating buttons
  const stars = document.querySelectorAll('.star-btn');
  stars.forEach(btn => {
    btn.addEventListener('click', () => {
      selectedRating = parseInt(btn.dataset.val);
      stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
    });
    btn.addEventListener('mouseover', () => {
      const hover = parseInt(btn.dataset.val);
      stars.forEach((s, i) => s.classList.toggle('active', i < hover));
    });
    btn.addEventListener('mouseout', () => {
      stars.forEach((s, i) => s.classList.toggle('active', i < selectedRating));
    });
  });

  // Char counter
  const ta = document.getElementById('fb-msg');
  if (ta) {
    ta.addEventListener('input', () => {
      const el = document.getElementById('fb-char');
      if (el) el.textContent = ta.value.length;
    });
  }

  // Submit
  const submitBtn = document.getElementById('fb-submit');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitFeedback);
  }

  // Load existing feedback
  loadFeedback();
}

async function submitFeedback() {
  const name    = document.getElementById('fb-name')?.value.trim() || '';
  const message = document.getElementById('fb-msg')?.value.trim() || '';
  const status  = document.getElementById('fb-status');
  const btn     = document.getElementById('fb-submit');

  if (!message) {
    showFbStatus('Please write something before submitting.', 'err');
    return;
  }

  btn.textContent = 'Submitting…';
  btn.disabled = true;

  try {
    const d = await apiFetch('/api/feedback', {
      method: 'POST',
      body: JSON.stringify({ name, message, rating: selectedRating })
    });
    // Clear form
    document.getElementById('fb-name').value = '';
    document.getElementById('fb-msg').value  = '';
    document.getElementById('fb-char').textContent = '0';
    selectedRating = 5;
    document.querySelectorAll('.star-btn').forEach(s => s.classList.add('active'));
    showFbStatus('✅ Thank you! Your feedback has been submitted.', 'ok');
    // Prepend new card
    prependFeedbackCard(d.feedback);
  } catch (e) {
    showFbStatus('❌ ' + e.message, 'err');
  } finally {
    btn.textContent = 'Submit Feedback';
    btn.disabled = false;
  }
}

function showFbStatus(msg, type) {
  const el = document.getElementById('fb-status');
  if (!el) return;
  el.textContent = msg;
  el.className = `fb-status ${type}`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 4000);
}

async function loadFeedback() {
  const list = document.getElementById('fb-list');
  if (!list) return;
  list.innerHTML = '<p class="empty-state">Loading reviews…</p>';
  try {
    const d = await apiFetch('/api/feedback');
    const items = d.feedback || [];
    if (!items.length) {
      list.innerHTML = '<p class="empty-state">No reviews yet — be the first! 🌟</p>';
      return;
    }
    list.innerHTML = '';
    items.forEach(fb => list.appendChild(buildFbCard(fb)));
  } catch (e) {
    list.innerHTML = '<p class="empty-state">Could not load reviews</p>';
  }
}

function prependFeedbackCard(fb) {
  const list = document.getElementById('fb-list');
  if (!list) return;
  const emptyMsg = list.querySelector('.empty-state');
  if (emptyMsg) emptyMsg.remove();
  list.prepend(buildFbCard(fb));
}

function buildFbCard(fb) {
  const card  = document.createElement('div');
  card.className = 'fb-card';
  const stars = '★'.repeat(fb.rating || 5) + '☆'.repeat(5 - (fb.rating || 5));
  const date  = new Date(fb.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const initl = (fb.name || 'A')[0].toUpperCase();
  card.innerHTML = `
    <div class="fb-card-top">
      <div class="fb-card-left">
        <div class="fb-avatar">${initl}</div>
        <div>
          <div class="fb-username">${fb.name || 'Anonymous'}</div>
          <div class="fb-date">${date}</div>
        </div>
      </div>
      <div class="fb-stars">${stars}</div>
    </div>
    <p class="fb-msg">${fb.message}</p>
  `;
  return card;
}

