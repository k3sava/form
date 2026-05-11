// shared/philosophies/mycelium.js — text as living substrate; fibrous tendrils grow along strokes
'use strict';

(function(){
// Compact 2D Simplex noise (Gustavson) — used for tendril drift
const N = (function(){
  const F2=.5*(Math.sqrt(3)-1), G2=(3-Math.sqrt(3))/6;
  const pd=[151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180];
  const p=new Uint8Array(512);for(let i=0;i<512;i++)p[i]=pd[i&255];
  const g=[[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
  return {n2(xin,yin){
    const s=(xin+yin)*F2,i=Math.floor(xin+s),j=Math.floor(yin+s);
    const t=(i+j)*G2,X0=i-t,Y0=j-t,x0=xin-X0,y0=yin-Y0;
    const i1=x0>y0?1:0,j1=x0>y0?0:1;
    const x1=x0-i1+G2,y1=y0-j1+G2,x2=x0-1+2*G2,y2=y0-1+2*G2;
    const ii=i&255,jj=j&255;
    const g0=p[ii+p[jj]]&7,g1=p[ii+i1+p[jj+j1]]&7,g2=p[ii+1+p[jj+1]]&7;
    let n0=0,n1=0,n2=0;
    let t0=.5-x0*x0-y0*y0;if(t0>0){t0*=t0;n0=t0*t0*(g[g0][0]*x0+g[g0][1]*y0);}
    let t1=.5-x1*x1-y1*y1;if(t1>0){t1*=t1;n1=t1*t1*(g[g1][0]*x1+g[g1][1]*y1);}
    let t2=.5-x2*x2-y2*y2;if(t2>0){t2*=t2;n2=t2*t2*(g[g2][0]*x2+g[g2][1]*y2);}
    return 70*(n0+n1+n2);
  }};
})();

function lerp(a,b,t){return a+(b-a)*t;}

// Build a luminance bitmap of the phrase at the canvas size, using the same
// phrase-aware line-breaking + block-justification as every other mode.
// Each word renders at its block-justified font size so seed extraction
// follows the parser's structural intent (setup whisper vs payoff display).
const textCache = {key:'', lum:null};
const measureC = document.createElement('canvas');
const measureCtx = measureC.getContext('2d');
function fontSpec(sizePx){
  return `900 ${Math.max(1,sizePx|0)}px "Helvetica Neue","Arial Black",Helvetica,Arial,sans-serif`;
}
function measureWord(text, sizePx){
  measureCtx.font = fontSpec(sizePx);
  return measureCtx.measureText(text).width;
}

function getPhraseLum(tree, w, h){
  const cacheKey = ((tree && tree.raw) || '') + '|' + w + 'x' + h;
  if(textCache.key === cacheKey) return textCache.lum;

  const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
  const cx = oc.getContext('2d');
  cx.fillStyle = '#000'; cx.fillRect(0,0,w,h);

  // Lay out the phrase exactly as Editorial/Brutalist/Kinetic/Painterly do.
  const layout = (window.__formLayout && window.__formLayout.phraseBoxes) ? window.__formLayout.phraseBoxes(tree, {
    widthOf:  (word, intentScale, unit) => measureWord((word.w||'').toUpperCase(), unit * intentScale),
    heightOf: (intentScale, unit) => unit * intentScale * 0.78,
    interWordRatio: 0.35,
    lineGapRatio: 0.12,
    targetW: w * 0.88,
    targetH: h * 0.86,
    minUnit: 18, maxUnit: Math.round(h * 0.55),
    maxBlockScale: 2.4,
    alignX: 'center',
    cx: w/2, cy: h/2,
  }) : null;

  cx.fillStyle = '#fff';
  cx.textAlign = 'left';
  cx.textBaseline = 'alphabetic';

  if(layout && layout.boxes && layout.boxes.length){
    layout.boxes.forEach(b => {
      cx.font = fontSpec(b.unitPx);
      cx.fillText((b.word||'').toUpperCase(), b.x, b.baselineY);
    });
  } else {
    // fallback to single-line render if shared layout isn't available
    const text = ((tree && tree.beats) || []).map(b => b.text).join('. ').toUpperCase();
    let sz = h * 0.50;
    cx.font = fontSpec(sz);
    while(cx.measureText(text).width > w*0.88 && sz > 12){ sz *= 0.88; cx.font = fontSpec(sz); }
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    cx.fillText(text, w/2, h/2);
  }

  const img = cx.getImageData(0,0,w,h);
  const lum = new Float32Array(w*h);
  for(let i=0;i<lum.length;i++) lum[i] = img.data[i*4] / 255;
  textCache.key = cacheKey; textCache.lum = lum;
  return lum;
}

window.FORM_PHILOSOPHY = {
  id:'mycelium',
  name:'Mycelium',
  palette:{
    bg:    '#0a0a0a',
    fg:    '#dbb274',
    accent:'#f2c14e',
    dim:   '#8a7a4a',
  },
  controls:[
    {key:'count',label:'BRANCHES',min:20, max:400, def:140, step:10, fmt:v=>`${v|0}`},
    {key:'grow', label:'GROWTH',  min:0.5,max:4,   def:1.5, step:0.1,fmt:v=>v.toFixed(1)},
    {key:'wild', label:'DEVIANCE',min:0,  max:1,   def:0.3, step:0.01,fmt:v=>v.toFixed(2)},
  ],
  defaults:{count:140, grow:1.5, wild:0.3},

  _state:null,
  _lastKey:'',

  layout(tree, format, params){
    // The text bitmap is computed in render() against the live canvas size,
    // since branch state lives there too. Just carry the size + tree.
    return { tree, W: format.w, H: format.h };
  },

  render(ctx, layout, t, params, tree){
    const W = ctx.canvas.width, H = ctx.canvas.height;
    const cnt = Math.round(params.count);
    const grow = params.grow;
    const wild = params.wild;

    const lum = getPhraseLum(tree, W, H);

    // Perfect-loop cycle: 0..1 across CYCLE_MS.
    const CYCLE = window.CYCLE_MS || 15000;
    const phase = t > 0 ? (t % CYCLE) / CYCLE : 0;
    // Reset state at cycle start (or when phrase/size/count changes).
    const stateKey = ((tree && tree.raw) || '') + '|' + W + 'x' + H + '|' + cnt;
    const cycleId = Math.floor(t / CYCLE);
    const needReset = !this._state || this._lastKey !== stateKey || this._lastCycle !== cycleId;

    if(needReset){
      const seeds=[];
      for(let y=2;y<H-2;y++)for(let x=2;x<W-2;x++){
        if(lum[y*W+x]>.08){
          const isEdge = lum[y*W+x+1]<.05||lum[y*W+x-1]<.05||lum[(y+1)*W+x]<.05||lum[(y-1)*W+x]<.05;
          if(isEdge && Math.random()<.022) seeds.push([x,y]);
        }
      }
      const branches=[];
      for(let i=0;i<cnt;i++){
        const s = seeds.length ? seeds[Math.random()*seeds.length|0] : [W/2,H/2];
        const ang = Math.atan2(s[1]-H/2, s[0]-W/2) + Math.PI + (Math.random()-.5)*1.2;
        branches.push({
          x:s[0], y:s[1], ang, len:0,
          maxLen: 40 + Math.random()*80,
          alive:true,
          hue: 30 + Math.random()*40,
          alpha: Math.random()*.4 + .3,
        });
      }
      // segments[] records every stroke drawn during growth so unwind can
      // replay the formation in reverse (tips retract first, mirroring how
      // they extended outward from the letter edges).
      this._state = { n:cnt, branches, seeds, age:0, segments:[], lastKept:-1 };
      this._lastKey = stateKey;
      this._lastCycle = cycleId;
      ctx.fillStyle = this.palette.bg;
      ctx.fillRect(0,0,W,H);
    }

    const s = this._state;
    s.age++;
    // Branch advance must be proportional to elapsed virtual time so live
    // playback (60 fps live, ~16 ms/call) and offline export (24 fps,
    // ~42 ms/call) look the same for the same value of t.
    const _prevT = this._lastT;
    const _dt = (_prevT == null || _prevT > t) ? 16.6667 : Math.min(120, t - _prevT);
    this._lastT = t;
    const _timeScale = _dt / 16.6667;
    // Growth: 0.00–0.55 — branches extend, segments recorded.
    // Rest:   0.55–0.70 — formed word holds steady.
    // Unwind: 0.70–1.00 — tips retract toward seeds (reverse of growth).
    const growing = phase < 0.55;
    const fading  = phase >= 0.70;

    if(fading){
      // Replay segments[0 .. keepCount-1]. As phase advances 0.70→1.0, keepCount
      // drops from total→0, so the last-drawn segments (tips) vanish first.
      const fadeT = (phase - 0.70) / 0.30; // 0..1
      // Slight ease so the retraction accelerates toward the end.
      const eased = Math.pow(fadeT, 1.15);
      const total = s.segments.length;
      const keepCount = Math.max(0, Math.round(total * (1 - eased)));
      if(keepCount !== s.lastKept){
        ctx.fillStyle = this.palette.bg;
        ctx.fillRect(0,0,W,H);
        for(let i=0; i<keepCount; i++){
          const seg = s.segments[i];
          ctx.globalAlpha = seg.a;
          ctx.strokeStyle = seg.s;
          ctx.lineWidth   = seg.w;
          ctx.beginPath();
          ctx.moveTo(seg.x1, seg.y1);
          ctx.lineTo(seg.x2, seg.y2);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        s.lastKept = keepCount;
      }
      // Skip branch advancement during unwind.
      return;
    } else if(growing && s.age % 180 === 0){
      // Light periodic wash keeps the field from over-filling during growth.
      ctx.fillStyle='rgba(10,10,10,.15)';
      ctx.fillRect(0,0,W,H);
    }

    const step = grow * 0.3 * _timeScale;
    for(const b of s.branches){
      if(!b.alive)continue;
      ctx.save();
      ctx.globalAlpha = b.alpha * (.3 + Math.min(1, b.len/20) * .7);
      const bx=Math.max(0,Math.min(W-1,b.x|0)), by=Math.max(0,Math.min(H-1,b.y|0));

      // Sniff for the most-luminous nearby angle (follow ink density)
      let bestAng=b.ang, bestScore=0;
      for(let k=-3;k<=3;k++){
        const ta=b.ang + k*.4;
        const tx2=b.x+Math.cos(ta)*12, ty2=b.y+Math.sin(ta)*12;
        if(tx2>=0&&tx2<W&&ty2>=0&&ty2<H){
          const sc2 = lum[(ty2|0)*W + (tx2|0)] * (1 - Math.abs(k)*.1);
          if(sc2 > bestScore){ bestScore=sc2; bestAng=ta; }
        }
      }
      const angDrift = N.n2(b.x*.01, b.y*.01 + s.age*.005) * wild * 1.5;
      b.ang = lerp(b.ang, bestAng, .3) + angDrift*.08;

      const nx=b.x+Math.cos(b.ang)*step, ny=b.y+Math.sin(b.ang)*step;
      const px2=Math.max(0,Math.min(W-1,nx|0)), py2=Math.max(0,Math.min(H-1,ny|0));
      const nl = lum[py2*W + px2];

      const segStroke = `hsl(${b.hue|0},${(40+nl*30)|0}%,${(45+nl*30)|0}%)`;
      const segWidth  = .4 + nl*.6;
      const segAlpha  = ctx.globalAlpha;
      ctx.strokeStyle = segStroke;
      ctx.lineWidth = segWidth;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(nx, ny);
      ctx.stroke();
      // Record for reverse replay during unwind.
      s.segments.push({x1:b.x, y1:b.y, x2:nx, y2:ny, s:segStroke, w:segWidth, a:segAlpha});

      b.x = nx; b.y = ny; b.len += step;
      // Side-branch occasionally
      if(b.len > 20 && Math.random() < .005 * grow * _timeScale && s.branches.length < cnt*3){
        s.branches.push({
          ...b,
          ang: b.ang + (Math.random() > .5 ? 1 : -1) * .8,
          len: 0,
          maxLen: b.maxLen * .6,
          alpha: b.alpha * .7,
        });
      }
      // Respawn from stored outline seeds when a branch dies
      if(b.len >= b.maxLen || nx<0 || nx>=W || ny<0 || ny>=H){
        b.alive=false;
        if(s.seeds.length){
          const [sx,sy] = s.seeds[Math.random()*s.seeds.length|0];
          b.x = sx + (Math.random()*6-3);
          b.y = sy + (Math.random()*6-3);
        } else {
          b.x = Math.random()*W; b.y = Math.random()*H;
        }
        b.ang = Math.random()*Math.PI*2;
        b.len = 0; b.alive = true;
        b.maxLen = 40 + Math.random()*80;
      }
      ctx.restore();
    }
  },

  motion:{ kind:'organic', intensity:0.7, rate:0.5 },
};

// Register for the Blend Lab
window.__formAllPhilosophies = (window.__formAllPhilosophies||[])
  .filter(p=>p.id !== window.FORM_PHILOSOPHY.id)
  .concat([window.FORM_PHILOSOPHY]);

})();
