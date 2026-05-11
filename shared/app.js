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

// One animation cycle is exactly 15 seconds across every philosophy.
// Render functions receive `t` (raw ms); the philosophy computes its phase as
//   phase = (t % CYCLE_MS) / CYCLE_MS    ∈ [0,1)
// guaranteeing a perfect seamless loop. Export renders exactly one cycle
// offline at EXPORT_FPS frames per second.
window.CYCLE_MS = 15000;
window.EXPORT_FPS = 24;

// STATE — shared across philosophies
window.state={
  text: 'less is more',
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

// Export bindings.
//
// Video export is offline + frame-accurate. We don't capture the live canvas;
// we render exactly CYCLE_MS × EXPORT_FPS frames at deterministic t values
// (t_i = i × CYCLE_MS / N), encode each via WebCodecs VideoEncoder, mux into
// WebM, and trigger the download. Generation time on modern Macs is ~1–2 s
// for 360 frames at 1080p — no real-time waiting, no jitter, perfect loop.
//
// Pages call window.__bindExport(canvas, renderFrame), where renderFrame(t)
// runs one full layout + render pass at the given t. The export loop resets
// any stateful philosophy (mycelium, blend) before frame 0 so the cycle
// starts from a clean slate.

let __webmMuxerLoading = null;
function __loadWebMMuxer(){
  if(window.WebMMuxer && window.WebMMuxer.Muxer) return Promise.resolve();
  if(__webmMuxerLoading) return __webmMuxerLoading;
  __webmMuxerLoading = new Promise((resolve, reject)=>{
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/webm-muxer@5.0.3/build/webm-muxer.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load webm-muxer'));
    document.head.appendChild(s);
  });
  return __webmMuxerLoading;
}

async function __exportOfflineWebM(canvas, renderFrame, opts){
  const FPS    = (opts && opts.fps)   || window.EXPORT_FPS || 24;
  const CYCLE  = (opts && opts.cycle) || window.CYCLE_MS   || 15000;
  const TOTAL  = Math.round(FPS * CYCLE / 1000);
  const STEP_US = Math.round(1_000_000 / FPS);

  await __loadWebMMuxer();

  // Reset any stateful philosophy so frame 0 starts fresh.
  const phil = window.state && window.state.philosophy;
  if(phil){
    if('_state' in phil)     phil._state = null;
    if('_lastKey' in phil)   phil._lastKey = '';
    if('_lastCycle' in phil) phil._lastCycle = -1;
    if('_lastT' in phil)     phil._lastT = null;
    if('_t0' in phil)        phil._t0 = null;
  }

  const { Muxer, ArrayBufferTarget } = window.WebMMuxer;
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'V_VP9', width: canvas.width, height: canvas.height, frameRate: FPS },
  });

  let encoderError = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => { encoderError = e; },
  });
  encoder.configure({
    codec: 'vp09.00.10.08',
    width: canvas.width, height: canvas.height,
    bitrate: 8_000_000,
    framerate: FPS,
  });

  for(let i = 0; i < TOTAL; i++){
    if(encoderError) throw encoderError;
    const t = (i * CYCLE) / TOTAL;
    renderFrame(t);
    const frame = new VideoFrame(canvas, { timestamp: i * STEP_US, duration: STEP_US });
    encoder.encode(frame, { keyFrame: i === 0 || (i % FPS === 0) });
    frame.close();

    if(opts && typeof opts.onProgress === 'function'){
      opts.onProgress((i + 1) / TOTAL);
    }
    // Yield to UI roughly every ~half-second of video so the progress bar repaints.
    if(i % Math.max(1, Math.round(FPS/2)) === Math.max(0, Math.round(FPS/2) - 1)){
      await new Promise(r => setTimeout(r, 0));
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();
  return new Blob([target.buffer], { type: 'video/webm' });
}

window.__bindExport = function(canvas, renderFrame){
  document.getElementById('btn-save').onclick = () => {
    const a = document.createElement('a');
    const phil = (window.state.philosophy && window.state.philosophy.id) || 'form';
    a.download = `form-${phil}-${window.state.format}.png`;
    a.href = canvas.toDataURL('image/png');
    a.click();
  };

  const overlay = document.getElementById('rec-overlay');
  const bar     = document.getElementById('rec-bar');
  const label   = document.getElementById('rec-label');
  const btn     = document.getElementById('btn-record');
  let busy = false;

  btn.onclick = async function(){
    if(busy) return;
    if(typeof VideoEncoder === 'undefined' || typeof renderFrame !== 'function'){
      alert('Video export needs a browser with WebCodecs (Chrome 94+, Safari 16.4+, Firefox 130+).');
      return;
    }
    busy = true;
    btn.classList.add('rec-active');
    if(overlay) overlay.style.display = 'flex';
    if(label)   label.textContent = 'RENDERING — 15s @ 24fps';
    if(bar)     bar.style.width = '0%';
    try{
      const blob = await __exportOfflineWebM(canvas, renderFrame, {
        onProgress: (p) => { if(bar) bar.style.width = (p * 100).toFixed(1) + '%'; },
      });
      const a = document.createElement('a');
      const phil = (window.state.philosophy && window.state.philosophy.id) || 'form';
      a.download = `form-${phil}-${window.state.format}.webm`;
      a.href = URL.createObjectURL(blob);
      a.click();
    } catch(e){
      console.error(e);
      alert('Export failed: ' + (e.message || e));
    } finally {
      busy = false;
      btn.classList.remove('rec-active');
      if(overlay) overlay.style.display = 'none';
    }
  };

  // Allow Escape to bail out of the overlay (the underlying loop still finishes
  // its current frame batch, but the download is suppressed by closing overlay).
  window.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && overlay && overlay.style.display === 'flex'){
      // Visually dismiss; the async loop will complete but we hide the UI.
      overlay.style.display = 'none';
    }
  });
};

