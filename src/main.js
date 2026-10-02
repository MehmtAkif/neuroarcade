const STORE='neuroarcade-v6';
const storage={
  get(key,fallback=''){try{return localStorage.getItem(key) ?? fallback}catch{return fallback}},
  set(key,value){try{localStorage.setItem(key,String(value))}catch{}}
};
function safeScores(){try{const raw=storage.get(STORE,'');const parsed=raw?JSON.parse(raw):{};return parsed&&typeof parsed==='object'&&!Array.isArray(parsed)?parsed:{}}catch{return {}}}
const state={
  scores:safeScores(),
  played:Number(storage.get(STORE+'-played','0')),
  xp:Number(storage.get(STORE+'-xp','0')),
  current:null,timer:null,interval:null,timeouts:[],cleanups:[],score:0,round:0,data:{},
  filter:'Tümü',search:'',finished:false
};
const $=id=>document.getElementById(id);

const cats=['Tümü','Hafıza','Hız','Dikkat','Esneklik','Problem','Matematik','Kelime'];
const catIcon={Hafıza:'🧠',Hız:'⚡',Dikkat:'🎯',Esneklik:'🔄',Problem:'🧩',Matematik:'➗',Kelime:'🔤'};
const names=[
['Grid Recall','Hafıza','Karelerin yerlerini kısa süreliğine ezberle.','gridRecall'],
['Pair Vault','Hafıza','Eşleşen sembol çiftlerini hafızadan bul.','pairVault'],
['Number Echo','Hafıza','Gösterilen sayı dizisini aynı sırayla yaz.','numberEcho'],
['Path Memory','Hafıza','Yanıp sönen yolu hatırla ve karelere doğru sırayla bas.','pathMemory'],
['Symbol Snapshot','Hafıza','Kısa görüntüdeki benzersiz sembolü sonra seç.','symbolSnapshot'],
['Color Sequence','Hafıza','Renk dizisini aklında tut ve aynısını gir.','colorSequence'],
['Quick Tap','Hız','Hedef belirdiğinde mümkün olduğunca hızlı tıkla.','quickTap'],
['Speed Match','Hız','Üstteki sembolle aynı olanı hızla seç.','speedMatch'],
['Target Hunt','Hız','Ekrandaki hedefi diğerlerinden önce yakala.','targetHunt'],
['Rapid Count','Hız','Kısa sürede ekrandaki doğru sayıyı hesapla.','rapidCount'],
['Symbol Sprint','Hız','Değişen sembole göre doğru tuşa bas.','symbolSprint'],
['Reaction Lane','Hız','Sinyali görünce doğru şeride geç.','reactionLane'],
['Odd One','Dikkat','Bir bakışta farklı olan kutuyu bul.','oddOne'],
['Color Filter','Dikkat','Sözcüğü değil, istenen özelliği takip et.','colorFilter'],
['Focus Five','Dikkat','Sadece hedef sembole dokun; dikkat dağıtıcıları yok say.','focusFive'],
['Train Switch','Dikkat','Hareket eden iki akışı takip edip doğru düğmeye bas.','trainSwitch'],
['No-Go Tap','Dikkat','Yeşile bas, kırmızıya basma.','noGoTap'],
['Split Focus','Dikkat','Aynı anda iki bilgiyi izle ve doğru seçimi yap.','splitFocus'],
['Rule Shift','Esneklik','Kural değiştikçe karar mekanizmanı da değiştir.','ruleShift'],
['Direction Flip','Esneklik','Ok yönüne veya tersine göre doğru tuşa bas.','directionFlip'],
['Letter Number','Esneklik','Hangi bilgi türünün geçerli olduğunu konumdan çıkar.','letterNumber'],
['Sort Shift','Esneklik','Değişen kurala göre kartları sınıflandır.','sortShift'],
['Reverse Mind','Esneklik','Komutun zıttını seç; kural değiştikçe adapte ol.','reverseMind'],
['Pattern Swap','Esneklik','Eşleşme ölçütü değiştikçe doğru çifti bul.','patternSwap'],
['Route Runner','Problem','Duvarlara takılmadan hedefe ulaşacak yolu planla.','routeRunner'],
['Tile Rotate','Problem','Karışmış karoları doğru yönde döndür.','tileRotate'],
['Bridge Builder','Problem','Parçaları ipuçlarına göre doğru sırayla yerleştir.','bridgeBuilder'],
['Lights Logic','Problem','Bir ışığa basınca komşuları değişir; hepsini söndür.','lightsLogic'],
['Math Blitz','Matematik','Hızlı aritmetik sorularını art arda çöz.','mathBlitz'],
['Word Scramble','Kelime','Karışmış harflerden kelimeyi bul.','wordScramble']
];
const games=names.map((x,i)=>({id:i+1,name:x[0],cat:x[1],desc:x[2],type:x[3]}));

const COLORS=[
  {name:'mavi',hex:'#38bdf8',emoji:'🔵'},
  {name:'mor',hex:'#a78bfa',emoji:'🟣'},
  {name:'yeşil',hex:'#86efac',emoji:'🟢'},
  {name:'sarı',hex:'#facc15',emoji:'🟡'},
  {name:'pembe',hex:'#fb7185',emoji:'🩷'}
];
const SHAPES=['●','■','▲','◆','★'];
const PAIR_SYMBOLS=['●','■','▲','◆','★','✚','✦','⬟','♥','☀','☂','♣','✿','◈','✹','⬢','⌁','☯'];

function save(){
  storage.set(STORE,JSON.stringify(state.scores));
  storage.set(STORE+'-played',state.played);
  storage.set(STORE+'-xp',state.xp);
  const keep=Object.keys(state.hist).sort().slice(-120);
  state.hist=Object.fromEntries(keep.map(k=>[k,state.hist[k]]));
  storage.set(STORE+'-hist',JSON.stringify(state.hist));
  storage.set(STORE+'-tour',JSON.stringify(state.tourDone));
}
function updateTop(){
  $('playedCount').textContent=state.played;
  $('xp').textContent=state.xp;
  $('streak').textContent=streak();
  $('lvlName').textContent=levelInfo(state.xp).name;
  const sb=$('soundBtn');if(sb){sb.textContent=state.sound?'🔊':'🔇';sb.setAttribute('aria-pressed',String(!state.sound));}
}
function setFilters(){
  const el=document.getElementById('filters');
  el.innerHTML=cats.map(c=>`<button type="button" class="filter ${state.filter===c?'active':''}" data-filter="${c}" data-cat="${c}">${c==='Tümü'?'':`<i></i>`}${c}</button>`).join('');
}
function renderGames(){
  const q=state.search.toLowerCase();
  const list=games.filter(g=>(state.filter==='Tümü'||g.cat===state.filter)&&(!q||(g.name+' '+g.cat+' '+g.desc).toLowerCase().includes(q)));
  document.getElementById('games').innerHTML=list.map(g=>{const best=state.scores[g.id]||0;return `<button type="button" class="tile" data-id="${g.id}" data-cat="${g.cat}" aria-label="${escapeHtml(g.name)} oyununu başlat"><div class="tileTop"><span class="tileIcon">${catIcon[g.cat]}</span><span class="tileNo">${String(g.id).padStart(2,'0')}</span></div><div class="tileBody"><span class="tileCat">${g.cat}</span><h3>${g.name}</h3><p>${g.desc}</p></div><div class="tileFoot"><span class="best">${best?`En iyi <b>${best}</b>`:'Henüz oynanmadı'}</span><span class="tileGo" aria-hidden="true">→</span></div></button>`;}).join('')
    ||'<div class="emptyGames">Eşleşen oyun bulunamadı.</div>';
}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function setArena(html){document.getElementById('arena').innerHTML=html;const lp=document.getElementById('gamePhase');if(lp&&lp.textContent.includes('Oyun yükleniyor'))lp.innerHTML='';}
function phase(text,sub=''){const el=document.getElementById('gamePhase');if(el)el.innerHTML=`<b>${text}</b>${sub?`<span>${sub}</span>`:''}`;}
function progress(round,total){const el=document.getElementById('roundProgress');if(el)el.style.width=`${clamp(round/total*100,0,100)}%`;const t=document.getElementById('roundText');if(t)t.textContent=`Tur ${Math.min(round,total)}/${total}`;}
function feedback(msg,good=true){const f=document.getElementById('feedback');f.textContent=msg;f.className='feedback '+(good?'ok':'err');}
function addScore(n,sourceEl=null){
  if(n>0)sfx('ok');else if(n<0)sfx('bad');
  state.score=Math.max(0,state.score+n);
  document.getElementById('score').textContent=state.score;
  if(sourceEl){
    const arena=document.getElementById('arena');
    const pop=document.createElement('div');
    pop.className=`scorePop ${n>=0?'positive':'negative'}`;
    pop.textContent=`${n>=0?'+':''}${n}`;
    const r=sourceEl.getBoundingClientRect(),ar=arena.getBoundingClientRect();
    pop.style.left=`${r.left-ar.left+r.width/2}px`;
    pop.style.top=`${r.top-ar.top}px`;
    arena.appendChild(pop);later(()=>pop.remove(),650);
  }
}
function later(fn,ms){const id=window.setTimeout(()=>{state.timeouts=state.timeouts.filter(x=>x!==id);fn();},ms);state.timeouts.push(id);return id;}
function cleanupTimers(){
  clearInterval(state.interval);state.interval=null;
  clearTimeout(state.timer);state.timer=null;
  state.timeouts.forEach(clearTimeout);state.timeouts=[];
  state.cleanups.forEach(fn=>fn());state.cleanups=[];
}
function startClock(seconds,onEnd){
  clearInterval(state.interval);
  let left=seconds;
  const timerEl=document.getElementById('timer');
  timerEl.textContent=`${left}s`;
  timerEl.classList.remove('urgent');
  state.interval=setInterval(()=>{
    left--;
    timerEl.textContent=`${left}s`;
    if(left<=5)timerEl.classList.add('urgent');
    if(left<=0){clearInterval(state.interval);state.interval=null;onEnd();}
  },1000);
}
function renderHUD(){
  const body=document.getElementById('gameBody');
  if(body)body.classList.add('gameLive');
}
function finish(reason='Tur tamamlandı'){ 
  if(state.finished)return;
  state.finished=true;cleanupTimers();
  const g=state.current;if(!g)return;
  const best=Math.max(state.score,state.scores[g.id]||0);
  state.scores[g.id]=best;
  state.played++;
  const gain=Math.max(5,Math.floor(state.score/10));
  state.xp+=gain;
  const dk=dayKey(),hd=state.hist[dk]||{n:0,xp:0};hd.n++;hd.xp+=gain;state.hist[dk]=hd;
  if(dailyPicks().some(p=>p.id===g.id)){const d=state.tourDone[dk]||[];if(!d.includes(g.id))d.push(g.id);state.tourDone[dk]=d;}
  save();updateTop();daily();sfx('win');
  phase('Sonuç',reason);
  setArena(`<div class="resultCard"><div class="resultIcon">${state.score>=100?'🏆':'🧠'}</div><div class="resultScore">${state.score}</div><div class="resultLabel">puan</div><div class="resultStats"><span>Bu tur <b>${state.score}</b></span><span>En iyi <b>${best}</b></span><span>XP <b>+${Math.max(5,Math.floor(state.score/10))}</b></span></div><div class="resultBtns"><button class="btn primary resultBtn" id="againBtn">Tekrar oyna</button></div></div>`);
  document.getElementById('againBtn').onclick=()=>startGame(g.id);
  tourNext(g);
  document.getElementById('timer').textContent='—';
  renderGames();
}
function showRuntimeError(err,g){
  console.error('NeuroArcade game error:',err);
  cleanupTimers();
  state.finished=true;
  const msg=err instanceof Error?err.message:String(err);
  phase('Oyun başlatılamadı',g?g.name:'NeuroArcade');
  setArena(`<div class="resultCard errorCard"><div class="resultIcon">⚠️</div><div class="resultLabel">Beklenmeyen bir hata oluştu</div><p class="errorMessage">${escapeHtml(msg)}</p><button class="btn primary resultBtn" id="retryGameBtn">Tekrar dene</button></div>`);
  const retry=document.getElementById('retryGameBtn');
  if(retry) retry.onclick=()=>startGame(g?.id);
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));}
function startGame(id){
  const g=games.find(x=>x.id===Number(id));
  if(!g){console.warn('Unknown game id:',id);return;}
  const launcher=GAME[g.type];
  if(typeof launcher!=='function'){console.error('Missing launcher:',g.type);return;}
  if(state.tourRun&&!state.tourRun.ids.includes(g.id))state.tourRun=null;
  try{
    cleanupTimers();state.finished=false;state.current=g;state.score=0;state.round=0;state.data={};
    document.getElementById('modal').classList.add('open');
    document.getElementById('gameTitle').textContent=g.name;
    document.getElementById('gameMeta').textContent=`${g.cat} · ${g.id}/30`;
    document.getElementById('score').textContent='0';document.getElementById('timer').textContent='—';
    document.getElementById('intro').textContent=g.desc;
    document.getElementById('feedback').textContent='';
    const bodyEl=document.getElementById('gameBody');
    if(bodyEl)bodyEl.classList.remove('gameLive');
    document.getElementById('arena').innerHTML='';
    phase('Hazırlanıyor','Oyun yükleniyor…');
    renderHUD();
    requestAnimationFrame(()=>{try{launcher();}catch(err){showRuntimeError(err,g);}});
  }catch(err){showRuntimeError(err,g);}
}

