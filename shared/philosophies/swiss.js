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

// Phrase-aware line break. Dynamic programming over word indices.
// Cost = sum of (rag_imbalance)^2 + (1 / max(breakScore, 1)) * penalty.
// Prefers breaks at high-score points; secondarily balances line widths.
function phraseLineBreak(wordWidths, breakAfter, maxLineCells, interWord){
  const N = wordWidths.length;
  // memo[i] = { cost, breaks (list of word indexes BEFORE which line breaks, ending list of arrays of word indices) }
  // Each "line" is a contiguous wordIdx range.
  const memo = new Array(N+1);
  memo[N] = { cost: 0, lines: [] };

  // For each starting index i, find best line: try each ending j (inclusive), test fit, recurse.
  for(let i = N-1; i >= 0; i--){
    let bestCost = Infinity;
    let bestLine = null;
    let bestRest = null;
    let lineW = 0;
    for(let j = i; j < N; j++){
      lineW += (j===i ? 0 : interWord) + wordWidths[j];
      if(lineW > maxLineCells && j > i) break; // doesn't fit (i==j: single word over-width — accept anyway)
      const isLast = (j === N-1);
      const fillRatio = lineW / maxLineCells;
      // Very soft rag — typographers freely break short for meaning.
      const ragCost = isLast ? 0 : Math.pow(1 - fillRatio, 2) * 12;
      // Break score dominates. A break in the middle of a phrase is very expensive.
      const breakSc = isLast ? 100 : breakAfter[j];
      const breakPenalty = isLast ? 0 : Math.pow(100 - breakSc, 2) * 0.5;
      // Skipped-break penalty: a line that absorbs a high-score break point
      // (e.g. groups a setup with its payoff) pays for it. Without this, the
      // DP picks combined "is now" over isolated "is | now".
      let skippedBreakPenalty = 0;
      for(let k = i; k < j; k++){
        if(breakAfter[k] >= 90){
          skippedBreakPenalty += Math.pow(breakAfter[k] - 50, 2) * 0.4;
        }
      }
      const restCost = isLast ? 0 : memo[j+1].cost;
      const totalCost = ragCost + breakPenalty + skippedBreakPenalty + restCost;
      if(totalCost < bestCost){
        bestCost = totalCost;
        bestLine = [i, j];
        bestRest = isLast ? [] : memo[j+1].lines;
      }
    }
    if(!bestLine){
      bestLine = [i, i];
      bestRest = memo[i+1] ? memo[i+1].lines : [];
      bestCost = Infinity;
    }
    memo[i] = { cost: bestCost, lines: [bestLine].concat(bestRest) };
  }

  // Convert [start, end] pairs into arrays of word indices per line
  return memo[0].lines.map(([a, b]) => {
    const arr = [];
    for(let k=a;k<=b;k++) arr.push(k);
    return arr;
  });
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
    // Tokenise into WORDS preserving beat boundaries + carrying intent metadata.
    // Each word's intentScale modulates its physical cell-size on the canvas.
    const wordObjs = [];
    (tree && tree.beats || []).forEach((beat, bi)=>{
      const tokens = (beat.tokens && beat.tokens.length) ? beat.tokens : beat.words.map(w=>({w}));
      tokens.forEach((tok, ti)=>{
        const upperWord = (tok.w||'').toUpperCase();
        wordObjs.push({
          chars: upperWord.split(''),
          word: upperWord.toLowerCase(),
          beatIndex: bi,
          isBeatStart: ti===0,
          isBeatEnd: ti===tokens.length-1,
          intentScale: tok.intentScale || 1.0,
          intentRole:  tok.intentRole  || null,
        });
      });
    });
    if(!wordObjs.length){
      const fallback = (phrase||'FORM').split(/\s+/).filter(Boolean);
      fallback.forEach((w,i)=>wordObjs.push({chars:w.toUpperCase().split(''), word:w.toLowerCase(), beatIndex:0, isBeatStart:i===0, isBeatEnd:i===fallback.length-1, intentScale:1.0, intentRole:null}));
    }
    if(!wordObjs.length) return { glyphs:[], cellSize:2, rows, cols };

    // Each word's "footprint" in cells = chars * cols * intentScale.
    // Inter-word gap stays at cols*0.6.
    const interWord = cols * 0.6;
    const wordWidths = wordObjs.map(w => w.chars.length * cols * w.intentScale);
    // Each word's vertical footprint in cells = rows * intentScale.
    const wordHeights = wordObjs.map(w => rows * w.intentScale);

    // Break-score AFTER word i. Higher = stronger preference to break here.
    //  - 100 after beat-end (post-punctuation): forced
    //  - 95 before a PAYOFF token (let it land alone on its own line)
    //  - high score if next word is a conjunction / "to" / auxiliary verb
    //  - low score otherwise
    const breakAfter = wordObjs.map((w, i)=>{
      if(i === wordObjs.length-1) return 0;
      if(w.isBeatEnd) return 100;
      const next = wordObjs[i+1];
      // PAYOFF isolation — break BEFORE any word with a strong intent role so it lands alone.
      if(next.intentRole && ['antonym-payoff','payoff','imperative','time','time-payoff','question'].includes(next.intentRole)) return 95;
      const breakSc = window.__parse && window.__parse.breakScoreBefore
        ? window.__parse.breakScoreBefore(next.word, w.word) : 10;
      return breakSc;
    });

    const targetW = W*0.92, targetH = H*0.88;

    // Block-justification: after lines are chosen, scale each line so its width
    // matches the widest line's natural width. "less is" and "more" then sit
    // on the same block edge; "more" still dwarfs its setup line per-letter.
    // Capped to keep very short lines from exploding vertically.
    const MAX_BLOCK_SCALE = 3.5;
    function blockScales(lines){
      const widths = lines.map(idxs=>{
        let w = 0;
        idxs.forEach((wi, i)=>{
          w += wordWidths[wi];
          if(i < idxs.length-1) w += interWord;
        });
        return w;
      });
      const target = Math.max(...widths);
      return { widths, target, scales: widths.map(w => Math.min(MAX_BLOCK_SCALE, target / w)) };
    }

    // Pick largest cellSize where breaks are all "natural" (score >= 60).
    // Fall back to lower break-quality threshold if no size satisfies the strict one.
    let cellSize = 16, lines = null, lineScale = null;
    const maxTry = Math.floor(targetW / Math.max(cols,1));
    // Floor cellSize at 16 so the 5×7 grid can keep S/8 and G/O distinguishable.
    // Below that, glyphs collapse into ambiguous cell patterns.
    const minTry = 16;
    function tryFit(minBreakScore){
      for(let trySize = maxTry; trySize >= minTry; trySize--){
        const maxLineCells = targetW / trySize;
        if(wordWidths.some(w => w > maxLineCells)) continue;
        const cand = phraseLineBreak(wordWidths, breakAfter, maxLineCells, interWord);
        const bs = blockScales(cand);
        // Block-scaled line widths must fit
        const widestPx = bs.target * trySize;
        if(widestPx > targetW) continue;
        const lineHeights = cand.map((lineIdxs, li)=>{
          const maxH = Math.max(...lineIdxs.map(wi => wordHeights[wi])) * bs.scales[li];
          return (maxH + gapCells*0.8);
        });
        const totalH = lineHeights.reduce((s,h)=>s+h, 0) * trySize;
        if(totalH > targetH) continue;
        // Verify each break is at least "natural"
        const allBreaksOk = cand.slice(0, -1).every((line, li)=>{
          const lastWi = line[line.length-1];
          return breakAfter[lastWi] >= minBreakScore;
        });
        if(allBreaksOk) return { cellSize: trySize, lines: cand, scales: bs.scales };
      }
      return null;
    }
    // Try strictest first, then relax — preserves natural breaks but doesn't shrink unnecessarily
    let fit = tryFit(60) || tryFit(40) || tryFit(20) || tryFit(0);
    if(fit){ cellSize = fit.cellSize; lines = fit.lines; lineScale = fit.scales; }
    if(!lines){
      cellSize = minTry;
      lines = [wordObjs.map((_,i)=>i)];
      lineScale = [1];
    }

    // Compute per-line heights in pixels (block-scaled) and total
    const linePxH = lines.map((lineIdxs, li)=>{
      const maxH = Math.max(...lineIdxs.map(wi => wordHeights[wi])) * lineScale[li];
      return (maxH + gapCells*0.8) * cellSize;
    });
    const totalHpx = linePxH.reduce((s,h)=>s+h, 0);
    const yStart = (H - totalHpx) / 2;

    const placed = [];
    let yCursor = yStart;
    lines.forEach((wordIdxs, li)=>{
      const lineHpx = linePxH[li];
      const ls = lineScale[li];
      // Line width in pixels after block scaling
      let lineWpx = 0;
      wordIdxs.forEach((wi, i)=>{
        lineWpx += wordWidths[wi] * cellSize * ls;
        if(i < wordIdxs.length-1) lineWpx += interWord * cellSize * ls;
      });
      const xStart = (W - lineWpx) / 2;
      let cursorX = xStart;
      wordIdxs.forEach((wi, i)=>{
        const wObj = wordObjs[wi];
        // Local cell size for THIS word — intentScale × block-scale for the line.
        const localCell = cellSize * wObj.intentScale * ls;
        const wordPxH = rows * localCell;
        // Vertical-align word inside the line's baseline (bottom-aligned)
        const yBase = yCursor + lineHpx - (gapCells*0.8 * cellSize) - wordPxH;
        wObj.chars.forEach(ch=>{
          const map = sampleGlyph(ch, rows, cols, fontSpec);
          placed.push({ char:ch, map, x:cursorX, y:yBase, cell:localCell, role:wObj.intentRole });
          cursorX += cols * localCell;
        });
        if(i < wordIdxs.length-1) cursorX += interWord * cellSize * ls;
      });
      yCursor += lineHpx;
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
        const c = g.cell || cellSize;
        for(let y=0;y<=rows;y++){
          ctx.beginPath();
          ctx.moveTo(g.x, g.y + y*c);
          ctx.lineTo(g.x + cols*c, g.y + y*c);
          ctx.stroke();
        }
        for(let x=0;x<=cols;x++){
          ctx.beginPath();
          ctx.moveTo(g.x + x*c, g.y);
          ctx.lineTo(g.x + x*c, g.y + rows*c);
          ctx.stroke();
        }
      });
    }

    // When Animate is on, threshold breathes ±0.09 over exactly one CYCLE_MS.
    // sin(2π × phase) → perfect loop at phase 0 and phase 1.
    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    const breathing = t > 0 ? Math.sin(phase * Math.PI * 2) * 0.09 : 0;
    const threshold = Math.max(0.02, Math.min(0.85, params.threshold + breathing));
    const strokeF = params.stroke;
    const shape = params.shape;
    ctx.fillStyle = fg;

    glyphs.forEach(g=>{
      const c = g.cell || cellSize;
      const r = params.smooth * 0.5 * c * strokeF;
      for(let y=0;y<rows;y++){
        for(let x=0;x<cols;x++){
          const v = g.map[y][x];
          if(v < threshold) continue;
          const cx = g.x + (x+0.5)*c;
          const cy = g.y + (y+0.5)*c;
          const sz = c * strokeF;
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
