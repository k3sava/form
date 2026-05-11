# FORM — Phase 0: Chrome Rewrite Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the FORM chrome to match the toy-pattern used across toys.iamkesava.com — splash + topbar + bottom controlbar + right-slide drawer. Existing 9 effects are kept and surfaced as chips in the controlbar under a single "DRAFT" philosophy. Ships as `/form/` (still single-page; multi-page comes in Phase 1).

**Architecture:** Same single-file static toy (`index.html`). New chrome layers are positioned-floating elements over a full-viewport canvas. CSS variables for overlay tokens. JS module structure unchanged — only the DOM and event wiring change. Each task is independently verifiable via Playwright screenshots (no test framework; this is the discipline for static HTML toys).

**Tech Stack:** Vanilla HTML + CSS + JS. Canvas 2D. Existing `index.html` at `/Users/k3sava/projects/form/index.html`. Playwright (via MCP) for visual verification. Python `http.server` for local serving.

**Reference:** `docs/specs/2026-05-11-form-design.md` — UI chrome section.

**Reference toys (for pattern consistency):**
- `https://toys.iamkesava.com/string-art/` — splash + topbar + controlbar (most complete example)
- `https://toys.iamkesava.com/kaleidoscopic/` — splash + topbar
- `https://toys.iamkesava.com/aurora/` — topbar only

---

## Pre-flight

- [ ] **Step 1: Confirm current state of the file**

Run from repo root:
```bash
cd /Users/k3sava/projects/form
git status
git log --oneline -5
wc -l index.html
```

Expected: working tree clean, last commit is the design spec, `index.html` is ~160 lines.

- [ ] **Step 2: Start local server in background for the duration of this plan**

```bash
cd /Users/k3sava/projects/form
python3 -m http.server 8765 >/dev/null 2>&1 &
echo $! > /tmp/form-dev-pid
sleep 0.6
curl -sI http://localhost:8765/ | head -1
```

Expected: `HTTP/1.0 200 OK`. PID is in `/tmp/form-dev-pid` so we can kill it at the end.

- [ ] **Step 3: Baseline screenshot of the current toy**

Via Playwright MCP:
```js
await playwright.browser_resize({ width: 1280, height: 820 });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-baseline.png',
  type: 'png'
});
```

Expected: Screenshot shows the current header / right sidebar / footer layout. Save this for visual diffing.

---

## Task 1: Add overlay theme tokens

**Files:**
- Modify: `index.html` (CSS `:root` and `[data-theme="light"]` blocks, ~line 22-23)

- [ ] **Step 1: Append overlay tokens to dark theme `:root`**

In `index.html`, find the existing `:root{...}` block (around line 22). Add these variables before the closing brace, immediately after `color-scheme:dark;`:

```css
--ov-bg:rgba(10,10,10,.88);
--ov-text:#f5f3ee;
--ov-dim:#8a8680;
--ov-mid:#c8c4bc;
--ov-strong:#fff;
--ov-border:rgba(255,255,255,.08);
--ov-grid-bg:rgba(255,255,255,.02);
--ov-row-bg:rgba(255,255,255,.02);
--ov-row-border:rgba(255,255,255,.05);
--ov-key-bg:rgba(255,255,255,.05);
--ov-key-text:#c8c4bc;
--ov-dot:#c8c4bc;
--pill-bg:rgba(255,255,255,.06);
--pill-border:rgba(255,255,255,.08);
--pill-text:rgba(255,255,255,.55);
--pill-text-active:rgba(255,255,255,.92);
--pill-text-dim:rgba(255,255,255,.3);
```

- [ ] **Step 2: Append matching light-mode overrides to `[data-theme="light"]`**

In `[data-theme="light"]{...}` block (around line 23), append before the closing brace:

```css
--ov-bg:rgba(245,243,238,.92);
--ov-text:#0a0a0a;
--ov-dim:#9a958d;
--ov-mid:#5a564f;
--ov-strong:#0a0a0a;
--ov-border:rgba(0,0,0,.08);
--ov-grid-bg:rgba(0,0,0,.02);
--ov-row-bg:rgba(0,0,0,.02);
--ov-row-border:rgba(0,0,0,.05);
--ov-key-bg:rgba(0,0,0,.04);
--ov-key-text:#5a564f;
--ov-dot:#2a2622;
--pill-bg:rgba(0,0,0,.04);
--pill-border:rgba(0,0,0,.08);
--pill-text:rgba(0,0,0,.45);
--pill-text-active:rgba(0,0,0,.88);
--pill-text-dim:rgba(0,0,0,.25);
```

- [ ] **Step 3: Verify no rendering regression**

