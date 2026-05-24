/* VidyaSagar v4 — typing.js (FIXED: auto result + back button) */
const TypingModule = (() => {

  const EXAMS = [
    { id:'ssc-chsl',    name:'SSC CHSL (LDC/JSA)',       cat:'central', icon:'🏛️', color:'#3b82f6', speed:35,acc:90,time:600,  langs:['english','hindi'], badge:'Popular' },
    { id:'ssc-cgl',     name:'SSC CGL (Tax Assistant)',   cat:'central', icon:'🏛️', color:'#6366f1', speed:35,acc:90,time:600,  langs:['english','hindi'], badge:'Popular' },
    { id:'ssc-steno',   name:'SSC Stenographer',          cat:'central', icon:'✍️', color:'#8b5cf6', speed:80,acc:95,time:600,  langs:['english','hindi'] },
    { id:'rrb-ntpc',    name:'RRB NTPC (Clerk/Typist)',   cat:'central', icon:'🚂', color:'#f97316', speed:30,acc:85,time:600,  langs:['english','hindi'], badge:'New' },
    { id:'cpct',        name:'MP CPCT',                   cat:'central', icon:'💻', color:'#0891b2', speed:30,acc:85,time:900,  langs:['english','hindi'] },
    { id:'epfo-ssa',    name:'EPFO SSA',                  cat:'central', icon:'💼', color:'#0284c7', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'esic-udc',    name:'ESIC UDC',                  cat:'central', icon:'🏥', color:'#10b981', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'isro',        name:'ISRO Assistant/UDC',        cat:'central', icon:'🚀', color:'#f59e0b', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'fci',         name:'FCI Typist',                cat:'central', icon:'🌾', color:'#84cc16', speed:35,acc:85,time:600,  langs:['english','hindi'] },
    { id:'kvs',         name:'KVS LDC/JSA',               cat:'central', icon:'📚', color:'#ec4899', speed:25,acc:85,time:600,  langs:['english','hindi'] },
    { id:'nvs',         name:'NVS LDC/JSA',               cat:'central', icon:'📚', color:'#db2777', speed:25,acc:85,time:600,  langs:['english','hindi'] },
    { id:'ibps-rrb',    name:'IBPS RRB Office Asst',      cat:'central', icon:'🏦', color:'#2563eb', speed:30,acc:85,time:600,  langs:['english'] },
    { id:'drdo',        name:'DRDO CEPTAM',               cat:'central', icon:'🔬', color:'#7c3aed', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'nta',         name:'NTA Recruitment',           cat:'central', icon:'🎓', color:'#0ea5e9', speed:30,acc:85,time:600,  langs:['english'] },
    { id:'dda',         name:'DDA Junior Sec Asst',       cat:'central', icon:'🏙️', color:'#06b6d4', speed:30,acc:85,time:600,  langs:['english'] },
    { id:'ignou-jat',   name:'IGNOU JAT',                 cat:'central', icon:'📖', color:'#a855f7', speed:30,acc:88,time:600,  langs:['english','hindi'] },
    { id:'cabinet-sec', name:'Cabinet Secretariat LDC',   cat:'central', icon:'🏛️', color:'#64748b', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'cisf-hc',     name:'CISF Head Constable',       cat:'defence', icon:'🛡️', color:'#dc2626', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'crpf-hc',     name:'CRPF Head Constable',       cat:'defence', icon:'🛡️', color:'#b91c1c', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'bsf-hc',      name:'BSF Head Constable',        cat:'defence', icon:'🛡️', color:'#991b1b', speed:25,acc:80,time:600,  langs:['english','hindi'], badge:'New' },
    { id:'itbp-hc',     name:'ITBP Head Constable',       cat:'defence', icon:'🏔️', color:'#0891b2', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'ssb-hc',      name:'SSB Head Constable',        cat:'defence', icon:'⭐', color:'#ca8a04', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'army-clerk',  name:'Army Clerk SD/SKT',         cat:'defence', icon:'⭐', color:'#16a34a', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'delhi-police',name:'Delhi Police HC',           cat:'defence', icon:'👮', color:'#1d4ed8', speed:25,acc:80,time:600,  langs:['english','hindi'], badge:'Popular' },
    { id:'up-police',   name:'UP Police ASI Clerk',       cat:'defence', icon:'👮', color:'#1e3a8a', speed:25,acc:80,time:600,  langs:['hindi'] },
    { id:'ib-sa',       name:'IB SA/Executive',           cat:'defence', icon:'🔍', color:'#374151', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'coast-guard', name:'Coast Guard SA',            cat:'defence', icon:'⚓', color:'#0369a1', speed:25,acc:80,time:600,  langs:['english'] },
    { id:'sc-jca',      name:'Supreme Court JCA',         cat:'court',   icon:'⚖️', color:'#92400e', speed:35,acc:90,time:600,  langs:['english'], badge:'Popular' },
    { id:'ahc',         name:'Allahabad HC RO/ARO',       cat:'court',   icon:'⚖️', color:'#b45309', speed:30,acc:88,time:600,  langs:['hindi'], badge:'Popular' },
    { id:'delhi-hc',    name:'Delhi HC Clerical',         cat:'court',   icon:'⚖️', color:'#d97706', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'patna-hc',    name:'Patna HC Assistant',        cat:'court',   icon:'⚖️', color:'#92400e', speed:30,acc:88,time:600,  langs:['hindi'] },
    { id:'mp-hc',       name:'MP High Court Asst',        cat:'court',   icon:'⚖️', color:'#78350f', speed:30,acc:88,time:600,  langs:['hindi'] },
    { id:'raj-hc',      name:'Rajasthan HC Clerk',        cat:'court',   icon:'⚖️', color:'#92400e', speed:30,acc:88,time:600,  langs:['hindi','english'] },
    { id:'calc-hc',     name:'Calcutta HC PA/Typist',     cat:'court',   icon:'⚖️', color:'#9a3412', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'bombay-hc',   name:'Bombay HC Clerk',           cat:'court',   icon:'⚖️', color:'#c2410c', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'jhar-hc',     name:'Jharkhand HC Typist',       cat:'court',   icon:'⚖️', color:'#92400e', speed:30,acc:88,time:600,  langs:['hindi','english'] },
    { id:'upsssc-jr',   name:'UPSSSC Junior Asst',        cat:'state',   icon:'🗺️', color:'#059669', speed:25,acc:80,time:600,  langs:['hindi'], badge:'Popular' },
    { id:'rsmssb-ldc',  name:'RSMSSB LDC',                cat:'state',   icon:'🗺️', color:'#047857', speed:25,acc:80,time:600,  langs:['hindi'] },
    { id:'bssc',        name:'BSSC Inter Level',          cat:'state',   icon:'🗺️', color:'#065f46', speed:25,acc:80,time:600,  langs:['hindi'] },
    { id:'hssc-clerk',  name:'HSSC Clerk',                cat:'state',   icon:'🗺️', color:'#064e3b', speed:25,acc:80,time:600,  langs:['hindi'] },
    { id:'dsssb',       name:'DSSSB LDC',                 cat:'state',   icon:'🗺️', color:'#0f766e', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'uksssc',      name:'UKSSSC Junior Asst',        cat:'state',   icon:'🗺️', color:'#0d9488', speed:25,acc:80,time:600,  langs:['hindi'] },
    { id:'psssb',       name:'PSSSB Clerk (Punjab)',       cat:'state',   icon:'🗺️', color:'#0369a1', speed:25,acc:80,time:600,  langs:['english','hindi'] },
    { id:'osssc',       name:'OSSSC Junior Asst',         cat:'state',   icon:'🗺️', color:'#047857', speed:25,acc:80,time:600,  langs:['english'] },
    { id:'raj-ia',      name:'Rajasthan Informatics Asst',cat:'state',   icon:'💻', color:'#0891b2', speed:30,acc:85,time:600,  langs:['english','hindi'] },
    { id:'jkssb',       name:'JKSSB Junior Asst',         cat:'state',   icon:'🗺️', color:'#065f46', speed:25,acc:80,time:600,  langs:['english'] },
    { id:'vidhan',      name:'Vidhan Sabha/Parishad',     cat:'state',   icon:'🏛️', color:'#7c3aed', speed:30,acc:88,time:600,  langs:['hindi'] },
    { id:'wbssc',       name:'WBSSC Group C',             cat:'state',   icon:'🗺️', color:'#047857', speed:25,acc:80,time:600,  langs:['english'] },
    { id:'aai',         name:'AAI Junior Assistant',      cat:'psu',     icon:'✈️', color:'#0284c7', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'barc',        name:'BARC UDC',                  cat:'psu',     icon:'☢️', color:'#7c3aed', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'aiims',       name:'AIIMS Office Asst',         cat:'psu',     icon:'🏥', color:'#dc2626', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'iit-jr',      name:'IIT/NIT Junior Asst',       cat:'psu',     icon:'🔬', color:'#f59e0b', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'icar',        name:'ICAR IARI Assistant',       cat:'psu',     icon:'🌱', color:'#16a34a', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'nhai',        name:'NHAI Asst Manager',         cat:'psu',     icon:'🛣️', color:'#f97316', speed:35,acc:90,time:600,  langs:['english'] },
    { id:'becil',       name:'BECIL DEO',                 cat:'psu',     icon:'💾', color:'#6366f1', speed:35,acc:90,time:600,  langs:['english'] },
  ];

  let currentExam=null,currentLang='english',currentPassage=null;
  let passageChars=[],currentCharIdx=0,correctChars=0,wrongChars=0;
  let keystrokes=0,timerInterval=null,totalSeconds=0,elapsedSeconds=0;
  let timerStarted=false,typingFinished=false;
  let supabase=null,searchQuery='',activeCat='all';

  function init(){
    try{
      if(typeof window.supabase!=='undefined'&&VS_CONFIG.SUPABASE_URL.indexOf('YOUR_PROJECT')===-1)
        supabase=window.supabase.createClient(VS_CONFIG.SUPABASE_URL,VS_CONFIG.SUPABASE_KEY);
    }catch(e){console.warn('Supabase:',e.message);}

    document.querySelectorAll('.exam-cat-btn').forEach(btn=>{
      btn.addEventListener('click',()=>{
        document.querySelectorAll('.exam-cat-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');activeCat=btn.dataset.cat;renderExamGrid();
      });
    });
    const si=document.getElementById('exam-search-inp');
    if(si){si.addEventListener('input',()=>{searchQuery=si.value.trim().toLowerCase();renderExamGrid();});}

    document.getElementById('ed-langs')?.addEventListener('click',e=>{
      const btn=e.target.closest('.lang-btn');if(!btn)return;
      document.querySelectorAll('.lang-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');currentLang=btn.dataset.lang;loadPassages(currentExam);
    });

    const inp=document.getElementById('typing-inp');
    if(inp){
      inp.addEventListener('input',handleTypingInput);
      inp.addEventListener('keydown',e=>{if(e.key==='Tab')e.preventDefault();});
      inp.addEventListener('paste',e=>e.preventDefault());
    }

    document.getElementById('btn-retry-typing')?.addEventListener('click',()=>{
      /* ✅ FIX: Result band karo, phir nayi typing shuru karo */
      closeSubScreen('screen-typing-result');
      if(currentPassage)startTyping(currentPassage);
    });
  }

  function loadExams(){renderExamGrid();}

  function renderExamGrid(){
    const grid=document.getElementById('exam-grid');if(!grid)return;
    let list=EXAMS;
    if(activeCat!=='all')list=list.filter(e=>e.cat===activeCat);
    if(searchQuery)list=list.filter(e=>e.name.toLowerCase().includes(searchQuery)||e.id.includes(searchQuery)||e.cat.includes(searchQuery));
    if(!list.length){grid.innerHTML='<div class="vs-empty"><span class="ve-icon">🔍</span>No exams found</div>';return;}
    grid.innerHTML='';
    list.forEach(exam=>{
      const card=document.createElement('div');card.className='exam-card-v2';
      const langs=exam.langs.map(l=>l==='english'?'EN':'HI').join(' · ');
      const wordCount=exam.time/60*exam.speed;
      const badge=exam.badge?`<span class="exam-new-badge" style="background:${exam.badge==='New'?'#10b981':'#f59e0b'}">${exam.badge}</span>`:'';
      card.innerHTML=`
        <div class="ecv2-header" style="background:linear-gradient(135deg,${exam.color}22,${exam.color}11)">
          <div class="ecv2-icon" style="background:${exam.color}22;color:${exam.color}">${exam.icon}</div>
          ${badge}<div class="ecv2-langs">${langs}</div>
        </div>
        <div class="ecv2-body">
          <div class="ecv2-name">${exam.name}</div>
          <div class="ecv2-meta"><span>~${wordCount} words</span><span>⏱ ${exam.time/60} min</span></div>
          <div class="ecv2-footer">
            <span class="ecv2-req">⚡${exam.speed} WPM · 🎯${exam.acc}%</span>
            <button class="ecv2-start-btn" style="background:${exam.color}">Start →</button>
          </div>
        </div>`;
      card.querySelector('.ecv2-start-btn').addEventListener('click',e=>{e.stopPropagation();openExamDetail(exam);});
      card.addEventListener('click',()=>openExamDetail(exam));
      grid.appendChild(card);
    });
  }

  function openExamDetail(exam){
    currentExam=exam;currentLang=exam.langs[0]||'english';
    document.getElementById('exam-detail-title').textContent=exam.name;
    document.getElementById('ed-name').textContent=exam.name;
    document.getElementById('ed-speed').textContent=exam.speed;
    document.getElementById('ed-acc').textContent=exam.acc+'%';
    document.getElementById('ed-time').textContent=(exam.time/60)+' min';
    document.getElementById('ed-lang-tag').textContent=exam.langs.map(l=>l==='english'?'EN':'HI').join('+');
    const langsEl=document.getElementById('ed-langs');langsEl.innerHTML='';
    exam.langs.forEach((lang,i)=>{
      const btn=document.createElement('button');
      btn.className=`lang-btn${i===0?' active':''}`;
      btn.dataset.lang=lang;
      btn.textContent=lang==='english'?'🔤 English':'📖 Hindi';
      langsEl.appendChild(btn);
    });
    openSubScreen('screen-exam-detail');
    loadPassages(exam);
  }

  async function loadPassages(exam){
    const list=document.getElementById('passages-list');
    const pill=document.getElementById('passage-count-pill');
    list.innerHTML='<div class="vs-loading-text">Loading passages…</div>';
    try{
      let passages=[];
      if(supabase){
        const{data,error}=await supabase.from('typing_passages')
          .select('id,title,content,word_count,difficulty')
          .eq('exam_id',exam.id).eq('language',currentLang).eq('is_active',true).order('created_at');
        if(!error&&data?.length)passages=data;
      }
      if(!passages.length)passages=getDemoPassages(exam,currentLang);
      if(pill)pill.textContent=`${passages.length} passages`;
      list.innerHTML='';
      passages.forEach((p,i)=>{
        const words=p.word_count||p.content.split(' ').length;
        const diff=p.difficulty||(words<80?'Easy':words<120?'Medium':'Hard');
        const diffColor=diff.toLowerCase()==='easy'?'#10b981':diff.toLowerCase()==='medium'?'#f59e0b':'#f43f5e';
        const estTime=Math.ceil(words/exam.speed);
        const card=document.createElement('div');card.className='passage-card-v2';
        card.innerHTML=`
          <div class="pcv2-num">${String(i+1).padStart(2,'0')}</div>
          <div class="pcv2-info">
            <div class="pcv2-title">${p.title||`Passage ${i+1}`}</div>
            <div class="pcv2-meta">
              <span class="pcv2-tag">📝 ${words} words</span>
              <span class="pcv2-tag" style="color:${diffColor}">● ${diff}</span>
              <span class="pcv2-tag">⏱ ~${estTime} min</span>
            </div>
          </div>
          <button class="pcv2-btn" style="background:${exam.color}">Type →</button>`;
        card.querySelector('.pcv2-btn').addEventListener('click',e=>{e.stopPropagation();startTyping(p);});
        card.addEventListener('click',()=>startTyping(p));
        list.appendChild(card);
      });
      if(!passages.length)list.innerHTML='<div class="vs-empty"><span class="ve-icon">📄</span>No passages. Add in Supabase.</div>';
    }catch(e){list.innerHTML=`<div class="vs-empty">${e.message}</div>`;}
  }

  function getDemoPassages(exam,lang){
    if(lang==='hindi')return[
      {id:'h1',title:'भारत का संविधान',difficulty:'Medium',content:'भारत का संविधान विश्व का सबसे लंबा लिखित संविधान है। इसे 26 जनवरी 1950 को लागू किया गया था। डॉ. भीमराव अंबेडकर इसके प्रमुख निर्माता थे। संविधान में मौलिक अधिकार, नीति निदेशक तत्व और मौलिक कर्तव्य शामिल हैं। यह भारत को एक संप्रभु, समाजवादी, धर्मनिरपेक्ष और लोकतांत्रिक गणराज्य घोषित करता है।',word_count:72},
      {id:'h2',title:'कंप्यूटर का महत्व',difficulty:'Easy',content:'आधुनिक युग में कंप्यूटर का बहुत अधिक महत्व है। यह हमारे दैनिक जीवन का अभिन्न अंग बन गया है। शिक्षा, चिकित्सा, व्यापार और संचार के क्षेत्र में कंप्यूटर ने क्रांति ला दी है। कंप्यूटर के माध्यम से हम इंटरनेट का उपयोग करके विश्व से जुड़ सकते हैं।',word_count:60},
      {id:'h3',title:'डिजिटल इंडिया',difficulty:'Hard',content:'डिजिटल इंडिया कार्यक्रम भारत सरकार की एक प्रमुख पहल है जिसका उद्देश्य भारत को डिजिटल रूप से सशक्त समाज और ज्ञान अर्थव्यवस्था में बदलना है। इस कार्यक्रम की शुरुआत 2015 में की गई थी। इसके तीन प्रमुख क्षेत्र हैं - डिजिटल अवसंरचना, सेवाओं का डिजिटल वितरण और डिजिटल साक्षरता।',word_count:68},
    ];
    return[
      {id:'e1',title:'Introduction to Computers',difficulty:'Easy',content:'A computer is an electronic device that processes data according to a set of instructions called a program. Computers can perform arithmetic and logical operations at very high speeds. They are used in various fields such as science, medicine, education, and business. The basic components of a computer include the central processing unit, memory, and input and output devices.',word_count:62},
      {id:'e2',title:'Indian Democracy',difficulty:'Medium',content:'India is the largest democracy in the world. The Constitution of India was adopted on 26th November 1949 and came into effect on 26th January 1950. The Constitution provides for a parliamentary form of government. The President is the constitutional head of the country, while the Prime Minister is the head of the government. The Parliament consists of two houses, Lok Sabha and Rajya Sabha.',word_count:66},
      {id:'e3',title:'Digital India Initiative',difficulty:'Hard',content:'The Digital India programme is a flagship initiative of the Government of India with a vision to transform India into a digitally empowered society and knowledge economy. It was launched in 2015 with the aim of bridging the digital divide and ensuring that government services are made available to citizens electronically by improving online infrastructure and increasing Internet connectivity.',word_count:60},
    ];
  }

  function startTyping(passage){
    /* ✅ FIX: Result band karo agar open ho */
    closeSubScreen('screen-typing-result');
    currentPassage=passage;
    openSubScreen('screen-typing-active');
    document.getElementById('type-exam-title').textContent=`${currentExam.icon} ${currentExam.name}`;
    totalSeconds=currentExam.time;
    elapsedSeconds=0;correctChars=0;wrongChars=0;keystrokes=0;
    currentCharIdx=0;timerStarted=false;typingFinished=false;
    passageChars=passage.content.split('');
    const display=document.getElementById('passage-display');
    display.innerHTML='';
    passageChars.forEach((ch,i)=>{
      const span=document.createElement('span');
      span.className='pc'+(i===0?' current':' pending');
      span.dataset.i=i;span.textContent=ch;
      display.appendChild(span);
    });
    updateTypingStats();
    document.getElementById('type-timer').textContent=formatTime(totalSeconds);
    document.getElementById('type-timer').className='type-timer';
    document.getElementById('type-prog-fill').style.width='0%';
    const inp=document.getElementById('typing-inp');
    inp.value='';inp.disabled=false;inp.focus();
    document.getElementById('typing-inp-hint').textContent='यहाँ type करें — Timer tab शुरू होगा';
  }

  function handleTypingInput(){
    if(typingFinished)return;
    const inp=document.getElementById('typing-inp');
    const val=inp.value;
    if(!timerStarted){timerStarted=true;startTimer();}
    const newCount=val.length;
    if(newCount>currentCharIdx){
      for(let i=currentCharIdx;i<Math.min(newCount,passageChars.length);i++){
        const typed=val[i],expected=passageChars[i];
        const span=document.querySelector(`.pc[data-i="${i}"]`);if(!span)continue;
        keystrokes++;
        if(typed===expected){span.className='pc correct';correctChars++;}
        else{span.className='pc wrong';wrongChars++;}
        const next=document.querySelector(`.pc[data-i="${i+1}"]`);if(next)next.className='pc current';
      }
      currentCharIdx=newCount;
    }else if(newCount<currentCharIdx){
      for(let i=newCount;i<currentCharIdx;i++){
        const span=document.querySelector(`.pc[data-i="${i}"]`);if(!span)continue;
        if(span.classList.contains('wrong'))wrongChars=Math.max(0,wrongChars-1);
        else if(span.classList.contains('correct'))correctChars=Math.max(0,correctChars-1);
        span.className='pc pending';
      }
      const cur=document.querySelector(`.pc[data-i="${newCount}"]`);if(cur)cur.className='pc current';
      currentCharIdx=newCount;
    }
    updateTypingStats();
    /* ✅ FIX: Passage complete hone par auto-finish */
    if(currentCharIdx>=passageChars.length)finishTyping(false);
  }

  function startTimer(){
    clearInterval(timerInterval);
    timerInterval=setInterval(()=>{
      elapsedSeconds++;
      const rem=totalSeconds-elapsedSeconds;
      document.getElementById('type-timer').textContent=formatTime(Math.max(0,rem));
      if(rem<=30)document.getElementById('type-timer').className='type-timer warning';
      if(rem<=0)finishTyping(true);
      updateTypingStats();
    },1000);
  }

  function formatTime(s){return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');}

  function updateTypingStats(){
    const elMin=elapsedSeconds>0?elapsedSeconds/60:1/60;
    const net=Math.max(0,Math.round((correctChars/5)/elMin-(wrongChars/elMin)));
    const total=correctChars+wrongChars;
    const acc=total>0?Math.round((correctChars/total)*100):100;
    document.getElementById('tls-wpm').textContent=elapsedSeconds>0?net:0;
    document.getElementById('tls-acc').textContent=acc+'%';
    document.getElementById('tls-err').textContent=wrongChars;
    document.getElementById('tls-keys').textContent=keystrokes;
    const pct=passageChars.length>0?Math.round((currentCharIdx/passageChars.length)*100):0;
    document.getElementById('type-prog-fill').style.width=pct+'%';
  }

  function finishTyping(timedOut){
    if(typingFinished)return;
    typingFinished=true;clearInterval(timerInterval);
    const inp=document.getElementById('typing-inp');if(inp)inp.disabled=true;
    const elMin=Math.max(elapsedSeconds,1)/60;
    const net=Math.max(0,Math.round((correctChars/5)/elMin-(wrongChars/elMin)));
    const total=correctChars+wrongChars;
    const acc=total>0?Math.round((correctChars/total)*100):100;
    /* ✅ FIX: 500ms delay ke baad result dikhao — typing-active pehle close karo */
    setTimeout(()=>showTypingResult(net,acc,wrongChars,keystrokes,timedOut),500);
  }

  /* ✅ FIX: typing-active band karo pehle, phir result dikhao */
  function showTypingResult(wpm,acc,errors,keys,timedOut){
    closeSubScreen('screen-typing-active');
    setTimeout(()=>{
      openSubScreen('screen-typing-result');
      document.getElementById('tr-wpm').textContent=wpm;
      document.getElementById('tr-acc').textContent=acc+'%';
      document.getElementById('tr-err').textContent=errors;
      document.getElementById('tr-keys').textContent=keys;
      const passed=wpm>=currentExam.speed&&acc>=currentExam.acc;
      const vEl=document.getElementById('tr-verdict');
      vEl.className=`tr-verdict ${passed?'tr-pass':'tr-fail'}`;
      document.getElementById('tr-verdict-t').textContent=passed?'✅ PASS!':'❌ Not Qualified';
      document.getElementById('tr-verdict-d').textContent=passed
        ?`Excellent! ${wpm} WPM & ${acc}% accuracy — ${currentExam.name} के लिए qualified!`
        :`Required: ${currentExam.speed} WPM & ${currentExam.acc}% accuracy. आपकी: ${wpm} WPM, ${acc}%. और practice करें!`;
      const ei=wpm>=currentExam.speed*1.5?'🏆':passed?'🎉':wpm>=currentExam.speed*.8?'💪':'📖';
      document.getElementById('tr-emoji').textContent=ei;
      document.getElementById('tr-title').textContent=passed?'Excellent!':timedOut?'Time\'s Up!':'Keep Practicing!';
      const msgEl=document.getElementById('typing-save-msg');
      if(token){
        apiFetch('/api/typing/save',{method:'POST',body:JSON.stringify({
          examId:currentExam.id,examName:currentExam.name,language:currentLang,
          wpm,netWpm:wpm,accuracy:acc,errors,keystrokes:keys,timeTaken:elapsedSeconds,passed
        })}).then(()=>{if(msgEl)msgEl.textContent='✅ Result saved!';}).catch(()=>{});
      }else{if(msgEl)msgEl.textContent='💡 Sign in to save results';}
    },120);
  }

  /* ✅ FIX: exitTyping — result bhi band karo */
  function exitTyping(){
    clearInterval(timerInterval);
    typingFinished=true;
    const inp=document.getElementById('typing-inp');
    if(inp){inp.value='';inp.disabled=false;}
    closeSubScreen('screen-typing-result');
    closeSubScreen('screen-typing-active');
  }

  window.exitTyping=exitTyping;
  return{init,loadExams};
})();
