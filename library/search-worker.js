'use strict';
self.window=self;
let books, dictionary, indexed;
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const py=s=>norm(s).replace(/[1-5]/g,'');
self.onmessage=e=>{
  const {id,q,scope,lesson,volume}=e.data;
  try {
    if(!books){importScripts('../data/books.js');books=self.HSK_BOOKS.map(r=>({r,keys:r.slice(5,9).map(norm)}));}
    if((scope==='all'||scope==='dict')&&!dictionary){importScripts('../data/dictionary.js');dictionary=self.HSK_DICTIONARY;indexed=dictionary.map(r=>[norm(r[0]),py(r[1]),norm(r[2]),norm(r[3])]);}
    const n=norm(q),p=py(q),hits=[];
    let dictTotal=0,bookTotal=0;
    if(scope==='all'||scope==='dict'){
      const found=[];
      for(let i=0;i<dictionary.length;i++){
        const k=indexed[i];let score=Infinity;
        for(let f=0;f<4;f++){
          const needle=f===1?p:n;if(!needle||!k[f])continue;
          const rank=k[f]===needle?0:k[f].startsWith(needle)?10:k[f].includes(needle)?20:Infinity;
          score=Math.min(score,rank+(f===0?0:f===1?1:2));
        }
        if(score!==Infinity){dictTotal++;found.push({score,row:dictionary[i]});}
      }
      found.sort((a,b)=>a.score-b.score||a.row[0].length-b.row[0].length);
      hits.push(...found.slice(0,30).map(x=>({type:'dict',row:x.row})));
    }
    if(scope!=='dict'){
      const found=[];
      for(const {r,keys} of books){
        if(scope!=='all'&&r[0]!==scope||volume!=='all'&&r[1]!==volume||lesson!=='all'&&r[2]!==Number(lesson))continue;
        const f=keys.findIndex(k=>k&&k.includes(n));if(f<0)continue;
        bookTotal++;found.push({type:'book',row:r,field:f});
      }
      hits.push(...found.slice(0,60));
    }
    postMessage({id,hits,total:dictTotal+bookTotal,dictTotal,bookTotal});
  }catch(error){postMessage({id,error:error.message});}
};