Reload `http://localhost:8765/` via Playwright. The page should look exactly the same as the baseline screenshot — the new variables are unused until later tasks.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): add overlay theme tokens (no visual change)"
```

---

## Task 2: Strip old chrome, set canvas to fullscreen

**Files:**
- Modify: `index.html` (`<body>` grid CSS, `<header>`, `<aside>`, `<footer>` elements, `<main>` styles)

- [ ] **Step 1: Replace body grid + main layout CSS**

Find in CSS (around line 25-31):

```css
body{display:grid;grid-template-rows:42px 1fr 30px;grid-template-columns:1fr 304px;width:100vw;max-width:100vw;}
header{grid-column:1 / -1;display:flex;align-items:center;padding:0 18px;border-bottom:1px solid var(--border);gap:12px;flex-shrink:0;min-width:0;}
.wordmark{font-weight:700;font-size:12px;letter-spacing:.22em;color:var(--text);flex:1;min-width:0;}
```

Replace the `body{...}` line with:

```css
body{position:relative;width:100vw;height:100dvh;overflow:hidden;}
```

Find the `main{...}` block (around line 35) and replace with:

```css
main{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:var(--bg);overflow:hidden;transition:background 140ms ease;z-index:0;}
```

- [ ] **Step 2: Delete header / aside / footer HTML elements**

In the `<body>` section, remove:
- The entire `<header>...</header>` element including the wordmark and theme-btn
- The entire `<aside>...</aside>` element including all `.section` blocks
- The entire `<footer>...</footer>` element

Keep:
- The `<div id="rec-overlay">...</div>` block (we still use it)
- The `<main id="canvas-wrap"><canvas id="canvas"></canvas></main>` block

- [ ] **Step 3: Delete header / aside / footer CSS rules**

Remove these CSS blocks (no longer referenced):
- `header{...}`, `.wordmark{...}`
- `.theme-btn{...}` (we will re-add it as `.tb` in Task 4)
- `.theme-btn:hover{...}`, `.theme-btn svg{...}`, `.theme-btn .sun{...}`, `[data-theme="light"] .theme-btn ...`
- `aside{...}`, `aside::-webkit-scrollbar{...}`, `aside::-webkit-scrollbar-thumb{...}`
- `.section{...}`, `.section:last-child{...}`, `.section-label{...}`
- `.format-group{...}`, `.fmt-btn{...}`, `.fmt-btn.active{...}`, `.fmt-btn:hover:not(.active){...}`
- `.style-row{...}`, `.style-btn{...}`, `.style-btn.active{...}`, `.style-btn:hover:not(.active){...}`
- `.param-row{...}`, `.param{...}`, `.param-header{...}`, `.param-label{...}`, `.param-val{...}`
- `.export-group{...}`, `.export-btn{...}`, `.export-btn:hover{...}`, `.export-btn.rec-active{...}`
- `#text-input{...}`, `#text-input::placeholder{...}`, `#text-input:focus{...}`
- `footer{...}`, `footer a{...}`, `footer a:hover{...}`, `footer .dot{...}`, `footer .spacer{...}`
- `input[type=range]` blocks
- All `@media (max-width:820px)` and `@media (max-width:540px)` blocks

These all need to be removed because the new chrome adds them back fresh with new class names. The `@media` blocks specifically reference layout that no longer exists.

- [ ] **Step 4: Update JS that references removed elements**

Find these lines in the JS section and *comment them out for now* (we re-wire them in later tasks, but if left active they will throw errors and break the canvas):

```js
const textInput=document.getElementById('text-input');
const styleRow=document.getElementById('style-row');
const paramRow=document.getElementById('param-row');
```

Comment with:

```js
// rewired in chrome rewrite tasks 5-10
// const textInput=document.getElementById('text-input');
// const styleRow=document.getElementById('style-row');
// const paramRow=document.getElementById('param-row');
```

Then find the `EFFECTS.forEach((e,i)=>{ ... styleRow.appendChild(btn); });` block and the `buildParams()` function and `document.querySelectorAll('.fmt-btn').forEach(...)` block and the `document.getElementById('export-btn').onclick=` block and the `document.getElementById('video-btn').onclick=` block and the theme toggle IIFE. **Wrap each of these in `if(false){ ... }` so they don't execute** but stay visible in the diff for the rewire tasks.

(Yes, this is ugly. It's a deliberate halfway state for Task 2 only. Tasks 5-10 unwrap them as each chrome element comes back online. The canvas + render loop must keep working through this transition.)

- [ ] **Step 5: Verify canvas still renders fullscreen**

Reload via Playwright. Screenshot to `/Users/k3sava/r2d2/.playwright-mcp/form-task2.png`.

Expected: Black/cream fullscreen canvas with text "LESS. BETTER." rendered by the BREATH effect (the default `state.effect=0`). No chrome visible anywhere. Console has no errors.

If the canvas is letterboxed or sized wrong, check the `sizeCanvas()` function — it reads `wrap.clientWidth/Height`. Those should now be `window.innerWidth/Height` since main is full-viewport.

- [ ] **Step 6: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): strip header/sidebar/footer, canvas fullscreen

Wraps removed-element JS in if(false) blocks as deliberate
halfway state. Subsequent tasks unwrap as each chrome element
comes back online."
```

---

## Task 3: Splash overlay shell + base CSS

**Files:**
- Modify: `index.html` (CSS + body markup)

- [ ] **Step 1: Add splash CSS**

Append to the `<style>` block, before `@keyframes blink`:

```css
/* SPLASH OVERLAY */
.ov{position:fixed;inset:0;z-index:40;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--ov-bg);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);transition:opacity .5s cubic-bezier(.4,0,.2,1);padding:20px;overflow-y:auto;}
.ov.gone{opacity:0;pointer-events:none;}
.spl-inner{max-width:490px;width:100%;display:flex;flex-direction:column;align-items:center;}
.spl-title{font-size:clamp(.92rem,3vw,1.5rem);font-weight:200;letter-spacing:.3em;color:var(--ov-text);margin-bottom:7px;text-align:center;}
.spl-desc{font-size:clamp(.54rem,.82vw,.66rem);font-weight:300;letter-spacing:.1em;color:var(--ov-dim);line-height:2;text-align:center;margin-bottom:24px;max-width:360px;}
.sck{display:block;width:100%;margin-bottom:0;}
.sct{display:none;width:100%;margin-bottom:0;}
@media(hover:none) and (pointer:coarse){.sck{display:none;}.sct{display:block;}}
.sgrid{border:1px solid var(--ov-border);border-radius:10px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;width:100%;background:var(--ov-grid-bg);}
@media(max-width:440px){.sgrid{grid-template-columns:1fr;}}
.srow{display:flex;align-items:center;padding:9px 12px;gap:9px;background:var(--ov-row-bg);border-right:1px solid var(--ov-row-border);border-bottom:1px solid var(--ov-row-border);}
.srow:nth-child(2n){border-right:none;}
.srow:nth-last-child(-n+2){border-bottom:none;}
.srow.cta{background:var(--ov-key-bg);border-bottom:none;grid-column:1/-1;}
.srow.cta .skey{color:var(--ov-strong);border-color:var(--ov-border);background:var(--ov-key-bg);letter-spacing:.06em;}
.cta-phrase{display:flex;align-items:center;gap:7px;flex-wrap:nowrap;}
.cta-word{font-size:.52rem;font-weight:300;letter-spacing:.07em;color:var(--ov-mid);white-space:nowrap;}
.blink-dot{display:inline-block;width:5px;height:5px;border-radius:50%;background:var(--ov-dot);opacity:.4;flex-shrink:0;margin-left:4px;animation:blink 1.4s ease-in-out infinite;}
.skey{font-size:.5rem;font-weight:400;letter-spacing:.06em;color:var(--ov-key-text);background:var(--ov-key-bg);border:1px solid var(--ov-border);border-radius:4px;padding:2px 7px;white-space:nowrap;flex-shrink:0;min-width:38px;text-align:center;}
.sdsc{font-size:.52rem;font-weight:300;letter-spacing:.05em;color:var(--ov-dim);}
@media(max-width:440px){.srow{border-right:none;}.srow:nth-last-child(-n+2){border-bottom:1px solid var(--ov-row-border);}.srow:last-child{border-bottom:none;}.srow.cta{border-bottom:none;}}
```

- [ ] **Step 2: Add splash HTML markup**

Add this inside `<body>`, after the `</div>` that closes `#rec-overlay` and before `<main id="canvas-wrap">`:

