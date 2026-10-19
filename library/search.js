(() => {
  'use strict';
  const $=id=>document.getElementById(id), input=$('q'),results=$('results');
  const worker=new Worker('library/search-worker.js');
  const make=(tag,text,cls)=>{const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(cls)n.className=cls;return n;};
  const pinyin=text=>(text||'').replace(/([a-züv:]+)([1-5])/gi,(_,raw,tone)=>{
    const syllable=raw.replace(/u:|v/gi,'ü');if(tone==='5')return syllable;
    const lower=syllable.toLowerCase();let i=lower.indexOf('a');
    if(i<0)i=lower.indexOf('e');if(i<0&&lower.includes('ou'))i=lower.indexOf('o');
    if(i<0)for(let n=lower.length-1;n>=0;n--)if('iouü'.includes(lower[n])){i=n;break;}
    if(i<0)return syllable;
    const marks={a:'āáǎà',e:'ēéěè',i:'īíǐì',o:'ōóǒò',u:'ūúǔù',ü:'ǖǘǚǜ'};
    let vowel=marks[lower[i]][Number(tone)-1];if(syllable[i]!==lower[i])vowel=vowel.toUpperCase();
    return syllable.slice(0,i)+vowel+syllable.slice(i+1);
  });
  let scope='all',serial=0,timer,curatedPromise;
  const stateKey='hsk-library-search-v2';let saved={};
  try{saved=JSON.parse(sessionStorage.getItem(stateKey)||'{}');}catch{}
  for(let i=1;i<=18;i++)$('lesson').add(new Option('Bài '+i,i));
  const lockLabel=make('label');const lock=document.createElement('input');lock.type='checkbox';lockLabel.append(lock,' Khóa phạm vi');$('lesson').after(lockLabel);
  const scopeButtons=[...document.querySelectorAll('[data-scope]')];
  function save(){sessionStorage.setItem(stateKey,JSON.stringify({q:input.value,scope,lesson:$('lesson').value,volume:$('volume').value,lock:lock.checked,scroll:window.scrollY}));}
  function filters(){scopeButtons.forEach(b=>{b.classList.toggle('active',b.dataset.scope===scope);b.disabled=lock.checked;});for(const id of ['lesson','volume'])$(id).disabled=lock.checked||scope==='dict';save();}
  lock.addEventListener('change',filters);
  scopeButtons.forEach(b=>b.addEventListener('click',()=>{scope=b.dataset.scope;filters();search();}));
  for(const id of ['lesson','volume'])$(id).addEventListener('change',search);
  input.addEventListener('input',()=>{serial++;clearTimeout(timer);timer=setTimeout(search,200);});
  $('clear').addEventListener('click',()=>{input.value='';search();input.focus();});
  results.addEventListener('click',e=>{const b=e.target.closest('[data-example]');if(b){input.value=b.dataset.example;search();}});
  function search(){
    clearTimeout(timer);save();const id=++serial;
    if(!input.value.trim()){results.replaceChildren(make('div','Nhập từ để tìm trong phạm vi đã chọn.','blank'));$('count').textContent='';return;}
    $('state').textContent='Đang tìm…';
    worker.postMessage({id,q:input.value.trim(),scope,lesson:$('lesson').value,volume:$('volume').value});
  }
  function highlight(n,text){
    const q=input.value.trim();const start=text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase());
    if(start<0||!q){n.textContent=text;return;}
    n.append(text.slice(0,start),make('mark',text.slice(start,start+q.length)),text.slice(start+q.length));
  }
  function snippet(text){const q=input.value.trim().toLocaleLowerCase();let i=text.toLocaleLowerCase().indexOf(q);i=Math.max(0,i-45);return (i?'…':'')+text.slice(i,i+220)+(text.length>i+220?'…':'');}
  let lastTrigger;
  async function openDict(row,trigger){
    lastTrigger=trigger;$('modalcontent').replaceChildren(make('h2',row[0]),make('div',pinyin(row[1]),'tag'),make('p',row[2]||'Chưa có nghĩa tiếng Anh.'));
    if(row[3]){const d=make('details'),s=make('summary','Tiếng Việt');d.append(s,make('p',row[3]));$('modalcontent').append(d);}
    $('modal').classList.add('open');$('close').focus();
    if(row[4]){
      if(!curatedPromise)curatedPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='data/curated.js';s.onload=resolve;s.onerror=()=>reject(Error('Không tải được giải thích'));document.head.append(s);});
      try{await curatedPromise;if(!$('modal').classList.contains('open')||document.querySelector('#modalcontent h2')?.textContent!==row[0])return;
        const data=window.HSK_CURATED?.[row[0]];for(const sense of data?.senses||[]){const el=make('div',undefined,'sense');el.append(make('strong',sense.pos||''),make('p',sense.en||''));const vi=make('details');vi.append(make('summary','Nghĩa Việt & cách dùng'),make('p',sense.vi||''));if(sense.pattern)vi.append(make('p',sense.pattern));for(const ex of sense.examples||[])vi.append(make('p',[ex.zh,ex.pinyin,ex.en,ex.vi].filter(Boolean).join(' · ')));el.append(vi);$('modalcontent').append(el);}
      }catch(error){$('modalcontent').append(make('p',error.message));}
    }
  }
  function close(){$('modal').classList.remove('open');lastTrigger?.focus();}
  $('close').addEventListener('click',close);$('modal').addEventListener('click',e=>{if(e.target===$('modal'))close();});document.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
  worker.onmessage=e=>{
    const response=e.data;if(response.id!==serial)return;
    results.replaceChildren();$('state').textContent=lock.checked?'Đã khóa phạm vi':'Từ điển trước · Bài học sau';
    if(response.error){results.append(make('div',response.error,'blank'));return;}
    $('count').textContent=`${response.total.toLocaleString('vi-VN')} kết quả`;
    let group='';
    for(const hit of response.hits){
      if(group!==hit.type){group=hit.type;results.append(make('h3',group==='dict'?'Từ điển':'Trong bài học','tag'));}
      const row=hit.row,box=make('div',undefined,'result'),detail=make('div');
      if(hit.type==='dict'){
        const button=make('button',row[0]);button.style.fontSize='22px';button.addEventListener('click',()=>openDict(row,button));detail.append(button,make('div',pinyin(row[1]),'mini'));
        const meaning=make('div',undefined,'snippet');highlight(meaning,row[2]||row[3]||'');detail.append(meaning);
      }else{
        const source={'sbt':'SBT','sgk-khoa':'SGK · Bài khóa','sgk-nguphap':'SGK · Ngữ pháp'}[row[0]];
        const link=make('a',`${source} Thượng · Bài ${row[2]} · ${row[3]}`);link.href=row[4];link.addEventListener('click',save);
        const desc=make('div',undefined,'snippet');highlight(desc,snippet(row[5+hit.field]));detail.append(link,desc);
      }
      box.append(detail);results.append(box);
    }
    if(!response.hits.length)results.append(make('div','Không có kết quả trong phạm vi này.','blank'));
    if(saved.scroll){window.scrollTo(0,saved.scroll);saved.scroll=0;}
  };
  worker.onerror=()=>{$('state').textContent='Không tải được tìm kiếm. Hãy tải lại trang.';};
  const books=window.HSK_BOOKS||[];
  for(const [kind,label] of [['sbt','Sách bài tập · Thượng'],['sgk-khoa','SGK · Bài khóa'],['sgk-nguphap','SGK · Ngữ pháp']]){
    const details=make('details'),summary=make('summary',label),grid=make('div',undefined,'lesson-grid');
    for(let n=1;n<=18;n++){const row=books.find(r=>r[0]===kind&&r[2]===n);if(row){const a=make('a','Bài '+n);a.href=row[4];a.addEventListener('click',save);grid.append(a);}}
    details.append(summary,grid);$('browse').append(details);
  }
  $('browse').firstElementChild.open=true;
  $('theme').addEventListener('click',()=>{document.body.classList.toggle('dim');localStorage.setItem('hsk-library-dim',document.body.classList.contains('dim'));});
  if(localStorage.getItem('hsk-library-dim')==='true')document.body.classList.add('dim');
  scope=saved.scope||'all';input.value=new URLSearchParams(location.search).get('q')||saved.q||'';$('lesson').value=saved.lesson||'all';$('volume').value=saved.volume||'all';lock.checked=!!saved.lock;filters();if(input.value)search();
  // Retire the former single-lesson app shell without deleting learner data.
  if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(rs=>rs.filter(r=>r.active?.scriptURL.endsWith('/hsk5-offline-sw.js')).forEach(r=>r.unregister()));
})();
