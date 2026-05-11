// shared/philosophies/blend.js — Blend Lab
// Loads all 5 philosophy modules sequentially. The page wires its own UI
// (5 weight sliders instead of the usual params row). Render picks the
// dominant philosophy's layout but mixes palette colors toward the 2nd-heaviest.

'use strict';

(function(){
  // Lab color blend helpers. Working in linear-ish RGB for simplicity.
  function hexToRgb(hex){
    if(!hex||typeof hex!=='string')return null;
    const m=/^#?([a-f\d]{6})/i.exec(hex);
    if(!m)return null;
    const n=parseInt(m[1],16);
    return [(n>>16)&255,(n>>8)&255,n&255];
  }
  function rgbToHex(r,g,b){
    return '#'+[r,g,b].map(v=>{
      const c=Math.max(0,Math.min(255,Math.round(v))).toString(16);
      return c.length===1?'0'+c:c;
    }).join('');
  }
  function lerpColor(a,b,t){
    const ra=hexToRgb(a), rb=hexToRgb(b);
    if(!ra||!rb)return a;
    return rgbToHex(ra[0]+(rb[0]-ra[0])*t, ra[1]+(rb[1]-ra[1])*t, ra[2]+(rb[2]-ra[2])*t);
  }

  window.FORM_BLEND_HELPERS={lerpColor,hexToRgb,rgbToHex};

  // The blend "philosophy" itself. Held until the page injects all 5 sub-modules
  // via window.__formAllPhilosophies (array of {id,name,palette,...}).
  window.FORM_PHILOSOPHY={
    id:'blend',
    name:'Blend',
    palette:{ bg:'#f0eee8', fg:'#0a0a0a', accent:'#c0392b', dim:'#7a7a7a' },
    controls:[
      {key:'swiss',     label:'SWISS',     min:0, max:1, def:0.5, step:0.01, fmt:v=>v.toFixed(2)},
      {key:'editorial', label:'EDITORIAL', min:0, max:1, def:0.3, step:0.01, fmt:v=>v.toFixed(2)},
      {key:'brutalist', label:'BRUTALIST', min:0, max:1, def:0.2, step:0.01, fmt:v=>v.toFixed(2)},
      {key:'kinetic',   label:'KINETIC',   min:0, max:1, def:0.0, step:0.01, fmt:v=>v.toFixed(2)},
      {key:'painterly', label:'PAINTERLY', min:0, max:1, def:0.0, step:0.01, fmt:v=>v.toFixed(2)},
    ],
    defaults:{swiss:0.5, editorial:0.3, brutalist:0.2, kinetic:0.0, painterly:0.0},

    layout(tree, format, params){
      const all=window.__formAllPhilosophies||[];
      if(!all.length){
        // No modules loaded yet — fall back to a trivial layout
        return {boxes:[], pending:true};
      }
      // Pick dominant philosophy by weight
      const entries=[
        {id:'swiss',     w:params.swiss},
        {id:'editorial', w:params.editorial},
        {id:'brutalist', w:params.brutalist},
        {id:'kinetic',   w:params.kinetic},
        {id:'painterly', w:params.painterly},
      ].sort((a,b)=>b.w-a.w);
      const dom=all.find(p=>p.id===entries[0].id) || all[0];
      const sub=all.find(p=>p.id===entries[1].id);
      const layout=dom.layout.call(dom, tree, format, dom.defaults || params);
      layout.__dom=dom; layout.__sub=sub;
      // Compute mix ratio between top-2
      const w1=entries[0].w, w2=entries[1].w;
      layout.__mix = w2/Math.max(w1+w2, 0.0001);
      return layout;
    },

    render(ctx, layout, t, params, tree){
      const dom=layout.__dom, sub=layout.__sub;
      if(!dom){
        const W=ctx.canvas.width, H=ctx.canvas.height;
        ctx.fillStyle='#f0eee8'; ctx.fillRect(0,0,W,H);
        ctx.fillStyle='#0a0a0a';
        ctx.font='400 16px Helvetica';
        ctx.textAlign='center';
        ctx.fillText('loading philosophies…', W/2, H/2);
        return;
      }
      // Render via the dominant module, but with a blended palette
      const palCopy=Object.assign({}, dom.palette);
      if(sub&&layout.__mix>0.01){
        Object.keys(palCopy).forEach(k=>{
          if(sub.palette[k]){
            palCopy[k]=window.FORM_BLEND_HELPERS.lerpColor(palCopy[k], sub.palette[k], layout.__mix);
          }
        });
      }
      // Swap palette temporarily on the module
      const origPal=dom.palette;
      dom.palette=palCopy;
      try{
        dom.render.call(dom, ctx, layout, t, dom.defaults || params, tree);
      } finally {
        dom.palette=origPal;
      }
    },

    motion:{ kind:'inherit', intensity:0.5, rate:0.5 },
  };
})();