```html
<!-- SPLASH -->
<div class="ov" id="splash" role="dialog" aria-modal="true" aria-labelledby="spl-title">
  <div class="spl-inner">
    <div class="spl-title" id="spl-title">FORM</div>
    <div class="spl-desc">a typography lab</div>

    <!-- Desktop shortcuts -->
    <div class="sgrid sck">
      <div class="srow"><span class="skey">Type</span><span class="sdsc">edit phrase</span></div>
      <div class="srow"><span class="skey">Tab</span><span class="sdsc">next effect</span></div>
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

    <!-- Touch shortcuts -->
    <div class="sgrid sct">
      <div class="srow"><span class="skey">Tap</span><span class="sdsc">edit / interact</span></div>
      <div class="srow"><span class="skey">Swipe</span><span class="sdsc">switch effect</span></div>
      <div class="srow"><span class="skey">Hold</span><span class="sdsc">show controls</span></div>
      <div class="srow"><span class="skey">⋯</span><span class="sdsc">help in top corner</span></div>
      <div class="srow cta">
        <span class="skey">Tap</span>
        <span class="cta-phrase"><span class="cta-word">tap anywhere to begin</span><span class="blink-dot"></span></span>
      </div>
    </div>
  </div>
</div>
```

- [ ] **Step 3: Verify splash renders**

Reload via Playwright at desktop width (1280×820) and screenshot:

```js
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task3-desktop.png',
  type: 'png'
});
```

Expected: Splash overlay covers the screen. "FORM" title in airy weight, "a typography lab" tagline below, 2-column grid of shortcuts, "Enter — tap anywhere to begin" CTA row at the bottom of the grid, blinking dot.

Then at mobile width (420×900):

```js
await playwright.browser_resize({ width: 420, height: 900 });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task3-mobile.png',
  type: 'png'
});
```

Expected: Splash still fits, grid drops to 1 column.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): splash overlay with kbd + touch shortcuts"
```

---

## Task 4: Splash dismiss + replay

**Files:**
- Modify: `index.html` (JS — add at end of script block, before the closing `</script>`)

- [ ] **Step 1: Add splash dismiss logic**

Append before the closing `</script>`:

```js
// SPLASH dismiss / replay
(function(){
  const splash=document.getElementById('splash');
  let dismissed=false;
  function dismiss(){
    if(dismissed)return;
    dismissed=true;
    splash.classList.add('gone');
    document.body.classList.add('chrome-on');
  }
  function open(){
    dismissed=false;
    splash.classList.remove('gone');
    document.body.classList.remove('chrome-on');
  }
  // dismiss on any click anywhere or any key
  splash.addEventListener('click',dismiss);
  document.addEventListener('keydown',(e)=>{
    if(!dismissed){
      // any key dismisses except modifiers
      if(['Shift','Control','Alt','Meta','CapsLock','Tab'].includes(e.key))return;
      e.preventDefault();
      dismiss();
    }else if(e.key==='?'||(e.key==='/'&&e.shiftKey)){
      e.preventDefault();
      open();
    }else if(e.key==='Escape'){
      // Esc handlers for drawer/etc — Task 10 will extend; for now, no-op
    }
  });
  // expose for buttons added in Task 5
  window.__splash={open,dismiss};
})();
```

Add this CSS rule near the `.ov` styles:

```css
body:not(.chrome-on) #topbar,
body:not(.chrome-on) #controlbar,
body:not(.chrome-on) #drawer{opacity:0;pointer-events:none;}
.chrome-on #topbar.show,
.chrome-on #controlbar.show,
.chrome-on #drawer.open{opacity:1;pointer-events:auto;}
```

- [ ] **Step 2: Verify dismiss + replay**

Reload at desktop width. Take a baseline screenshot showing the splash. Then click on the body via Playwright:

```js
await playwright.browser_click({
  element: 'splash overlay body',
  target: '#splash .spl-inner'
});
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task4-dismissed.png',
  type: 'png'
});
```

Expected: Splash faded out, canvas visible, no errors in console.

Then press `?`:

```js
await playwright.browser_press_key({ key: '?' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task4-replay.png',
  type: 'png'
});
```

Expected: Splash visible again. (Note: `browser_press_key` may not exist on all builds — alternative is `browser_evaluate(() => document.dispatchEvent(new KeyboardEvent('keydown',{key:'?'})))`.)

- [ ] **Step 3: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): splash dismiss on tap/key, replay on ?"
```

