// shared/app.js — chrome shell for FORM philosophy pages
// Owns: splash, topbar, controlbar, drawer, theme, keyboard shortcuts,
// canvas sizing, render loop helpers, export. Loaded by per-philosophy pages.

'use strict';

// Theme — reads localStorage.theme (same key as toys.iamkesava.com),
// applies via data-theme attribute. Themes: default | brutalist | editorial | terminal | zen.
// Runs early to avoid flash; rebinds on storage events so other tabs stay in sync.
(function(){
  var THEMES=['default','brutalist','editorial','terminal','zen'];
  function apply(t){
    var html=document.documentElement;
    if(t==='default'||!t){ html.removeAttribute('data-theme'); }
    else{ html.setAttribute('data-theme',t); }
  }
  try{
    var saved=localStorage.getItem('theme');
    apply(THEMES.indexOf(saved)>=0?saved:'default');
  }catch(e){}
  window.addEventListener('storage',function(e){
    if(e.key==='theme')apply(e.newValue||'default');
  });
  window.__themes=THEMES;
  window.__cycleTheme=function(){
    var cur='default';
    try{ cur=localStorage.getItem('theme')||'default'; }catch(e){}
    var idx=THEMES.indexOf(cur); if(idx<0)idx=0;
    var next=THEMES[(idx+1)%THEMES.length];
    apply(next);
    try{ localStorage.setItem('theme',next); }catch(e){}
    return next;
  };
})();

// FORMATS
window.FORMATS={
  square:   {w:1080,h:1080, label:'1:1'},
  portrait: {w:1080,h:1350, label:'4:5'},
  landscape:{w:1200,h:628,  label:'1.91:1'},
};

// STATE — shared across philosophies
window.state={
  text: 'LESS. BETTER.',
  format: 'square',
  tree: null,
  philosophy: null,
  controls: {},
};

// Splash dismiss / replay (session-persisted)
(function(){
  const splash=document.getElementById('splash');
  if(!splash)return;
  const KEY='form-splash-dismissed';
  let dismissed=false;
  try{ if(sessionStorage.getItem(KEY)==='1')dismissed=true; }catch(e){}

  function dismiss(){
    if(dismissed)return;
    dismissed=true;
    splash.classList.add('gone');
    document.body.classList.add('chrome-on');
    const cb=document.getElementById('controlbar');
    if(cb)cb.classList.add('show');
    try{ sessionStorage.setItem(KEY,'1'); }catch(e){}
  }
  function open(){
    dismissed=false;
    splash.classList.remove('gone');
    document.body.classList.remove('chrome-on');
    const cb=document.getElementById('controlbar');
    if(cb)cb.classList.remove('show');
    try{ sessionStorage.removeItem(KEY); }catch(e){}
  }

  // If already dismissed this session, hide splash immediately and show chrome
  if(dismissed){
    splash.classList.add('gone');
    document.body.classList.add('chrome-on');
    const cb=document.getElementById('controlbar');
    if(cb)cb.classList.add('show');
  }

  splash.addEventListener('click',dismiss);
  document.addEventListener('keydown',(e)=>{
    if(!dismissed){
      if(['Shift','Control','Alt','Meta','CapsLock','Tab'].includes(e.key))return;
      e.preventDefault();
      dismiss();
    }else if(e.key==='?'||(e.key==='/'&&e.shiftKey)){
      e.preventDefault();
      open();
    }else if(e.key==='Escape'){
      if(window.__drawer)window.__drawer.close();
    }
  });
  splash.tabIndex=-1;
  splash.addEventListener('keydown',(e)=>{ if(e.key==='Tab')e.preventDefault(); });
  if(!dismissed)splash.focus({preventScroll:true});
  window.__splash={open,dismiss};
})();

// Theme cycle button + help button
(function(){
  const btn=document.getElementById('btn-theme');
  if(btn){
    // Render the current theme glyph inside the button for visual feedback
    const GLYPHS={default:'○',brutalist:'■',editorial:'¶',terminal:'>',zen:'◯'};
    const span=document.createElement('span');
    span.className='tb-theme-glyph';
    function refresh(){
      let cur='default';
      try{ cur=localStorage.getItem('theme')||'default'; }catch(e){}
      if(!GLYPHS[cur])cur='default';
      span.textContent=GLYPHS[cur];
      btn.setAttribute('aria-label','Theme: '+cur+' (T to cycle)');
      btn.setAttribute('title','Theme: '+cur);
    }
    // Replace btn children with our glyph + kbd hint
    btn.innerHTML='';
    btn.appendChild(span);
    const kbd=document.createElement('span');
    kbd.className='kbk'; kbd.textContent='T';
    btn.appendChild(kbd);
    refresh();
    btn.onclick=()=>{ window.__cycleTheme(); refresh(); };
    window.addEventListener('storage',(e)=>{ if(e.key==='theme')refresh(); });
  }
  const help=document.getElementById('btn-help');
  if(help)help.onclick=()=>window.__splash&&window.__splash.open();
})();