function wireUI(){
  const gamesEl=document.getElementById('games');
  document.getElementById('closeBtn').addEventListener('click',()=>{
    cleanupTimers();state.current=null;state.finished=false;state.tourRun=null;
    document.getElementById('modal').classList.remove('open');
    const url=new URL(location.href);url.searchParams.delete('game');history.replaceState({},'',url);
  });
  gamesEl.addEventListener('click',e=>{
    const card=e.target.closest('.tile');
    if(!card||!gamesEl.contains(card))return;
    startGame(card.dataset.id);
    const url=new URL(location.href);url.searchParams.set('game',card.dataset.id);history.replaceState({},'',url);
  });
  document.addEventListener('click',e=>{
    const filter=e.target.closest('[data-filter]');
    if(filter){state.filter=filter.dataset.filter;renderGames();return;}
  });
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){if($('progressModal').classList.contains('open'))closeProgress();else if(document.getElementById('modal').classList.contains('open'))document.getElementById('closeBtn').click();}
    if((e.key==='Enter'||e.key===' ')&&document.activeElement?.classList.contains('tile')){e.preventDefault();document.activeElement.click();}
  });
  document.getElementById('search').addEventListener('input',e=>{state.search=e.target.value;renderGames();});
  document.getElementById('quickBtn').addEventListener('click',()=>startGame(shuffle([1,7,13,19,25,29])[0]));
  document.getElementById('randomBtn').addEventListener('click',()=>startGame(rand(1,30)));
  $('progressBtn').addEventListener('click',openProgress);
  $('progressClose').addEventListener('click',closeProgress);
  $('progressModal').addEventListener('click',e=>{if(e.target===$('progressModal'))closeProgress();});
  $('soundBtn').addEventListener('click',()=>{state.sound=!state.sound;storage.set(STORE+'-sound',state.sound?'1':'0');updateTop();sfx('ok');});
}

function bootFromUrl(){
  const raw=new URLSearchParams(location.search).get('game');
  const id=Number(raw);
  if(Number.isInteger(id)&&id>=1&&id<=games.length)startGame(id);
}

function controlsHint(text){return `<div class="controlsHint">${text}</div>`;}
function roundShell({type='standard',title='',subtitle='',round,total,content}){
  return `<div class="gameStage ${type}"><div class="stageHead"><div><div class="eyebrow">${title}</div><div class="stageSubtitle">${subtitle}</div></div><span class="roundBadge" id="roundText">Tur ${round}/${total}</span></div><div class="roundBar"><i id="roundProgress" style="width:${clamp(round/total*100,0,100)}%"></i></div>${content}</div>`;
}
function buttonGrid(items,cls='choiceGrid'){return `<div class="${cls}">${items.map(x=>`<button class="choice" data-value="${x.value??x}">${x.label??x}</button>`).join('')}</div>`;}
function animateClick(el,good){el.classList.remove('good','bad','pop');void el.offsetWidth;el.classList.add(good?'good':'bad');later(()=>el.classList.remove('good','bad'),280);}
function uniqueScramble(word){let s=word;for(let i=0;i<8&&s===word;i++)s=shuffle(word.split('')).join('');return s;}