---

## Task 5: Topbar — markup, CSS, theme button rewire

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add topbar CSS**

Append to `<style>`:

```css
/* TOP BAR */
#topbar{position:fixed;top:14px;right:14px;z-index:30;display:flex;gap:5px;transition:opacity .5s ease;}
.tb{font:300 13px/1 'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--pill-text);background:var(--pill-bg);border:1px solid var(--pill-border);border-radius:100px;min-width:36px;height:32px;padding:0 10px;display:flex;align-items:center;justify-content:center;gap:4px;cursor:pointer;transition:color .3s,background .3s;position:relative;-webkit-tap-highlight-color:transparent;}
.tb:hover{background:var(--pill-bg);color:var(--pill-text-active);}
.tb .kbk{font-size:.34rem;opacity:.4;font-weight:300;letter-spacing:.04em;position:absolute;bottom:3px;right:7px;}
@media(hover:none) and (pointer:coarse){.tb .kbk{display:none;}}
.tb svg{width:14px;height:14px;display:block;}
.tb .sun{display:none;}
[data-theme="light"] .tb .moon{display:none;}
[data-theme="light"] .tb .sun{display:block;}
```

- [ ] **Step 2: Add topbar HTML**

Add right after the `</div>` that closes `#splash`:

```html
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
```

- [ ] **Step 3: Unwrap and rewire the theme toggle JS**

Find the `// THEME TOGGLE` IIFE you wrapped in `if(false){ ... }` in Task 2. Unwrap it. Then inside that IIFE, replace `const btn=document.getElementById('theme-btn');` with:

```js
const btn=document.getElementById('btn-theme');
```

Wire `btn-help` to reopen splash. Append inside the same IIFE (after the existing `btn.onclick`):

```js
document.getElementById('btn-help').onclick=()=>window.__splash.open();
```

- [ ] **Step 4: Add `.show` toggle for topbar after splash dismiss**

In the splash dismiss IIFE from Task 4, modify the `dismiss()` function to also add `.show` to topbar:

```js
function dismiss(){
  if(dismissed)return;
  dismissed=true;
  splash.classList.add('gone');
  document.body.classList.add('chrome-on');
  document.getElementById('topbar').classList.add('show');
}
```

And modify `open()` to remove `.show`:

```js
function open(){
  dismissed=false;
  splash.classList.remove('gone');
  document.body.classList.remove('chrome-on');
  document.getElementById('topbar').classList.remove('show');
}
```

Adjust the CSS `.chrome-on #topbar.show` rule — actually we want topbar visible *whenever chrome is on*. Simplify the body-state CSS to:

```css
#topbar,#controlbar,#drawer{opacity:0;pointer-events:none;transition:opacity .5s ease;}
.chrome-on #topbar,
.chrome-on #controlbar.show{opacity:1;pointer-events:auto;}
.chrome-on #drawer.open{opacity:1;pointer-events:auto;}
```

