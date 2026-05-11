// shared/philosophies/blend.js — BLEND LAB
// Operation: pick a designer from the KB at random, apply their palette +
// scale heuristic + role kill-list on top of a base philosophy (chosen from
// designer.assignable_to_modes). "Generate" reshuffles. Auto-cycle advances
// the designer every CYCLE_MS so the lab cycles through DNA over time.
//
// The KB lives at shared/knowledge/designers.json — 26 practitioners with
// signature_face, scale_rule, break_rule, composition_shape, palette,
// kill_list, example, interview_url, assignable_to_modes.

'use strict';

(function(){

// Tiny inline KB — used until designers.json finishes loading.
const FALLBACK_KB = [
  { id:'vignelli',   name:'Massimo Vignelli',  base:'editorial', palette:{bg:'#f3eee2', fg:'#0a0a0a', accent:'#c63b1f', dim:'#5a554a', rule:'#a89e80'}, scale:{payoff:2.4, setup:0.55}, voice:{voice:'didone'} },
  { id:'scher',      name:'Paula Scher',       base:'brutalist', palette:{bg:'#f5e9a4', fg:'#0a0a0a', accent:'#000000', accent2:'#c63b1f', dim:'#0a0a0a'}, scale:{payoff:2.6, setup:0.5}, voice:{voice:'condensed'} },
  { id:'crouwel',    name:'Wim Crouwel',       base:'swiss',     palette:{bg:'#101418', fg:'#f0eee5', accent:'#3a8eff', dim:'#5d6168'}, scale:{payoff:1.8, setup:0.7}, voice:{shape:'square', voice:'mono'} },
  { id:'sagmeister', name:'Stefan Sagmeister', base:'painterly', palette:{bg:'#101010', fg:'#f0eee5', accent:'#ff2c4b', paper:'#1a1a1a', dim:'#4a4a4a'}, scale:{payoff:2.2, setup:0.7}, voice:{voice:'caslon'} },
  { id:'joyce',      name:'Mike Joyce',        base:'kinetic',   palette:{bg:'#0a0a0a', fg:'#f3efe6', accent:'#ff5a3c', dim:'#5a5a5a'}, scale:{payoff:2.0, setup:0.7}, voice:{baseWt:700, amp:0.55} },
  { id:'amado',      name:'Bráulio Amado',     base:'brutalist', palette:{bg:'#fff75e', fg:'#0a0a0a', accent:'#ff2bd6', accent2:'#15e5d1', dim:'#0a0a0a'}, scale:{payoff:2.8, setup:0.5}, voice:{voice:'regular'} },
];

const state = {
  designers: FALLBACK_KB.slice(),
  loaded: false,
  seed: 0,
  lastSeed: -1,
  active: null,
  baseMod: null,
};

function pickActive(seed){
  const list = state.designers;
  if(!list.length) return null;
  // Deterministic pick from seed.
  const r = ((seed * 9301 + 49297) % 233280) / 233280;
  return list[Math.floor(r * list.length) % list.length];
}

function findMode(id){
  const all = window.__formAllPhilosophies || [];
  return all.find(p => p.id === id && p.id !== 'blend') || all.find(p => p.id !== 'blend');
}

// Apply a designer's scale heuristic to the parse tree (returns a shallow clone).
function applyScale(tree, scaleRule){
  if(!tree || !tree.beats || !scaleRule) return tree;
  const payoffMul = scaleRule.payoff || 1.0;
  const setupMul  = scaleRule.setup  || 1.0;
  return {
    ...tree,
    beats: tree.beats.map(b => ({
      ...b,
      tokens: (b.tokens || (b.words||[]).map(w=>({w}))).map(tok => {
        const role = tok.intentRole || '';
        let s = tok.intentScale != null ? tok.intentScale : 1.0;
        if(['antonym-payoff','time-payoff','payoff','imperative','question'].includes(role)){
          s = Math.max(s, 2.0) * (payoffMul / 2.0);
        } else if(role === 'antonym-setup' || role === 'setup-cohesion'){
          s = (s <= 0.8 ? s : 0.7) * (setupMul / 0.7);
        }
        return { ...tok, intentScale: s };
      }),
    })),
  };
}

// --- KB adapters: translate the prose / array form of designers.json into the
// numeric, object form the render code needs.

const MODE_MAP = {
  'GRID':'swiss', 'SWISS':'swiss',
  'EDITORIAL':'editorial',
  'BRUTALIST':'brutalist',
  'KINETIC':'kinetic',
  'PAINTERLY':'painterly',
  'MYCELIUM':'mycelium',
};

function hexL(hex){
  const m = /^#?([a-f\d]{6})/i.exec(hex||''); if(!m) return 0;
  const n = parseInt(m[1], 16);
  const r=((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
  // perceived luminance
  return 0.299*r + 0.587*g + 0.114*b;
}
function hexSat(hex){
  const m = /^#?([a-f\d]{6})/i.exec(hex||''); if(!m) return 0;
  const n = parseInt(m[1], 16);
  const r=((n>>16)&255)/255, g=((n>>8)&255)/255, b=(n&255)/255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b);
  return mx===0 ? 0 : (mx-mn)/mx;
}

// Map a palette array → the object shape modes consume.
function mapPalette(arr){
  if(!Array.isArray(arr) || !arr.length) return {};
  const sorted = arr.slice().sort((a,b)=>hexL(b) - hexL(a));
  const lightest = sorted[0];
  const darkest  = sorted[sorted.length-1];
  // Dark theme: if "lightest" is still dark (L < 0.55), invert.
  const isDark = hexL(lightest) < 0.55;
  const bg = isDark ? darkest  : lightest;
  const fg = isDark ? lightest : darkest;
  // Accents: most-saturated of the non-bg-non-fg colors, else fall back to remaining list.
  const rest = arr.filter(h => h !== bg && h !== fg).sort((a,b)=>hexSat(b) - hexSat(a));
  const accent  = rest[0] || arr.find(h=>h!==bg) || fg;
  const accent2 = rest[1] || accent;
  const dim     = rest[2] || (isDark ? '#5a5a5a' : '#7a7a7a');
  return { bg, fg, accent, accent2, dim, paper: isDark ? '#1a1a1a' : '#dccfb1', rule: dim };
}

// Translate prose scale_rule into numeric multipliers.
function parseScaleRule(prose){
  const p = (prose||'').toLowerCase();
  let payoff = 2.0, setup = 0.7;
  if(/monument|oversized|huge|massive|crowd/.test(p))    payoff = 2.6;
  if(/extreme contrast|maximum contrast|hierarchic/.test(p)) { payoff = Math.max(payoff, 2.4); setup = 0.55; }
  if(/three sizes|limit.*sizes|constraint/.test(p))      { payoff = Math.max(payoff, 2.2); setup = 0.6; }
  if(/one focal|prima/.test(p))                          payoff = Math.max(payoff, 2.3);
  if(/equal|rhythmic|same height|equal height/.test(p))  { payoff = 1.7; setup = 0.85; }
  if(/weight, not size|hierarchy via weight/.test(p))    { payoff = 1.4; setup = 0.85; }
  if(/handwrit|brush|gesture/.test(p))                   { payoff = Math.max(payoff, 2.1); setup = 0.7; }
  return { payoff, setup };
}

function loadKB(){
  if(state.loaded || state.loading) return;
  state.loading = true;
  fetch('../shared/knowledge/designers.json')
    .then(r => r.ok ? r.json() : null)
    .then(json => {
      if(json && Array.isArray(json.designers)){
        state.designers = json.designers.map(d => {
          const modes = (d.assignable_to_modes||[]).map(m=>MODE_MAP[String(m).toUpperCase()]).filter(Boolean);
          return {
            id: d.id,
            name: d.name,
            era: d.era,
            base: modes[0] || 'swiss',
            altBase: modes[1] || null,
            palette: mapPalette(d.palette),
            scale: parseScaleRule(d.scale_rule),
            voice: {},                  // future: per-designer mode-specific overrides
            example: d.example,
            interview_url: d.interview_url,
            kill_list: d.kill_list || [],
          };
        });
        state.loaded = true;
      }
    })
    .catch(()=>{})
    .finally(()=>{ state.loading = false; });
}

window.FORM_PHILOSOPHY = {
  id:'blend',
  name:'Blend',
  palette:{ bg:'#f0eee8', fg:'#0a0a0a', accent:'#c0392b', dim:'#7a7a7a' },
  controls:[
    {key:'autoCycle', label:'AUTO-CYCLE',  type:'check',  def:true, fmt:v=>v?'on':'off'},
    {key:'caption',   label:'CAPTION',     type:'check',  def:true, fmt:v=>v?'on':'off'},
    {key:'strength',  label:'STRENGTH',    type:'slider', min:0, max:1, def:1.0, step:0.05, fmt:v=>v.toFixed(2)},
    {key:'seed',      label:'SEED',        type:'slider', min:0, max:99, def:0, step:1, fmt:v=>`${v|0}`},
  ],
  defaults:{ autoCycle:false, caption:true, strength:1.0, seed:0 },

  layout(tree, format, params){
    if(!state.loaded && !state.loading) loadKB();

    // Pick the active designer from seed (advanced per-cycle below by render()).
    const seed = (params.seed|0) + (state.cycleAdv || 0);
    const designer = pickActive(seed);
    state.active = designer;

    const base = designer ? findMode(designer.base) : findMode('swiss');
    state.baseMod = base;
    if(!base){
      return { __empty:true, designer, base:null, W: format.w, H: format.h };
    }

    // Apply designer scale heuristic to the tree (strength-mixed with original).
    const strength = params.strength != null ? params.strength : 1.0;
    let treeForBase = tree;
    if(designer && designer.scale && strength > 0.02){
      const interp = {
        payoff: 1.0 + (designer.scale.payoff/2.0 - 1.0) * strength,
        setup:  1.0 + (designer.scale.setup/0.7 - 1.0) * strength,
      };
      treeForBase = applyScale(tree, { payoff: interp.payoff*2.0, setup: interp.setup*0.7 });
    }

    // Merge designer's voice overrides into base mode's defaults.
    const baseParams = { ...(base.defaults || {}), ...(designer && designer.voice || {}) };
    const lay = base.layout.call(base, treeForBase, format, baseParams);
    return { ...lay, __designer: designer, __base: base, __baseParams: baseParams, W: format.w, H: format.h };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const designer = layout.__designer || state.active;
    const base = layout.__base || state.baseMod;

    // Auto-cycle: advance designer index every CYCLE_MS.
    if(params.autoCycle){
      const CYCLE = window.CYCLE_MS || 15000;
      const cycleId = Math.floor(t / CYCLE);
      if(cycleId !== state.lastCycleId){
        state.lastCycleId = cycleId;
        state.cycleAdv = (state.cycleAdv || 0) + 1;
      }
    }

    if(!base || layout.__empty){
      ctx.fillStyle = '#f0eee8'; ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#0a0a0a';
      ctx.font = '400 16px Helvetica';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('loading designer knowledge…', W/2, H/2);
      return;
    }

    // Swap palette on the base module for the call, restore after.
    const origPal = base.palette;
    if(designer && designer.palette){
      base.palette = { ...origPal, ...designer.palette };
    }
    try{
      base.render.call(base, ctx, layout, t, layout.__baseParams || base.defaults || {}, tree);
    } finally {
      base.palette = origPal;
    }

    // Caption: bottom-left, designer name + base mode + interview hint.
    if(params.caption && designer){
      const pad = Math.round(W*0.024);
      const sz = Math.max(12, Math.round(W*0.012));
      const text = `${designer.name.toUpperCase()} · ${designer.base.toUpperCase()}`;
      ctx.font = `500 ${sz}px "JetBrains Mono","SF Mono",ui-monospace,monospace`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(text, pad, H - pad);
    }
  },

  motion:{ kind:'rotate-dna', intensity:0.5, rate:0.5 },
};

// Kick off KB load right away — by the time the user clicks anything it's in.
loadKB();

})();