const GAME={
// 1
 gridRecall(){
  const total=6;
  state.data={round:1,grid:4,targets:0,active:[],locked:true,hits:0,startedAt:0};
  const play=()=>{
    const d=state.data, n=d.grid; progress(d.round,total); d.locked=true; d.hits=0;
    setArena(roundShell({type:'memory','title':'Kısa süreli bellek','subtitle':`${n}×${n} ızgara · ${Math.floor(n*n*.3)+d.round-1} hedef`,round:d.round,total,content:`<div id="memBoard" class="board memoryBoard" style="grid-template-columns:repeat(${n},1fr)"></div><div class="phasePill" id="memStatus">Ezberle</div>`}));
    const board=document.getElementById('memBoard');
    board.innerHTML=Array.from({length:n*n},(_,i)=>`<button class="cell memoryCell" data-i="${i}"></button>`).join('');
    const count=Math.min(n*n-3,Math.floor(n*n*.3)+d.round-1);
    d.targets=count;d.active=shuffle(Array.from({length:n*n},(_,i)=>i)).slice(0,count); d.startedAt=performance.now();
    d.active.forEach((idx,k)=>later(()=>document.querySelector(`[data-i="${idx}"]`)?.classList.add('reveal'),k*95));
    later(()=>{
      d.active.forEach(idx=>document.querySelector(`[data-i="${idx}"]`)?.classList.remove('reveal'));
      d.locked=false;document.getElementById('memStatus').textContent='Hatırla ve seç';phase('Seçim aşaması','Hedef kareleri bul');
      document.querySelectorAll('.memoryCell').forEach(cell=>cell.onclick=()=>{
        if(d.locked)return;
        const idx=+cell.dataset.i;
        if(d.active.includes(idx)){
          if(cell.classList.contains('selected'))return;
          cell.classList.add('selected');d.hits++;addScore(18,cell);feedback('Doğru kare.');
          if(d.hits===d.targets){const speed=Math.max(0,1800-(performance.now()-d.startedAt));addScore(35+Math.floor(speed/120));feedback('Tur temiz! Hız bonusu aldın.');d.locked=true;later(()=>{if(d.round>=total)finish('6 tur tamamlandı');else{d.round++;d.grid=Math.min(6,4+Math.floor(d.round/2));play();}},650);}
        }else{cell.classList.add('wrong');addScore(-12,cell);feedback('Yanlış kare.',false);later(()=>cell.classList.remove('wrong'),330);}
      });
    },Math.max(850,850+d.active.length*95));
  };
  phase('Tur 1','Kareleri ezberle');play();
 },
// 2
 pairVault(){
  const rounds=4; state.data={round:1,grid:4,deck:[],flipped:[],matched:0,locked:false,combo:0};
  const makeRound=()=>{
   const d=state.data,n=d.grid;progress(d.round,rounds);d.flipped=[];d.matched=0;d.combo=0;d.locked=false;
   const symbols=shuffle(PAIR_SYMBOLS).slice(0,n*n/2); d.deck=shuffle([...symbols,...symbols]);
   setArena(roundShell({title:'Eşleşme hafızası',subtitle:`${n}×${n} kart · çiftleri bul`,round:d.round,total:rounds,content:`<div id="pairBoard" class="choiceGrid pairBoard" style="grid-template-columns:repeat(${n},1fr)"></div><div class="memoryNote">İki kart aç · eşleşirse kilitlenir</div>`}));
   const board=document.getElementById('pairBoard');
   board.innerHTML=d.deck.map((s,i)=>`<button class="flipCard" data-i="${i}"><span class="cardBack">?</span><span class="cardFace">${s}</span></button>`).join('');
   const flip=el=>{if(d.locked||el.classList.contains('matched')||el.classList.contains('flipped'))return;el.classList.add('flipped');d.flipped.push(el);if(d.flipped.length<2)return;d.locked=true;const [a,b]=d.flipped;const same=d.deck[+a.dataset.i]===d.deck[+b.dataset.i];
    if(same){a.classList.add('matched');b.classList.add('matched');d.combo++;addScore(25+d.combo*5,a);feedback(`${d.combo}x combo · eşleşti!`);d.matched+=2;d.flipped=[];d.locked=false;if(d.matched===n*n){addScore(60+d.combo*10);later(()=>{if(d.round>=rounds)finish('Tüm kasalar açıldı');else{d.round++;d.grid=6;makeRound();}},600);}}
    else{d.combo=0;addScore(-8,b);feedback('Eşleşme yok.',false);later(()=>{a.classList.remove('flipped');b.classList.remove('flipped');d.flipped=[];d.locked=false;},620);}
   };
   board.querySelectorAll('.flipCard').forEach(c=>c.onclick=()=>flip(c));
  };
  phase('Hazır','İki aynı sembolü bul');makeRound();startClock(44,()=>finish('Süre doldu'));
 },
// 3
 numberEcho(){
  const rounds=7;state.data={round:1,seq:[],input:[],locked:true};
  const play=()=>{
   const d=state.data,len=Math.min(8,3+Math.floor((d.round-1)/2));progress(d.round,rounds);d.input=[];d.locked=true;
   d.seq=Array.from({length:len},()=>rand(0,9));
   setArena(roundShell({type:'memory','title':'Rakam yankısı',subtitle:`${len} hane · sırayı hatırla`,round:d.round,total:rounds,content:`<div class="echoDisplay" id="echoDisplay">—</div><div class="echoDots" id="echoDots">${d.seq.map((_,i)=>`<span id="ed${i}"></span>`).join('')}</div><div id="echoPad" class="numberPad hidden"></div>`}));
   const display=document.getElementById('echoDisplay');
   d.seq.forEach((num,i)=>later(()=>{display.textContent=num;display.classList.add('echoPulse');document.getElementById(`ed${i}`)?.classList.add('active');later(()=>display.classList.remove('echoPulse'),180);},i*470));
   later(()=>{phase('Şimdi gir','Sırayı değiştirme');document.getElementById('echoDisplay').textContent='?';const pad=document.getElementById('echoPad');pad.classList.remove('hidden');pad.innerHTML=Array.from({length:10},(_,v)=>`<button class="numKey" data-v="${v}">${v}</button>`).join('');d.locked=false;pad.onclick=e=>{const k=e.target.closest('.numKey');if(!k||d.locked)return;const v=+k.dataset.v,i=d.input.length;d.input.push(v);document.getElementById(`ed${i}`)?.classList.add(v===d.seq[i]?'hit':'miss');if(v!==d.seq[i]){addScore(-15,k);feedback('Sıra kırıldı.',false);d.locked=true;later(()=>{if(d.round>=rounds)finish('Dizi denemeleri tamamlandı');else{d.round++;play();}},420);return;}addScore(13,k);if(d.input.length===d.seq.length){addScore(32+len*4);feedback('Tam sıra!');d.locked=true;later(()=>{if(d.round>=rounds)finish('7 tur tamamlandı');else{d.round++;play();}},520);}};},len*470+180);
  };play();startClock(38,()=>finish('Süre doldu')); 
 },
// 4
 pathMemory(){
  const rounds=5;state.data={round:1,n:4,path:[],step:0,locked:true};
  const play=()=>{const d=state.data,n=d.n=4+Math.floor((d.round-1)/3);progress(d.round,rounds);d.step=0;d.locked=true;const len=Math.min(9,3+d.round);
   d.path=[];let cur=rand(0,n*n-1),seen=new Set([cur]);d.path.push(cur);while(d.path.length<len){const x=cur%n,y=Math.floor(cur/n),ne=[];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(nx>=0&&nx<n&&ny>=0&&ny<n){const ni=ny*n+nx;if(!seen.has(ni))ne.push(ni);}});if(!ne.length)break;cur=shuffle(ne)[0];seen.add(cur);d.path.push(cur);}
   setArena(roundShell({type:'memory','title':'Yol hafızası',subtitle:`${d.path.length} adımlık rota`,round:d.round,total:rounds,content:`<div id="pathBoard" class="pathGrid" style="grid-template-columns:repeat(${n},1fr)"></div><div id="pathStatus" class="phasePill">Yolu izle</div>`}));
   const board=document.getElementById('pathBoard');board.innerHTML=Array.from({length:n*n},(_,i)=>`<button class="pathCell" data-i="${i}"></button>`).join('');
   d.path.forEach((idx,i)=>later(()=>{const c=board.querySelector(`[data-i="${idx}"]`);c?.classList.add('path');later(()=>c?.classList.remove('path'),260);},i*330));
   later(()=>{phase('Şimdi sen','Aynı sırayı tekrar et');document.getElementById('pathStatus').textContent='Sırayı tekrar et';d.locked=false;board.onclick=e=>{const c=e.target.closest('.pathCell');if(!c||d.locked)return;const idx=+c.dataset.i,correct=idx===d.path[d.step];if(correct){c.classList.add('success');d.step++;addScore(18,c);if(d.step===d.path.length){addScore(45+d.path.length*5);feedback('Rota kusursuz!');d.locked=true;later(()=>{if(d.round>=rounds)finish('5 rota tamamlandı');else{d.round++;play();}},550);}}else{c.classList.add('fail');addScore(-16,c);feedback('Sıra bozuldu.',false);d.locked=true;later(()=>{if(d.round>=rounds)finish('Yanlış adım');else{d.round++;play();}},520);}};},d.path.length*330+230);
  };play();startClock(42,()=>finish('Süre doldu'));
 },
// 5
 symbolSnapshot(){
  const rounds=8;state.data={round:1,answer:null,locked:true};
  const play=()=>{const d=state.data,size=3+Math.floor(d.round/5);progress(d.round,rounds);const total=size*size,base=shuffle(SHAPES)[0],odd=shuffle(SHAPES.filter(s=>s!==base))[0],oddIndex=rand(0,total-1);d.answer=oddIndex;d.locked=true;
   setArena(roundShell({type:'memory','title':'Sembol anlık görüntü','subtitle':'Hangisi farklı?',round:d.round,total,content:`<div id="snapBoard" class="choiceGrid" style="grid-template-columns:repeat(${size},1fr)"></div><div id="snapStatus" class="phasePill">3 saniyelik görüntü</div>`}));
   const board=document.getElementById('snapBoard');board.innerHTML=Array.from({length:total},(_,i)=>`<button class="choice snapCell" data-i="${i}">${i===oddIndex?odd:base}</button>`).join('');
   board.classList.add('snapshotShow');later(()=>{board.classList.add('snapshotHide');document.getElementById('snapStatus').textContent='Farklıyı seç';phase('Seç','Görüntüyü hatırla');d.locked=false;board.onclick=e=>{const c=e.target.closest('.snapCell');if(!c)return;const ok=+c.dataset.i===d.answer;animateClick(c,ok);if(ok){addScore(28,c);feedback('Gözün iyi yakaladı!');d.locked=true;later(()=>{if(d.round>=rounds)finish('8 görüntü tamamlandı');else{d.round++;play();}},430);}else{addScore(-12,c);feedback('Bu o değil.',false);}};},1700+Math.max(0,d.round-1)*110);
  };play();startClock(32,()=>finish('Süre doldu'));
 },
// 6
 colorSequence(){
  const rounds=7;state.data={round:1,seq:[],input:[],locked:true};
  const play=()=>{const d=state.data,len=Math.min(5,3+Math.floor((d.round-1)/2));progress(d.round,rounds);d.seq=Array.from({length:len},(_,i)=>{const choices=COLORS.filter(c=>i===0||c.name!==d.seq?.[i-1]?.name);return choices[rand(0,choices.length-1)];});d.input=[];d.locked=true;
   setArena(roundShell({type:'memory','title':'Renk dizisi','subtitle':`${len} renk · sırayı koru`,round:d.round,total:rounds,content:`<div id="colorStage" class="colorStage"></div><div id="colorPad" class="colorPad hidden"></div>`}));
   const stage=document.getElementById('colorStage');stage.innerHTML=d.seq.map((c,i)=>`<div class="colorOrb" id="co${i}" style="--orb:${c.hex}"></div>`).join('');
   d.seq.forEach((c,i)=>later(()=>{const o=document.getElementById(`co${i}`);o.classList.add('active');later(()=>o.classList.remove('active'),260);},i*420));
   later(()=>{phase('Senin sıran','Renkleri aynı sırada tıkla');const pad=document.getElementById('colorPad');pad.classList.remove('hidden');pad.innerHTML=shuffle(COLORS).map(c=>`<button class="colorKey" style="--orb:${c.hex}" data-name="${c.name}">${c.emoji}<span>${c.name}</span></button>`).join('');d.locked=false;pad.onclick=e=>{const b=e.target.closest('.colorKey');if(!b||d.locked)return;const i=d.input.length,ok=b.dataset.name===d.seq[i].name;animateClick(b,ok);if(ok){d.input.push(b.dataset.name);addScore(15,b);if(d.input.length===d.seq.length){addScore(35+len*5);feedback('Renk dizisi tamam!');d.locked=true;later(()=>{if(d.round>=rounds)finish('7 dizi tamamlandı');else{d.round++;play();}},520);}}else{addScore(-13,b);feedback('Renk sırası bozuldu.',false);d.locked=true;later(()=>{if(d.round>=rounds)finish('Yanlış sıra');else{d.round++;play();}},500);}};},len*420+220);
  };play();startClock(40,()=>finish('Süre doldu'));
 },