(Remove the earlier `body:not(.chrome-on)` rules from Task 4 — they're redundant.)

- [ ] **Step 5: Verify**

Reload. Dismiss splash (click or any key). Screenshot:

```js
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task5-topbar.png',
  type: 'png'
});
```

Expected: top-right pill with `?`, theme icon, ✎, ↓, ●. Theme button toggles dark/light. `?` reopens splash.

- [ ] **Step 6: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): topbar pill (help/theme/drawer/save/record)"
```

---

## Task 6: Controlbar — markup, CSS, effect chips

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add controlbar CSS**

Append to `<style>`:

```css
/* CONTROL BAR */
#controlbar{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:30;display:flex;align-items:center;gap:3px;background:var(--pill-bg);border:1px solid var(--pill-border);border-radius:100px;padding:4px 6px;backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);overflow-x:auto;-ms-overflow-style:none;scrollbar-width:none;max-width:calc(100vw - 32px);}
#controlbar::-webkit-scrollbar{display:none;}
.cbar-label{font:400 .56rem/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--pill-text-dim);padding:0 10px 0 6px;white-space:nowrap;}
.pb{font:400 .56rem/1 'Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:var(--pill-text);background:none;border:none;border-radius:100px;padding:0 14px;min-height:44px;cursor:pointer;white-space:nowrap;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;transition:color .2s;-webkit-tap-highlight-color:transparent;user-select:none;}
.pb:hover{color:var(--pill-text-active);}
.pb.on{color:var(--pill-text-active);}
.pb.on::after{content:'';position:absolute;bottom:5px;left:50%;transform:translateX(-50%);width:3px;height:3px;border-radius:50%;background:var(--pill-text-active);opacity:.6;}
.pb .kbk{font-size:.34rem;opacity:.25;font-weight:300;letter-spacing:.04em;}
@media(hover:none) and (pointer:coarse){.pb .kbk{display:none;}}
```

- [ ] **Step 2: Add controlbar HTML**

Add after `</div>` that closes `#topbar`:

```html
<!-- CONTROL BAR -->
<div id="controlbar">
  <span class="cbar-label">draft</span>
  <!-- effect chips populated by JS in Step 3 -->
</div>
```

- [ ] **Step 3: Unwrap and rewire the effect chip JS**

Find the `EFFECTS.forEach((e,i)=>{ ... styleRow.appendChild(btn); });` block wrapped in `if(false){}`. Unwrap it. Replace with:

```js
const controlbar=document.getElementById('controlbar');
EFFECTS.forEach((e,i)=>{
  const btn=document.createElement('button');
  btn.className='pb'+(i===0?' on':'');
  btn.dataset.idx=i;
  btn.setAttribute('aria-label',`Effect: ${e.name}`);
  btn.innerHTML=`${e.name}${i<5?'<span class="kbk">'+(i+1)+'</span>':''}`;
  btn.onclick=()=>{
    if(state.effect===i)return;
    state.effect=i;
    document.querySelectorAll('#controlbar .pb').forEach((b,j)=>b.classList.toggle('on',j===i));
    if(typeof buildParams==='function')buildParams();
    resetAll();
  };
  controlbar.appendChild(btn);
});
```

- [ ] **Step 4: Add `.show` to controlbar after dismiss**

In the splash dismiss IIFE, update the `dismiss()` function to also add `.show` to controlbar:

```js
document.getElementById('controlbar').classList.add('show');
```

And `.remove('show')` in `open()`.

- [ ] **Step 5: Verify**

Reload, dismiss splash, screenshot:

```js
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task6-controlbar.png',
  type: 'png'
});
```

Expected: Bottom-center pill with "DRAFT" label and chips for each of the 9 effects (BREATH active). Clicking another chip switches effects on the canvas.

- [ ] **Step 6: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): bottom controlbar with effect chips under DRAFT"
```

---

## Task 7: Drawer — markup, CSS, slide animation

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add drawer CSS**

Append to `<style>`:

```css
/* DRAWER */
#drawer{position:fixed;top:14px;right:14px;bottom:80px;width:320px;z-index:25;background:var(--pill-bg);border:1px solid var(--pill-border);border-radius:18px;padding:18px;backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px);transform:translateX(110%);transition:transform .35s cubic-bezier(.4,0,.2,1),opacity .35s ease;display:flex;flex-direction:column;gap:14px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:var(--pill-border) transparent;}
#drawer::-webkit-scrollbar{width:6px;}
#drawer::-webkit-scrollbar-thumb{background:var(--pill-border);border-radius:3px;}
#drawer.open{transform:translateX(0);}
.drw-section{display:flex;flex-direction:column;gap:6px;}
.drw-label{color:var(--pill-text-dim);font-size:9px;letter-spacing:.16em;text-transform:uppercase;}
#text-input{background:transparent;border:none;border-bottom:1px solid var(--pill-border);color:var(--ov-text);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;letter-spacing:.04em;outline:none;padding:4px 0 5px;width:100%;text-transform:uppercase;caret-color:var(--pill-text-active);min-width:0;}
#text-input::placeholder{color:var(--pill-text-dim);}
#text-input:focus{border-bottom-color:var(--pill-text-active);}
.fmt-row{display:flex;gap:4px;}
.fmt-btn{background:transparent;border:1px solid var(--pill-border);color:var(--pill-text);cursor:pointer;font-size:14px;flex:1;height:30px;display:flex;align-items:center;justify-content:center;border-radius:8px;transition:border-color 80ms,color 80ms;line-height:1;}
.fmt-btn.active{border-color:var(--pill-text-active);color:var(--pill-text-active);}
.fmt-btn:hover:not(.active){color:var(--pill-text-active);}
.param-row{display:flex;flex-direction:column;gap:11px;}
.param{display:flex;flex-direction:column;gap:5px;min-width:0;}
.param-header{display:flex;justify-content:space-between;align-items:baseline;gap:4px;}
.param-label{color:var(--pill-text-dim);font-size:9px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;}
.param-val{color:var(--pill-text);font-size:9px;font-variant-numeric:tabular-nums;white-space:nowrap;}
input[type=range]{-webkit-appearance:none;width:100%;height:1px;background:var(--pill-border);outline:none;cursor:pointer;margin:0;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:var(--pill-text-active);cursor:pointer;}
input[type=range]::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:var(--pill-text-active);border:none;cursor:pointer;}
@media(max-width:540px){
  #drawer{top:auto;right:14px;left:14px;bottom:80px;width:auto;max-height:60vh;}
  input[type=range]::-webkit-slider-thumb{width:18px;height:18px;}
  input[type=range]::-moz-range-thumb{width:18px;height:18px;}
}
```

- [ ] **Step 2: Add drawer HTML**

Add after the `</div>` that closes `#controlbar`:

```html
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
```

- [ ] **Step 3: Verify drawer renders hidden by default and shows when `.open` added**

Reload, dismiss splash. The drawer is opacity:0/pointer-events:none and translated off-screen. Verify by manually toggling via Playwright:

```js
await playwright.browser_evaluate({
  function: '() => document.getElementById("drawer").classList.add("open")'
});
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task7-drawer.png',
  type: 'png'
});
```

Expected: Drawer slides in from the right, shows Phrase input (LESS. BETTER.), Format row, empty Parameters section. The body opacity rules from Task 5 still gate it on `chrome-on`.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): right drawer slide-in with text/format/params"
```

---

## Task 8: Rewire text input + format + params + buildParams

**Files:**
- Modify: `index.html` (JS — uncomment / rewire the removed-element references)

- [ ] **Step 1: Unwrap the JS that referenced text-input, format buttons, buildParams**

Restore (delete the `// rewired in chrome rewrite...` comments and uncomment) these declarations:

```js
const textInput=document.getElementById('text-input');
const paramRow=document.getElementById('param-row');
```

Delete `styleRow` — it's gone; controlbar replaces it.

Unwrap the `function buildParams(){...}` block from its `if(false){}`. It references `paramRow.innerHTML=''` and `paramRow.appendChild(div)` — those work because `paramRow` is now inside the drawer.

Unwrap the `buildParams()` call at module load. Verify it runs without error.

