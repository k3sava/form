# FORM — Phase 1: Multi-page Architecture + Phrase Parser + Swiss + Editorial

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `form` from a single-file toy with 9 generic effects into a multi-page typography lab. Two real design philosophies (Swiss + Editorial) shipped on their own pages, fed by a compromise.js-powered phrase parser, with a hub picker at the root. The four-element chrome (splash / topbar / controlbar / drawer) from Phase 0 carries over but is now shared across pages and rebrands per philosophy.

**Architecture:** Multi-page static site. Each page is a thin HTML shell that loads shared CSS + JS. A philosophy is a JS module exporting a uniform interface. The shell delegates layout + render to the active module. compromise.js loads on demand after the splash dismisses.

**Tech stack:** Vanilla HTML / CSS / ES modules. Canvas 2D. compromise.js (v14) lazy-loaded from a CDN. Existing Simplex noise utility retained from Phase 0. No bundler — files served as-is.

**Reference docs:**
- `docs/specs/2026-05-11-form-design.md` — full spec
- `docs/plans/2026-05-11-phase-0-chrome-rewrite.md` — Phase 0 plan (chrome elements + their CSS class names)
- Working tree: `/Users/k3sava/projects/form/`
- Live: `https://toys.iamkesava.com/form/`

---

## Pre-flight

- [ ] **Step 1: Working tree clean + dev server running**

```bash
cd /Users/k3sava/projects/form
git status --short  # expect empty
python3 -m http.server 8765 >/dev/null 2>&1 &
echo $! > /tmp/form-dev-pid
sleep 0.6
curl -sI http://localhost:8765/ | head -1  # expect 200
```

- [ ] **Step 2: Baseline screenshot (Phase 0 single-page state)**

```js
await playwright.browser_resize({ width: 1280, height: 820 });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1-baseline.png', type: 'png' });
```

Inspect: Phase 0 splash + topbar + controlbar + drawer. Save as the "before" reference.

---

## Task 1: Directory scaffold

**Files:**
- Create: `/Users/k3sava/projects/form/shared/style.css`
- Create: `/Users/k3sava/projects/form/shared/app.js`
- Create: `/Users/k3sava/projects/form/shared/parse.js`
- Create: `/Users/k3sava/projects/form/shared/philosophies/swiss.js`
- Create: `/Users/k3sava/projects/form/shared/philosophies/editorial.js`
- Create: `/Users/k3sava/projects/form/swiss/index.html`
- Create: `/Users/k3sava/projects/form/editorial/index.html`
- Leave alone (for now): `/Users/k3sava/projects/form/index.html` — will be replaced in Task 9

- [ ] **Step 1: Make directories and empty files**

```bash
cd /Users/k3sava/projects/form
mkdir -p shared/philosophies swiss editorial
touch shared/style.css shared/app.js shared/parse.js \
      shared/philosophies/swiss.js shared/philosophies/editorial.js \
      swiss/index.html editorial/index.html
ls shared/ shared/philosophies/ swiss/ editorial/
```

Expected: each path exists.

- [ ] **Step 2: Commit the empty scaffold**

```bash
cd /Users/k3sava/projects/form
unset GITHUB_TOKEN GH_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN
git add shared swiss editorial
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): scaffold multi-page directory layout"
```

---

## Task 2: Extract shared CSS into `shared/style.css`

The current `index.html` has ~80 lines of inline CSS. All of it (chrome + theme tokens + canvas + recording overlay) moves to `shared/style.css` so every page can `<link>` to it.

**Files:**
- Modify: `/Users/k3sava/projects/form/index.html` (cut CSS block)
- Modify: `/Users/k3sava/projects/form/shared/style.css` (paste CSS block, add base-path-aware fixes)

- [ ] **Step 1: Copy the entire `<style>...</style>` contents from `index.html` to `shared/style.css`**

```bash
cd /Users/k3sava/projects/form
# Extract everything between <style> and </style>
python3 -c "
import re
src=open('index.html').read()
m=re.search(r'<style>(.*?)</style>', src, re.DOTALL)
open('shared/style.css','w').write(m.group(1).strip()+'\n')
print('extracted', len(m.group(1)), 'chars')
"
```

- [ ] **Step 2: Replace the inline `<style>...</style>` in `index.html` with `<link>`**

In `index.html`, find the `<style>...</style>` block (around lines 20-63) and replace the entire block with:

```html
<link rel="stylesheet" href="shared/style.css">
```

- [ ] **Step 3: Verify the page still renders the same**

```bash
curl -sS -o /tmp/_p1t2.html http://localhost:8765/
grep -c '<style>' /tmp/_p1t2.html             # expect 0
grep -c 'href="shared/style.css"' /tmp/_p1t2.html  # expect 1
rm /tmp/_p1t2.html
# Visual: controller will screenshot
```

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1t2.png', type: 'png' });
```

Expected: identical to baseline.

- [ ] **Step 4: Commit**

```bash
git add index.html shared/style.css
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): extract shared/style.css"
```

---

## Task 3: Extract shared chrome JS into `shared/app.js`

The current `index.html` has all the chrome JS (splash dismiss, theme toggle, drawer open/close, keyboard shortcuts, reduced-motion handler, plus the canvas render loop and 9 effects). For Phase 1 we want only the chrome layer in `shared/app.js`. The 9 effects stay inline in `index.html` (the hub) for now — Task 9 will replace the hub entirely so this is transient.

**Files:**
- Create: `/Users/k3sava/projects/form/shared/app.js`
- Modify: `/Users/k3sava/projects/form/index.html`

- [ ] **Step 1: Write the shell-app contract in `shared/app.js`**

Replace the empty `shared/app.js` with:

```js
// shared/app.js — chrome shell for FORM philosophy pages
// Owns: splash, topbar, controlbar, drawer, theme, keyboard shortcuts,
// canvas sizing, render loop, export. Delegates layout + render to the
// active philosophy module loaded via window.__formMode = { id, module }.

'use strict';