// 7
 quickTap(){
  const rounds=8;state.data={round:0,waiting:true,spawn:0,best:Infinity};
  const q=()=>{state.data.round++;const d=state.data;progress(d.round,rounds);phase('Hazır ol','Hedef birazdan çıkacak…');setArena(roundShell({type:'reaction','title':'Refleks testi','subtitle':'Mavi hedef görünür görünmez bas',round:d.round,total:rounds,content:`<div id="tapArea" class="tapArea"><div id="tapMessage" class="tapMessage">Bekle…</div></div>`}));
   const area=document.getElementById('tapArea');d.waiting=true;const delay=rand(700,1700);d.spawn=performance.now()+delay;d.timer=state.timer=later(()=>{if(d.waiting===false)return;d.waiting=false;phase('ŞİMDİ!','Dokun!');const target=document.createElement('button');target.className='target targetPulse';target.setAttribute('aria-label','Hedef');target.style.left=`${rand(5,82)}%`;target.style.top=`${rand(7,70)}%`;area.appendChild(target);const started=performance.now();target.onclick=()=>{const ms=Math.round(performance.now()-started);d.best=Math.min(d.best,ms);const pts=clamp(90-Math.floor(ms/8),10,90);addScore(pts,target);feedback(`${ms} ms · ${pts} puan`);target.remove();if(d.round>=rounds)finish('8 reaksiyon tamamlandı');else later(q,360);};},delay);
  };
  q();startClock(32,()=>finish('Süre doldu'));
 },