Unwrap the `function resetAll(){...}` block if it was also wrapped (it likely wasn't, since it doesn't reference removed elements — double-check). The reset function calls into effects, not DOM, so it's safe.

- [ ] **Step 2: Rewire format buttons**

Unwrap the `document.querySelectorAll('.fmt-btn').forEach(btn=>{...})` block. It still works — the buttons are now in the drawer instead of the old header, but the selector is identical.

- [ ] **Step 3: Rewire text input change handler**

If there is no existing input handler (the original `index.html` may not have one), add:

```js
textInput.addEventListener('input',()=>{
  state.text=textInput.value.trim()||'LESS. BETTER.';
  textCache.key='';
});
```

This invalidates the text cache so the next render recomputes. The `state.text` is read by `getTextPixels` via the existing render path.

Verify by checking what's already there — search for `textInput.addEventListener` or `textInput.oninput`. If present, leave alone.

- [ ] **Step 4: Verify drawer controls actually work**

Reload, dismiss splash, force-open drawer:

```js
await playwright.browser_evaluate({
  function: '() => document.getElementById("drawer").classList.add("open")'
});
// Click portrait format
await playwright.browser_click({ element: 'portrait format button', target: '[data-fmt="portrait"]' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task8-portrait.png',
  type: 'png'
});
```

Expected: Canvas resizes to 4:5, the portrait button shows active border.

Then verify text input:

```js
await playwright.browser_evaluate({
  function: '() => { const i=document.getElementById("text-input"); i.value="HELLO WORLD"; i.dispatchEvent(new Event("input")); }'
});
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task8-text.png',
  type: 'png'
});
```

Expected: Canvas now renders "HELLO WORLD".

- [ ] **Step 5: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): rewire text/format/params into drawer"
```

---

## Task 9: Rewire export buttons (PNG + Video) into topbar

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Unwrap the PNG export handler**

Find the wrapped `document.getElementById('export-btn').onclick=()=>{...}` block. The button is now `#btn-save` in the topbar. Change to:

```js
document.getElementById('btn-save').onclick=()=>{
  const a=document.createElement('a');
  a.download=`form-${state.format}-${EFFECTS[state.effect].name.toLowerCase()}.png`;
  a.href=canvas.toDataURL('image/png');
  a.click();
};
```

- [ ] **Step 2: Unwrap the video record handler**

Find the wrapped `document.getElementById('video-btn').onclick=function(){...}` block (longer — it sets up MediaRecorder). Rewire to `#btn-record`. The body of the function is unchanged; only the element selector changes.

Also find any usage of `.rec-active` class on the video button (e.g. `videoBtn.classList.add('rec-active')`). Change those to operate on the new `#btn-record` element. Add a `.tb.rec-active{border-color:#c0392b;color:#c0392b;animation:blink .9s ease-in-out infinite;}` rule to the topbar CSS so the active state shows.

- [ ] **Step 3: Verify save button downloads a PNG**

Reload, dismiss splash. Click `↓`:

```js
await playwright.browser_click({ element: 'save button', target: '#btn-save' });
```

Expected: Browser downloads a `.png` file. Check network panel or downloads dir.

Verify record button starts MediaRecorder (it will trigger `getUserMedia`-equivalent on canvas; some Playwright builds prompt for permission — check console for errors):

```js
await playwright.browser_click({ element: 'record button', target: '#btn-record' });
await playwright.browser_evaluate({ function: '() => document.querySelector("#rec-overlay").style.display' });
```

Expected: `rec-overlay` style becomes `flex` (the existing recording overlay shows).

Click record again to stop:

```js
await playwright.browser_click({ element: 'record button', target: '#btn-record' });
```

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): rewire PNG + video export buttons into topbar"
```

---

## Task 10: Drawer open/close wiring + click-outside

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Wire drawer button + click-outside**

Append to the JS:

```js
// DRAWER open/close
(function(){
  const drawer=document.getElementById('drawer');
  const btn=document.getElementById('btn-drawer');
  function toggle(){drawer.classList.toggle('open');}
  function close(){drawer.classList.remove('open');}
  function openIt(){drawer.classList.add('open');}
  btn.onclick=toggle;
  // click outside the drawer closes it
  document.addEventListener('click',(e)=>{
    if(!drawer.classList.contains('open'))return;
    if(drawer.contains(e.target))return;
    if(btn.contains(e.target))return;
    close();
  });
  window.__drawer={open:openIt,close,toggle};
})();
```

- [ ] **Step 2: Add Esc handling**

In the splash IIFE's `keydown` handler, find the `else if(e.key==='Escape')` no-op and replace with:

```js
else if(e.key==='Escape'){
  if(window.__drawer)window.__drawer.close();
}
```

- [ ] **Step 3: Verify**

Reload, dismiss splash. Click `✎` in topbar:

```js
await playwright.browser_click({ element: 'drawer button', target: '#btn-drawer' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task10-drawer-open.png',
  type: 'png'
});
```

Expected: Drawer slides in. Click `✎` again:

```js
await playwright.browser_click({ element: 'drawer button', target: '#btn-drawer' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-task10-drawer-closed.png',
  type: 'png'
});
```

Expected: Drawer slides out.

Click outside drawer area while open:

```js
await playwright.browser_click({ element: 'drawer button', target: '#btn-drawer' });
await playwright.browser_click({ element: 'canvas area', target: 'canvas' });
```

Expected: Drawer closes on outside-click.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): drawer toggle, click-outside, Esc close"
```

---

## Task 11: Keyboard shortcuts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add global keyboard shortcut handler**

Append to the JS (before the closing `</script>`):