// Curated test phrases — used to QA each philosophy across length / structure / intent.
window.__PHRASES = [
  { tag:'short · imperative',  text:'go!' },
  { tag:'short · question',    text:'why?' },
  { tag:'short · contrast',    text:'less is more' },
  { tag:'short · payoff',      text:'stronger together' },
  { tag:'short · fragment',    text:'never give up' },
  { tag:'short · brand',       text:'just do it' },
  { tag:'medium · single',     text:'the future is now' },
  { tag:'medium · contrast',   text:'before sunrise. after sunset.' },
  { tag:'medium · list',       text:'breathe. listen. begin.' },
  { tag:'medium · irony',      text:'fast and slow are both wrong' },
  { tag:'medium · imperative', text:'fall in love with the process' },
  { tag:'medium · question',   text:'what would you do if you knew?' },
  { tag:'long · proverb',      text:'the best time to plant a tree was twenty years ago. the second best time is now.' },
  { tag:'long · contrast',     text:'old habits die hard. new ones are born from quiet rebellion.' },
  { tag:'long · gravity',      text:'we are stardust. we are golden. and we have got to get ourselves back to the garden.' },
  { tag:'long · sales',        text:'good design is honest. great design is invisible. perfect design has already left the room.' },
  { tag:'lyric · simple',      text:'every little thing is gonna be alright' },
  { tag:'lyric · headline',    text:'silence is louder than words' },
  { tag:'lyric · ode',         text:'i carry your heart with me. i carry it in my heart.' },
];
window.__phraseIdx = -1;

// Decode URL params into state. Used by the visual-companion comparison
// screen to render parameterised variations side by side.
window.__applyUrlParams = function(phil){
  try{
    const u = new URL(location.href);
    const q = u.searchParams;
    const text = q.get('text');
    if(text !== null){
      const ti = document.getElementById('text-input');
      if(ti){ ti.value = text; }
      window.state.text = text;
      if(window.__parse && window.__parse.basic) window.state.tree = window.__parse.basic(text);
    }
    const fmt = q.get('format');
    if(fmt && window.FORMATS[fmt]){
      window.state.format = fmt;
      document.querySelectorAll('.fmt-btn').forEach(b=>b.classList.toggle('active', b.dataset.fmt===fmt));
    }
    if(phil && phil.controls){
      phil.controls.forEach(p=>{
        const v = q.get(p.key);
        if(v === null) return;
        if(p.type === 'check') window.state.controls[p.key] = (v === '1' || v === 'true');
        else if(p.type === 'select') window.state.controls[p.key] = v;
        else window.state.controls[p.key] = parseFloat(v);
      });
    }
    if(q.get('chrome') === '0'){
      const css = document.createElement('style');
      css.textContent = '#topbar,#controlbar,#drawer,#splash{display:none !important;} main{padding:0 !important;}';
      document.head.appendChild(css);
      document.body.classList.add('chrome-on');
    }
    if(q.get('autosplash') === '1'){
      const s = document.getElementById('splash');
      if(s) s.classList.add('gone');
      document.body.classList.add('chrome-on');
    }
  }catch(e){}
};

