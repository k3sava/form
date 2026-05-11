// shared/philosophies/swiss.js — Swiss / International Typographic Style
'use strict';

window.FORM_PHILOSOPHY={
  id:'swiss',
  name:'Swiss',
  palette:{
    bg:    '#f5f1e8',
    fg:    '#0a0a0a',
    accent:'#c0392b',
    dim:   '#7a7a7a',
    blue:  '#1d4ed8',
  },
  controls:[
    {key:'cols',  label:'COLUMNS', min:6, max:18, def:12,  step:1,   fmt:v=>`${v|0}`},
    {key:'block', label:'BLOCK',   min:0, max:1,  def:0.8, step:0.05,fmt:v=>v.toFixed(2)},
    {key:'pulse', label:'PULSE',   min:0, max:1,  def:0.1, step:0.05,fmt:v=>v.toFixed(2)},
  ],
  defaults:{cols:12, block:0.8, pulse:0.1},

  layout(tree, format, params){
    const cols=params.cols|0;
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.06), marginY=Math.round(H*0.07);
    const cellW=(W-marginX*2)/cols;
    const rowH=cellW;
    const grid={cols, rowHeight:rowH, marginX, marginY, cellW};
    const beats=tree.beats;

    if(beats.length===0)return {grid, boxes:[], blocks:[]};

    const boxes=[];
    const blocks=[];
    const payoff=tree.payoff;
    const setupBeats=beats.filter((_,i)=>i!==payoff);
    const usable=H-marginY*2;

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

    if(params.block>0){
      const bx=marginX, by=Math.round(pY+pH*0.35);
      const bw=Math.round((W-marginX*2)*params.block);
      const bh=Math.round(pH*0.18);
      blocks.push({x:bx,y:by,w:bw,h:bh,color:this.palette.accent});
    }

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

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    const pulse=params.pulse*Math.sin(t*0.0008)*8;

    layout.blocks.forEach(b=>{
      ctx.fillStyle=b.color;
      ctx.fillRect(b.x, b.y+pulse, b.w, b.h);
    });

    layout.boxes.forEach(box=>{
      const beat=tree.beats[box.beatIndex];
      if(!beat)return;
      ctx.fillStyle=box.color;
      ctx.font=`${box.weight} ${box.fontSize|0}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
      ctx.textAlign=box.align;
      ctx.textBaseline='alphabetic';
      ctx.fillText(beat.text, box.x, box.y);
    });

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
