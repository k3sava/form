// shared/philosophies/editorial.js — EDITORIAL
// Operation: magazine-typographer hierarchy. Phrase laid block-justified in a
// serif voice; stop-words go italic to read as connective tissue; the payoff
// word gets a hairline rule above it and a subtle weight breathe over the
// loop. Lead character of beat 0 sets in a drop-cap proportion when long.
// Inspired by NYT, Le Monde diplomatique, Smashing's "three sizes max" rule.

'use strict';

(function(){
const VOICES = {
  garamond: '{WEIGHT} {ITALIC} {SIZE}px "EB Garamond","Garamond","Times New Roman",serif',
  georgia:  '{WEIGHT} {ITALIC} {SIZE}px Georgia,"Times New Roman",serif',
  didone:   '{WEIGHT} {ITALIC} {SIZE}px "Bodoni Moda","Didot",Georgia,serif',
  sans:     '{WEIGHT} {ITALIC} {SIZE}px "Helvetica Neue",Helvetica,Arial,sans-serif',
};
function fontSpec(voice){ return VOICES[voice] || VOICES.georgia; }
function specFor(voice, weight, italic, sizePx){
  return fontSpec(voice)
    .replace('{WEIGHT}', String(weight))
    .replace('{ITALIC}', italic ? 'italic' : 'normal')
    .replace('{SIZE}', String(Math.max(1, sizePx|0)));
}

const measureCanvas = document.createElement('canvas');
const measure = measureCanvas.getContext('2d');
const measureCache = new Map();
function measureText(text, voice, weight, italic, sizePx){
  const key = text+'|'+voice+'|'+weight+'|'+italic+'|'+sizePx;
  if(measureCache.has(key)) return measureCache.get(key);
  measure.font = specFor(voice, weight, italic, sizePx);
  const m = measure.measureText(text).width;
  measureCache.set(key, m);
  if(measureCache.size > 2000){ measureCache.delete(measureCache.keys().next().value); }
  return m;
}

window.FORM_PHILOSOPHY = {
  id:'editorial',
  name:'Editorial',
  palette:{ bg:'#f3eee2', fg:'#16140c', accent:'#0e2a5e', dim:'#5a544a', rule:'#a89e80' },
  controls:[
    {key:'voice',    label:'VOICE',     type:'select', options:['georgia','garamond','didone','sans'], def:'georgia', fmt:v=>v},
    {key:'weight',   label:'WEIGHT',    type:'slider', min:300, max:900, def:700, step:50,   fmt:v=>`${v|0}`},
    {key:'leading',  label:'LEADING',   type:'slider', min:0.85,max:1.4, def:1.05,step:0.01, fmt:v=>v.toFixed(2)},
    {key:'italics',  label:'ITALICS',   type:'check',  def:true,  fmt:v=>v?'on':'off'},
    {key:'rule',     label:'RULE',      type:'check',  def:true,  fmt:v=>v?'on':'off'},
    {key:'dropcap',  label:'DROP CAP',  type:'check',  def:true,  fmt:v=>v?'on':'off'},
    {key:'breathe',  label:'BREATHE',   type:'slider', min:0,   max:1,   def:0.45,step:0.05, fmt:v=>v.toFixed(2)},
    {key:'tracking', label:'TRACKING',  type:'slider', min:-2,  max:8,   def:0,   step:0.1,  fmt:v=>v.toFixed(1)},
  ],
  defaults:{voice:'georgia', weight:700, leading:1.05, italics:true, rule:true, dropcap:true, breathe:0.45, tracking:0},

  layout(tree, format, params){
    const W = format.w, H = format.h;
    const marginX = Math.round(W*0.08), marginY = Math.round(H*0.10);
    const targetW = W - marginX*2;
    const targetH = H - marginY*2;
    const voice = params.voice;
    const baseWeight = params.weight|0;
    const italicStops = !!params.italics;
    const leading = params.leading;

    const widthOf  = (w, intentScale, unit) => {
      const sz = unit * intentScale;
      const wt = (w.intentRole === 'antonym-setup' || w.isStop) ? Math.max(300, baseWeight-200) : baseWeight;
      const it = italicStops && w.isStop;
      return measureText(w.w, voice, wt, it, sz);
    };
    const heightOf = (intentScale, unit) => unit * intentScale * 0.78;

    const box = window.__formLayout.phraseBoxes(tree, {
      widthOf, heightOf,
      interWordRatio: 0.35,
      lineGapRatio: leading - 0.5,
      targetW, targetH,
      minUnit: 14, maxUnit: Math.round(H*0.55),
      maxBlockScale: 2.4,
      alignX: 'center',
      cx: W/2, cy: H/2,
    });

    // Find the payoff box (for the hairline rule).
    const payoffBox = box.boxes.find(b => ['antonym-payoff','time-payoff','payoff','imperative','question'].includes(b.intentRole));
    return { ...box, payoffBox, W, H, marginX, marginY, voice, baseWeight, italicStops };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    ctx.fillStyle = this.palette.bg; ctx.fillRect(0,0,W,H);
    if(!layout.boxes || !layout.boxes.length) return;

    // Loop phase. Payoff weight breathes over exactly one CYCLE.
    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    const breatheAmp = params.breathe * 200; // up to ±200 weight units
    const breathe = Math.sin(phase * Math.PI * 2) * breatheAmp;

    const tracking = params.tracking;

    // Hairline rule above the payoff line, only if rule control is on.
    if(params.rule && layout.payoffBox){
      const p = layout.payoffBox;
      const ruleY = p.y - p.h * 0.18;
      const ruleX1 = p.x;
      const ruleX2 = p.x + Math.min(p.w * 0.42, p.unitPx * 1.6);
      ctx.strokeStyle = this.palette.rule;
      ctx.lineWidth = Math.max(1, p.unitPx * 0.04);
      ctx.beginPath();
      ctx.moveTo(ruleX1, ruleY); ctx.lineTo(ruleX2, ruleY);
      ctx.stroke();
    }

    layout.boxes.forEach((b, idx)=>{
      const isPayoff = ['antonym-payoff','time-payoff','payoff','imperative','question'].includes(b.intentRole);
      const isSetup  = b.intentRole === 'antonym-setup' || b.intentRole === 'setup-cohesion';
      const wt = isPayoff
        ? Math.max(300, Math.min(900, layout.baseWeight + breathe))
        : (isSetup || b.wordObj.isStop) ? Math.max(300, layout.baseWeight - 200) : layout.baseWeight;
      const italic = layout.italicStops && b.wordObj.isStop;
      const color = isPayoff ? this.palette.fg : (isSetup ? this.palette.dim : this.palette.fg);

      // Drop cap on the opening word of beat 0, only when the opener is
      // lowercase. Drop caps are a scale-up of a LOWERCASE leading letter
      // into a decorative cap. When the input is already uppercase, the cap
      // is redundant and creates a double-tall L that fights the payoff.
      const firstChar = b.word.charAt(0);
      const openerIsLowercase = firstChar && firstChar === firstChar.toLowerCase() && firstChar !== firstChar.toUpperCase();
      const isOpener = params.dropcap && openerIsLowercase && b.beatIndex === 0 && b.wordObj.isBeatStart && b.lineIndex === 0 && idx === 0;
      const sz = b.unitPx;
      ctx.fillStyle = color;
      ctx.font = specFor(layout.voice, wt, italic, sz);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';

      if(isOpener && b.word.length > 1){
        const drop = sz * 1.25;
        const tail = b.word.slice(1);
        ctx.font = specFor(layout.voice, wt+100, false, drop);
        ctx.fillText(b.word[0], b.x, b.baselineY);
        const w0 = measureText(b.word[0], layout.voice, wt+100, false, drop);
        ctx.font = specFor(layout.voice, wt, italic, sz);
        let cx = b.x + w0 + sz*0.04;
        if(tracking !== 0){
          for(let i=0;i<tail.length;i++){
            ctx.fillText(tail[i], cx, b.baselineY);
            cx += measureText(tail[i], layout.voice, wt, italic, sz) + tracking;
          }
        } else {
          ctx.fillText(tail, cx, b.baselineY);
        }
      } else if(tracking !== 0){
        let cx = b.x;
        for(let i=0;i<b.word.length;i++){
          ctx.fillText(b.word[i], cx, b.baselineY);
          cx += measureText(b.word[i], layout.voice, wt, italic, sz) + tracking;
        }
      } else {
        ctx.fillText(b.word, b.x, b.baselineY);
      }
    });
  },

  motion:{ kind:'breathe', intensity:0.4, rate:0.6 },
};

window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p => p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