```js
// KEYBOARD SHORTCUTS
(function(){
  const textInput=document.getElementById('text-input');
  document.addEventListener('keydown',(e)=>{
    // ignore when typing in the input
    if(document.activeElement===textInput)return;
    // ignore modifier-only
    if(['Shift','Control','Alt','Meta','CapsLock'].includes(e.key))return;
    // splash is open? splash handler already takes care of it
    if(!document.body.classList.contains('chrome-on'))return;

    const k=e.key;
    if(k==='Tab'){
      e.preventDefault();
      const n=EFFECTS.length;
      const dir=e.shiftKey?-1:1;
      const next=(state.effect+dir+n)%n;
      const btn=document.querySelectorAll('#controlbar .pb')[next];
      btn&&btn.click();
    }else if(k>='1'&&k<='9'){
      const idx=parseInt(k,10)-1;
      if(idx<EFFECTS.length){
        const btn=document.querySelectorAll('#controlbar .pb')[idx];
        btn&&btn.click();
      }
    }else if(k===' '){
      e.preventDefault();
      window.__motionPaused=!window.__motionPaused;
    }else if(k==='/'){
      e.preventDefault();
      if(window.__drawer)window.__drawer.open();
      setTimeout(()=>textInput.focus(),360); // wait for slide
    }else if(k==='t'||k==='T'){
      document.getElementById('btn-theme').click();
    }else if(k==='s'||k==='S'){
      document.getElementById('btn-save').click();
    }else if(k==='r'||k==='R'){
      document.getElementById('btn-record').click();
    }else if(k==='?'){
      window.__splash.open();
    }
  });
})();
```

- [ ] **Step 2: Add motion pause hook to the render loop**

Find the `function tick(ts){ ... }` render loop. Add early return:

```js
function tick(ts){
  if(window.__motionPaused){requestAnimationFrame(tick);return;}
  // ... existing tick body
}
```

(Insert immediately after the function signature, before the first existing line.)

- [ ] **Step 3: Verify shortcuts work**

Reload, dismiss splash. Test each shortcut via Playwright `browser_press_key` or `browser_evaluate` dispatching KeyboardEvent:

```js
async function pressKey(key, shift=false){
  await playwright.browser_evaluate({
    function: `() => document.dispatchEvent(new KeyboardEvent('keydown',{key:'${key}',shiftKey:${shift},bubbles:true}))`
  });
}
// Tab
await pressKey('Tab');
// 5 (jump to effect 5)
await pressKey('5');
// Space (pause)
await pressKey(' ');
// / (focus input + open drawer)
await pressKey('/');
// T (theme)
await pressKey('t');
// ? (splash)
await pressKey('?');
```

After each, screenshot and verify expected state. Save final screenshot as `form-task11-shortcuts.png`.