// Inject a phrase-preset cycler row at the top of the drawer.
window.__renderPhraseDeck = function(){
  const drawer = document.getElementById('drawer');
  if(!drawer || document.getElementById('fp-phrase-deck')) return;
  const textInput = document.getElementById('text-input');

  const deck = document.createElement('div');
  deck.id = 'fp-phrase-deck';
  deck.className = 'fp-row fp-select';
  deck.innerHTML =
    '<span class="fp-lbl">PRESET</span>'+
    '<button class="fp-sel-prev" aria-label="prev">◀</button>'+
    '<span class="fp-sel-val" id="fp-deck-name">custom</span>'+
    '<button class="fp-sel-next" aria-label="next">▶</button>';
  drawer.insertBefore(deck, drawer.firstChild);

  function setPreset(i){
    window.__phraseIdx = i;
    const p = window.__PHRASES[i]; if(!p) return;
    document.getElementById('fp-deck-name').textContent = p.tag;
    if(textInput){
      textInput.value = p.text;
      textInput.dispatchEvent(new Event('input', {bubbles:true}));
    }
  }
  function cycle(dir){
    const n = window.__PHRASES.length;
    const next = (window.__phraseIdx < 0) ? (dir>0?0:n-1) : (window.__phraseIdx + dir + n) % n;
    setPreset(next);
  }
  deck.querySelector('.fp-sel-prev').onclick = ()=>cycle(-1);
  deck.querySelector('.fp-sel-next').onclick = ()=>cycle(1);

  function matchCurrent(){
    if(!textInput) return;
    const v = (textInput.value||'').trim().toLowerCase();
    const hit = window.__PHRASES.findIndex(p => p.text.toLowerCase() === v);
    if(hit >= 0){
      window.__phraseIdx = hit;
      document.getElementById('fp-deck-name').textContent = window.__PHRASES[hit].tag;
    } else {
      window.__phraseIdx = -1;
      document.getElementById('fp-deck-name').textContent = 'custom';
    }
  }
  if(textInput) textInput.addEventListener('input', matchCurrent);
  matchCurrent(); // initial sync
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

// ──────────────────────────────────────────────────────────────────────
// Drawer params + standard contract (Animate / Interactive / Randomize)
// shared across every philosophy. Supports control types: slider, check, select, button.
// ──────────────────────────────────────────────────────────────────────
window.__animEnabled = true;          // Animate boolean
window.__interactiveEnabled = false;  // Interactive boolean
window.__mouseNorm = {x:0.5, y:0.5};  // 0..1 normalized

document.addEventListener('mousemove', function(e){
  if(!window.__interactiveEnabled) return;
  window.__mouseNorm.x = e.clientX / window.innerWidth;
  window.__mouseNorm.y = e.clientY / window.innerHeight;
});

// Build the drawer with rich control types. Re-renders the entire #param-row.
window.__buildParams = function(phil, opts){
  const row = document.getElementById('param-row');
  if(!row) return;
  row.innerHTML = '';
  const state = window.state.controls;
  phil.controls.forEach((p, i)=>{
    const div = document.createElement('div');
    div.className = 'fp-row fp-' + (p.type||'slider');
    const t = p.type || 'slider';

    if(t === 'slider'){
      div.innerHTML =
        '<span class="fp-lbl">'+p.label+'</span>'+
        '<input type="range" min="'+p.min+'" max="'+p.max+'" step="'+p.step+'" value="'+state[p.key]+'">'+
        '<span class="fp-val" id="fpv'+i+'">'+p.fmt(state[p.key])+'</span>';
      row.appendChild(div);
      div.querySelector('input').oninput = function(){
        const v = parseFloat(this.value);
        state[p.key] = v;
        document.getElementById('fpv'+i).textContent = p.fmt(v);
      };
    } else if(t === 'check'){
      const checked = state[p.key];
      div.innerHTML =
        '<button class="fp-check" aria-pressed="'+checked+'">['+(checked?'×':' ')+']</button>'+
        '<span class="fp-lbl">'+p.label+'</span>';
      row.appendChild(div);
      div.querySelector('button').onclick = function(){
        state[p.key] = !state[p.key];
        this.setAttribute('aria-pressed', state[p.key]);
        this.textContent = '['+(state[p.key]?'×':' ')+']';
      };
    } else if(t === 'select'){
      div.innerHTML =
        '<span class="fp-lbl">'+p.label+'</span>'+
        '<button class="fp-sel-prev" aria-label="prev">◀</button>'+
        '<span class="fp-sel-val" id="fpv'+i+'">'+state[p.key]+'</span>'+
        '<button class="fp-sel-next" aria-label="next">▶</button>';
      row.appendChild(div);
      const cycle = (dir)=>{
        const idx = p.options.indexOf(state[p.key]);
        const n = p.options.length;
        const next = (idx + dir + n) % n;
        state[p.key] = p.options[next];
        document.getElementById('fpv'+i).textContent = state[p.key];
      };
      div.querySelector('.fp-sel-prev').onclick = ()=>cycle(-1);
      div.querySelector('.fp-sel-next').onclick = ()=>cycle(1);
    } else if(t === 'button'){
      div.innerHTML = '<button class="fp-btn">'+p.label+'</button>';
      row.appendChild(div);
      div.querySelector('button').onclick = p.onClick || (()=>{});
    }
  });

  // Standard bottom contract
  const sep = document.createElement('div');
  sep.className = 'fp-sep';
  row.appendChild(sep);

  const animRow = document.createElement('div');
  animRow.className = 'fp-row fp-check';
  animRow.innerHTML =
    '<button class="fp-check" aria-pressed="'+window.__animEnabled+'">['+(window.__animEnabled?'×':' ')+']</button>'+
    '<span class="fp-lbl">ANIMATE</span>';
  row.appendChild(animRow);
  animRow.querySelector('button').onclick = function(){
    window.__animEnabled = !window.__animEnabled;
    this.setAttribute('aria-pressed', window.__animEnabled);
    this.textContent = '['+(window.__animEnabled?'×':' ')+']';
  };

  const intRow = document.createElement('div');
  intRow.className = 'fp-row fp-check';
  intRow.innerHTML =
    '<button class="fp-check" aria-pressed="'+window.__interactiveEnabled+'">['+(window.__interactiveEnabled?'×':' ')+']</button>'+
    '<span class="fp-lbl">INTERACTIVE</span>';
  row.appendChild(intRow);
  intRow.querySelector('button').onclick = function(){
    window.__interactiveEnabled = !window.__interactiveEnabled;
    this.setAttribute('aria-pressed', window.__interactiveEnabled);
    this.textContent = '['+(window.__interactiveEnabled?'×':' ')+']';
  };

  const ranRow = document.createElement('div');
  ranRow.className = 'fp-row fp-btnrow';
  ranRow.innerHTML =
    '<button class="fp-btn" data-action="rand">[ RANDOMIZE ]<span class="fp-key">R</span></button>'+
    '<button class="fp-btn" data-action="reset">[ RESET ]<span class="fp-key">⌥R</span></button>';
  row.appendChild(ranRow);
  ranRow.querySelector('[data-action=rand]').onclick = ()=>randomize(phil);
  ranRow.querySelector('[data-action=reset]').onclick = ()=>resetParams(phil);

  function randomize(phil){
    phil.controls.forEach(p=>{
      const t = p.type||'slider';
      if(t==='slider'){
        // round to step
        const range = p.max - p.min;
        const n = Math.floor(range / p.step);
        const r = Math.floor(Math.random()*(n+1));
        state[p.key] = p.min + r * p.step;
      } else if(t==='check'){
        state[p.key] = Math.random() < 0.5;
      } else if(t==='select'){
        state[p.key] = p.options[Math.floor(Math.random()*p.options.length)];
      }
    });
    window.__buildParams(phil);
  }
  function resetParams(phil){
    Object.keys(phil.defaults).forEach(k=>{ state[k] = phil.defaults[k]; });
    window.__buildParams(phil);
  }

  // Expose for keyboard shortcuts
  window.__randomize = ()=>randomize(phil);
  window.__resetParams = ()=>resetParams(phil);
};

// Apply Interactive: mouse position drives the philosophy's interactiveKey if defined.
window.__applyInteractive = function(phil){
  if(!window.__interactiveEnabled) return;
  if(!phil || !phil.interactiveKey) return;
  const range = phil.interactiveRange;
  if(!range) return;
  const mx = window.__mouseNorm.x;
  const v = range[0] + (range[1]-range[0]) * mx;
  window.state.controls[phil.interactiveKey] = v;
};
