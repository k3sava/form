// shared/philosophies/brutalist.js — BRUTALIST
// Operation: riso / photocopier / zine. Phrase block-justified at high intent
// contrast, then duplicated as 2 color channels with phase-aligned offset that
// pulses around a circular orbit over CYCLE — perfect-loop misregistration.
// Grain stays static. Halftone CMYK-ish channels (magenta + ochre) underneath
// ink-black on top. Crop ticks at all four corners. Inspired by Bráulio Amado,
// Dinamo, Studio Tröger.

'use strict';

(function(){
const measureCanvas = document.createElement('canvas');
const measure = measureCanvas.getContext('2d');
const measureCache = new Map();
function specFor(voice, sizePx){
  const f = voice === 'condensed'
    ? '900 {SIZE}px "Helvetica Neue Condensed","Arial Narrow","Helvetica Neue",Helvetica,sans-serif'
    : '900 {SIZE}px "Helvetica Neue","Arial Black",Helvetica,sans-serif';
  return f.replace('{SIZE}', String(Math.max(1, sizePx|0)));
}
function measureText(text, voice, sizePx){
  const k = text+'|'+voice+'|'+sizePx;
  if(measureCache.has(k)) return measureCache.get(k);
  measure.font = specFor(voice, sizePx);
  const w = measure.measureText(text).width;
  measureCache.set(k, w);
  if(measureCache.size > 2000){ measureCache.delete(measureCache.keys().next().value); }
  return w;
}

window.FORM_PHILOSOPHY = {
  id:'brutalist',
  name:'Brutalist',
  palette:{ bg:'#ebe6da', fg:'#0d0d0d', accent:'#d946ef', accent2:'#f2c14e', dim:'#4a4a4a' },
  controls:[
    {key:'voice',    label:'VOICE',       type:'select', options:['regular','condensed'], def:'regular', fmt:v=>v},
    {key:'mis',      label:'MISREGISTER', type:'slider', min:0,   max:1,    def:0.55, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'channels', label:'CHANNELS',    type:'slider', min:1,   max:3,    def:2,    step:1,    fmt:v=>`${v|0}`},
    {key:'grain',    label:'GRAIN',       type:'slider', min:0,   max:1,    def:0.55, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'halftone', label:'HALFTONE',    type:'slider', min:0,   max:1,    def:0.35, step:0.05, fmt:v=>v.toFixed(2)},
    {key:'bleed',    label:'BLEED',       type:'check',  def:true, fmt:v=>v?'on':'off'},
    {key:'caps',     label:'CAPS',        type:'check',  def:true, fmt:v=>v?'on':'off'},
    {key:'ticks',    label:'CROP TICKS',  type:'check',  def:true, fmt:v=>v?'on':'off'},
  ],
  defaults:{voice:'regular', mis:0.55, channels:2, grain:0.55, halftone:0.35, bleed:true, caps:true, ticks:true},

  _grainCanvas:null, _grainSize:0,
  _ensureGrain(size){
    if(this._grainCanvas && this._grainSize === size) return this._grainCanvas;
    const c = document.createElement('canvas'); c.width=size; c.height=size;
    const cx = c.getContext('2d');
    const id = cx.createImageData(size, size);
    for(let i=0;i<id.data.length;i+=4){
      const n = (Math.random()*256)|0;
      id.data[i]=n; id.data[i+1]=n; id.data[i+2]=n; id.data[i+3]=255;
    }
    cx.putImageData(id, 0, 0);
    this._grainCanvas = c; this._grainSize = size;
    return c;
  },

  layout(tree, format, params){
    const W = format.w, H = format.h;
    const bleed = params.bleed ? 0 : Math.round(W*0.04);
    const targetW = W - bleed*2;
    const targetH = H - Math.round(H*0.10);
    const voice = params.voice;
    const caps  = !!params.caps;

    // Pre-uppercase if caps is on, by transforming a shallow clone of the tree.
    if(caps && tree && tree.beats){
      tree = {
        ...tree,
        beats: tree.beats.map(b => ({
          ...b,
          tokens: (b.tokens||b.words.map(w=>({w}))).map(t => ({ ...t, w: (t.w||'').toUpperCase() })),
        })),
      };
    }

    const widthOf  = (w, intentScale, unit) => measureText(w.w, voice, unit * intentScale);
    const heightOf = (intentScale, unit) => unit * intentScale * 0.74;

    const box = window.__formLayout.phraseBoxes(tree, {
      widthOf, heightOf,
      interWordRatio: 0.35,
      lineGapRatio: 0.06,  // tight stacking is the brutalist move
      targetW, targetH,
      minUnit: 18, maxUnit: Math.round(H*0.60),
      maxBlockScale: 2.6,
      alignX: 'center',
      cx: W/2, cy: H/2,
    });
    return { ...box, W, H, voice, caps, bleed };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = this.palette.bg; ctx.fillRect(0,0,W,H);
    if(!layout.boxes || !layout.boxes.length) return;

    // Loop phase. Misregister offset orbits in a small circle so the end-state
    // matches the start exactly. amp scales by `mis`.
    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    const amp = params.mis * Math.round(W * 0.014);
    const ox = Math.cos(phase * Math.PI * 2) * amp;
    const oy = Math.sin(phase * Math.PI * 2) * amp;

    const channels = params.channels|0;
    // Channel colors: behind, in front of payoff black ink.
    const colors = [this.palette.accent, this.palette.accent2, this.palette.dim];

    function paintBoxes(offX, offY, fill){
      layout.boxes.forEach(b=>{
        ctx.font = specFor(layout.voice, b.unitPx);
        ctx.textBaseline = 'alphabetic';
        ctx.textAlign = 'left';
        ctx.fillStyle = fill;
        ctx.fillText(b.word, b.x + offX, b.baselineY + offY);
      });
    }

    // Back channels — accent colors, each offset by an angular fraction.
    for(let ch = 0; ch < channels; ch++){
      const a = (ch / Math.max(1, channels)) * Math.PI * 2;
      paintBoxes(ox * Math.cos(a) - oy * Math.sin(a), oy * Math.cos(a) + ox * Math.sin(a), colors[ch % colors.length]);
    }
    // Front: ink black, no offset.
    paintBoxes(0, 0, this.palette.fg);

    // Halftone dot overlay on the payoff boxes — tactile and riso-ish.
    if(params.halftone > 0.02){
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = params.halftone * 0.5;
      const dotSize = Math.max(2, layout.unit * 0.18);
      const step = dotSize * 1.8;
      ctx.fillStyle = this.palette.fg;
      layout.boxes.forEach(b=>{
        const isPayoff = ['antonym-payoff','time-payoff','payoff','imperative','question'].includes(b.intentRole);
        if(!isPayoff) return;
        for(let y = b.y; y < b.y + b.h; y += step){
          for(let x = b.x; x < b.x + b.w; x += step){
            ctx.beginPath();
            ctx.arc(x, y, dotSize*0.4, 0, Math.PI*2);
            ctx.fill();
          }
        }
      });
      ctx.restore();
    }

    // Grain overlay — multiply blend, low alpha. Stays the same every frame.
    if(params.grain > 0.01){
      const g = this._ensureGrain(128);
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.globalAlpha = params.grain * 0.22;
      const pat = ctx.createPattern(g, 'repeat');
      ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // Crop ticks: short marks at each corner, like printer registration.
    if(params.ticks){
      ctx.strokeStyle = this.palette.fg;
      ctx.lineWidth = Math.max(1, W * 0.0014);
      const tick = Math.round(W * 0.015);
      ctx.beginPath();
      // TL
      ctx.moveTo(tick*2, tick); ctx.lineTo(tick, tick); ctx.lineTo(tick, tick*2);
      // TR
      ctx.moveTo(W-tick*2, tick); ctx.lineTo(W-tick, tick); ctx.lineTo(W-tick, tick*2);
      // BL
      ctx.moveTo(tick*2, H-tick); ctx.lineTo(tick, H-tick); ctx.lineTo(tick, H-tick*2);
      // BR
      ctx.moveTo(W-tick*2, H-tick); ctx.lineTo(W-tick, H-tick); ctx.lineTo(W-tick, H-tick*2);
      ctx.stroke();
    }
  },

  motion:{ kind:'orbit', intensity:0.5, rate:0.4 },
};

window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p => p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
