/* Audio bridge: lesson HTML owns its layout, questions, answers and explanations. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('hsk-media-data').textContent);
  const $ = id => document.getElementById(id);
  const integrated = !!$('im-audio');
  const audio = $('im-audio') || new Audio();
  audio.preload = 'metadata';
  if (!integrated) { audio.id = 'library-audio'; document.body.append(audio); }
  const fmt = ms => {
    ms = Math.round(ms);
    return `${String(Math.floor(ms / 60000)).padStart(2,'0')}:${String(Math.floor(ms / 1000) % 60).padStart(2,'0')}.${String(ms % 1000).padStart(3,'0')}`;
  };
  let current = 0, queue = [], segment = 0, generation = 0, timer, frame, option = false;
  let running = false;
  const importedUrls = new Map();
  const bar = document.createElement('section');
  bar.className = 'library-player';
  bar.setAttribute('aria-label','Nghe theo timeline gốc');
  bar.innerHTML = `<div class="library-transport"><button type="button" id="library-play">Phát</button><button type="button" id="library-repeat" title="Bấm rồi thả Option để nghe lại">Nghe lại · ⌥</button><label><input type="checkbox" id="library-loop"> Lặp</label><select id="library-rate" aria-label="Tốc độ nghe"><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option></select><span id="library-clock"></span></div><div id="library-range"></div><div id="library-error" role="status"></div>`;
  if (!integrated) {
    const parent = data.kind === 'sgk' ? $('reader').parentElement : $('study23to28-reader');
    parent.insertBefore(bar, data.kind === 'sgk' ? $('reader') : $('v10CommonReader'));
  }
  const playButton = integrated ? $('im-play') : bar.querySelector('#library-play');
  const repeatButton = integrated ? document.createElement('button') : bar.querySelector('#library-repeat');
  if (integrated) {
    repeatButton.type = 'button'; repeatButton.textContent = 'Nghe lại · ⌥';
    repeatButton.className = 'im-btn'; repeatButton.title = 'Bấm rồi thả Option để nghe lại';
    playButton.after(repeatButton);
  }
  const loop = integrated ? $('im-loop') : bar.querySelector('#library-loop');
  const rate = integrated ? $('im-rate') : bar.querySelector('#library-rate');
  const errorNode = integrated ? $('im-hint') : bar.querySelector('#library-error');
  const clock = integrated ? document.createElement('span') : bar.querySelector('#library-clock');
  if(integrated) { clock.id='library-clock'; repeatButton.after(clock); }
  const draftsKey = `hsk-library-drafts-${data.id}`;
  let drafts = {};
  try { drafts = JSON.parse(localStorage.getItem(draftsKey) || '{}'); } catch {}
  let dictation;
  if (!integrated && data.kind === 'sbt') {
    const box = document.createElement('details'); box.className='library-dictation';
    box.innerHTML='<summary>Chép chính tả</summary><textarea aria-label="Chép chính tả" placeholder="Gõ chữ Hán ở đây…"></textarea>';
    bar.append(box); dictation=box.querySelector('textarea');
    dictation.addEventListener('input',()=>{ drafts[current]=dictation.value; try { localStorage.setItem(draftsKey,JSON.stringify(drafts)); } catch {} });
  }
  function status() {
    if (integrated) playButton.innerHTML=running?'<span class="im-glyph">❚❚</span>':'<span class="im-glyph">▶</span>';
    else playButton.textContent=running?'Tạm dừng':'Phát';
    const cue=queue[segment];
    clock.textContent=cue?`${fmt(audio.currentTime*1000)} / ${fmt(cue.endMs)}`:'';
    if(integrated && cue) $('im-seek').value=String(Math.max(0,Math.min(1000,(audio.currentTime*1000-cue.startMs)/(cue.endMs-cue.startMs)*1000)));
  }
  function halt() { running=false; generation++; clearTimeout(timer);cancelAnimationFrame(frame);audio.pause();status(); }
  function showError(error) { halt(); errorNode.textContent='Không phát được MP3: '+error.message; }
  async function load(cue) {
    const track=data.tracks.find(t=>t.id===cue.trackId);
    if (!track) throw Error('Không có file ghép cho đoạn này.');
    if(!track.url && track.blob && !importedUrls.has(track.id)) importedUrls.set(track.id,URL.createObjectURL(track.blob));
    const url=track.url?new URL(track.url,location.href).href:importedUrls.get(track.id);
    if(!url)throw Error('File MP3 chưa có trên thiết bị này.');
    if(audio.src!==url) { audio.src=url;audio.load(); }
    if(audio.readyState<1) await new Promise((resolve,reject)=>{
      const done=()=>{clearTimeout(timeout);audio.removeEventListener('loadedmetadata',ok);audio.removeEventListener('error',bad);};
      const ok=()=>{done();resolve();}, bad=()=>{done();reject(Error('Không tải được '+track.name));};
      const timeout=setTimeout(()=>{done();reject(Error('Hết thời gian tải '+track.name));},20000);
      audio.addEventListener('loadedmetadata',ok,{once:true});audio.addEventListener('error',bad,{once:true});
    });
    if(cue.endMs>audio.duration*1000+1) throw Error('Mốc kết thúc vượt độ dài MP3; giữ nguyên timeline để kiểm tra.');
  }
  async function start(restart=true) {
    if(!queue.length)return;
    halt(); const token=generation;
    if(restart)segment=0;
    try {
      const cue=queue[segment]; await load(cue); if(token!==generation)return;
      if(restart||audio.currentTime*1000<cue.startMs||audio.currentTime*1000>=cue.endMs)audio.currentTime=cue.startMs/1000;
      audio.playbackRate=Number(rate.value); await audio.play();
      if(token!==generation){audio.pause();return;}
      running=true;errorNode.textContent='';status();schedule();tick();
    } catch(error) { if(token===generation)showError(error); }
  }
  function boundary() {
    if(!running)return;
    const cue=queue[segment];
    if(audio.currentTime*1000<cue.endMs){schedule();return;}
    audio.pause();
    if(segment+1<queue.length) { segment++;audio.currentTime=queue[segment].startMs/1000;start(false); }
    else if(loop.checked)start(true);
    else halt();
  }
  function schedule() {
    clearTimeout(timer);if(!running)return;
    const left=(queue[segment].endMs-audio.currentTime*1000)/audio.playbackRate;
    timer=setTimeout(boundary,Math.max(1,left));
  }
  function tick(){if(!running)return;status();boundary();frame=requestAnimationFrame(tick);}
  audio.addEventListener('timeupdate',()=>{if(running){status();boundary();}});
  audio.addEventListener('ended',boundary);
  audio.addEventListener('error',()=>{if(running)showError(Error('Không tải được âm thanh.'));});
  audio.addEventListener('ratechange',()=>{if(running)schedule();});
  const intercept=(node,fn)=>node.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();fn();},true);
  intercept(playButton,()=>running?halt():start(false));intercept(repeatButton,()=>start(true));
  rate.addEventListener('change',()=>{audio.playbackRate=Number(rate.value);});
  if(integrated){
    intercept($('im-stop'),()=>{halt();segment=0;if(queue[0])audio.currentTime=queue[0].startMs/1000;status();});
    $('im-seek').addEventListener('input',e=>{e.stopImmediatePropagation();const c=queue[segment];if(c)audio.currentTime=(c.startMs+(c.endMs-c.startMs)*Number(e.target.value)/1000)/1000;schedule();status();},true);
  }
  function selected() {
    return data.kind==='sbt'?Number(document.querySelector('#v10-global-nav [aria-current="true"][data-q]')?.dataset.q||1):Number(document.querySelector('#steps [aria-current="step"]')?.dataset.step||1);
  }
  function sync() {
    const n=selected();if(n===current)return;
    halt();current=n;segment=0;
    queue=data.cues.filter(c=>data.kind==='sbt'?c.question===n:c.paragraph===n);
    // Questions 12/14 reuse the preceding passage, then play their own question cue.
    if(data.kind==='sbt'&&[12,14].includes(n))queue=[...data.cues.filter(c=>c.question===n-1),...queue];
    bar.hidden=!queue.length;playButton.disabled=repeatButton.disabled=!queue.length;
    if(dictation)dictation.value=drafts[n]||'';
    const label=queue.map(c=>`${fmt(c.startMs)} – ${fmt(c.endMs)}`).join(' · ');
    if(integrated)$('im-range').textContent=label||'Chưa ghép mốc nghe';
    else bar.querySelector('#library-range').textContent=label;
    if(queue.length){const token=generation;load(queue[0]).then(()=>{if(token===generation){audio.currentTime=queue[0].startMs/1000;status();}}).catch(e=>{if(token===generation)showError(e);});}
  }
  const nav=data.kind==='sbt'?$('v10-global-nav'):$('steps');
  document.addEventListener('library-map-change',e=>{
    data.tracks=e.detail.tracks;
    data.cues=Object.entries(e.detail.map).filter(([,c])=>c.trackId&&Number.isFinite(+c.start)&&+c.end>+c.start).map(([q,c])=>({question:Number(q),trackId:c.trackId,startMs:Math.round(c.start*1000),endMs:Math.round(c.end*1000)}));
    current=0;sync();
  });
  new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
  if(data.kind==='sgk') {
    new MutationObserver(()=>{if($('split').hidden)halt();}).observe($('split'),{attributes:true,attributeFilter:['hidden']});
  }
  document.addEventListener('keydown',e=>{
    if(e.key!=='Alt')option=false;
    if(e.key==='Alt'&&!e.repeat&&!e.isComposing&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey){option=true;return;}
    if(e.code==='Space'&&!e.target.closest('input,textarea,select,[contenteditable]')&&!e.altKey&&!e.ctrlKey&&!e.metaKey&&queue.length){e.preventDefault();e.stopImmediatePropagation();running?halt():start(false);}
  },true);
  document.addEventListener('keyup',e=>{if(e.key==='Alt'&&option&&!e.isComposing){option=false;if(queue.length)start(true);}},true);
  window.addEventListener('blur',()=>option=false);document.addEventListener('compositionstart',()=>option=false);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)halt();});
  window.addEventListener('pagehide',halt);
  const header=document.querySelector('.toolbar')||document.querySelector('.topbar')||document.body;
  const menuStyle=document.createElement('style');
  menuStyle.textContent='.library-lesson-menu{font:12px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:inherit}.library-lesson-menu select{padding:7px 10px;border:1px solid #8884;border-radius:8px;background:transparent;color:inherit;font:inherit;max-width:170px;cursor:pointer}@media(max-width:620px){.library-lesson-menu select{max-width:130px}}';
  document.head.append(menuStyle);
  const home=document.createElement('a');home.href='../../';home.textContent='Home';home.title='Về trang thư viện và tra cứu';home.className='library-home';
  const menu=document.createElement('label');menu.className='library-lesson-menu';menu.title='Chuyển sang bài khác';
  menu.innerHTML=' <select aria-label="Chọn bài học"></select>';
  const lessonPicker=menu.querySelector('select');
  for(const [type,label] of [['sbt','SBT'],['sgk-khoa','SGK']]){
    const group=document.createElement('optgroup');group.label=label;
    const seen=new Set();
    for(const row of (window.HSK_BOOKS||[]).filter(item=>item[0]===type)){
      if(seen.has(row[2]))continue;seen.add(row[2]);
      const option=document.createElement('option');option.value=new URL('../../'+row[4],location.href).href;option.textContent=`${label} · Bài ${row[2]}`;
      if((data.kind==='sbt'?type==='sbt':type==='sgk-khoa')&&Number(row[2])===Number(data.lesson))option.selected=true;
      group.append(option);
    }
    lessonPicker.append(group);
  }
  lessonPicker.addEventListener('change',()=>{if(lessonPicker.value)location.href=lessonPicker.value;});
  header.append(home,menu);
  function navigate() {
    const hash=decodeURIComponent(location.hash.slice(1));
    const q=/^q(\d+)$/.exec(hash),p=/^para(\d+)$/.exec(hash);
    if(q)document.querySelector(`#v10-global-nav [data-q="${Number(q[1])}"]`)?.click();
    if(p)document.querySelector(`#steps [data-step="${Number(p[1])}"]`)?.click();
    if(hash.startsWith('study=')) {
      const alias={comparison:'compare',collocations:'colloc'};
      const sec=alias[hash.slice(6)]||hash.slice(6);
      $('studyEntry')?.click();
      const menu=$('studyMenuBtn');menu?.click();
      document.querySelector(`[data-open-section="${CSS.escape(sec)}"]`)?.click();
    }
  }
  window.addEventListener('hashchange',navigate);navigate();sync();
})();