// 8
 speedMatch(){
  const rounds=10;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const targetShape=shuffle(SHAPES)[0],targetColor=shuffle(COLORS)[0],mode=d.round%2===0?'RENK':'ŞEKİL';const decoyColors=shuffle(COLORS.filter(c=>c.name!==targetColor.name));const decoyShapes=shuffle(SHAPES.filter(s=>s!==targetShape));const opts=[{s:targetShape,c:targetColor},...Array.from({length:5},(_,i)=>({s:decoyShapes[i%decoyShapes.length],c:decoyColors[i%decoyColors.length]}))];
   setArena(roundShell({title:'Hız eşleştirme',subtitle:`Ölçüt: ${mode}`,round:d.round,total:rounds,content:`<div class="matchPrompt"><div class="matchBadge">${mode}</div><div class="matchTarget" style="--orb:${targetColor.hex}">${targetShape}</div></div><div class="choiceGrid speedChoices">${shuffle(opts).map(o=>`<button class="choice matchChoice" data-s="${o.s}" data-c="${o.c.name}" style="--orb:${o.c.hex}">${o.s}</button>`).join('')}</div>`}));
   const correct=mode==='RENK'?targetColor.name:targetShape;document.querySelectorAll('.matchChoice').forEach(b=>b.onclick=()=>{const ok=(mode==='RENK'?b.dataset.c: b.dataset.s)===correct;animateClick(b,ok);if(ok){d.combo++;addScore(17+d.combo*3,b);feedback(`${d.combo}x combo`);}else{d.combo=0;addScore(-9,b);feedback('Yanlış eşleştirme.',false);}if(d.round>=rounds)later(()=>finish('10 eşleştirme tamamlandı'),260);else later(q,230);});
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 9
 targetHunt(){
  const rounds=9;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const size=4+Math.floor(d.round/4),total=size*size,target=rand(0,total-1),icon=shuffle(['◆','●','▲','★'])[0];
   setArena(roundShell({type:'hunt','title':'Hedef avı',subtitle:'Kalabalıktaki tek hedefi yakala',round:d.round,total:rounds,content:`<div id="huntBoard" class="huntBoard" style="grid-template-columns:repeat(${size},1fr)"></div>`}));
   const board=document.getElementById('huntBoard');board.innerHTML=Array.from({length:total},(_,i)=>{const decoys=SHAPES.filter(s=>s!==icon);return `<button class="huntCell ${i===target?'targetCell':''}" data-i="${i}">${i===target?icon:shuffle(decoys)[0]}</button>`;}).join('');
   const tc=board.querySelector('.targetCell');later(()=>tc?.classList.add('huntPulse'),80);
   board.onclick=e=>{const c=e.target.closest('.huntCell');if(!c)return;const ok=+c.dataset.i===target;animateClick(c,ok);if(ok){d.combo++;addScore(20+d.combo*4,c);feedback(`${d.combo}x av · temiz!`);if(d.round>=rounds)finish('9 hedef yakalandı');else later(q,250);}else{d.combo=0;addScore(-10,c);feedback('Yanlış nesne.',false);}};
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 10
 rapidCount(){
  const rounds=9;state.data={round:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const count=rand(5,8)+Math.floor(d.round/2),dots=Array.from({length:count},()=>shuffle(['●','●','●','◆','●'])[0]);
   setArena(roundShell({title:'Hızlı sayım',subtitle:'Bir saniyelik görüntüyü say',round:d.round,total:rounds,content:`<div id="countStage" class="countStage">${dots.map((s,i)=>`<span style="--d:${i*45}ms">${s}</span>`).join('')}</div><div id="countAnswers" class="answerGrid hidden"></div>`}));
   later(()=>{const a=document.getElementById('countAnswers');a.classList.remove('hidden');phase('Cevapla',`${count} nesne gördün mü?`);const opts=shuffle([count,count-1,count+1,count+2]);a.innerHTML=opts.map(v=>`<button class="answer" data-v="${v}">${v}</button>`).join('');a.onclick=e=>{const b=e.target.closest('.answer');if(!b)return;const ok=+b.dataset.v===count;animateClick(b,ok);ok?addScore(25,b):addScore(-10,b);feedback(ok?'Doğru sayım.':'Sayımı kaçırdın.',ok);if(d.round>=rounds)later(()=>finish('9 sayım tamamlandı'),350);else later(q,250);};},850);
  };q();startClock(28,()=>finish('Süre doldu'));
 },
// 11
 symbolSprint(){
  const rounds=12;state.data={round:0,combo:0,symbol:null,correct:null,handler:null};
  const mapping={ '●':'A','■':'S','▲':'D','◆':'F','★':'G' };
  const q=()=>{
   const d=state.data;d.round++;d.symbol=shuffle(SHAPES)[0];d.correct=mapping[d.symbol];progress(d.round,rounds);
   setArena(roundShell({type:'reaction','title':'Sembol sprinti','subtitle':'Sembolün tuşuna mümkün olduğunca hızlı bas',round:d.round,total:rounds,content:`<div class="bigPrompt sprintSymbol">${d.symbol}</div><div class="keyRow">${Object.entries(mapping).map(([sym,key])=>`<button class="keyCap" data-v="${key}"><span>${sym}</span><b>${key}</b></button>`).join('')}</div>${controlsHint('Klavye: A · S · D · F · G')}`}));
   const handler=e=>{const key=e.key.toUpperCase();if(!Object.values(mapping).includes(key)||state.current?.type!=='symbolSprint')return;const btn=document.querySelector(`.keyCap[data-v="${key}"]`),ok=key===d.correct;if(!btn)return;animateClick(btn,ok);if(ok){d.combo++;addScore(16+d.combo*2,btn);feedback(`${d.combo}x combo · doğru!`);}else{d.combo=0;addScore(-8,btn);feedback('Yanlış tuş.',false);}window.removeEventListener('keydown',handler);d.handler=null;if(d.round>=rounds)later(()=>finish('12 sembol tamamlandı'),280);else later(q,180);};
   if(d.handler)window.removeEventListener('keydown',d.handler);d.handler=handler;window.addEventListener('keydown',handler);state.cleanups.push(()=>{if(d.handler)window.removeEventListener('keydown',d.handler);});
   document.querySelectorAll('.keyCap').forEach(b=>b.onclick=()=>handler({key:b.dataset.v}));
  };
  q();startClock(34,()=>finish('Süre doldu'));
 },
// 12
 reactionLane(){
  const rounds=8;state.data={round:0,locked:true};
  const q=()=>{const d=state.data;d.round++;d.locked=true;progress(d.round,rounds);const lane=rand(0,2), delay=rand(650,1500);
   setArena(roundShell({type:'reaction','title':'Reaksiyon şeridi',subtitle:'Yeşil sinyal geldiğinde doğru şeride bas',round:d.round,total:rounds,content:`<div class="lanes" id="lanes">${[0,1,2].map(i=>`<button class="lane" data-i="${i}"><span>${i+1}</span></button>`).join('')}</div><div id="laneSignal" class="signal">Bekle…</div>`}));
   const fire=()=>{d.locked=false;document.getElementById('laneSignal').textContent='ŞİMDİ!';document.getElementById('laneSignal').classList.add('go');document.getElementById('lanes').classList.add('armed');};later(fire,delay);
   document.querySelectorAll('.lane').forEach(b=>b.onclick=()=>{if(d.locked){addScore(-8,b);feedback('Erken bastın!',false);b.classList.add('early');later(()=>b.classList.remove('early'),300);return;}const ok=+b.dataset.i===lane;animateClick(b,ok);ok?addScore(30,b):addScore(-12,b);feedback(ok?'Şerit yakalandı.':'Yanlış şerit.',ok);d.locked=true;if(d.round>=rounds)later(()=>finish('8 reaksiyon tamamlandı'),350);else later(q,350);});
  };q();startClock(33,()=>finish('Süre doldu'));
 },
// 13
 oddOne(){
  const rounds=9;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const size=3+Math.floor((d.round-1)/3),total=size*size,base=shuffle(COLORS)[0],odd=shuffle(COLORS.filter(c=>c.name!==base.name))[0],index=rand(0,total-1);
   setArena(roundShell({title:'Tek farklı',subtitle:'Renk farkı giderek küçülüyor',round:d.round,total:rounds,content:`<div id="oddBoard" class="choiceGrid" style="grid-template-columns:repeat(${size},1fr)"></div>`}));
   const board=document.getElementById('oddBoard');board.innerHTML=Array.from({length:total},(_,i)=>`<button class="colorTile ${i===index?'odd':''}" data-i="${i}" style="--tile:${i===index?odd.hex:base.hex}"></button>`).join('');
   board.onclick=e=>{const b=e.target.closest('.colorTile');if(!b)return;const ok=+b.dataset.i===index;animateClick(b,ok);if(ok){d.combo++;addScore(20+d.combo*4,b);feedback('Farkı gördün!');if(d.round>=rounds)finish('9 tur tamamlandı');else later(q,250);}else{d.combo=0;addScore(-10,b);feedback('Yaklaştın ama o değil.',false);}};
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 14
 colorFilter(){
  const rounds=10;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const word=shuffle(COLORS)[0],ink=shuffle(COLORS.filter(c=>c.name!==word.name))[0],rule=d.round%2?'YAZININ RENGİ':'YAZININ KENDİSİ',answer=rule==='YAZININ RENGİ'?ink.name:word.name;
   setArena(roundShell({title:'Renk filtresi',subtitle:`Kural: ${rule}`,round:d.round,total:rounds,content:`<div class="stroopCard"><div class="stroopLabel">${word.name.toUpperCase()}</div><div class="stroopWord" style="color:${ink.hex}">${word.name.toUpperCase()}</div></div>${buttonGrid(COLORS.map(c=>({label:c.emoji+' '+c.name,value:c.name})),'colorChoiceGrid')}`}));
   document.querySelectorAll('.colorChoiceGrid .choice').forEach(b=>b.onclick=()=>{const ok=b.dataset.value===answer;animateClick(b,ok);if(ok){d.combo++;addScore(19+d.combo*3,b);feedback(`${d.combo}x combo`);}else{d.combo=0;addScore(-9,b);feedback('Kuralı tekrar oku.',false);}if(d.round>=rounds)later(()=>finish('10 renk filtresi tamamlandı'),320);else later(q,220);});
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 15
 focusFive(){
  const rounds=10;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const total=10+Math.min(12,d.round),target=shuffle(SHAPES)[0],targetIndex=rand(0,total-1);setArena(roundShell({title:'Focus Five',subtitle:`Hedef: ${target} · diğerlerini yok say`,round:d.round,total:rounds,content:`<div class="focusCloud" id="focusCloud"></div>`}));
   const cloud=document.getElementById('focusCloud');cloud.innerHTML=Array.from({length:total},(_,i)=>`<button class="focusDot ${i===targetIndex?'focusTarget':''}" data-i="${i}">${i===targetIndex?target:shuffle(SHAPES.filter(s=>s!==target))[0]}</button>`).join('');
   [...cloud.children].forEach((el,i)=>{el.style.setProperty('--x',`${rand(4,92)}%`);el.style.setProperty('--y',`${rand(4,90)}%`);el.style.setProperty('--r',`${rand(-18,18)}deg`);el.style.animationDelay=`${i*16}ms`;});
   cloud.onclick=e=>{const b=e.target.closest('.focusDot');if(!b)return;const ok=+b.dataset.i===targetIndex;animateClick(b,ok);if(ok){d.combo++;addScore(22+d.combo*3,b);feedback(`${d.combo}x odak`);if(d.round>=rounds)finish('10 odak turu tamamlandı');else later(q,220);}else{d.combo=0;addScore(-11,b);feedback('Dikkatini hedefte tut.',false);}};
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 16
 trainSwitch(){
  const rounds=8;state.data={round:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const left=shuffle(['🔴','🔵','🟢'])[0],right=shuffle(['🔴','🔵','🟢'].filter(x=>x!==left))[0],side=Math.random()>.5?'SOL':'SAĞ',target=side==='SOL'?left:right;
   const colorHex=x=>x==='🔴'?'#fb7185':x==='🔵'?'#38bdf8':'#86efac';
   setArena(roundShell({title:'Train Switch',subtitle:`${target} treni hangi hatta?`,round:d.round,total:rounds,content:`<div class="trackStage"><div class="rail"><div class="train trainLeft" style="--train:${colorHex(left)}">${left}</div><span>SOL</span></div><div class="rail"><div class="train trainRight" style="--train:${colorHex(right)}">${right}</div><span>SAĞ</span></div></div><div class="switchPanel"><button class="switchBtn" data-v="SOL">SOL HAT</button><button class="switchBtn" data-v="SAĞ">SAĞ HAT</button></div>`}));
   later(()=>document.querySelector('.trackStage')?.classList.add('moving'),60);
   document.querySelectorAll('.switchBtn').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===side;animateClick(b,ok);ok?addScore(27,b):addScore(-10,b);feedback(ok?'Treni doğru hatta yakaladın.':'Yanlış hattı seçtin.',ok);if(d.round>=rounds)later(()=>finish('8 tren kararı tamamlandı'),330);else later(q,260);});
  };q();startClock(34,()=>finish('Süre doldu'));
 },
// 17
 noGoTap(){
  const rounds=12;state.data={round:0,locked:false,streak:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const good=Math.random()>.34;setArena(roundShell({type:'reaction','title':'No-Go Tap','subtitle':'Yeşile bas · kırmızıya dokunma',round:d.round,total:rounds,content:`<div id="noGoCard" class="noGoCard ${good?'go':'stop'}"><div class="ngIcon">${good?'🟢':'🔴'}</div><div class="ngLabel">${good?'BAS':'BEKLE'}</div>${good?'<button class="btn primary ngButton" id="ngButton">BAS</button>':''}</div>`}));
   if(good){document.getElementById('ngButton').onclick=()=>{d.streak++;addScore(18+d.streak*2,document.getElementById('ngButton'));feedback(`${d.streak}x temiz seri`);if(d.round>=rounds)finish('12 doğru refleks tamamlandı');else later(q,180);};}else{state.timer=later(()=>{d.streak=0;addScore(14);feedback('Doğru. Kırmızıya dokunmadın.');if(d.round>=rounds)finish('12 tur tamamlandı');else later(q,300);},700);}
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 18
 splitFocus(){
  const rounds=10;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const n=rand(10,99),shape=shuffle(SHAPES.slice(0,3))[0],needOdd=n%2===1,needShape=shape==='◆',correct=needOdd&&needShape;
   setArena(roundShell({title:'Split Focus',subtitle:'İki özelliği aynı anda değerlendir',round:d.round,total:rounds,content:`<div class="splitCards"><div class="splitCard"><span>SAYI</span><b>${n}</b><small>${needOdd?'tek':'çift'}</small></div><div class="splitCard"><span>ŞEKİL</span><b>${shape}</b><small>${needShape?'elmas':'diğer'}</small></div></div>${buttonGrid([{label:'EVET',value:'yes'},{label:'HAYIR',value:'no'}],'inputRow')}`}));
   document.querySelectorAll('.inputRow .choice').forEach(b=>b.onclick=()=>{const ok=(b.dataset.value==='yes')===correct;animateClick(b,ok);if(ok){d.combo++;addScore(22+d.combo*3,b);feedback(`${d.combo}x split combo`);}else{d.combo=0;addScore(-10,b);feedback('İki paneli birlikte düşün.',false);}if(d.round>=rounds)later(()=>finish('10 split turu tamamlandı'),350);else later(q,230);});
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 19
 ruleShift(){
  const rounds=12;state.data={round:0,rule:'shape',combo:0};
  const q=()=>{const d=state.data;d.round++;if(d.round>1&&d.round%3===1)d.rule=d.rule==='shape'?'color':'shape';progress(d.round,rounds);const item={s:shuffle(SHAPES.slice(0,4))[0],c:shuffle(COLORS)[0]};const correct=d.rule==='shape'?item.s:item.c.name;phase(d.rule==='shape'?'Şekil kuralı':'Renk kuralı','Kural değişebilir, gözün orada olsun');
   setArena(roundShell({title:'Kural değişimi',subtitle:`Aktif kural: ${d.rule==='shape'?'ŞEKİL':'RENK'}`,round:d.round,total:rounds,content:`<div class="ruleCard"><div class="ruleIcon" style="--orb:${item.c.hex}">${item.s}</div><div class="ruleArrow">${d.rule==='shape'?'→ Şekli seç':'→ Rengi seç'}</div></div><div class="choiceGrid ruleChoices">${(d.rule==='shape'?SHAPES.slice(0,4):COLORS).map(v=>`<button class="choice" data-v="${d.rule==='shape'?v:v.name}" ${d.rule==='color'?`style="--orb:${v.hex}"`:''}>${d.rule==='shape'?v:v.emoji+' '+v.name}</button>`).join('')}</div>`}));
   document.querySelectorAll('.ruleChoices .choice').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===correct;animateClick(b,ok);ok?addScore(22+d.round,b):addScore(-10,b);feedback(ok?'Doğru kural.':'Eski kurala takıldın.',ok);if(d.round>=rounds)later(()=>finish('12 kural değişimi tamamlandı'),350);else later(q,230);});
  };q();startClock(34,()=>finish('Süre doldu'));
 },
// 20
 directionFlip(){
  const rounds=12;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;const reverse=Math.floor((d.round-1)/3)%2===1;progress(d.round,rounds);const dir=shuffle(['←','→','↑','↓'])[0],opp={'←':'→','→':'←','↑':'↓','↓':'↑'}[dir],correct=reverse?opp:dir;
   setArena(roundShell({title:'Direction Flip',subtitle:`Kural: ${reverse?'TERS YÖN':'AYNI YÖN'}`,round:d.round,total:rounds,content:`<div class="directionCard ${reverse?'reverse':''}"><span>${reverse?'TERS':'AYNI'}</span><b>${dir}</b></div><div class="dirPad">${['↑','←','→','↓'].map(v=>`<button class="dirKey" data-v="${v}">${v}</button>`).join('')}</div>`}));
   document.querySelectorAll('.dirKey').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===correct;animateClick(b,ok);ok?addScore(21+d.round,b):addScore(-9,b);feedback(ok?'Yön kilitlendi.':'Kural değişti, tersini hatırla.',ok);if(d.round>=rounds)later(()=>finish('12 yön tamamlandı'),320);else later(q,210);});
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 21
 letterNumber(){
  const rounds=10;state.data={round:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const pair=Math.random()>.5?'A7':'3B',focus=Math.random()>.5?'HARF':'SAYI',target=focus==='HARF'?pair.match(/[A-Z]/)[0]:pair.match(/[0-9]/)[0];
   setArena(roundShell({title:'Letter Number',subtitle:`Sadece ${focus} kısmına cevap ver`,round:d.round,total:rounds,content:`<div class="lnCard"><div class="lnPair">${pair[0]}<span>${pair[1]}</span></div><div class="lnHint">${focus} seç</div></div>${buttonGrid(['A','B','3','7'].map(v=>({label:v,value:v})),'inputRow')}`}));
   document.querySelectorAll('.inputRow .choice').forEach(b=>b.onclick=()=>{const ok=b.dataset.value===target;animateClick(b,ok);ok?addScore(24,b):addScore(-9,b);feedback(ok?'Doğru bilgi türü.':'Konuma ve kurala dikkat.',ok);if(d.round>=rounds)later(()=>finish('10 tür geçişi tamamlandı'),350);else later(q,220);});
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 22
 sortShift(){
  const rounds=8;state.data={round:0,placed:[],rule:null};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);d.placed=[];d.rule=d.round%2?'PARITe':'BÜYÜKLÜK';const values=shuffle(Array.from({length:6},()=>rand(1,20)));const card=values[rand(0,values.length-1)];const correct=d.rule==='PARITe'?(card%2?'TEK':'ÇİFT'):(card>10?'BÜYÜK':'KÜÇÜK');
   setArena(roundShell({title:'Sort Shift',subtitle:`Kural: ${d.rule==='PARITe'?'TEK / ÇİFT':'BÜYÜK / KÜÇÜK'}`,round:d.round,total:rounds,content:`<div class="sortBoard"><div class="sortCard" id="sortCard">${card}</div><div class="sortZones"><button class="dropZone" data-v="${d.rule==='PARITe'?'TEK':'BÜYÜK'}">${d.rule==='PARITe'?'TEK':'BÜYÜK'}</button><button class="dropZone" data-v="${d.rule==='PARITe'?'ÇİFT':'KÜÇÜK'}">${d.rule==='PARITe'?'ÇİFT':'KÜÇÜK'}</button></div></div>`}));
   document.querySelectorAll('.dropZone').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===correct;animateClick(b,ok);if(ok){addScore(27,b);feedback('Kart doğru kutuda.');}else{addScore(-11,b);feedback('Kart yanlış kutuya gitti.',false);}if(d.round>=rounds)later(()=>finish('8 sınıflandırma tamamlandı'),350);else later(q,250);});
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 23
 reverseMind(){
  const rounds=12;state.data={round:0,reverse:false,combo:0};
  const q=()=>{const d=state.data;d.round++;if(d.round%4===1)d.reverse=!d.reverse;progress(d.round,rounds);const shown=Math.random()>.5?'EVET':'HAYIR';const correct=d.reverse?(shown==='EVET'?'HAYIR':'EVET'):shown;
   setArena(roundShell({title:'Reverse Mind',subtitle:`Kural: ${d.reverse?'TERS CEVAP':'NORMAL CEVAP'}`,round:d.round,total:rounds,content:`<div class="reverseCard ${d.reverse?'active':''}"><span>${d.reverse?'TERS':'DÜZ'}</span><b>${shown}</b></div><div class="inputRow"><button class="btn choice" data-v="EVET">EVET</button><button class="btn choice" data-v="HAYIR">HAYIR</button></div>`}));
   document.querySelectorAll('.inputRow .choice').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===correct;animateClick(b,ok);if(ok){d.combo++;addScore(20+d.combo*3,b);feedback(`${d.combo}x ters akıl`);}else{d.combo=0;addScore(-10,b);feedback('Kural tersine döndü.',false);}if(d.round>=rounds)later(()=>finish('12 ters kural tamamlandı'),330);else later(q,220);});
  };q();startClock(31,()=>finish('Süre doldu'));
 },
// 24
 patternSwap(){
  const rounds=10;state.data={round:0,mode:'shape'};
  const q=()=>{const d=state.data;d.round++;if(d.round%3===1)d.mode=d.mode==='shape'?'color':'shape';progress(d.round,rounds);const target=d.mode==='shape'?shuffle(SHAPES)[0]:shuffle(COLORS)[0];const options=d.mode==='shape'?shuffle(SHAPES):shuffle(COLORS);
   setArena(roundShell({title:'Pattern Swap',subtitle:`Eşleştirme: ${d.mode==='shape'?'ŞEKİL':'RENK'}`,round:d.round,total:rounds,content:`<div class="patternRef" style="--orb:${d.mode==='color'?target.hex:'transparent'}">${d.mode==='shape'?target:target.emoji}</div><div class="choiceGrid patternChoices">${options.map(v=>`<button class="choice patternChoice" data-v="${d.mode==='shape'?v:v.name}" ${d.mode==='color'?`style="--orb:${v.hex}"`:''}>${d.mode==='shape'?v:v.emoji}</button>`).join('')}</div>`}));
   document.querySelectorAll('.patternChoice').forEach(b=>b.onclick=()=>{const ok=b.dataset.v===(d.mode==='shape'?target:target.name);animateClick(b,ok);ok?addScore(24,b):addScore(-10,b);feedback(ok?'Ölçüt değişimini yakaladın.':'Eşleşme ölçütü değişmişti.',ok);if(d.round>=rounds)later(()=>finish('10 pattern turu tamamlandı'),350);else later(q,220);});
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 25
 routeRunner(){
  const rounds=3;state.data={round:1,n:7,board:null,pos:0,steps:0};
  const buildSolvable=(n)=>{const total=n*n,board=Array(total).fill(true),start=0,goal=total-1;let p=start;const path=[p],seen=new Set([p]);while(p!==goal){const x=p%n,y=Math.floor(p/n),opts=[];[[1,0],[-1,0],[0,1],[0,-1]].forEach(([dx,dy])=>{const nx=x+dx,ny=y+dy;if(nx>=0&&nx<n&&ny>=0&&ny<n){const ni=ny*n+nx;if(!seen.has(ni))opts.push(ni);}});if(!opts.length)break;let next=opts[rand(0,opts.length-1)];if(next===goal){p=next;path.push(p);seen.add(p);break;}p=next;path.push(p);seen.add(p);}const protectedCells=new Set(path);for(let i=0;i<total;i++){if(i!==start&&i!==goal&&!protectedCells.has(i)&&Math.random()<.34)board[i]=false;}return {board,start,goal};};
  const play=()=>{const d=state.data;d.n=7+Math.floor((d.round-1)/2);const g=buildSolvable(d.n);d.board=g.board;d.pos=g.start;d.steps=0;progress(d.round,rounds);setArena(roundShell({type:'routeStage','title':'Route Runner',subtitle:'WASD / ok tuşları veya ekrandaki tuşlar',round:d.round,total:rounds,content:`<div id="routeBoard" class="routeBoard" style="grid-template-columns:repeat(${d.n},1fr)"></div><div class="dpad"><button data-k="ArrowUp">↑</button><button data-k="ArrowLeft">←</button><button data-k="ArrowDown">↓</button><button data-k="ArrowRight">→</button></div>${controlsHint('Amaç: ● oyuncu → ★ hedef')}`}));
   const board=document.getElementById('routeBoard');const draw=()=>{board.innerHTML=d.board.map((open,i)=>`<div class="routeCell ${open?'':'block'} ${i===d.pos?'player':''} ${i===g.goal?'goal':''}">${i===d.pos?'●':i===g.goal?'★':''}</div>`).join('');};draw();
   const key=e=>{const k=e.key.toLowerCase();const map={arrowup:'ArrowUp',w:'ArrowUp',arrowleft:'ArrowLeft',a:'ArrowLeft',arrowdown:'ArrowDown',s:'ArrowDown',arrowright:'ArrowRight',d:'ArrowRight'};if(!map[k])return;move(map[k]);};
   const move=k=>{const p=d.pos,x=p%d.n,y=Math.floor(p/d.n);let np=p;if(k==='ArrowLeft'&&x>0)np--;if(k==='ArrowRight'&&x<d.n-1)np++;if(k==='ArrowUp'&&y>0)np-=d.n;if(k==='ArrowDown'&&y<d.n-1)np+=d.n;if(np!==p&&d.board[np]){d.pos=np;d.steps++;draw();addScore(4);const player=board.querySelector('.player');player?.classList.add('moveBounce');later(()=>player?.classList.remove('moveBounce'),160);if(np===g.goal){addScore(80+d.n*8);feedback(`Rota tamam · ${d.steps} adım`);window.removeEventListener('keydown',key);if(d.round>=rounds)later(()=>finish('3 rota tamamlandı'),500);else later(()=>{d.round++;play();},550);}}else if(np!==p&&!d.board[np]){feedback('Duvar!',false);addScore(-2);}};
   window.addEventListener('keydown',key);state.cleanups.push(()=>window.removeEventListener('keydown',key));document.querySelectorAll('.dpad button').forEach(b=>b.onclick=()=>move(b.dataset.k));
  };play();startClock(50,()=>finish('Süre doldu'));
 },
// 26
 tileRotate(){
  const rounds=4;state.data={round:1,n:3,tiles:[],moves:0};
  const play=()=>{const d=state.data;d.n=d.round<3?3:4;const total=d.n*d.n;d.tiles=Array.from({length:total},()=>rand(0,3));d.moves=0;progress(d.round,rounds);setArena(roundShell({title:'Tile Rotate',subtitle:'Tüm karoları 0° konumuna getir',round:d.round,total:rounds,content:`<div id="rotBoard" class="rotBoard" style="grid-template-columns:repeat(${d.n},1fr)"></div><div class="moveCounter">Hamle <b id="moveCounter">0</b></div>`}));const board=document.getElementById('rotBoard');
   const draw=()=>{board.innerHTML=d.tiles.map((v,i)=>`<button class="rotateTile" data-i="${i}" style="--rot:${v*90}deg"><span>└</span></button>`).join('');document.getElementById('moveCounter').textContent=d.moves;};draw();
   board.onclick=e=>{const c=e.target.closest('.rotateTile');if(!c)return;const i=+c.dataset.i;d.tiles[i]=(d.tiles[i]+1)%4;d.moves++;c.style.setProperty('--rot',`${d.tiles[i]*90}deg`);c.classList.add('rotatePop');later(()=>c.classList.remove('rotatePop'),220);addScore(2,c);if(d.tiles.every(v=>v===0)){addScore(90+d.n*10);feedback(`Tahta çözüldü · ${d.moves} hamle`);later(()=>{if(d.round>=rounds)finish('4 puzzle tamamlandı');else{d.round++;play();}},550);}};
  };play();startClock(48,()=>finish('Süre doldu'));
 },
// 27
 bridgeBuilder(){
  const rounds=5;state.data={round:1,next:1,order:[],pool:[]};
  const play=()=>{const d=state.data;d.next=1;const n=4+Math.floor(d.round/2),seq=shuffle(Array.from({length:n},(_,i)=>i+1));d.pool=seq;d.order=[];progress(d.round,rounds);setArena(roundShell({title:'Bridge Builder',subtitle:`Parçaları ${[...seq].sort((a,b)=>a-b).join(' → ')} sırasıyla koy`,round:d.round,total:rounds,content:`<div class="bridgeTrack" id="bridgeTrack">${seq.map(()=>`<div class="bridgeSlot">?</div>`).join('')}</div><div class="tokens" id="bridgeTokens">${seq.map(v=>`<button class="token bridgeToken" data-v="${v}">${v}</button>`).join('')}</div>`}));const track=document.getElementById('bridgeTrack'),tokens=document.getElementById('bridgeTokens');
   tokens.onclick=e=>{const b=e.target.closest('.bridgeToken');if(!b)return;const v=+b.dataset.v,ok=v===d.next;animateClick(b,ok);if(ok){d.order.push(v);const idx=d.order.length-1;track.children[idx].textContent=v;track.children[idx].classList.add('placed');b.disabled=true;d.next++;addScore(24,b);feedback('Parça oturdu.');if(d.order.length===n){addScore(80+n*12);feedback('Köprü tamam!');later(()=>{if(d.round>=rounds)finish('5 köprü tamamlandı');else{d.round++;play();}},550);}}else{addScore(-12,b);feedback(`Sıradaki parça ${d.next}.`,false);}}
  };play();startClock(42,()=>finish('Süre doldu'));
 },
// 28
 lightsLogic(){
  const rounds=4;state.data={round:1,n:4,board:[],moves:0};
  const play=()=>{const d=state.data;d.n=d.round<3?4:5;const total=d.n*d.n;d.board=Array(total).fill(false);d.moves=0;const scramble=6+d.round*2;for(let i=0;i<scramble;i++){const p=rand(0,total-1),r=Math.floor(p/d.n),c=p%d.n;[p,p-d.n,p+d.n,p-1,p+1].forEach((idx,j)=>{if(idx<0||idx>=total)return;if(j===1&&r===0)return;if(j===2&&r===d.n-1)return;if(j===3&&c===0)return;if(j===4&&c===d.n-1)return;d.board[idx]=!d.board[idx];});}progress(d.round,rounds);setArena(roundShell({title:'Lights Logic',subtitle:'Hepsini söndür · hamle sayısı önemli',round:d.round,total:rounds,content:`<div id="lightsBoard" class="lights" style="grid-template-columns:repeat(${d.n},1fr)"></div><div class="moveCounter">Hamle <b id="lightMoves">0</b></div>`}));const board=document.getElementById('lightsBoard');
   const draw=()=>{board.innerHTML=d.board.map((on,i)=>`<button class="light ${on?'on':''}" data-i="${i}"></button>`).join('');document.getElementById('lightMoves').textContent=d.moves;};draw();
   board.onclick=e=>{const c=e.target.closest('.light');if(!c)return;const i=+c.dataset.i,r=Math.floor(i/d.n),col=i%d.n;[i,i-d.n,i+d.n,i-1,i+1].forEach((idx,j)=>{if(idx<0||idx>=total)return;if(j===1&&r===0)return;if(j===2&&r===d.n-1)return;if(j===3&&col===0)return;if(j===4&&col===d.n-1)return;d.board[idx]=!d.board[idx];});d.moves++;draw();addScore(2,c);if(!d.board.some(Boolean)){addScore(105+d.n*12);feedback(`Tüm ışıklar söndü · ${d.moves} hamle`);later(()=>{if(d.round>=rounds)finish('4 ışık puzzle tamamlandı');else{d.round++;play();}},520);}};
  };play();startClock(55,()=>finish('Süre doldu'));
 },
// 29
 mathBlitz(){
  const rounds=12;state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const level=Math.min(3,Math.floor((d.round-1)/4)),a=rand(3,18+level*8),b=rand(2,18+level*7),op=shuffle(level===0?['+','−']:level===1?['+','−','×']:['+','−','×'])[0],ans=op==='+'?a+b:op==='−'?a-b:a*b;let opts=new Set([ans]);while(opts.size<4)opts.add(ans+shuffle([-1,1,-2,2,3,-3,5])[0]);
   setArena(roundShell({type:'math','title':'Math Blitz',subtitle:`Seviye ${level+1} · hızlı ve temiz`,round:d.round,total:rounds,content:`<div class="mathCard animatedMath"><div class="eq">${a} ${op} ${b} = ?</div><div class="mathPulse"></div><div class="answerGrid">${shuffle([...opts]).map(v=>`<button class="answer" data-v="${v}">${v}</button>`).join('')}</div></div>`}));
   document.querySelectorAll('.answer').forEach(b=>b.onclick=()=>{const ok=+b.dataset.v===ans;animateClick(b,ok);if(ok){d.combo++;addScore(26+d.combo*4,b);feedback(`${d.combo}x matematik combo`);}else{d.combo=0;addScore(-12,b);feedback('İşlemi tekrar kontrol et.',false);}if(d.round>=rounds)later(()=>finish('12 matematik sorusu tamamlandı'),320);else later(q,180);});
  };q();startClock(30,()=>finish('Süre doldu'));
 },
// 30
 wordScramble(){
  const rounds=10;const words=[['BELLEK','hafıza'],['MANTIK','düşünme'],['DİKKAT','odak'],['SİSTEM','yapı'],['KELİME','dil'],['PLAN','strateji'],['KOD','yazılım'],['ZİHİN','beyin'],['HIZLI','tempo'],['ROTA','yol'],['ŞEKİL','görsel'],['RENK','görsel']];state.data={round:0,combo:0};
  const q=()=>{const d=state.data;d.round++;progress(d.round,rounds);const [word,hint]=shuffle(words)[0],scr=uniqueScramble(word);setArena(roundShell({type:'word','title':'Word Scramble',subtitle:`İpucu: ${hint}`,round:d.round,total:rounds,content:`<div class="scrambleBox"><div class="scrambleWord">${scr}</div><div class="scrambleHint">${hint}</div></div><div class="inputRow"><input id="wordInput" class="textInput" autocomplete="off" placeholder="Kelimeyi yaz…" maxlength="14"><button class="btn primary" id="wordSend">Gönder</button></div><div class="wordKeys" id="wordKeys"></div>`}));
   const input=document.getElementById('wordInput'),send=document.getElementById('wordSend');
   send.onclick=()=>submit();input.onkeydown=e=>{if(e.key==='Enter')submit();};input.focus();
   function submit(){const ok=input.value.trim().toUpperCase()===word;animateClick(send,ok);if(ok){d.combo++;addScore(34+d.combo*4,send);feedback(`${d.combo}x kelime combo · doğru!`);}else{d.combo=0;addScore(-14,send);feedback(`Olmadı · ipucu: ${hint}`,false);return;}if(d.round>=rounds)later(()=>finish('10 kelime tamamlandı'),360);else later(q,240);}
  };q();startClock(35,()=>finish('Süre doldu'));
 }
};

/* ===== v3.3: seri, seviye, günün turu, ilerleme, ses ===== */
const dayKey=(off=0)=>{const d=new Date();d.setDate(d.getDate()-off);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
function loadJSON(key,fb){try{const v=JSON.parse(storage.get(key,''));return v&&typeof v==='object'&&!Array.isArray(v)?v:fb;}catch{return fb;}}
state.hist=loadJSON(STORE+'-hist',{});      // {gün:{n:oyun sayısı,xp}}
state.tourDone=loadJSON(STORE+'-tour',{});  // {gün:[oyun id'leri]}
state.sound=storage.get(STORE+'-sound','1')!=='0';
state.tourRun=null;

const LEVELS=[['Çaylak',0],['Gelişiyor',100],['Keskin',400],['Usta',1000],['Dahi',2000]];
function levelInfo(xp){
  let i=0;LEVELS.forEach((l,k)=>{if(xp>=l[1])i=k;});
  const cur=LEVELS[i],nxt=LEVELS[i+1];
  return {name:cur[0],next:nxt?nxt[0]:null,pct:nxt?Math.round((xp-cur[1])/(nxt[1]-cur[1])*100):100,need:nxt?nxt[1]-xp:0};
}
function streak(){let off=state.hist[dayKey(0)]?0:1,n=0;while(state.hist[dayKey(off+n)])n++;return n;}

/* ses + titreşim (ayarlardan kapatılır, dosya gerektirmez) */
let AC=null;
function sfx(kind){
  if(!state.sound)return;
  try{
    AC=AC||new (window.AudioContext||window.webkitAudioContext)();
    if(AC.state==='suspended')AC.resume();
    const now=AC.currentTime;
    const seq=kind==='ok'?[[660,0],[880,.07]]:kind==='bad'?[[190,0],[140,.08]]:[[523,0],[659,.1],[784,.2],[1047,.3]];
    seq.forEach(([f,t])=>{
      const o=AC.createOscillator(),g=AC.createGain();
      o.type=kind==='bad'?'triangle':'sine';o.frequency.value=f;
      g.gain.setValueAtTime(.0001,now+t);g.gain.exponentialRampToValueAtTime(.06,now+t+.015);g.gain.exponentialRampToValueAtTime(.0001,now+t+.16);
      o.connect(g);g.connect(AC.destination);o.start(now+t);o.stop(now+t+.18);
    });
    if(navigator.vibrate)navigator.vibrate(kind==='bad'?35:kind==='win'?[20,40,20]:0);
  }catch{}
}

/* günün turu: her gün tarihe göre sabit, 5 farklı alandan 5 oyun */
function seeded(str){let h=1779033703^str.length;for(let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353);h=h<<13|h>>>19;}
  return()=>{h=Math.imul(h^h>>>16,2246822507);h=Math.imul(h^h>>>13,3266489909);h^=h>>>16;return(h>>>0)/4294967296;};}
function dailyPicks(){
  const r=seeded('neuroarcade-'+dayKey()),cs=cats.slice(1);
  for(let i=cs.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[cs[i],cs[j]]=[cs[j],cs[i]];}
  return cs.slice(0,5).map(c=>{const pool=games.filter(g=>g.cat===c);return pool[Math.floor(r()*pool.length)];});
}
function daily(){
  const picks=dailyPicks(),dk=dayKey(),done=(state.tourDone[dk]||[]).filter(id=>picks.some(p=>p.id===id));
  const left=picks.filter(p=>!done.includes(p.id));
  $('dailyTitle').textContent=left.length?`${done.length}/5 tamamlandı`:'Tur tamam ✓';
  $('dailyText').textContent=left.length?picks.map(x=>x.name).join(' · '):'Bugünkü beş oyunu bitirdin. Yarın yenisi gelir; istersen yine oynayabilirsin.';
  $('dailyDots').innerHTML=picks.map(p=>`<i class="${done.includes(p.id)?'on':''}"></i>`).join('');
  const btn=$('dailyBtn');
  btn.innerHTML=(left.length?(done.length?'Devam et':'Başlat'):'Tekrar oyna')+' <span aria-hidden="true">→</span>';
  btn.onclick=()=>{const ids=(left.length?left:picks).map(p=>p.id);state.tourRun={ids};startGame(ids[0]);};
}
function tourNext(g){
  const tr=state.tourRun;if(!tr)return;
  const i=tr.ids.indexOf(g.id),nx=i>=0?games.find(x=>x.id===tr.ids[i+1]):null;
  const card=document.querySelector('.resultCard'),row=card&&card.querySelector('.resultBtns');if(!row)return;
  if(nx){
    const n=document.createElement('p');n.className='tourNote';n.innerHTML=`Günün Turu · ${i+1}/${tr.ids.length} bitti — sırada <b>${escapeHtml(nx.name)}</b>`;
    card.insertBefore(n,row);
    const b=document.createElement('button');b.className='btn resultBtn';b.id='nextTourBtn';b.innerHTML='Sıradaki oyun →';
    b.onclick=()=>startGame(nx.id);row.appendChild(b);
  }else{
    const n=document.createElement('p');n.className='tourNote';n.innerHTML='<b>Günün Turu tamamlandı 🎉</b> Serin devam ediyor.';card.insertBefore(n,row);
    state.tourRun=null;
  }
}

/* ilerleme ekranı: seviye, seri, beceri haritası, son 14 gün, rekorlar */
const SKILL_CAP=250; // radar'da %100 sayılan ortalama en iyi skor
function skillMap(){
  return cats.slice(1).map(c=>{
    const list=games.filter(g=>g.cat===c),played=list.filter(g=>(state.scores[g.id]||0)>0);
    const avg=played.length?played.reduce((s,g)=>s+state.scores[g.id],0)/played.length:0;
    return {c,played:played.length,total:list.length,val:Math.min(1,avg/SKILL_CAP)};
  });
}
function radarSVG(m){
  const cx=190,cy=160,R=100,n=m.length;
  const pt=(i,v)=>{const a=-Math.PI/2+i*2*Math.PI/n;return [+(cx+Math.cos(a)*R*v).toFixed(1),+(cy+Math.sin(a)*R*v).toFixed(1)];};
  const rings=[.25,.5,.75,1].map(v=>`<polygon class="rr" points="${m.map((_,i)=>pt(i,v).join(',')).join(' ')}"/>`).join('');
  const axes=m.map((_,i)=>{const [x,y]=pt(i,1);return `<line class="ra" x1="${cx}" y1="${cy}" x2="${x}" y2="${y}"/>`;}).join('');
  const poly=m.map((s,i)=>pt(i,Math.max(.05,s.val)).join(',')).join(' ');
  const dots=m.map((s,i)=>{const [x,y]=pt(i,Math.max(.05,s.val));return `<circle cx="${x}" cy="${y}" r="4.5" style="fill:var(--c-${s.c})"/>`;}).join('');
  const labels=m.map((s,i)=>{const [x,y]=pt(i,1.22);const a=Math.abs(x-cx)<10?'middle':x>cx?'start':'end';return `<text class="rl" x="${x}" y="${y+4}" text-anchor="${a}">${s.c}</text>`;}).join('');
  return `<svg viewBox="0 0 380 320" role="img" aria-label="Beceri haritası">${rings}${axes}<polygon class="rp" points="${poly}"/>${dots}${labels}</svg>`;
}
function renderProgress(){
  const lv=levelInfo(state.xp),st=streak(),m=skillMap();
  const days=Array.from({length:14},(_,i)=>{const k=dayKey(13-i),d=new Date();d.setDate(d.getDate()-(13-i));return {k,n:(state.hist[k]||{}).n||0,l:['P','S','Ç','P','C','C','P'][(d.getDay()+6)%7],today:i===13};});
  const max=Math.max(1,...days.map(d=>d.n));
  const top=games.filter(g=>state.scores[g.id]>0).sort((a,b)=>state.scores[b.id]-state.scores[a.id]).slice(0,5);
  const todayN=(state.hist[dayKey()]||{}).n||0;
  $('progressBody').innerHTML=`
    <div class="pgrid">
      <div class="pcard"><small>Seviye</small><strong>${lv.name}</strong><em>${lv.next?`${lv.need} XP sonra ${lv.next}`:'En üst seviye'}</em><div class="lvlBar"><i style="width:${lv.pct}%"></i></div></div>
      <div class="pcard"><small>Seri</small><strong>🔥 ${st}</strong><em>${st?'gün üst üste':'Bugün oyna, seri başlasın'}</em></div>
      <div class="pcard"><small>Toplam XP</small><strong>${state.xp}</strong><em>${state.played} oyun oynandı</em></div>
      <div class="pcard"><small>Bugün</small><strong>${todayN}</strong><em>oyun · tur ${(state.tourDone[dayKey()]||[]).length}/5</em></div>
    </div>
    <div class="psplit">
      <div class="pbox radar"><h4>Beceri haritası <span>· en iyi skorlarının ortalaması</span></h4>${radarSVG(m)}</div>
      <div class="pbox">
        <h4>Son 14 gün <span>· günlük oyun sayısı</span></h4>
        <div class="act">${days.map(d=>`<div class="${d.today?'today':''}" title="${d.k}: ${d.n} oyun"><i class="${d.n?'on':''}" style="height:${d.n?Math.max(12,Math.round(d.n/max*100)):4}%"></i><span>${d.l}</span></div>`).join('')}</div>
        <h4 style="margin-top:20px">Rekorların</h4>
        <ul class="recs">${top.length?top.map(g=>`<li><span><i style="background:var(--c-${g.cat})"></i>${escapeHtml(g.name)}</span><b>${state.scores[g.id]}</b></li>`).join(''):'<li class="none">Henüz rekor yok; ilk oyununu oyna.</li>'}</ul>
      </div>
    </div>
    <div class="pfoot"><button class="btn ghost" id="resetBtn">İlerlemeyi sıfırla</button></div>`;
  $('resetBtn').onclick=()=>{
    if(!confirm('Tüm skorlar, XP, seri ve geçmiş silinecek. Emin misin?'))return;
    state.scores={};state.played=0;state.xp=0;state.hist={};state.tourDone={};
    save();updateTop();renderGames();daily();renderProgress();
  };
}
function openProgress(){renderProgress();$('progressModal').classList.add('open');}
function closeProgress(){$('progressModal').classList.remove('open');}


function init(){
  try{
    setFilters();
    renderGames();
    daily();
    updateTop();
    wireUI();
    if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol))navigator.serviceWorker.register('./sw.js').catch(()=>{});
    document.body.dataset.appReady='true';
  }catch(err){
    console.error('NeuroArcade startup error:',err);
    document.body.dataset.appReady='false';
    const box=document.createElement('div');
    box.className='startupError';
    box.innerHTML='<b>NeuroArcade başlatılırken bir hata oluştu.</b><span>Sayfayı yenileyip tekrar dene.</span>';
    document.body.appendChild(box);
  }
}
window.NeuroArcade=window.NeuroArcade||{startGame,games,version:'3.3.0'};
window.startGame=startGame;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{init();bootFromUrl();},{once:true});else{init();bootFromUrl();}
