// shared/philosophies/kinetic.js — variable-font choreography
'use strict';

// Inter Variable is loaded by the page's <link> tag.

window.FORM_PHILOSOPHY={
  id:'kinetic',
  name:'Kinetic',
  palette:{
    bg:    '#0d0d10',
    fg:    '#f4f3f0',
    accent:'#26ff9d',
    dim:   '#5a5a60',
  },
  controls:[
    {key:'amp',   label:'AMPLITUDE',min:0,    max:1,    def:0.7, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'rate',  label:'RATE',     min:0.1,  max:2.5,  def:0.8, step:0.05, fmt:v=>v.toFixed(2)},
    {key:'spread',label:'SPREAD',   min:0,    max:1,    def:0.5, step:0.02, fmt:v=>v.toFixed(2)},
  ],
  defaults:{amp:0.7, rate:0.8, spread:0.5},

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const marginX=Math.round(W*0.06), marginY=Math.round(H*0.10);
    const usableW=W-marginX*2, usableH=H-marginY*2;
    if(tree.beats.length===0)return {lines:[]};

    // Treat the whole phrase as one line of glyphs, broken naturally on beat boundaries.
    // Each line carries an array of {char, beatIndex, isSpace}.
    const lines=[];
    const charLines=[];
    let curLine=[];
    tree.beats.forEach((b,bi)=>{
      // Add a soft break between beats with a wide non-glyph element
      if(curLine.length){ curLine.push({char:' ',space:true,beatIndex:bi-1}); curLine.push({char:' ',space:true,beatIndex:bi-1}); }
      for(let i=0;i<b.text.length;i++){
        curLine.push({char:b.text[i], space:b.text[i]===' ', beatIndex:bi});
      }
    });
    charLines.push(curLine);

    // Compute base font size to fit chars on one line
    const totalChars=charLines[0].length||1;
    let fontSize=Math.min(usableH*0.4, usableW/(totalChars*0.62));
    const baseY=Math.round(marginY+usableH*0.55);

    return {chars: charLines[0], fontSize, baseY, marginX, totalChars, usableW};
  },

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;

    ctx.fillStyle=this.palette.bg;
    ctx.fillRect(0,0,W,H);

    if(!layout.chars||layout.chars.length===0)return;

    const fs=layout.fontSize;
    const rate=params.rate;
    const amp=params.amp;
    const spread=params.spread;

    // Pre-measure: lay out each glyph with its current weight axis applied
    ctx.textBaseline='alphabetic';
    ctx.textAlign='left';
    let cursorX=layout.marginX;

    // Compute total width with min weights to center the line
    // To avoid double-measure (Canvas 2D's measureText is the bottleneck), just push from left.
    layout.chars.forEach((c,i)=>{
      // Per-glyph wght oscillates 200..900 over time with phase offset
      const phase=(i*spread*0.4) + t*0.001*rate;
      const wght=Math.round(200 + (700)*amp*(Math.sin(phase)*0.5+0.5));
      // Per-glyph baseline wobble (subtle)
      const wobble=Math.sin(phase*1.3+i*0.1)*amp*fs*0.04;
      const color=i===layout.chars.length-1?this.palette.accent:this.palette.fg;
      ctx.font=`${wght} ${fs|0}px "Inter", "InterVariable", "Inter Variable", "Helvetica Neue", Helvetica, sans-serif`;
      ctx.fillStyle=color;
      ctx.fillText(c.char, cursorX, layout.baseY+wobble);
      const w=ctx.measureText(c.char).width;
      cursorX += w + (c.space?fs*0.04:0);
      if(cursorX>W-layout.marginX*0.4)return; // soft clip
    });
  },

  motion:{ kind:'axes', intensity:0.7, rate:0.8 },
};

// Register for the Blend Lab (deduplicated by id)
window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);
