// shared/philosophies/painterly.js — PAINTERLY
// Operation: sumi-ink-on-washi. Phrase block-justified in a serif voice; each
// word is rendered through stacked blur passes that mimic ink bleed. Over one
// CYCLE the ink BLOOMS (phase 0.0–0.5: alpha rises, bleed contracts to sharp)
// then WICKS (phase 0.5–1.0: alpha fades back, bleed expands to a wash). End
// state matches start state — perfect loop. Static vermillion seal anchors
// the composition. Inspired by Sagmeister's hand-rendered Lou Reed type and
// Studio Tröger's brush-pen posters.

'use strict';

(function(){
const measureCanvas = document.createElement('canvas');
const measure = measureCanvas.getContext('2d');
const measureCache = new Map();
function specFor(voice, sizePx){
  const f = voice === 'didone'
    ? '900 {SIZE}px "Bodoni Moda","Didot",Georgia,serif'
    : voice === 'caslon'
    ? '700 {SIZE}px "EB Garamond","Garamond",Georgia,serif'
    : '900 {SIZE}px Georgia,"Times New Roman",serif';
  return f.replace('{SIZE}', String(Math.max(1, sizePx|0)));
}
function measureText(text, voice, sizePx){
  const key = text + '|' + voice + '|' + sizePx;
  if(measureCache.has(key)) return measureCache.get(key);
  measure.font = specFor(voice, sizePx);
  const w = measure.measureText(text).width;
  measureCache.set(key, w);
  if(measureCache.size > 2000){ measureCache.delete(measureCache.keys().next().value); }
  return w;
}

window.FORM_PHILOSOPHY = {
  id:'painterly',
  name:'Painterly',
  palette:{ bg:'#efe6d3', fg:'#0c0a08', accent:'#7c0d12', paper:'#dccfb1', dim:'#6b6557' },
  controls:[
    {key:'voice',    label:'VOICE',    type:'select', options:['georgia','caslon','didone'], def:'georgia', fmt:v=>v},
    {key:'bleed',    label:'BLEED',    type:'slider', min:0,   max:1,    def:0.6, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'pressure', label:'PRESSURE', type:'slider', min:0,   max:1,    def:0.85,step:0.02, fmt:v=>v.toFixed(2)},
    {key:'paper',    label:'PAPER',    type:'slider', min:0,   max:1,    def:0.5, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'wash',     label:'WASH',     type:'slider', min:0,   max:1,    def:0.4, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'seal',     label:'SEAL',     type:'check',  def:true, fmt:v=>v?'on':'off'},
  ],
  defaults:{voice:'georgia', bleed:0.6, pressure:0.85, paper:0.5, wash:0.4, seal:true},

  _paperCanvas:null, _paperKey:'',
  _ensurePaper(W, H, level){
    const key = W+'x'+H+'|'+level.toFixed(2);
    if(this._paperCanvas && this._paperKey === key) return this._paperCanvas;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d');
    cx.fillStyle = this.palette.bg; cx.fillRect(0,0,W,H);
    cx.globalAlpha = 0.15 + level*0.20;
    cx.fillStyle = this.palette.paper;
    // Low-frequency blobs.
    for(let i=0; i<28; i++){
      const x = (Math.sin(i*7.13)*0.5+0.5) * W;
      const y = (Math.cos(i*4.17)*0.5+0.5) * H;
      const r = W * (0.04 + 0.09*Math.abs(Math.sin(i*2.9)));
      cx.beginPath(); cx.arc(x,y,r,0,Math.PI*2); cx.fill();
    }
    // Fiber speckle.
    cx.globalAlpha = 0.06 * level;
    cx.fillStyle = '#3a3025';
    for(let i=0; i<W*H/600; i++){
      cx.fillRect(Math.random()*W, Math.random()*H, 1, 1);
    }
    this._paperCanvas = c; this._paperKey = key;
    return c;
  },

  layout(tree, format, params){
    const W = format.w, H = format.h;
    const marginX = Math.round(W*0.08), marginY = Math.round(H*0.11);
    const targetW = W - marginX*2;
    const targetH = H - marginY*2;
    const voice = params.voice;

    const widthOf  = (w, intentScale, unit) => measureText(w.w, voice, unit * intentScale);
    const heightOf = (intentScale, unit) => unit * intentScale * 0.78;

    const box = window.__formLayout.phraseBoxes(tree, {
      widthOf, heightOf,
      interWordRatio: 0.35,
      lineGapRatio: 0.22,
      targetW, targetH,
      minUnit: 16, maxUnit: Math.round(H*0.52),
      maxBlockScale: 2.4,
      alignX: 'center',
      cx: W/2, cy: H/2,
    });
    return { ...box, W, H, voice };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    // Paper.
    const paper = this._ensurePaper(W, H, params.paper);
    ctx.drawImage(paper, 0, 0);
    if(!layout.boxes || !layout.boxes.length) return;

    // Loop: 0.0–0.5 bloom (alpha 0→1, bleed huge→tight),
    //       0.5–1.0 wick  (alpha 1→wash, bleed tight→huge).
    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    const blooming = phase < 0.5;
    const half = blooming ? phase/0.5 : (phase-0.5)/0.5;
    const eased = 1 - Math.pow(1-half, 3);
    // Bloom: alpha 0→1, bleedMult 1→0. Wick: alpha 1→wash, bleedMult 0→1.
    const wash = params.wash;
    const inkAlpha   = blooming ? eased * params.pressure : Math.max(wash, (1-eased)) * params.pressure;
    const bleedMult  = blooming ? (1 - eased*0.9) : (0.1 + eased*0.9);

    const passes = 3;
    layout.boxes.forEach(b=>{
      const fontStr = specFor(layout.voice, b.unitPx);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

      // Bleed passes (blur underlay).
      if(params.bleed > 0.05){
        for(let i=0; i<passes; i++){
          const blur = params.bleed * (2.5 + i*4) * (0.6 + bleedMult*1.6);
          ctx.save();
          ctx.filter = `blur(${blur.toFixed(2)}px)`;
          ctx.globalAlpha = inkAlpha * params.bleed * 0.22 * (1 - i*0.18);
          ctx.fillStyle = this.palette.fg;
          ctx.font = fontStr;
          ctx.fillText(b.word, b.x, b.baselineY);
          ctx.restore();
        }
      }

      // Crisp ink layer. Tiny scale-out at the start of bloom for press-on feel.
      ctx.save();
      const scale = 1 + (blooming ? (1 - eased) * 0.03 : 0);
      ctx.translate(b.x, b.baselineY);
      ctx.scale(scale, scale);
      ctx.globalAlpha = inkAlpha;
      ctx.fillStyle = this.palette.fg;
      ctx.font = fontStr;
      ctx.fillText(b.word, 0, 0);
      ctx.restore();
    });

    // Vermillion seal in the bottom-right corner. Stays steady.
    if(params.seal){
      const seal = Math.round(W*0.072);
      const sx = W - Math.round(W*0.10);
      const sy = H - Math.round(H*0.10);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = this.palette.accent;
      ctx.fillRect(sx-seal/2, sy-seal/2, seal, seal);
      ctx.strokeStyle = this.palette.bg;
      ctx.lineWidth = Math.max(2, seal*0.06);
      ctx.lineCap = 'square';
      const m = seal*0.22;
      ctx.beginPath();
      ctx.moveTo(sx-seal/2+m, sy); ctx.lineTo(sx+seal/2-m, sy);
      ctx.moveTo(sx, sy-seal/2+m); ctx.lineTo(sx, sy+seal/2-m);
      ctx.stroke();
      ctx.restore();
    }
  },

  motion:{ kind:'bloom-wick', intensity:0.6, rate:0.5 },
};

window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p => p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
