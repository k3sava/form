// shared/parse.js — phrase parser for FORM
// Heuristic parser runs immediately. compromise.js loads on demand for
// POS annotation; while it's loading, philosophies have a usable tree.

'use strict';

let nlp=null;
let nlpPromise=null;

function loadNLP(){
  if(nlp)return Promise.resolve(nlp);
  if(nlpPromise)return nlpPromise;
  nlpPromise=new Promise((res,rej)=>{
    const s=document.createElement('script');
    s.src='https://unpkg.com/compromise@14/builds/compromise.js';
    s.onload=()=>{ nlp=window.nlp; res(nlp); };
    s.onerror=()=>rej(new Error('failed to load compromise.js'));
    document.head.appendChild(s);
  });
  return nlpPromise;
}

function countSyllables(word){
  word=word.toLowerCase().replace(/[^a-z]/g,'');
  if(!word)return 0;
  if(word.length<=3)return 1;
  word=word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/,'');
  word=word.replace(/^y/,'');
  const m=word.match(/[aeiouy]{1,2}/g);
  return m?m.length:1;
}

function detectCaps(text){
  const letters=text.replace(/[^a-zA-Z]/g,'');
  if(!letters)return 'mixed';
  const upper=letters.replace(/[^A-Z]/g,'').length;
  if(upper===letters.length)return 'all';
  const words=text.split(/\s+/).filter(w=>/[a-zA-Z]/.test(w));
  if(words.length>0&&words.every(w=>/^[A-Z]/.test(w)))return 'title';
  if(/^[A-Z]/.test(text)&&upper/letters.length<.3)return 'sentence';
  return 'mixed';
}

function detectTone(raw){
  const t=raw.trim();
  if(/\?$/.test(t))return 'question';
  if(/!$/.test(t))return 'exclaim';
  const startsWithVerb=/^(go|do|make|stop|run|find|build|come|see|look|listen|breathe|move|begin|stay|leave|wait|love|fight|seek|wake|rise|fall|push|pull|hold|let|let's|let's|try|think|wonder|imagine|consider|notice|remember|forget|feel|reach|trust|believe)\b/i.test(t);
  if(startsWithVerb)return 'imperative';
  if(/\.$/.test(t))return 'statement';
  return 'fragment';
}

function beatify(text){
  const parts=text.split(/[.,;:!?]\s*/).map(s=>s.trim()).filter(Boolean);
  return parts;
}

// English stop-words (lowercased). Anything in here scores low for content emphasis.
const STOPWORDS=new Set([
  'a','an','the','is','am','are','was','were','be','been','being','will','would','could','should','may','might','must','shall','can',
  'do','does','did','have','has','had','having',
  'of','in','on','at','to','for','from','by','with','about','against','between','into','through','during','before','after','above','below','up','down','out','off','over','under','again','further','then','once',
  'and','or','but','not','no','nor','so','as','if','because','while','until','than','though','although',
  'this','that','these','those','i','you','he','she','it','we','they','me','him','her','us','them','my','your','his','its','our','their','mine','yours','hers','ours','theirs',
  'what','which','who','whom','whose','where','when','why','how','any','some','all','each','every','very','just','too','also',
]);

// Score one word's emphasis on 0..1. Length, stop-word membership, position, and special flags drive it.
function scoreWord(word, indexInBeat, totalInBeat){
  const w=word.replace(/[^a-zA-Z0-9]/g,'').toLowerCase();
  if(!w)return 0;
  if(STOPWORDS.has(w))return 0.12;
  const len=Math.min(1, w.length/8);
  const positional=(indexInBeat===totalInBeat-1)?0.18:0;
  const allCaps=/^[A-Z]{2,}$/.test(word);
  const hasDigit=/\d/.test(word);
  const properNoun=indexInBeat>0 && /^[A-Z]/.test(word);
  const flag=(allCaps||hasDigit||properNoun)?0.25:0;
  return Math.max(0, Math.min(1, 0.32 + len*0.42 + positional + flag));
}

function buildBeat(text){
  const words=text.split(/\s+/).filter(Boolean);
  const syllables=words.reduce((s,w)=>s+countSyllables(w),0);
  const tokens=words.map((w,i)=>({
    w,
    pos:null,
    emphasis: scoreWord(w, i, words.length),
    syllables: countSyllables(w),
    isStop: STOPWORDS.has(w.replace(/[^a-zA-Z0-9]/g,'').toLowerCase()),
  }));
  return {
    text, words, tokens,
    syllables,
    emphasis: 0.5,
  };
}

function detectPattern(beats){
  if(beats.length<=1)return 'single';
  const lens=beats.map(b=>b.words.length);
  const max=Math.max(...lens), min=Math.min(...lens);
  if(max-min<=1)return `parallel-${beats.length}`;
  if(beats.length>=3&&lens.every(l=>l<=3))return 'list';
  return 'freeform';
}

function assignEmphasis(beats, pattern){
  if(beats.length===1){ beats[0].emphasis=0.9; return; }
  beats.forEach((b,i)=>{ b.emphasis=0.4+0.1*i/beats.length; });
  beats[beats.length-1].emphasis=0.95;
  beats.forEach(b=>{
    const allCaps=b.words.filter(w=>/^[A-Z]{2,}$/.test(w));
    if(allCaps.length===b.words.length)return;
    if(allCaps.length>0)b.emphasis=Math.max(b.emphasis, 0.9);
  });
}

function basicParse(text){
  const raw=text;
  const beatTexts=beatify(text);
  const beats=beatTexts.map(buildBeat);
  if(beats.length===0)beats.push(buildBeat(text||''));
  const pattern=detectPattern(beats);
  assignEmphasis(beats,pattern);
  const tone=detectTone(text);
  const caps=detectCaps(text);
  const payoff=beats.reduce((iMax,b,i,arr)=>b.emphasis>arr[iMax].emphasis?i:iMax,0);
  return { raw, beats, pattern, tone, payoff, caps };
}

async function richParse(text){
  await loadNLP();
  const tree=basicParse(text);
  if(!nlp)return tree;
  try{
    const doc=nlp(text);
    const terms=doc.terms().out('array');
    const tags =doc.terms().out('tags');
    tree.beats.forEach(b=>{
      b.tokens=b.tokens.map(t=>{
        const idx=terms.indexOf(t.w);
        if(idx>=0&&tags[idx]){
          const tagSet=Object.keys(tags[idx]);
          t.pos=tagSet[0]||null;
        }
        return t;
      });
    });
  }catch(e){}
  return tree;
}

window.__parse={
  basic: basicParse,
  rich: richParse,
  load: loadNLP,
};
