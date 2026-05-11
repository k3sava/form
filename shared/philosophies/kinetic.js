// shared/philosophies/kinetic.js — KINETIC
// Operation: variable-font choreography. Each glyph's wght axis is a phase
// function of (cycle position + glyph index × spread). Setup words oscillate
// in a narrow band; payoff words oscillate wide. Block-justified lines. The
// loop closes exactly at CYCLE_MS — one full wave traversal across the phrase.
// Inspired by Joyce, LettError, Dinamo, Yanone (variable-font practice).

'use strict';

(function(){
const measureCanvas = document.createElement('canvas');
const measure = measureCanvas.getContext('2d');
const measureCache = new Map();
function specFor(weight, sizePx){
  return `${weight|0} ${Math.max(1,sizePx|0)}px "Inter","InterVariable","Inter Variable","Helvetica Neue",Helvetica,sans-serif`;
}
// Width depends only weakly on wght for Inter Variable — measure at the
// midpoint weight to keep layout stable while glyphs animate.
function measureText(text, sizePx){
  const key = text + '|' + sizePx;
  if(measureCache.has(key)) return measureCache.get(key);
  measure.font = specFor(550, sizePx);
  const w = measure.measureText(text).width;
  measureCache.set(key, w);
  if(measureCache.size > 2000){ measureCache.delete(measureCache.keys().next().value); }
  return w;
}

window.FORM_PHILOSOPHY = {
  id:'kinetic',
  name:'Kinetic',
  palette:{ bg:'#0d0d10', fg:'#f4f3f0', accent:'#26ff9d', dim:'#5a5a60' },
  controls:[
    {key:'amp',     label:'AMPLITUDE', type:'slider', min:0,   max:1,    def:0.7, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'spread',  label:'SPREAD',    type:'slider', min:0,   max:1,    def:0.5, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'wobble',  label:'WOBBLE',    type:'slider', min:0,   max:1,    def:0.25,step:0.02, fmt:v=>v.toFixed(2)},
    {key:'baseWt',  label:'BASE WGHT', type:'slider', min:200, max:800,  def:500, step:25,   fmt:v=>`${v|0}`},
    {key:'harmonic',label:'HARMONIC',  type:'slider', min:1,   max:4,    def:1,   step:1,    fmt:v=>`${v|0}`},
    {key:'highlight',label:'HIGHLIGHT', type:'check', def:true, fmt:v=>v?'on':'off'},
  ],
  defaults:{amp:0.7, spread:0.5, wobble:0.25, baseWt:500, harmonic:1, highlight:true},

  layout(tree, format, params){
    const W = format.w, H = format.h;
    const marginX = Math.round(W*0.06), marginY = Math.round(H*0.10);
    const targetW = W - marginX*2;
    const targetH = H - marginY*2;

    const widthOf  = (w, intentScale, unit) => measureText(w.w, unit * intentScale);
    const heightOf = (intentScale, unit) => unit * intentScale * 0.78;

    const box = window.__formLayout.phraseBoxes(tree, {
      widthOf, heightOf,
      interWordRatio: 0.34,
      lineGapRatio: 0.20,
      targetW, targetH,
      minUnit: 18, maxUnit: Math.round(H*0.50),
      maxBlockScale: 2.4,
      alignX: 'center',
      cx: W/2, cy: H/2,
    });

    // Pre-compute per-glyph metadata: pixel x positions and per-glyph phase offset.
    const glyphs = [];
    let glyphCounter = 0;
    box.boxes.forEach(b=>{
      const fs = b.unitPx;
      let cx = b.x;
      for(let i=0; i<b.word.length; i++){
        const ch = b.word[i];
        const wPx = measureText(ch, fs);
        glyphs.push({
          ch, x: cx, baselineY: b.baselineY, fontSize: fs,
          intentScale: b.intentScale,
          intentRole: b.intentRole,
          isStop: b.wordObj.isStop,
          orderIndex: glyphCounter++,
        });
        cx += wPx;
      }
    });
    return { ...box, glyphs, W, H };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = this.palette.bg; ctx.fillRect(0,0,W,H);
    if(!layout.glyphs || !layout.glyphs.length) return;

    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    const N = layout.glyphs.length;
    const baseWt = params.baseWt|0;
    const harmonic = Math.max(1, params.harmonic|0);
    const ampG = params.amp;
    const spread = params.spread;
    const wobble = params.wobble;
    const highlight = !!params.highlight;

    layout.glyphs.forEach((g, i)=>{
      // glyph phase = cycle position - i × spread / N (wave propagates left→right).
      // Integer harmonic keeps the loop closed.
      const idxPhase = (i / Math.max(1, N)) * spread;
      const local = ((phase - idxPhase) % 1 + 1) % 1; // 0..1
      const ang = local * Math.PI * 2 * harmonic;
      // Weight wave is a single bell per loop: 0 at phase 0 (thin) → 1 at
      // phase 0.5 (fat) → 0 at phase 1 (thin = start). Smooth seamless loop.
      const weightWave = (1 - Math.cos(ang)) / 2;
      // Vertical wobble is symmetric around 0.
      const wobbleWave = Math.sin(ang);
      // Payoff glyphs oscillate wider; setup narrower.
      const isPayoff = ['antonym-payoff','time-payoff','payoff','imperative','question'].includes(g.intentRole);
      const isSetup  = g.intentRole === 'antonym-setup' || g.intentRole === 'setup-cohesion' || g.isStop;
      const range = isPayoff ? 380 : (isSetup ? 120 : 240);
      const wt = Math.max(100, Math.min(900, Math.round(baseWt + weightWave * range * ampG)));
      const wobbleY = wobbleWave * g.fontSize * 0.045 * wobble;
      const color = (highlight && isPayoff) ? this.palette.accent : (isSetup ? this.palette.dim : this.palette.fg);

      ctx.fillStyle = color;
      ctx.font = specFor(wt, g.fontSize);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.fillText(g.ch, g.x, g.baselineY + wobbleY);
    });
  },

  motion:{ kind:'axes', intensity:0.7, rate:0.8 },
};

window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p => p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
