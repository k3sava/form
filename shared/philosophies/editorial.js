// shared/philosophies/editorial.js — magazine / NYT editorial
'use strict';

window.FORM_PHILOSOPHY={
  id:'editorial',
  name:'Editorial',
  palette:{
    bg:    '#f3eee2',
    fg:    '#16140c',
    accent:'#0e2a5e',
    dim:   '#5a544a',
    rule:  '#a89e80',
  },
  controls:[
    {key:'leading',label:'LEADING',min:0.9, max:1.4, def:1.05, step:0.01,fmt:v=>v.toFixed(2)},
    {key:'weight', label:'WEIGHT', min:300, max:900, def:700,  step:50,  fmt:v=>`${v|0}`},
    {key:'morph',  label:'MORPH',  min:0,   max:1,   def:0.4,  step:0.05,fmt:v=>v.toFixed(2)},
  ],
  defaults:{leading:1.05, weight:700, morph:0.4},

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.08), marginY=Math.round(H*0.10);
    const usableW=W-marginX*2;
    const usableH=H-marginY*2;

    if(tree.beats.length===0)return {boxes:[], rules:[]};

    let hIdx=0, hLen=0;
    tree.beats.forEach((b,i)=>{ if(b.text.length>hLen){hLen=b.text.length; hIdx=i;} });
    const headline=tree.beats[hIdx];

    const boxes=[];
    const rules=[];

    const headTargetH=Math.round(usableH*0.42);
    // Georgia bold averages ~0.70 of em at peak weight; leave 8% margin headroom for morph.
    const headFontSize=Math.min(headTargetH, usableW*0.92/Math.max(headline.text.length*0.7,1));
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

    layout.rules.forEach(r=>{
      ctx.strokeStyle=r.color;
      ctx.lineWidth=r.thickness;
      ctx.beginPath();
      ctx.moveTo(r.x1,r.y); ctx.lineTo(r.x2,r.y);
      ctx.stroke();
    });

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

// Register for the Blend Lab (deduplicated by id)
window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);
