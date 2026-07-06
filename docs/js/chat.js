/* VidyaSagar v4 — chat.js (FIXED) */
const ChatModule=(()=>{
  let db=null, pollInterval=null;
  let replyingTo=null;
  let chatBgUrl=localStorage.getItem('vs_chat_bg_custom')||null;

  function init(){
    try{
      if(VS_CONFIG.FIREBASE.apiKey!=='YOUR_FIREBASE_API_KEY'){
        if(!firebase.apps.length) firebase.initializeApp(VS_CONFIG.FIREBASE);
        db=firebase.firestore();
      }
    }catch(e){console.warn('Firebase:',e.message);}
    if(chatBgUrl){
      const m=document.getElementById('group-msgs');
      if(m) m.style.backgroundImage=`url(${chatBgUrl})`;
    }
    bindAIChat();
    bindGroupChatInput();
  }

  /* ── Group Chat ── */
  function openGroupChat(){
    if(!token||!userData){openAuth('login');return;}
    openSubScreen('screen-group-chat');
    loadGroupMessages();
    startPolling();
    setTimeout(()=>{
      const inp=document.getElementById('group-inp');
      if(inp&&window.innerWidth<768) inp.focus();
    },500);
  }

  function loadGroupMessages(){
    const container=document.getElementById('group-msgs');
    if(!container)return;
    if(!db){loadFromBackend(container);return;}
    const threeAgo=new Date(); threeAgo.setMonth(threeAgo.getMonth()-3);
    db.collection('group_chat')
      .where('createdAt','>',firebase.firestore.Timestamp.fromDate(threeAgo))
      .orderBy('createdAt','asc').limitToLast(60).get()
      .then(snap=>renderMsgs(container,snap.docs.map(d=>({id:d.id,...d.data()}))))
      .catch(()=>loadFromBackend(container));
  }

  async function loadFromBackend(container){
    try{
      const d=await apiFetch('/api/chat');
      renderMsgs(container,d.messages||[]);
    }catch(e){container.innerHTML=`<div style="text-align:center;padding:30px;color:var(--text3)">${e.message}</div>`;}
  }

  function renderMsgs(container,msgs){
    const atBottom=container.scrollHeight-container.scrollTop<=container.clientHeight+80;
    container.innerHTML='';
    if(!msgs.length){container.innerHTML='<div style="text-align:center;padding:40px;color:var(--text3)">पहले message भेजें! 💬</div>';return;}
    let lastDate='';
    msgs.forEach(msg=>{
      const at=msg.createdAt?.toDate?msg.createdAt.toDate():new Date(msg.createdAt);
      const ds=at.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
      if(ds!==lastDate){
        const div=document.createElement('div');div.className='chat-date-div';
        div.innerHTML=`<span>${ds}</span>`;container.appendChild(div);lastDate=ds;
      }
      container.appendChild(buildBubble(msg,at));
    });
    if(atBottom) container.scrollTop=container.scrollHeight;
    if(chatBgUrl) container.style.backgroundImage=`url(${chatBgUrl})`;
  }

  function buildBubble(msg,date){
    const myId=userData?.id||userData?._id;
    const isMe=String(msg.user||msg.userId)===String(myId);
    const time=date.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'});
    const row=document.createElement('div');
    row.className=`chat-row ${isMe?'sent':'recv'}`;
    row.dataset.text=(msg.message||msg.text||'').substring(0,80);
    row.dataset.sender=isMe?'You':(msg.userName||'User');

    const replyHtml=msg.replyTo
      ?`<div class="reply-preview">↩️ ${_e(msg.replyTo.sender)}: ${_e(msg.replyTo.text)}</div>`
      :'';

    if(isMe){
      row.innerHTML=`<div class="chat-bub">${replyHtml}<div class="chat-txt">${_e(msg.message||msg.text||'')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span><span class="chat-tks">✓✓</span></div></div>`;
    }else{
      row.innerHTML=`<div class="chat-av">${msg.userAvatar||'🎓'}</div><div class="chat-bub">${replyHtml}<span class="chat-sender">${msg.userName||'User'}</span><div class="chat-txt">${_e(msg.message||msg.text||'')}</div><div class="chat-meta-row"><span class="chat-tm">${time}</span></div></div>`;
    }

    /* Swipe to reply */
    let sx=0,sy=0;
    row.addEventListener('touchstart',e=>{sx=e.touches[0].clientX;sy=e.touches[0].clientY;},{passive:true});
    row.addEventListener('touchmove',e=>{
      const dx=e.touches[0].clientX-sx, dy=Math.abs(e.touches[0].clientY-sy);
      if(dx>20&&dy<30) row.style.transform=`translateX(${Math.min(dx*.45,55)}px)`;
    },{passive:true});
    row.addEventListener('touchend',e=>{
      const dx=e.changedTouches[0].clientX-sx;
      row.style.transform=''; row.style.transition='transform .2s ease';
      setTimeout(()=>row.style.transition='',220);
      if(dx>50) setReply({text:row.dataset.text,sender:row.dataset.sender});
    },{passive:true});

    return row;
  }

  function setReply(msg){
    replyingTo=msg;
    const bar=document.getElementById('reply-preview-bar');
    const txt=document.getElementById('reply-preview-text');
    if(bar) bar.style.display='flex';
    if(txt) txt.textContent=`${msg.sender}: ${msg.text}`;
    document.getElementById('group-inp')?.focus();
  }

  window.clearReply=function(){
    replyingTo=null;
    const bar=document.getElementById('reply-preview-bar');
    if(bar) bar.style.display='none';
  };

  let _sendingGroup = false;
  async function sendGroupMsg(){
    if(!token||!userData){openAuth('login');return;}
    if(_sendingGroup)return; // guard against double-fire from Enter + tap in quick succession
    const inp=document.getElementById('group-inp');
    const text=inp?.value.trim();
    if(!text)return;
    _sendingGroup=true;
    inp.value=''; inp.style.height='auto'; inp.disabled=false;
    const reply=replyingTo?{...replyingTo}:null;
    window.clearReply();
    try{
      if(db){
        const data={
          userId:userData.id||userData._id,
          user:userData.id||userData._id,
          userName:userData.name,
          userAvatar:userData.avatar||'🎓',
          text,message:text,
          createdAt:firebase.firestore.FieldValue.serverTimestamp()
        };
        if(reply) data.replyTo=reply;
        await db.collection('group_chat').add(data);
      }else{
        await apiFetch('/api/chat',{method:'POST',body:JSON.stringify({message:text})});
      }
      loadGroupMessages();
    }catch(e){
      showToast('Message नहीं गया: '+e.message,'error');
      // Only restore the failed text if the box is still empty — the user may already
      // be typing their next message, and we don't want to overwrite that.
      if(inp && !inp.value) inp.value=text;
    }finally{
      _sendingGroup=false;
      if(inp){ inp.disabled=false; inp.focus(); }
    }
  }

  function startPolling(){stopPolling();pollInterval=setInterval(loadGroupMessages,5000);}
  function stopPolling(){clearInterval(pollInterval);pollInterval=null;}

  /* ── Group Chat Input ── */
  function bindGroupChatInput(){
    const sendBtn=document.getElementById('group-send-btn');
    const inp=document.getElementById('group-inp');
    const wrap=document.getElementById('group-inp-box');
    if(!inp||!sendBtn)return;

    inp.addEventListener('input',()=>{
      inp.style.height='auto';
      inp.style.height=Math.min(inp.scrollHeight,120)+'px';
    });
    inp.addEventListener('keydown',e=>{
      if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendGroupMsg();}
    });
    sendBtn.addEventListener('click',sendGroupMsg);

    /* Swipe right on input box = send */
    let tx=0,ty=0;
    if(wrap){
      wrap.addEventListener('touchstart',e=>{tx=e.touches[0].clientX;ty=e.touches[0].clientY;},{passive:true});
      wrap.addEventListener('touchmove',e=>{
        const dx=e.touches[0].clientX-tx,dy=Math.abs(e.touches[0].clientY-ty);
        if(dx>22&&dy<30){wrap.classList.add('swipe-ready');sendBtn.classList.add('ready');}
        else{wrap.classList.remove('swipe-ready');sendBtn.classList.remove('ready');}
      },{passive:true});
      wrap.addEventListener('touchend',e=>{
        const dx=e.changedTouches[0].clientX-tx,dy=Math.abs(e.changedTouches[0].clientY-ty);
        wrap.classList.remove('swipe-ready');sendBtn.classList.remove('ready');
        if(dx>60&&dy<40){sendBtn.classList.add('sending');sendGroupMsg();setTimeout(()=>sendBtn.classList.remove('sending'),350);}
      },{passive:true});
    }
  }

  /* ── AI Chat ── */
  function bindAIChat(){
    const inp=document.getElementById('ai-inp');
    const btn=document.getElementById('ai-send-btn');
    if(!inp||!btn)return;
    inp.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();sendAIMsg();}});
    btn.addEventListener('click',sendAIMsg);
  }

  let _sendingAI = false;
  async function sendAIMsg(){
    if(!token){openAuth('login');return;}
    if(_sendingAI)return;
    const inp=document.getElementById('ai-inp');
    const text=inp?.value.trim();
    if(!text)return;
    _sendingAI=true;
    inp.value='';
    const container=document.getElementById('ai-msgs');

    const userRow=document.createElement('div');
    userRow.className='ai-msg-wrap user';
    userRow.innerHTML=`<div class="ai-bub">${_e(text)}</div>`;
    container.appendChild(userRow);
    container.scrollTop=container.scrollHeight;

    const typingRow=document.createElement('div');
    typingRow.className='ai-msg-wrap'; typingRow.id='ai-typing-ind';
    typingRow.innerHTML=`<div class="ai-av">🤖</div><div class="ai-bub" style="padding:10px 14px"><div class="ai-typing-ind"><div class="ai-td"></div><div class="ai-td"></div><div class="ai-td"></div></div></div>`;
    container.appendChild(typingRow);
    container.scrollTop=container.scrollHeight;

    try{
      const d=await apiFetch('/api/ai/chat',{method:'POST',body:JSON.stringify({message:text})});
      document.getElementById('ai-typing-ind')?.remove();
      const aiRow=document.createElement('div');
      aiRow.className='ai-msg-wrap';
      /* Bold text render karo */
      const formatted=_e(d.reply||'Sorry, could not get response.')
        .replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>');
      aiRow.innerHTML=`<div class="ai-av">🤖</div><div class="ai-bub">${formatted}</div>`;
      container.appendChild(aiRow);
      container.scrollTop=container.scrollHeight;
    }catch(e){
      document.getElementById('ai-typing-ind')?.remove();
      const errRow=document.createElement('div');
      errRow.className='ai-msg-wrap';
      errRow.innerHTML=`<div class="ai-av">🤖</div><div class="ai-bub" style="color:var(--rose)">Error: ${e.message}</div>`;
      container.appendChild(errRow);
      // Give the message back so it isn't lost if it never reached the server
      if(inp && !inp.value) inp.value=text;
    }finally{
      _sendingAI=false;
      if(inp){ inp.disabled=false; inp.focus(); }
    }
  }

  function openAIChat(){
    openSubScreen('screen-ai-chat');
    setTimeout(()=>document.getElementById('ai-inp')?.focus(),300);
  }

  function _e(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/\n/g,'<br>');
  }

  window.openAIChat=openAIChat;
  window.openGroupChat=openGroupChat;
  return{init,stopPolling};
})();