// Theme — runs early to avoid flash
(function(){
  try{
    var saved=localStorage.getItem('form-theme');
    var mode=saved||(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
    if(mode==='light'){
      document.documentElement.setAttribute('data-theme','light');
      var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#f5f3ee');
    }
  }catch(e){}
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
  tree: null,           // populated by parse.js
  philosophy: null,     // populated by each page
  controls: {},         // per-philosophy slider values
};

// Splash dismiss / replay
(function(){
  const splash=document.getElementById('splash');
  if(!splash)return;
  let dismissed=false;
  function dismiss(){
    if(dismissed)return;
    dismissed=true;
    splash.classList.add('gone');
    document.body.classList.add('chrome-on');
    const cb=document.getElementById('controlbar');
    if(cb)cb.classList.add('show');
  }
  function open(){
    dismissed=false;
    splash.classList.remove('gone');
    document.body.classList.remove('chrome-on');
    const cb=document.getElementById('controlbar');
    if(cb)cb.classList.remove('show');
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
  splash.focus({preventScroll:true});
  window.__splash={open,dismiss};
})();

// Theme toggle
(function(){
  const btn=document.getElementById('btn-theme');
  if(!btn)return;
  const meta=document.querySelector('meta[name="theme-color"]');
  function apply(mode){
    if(mode==='light'){
      document.documentElement.setAttribute('data-theme','light');
      if(meta)meta.setAttribute('content','#f5f3ee');
    }else{
      document.documentElement.removeAttribute('data-theme');
      if(meta)meta.setAttribute('content','#0a0a0a');
    }
  }
  btn.onclick=()=>{
    const next=document.documentElement.getAttribute('data-theme')==='light'?'dark':'light';
    apply(next);
    try{localStorage.setItem('form-theme',next);}catch(e){}
  };
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

// Canvas sizing
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

// Keyboard shortcuts
window.__bindShortcuts=function(opts){
  const {chips, onNext, onJump, textInput} = opts;
  document.addEventListener('keydown',(e)=>{
    if(document.activeElement===textInput)return;
    if(['Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;
    if(!document.body.classList.contains('chrome-on'))return;
    const k=e.key;
    if(k==='Tab'){ e.preventDefault(); onNext(e.shiftKey?-1:1); }
    else if(k>='1'&&k<='9'){
      const idx=parseInt(k,10)-1;
      onJump(idx);
    }
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

// PNG + Video export
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
```

- [ ] **Step 2: Replace the inline chrome JS in `index.html` with a `<script src>` reference**

In `index.html`, find the existing `<script>` block (around line 79+). Delete the chrome-related JS (everything except the EFFECTS array, simplex noise, and the render loop — which are the legacy 9-effect implementation we are keeping in the hub temporarily). Add this `<script>` tag right after the opening `<script>` (or replace the whole `<script>...</script>` block):

For Phase 1 Task 3 we are NOT removing the legacy 9-effect render code from `index.html` yet — that happens in Task 9 when the hub is rebuilt. For now: keep the legacy code intact, but add `<script src="shared/app.js"></script>` IMMEDIATELY BEFORE the existing legacy `<script>` block. Then DELETE these IIFEs from the legacy script because `shared/app.js` now owns them:
- Theme toggle (entire IIFE that wires `#btn-theme`)
- Splash dismiss IIFE
- Drawer IIFE
- Reduced motion IIFE
- Keyboard shortcuts IIFE
- PNG export onclick handler
- Video export onclick handler

Keep in the legacy script:
- EFFECTS array (the 9 effects)
- Simplex noise utility (N)
- textCache + getTextPixels + bilerp + lerp
- FORMATS constant
- state object
- canvas/ctx/wrap/textInput/paramRow/styleRow lookups (rebind as needed)
- buildParams
- resetAll
- sizeCanvas
- LOOP / tick / requestAnimationFrame
- Format button onclick handlers
- Effect chip onclick handlers
- textInput input handler
- Canvas aria-label setter
- initial `buildParams()` call

The legacy code in `index.html` will continue to use the old `window.state` (which the new app.js also exposes — keep them in sync).

If conflicts emerge (e.g., `const state` already exists in legacy code), change those references to assign to `window.state` or rename to avoid collision.

- [ ] **Step 3: Verify the legacy hub page still works exactly like Phase 0**

```bash
curl -sS -o /tmp/_p1t3.html http://localhost:8765/
grep -c 'src="shared/app.js"' /tmp/_p1t3.html   # expect 1
# Confirm legacy effects still inline
grep -c "EFFECTS.push" /tmp/_p1t3.html          # expect ≥9
rm /tmp/_p1t3.html
```

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1t3.png', type: 'png' });
```

Visually: same as baseline. Click splash → topbar + controlbar should show. Click MYCELIUM chip → render switches. Theme toggle works.

If anything regresses, find the missing wiring in `shared/app.js` or in the kept legacy script.

- [ ] **Step 4: Commit**

```bash
git add index.html shared/app.js
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): extract shared/app.js (chrome behavior)

Legacy 9-effect renderer kept inline in index.html. Removed from
legacy script: theme/splash/drawer/reduced-motion/shortcuts/export
IIFEs — those are now owned by shared/app.js and will be used by
every philosophy page in subsequent tasks."
```

---

## Task 4: Phrase parser

**Files:**
- Modify: `/Users/k3sava/projects/form/shared/parse.js`

The parser uses [compromise.js](https://compromise.cool/) loaded from a CDN. The parser is lazy-loaded — the shared/parse.js exports a `parse(text) → ParseTree` function that asynchronously initializes compromise on first call. Until ready, a lightweight fallback (punctuation split + heuristic emphasis) is used.

Parse tree shape (from spec):

```js
{
  raw: "LESS. BETTER.",
  beats: [{ text: "LESS", words: ["LESS"], tokens: [{w,pos}], syllables: 1, emphasis: 0.5 }, ...],
  pattern: "parallel-2" | "single" | "list" | "freeform",
  tone:    "statement" | "question" | "exclaim" | "imperative" | "fragment",
  payoff:  1,  // beat index
  caps:    "all" | "title" | "sentence" | "mixed",
}
```

- [ ] **Step 1: Write `shared/parse.js`**

Replace the empty file with:

```js
// shared/parse.js — phrase parser for FORM
// Splits a phrase into a tree philosophies can interpret.
// compromise.js loads lazily; until then a heuristic parser fills in.

'use strict';

let nlp=null;
let nlpPromise=null;

function loadNLP(){
  if(nlp)return Promise.resolve(nlp);
  if(nlpPromise)return nlpPromise;
  nlpPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://unpkg.com/compromise@14/builds/compromise.js';
    s.onload=()=>{ nlp=window.nlp; res(nlp); };
    s.onerror=()=>rej(new Error('failed to load compromise.js'));
    document.head.appendChild(s);
  });
  return nlpPromise;
}

function countSyllables(word){
  // Heuristic — adequate for English. Real syllable count would need a dict.
  word=word.toLowerCase().replace(/[^a-z]/g,'');
  if(!word)return 0;
  if(word.length<=3)return 1;
  word=word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'');
  word=word.replace(/^y/,'');
  const m=word.match(/[aeiouy]{1,2}/g);
  return m?m.length:1;
}

function detectCaps(text){
  const letters=text.replace(/[^a-zA-Z]/g,'');
  if(!letters)return 'mixed';
  const upper=letters.replace(/[^A-Z]/g,'').length;
  if(upper===letters.length)return 'all';
  // Title-case: each word starts with a capital
  const words=text.split(/\s+/).filter(w=>/[a-zA-Z]/.test(w));
  if(words.every(w=>/^[A-Z]/.test(w)))return 'title';
  // Sentence: first letter is uppercase, rest mostly lower
  if(/^[A-Z]/.test(text)&&upper/letters.length<.3)return 'sentence';
  return 'mixed';
}

function detectTone(raw){
  const t=raw.trim();
  if(/\?$/.test(t))return 'question';
  if(/!$/.test(t))return 'exclaim';
  // Imperative: starts with a verb and no subject pronoun
  const startsWithVerb=/^(go|do|make|stop|run|find|build|come|see|look|listen|breathe|move|begin|stay|leave|wait|love|fight|seek|wake|rise|fall|push|pull|hold|let|let's|let’s|try|think|wonder|imagine|consider|notice|remember|forget|feel|reach|trust|believe)\b/i.test(t);
  if(startsWithVerb)return 'imperative';
  // Has a period at end? statement. Has multiple periods but no other punctuation? list.
  if(/\.$/.test(t))return 'statement';
  return 'fragment';
}

function beatify(text){
  // Split on . , ; : ! ? — preserve trimmed beats only
  const parts=text.split(/[.,;:!?]\s*/).map(s=>s.trim()).filter(Boolean);
  return parts;
}

function buildBeat(text){
  const words=text.split(/\s+/).filter(Boolean);
  const syllables=words.reduce((s,w)=>s+countSyllables(w),0);
  return {
    text, words,
    tokens: words.map(w=>({w,pos:null})),  // POS filled in if compromise loaded
    syllables,
    emphasis: 0.5, // assigned after we know all beats
  };
}

function detectPattern(beats){
  if(beats.length<=1)return 'single';
  const lens=beats.map(b=>b.words.length);
  const max=Math.max(...lens), min=Math.min(...lens);
  if(max-min<=1)return `parallel-${beats.length}`;
  if(beats.length>=3&&lens.every(l=>l<=3))return 'list';
  return 'freeform';
}

function assignEmphasis(beats, pattern){
  if(beats.length===1){ beats[0].emphasis=0.9; return; }
  // Default: last beat is payoff
  beats.forEach((b,i)=>{ b.emphasis=0.4+0.1*i/beats.length; });
  beats[beats.length-1].emphasis=0.95;
  // ALL-CAPS-in-title overrides
  beats.forEach(b=>{
    const allCaps=b.words.filter(w=>/^[A-Z]{2,}$/.test(w));
    if(allCaps.length===b.words.length)return; // already all-caps; nothing to override
    if(allCaps.length>0)b.emphasis=Math.max(b.emphasis, 0.9);
  });
}

function basicParse(text){
  const raw=text;
  const beatTexts=beatify(text);
  const beats=beatTexts.map(buildBeat);
  if(beats.length===0)beats.push(buildBeat(text||'')); // empty input still gives 1 beat
  const pattern=detectPattern(beats);
  assignEmphasis(beats,pattern);
  const tone=detectTone(text);
  const caps=detectCaps(text);
  const payoff=beats.reduce((iMax,b,i,arr)=>b.emphasis>arr[iMax].emphasis?i:iMax,0);
  return { raw, beats, pattern, tone, payoff, caps };
}

async function richParse(text){
  await loadNLP();
  const tree=basicParse(text);
  if(!nlp)return tree;
  // Annotate POS per token via compromise
  try{
    const doc=nlp(text);
    const terms=doc.terms().out('array');
    const tags =doc.terms().out('tags');
    tree.beats.forEach(b=>{
      b.tokens=b.tokens.map(t=>{
        const idx=terms.indexOf(t.w);
        if(idx>=0&&tags[idx]){
          const tagSet=Object.keys(tags[idx]);
          t.pos=tagSet[0]||null;
        }
        return t;
      });
    });
  }catch(e){ /* keep basic */ }
  return tree;
}

window.__parse={
  basic: basicParse,
  rich: richParse,
  load: loadNLP,
};
```

- [ ] **Step 2: Verify it loads without errors**

```bash
node -e "
  global.window={}; global.document={createElement:()=>({}),head:{appendChild:()=>{}},querySelector:()=>null};
  global.localStorage={getItem:()=>null};
  // Load parse.js as a script string and eval it
  const fs=require('fs');
  const src=fs.readFileSync('/Users/k3sava/projects/form/shared/parse.js','utf8');
  eval(src);
  const r=window.__parse.basic('LESS. BETTER.');
  console.log(JSON.stringify(r,null,2));
"
```

Expected: prints a parse tree with 2 beats, pattern `parallel-2`, payoff `1`, tone `statement`.

- [ ] **Step 3: Commit**

```bash
git add shared/parse.js
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): phrase parser (heuristic + compromise.js lazy load)"
```

---

## Task 5: Philosophy module interface + Swiss

**Files:**
- Modify: `/Users/k3sava/projects/form/shared/philosophies/swiss.js`

The Swiss philosophy: Müller-Brockmann grid, off-white surface, primary color blocks, asymmetric balance. Helvetica-family fonts (browser default sans-serif stack). Restrained motion: gentle grid-line pulse + color blocks subtly shifting position over time.

Module interface (uniform across philosophies):

```js
window.FORM_PHILOSOPHY = {
  id: 'swiss',
  name: 'Swiss',
  palette: { bg, fg, accent, dim },
  controls: [ { key, label, min, max, def, step, fmt(v) } ],
  defaults: { /* control key → value */ },
  layout(tree, format, ctx) → { boxes: [...], grid: {...} },
  render(ctx, layout, t, params) → void,
  motion: { kind, intensity, rate },
};
```

- [ ] **Step 1: Write `shared/philosophies/swiss.js`**

```js
// shared/philosophies/swiss.js — Swiss / International Typographic Style
'use strict';

window.FORM_PHILOSOPHY={
  id:'swiss',
  name:'Swiss',
  palette:{
    bg:    '#f5f1e8',
    fg:    '#0a0a0a',
    accent:'#c0392b',   // signal red
    dim:   '#7a7a7a',
    blue:  '#1d4ed8',
  },
  controls:[
    {key:'cols',  label:'COLUMNS',   min:6, max:18, def:12, step:1, fmt:v=>`${v|0}`},
    {key:'block', label:'BLOCK',     min:0, max:1,  def:0.8, step:0.05, fmt:v=>v.toFixed(2)},
    {key:'pulse', label:'PULSE',     min:0, max:1,  def:0.1, step:0.05, fmt:v=>v.toFixed(2)},
  ],
  defaults:{cols:12, block:0.8, pulse:0.1},

  // layout(tree, format) returns {grid, boxes, blocks}
  // grid: {cols, rowHeight, marginX, marginY}
  // boxes: [{beatIndex, x, y, w, h, fontSize, weight, color}]
  // blocks: [{x, y, w, h, color}] — optional color blocks under payoff
  layout(tree, format, params){
    const cols=params.cols|0;
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.06), marginY=Math.round(H*0.07);
    const cellW=(W-marginX*2)/cols;
    const rowH=cellW; // square cells
    const grid={cols, rowHeight:rowH, marginX, marginY, cellW};
    const beats=tree.beats;

    if(beats.length===0)return {grid, boxes:[], blocks:[]};

    // Asymmetric layout: payoff beat dominates; setup beats are smaller, above-left
    const boxes=[];
    const blocks=[];
    const payoff=tree.payoff;
    const setupBeats=beats.filter((_,i)=>i!==payoff);
    const usable=H-marginY*2;

    // Payoff dominates: 70% of vertical space
    const pH=Math.round(usable*0.7);
    const pY=Math.round(marginY + usable*0.25);
    const pFontSize=Math.min(pH, (W-marginX*2)*0.85/Math.max(beats[payoff].text.length*0.6,1));
    boxes.push({
      beatIndex: payoff,
      x: marginX,
      y: pY,
      w: W-marginX*2,
      h: pH,
      fontSize: pFontSize,
      weight: 800,
      color: this.palette.fg,
      align: 'left',
    });

    // Color block behind payoff
    if(params.block>0){
      const bx=marginX, by=Math.round(pY+pH*0.35);
      const bw=Math.round((W-marginX*2)*params.block);
      const bh=Math.round(pH*0.18);
      blocks.push({x:bx,y:by,w:bw,h:bh,color:this.palette.accent});
    }

    // Setup beats: stack top-left, smaller scale
    let sy=marginY;
    setupBeats.forEach((b,idx)=>{
      const sFontSize=Math.round(pFontSize*0.18);
      boxes.push({
        beatIndex: beats.indexOf(b),
        x: marginX,
        y: sy + sFontSize,
        w: (W-marginX*2)*0.6,
        h: sFontSize,
        fontSize: sFontSize,
        weight: 500,
        color: this.palette.fg,
        align: 'left',
      });
      sy+=sFontSize*1.5;
    });

    return {grid, boxes, blocks};
  },

  // render(ctx, layout, t, params)
  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    // Surface
    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    // Pulse offset on color blocks
    const pulse=params.pulse*Math.sin(t*0.0008)*8;

    // Color blocks
    layout.blocks.forEach(b=>{
      ctx.fillStyle=b.color;
      ctx.fillRect(b.x, b.y+pulse, b.w, b.h);
    });

    // Beat boxes
    layout.boxes.forEach(box=>{
      const beat=tree.beats[box.beatIndex];
      if(!beat)return;
      ctx.fillStyle=box.color;
      ctx.font=`${box.weight} ${box.fontSize|0}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.textAlign=box.align;
      ctx.textBaseline='alphabetic';
      ctx.fillText(beat.text, box.x, box.y);
    });

    // Subtle grid lines (very low opacity)
    if(params.pulse>0.05){
      ctx.strokeStyle=`rgba(10,10,10,${0.04*params.pulse})`;
      ctx.lineWidth=1;
      for(let c=0;c<=layout.grid.cols;c++){
        const x=layout.grid.marginX+c*layout.grid.cellW;
        ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();
      }
    }
  },

  motion:{ kind:'pulse', intensity:0.1, rate:0.5 },
};
```

- [ ] **Step 2: Visually validate the module structure**

```bash
node -e "
  global.window={};
  const fs=require('fs');
  eval(fs.readFileSync('/Users/k3sava/projects/form/shared/philosophies/swiss.js','utf8'));
  const p=window.FORM_PHILOSOPHY;
  console.log('id:', p.id);
  console.log('name:', p.name);
  console.log('controls:', p.controls.length);
  console.log('palette keys:', Object.keys(p.palette).length);
  console.log('has layout fn:', typeof p.layout);
  console.log('has render fn:', typeof p.render);
"
```

Expected: `id: swiss`, `name: Swiss`, `controls: 3`, `palette keys: 5`, `has layout fn: function`, `has render fn: function`.

- [ ] **Step 3: Commit**

```bash
git add shared/philosophies/swiss.js
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): swiss philosophy module (palette, grid layout, blocks, motion)"
```

---

## Task 6: Editorial philosophy module

**Files:**
- Modify: `/Users/k3sava/projects/form/shared/philosophies/editorial.js`

Classical magazine spread aesthetic. Serif typeface (browser default serif stack — Georgia / Cambria / Times). Long beat → big headline. Short beats → italic deck or pull-quote. Horizontal rule between sections. Warm cream surface + ink + accent (deep navy). Motion: subtle weight morph (400 ↔ 700) over 6s.

- [ ] **Step 1: Write `shared/philosophies/editorial.js`**

```js
// shared/philosophies/editorial.js — magazine / NYT editorial
'use strict';

window.FORM_PHILOSOPHY={
  id:'editorial',
  name:'Editorial',
  palette:{
    bg:    '#f3eee2',
    fg:    '#16140c',
    accent:'#0e2a5e',  // deep navy
    dim:   '#5a544a',
    rule:  '#a89e80',
  },
  controls:[
    {key:'leading',label:'LEADING',min:0.9, max:1.4, def:1.05, step:0.01, fmt:v=>v.toFixed(2)},
    {key:'weight', label:'WEIGHT', min:300, max:900, def:700, step:50, fmt:v=>`${v|0}`},
    {key:'morph',  label:'MORPH',  min:0,   max:1,   def:0.4, step:0.05, fmt:v=>v.toFixed(2)},
  ],
  defaults:{leading:1.05, weight:700, morph:0.4},

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.08), marginY=Math.round(H*0.10);
    const usableW=W-marginX*2;
    const usableH=H-marginY*2;

    if(tree.beats.length===0)return {boxes:[], rules:[]};

    // Find the longest beat — that's the headline
    let hIdx=0, hLen=0;
    tree.beats.forEach((b,i)=>{ if(b.text.length>hLen){hLen=b.text.length; hIdx=i;} });
    const headline=tree.beats[hIdx];

    const boxes=[];
    const rules=[];

    // Headline scaling: fit within 90% width and ~50% height
    const headTargetH=Math.round(usableH*0.42);
    const headFontSize=Math.min(headTargetH, usableW*1.5/Math.max(headline.text.length,1));
    const headY=Math.round(marginY + usableH*0.45);
    boxes.push({
      beatIndex:hIdx,
      x: marginX,
      y: headY,
      w: usableW,
      h: headTargetH,
      fontSize: headFontSize,
      weight: params.weight,
      color: this.palette.fg,
      style: 'normal',
      align: 'left',
      role: 'headline',
    });

    // Deck (short setup beats, italic, above headline)
    const setups=tree.beats.map((b,i)=>i).filter(i=>i!==hIdx);
    let sy=marginY + Math.round(headFontSize*0.4);
    setups.forEach(i=>{
      const b=tree.beats[i];
      const sFont=Math.round(headFontSize*0.18);
      boxes.push({
        beatIndex:i,
        x: marginX,
        y: sy,
        w: usableW*0.7,
        h: sFont,
        fontSize: sFont,
        weight: 400,
        color: this.palette.dim,
        style: 'italic',
        align: 'left',
        role: 'deck',
      });
      sy += sFont*1.4;
    });

    // Horizontal rule above headline
    rules.push({
      x1: marginX, x2: marginX + Math.round(usableW*0.18),
      y: Math.round(headY - headFontSize*0.4),
      color: this.palette.rule, thickness: 2,
    });

    return {boxes, rules};
  },

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    // Rules
    layout.rules.forEach(r=>{
      ctx.strokeStyle=r.color;
      ctx.lineWidth=r.thickness;
      ctx.beginPath();
      ctx.moveTo(r.x1,r.y); ctx.lineTo(r.x2,r.y);
      ctx.stroke();
    });

    // Motion: weight morph
    const morph=params.morph;
    const morphed=Math.round(params.weight + (300)*morph*Math.sin(t*0.0006));

    layout.boxes.forEach(box=>{
      const beat=tree.beats[box.beatIndex];
      if(!beat)return;
      const w=box.role==='headline'?morphed:box.weight;
      ctx.fillStyle=box.color;
      ctx.font=`${box.style||'normal'} ${w} ${box.fontSize|0}px Georgia, "Times New Roman", serif`;
      ctx.textAlign=box.align;
      ctx.textBaseline='alphabetic';
      ctx.fillText(beat.text, box.x, box.y);
    });
  },

  motion:{ kind:'morph', intensity:0.4, rate:0.6 },
};
```

- [ ] **Step 2: Validate**

```bash
node -e "
  global.window={};
  const fs=require('fs');
  eval(fs.readFileSync('/Users/k3sava/projects/form/shared/philosophies/editorial.js','utf8'));
  const p=window.FORM_PHILOSOPHY;
  console.log('id:', p.id);
  console.log('controls:', p.controls.length);
"
```

Expected: `id: editorial`, `controls: 3`.

- [ ] **Step 3: Commit**

```bash
git add shared/philosophies/editorial.js
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): editorial philosophy module (serif, hierarchy, weight morph)"
```

---

## Task 7: Per-philosophy HTML page template + Swiss page

**Files:**
- Modify: `/Users/k3sava/projects/form/swiss/index.html`

Each philosophy page is a minimal HTML shell:
1. Loads `shared/style.css`
2. Has the standard chrome DOM (splash, topbar, controlbar, drawer, canvas)
3. Loads `shared/app.js`, `shared/parse.js`, `shared/philosophies/<name>.js`
4. Has a small page-specific script that wires the philosophy to the render loop

- [ ] **Step 1: Write `swiss/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0a0a0a">
<meta name="description" content="Swiss-style poster maker. Type a phrase, the system arranges it in the Müller-Brockmann grid tradition: off-white surface, primary color blocks, asymmetric balance. PNG or video export. Part of FORM, a typography lab.">
<title>Swiss poster maker — FORM</title>
<link rel="stylesheet" href="../shared/style.css">
<script src="../shared/app.js" defer></script>
<script src="../shared/parse.js" defer></script>
<script src="../shared/philosophies/swiss.js" defer></script>
</head>
<body>

<div id="rec-overlay">
  <div class="rec-inner">
    <div class="rec-dot"></div>
    <span id="rec-label">RECORDING — 30s</span>
    <div class="rec-track"><div id="rec-bar"></div></div>
  </div>
</div>

<!-- SPLASH -->
<div class="ov" id="splash" role="dialog" aria-modal="true" aria-labelledby="spl-title">
  <div class="spl-inner">
    <div class="spl-title" id="spl-title">SWISS</div>
    <div class="spl-desc">a Müller-Brockmann grid · part of FORM</div>
    <div class="sgrid sck">
      <div class="srow"><span class="skey">Type</span><span class="sdsc">edit phrase</span></div>
      <div class="srow"><span class="skey">←/→</span><span class="sdsc">switch philosophy</span></div>
      <div class="srow"><span class="skey">Space</span><span class="sdsc">play / pause motion</span></div>
      <div class="srow"><span class="skey">/</span><span class="sdsc">focus phrase input</span></div>
      <div class="srow"><span class="skey">T</span><span class="sdsc">theme</span></div>
      <div class="srow"><span class="skey">S</span><span class="sdsc">save PNG</span></div>
      <div class="srow"><span class="skey">R</span><span class="sdsc">record video</span></div>
      <div class="srow"><span class="skey">?</span><span class="sdsc">help</span></div>
      <div class="srow cta">
        <span class="skey">Enter</span>
        <span class="cta-phrase"><span class="cta-word">tap anywhere to begin</span><span class="blink-dot"></span></span>
      </div>
    </div>
    <div class="sgrid sct">
      <div class="srow"><span class="skey">Tap</span><span class="sdsc">edit / interact</span></div>
      <div class="srow"><span class="skey">Swipe</span><span class="sdsc">switch philosophy</span></div>
      <div class="srow"><span class="skey">Hold</span><span class="sdsc">show controls</span></div>
      <div class="srow"><span class="skey">⋯</span><span class="sdsc">help in top corner</span></div>
      <div class="srow cta">
        <span class="skey">Tap</span>
        <span class="cta-phrase"><span class="cta-word">tap anywhere to begin</span><span class="blink-dot"></span></span>
      </div>
    </div>
  </div>
</div>

<!-- TOP BAR -->
<div id="topbar">
  <button class="tb" id="btn-help" aria-label="Help" title="Help (?)">?<span class="kbk">?</span></button>
  <button class="tb" id="btn-theme" aria-label="Toggle theme" title="Theme (T)">
    <svg class="moon" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 9.2A5.5 5.5 0 1 1 6.8 2.5a4.5 4.5 0 0 0 6.7 6.7z"/></svg>
    <svg class="sun"  viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1.4M8 13.1v1.4M1.5 8h1.4M13.1 8h1.4M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1"/></svg>
    <span class="kbk">T</span>
  </button>
  <button class="tb" id="btn-drawer" aria-label="Open controls drawer" title="Drawer (/)">✎<span class="kbk">/</span></button>
  <button class="tb" id="btn-save" aria-label="Save PNG" title="Save PNG (S)">↓<span class="kbk">S</span></button>
  <button class="tb" id="btn-record" aria-label="Record video" title="Record video (R)">●<span class="kbk">R</span></button>
</div>

<!-- CONTROL BAR — philosophy chips -->
<div id="controlbar">
  <a class="pb on" href="../swiss/"      data-id="swiss"      aria-label="Swiss"     >SWISS<span class="kbk">1</span></a>
  <a class="pb"    href="../editorial/"  data-id="editorial"  aria-label="Editorial" >EDITORIAL<span class="kbk">2</span></a>
  <a class="pb"    href="../brutalist/"  data-id="brutalist"  aria-label="Brutalist (coming soon)" style="opacity:.45">BRUTALIST<span class="kbk">3</span></a>
  <a class="pb"    href="../kinetic/"    data-id="kinetic"    aria-label="Kinetic (coming soon)"   style="opacity:.45">KINETIC<span class="kbk">4</span></a>
  <a class="pb"    href="../painterly/"  data-id="painterly"  aria-label="Painterly (coming soon)" style="opacity:.45">PAINTERLY<span class="kbk">5</span></a>
  <a class="pb"    href="../blend/"      data-id="blend"      aria-label="Blend (coming soon)"     style="opacity:.45">BLEND<span class="kbk">B</span></a>
</div>

<!-- DRAWER -->
<aside id="drawer" aria-label="Controls" role="region">
  <div class="drw-section">
    <span class="drw-label">Phrase</span>
    <input id="text-input" type="text" value="LESS. BETTER." placeholder="YOUR TEXT" autocomplete="off" spellcheck="false">
  </div>
  <div class="drw-section">
    <span class="drw-label">Format</span>
    <div class="fmt-row">
      <button class="fmt-btn active" data-fmt="square" aria-label="Square 1:1">&#x25A1;</button>
      <button class="fmt-btn" data-fmt="portrait" aria-label="Portrait 4:5">&#x2590;</button>
      <button class="fmt-btn" data-fmt="landscape" aria-label="Landscape 1.91:1">&#x2582;</button>
    </div>
  </div>
  <div class="drw-section">
    <span class="drw-label">Parameters</span>
    <div class="param-row" id="param-row"></div>
  </div>
</aside>

<main id="canvas-wrap"><canvas id="canvas"></canvas></main>

<script>
window.addEventListener('load', function(){
  const phil = window.FORM_PHILOSOPHY;
  window.state.philosophy = phil;
  // Initialize per-philosophy control state from defaults
  window.state.controls = Object.assign({}, phil.defaults);

  const {canvas, ctx, size} = window.__canvasReady();
  const textInput = document.getElementById('text-input');
  const paramRow = document.getElementById('param-row');

  // Build drawer params from philosophy spec
  function buildParams(){
    paramRow.innerHTML='';
    phil.controls.forEach((p,i)=>{
      const val = window.state.controls[p.key];
      const div = document.createElement('div');
      div.className='param';
      div.innerHTML = `<div class="param-header"><span class="param-label">${p.label}</span><span class="param-val" id="pv${i}">${p.fmt(val)}</span></div><input type="range" min="${p.min}" max="${p.max}" step="${p.step}" value="${val}" id="ps${i}">`;
      paramRow.appendChild(div);
      div.querySelector('input').oninput = function(){
        const v=parseFloat(this.value);
        window.state.controls[p.key]=v;
        document.getElementById('pv'+i).textContent = p.fmt(v);
      };
    });
  }
  buildParams();

  // Format buttons
  document.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.onclick = () => {
      window.state.format = btn.dataset.fmt;
      document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      size();
    };
  });

  // Text input
  function updateAria(){
    canvas.setAttribute('aria-label', `FORM ${phil.name} poster: "${window.state.text}"`);
  }
  textInput.addEventListener('input', () => {
    window.state.text = textInput.value.trim() || 'LESS. BETTER.';
    window.state.tree = window.__parse.basic(window.state.text);
    updateAria();
  });
  // Initial parse + aria
  window.state.text = textInput.value;
  window.state.tree = window.__parse.basic(window.state.text);
  updateAria();
  // Upgrade to rich parse once compromise loads
  window.__parse.rich(window.state.text).then(t => { window.state.tree=t; }).catch(()=>{});

  // Bind shortcuts (philosophy chip navigation is via real <a> hrefs)
  window.__bindShortcuts({
    chips: document.querySelectorAll('#controlbar .pb'),
    onNext: (dir) => {
      const chips = document.querySelectorAll('#controlbar .pb');
      const cur = Array.from(chips).findIndex(c => c.classList.contains('on'));
      const n = chips.length;
      const next = (cur + dir + n) % n;
      chips[next].click();
    },
    onJump: (idx) => {
      const chips = document.querySelectorAll('#controlbar .pb');
      if (chips[idx]) chips[idx].click();
    },
    textInput,
  });
  window.__bindExport(canvas);

  // Render loop
  function tick(ts){
    if(window.__motionPaused){ requestAnimationFrame(tick); return; }
    const fmt = window.FORMATS[window.state.format];
    const layout = phil.layout(window.state.tree, fmt, window.state.controls);
    phil.render(ctx, layout, ts, window.state.controls, window.state.tree);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});
</script>
</body>
</html>
```

- [ ] **Step 2: Verify the swiss page loads and renders**

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/swiss/' });
await playwright.browser_evaluate({ function: '() => document.getElementById("splash").click()' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1t7-swiss.png', type: 'png' });
```

Expected: Swiss splash with SWISS title and "a Müller-Brockmann grid · part of FORM" tagline; dismiss reveals a cream surface with "LESS. BETTER." rendered in a big bold Helvetica with a red color block, plus small italic-y "LESS" text top-left, on a 12-col grid.

If layout looks broken, check the browser console (Playwright captures it). Common issues: undefined `window.FORM_PHILOSOPHY` (means script load order is wrong — `defer` should guarantee execution after parsing, but page-specific `<script>` runs at load), or text getting cut off (adjust `pFontSize` math in swiss.js).

- [ ] **Step 3: Commit**

```bash
git add swiss/index.html
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): swiss/index.html page using shared chrome + module"
```

---

## Task 8: Editorial page

**Files:**
- Modify: `/Users/k3sava/projects/form/editorial/index.html`

Copy the Swiss page and adapt to the Editorial philosophy. Differences:
- `<title>`, splash title, splash desc, meta description point to Editorial
- Script include for `shared/philosophies/editorial.js` instead of `swiss.js`
- Controlbar: EDITORIAL chip has `.on`, SWISS does not

- [ ] **Step 1: Create `editorial/index.html` by copying swiss/index.html and changing only the differences**

```bash
cp /Users/k3sava/projects/form/swiss/index.html /Users/k3sava/projects/form/editorial/index.html
```

Then in `editorial/index.html`, make these exact replacements:

- `<meta name="description" content="...">` → `<meta name="description" content="Editorial poster maker. Type a phrase, the system arranges it in a magazine spread: classical serif hierarchy, drop caps, horizontal rules. PNG or video export. Part of FORM, a typography lab.">`
- `<title>Swiss poster maker — FORM</title>` → `<title>Editorial poster maker — FORM</title>`
- `<script src="../shared/philosophies/swiss.js" defer></script>` → `<script src="../shared/philosophies/editorial.js" defer></script>`
- `<div class="spl-title" id="spl-title">SWISS</div>` → `<div class="spl-title" id="spl-title">EDITORIAL</div>`
- `<div class="spl-desc">a Müller-Brockmann grid · part of FORM</div>` → `<div class="spl-desc">a magazine spread · part of FORM</div>`
- In `#controlbar`: move `.on` from the SWISS chip to the EDITORIAL chip — i.e., `<a class="pb on" href="../swiss/"` becomes `<a class="pb" href="../swiss/"`, and `<a class="pb" href="../editorial/"` becomes `<a class="pb on" href="../editorial/"`.

- [ ] **Step 2: Verify**

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/editorial/' });
await playwright.browser_evaluate({ function: '() => document.getElementById("splash").click()' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1t8-editorial.png', type: 'png' });
```

Expected: cream surface with "LESS. BETTER." in big serif (Georgia), small italic deck above, navy horizontal rule. Active chip on controlbar is EDITORIAL.

- [ ] **Step 3: Commit**

```bash
git add editorial/index.html
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): editorial/index.html page"
```

---

## Task 9: Rebuild `/form/` as the hub picker

The current `index.html` contains the legacy 9-effect renderer. Replace it with a hub page that shows previews of the 5 philosophies and links to each. Phase 1 only has Swiss + Editorial live — the others get "coming soon" cards.

**Files:**
- Modify: `/Users/k3sava/projects/form/index.html`

- [ ] **Step 1: Write the new hub `index.html`**

Replace the ENTIRE contents of `index.html` with:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<meta name="theme-color" content="#0a0a0a">
<meta name="description" content="FORM is a browser-based typography lab. Type a phrase, the system arranges it in five named design philosophies: Swiss, Editorial, Brutalist, Kinetic, Painterly. PNG or video export, no accounts, runs entirely in your browser.">
<title>FORM — typography lab</title>
<link rel="stylesheet" href="shared/style.css">
<style>
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 20px;overflow-y:auto;height:100dvh;}
  .hub-title{font:200 clamp(1.4rem,4vw,2.4rem)/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.32em;color:var(--ov-text);margin-bottom:14px;text-align:center;}
  .hub-tagline{font:300 clamp(.65rem,1vw,.85rem)/1.6 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.12em;color:var(--ov-dim);margin-bottom:48px;text-align:center;max-width:480px;}
  .phil-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;width:100%;max-width:1100px;}
  .phil-card{border:1px solid var(--ov-border);border-radius:14px;background:var(--ov-grid-bg);padding:0;text-decoration:none;color:var(--ov-text);display:flex;flex-direction:column;overflow:hidden;transition:border-color .2s,transform .2s;}
  .phil-card:hover{border-color:var(--ov-mid);transform:translateY(-2px);}
  .phil-card.soon{opacity:.55;pointer-events:none;}
  .phil-preview{aspect-ratio:5/4;background:var(--ov-row-bg);display:flex;align-items:center;justify-content:center;color:var(--ov-mid);font-size:.5rem;letter-spacing:.2em;text-transform:uppercase;}
  .phil-info{padding:14px 16px 16px;}
  .phil-name{font:700 .82rem/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;margin-bottom:6px;}
  .phil-desc{font:300 .62rem/1.7 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.04em;color:var(--ov-dim);}
  .phil-tag{position:absolute;top:10px;left:10px;background:var(--ov-bg);color:var(--ov-mid);font:300 .42rem/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;padding:5px 9px;border-radius:6px;border:1px solid var(--ov-border);}
  .phil-card{position:relative;}
  .hub-foot{margin-top:48px;font:300 .52rem/1.6 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.18em;text-transform:uppercase;color:var(--ov-dim);display:flex;gap:14px;align-items:center;}
  .hub-foot a{color:var(--ov-dim);text-decoration:none;transition:color .2s;}
  .hub-foot a:hover{color:var(--ov-text);}
  .hub-foot .dot{opacity:.4;}
</style>
</head>
<body>

<div class="hub-title">F O R M</div>
<div class="hub-tagline">type a phrase. the system arranges it like a typographer. five named design philosophies, one canvas.</div>

<div class="phil-grid">
  <a class="phil-card" href="swiss/">
    <span class="phil-tag">Live</span>
    <div class="phil-preview">swiss preview</div>
    <div class="phil-info">
      <div class="phil-name">Swiss</div>
      <div class="phil-desc">Müller-Brockmann grid. Off-white, primary blocks, asymmetric balance.</div>
    </div>
  </a>
  <a class="phil-card" href="editorial/">
    <span class="phil-tag">Live</span>
    <div class="phil-preview">editorial preview</div>
    <div class="phil-info">
      <div class="phil-name">Editorial</div>
      <div class="phil-desc">Classical hierarchy. Serif headlines, drop caps, horizontal rules.</div>
    </div>
  </a>
  <a class="phil-card soon" href="brutalist/">
    <span class="phil-tag">Soon</span>
    <div class="phil-preview">brutalist preview</div>
    <div class="phil-info">
      <div class="phil-name">Brutalist</div>
      <div class="phil-desc">Raw paper, photocopier grain, misregistration as design.</div>
    </div>
  </a>
  <a class="phil-card soon" href="kinetic/">
    <span class="phil-tag">Soon</span>
    <div class="phil-preview">kinetic preview</div>
    <div class="phil-info">
      <div class="phil-name">Kinetic</div>
      <div class="phil-desc">Variable-font choreography. Letters along wght and wdth axes.</div>
    </div>
  </a>
  <a class="phil-card soon" href="painterly/">
    <span class="phil-tag">Soon</span>
    <div class="phil-preview">painterly preview</div>
    <div class="phil-info">
      <div class="phil-name">Painterly</div>
      <div class="phil-desc">Sumi ink. Each letter blooms onto paper, then rests still.</div>
    </div>
  </a>
  <a class="phil-card soon" href="blend/">
    <span class="phil-tag">Soon</span>
    <div class="phil-preview">blend preview</div>
    <div class="phil-info">
      <div class="phil-name">Blend Lab</div>
      <div class="phil-desc">Mix any subset of the five on a 5-axis weight space.</div>
    </div>
  </a>
</div>

<div class="hub-foot">
  <span>FORM</span><span class="dot">·</span>
  <a href="https://iamkesava.com" target="_blank" rel="noopener">by Kesava</a>
  <span class="dot">·</span>
  <a href="https://github.com/k3sava/form" target="_blank" rel="noopener">source</a>
</div>

</body>
</html>
```

- [ ] **Step 2: Verify the hub renders**

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_resize({ width: 1280, height: 820 });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1t9-hub.png', type: 'png' });
```

Expected: FORM title, tagline, 6-card grid (Swiss + Editorial active, Brutalist/Kinetic/Painterly/Blend faded as "Soon"), footer. Cards link to their philosophy pages.

- [ ] **Step 3: Commit**

```bash
git add index.html
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): rebuild / as hub picker (Swiss + Editorial live, rest soon)"
```

---

## Task 10: Aggregator extension for subpaths

The little-toys aggregator currently pulls `raw.githubusercontent.com/k3sava/form/main/index.html`. We now need to pull the hub + swiss + editorial pages PLUS the shared assets.

**Files:**
- Modify: `/Users/k3sava/projects/little-toys/scripts/aggregate-toys.mjs`

- [ ] **Step 1: Add a `subpaths` field to the TOYS entry for `form`**

Find the line in `TOYS` for slug `form`. Change it from:

```js
{ slug: "form",          name: "FORM",          category: "Generative", keywords: "typography, poster, generative, design systems", description: "..." },
```

to:

```js
{
  slug: "form",
  name: "FORM",
  category: "Generative",
  keywords: "typography, poster, generative, design systems",
  description: "Type a phrase, the system arranges it like a typographer. Five design philosophies (Swiss, Editorial, Brutalist, Kinetic, Painterly) plus a blend lab. PNG or video.",
  subpaths: ["", "swiss", "editorial", "shared/style.css", "shared/app.js", "shared/parse.js", "shared/philosophies/swiss.js", "shared/philosophies/editorial.js"],
},
```

- [ ] **Step 2: Add subpath-fetching logic to `aggregate-toys.mjs`**

In the `main()` loop, where it currently does:

```js
const html = await fetchToyHtml(toy.slug);
```

…and only handles the root `index.html`, modify to handle `subpaths` if present. Find `async function main()` and around the per-toy logic, replace the body of the `for (const toy of TOYS) { ... }` block with this:

```js
for (const toy of TOYS) {
  const dir = join(PUB, toy.slug);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const subpaths = toy.subpaths || [""];
  let allOk = true;
  for (const sub of subpaths) {
    try {
      // Fetch the file at <slug>/<sub> from main (try master fallback)
      let content = null;
      const isHtml = sub === "" || sub.endsWith("/") || sub.endsWith("index.html") || (!sub.includes(".") && !sub.includes("/"));
      const path = sub === "" ? "index.html" : (sub.endsWith(".css") || sub.endsWith(".js") ? sub : `${sub}/index.html`);
      for (const branch of ["main", "master"]) {
        const url = `${GH}/${toy.slug}/${branch}/${path}`;
        const res = await fetch(url, { headers: { "User-Agent": "little-toys-aggregator" } });
        if (res.ok) { content = await res.text(); break; }
      }
      if (content === null) throw new Error(`could not fetch ${path}`);

      const localPath = sub === "" ? "index.html" : (sub.endsWith(".css") || sub.endsWith(".js") ? sub : `${sub}/index.html`);
      const fullLocal = join(dir, localPath);
      await mkdir(join(fullLocal, ".."), { recursive: true });

      if (sub === "" || (!sub.endsWith(".css") && !sub.endsWith(".js"))) {
        // HTML page — inject canonical + OG + schema
        const pageName = sub === "" ? toy.name : `${toy.name} — ${sub[0].toUpperCase() + sub.slice(1)}`;
        const pageUrl = sub === "" ? `${SITE}/${toy.slug}/` : `${SITE}/${toy.slug}/${sub}/`;
        const enriched = injectCanonical(content, toy.slug + (sub ? "/" + sub : ""), pageName, toy.description, toy.keywords);
        await writeFile(fullLocal, enriched);
      } else {
        // Asset — copy as-is
        await writeFile(fullLocal, content);
      }
    } catch (e) {
      console.log(`  ✗ ${toy.slug}/${sub || "(root)"}: ${e.message}`);
      allOk = false;
    }
  }
  if (allOk) {
    // Write an og.svg only for the root
    await writeFile(join(dir, "og.svg"), ogSvg(toy));
    console.log(`  ✓ ${toy.slug} (${subpaths.length} paths)`);
    ok++;
  } else {
    fail++;
  }
}
```

NOTE: this changes the loop body significantly. The rest of `main()` (counters, exit code) stays the same. The `ok` and `fail` counters and the final `console.log` line stay where they are.

- [ ] **Step 3: Local test of the aggregator**

```bash
cd /Users/k3sava/projects/little-toys
# This will fetch from raw.githubusercontent.com, which means our latest push must be live
node scripts/aggregate-toys.mjs 2>&1 | tail -10
```

You should see `✓ form (8 paths)` (or whatever the actual subpath count is — 8 in our config). If the form subpaths haven't been pushed to github yet, expect failures for those paths.

If the aggregator fails because the new form pages aren't on github main yet — that's fine, this task continues into Task 11 which pushes everything together. Just verify the aggregator code is syntactically valid by running `node -c scripts/aggregate-toys.mjs`.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/little-toys
unset GITHUB_TOKEN GH_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN
git add scripts/aggregate-toys.mjs
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "phase-1(form): aggregator supports multi-path toys (subpaths field)"
```

---

## Task 11: Push form repo, redeploy little-toys, verify live

- [ ] **Step 1: Push form repo**

```bash
cd /Users/k3sava/projects/form
unset GITHUB_TOKEN GH_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN
git push origin main
```

- [ ] **Step 2: Build + deploy little-toys**

```bash
cd /Users/k3sava/projects/little-toys
bash scripts/deploy.sh 2>&1 | tail -5
```

- [ ] **Step 3: Poll for live URLs**

```bash
for url in "https://toys.iamkesava.com/form/" "https://toys.iamkesava.com/form/swiss/" "https://toys.iamkesava.com/form/editorial/" "https://toys.iamkesava.com/form/shared/style.css"; do
  for i in 1 2 3 4 5 6 7 8 9 10; do
    code=$(/usr/bin/curl -sS -o /dev/null -w "%{http_code}" "$url?v=$(date +%s)")
    if [ "$code" = "200" ]; then
      echo "✓ $url"
      break
    fi
    sleep 10
  done
done
```

- [ ] **Step 4: Live visual verification**

```js
// Hub
await playwright.browser_navigate({ url: 'https://toys.iamkesava.com/form/' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1-live-hub.png', type: 'png' });

// Swiss
await playwright.browser_navigate({ url: 'https://toys.iamkesava.com/form/swiss/' });
await playwright.browser_evaluate({ function: '() => document.getElementById("splash").click()' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1-live-swiss.png', type: 'png' });

// Editorial
await playwright.browser_navigate({ url: 'https://toys.iamkesava.com/form/editorial/' });
await playwright.browser_evaluate({ function: '() => document.getElementById("splash").click()' });
await playwright.browser_take_screenshot({ filename: '/Users/k3sava/r2d2/.playwright-mcp/p1-live-editorial.png', type: 'png' });
```

Each screenshot should show a complete page rendering at its respective philosophy.

- [ ] **Step 5: Kill dev server + cleanup screenshots**

```bash
PID=$(cat /tmp/form-dev-pid 2>/dev/null); [ -n "$PID" ] && kill "$PID" 2>/dev/null
rm -f /tmp/form-dev-pid /Users/k3sava/r2d2/.playwright-mcp/p1-*.png
```

---

## Done condition

- `toys.iamkesava.com/form/` shows the hub picker with 6 cards (2 live + 4 soon).
- `/form/swiss/` renders a Swiss-composed poster ("LESS. BETTER." default) on a cream surface with a red color block.
- `/form/editorial/` renders the same phrase in a serif headline with italic deck and navy rule.
- Theme toggle works on both philosophy pages.
- Drawer opens/closes; format buttons resize; param sliders adjust the visible composition.
- compromise.js loads after splash dismiss (check console — first load downloads it; subsequent loads cached).
- All Phase 0 keyboard shortcuts still work; `1`/`2` jump between live philosophies; clicking a "Soon" chip in the controlbar does navigate (the page 404s — fine for now, Phase 2 fills those in).

Phase 2 (Brutalist + Kinetic) begins from this baseline.
