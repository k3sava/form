// shared/philosophies/swiss.js — GRID
// Operation: each letter rendered as a cellular construction on an inner R×C grid.
// Glyphs are sampled from a high-res offscreen render (8× supersample, threshold per cell).
// Inspired by GridType / Plaque Découpée Universelle, rebuilt with phrase-level layout.

'use strict';

(function(){
const offCanvas = document.createElement('canvas');
const off = offCanvas.getContext('2d');
const SUPER = 8;
const sampleCache = new Map();

function sampleGlyph(char, rows, cols, fontSpec){
  const key = char + '|' + rows + 'x' + cols + '|' + fontSpec;
  if(sampleCache.has(key)) return sampleCache.get(key);
  const w = cols*SUPER, h = rows*SUPER;
  offCanvas.width = w; offCanvas.height = h;
  off.fillStyle='#fff'; off.fillRect(0,0,w,h);
  off.fillStyle='#000';
  off.font = fontSpec.replace(/{SIZE}/, Math.round(h*0.86));
  off.textAlign='center'; off.textBaseline='middle';
  off.fillText(char, w/2, h*0.56);
  const img = off.getImageData(0,0,w,h).data;
  const map = [];
  for(let y=0;y<rows;y++){
    map[y]=[];
    for(let x=0;x<cols;x++){
      let s=0;
      for(let sy=0;sy<SUPER;sy++)for(let sx=0;sx<SUPER;sx++){
        const i = ((y*SUPER+sy)*w + (x*SUPER+sx))*4;
        s += (255 - img[i]);
      }
      map[y][x] = s / (SUPER*SUPER*255);
    }
  }
  sampleCache.set(key, map);
  if(sampleCache.size>600){ sampleCache.delete(sampleCache.keys().next().value); }
  return map;
}

function roundRect(ctx, x, y, w, h, r){
  if(ctx.roundRect){ ctx.beginPath(); ctx.roundRect(x,y,w,h,r); return; }
  r = Math.min(r, Math.min(w,h)/2);
  ctx.beginPath();
  ctx.moveTo(x+r,y);
  ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r);
  ctx.arcTo(x,y+h,x,y,r);
  ctx.arcTo(x,y,x+w,y,r);
  ctx.closePath();
}

const VOICES = {
  block:   '900 {SIZE}px "Helvetica Neue", Helvetica, "Arial Black", sans-serif',
  serif:   '900 {SIZE}px Georgia, "Times New Roman", serif',
  mono:    '700 {SIZE}px "JetBrains Mono", ui-monospace, monospace',
  outline: '300 {SIZE}px "Helvetica Neue", Helvetica, Arial, sans-serif',
};

window.FORM_PHILOSOPHY = {
  id:'swiss',
  name:'Grid',
  palette:{ bg:'#f3efe6', fg:'#0a0a0a', accent:'#c5371f', dim:'#7a7066' },
  controls:[
    {key:'rows',     label:'ROWS',      type:'slider', min:3,  max:11, def:7,    step:1,    fmt:v=>`${v|0}`},
    {key:'cols',     label:'COLUMNS',   type:'slider', min:3,  max:11, def:5,    step:1,    fmt:v=>`${v|0}`},
    {key:'gap',      label:'GAP',       type:'slider', min:0,  max:2.5,def:1.0,  step:0.05, fmt:v=>v.toFixed(2)},
    {key:'threshold',label:'THRESHOLD', type:'slider', min:0.05,max:0.7,def:0.32,step:0.01, fmt:v=>v.toFixed(2)},
    {key:'smooth',   label:'SMOOTH',    type:'slider', min:0,  max:1,  def:0.18, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'stroke',   label:'STROKE',    type:'slider', min:0.4,max:1.0,def:0.86, step:0.02, fmt:v=>v.toFixed(2)},
    {key:'shape',    label:'CELL',      type:'select', options:['square','circle','cross','dash'], def:'square', fmt:v=>v},
    {key:'voice',    label:'VOICE',     type:'select', options:['block','serif','mono','outline'], def:'block', fmt:v=>v},
    {key:'baseline', label:'BASELINE',  type:'check',  def:false, fmt:v=>v?'on':'off'},
    {key:'invert',   label:'INVERT',    type:'check',  def:false, fmt:v=>v?'on':'off'},
  ],
  defaults:{rows:7, cols:5, gap:1.0, threshold:0.32, smooth:0.18, stroke:0.86, shape:'square', voice:'block', baseline:false, invert:false},
  interactiveKey:'threshold',
  interactiveRange:[0.10, 0.55],

  layout(tree, format, params){
    const W=format.w, H=format.h;
    const rows = Math.max(3, params.rows|0);
    const cols = Math.max(3, params.cols|0);
    const gapCells = params.gap;
    const fontSpec = VOICES[params.voice] || VOICES.block;
    const beats = tree && tree.beats || [];
    let phrase = beats.map(b=>b.text).join('  ');
    if(!phrase) phrase = 'FORM';
    phrase = phrase.toUpperCase();
    const chars = [];
    for(let i=0;i<phrase.length;i++){
      const ch = phrase[i];
      if(ch===' ') chars.push({char:' ', space:true, w:cols*0.5});
      else chars.push({char:ch, space:false, w:cols});
    }
    const targetW = W*0.92, targetH = H*0.88;

    // Find largest cellSize that fits the phrase via greedy word-wrap
    let cellSize = 2, lines = [chars];
    const maxTry = Math.floor(targetW/Math.max(cols,1));
    for(let trySize = maxTry; trySize >= 2; trySize--){
      const maxLineCells = targetW / trySize;
      const cand = [];
      let line=[], lineW=0;
      for(let i=0;i<chars.length;i++){
        const c=chars[i];
        const proposed = lineW + (line.length?gapCells:0) + c.w;
        if(proposed > maxLineCells && line.length){
          cand.push(line); line=[]; lineW=0;
          if(c.space) continue;
        }
        line.push(c);
        lineW += (line.length>1?gapCells:0) + c.w;
      }
      if(line.length) cand.push(line);
      const lineHeightCells = rows + gapCells*0.8;
      const totalH = cand.length * lineHeightCells * trySize;
      if(totalH <= targetH){ cellSize = trySize; lines = cand; break; }
    }

    const lineHeightPx = (rows + gapCells*0.8) * cellSize;
    const totalH = lines.length * lineHeightPx;
    const yStart = (H - totalH)/2;

    const placed = [];
    lines.forEach((lineChars, li)=>{
      let lineWpx = 0;
      lineChars.forEach((c,i)=>{
        lineWpx += c.w*cellSize;
        if(i<lineChars.length-1) lineWpx += gapCells*cellSize;
      });
      const xStart = (W - lineWpx)/2;
      let cursorX = xStart;
      const yLine = yStart + li*lineHeightPx;
      lineChars.forEach((c,i)=>{
        if(!c.space){
          const map = sampleGlyph(c.char, rows, cols, fontSpec);
          placed.push({char:c.char, map, x:cursorX, y:yLine});
        }
        cursorX += c.w*cellSize;
        if(i<lineChars.length-1) cursorX += gapCells*cellSize;
      });
    });
    return { glyphs:placed, cellSize, rows, cols };
  },

  render(ctx, layout, t, params, tree){
    const W=ctx.canvas.width, H=ctx.canvas.height;
    const inverted = params.invert;
    const bg = inverted?this.palette.fg:this.palette.bg;
    const fg = inverted?this.palette.bg:this.palette.fg;
    ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
    const {glyphs, cellSize, rows, cols} = layout;
    if(!glyphs || !cellSize) return;

    if(params.baseline){
      ctx.strokeStyle = inverted?'rgba(255,255,255,.10)':'rgba(0,0,0,.10)';
      ctx.lineWidth = 1;
      glyphs.forEach(g=>{
        for(let y=0;y<=rows;y++){
          ctx.beginPath();
          ctx.moveTo(g.x, g.y + y*cellSize);
          ctx.lineTo(g.x + cols*cellSize, g.y + y*cellSize);
          ctx.stroke();
        }
        for(let x=0;x<=cols;x++){
          ctx.beginPath();
          ctx.moveTo(g.x + x*cellSize, g.y);
          ctx.lineTo(g.x + x*cellSize, g.y + rows*cellSize);
          ctx.stroke();
        }
      });
    }

    const threshold = params.threshold;
    const strokeF = params.stroke;
    const r = params.smooth * 0.5 * cellSize * strokeF;
    const shape = params.shape;
    ctx.fillStyle = fg;

    glyphs.forEach(g=>{
      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const v = g.map[y][x];
          if(v < threshold) continue;
          const cx = g.x + (x+0.5)*cellSize;
          const cy = g.y + (y+0.5)*cellSize;
          const sz = cellSize * strokeF;
          drawShape(ctx, shape, cx, cy, sz, r);
        }
      }
    });
  },

  motion:{ kind:'static', intensity:0, rate:0 },
};

function drawShape(ctx, shape, cx, cy, sz, r){
  const half = sz/2;
  if(shape==='circle'){
    ctx.beginPath(); ctx.arc(cx,cy,half,0,Math.PI*2); ctx.fill();
  } else if(shape==='cross'){
    const arm = sz*0.95, t = sz*0.32;
    ctx.fillRect(cx-arm/2, cy-t/2, arm, t);
    ctx.fillRect(cx-t/2, cy-arm/2, t, arm);
  } else if(shape==='dash'){
    ctx.fillRect(cx-sz/2, cy-sz*0.16, sz, sz*0.32);
  } else {
    if(r>0.5){ roundRect(ctx, cx-half, cy-half, sz, sz, r); ctx.fill(); }
    else { ctx.fillRect(cx-half, cy-half, sz, sz); }
  }
}

window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
