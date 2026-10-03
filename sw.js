const CACHE_NAME='carica-kombat-v0653-ranking-unico';

self.addEventListener('install', event => self.skipWaiting());

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('carica-kombat-') && k !== CACHE_NAME)
        .map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

async function patchHTML(resp){
  const text=await resp.text();
  const loadFn=`async function ckHallLoadGlobal(){const tag=document.getElementById('ckHallMode');if(tag)tag.textContent='🌎 CARREGANDO RANKING GLOBAL...';try{const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),4500);const res=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama?select=id,nome,personagem,score,perfects,caricalities,continues,criado_em&order=score.desc&limit=100',{headers:{apikey:CK_SUPABASE_KEY},signal:ctl.signal});clearTimeout(tm);if(!res.ok)throw new Error('HTTP '+res.status);const raw=await res.json();const best=new Map();for(const r of Array.isArray(raw)?raw:[]){const n=String(r?.nome||'').trim().toUpperCase();if(!n||n==='MRC'||n==='M')continue;const old=best.get(n);if(!old||(Number(r.score)||0)>(Number(old.score)||0))best.set(n,r);}ckHallGlobalRows=Array.from(best.values()).sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0)).slice(0,10);ckHallPaint(ckHallGlobalRows,'🌎 RANKING GLOBAL');return true;}catch(_e){console.warn('Hall Global indisponível:',_e?.message||_e);ckHallGlobalRows=null;ckHallPaint(null,'📱 RANKING LOCAL / OFFLINE');return false;}}`;
  const saveFn=`async function ckSaveHall(){if(ckHallBusy)return;const inp=document.getElementById('ckHallName'),btn=document.getElementById('ckHallSave');let name=(inp?.value||'PLAYER').trim().toUpperCase().slice(0,12)||'PLAYER';if(name==='MRC'||name==='M'){if(btn)btn.textContent='NOME DE TESTE BLOQUEADO';setTimeout(()=>{if(btn)btn.textContent='SALVAR NO RANKING';},1800);return;}let rows=ckHallRows();const localRow={name,score:towerScore,date:Date.now(),fighter:selectedFighter,perfects:towerPerfects,caricalities:towerCaricalities,continues:towerContinues};rows.push(localRow);rows.sort((a,b)=>b.score-a.score);rows=rows.slice(0,10);try{localStorage.setItem('caricaHallV1',JSON.stringify(rows))}catch(_e){}ckHallBusy=true;if(btn){btn.disabled=true;btn.textContent='VERIFICANDO RECORD...';}try{const newScore=Math.max(0,Math.round(towerScore||0));const body={nome:name,personagem:String(selectedFighter||'desconhecido').slice(0,40),score:newScore,perfects:Math.max(0,Math.round(towerPerfects||0)),caricalities:Math.max(0,Math.round(towerCaricalities||0)),continues:Math.max(0,Math.round(towerContinues||0))};const lookup=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama?select=id,nome,score&nome=eq.'+encodeURIComponent(name)+'&order=score.desc&limit=1',{headers:{apikey:CK_SUPABASE_KEY}});if(!lookup.ok)throw new Error('HTTP '+lookup.status);const found=await lookup.json();if(Array.isArray(found)&&found.length){const current=found[0];const oldScore=Number(current.score)||0;if(newScore<=oldScore){if(btn)btn.textContent='RECORD JÁ É MAIOR ✓';await ckHallLoadGlobal();return;}const upd=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama?id=eq.'+encodeURIComponent(current.id),{method:'PATCH',headers:{apikey:CK_SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});if(!upd.ok)throw new Error('HTTP '+upd.status);if(btn)btn.textContent='RECORDE ATUALIZADO ✓';}else{const res=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama',{method:'POST',headers:{apikey:CK_SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=minimal'},body:JSON.stringify(body)});if(!res.ok)throw new Error('HTTP '+res.status);if(btn)btn.textContent='SALVO GLOBAL ✓';}await ckHallLoadGlobal();}catch(_e){console.warn('Falha ao salvar Hall Global:',_e?.message||_e);ckHallGlobalRows=null;ckHallPaint(null,'📱 SALVO LOCAL • GLOBAL OFFLINE');if(btn)btn.textContent='SALVO LOCAL ✓';}finally{ckHallBusy=false;setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent='SALVAR NO RANKING';}},1800);}}`;

  let out=text;
  out=out.replace(/async function ckHallLoadGlobal\(\)\{[\s\S]*?\}\nfunction ckOpenHall/,loadFn+'\nfunction ckOpenHall');
  out=out.replace(/async function ckSaveHall\(\)\{[\s\S]*?\}\n\nconst TOWER_TOTAL=12;/,saveFn+'\n\nconst TOWER_TOTAL=12;');
  out=out.replace(/V06\.5 • HALL GLOBAL/g,'V06.5.3 • HALL GLOBAL');
  out=out.replace(/V06\.5\.2 • HALL GLOBAL/g,'V06.5.3 • HALL GLOBAL');
  return new Response(out,{status:resp.status,statusText:resp.statusText,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
}

self.addEventListener('fetch', event => {
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  const isHTML=event.request.mode==='navigate'||url.pathname.endsWith('/')||url.pathname.endsWith('/index.html');
  if(isHTML){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(patchHTML).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then(hit=>hit||fetch(event.request).then(resp=>{
      const copy=resp.clone();
      caches.open(CACHE_NAME).then(c=>c.put(event.request,copy)).catch(()=>{});
      return resp;
    }))
  );
});
