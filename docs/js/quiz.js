/* VidyaSagar v4 — quiz.js (FIXED: result z-index + back button) */
const QuizModule = (() => {
  let currentSubject=null, currentCategory=null, currentState=null;
  let questions=[], currentQ=0, answered=false;
  let quizState={seenIds:[],score:0,wrong:0,answered:0,total:0,isLast:false,elapsed:0};
  let timerInterval=null, elapsedSeconds=0, timerStarted=false;
  let isPaused=false, prevQuestions=[], isReviewing=false;

  function progKey(){
    const sub=currentState?'states':(currentSubject?.id||'x');
    const cat=currentState||currentCategory||'all';
    return `vs_qprog_${sub}_${cat}`;
  }
  function saveProgress(){
    localStorage.setItem(progKey(),JSON.stringify({
      seenIds:quizState.seenIds,score:quizState.score,wrong:quizState.wrong,
      answered:quizState.answered,total:quizState.total,elapsed:elapsedSeconds
    }));
  }
  function loadProgress(){try{const r=localStorage.getItem(progKey());return r?JSON.parse(r):null;}catch{return null;}}
  function clearProgress(){localStorage.removeItem(progKey());}

  async function loadSubjects(){
    try{
      const res=await fetch('data/subjects.json');
      const json=await res.json();
      const grid=document.getElementById('subj-grid');
      if(!grid)return;
      grid.innerHTML='';
      json.subjects.forEach(sub=>{
        const btn=document.createElement('button');
        btn.className='subj-card';btn.style.setProperty('--c',sub.color);
        btn.innerHTML=`<span class="subj-emoji">${sub.emoji}</span><span class="subj-name">${sub.name}</span><span class="subj-count">${sub.count}</span>`;
        btn.addEventListener('click',()=>openCategory(sub));
        grid.appendChild(btn);
      });
      const cloud=document.getElementById('states-cloud');
      if(cloud){
        cloud.innerHTML='';
        json.states.forEach(state=>{
          const btn=document.createElement('button');
          btn.className='state-chip';btn.textContent=state;
          btn.addEventListener('click',()=>startStateQuiz(state));
          cloud.appendChild(btn);
        });
      }
    }catch(e){console.error('loadSubjects:',e);}
  }

  async function openCategory(sub){
    currentSubject=sub;currentCategory=null;currentState=null;
    document.getElementById('cat-screen-title').textContent=`${sub.emoji} ${sub.name}`;
    openSubScreen('screen-quiz-category');
    const wrap=document.getElementById('cat-list-wrap');
    wrap.innerHTML='<div class="vs-loading-text">Loading…</div>';
    const prog=loadProgress();
    const resumeCard=document.getElementById('resume-card');
    if(prog&&prog.answered>0&&prog.answered<(prog.total||999)){
      const pct=prog.total>0?Math.round((prog.score/prog.answered)*100):0;
      document.getElementById('resume-stats').textContent=`${prog.answered} done · ${prog.score} correct · ${pct}%`;
      resumeCard.classList.remove('hidden');
      document.getElementById('btn-resume').onclick=()=>resumeQuiz(prog);
      document.getElementById('btn-qrestart').onclick=()=>{clearProgress();startQuiz(false);};
    }else{resumeCard.classList.add('hidden');}
    document.getElementById('btn-all-cat').onclick=()=>{currentCategory=null;startQuiz();};
    try{
      const d=await apiFetch(`/quiz/${sub.id}/categories`);
      const cats=d.categories||[];wrap.innerHTML='';
      cats.forEach(cat=>{
        const row=document.createElement('div');row.className='cat-row';
        row.innerHTML=`<span>${cat}</span><span class="cat-arrow">›</span>`;
        row.addEventListener('click',()=>{currentCategory=cat;startQuiz();});
        wrap.appendChild(row);
      });
      if(!cats.length)wrap.innerHTML='<div class="vs-empty">No categories found</div>';
    }catch(e){wrap.innerHTML=`<div class="vs-empty">${e.message}</div>`;}
  }

  function startStateQuiz(state){
    currentState=state;currentSubject={id:'states',name:'State Exam',emoji:'🗺️'};
    currentCategory=null;startQuiz(false);
  }

  function resumeQuiz(prog){
    quizState={seenIds:prog.seenIds||[],score:prog.score||0,wrong:prog.wrong||0,
      answered:prog.answered||0,total:prog.total||0,elapsed:prog.elapsed||0,isLast:false};
    startQuiz(true);
  }

  async function startQuiz(resuming=false){
    /* ✅ FIX: Result screen band karo naye quiz se pehle */
    closeSubScreen('screen-quiz-result');
    openSubScreen('screen-quiz-active');
    questions=[];currentQ=0;elapsedSeconds=0;
    timerStarted=false;isPaused=false;prevQuestions=[];isReviewing=false;
    if(!resuming) quizState={seenIds:[],score:0,wrong:0,answered:0,total:0,isLast:false,elapsed:0};
    const pb=document.getElementById('btn-qpause');
    if(pb){pb.textContent='⏸';pb.classList.remove('paused');}
    document.getElementById('q-badge').textContent=currentState||`${currentSubject?.emoji} ${currentSubject?.name}`;
    document.getElementById('qs-correct').textContent=quizState.score;
    document.getElementById('qs-wrong').textContent=quizState.wrong;
    document.getElementById('qs-left').textContent='…';
    if(resuming)showToast(`Resuming Q${quizState.answered+1} 📖`,'info');
    await loadNextBatch();
  }

  async function fetchBatch(){
    const excl=quizState.seenIds.length?`&exclude=${quizState.seenIds.join(',')}`:'';
    if(currentState)return await apiFetch(`/quiz/states?state=${encodeURIComponent(currentState)}${excl}`);
    let url=`/quiz/${currentSubject.id}?a=1`;
    if(currentCategory)url+=`&category=${encodeURIComponent(currentCategory)}`;
    return await apiFetch(url+excl);
  }

  async function loadNextBatch(){
    document.getElementById('q-text').textContent='⏳ Loading…';
    document.getElementById('q-num').textContent='';
    document.querySelectorAll('.opt-btn').forEach(b=>{b.disabled=true;b.className='opt-btn';const s=b.querySelector('span:last-child');if(s)s.textContent='—';});
    document.getElementById('btn-q-next').classList.add('hidden');
    document.getElementById('q-explain').classList.add('hidden');
    document.getElementById('q-review-banner').style.display='none';
    try{
      const d=await fetchBatch();
      if(d.exhausted||!d.data?.length){clearProgress();showResult();return;}
      questions=d.data;currentQ=0;
      if(!quizState.total)quizState.total=(d.remaining||0)+quizState.seenIds.length+questions.length;
      quizState.isLast=d.remaining===0;
      updateProgressUI();renderQuestion();
    }catch(e){showToast('Error: '+e.message,'error');stopTimer();closeSubScreen('screen-quiz-active');}
  }

  function updateProgressUI(){
    const done=quizState.answered,total=quizState.total||'?';
    document.getElementById('q-prog').textContent=`${done+1} / ${total}`;
    const pct=quizState.total>0?(done/quizState.total)*100:0;
    document.getElementById('qtrack-fill').style.width=pct+'%';
    document.getElementById('qs-left').textContent=quizState.total-done;
  }

  function renderQuestion(){
    isReviewing=false;
    document.getElementById('q-review-banner').style.display='none';
    document.getElementById('btn-q-next').textContent='Next →';
    if(currentQ>=questions.length){
      if(quizState.isLast){clearProgress();showResult();}
      else loadNextBatch();
      return;
    }
    if(!timerStarted){startTimer();timerStarted=true;}
    answered=false;
    const q=questions[currentQ];
    document.getElementById('q-num').textContent=`Q${quizState.answered+1}`;
    document.getElementById('q-text').textContent=q.q||q.question;
    updateProgressUI();
    const opts=q.opts||q.options||[];
    document.querySelectorAll('.opt-btn').forEach((btn,i)=>{
      btn.className='opt-btn';btn.disabled=false;
      btn.querySelector('span:last-child').textContent=opts[i]??'';
      btn.style.display=opts[i]!==undefined?'':'none';
    });
    document.getElementById('btn-q-next').classList.add('hidden');
    document.getElementById('q-explain').classList.add('hidden');
    document.getElementById('btn-q-prev').disabled=prevQuestions.length===0;
    const ov=document.getElementById('pause-ov');if(ov)ov.style.display='none';
  }

  function showPrevQuestion(){
    if(!prevQuestions.length){showToast('कोई पिछला प्रश्न नहीं','info');return;}
    if(isPaused)return;
    const entry=prevQuestions[prevQuestions.length-1];
    isReviewing=true;
    document.getElementById('q-review-banner').style.display='block';
    document.getElementById('q-num').textContent=`Q${entry.qNum} — Review`;
    document.getElementById('q-text').textContent=entry.q.q||entry.q.question;
    const opts=entry.q.opts||entry.q.options||[];
    document.querySelectorAll('.opt-btn').forEach((btn,i)=>{
      btn.className='opt-btn';btn.disabled=true;
      btn.querySelector('span:last-child').textContent=opts[i]??'';
      btn.style.display=opts[i]!==undefined?'':'none';
      if(i===entry.correct)btn.classList.add('correct');
      if(i===entry.chosen&&entry.chosen!==entry.correct)btn.classList.add('wrong');
    });
    if(entry.q.description?.trim()){
      document.getElementById('explain-text').textContent=entry.q.description;
      document.getElementById('q-explain').classList.remove('hidden');
    }
    const nb=document.getElementById('btn-q-next');
    nb.textContent='↩ Back';nb.classList.remove('hidden');
    document.getElementById('btn-q-prev').disabled=true;
  }

  function handleAnswer(idx){
    if(answered||isReviewing)return;
    answered=true;
    const q=questions[currentQ];
    const correct=q.ans!==undefined?q.ans:Number(q.answer);
    document.querySelectorAll('.opt-btn').forEach((btn,i)=>{
      btn.disabled=true;
      if(i===correct)btn.classList.add('correct');
      if(i===idx&&idx!==correct)btn.classList.add('wrong');
    });
    if(idx===correct){quizState.score++;document.getElementById('qs-correct').textContent=quizState.score;}
    else{quizState.wrong++;document.getElementById('qs-wrong').textContent=quizState.wrong;}
    if(q.id)quizState.seenIds.push(q.id);
    quizState.answered++;
    prevQuestions.push({q,chosen:idx,correct,qNum:quizState.answered});
    saveProgress();
    if(q.description?.trim()){
      document.getElementById('explain-text').textContent=q.description;
      document.getElementById('q-explain').classList.remove('hidden');
    }
    document.getElementById('btn-q-next').textContent='Next →';
    document.getElementById('btn-q-next').classList.remove('hidden');
    document.getElementById('btn-q-prev').disabled=false;
  }

  function startTimer(){
    stopTimer();
    elapsedSeconds=quizState.elapsed||0;
    updateTimerUI();
    timerInterval=setInterval(()=>{if(!isPaused){elapsedSeconds++;updateTimerUI();saveProgress();}},1000);
  }
  function stopTimer(){clearInterval(timerInterval);timerInterval=null;}
  function updateTimerUI(){
    const m=String(Math.floor(elapsedSeconds/60)).padStart(2,'0');
    const s=String(elapsedSeconds%60).padStart(2,'0');
    document.getElementById('q-timer').textContent=`${m}:${s}`;
  }

  function togglePause(){
    isPaused=!isPaused;
    const btn=document.getElementById('btn-qpause');
    const card=document.getElementById('q-card');
    if(isPaused){
      btn.textContent='▶';btn.classList.add('paused');
      let ov=document.getElementById('pause-ov');
      if(!ov){ov=document.createElement('div');ov.id='pause-ov';ov.style.cssText='position:absolute;inset:0;background:rgba(0,0,0,.7);border-radius:20px;display:flex;align-items:center;justify-content:center;z-index:5;font-size:3rem';ov.textContent='⏸';card.appendChild(ov);}
      ov.style.display='flex';
      document.querySelectorAll('.opt-btn').forEach(b=>b.disabled=true);
    }else{
      btn.textContent='⏸';btn.classList.remove('paused');
      const ov=document.getElementById('pause-ov');if(ov)ov.style.display='none';
      if(!answered)document.querySelectorAll('.opt-btn').forEach(b=>b.disabled=false);
    }
  }

  /* ✅ FIX: showResult — quiz-active pehle band karo, phir result dikhao */
  function showResult(){
    stopTimer();
    /* Close active quiz screen FIRST so result is not hidden behind it */
    closeSubScreen('screen-quiz-active');
    /* Small delay so close animation plays cleanly */
    setTimeout(()=>{
      openSubScreen('screen-quiz-result');
      _renderResult();
    },120);
  }

  function _renderResult(){
    const total=quizState.answered,correct=quizState.score;
    const pct=total>0?Math.round((correct/total)*100):0;
    const emojis=['😔','💪','👍','🎉','🏆'];
    const titles=['Keep Going!','Keep Practicing!','Good Effort!','Well Done!','Outstanding!'];
    const ei=pct>=90?4:pct>=70?3:pct>=50?2:pct>=30?1:0;
    document.getElementById('result-emoji').textContent=emojis[ei];
    document.getElementById('result-title').textContent=titles[ei];
    document.getElementById('ring-pct').textContent=pct+'%';
    document.getElementById('rs-correct').textContent=correct;
    document.getElementById('rs-wrong').textContent=quizState.wrong;
    document.getElementById('rs-time').textContent=elapsedSeconds+'s';
    document.getElementById('rs-done').textContent=total;
    setTimeout(()=>{document.getElementById('ring-circle').style.strokeDashoffset=352-(pct/100)*352;},150);
    const msgEl=document.getElementById('result-save-msg');
    if(token){
      apiFetch('/api/history/save',{method:'POST',body:JSON.stringify({
        subject:currentSubject?.name||'Quiz',subCategory:currentCategory||'',state:currentState||'',
        score:quizState.score,total:quizState.answered,timeTaken:elapsedSeconds
      })}).then(()=>{if(msgEl)msgEl.textContent='✅ Result saved!';})
        .catch(()=>{if(msgEl)msgEl.textContent='⚠️ Could not save';});
    }else{if(msgEl)msgEl.textContent='💡 Sign in to save results';}
    document.getElementById('btn-change-cat').onclick=()=>{closeSubScreen('screen-quiz-result');};
  }

  /* ✅ FIX: goHomeFromResult — properly cleanup all quiz screens */
  function goHomeFromResult(){
    closeSubScreen('screen-quiz-result');
    closeSubScreen('screen-quiz-active');
    closeSubScreen('screen-quiz-category');
  }

  function init(){
    document.querySelectorAll('.opt-btn').forEach(btn=>btn.addEventListener('click',()=>handleAnswer(parseInt(btn.dataset.i))));
    document.getElementById('btn-q-next')?.addEventListener('click',()=>{
      if(isReviewing){renderQuestion();return;}
      currentQ++;renderQuestion();
    });
    document.getElementById('btn-q-prev')?.addEventListener('click',showPrevQuestion);
    document.getElementById('btn-qpause')?.addEventListener('click',togglePause);
    document.getElementById('quiz-exit')?.addEventListener('click',()=>{
      if(quizState.answered>0){saveProgress();showToast('Progress saved ✅','info');}
      stopTimer();closeSubScreen('screen-quiz-active');
    });
    document.getElementById('btn-quiz-submit')?.addEventListener('click',()=>{
      if(confirm('Submit quiz now?')){stopTimer();saveProgress();showResult();}
    });
    document.getElementById('btn-result-continue')?.addEventListener('click',()=>{
      const prog=loadProgress();
      if(prog&&prog.answered>0)resumeQuiz(prog);else startQuiz(false);
    });
    document.getElementById('btn-result-restart')?.addEventListener('click',()=>{clearProgress();startQuiz(false);});
  }

  window.goHomeFromResult=goHomeFromResult;
  return{init,loadSubjects,openCategory};
})();
