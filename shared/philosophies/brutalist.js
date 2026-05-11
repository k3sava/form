// shared/philosophies/brutalist.js — Zine / photocopier / misregistered
'use strict';

window.FORM_PHILOSOPHY={
  id:'brutalist',
  name:'Brutalist',
  palette:{
    bg:    '#ebe6da',   // raw paper, slightly yellowed
    fg:    '#0d0d0d',   // ink black
    accent:'#d946ef',   // magenta riso
    accent2:'#f2c14e',  // ochre riso secondary
    dim:   '#4a4a4a',
  },
  controls:[
    {key:'mis',   label:'MISREGISTER', min:0, max:1,  def:0.5, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'grain', label:'GRAIN',       min:0, max:1,  def:0.55,step:0.02, fmt:v=>v.toFixed(2)},
    {key:'jitter',label:'JITTER',      min:0, max:1,  def:0.35,step:0.02, fmt:v=>v.toFixed(2)},
  ],
  defaults:{mis:0.5, grain:0.55, jitter:0.35},

  // Cache grain pattern across frames
  _grainCanvas:null,
  _grainSize:0,

  _ensureGrain(size){
    if(this._grainCanvas&&this._grainSize===size)return this._grainCanvas;
    const c=document.createElement('canvas'); c.width=size; c.height=size;
    const cx=c.getContext('2d');
    const id=cx.createImageData(size,size);
    for(let i=0;i<id.data.length;i+=4){
      const n=(Math.random()*256)|0;
      id.data[i]=n; id.data[i+1]=n; id.data[i+2]=n; id.data[i+3]=255;
    }
    cx.putImageData(id,0,0);
    this._grainCanvas=c; this._grainSize=size;
    return c;
  },

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.05), marginY=Math.round(H*0.06);
    const usableW=W-marginX*2, usableH=H-marginY*2;

    if(tree.beats.length===0)return {boxes:[]};

    const payoff=tree.payoff;
    const boxes=[];

    // Payoff: massive, crowding the canvas, slightly off-grid
    const pText=tree.beats[payoff].text;
    const pFont=Math.min(usableH*0.62, usableW*0.95/Math.max(pText.length*0.62,1));
    boxes.push({
      beatIndex:payoff,
      x: marginX - Math.round(pFont*0.04),    // intentional bleed off left edge
      y: Math.round(marginY + usableH*0.62),
      fontSize: pFont,
      weight: 900,
      role: 'payoff',
    });

    // Setup beats: stacked top-left, slightly tilted spaces, raw
    let sy=marginY+Math.round(pFont*0.18);
    tree.beats.forEach((b,i)=>{
      if(i===payoff)return;
      const sFont=Math.round(pFont*0.16);
      boxes.push({
        beatIndex:i,
        x: marginX,
        y: sy+sFont,
        fontSize: sFont,
        weight: 700,
        role: 'setup',
      });
      sy+=sFont*1.5;
    });

    return {boxes};
  },

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    // Paper
    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    // Render text twice for misregistration: accent color underneath, black on top
    const misOffset=params.mis*Math.round(W*0.014);
    const jitter=params.jitter*Math.round(W*0.005);
    const jx=Math.sin(t*0.002)*jitter, jy=Math.cos(t*0.0017)*jitter;

    layout.boxes.forEach(box=>{
      const beat=tree.beats[box.beatIndex];
      if(!beat)return;
      ctx.font=`900 ${box.fontSize|0}px "Helvetica Neue", Helvetica, "Arial Black", sans-serif`;
      ctx.textBaseline='alphabetic';
      ctx.textAlign='left';

      // Accent layer (offset)
      ctx.fillStyle=box.role==='payoff'?this.palette.accent:this.palette.accent2;
      ctx.fillText(beat.text, box.x+misOffset+jx, box.y+jy);

      // Ink black layer (top)
      ctx.fillStyle=this.palette.fg;
      ctx.fillText(beat.text, box.x, box.y);
    });

    // Photocopier grain — small tiled noise canvas, blend-mode multiply at low alpha
    if(params.grain>0.01){
      const g=this._ensureGrain(128);
      ctx.save();
      ctx.globalCompositeOperation='multiply';
      ctx.globalAlpha=params.grain*0.22;
      const pat=ctx.createPattern(g,'repeat');
      ctx.fillStyle=pat;
      ctx.fillRect(0,0,W,H);
      ctx.restore();
    }

    // Stamp ticks at corners — small marks of authenticity
    ctx.strokeStyle=this.palette.fg;
    ctx.lineWidth=Math.max(1, W*0.0014);
    const tick=Math.round(W*0.015);
    ctx.beginPath();
    ctx.moveTo(W-tick*2, tick); ctx.lineTo(W-tick, tick); ctx.lineTo(W-tick, tick*2);
    ctx.moveTo(tick*2, H-tick); ctx.lineTo(tick, H-tick); ctx.lineTo(tick, H-tick*2);
    ctx.stroke();
  },

  motion:{ kind:'jitter', intensity:0.35, rate:0.4 },
};

// Register for the Blend Lab (deduplicated by id)
window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);