// Drawer
(function(){
  const drawer=document.getElementById('drawer');
  if(!drawer)return;
  const btn=document.getElementById('btn-drawer');
  function toggle(){drawer.classList.toggle('open');}
  function close(){drawer.classList.remove('open');}
  function openIt(){drawer.classList.add('open');}
  if(btn)btn.onclick=toggle;
  document.addEventListener('click',(e)=>{
    if(!drawer.classList.contains('open'))return;
    if(drawer.contains(e.target))return;
    if(btn&&btn.contains(e.target))return;
    close();
  });
  window.__drawer={open:openIt,close,toggle};
})();

// Reduced motion
(function(){
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
  function apply(){window.__motionPaused=mq.matches;}
  if(mq.addEventListener)mq.addEventListener('change',apply);
  else if(mq.addListener)mq.addListener(apply);
  apply();
})();

// Canvas helper
window.__canvasReady=function(){
  const canvas=document.getElementById('canvas');
  const wrap=document.getElementById('canvas-wrap');
  if(!canvas||!wrap)return null;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  function size(){
    const fmt=window.FORMATS[window.state.format];
    const mw=wrap.clientWidth-24, mh=wrap.clientHeight-24;
    const scale=Math.min(mw/fmt.w,mh/fmt.h,1);
    canvas.width=fmt.w; canvas.height=fmt.h;
    canvas.style.width=Math.round(fmt.w*scale)+'px';
    canvas.style.height=Math.round(fmt.h*scale)+'px';
  }
  size();
  window.addEventListener('resize',size);
  return {canvas,ctx,size};
};

// Keyboard shortcuts binding
window.__bindShortcuts=function(opts){
  const {onNext, onJump, textInput} = opts;
  document.addEventListener('keydown',(e)=>{
    if(document.activeElement===textInput)return;
    if(['Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;
    if(!document.body.classList.contains('chrome-on'))return;
    const k=e.key;
    if(k==='Tab'){ e.preventDefault(); onNext(e.shiftKey?-1:1); }
    else if(k>='1'&&k<='9'){ const idx=parseInt(k,10)-1; onJump(idx); }
    else if(k===' '){ e.preventDefault(); window.__motionPaused=!window.__motionPaused; }
    else if(k==='/'){
      e.preventDefault();
      if(window.__drawer)window.__drawer.open();
      if(textInput)setTimeout(()=>textInput.focus(),360);
    }
    else if(k==='t'||k==='T'){ document.getElementById('btn-theme').click(); }
    else if(k==='s'||k==='S'){ document.getElementById('btn-save').click(); }
    else if(k==='r'||k==='R'){ document.getElementById('btn-record').click(); }
    else if(k==='?'){ window.__splash.open(); }
  });
};

// Export bindings
window.__bindExport=function(canvas){
  document.getElementById('btn-save').onclick=()=>{
    const a=document.createElement('a');
    const phil=(window.state.philosophy&&window.state.philosophy.id)||'form';
    a.download=`form-${phil}-${window.state.format}.png`;
    a.href=canvas.toDataURL('image/png');
    a.click();
  };
  let recording=false, mediaRec=null, chunks=[];
  const overlay=document.getElementById('rec-overlay');
  const bar=document.getElementById('rec-bar');
  const btn=document.getElementById('btn-record');
  btn.onclick=function(){
    if(recording){ mediaRec&&mediaRec.stop(); return; }
    if(typeof MediaRecorder==='undefined'){ alert('MediaRecorder not supported'); return; }
    const stream=canvas.captureStream(30);
    let mime='video/webm;codecs=vp9'; if(!MediaRecorder.isTypeSupported(mime))mime='video/webm';
    mediaRec=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8000000});
    chunks=[];
    mediaRec.ondataavailable=(e)=>{ if(e.data.size)chunks.push(e.data); };
    mediaRec.onstop=()=>{
      recording=false;
      btn.classList.remove('rec-active');
      if(overlay)overlay.style.display='none';
      const blob=new Blob(chunks,{type:mime});
      const a=document.createElement('a');
      const phil=(window.state.philosophy&&window.state.philosophy.id)||'form';
      a.download=`form-${phil}-${window.state.format}.webm`;
      a.href=URL.createObjectURL(blob);
      a.click();
    };
    mediaRec.start();
    recording=true;
    btn.classList.add('rec-active');
    if(overlay)overlay.style.display='flex';
    const t0=performance.now();
    function tick(){
      if(!recording)return;
      const el=(performance.now()-t0)/30000;
      if(bar)bar.style.width=Math.min(100,el*100)+'%';
      if(el>=1){ mediaRec.stop(); return; }
      requestAnimationFrame(tick);
    }
    tick();
  };
};

// Shared text persistence (sessionStorage)
window.__loadSharedText=function(defaultText){
  try{
    const v=sessionStorage.getItem('form-text');
    if(v!==null&&v!=='')return v;
  }catch(e){}
  return defaultText;
};
window.__saveSharedText=function(text){
  try{ sessionStorage.setItem('form-text', text||''); }catch(e){}
};