- [ ] **Step 4: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): keyboard shortcuts (Tab/1-9/Space/Slash/T/S/R/?)"
```

---

## Task 12: Accessibility polish

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Focus trap inside splash**

Append inside the splash IIFE (in the dismiss/replay code):

```js
// Focus trap while splash is open
splash.addEventListener('keydown',(e)=>{
  if(e.key!=='Tab')return;
  e.preventDefault(); // splash has no internal focusables; keep focus on splash root
});
splash.tabIndex=-1;
// Move focus to splash when open
function focusSplash(){splash.focus({preventScroll:true});}
// extend open() and dismiss():
const _origOpen=open;
// can't reassign const; instead, on initial load:
focusSplash();
```

(If `open` is `const`, just call `splash.focus()` inside the existing `open()` body directly. Reshape the IIFE as needed.)

- [ ] **Step 2: Dynamic canvas aria-label**

Find where state.text or state.effect changes (text input handler, controlbar chip onclick). After each change, also update:

```js
canvas.setAttribute('aria-label',`FORM poster: "${state.text}" in ${EFFECTS[state.effect].name} style`);
```

Set it once on init too — append after the initial buildParams() call.

- [ ] **Step 3: Reduced-motion handler**

Append to JS:

```js
// REDUCED MOTION
(function(){
  const mq=window.matchMedia('(prefers-reduced-motion: reduce)');
  function apply(){
    window.__motionPaused=mq.matches;
  }
  mq.addEventListener?mq.addEventListener('change',apply):mq.addListener(apply);
  apply();
})();
```

- [ ] **Step 4: Verify aria + reduced-motion**

Via Playwright:

```js
const ariaLabel=await playwright.browser_evaluate({
  function: '() => document.getElementById("canvas").getAttribute("aria-label")'
});
console.log(ariaLabel);
```

Expected: includes phrase + effect name.

Test reduced-motion:

```js
await playwright.browser_emulate({ media: 'screen', features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_evaluate({ function: '() => window.__motionPaused' });
```

Expected: `true`. (The MCP `browser_emulate` API name may differ — if not available, manually verify by setting `window.__motionPaused=true` and screenshotting to confirm motion freezes.)

- [ ] **Step 5: Commit**

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): a11y — focus trap, canvas aria-label, prefers-reduced-motion"
```

---

## Task 13: Cross-viewport visual verification

**Files:**
- Read-only: take screenshots, validate layout

- [ ] **Step 1: Desktop wide (1440×900)**

```js
await playwright.browser_resize({ width: 1440, height: 900 });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-final-desktop.png',
  type: 'png'
});
```

Inspect: splash centered, FORM title legible, shortcuts grid in 2 columns, no overflow.

- [ ] **Step 2: Desktop after dismiss + drawer open**

```js
await playwright.browser_click({ element: 'splash', target: '#splash .spl-inner' });
await playwright.browser_click({ element: 'drawer button', target: '#btn-drawer' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-final-desktop-open.png',
  type: 'png'
});
```

Inspect: topbar top-right with 5 pill buttons, controlbar bottom-center with effect chips, drawer right side with Phrase / Format / Parameters sections, canvas fills remaining space.

- [ ] **Step 3: Tablet (820×1180)**

```js
await playwright.browser_resize({ width: 820, height: 1180 });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-final-tablet.png',
  type: 'png'
});
```

Inspect: splash still readable. Dismiss → controlbar may need horizontal scroll if 9 chips don't fit; verify scroll works without scrollbar visible.

- [ ] **Step 4: Mobile (420×900)**

```js
await playwright.browser_resize({ width: 420, height: 900 });
await playwright.browser_navigate({ url: 'http://localhost:8765/' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-final-mobile-splash.png',
  type: 'png'
});
```

Inspect: splash uses 1-column grid. Dismiss:

```js
await playwright.browser_click({ element: 'splash', target: '#splash .spl-inner' });
await playwright.browser_click({ element: 'drawer button', target: '#btn-drawer' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-final-mobile-open.png',
  type: 'png'
});
```

Inspect: drawer becomes bottom-sheet style (matches CSS @media max-width:540px rule). Canvas not obscured. Controlbar scrolls horizontally.

- [ ] **Step 5: If any viewport looks broken, fix CSS and re-screenshot**

Common issues:
- Controlbar overflows on mobile → already has `overflow-x:auto`, check the chip min-height (44px is the touch target floor)
- Drawer covers controlbar on mobile → check the `bottom:80px` value in the @media block

Fix any issues. Re-screenshot. Commit fixes separately:

```bash
cd /Users/k3sava/projects/form
git add index.html
git commit -m "phase-0(form): responsive fixes from cross-viewport audit"
```

(Skip the commit if no fixes were needed.)

- [ ] **Step 6: Clean up screenshots**

```bash
rm -f /Users/k3sava/r2d2/.playwright-mcp/form-*.png
```

---

## Task 14: Push form repo, redeploy little-toys, verify live

**Files:**
- Push: `github.com/k3sava/form`
- Deploy: `github.com/k3sava/little-toys` (gh-pages)

- [ ] **Step 1: Final push of form repo**

```bash
cd /Users/k3sava/projects/form
git log --oneline -20  # sanity check — should show ~12-14 phase-0 commits
unset GITHUB_TOKEN GH_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN  # let credential store win
git push origin main
```

Expected: `main → main` push successful.

- [ ] **Step 2: Sync the local r2d2 toys/form copy**

```bash
cp /Users/k3sava/projects/form/index.html /Users/k3sava/r2d2/toys/form/index.html
# README didn't change in phase 0
```

- [ ] **Step 3: Rebuild and redeploy little-toys**

```bash
cd /Users/k3sava/projects/little-toys
unset GITHUB_TOKEN GH_TOKEN GITHUB_PERSONAL_ACCESS_TOKEN
bash scripts/deploy.sh 2>&1 | tail -4
```

Expected: `✓ deployed to gh-pages`. The aggregator pulls the new `index.html` from `raw.githubusercontent.com/k3sava/form/main/index.html`.

- [ ] **Step 4: Wait for GH Pages + verify live**

```bash
for i in 1 2 3 4 5 6 7 8 9 10; do
  /usr/bin/curl -sS -o /tmp/_live -w "%{http_code}" "https://toys.iamkesava.com/form/?v=$(date +%s)"
  echo " attempt $i"
  if grep -q 'id="splash"' /tmp/_live 2>/dev/null; then
    echo "✓ splash markup present"
    break
  fi
  sleep 12
done
rm -f /tmp/_live
```

Expected: After 1-3 minutes, splash markup is present.

- [ ] **Step 5: Live visual verification**

```js
await playwright.browser_navigate({ url: 'https://toys.iamkesava.com/form/' });
await playwright.browser_resize({ width: 1280, height: 820 });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-live-splash.png',
  type: 'png'
});
```

Inspect: Splash on first load with FORM title.

```js
await playwright.browser_click({ element: 'splash', target: '#splash .spl-inner' });
await playwright.browser_take_screenshot({
  filename: '/Users/k3sava/r2d2/.playwright-mcp/form-live-dismissed.png',
  type: 'png'
});
```

Inspect: Topbar + controlbar visible. Canvas shows BREATH effect on "LESS. BETTER."

- [ ] **Step 6: Kill the local dev server**

```bash
kill "$(cat /tmp/form-dev-pid)" 2>/dev/null
rm -f /tmp/form-dev-pid /Users/k3sava/r2d2/.playwright-mcp/form-live-*.png
```

- [ ] **Step 7: Commit r2d2 toys/form sync if there are pending changes**

```bash
cd /Users/k3sava/r2d2
git status --short toys/form/
# If there are M or ?? entries, commit them
git add toys/form/
git -c user.name="Kesava Mandiga" -c user.email="hello@iamkesava.com" commit -m "sync toys/form from public repo (phase-0 chrome rewrite)" 2>&1 | tail -3
```

(This commit lives in r2d2, not pushed anywhere — local working copy only.)

---

## Done condition

Phase 0 is complete when:

- `toys.iamkesava.com/form/` shows the new splash on first load
- Splash dismisses on tap or any key
- Top-right pill shows `?`, theme, `✎`, `↓`, `●` and each works
- Bottom controlbar shows "DRAFT" label + 9 effect chips; clicking switches effects
- `✎` slides in a right-side drawer with Phrase / Format / Parameters
- Keyboard shortcuts: `Tab`, `1`–`9`, `Space`, `/`, `T`, `S`, `R`, `?`, `Esc` all behave per the spec
- Canvas remains fullscreen with the existing effect rendering intact
- Mobile (420×900) and tablet (820×1180) viewports both readable
- `prefers-reduced-motion` freezes the animation
- All commits pushed to `github.com/k3sava/form` and a redeploy of little-toys is live

Phase 1 (Swiss + Editorial as real philosophies with the smart parser) starts from this baseline.
