// shared/philosophies/painterly.js — sumi ink, static bloom-on-appear
'use strict';

window.FORM_PHILOSOPHY={
  id:'painterly',
  name:'Painterly',
  palette:{
    bg:    '#efe6d3',   // washi paper
    fg:    '#0c0a08',   // sumi ink
    accent:'#7c0d12',   // vermillion seal red
    paper: '#dccfb1',   // texture mid
    dim:   '#6b6557',
  },
  controls:[
    {key:'bleed',  label:'BLEED',   min:0,    max:1,   def:0.6, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'pressure',label:'PRESSURE',min:0,    max:1,   def:0.7, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'seal',   label:'SEAL',    min:0,    max:1,   def:0.55,step:0.05, fmt:v=>v.toFixed(2)},
  ],
  defaults:{bleed:0.6, pressure:0.7, seal:0.55},

  _t0:null,
  _lastKey:'',

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.08), marginY=Math.round(H*0.11);
    const usableW=W-marginX*2, usableH=H-marginY*2;
    if(tree.beats.length===0)return {boxes:[]};

    const payoff=tree.payoff;
    const boxes=[];

    // Payoff: large, centered horizontally
    const pText=tree.beats[payoff].text;
    const pFont=Math.min(usableH*0.5, usableW*0.85/Math.max(pText.length*0.62,1));
    boxes.push({
      beatIndex:payoff,
      x: marginX + usableW/2,
      y: Math.round(marginY + usableH*0.62),
      fontSize: pFont,
      align: 'center',
      role: 'payoff',
    });

    // Setup beats: small italic above, tilted slightly
    let sy=marginY + Math.round(pFont*0.4);
    tree.beats.forEach((b,i)=>{
      if(i===payoff)return;
      const sFont=Math.round(pFont*0.16);
      boxes.push({
        beatIndex:i,
        x: marginX + usableW/2,
        y: sy + sFont,
        fontSize: sFont,
        align: 'center',
        role: 'deck',
      });
      sy+=sFont*1.5;
    });

    return {boxes, marginX, marginY, usableW, usableH};
  },

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    // Bloom timing: 1.6s ease from invisible+expanded to settled
    const phraseKey=(tree.beats||[]).map(b=>b.text).join('|');
    if(this._lastKey!==phraseKey){ this._t0=t; this._lastKey=phraseKey; }
    const dt=Math.max(0, t-(this._t0||t));
    const k=Math.min(1, dt/1600);
    // ease-out cubic
    const eased=1-Math.pow(1-k,3);
    const expand=1-eased; // 1 → 0 (collapses to final position)
    const alpha=eased;

    // Paper background
    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    // Subtle paper texture: low-frequency noise blobs
    ctx.save();
    ctx.globalAlpha=0.18;
    ctx.fillStyle=this.palette.paper;
    for(let i=0;i<24;i++){
      const x=(Math.sin(i*7.13)*0.5+0.5)*W;
      const y=(Math.cos(i*4.17)*0.5+0.5)*H;
      const r=W*(0.05+0.08*Math.abs(Math.sin(i*2.9)));
      ctx.beginPath();
      ctx.arc(x,y,r,0,Math.PI*2);
      ctx.fill();
    }
    ctx.restore();

    // Render text with bleed (multiple offset+blur passes)
    layout.boxes.forEach(box=>{
      const beat=tree.beats[box.beatIndex];
      if(!beat)return;
      const fontStr=`900 ${box.fontSize|0}px Georgia, "Times New Roman", serif`;
      const txt=beat.text;
      const x=box.x, y=box.y;

      // Bleed passes (filter:blur — supported on canvas in modern Chrome/Edge/Firefox)
      ctx.textAlign=box.align;
      ctx.textBaseline='alphabetic';

      if(params.bleed>0.05){
        const passes=3;
        for(let i=0;i<passes;i++){
          const blur=params.bleed*(2+i*3);
          ctx.save();
          ctx.filter=`blur(${blur}px)`;
          ctx.globalAlpha=alpha*params.bleed*0.18*(1-i*0.18);
          ctx.fillStyle=this.palette.fg;
          ctx.font=fontStr;
          ctx.fillText(txt, x, y);
          ctx.restore();
        }
      }

      // Crisp ink layer — with bloom expand (slightly larger at t=0, settles to actual size)
      ctx.save();
      const scale=1 + expand*0.04;
      ctx.translate(x, y);
      ctx.scale(scale, scale);
      ctx.globalAlpha=alpha*params.pressure;
      ctx.fillStyle=this.palette.fg;
      ctx.font=fontStr;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    });

    // Vermillion seal — bottom right
    if(params.seal>0.1){
      const seal=Math.round(W*0.07);
      const sx=W-Math.round(W*0.10);
      const sy=H-Math.round(H*0.10);
      ctx.save();
      ctx.globalAlpha=params.seal*alpha;
      // Filled square with rounded corners look (chinese seal)
      ctx.fillStyle=this.palette.accent;
      ctx.fillRect(sx-seal/2, sy-seal/2, seal, seal);
      // Carve a mark — minimal kanji-ish strokes (just lines)
      ctx.strokeStyle=this.palette.bg;
      ctx.lineWidth=Math.max(2, seal*0.06);
      ctx.lineCap='square';
      const m=seal*0.22;
      ctx.beginPath();
      ctx.moveTo(sx-seal/2+m, sy); ctx.lineTo(sx+seal/2-m, sy);
      ctx.moveTo(sx, sy-seal/2+m); ctx.lineTo(sx, sy+seal/2-m);
      ctx.stroke();
      ctx.restore();
    }
  },

  motion:{ kind:'bloom-once', intensity:0.6, rate:1 },
};

// Register for the Blend Lab (deduplicated by id)
window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);
