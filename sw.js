const CACHE_NAME='carica-kombat-v0652-patch-v2';

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
  const loadFn=`async function ckHallLoadGlobal(){const tag=document.getElementById('ckHallMode');if(tag)tag.textContent='🌎 CARREGANDO RANKING GLOBAL...';try{const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),4500);const res=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama?select=nome,personagem,score,perfects,caricalities,continues,criado_em&order=score.desc&limit=10',{headers:{apikey:CK_SUPABASE_KEY},signal:ctl.signal});clearTimeout(tm);if(!res.ok)throw new Error('HTTP '+res.status);ckHallGlobalRows=await res.json();if(!Array.isArray(ckHallGlobalRows))ckHallGlobalRows=[];ckHallGlobalRows=ckHallGlobalRows.filter(r=>{const n=String(r?.nome||'').trim().toUpperCase();return n!=='MRC'&&n!=='M';});ckHallGlobalRows.sort((a,b)=>(Number(b.score)||0)-(Number(a.score)||0));ckHallPaint(ckHallGlobalRows,'🌎 RANKING GLOBAL');return true;}catch(_e){console.warn('Hall Global indisponível:',_e?.message||_e);ckHallGlobalRows=null;ckHallPaint(null,'📱 RANKING LOCAL / OFFLINE');return false;}}`;
  const saveFn=`async function ckSaveHall(){if(ckHallBusy)return;const inp=document.getElementById('ckHallName'),btn=document.getElementById('ckHallSave');let name=(inp?.value||'PLAYER').trim().toUpperCase().slice(0,12)||'PLAYER';let rows=ckHallRows();const localRow={name,score:towerScore,date:Date.now(),fighter:selectedFighter,perfects:towerPerfects,caricalities:towerCaricalities,continues:towerContinues};rows.push(localRow);rows.sort((a,b)=>b.score-a.score);rows=rows.slice(0,10);try{localStorage.setItem('caricaHallV1',JSON.stringify(rows))}catch(_e){}ckHallBusy=true;if(btn){btn.disabled=true;btn.textContent='ENVIANDO...';}try{const body={nome:name,personagem:String(selectedFighter||'desconhecido').slice(0,40),score:Math.max(0,Math.round(towerScore||0)),perfects:Math.max(0,Math.round(towerPerfects||0)),caricalities:Math.max(0,Math.round(towerCaricalities||0)),continues:Math.max(0,Math.round(towerContinues||0))};const res=await fetch(CK_SUPABASE_URL+'/rest/v1/hall_da_fama',{method:'POST',headers:{apikey:CK_SUPABASE_KEY,'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify(body)});if(!res.ok)throw new Error('HTTP '+res.status);const created=await res.json();if(btn)btn.textContent='SALVO GLOBAL ✓';const loaded=await ckHallLoadGlobal();if((!loaded||!Array.isArray(ckHallGlobalRows)||ckHallGlobalRows.length===0)&&Array.isArray(created)&&created.length){const cn=String(created[0]?.nome||'').trim().toUpperCase();if(cn!=='MRC'&&cn!=='M'){ckHallGlobalRows=[created[0]];ckHallPaint(ckHallGlobalRows,'🌎 RANKING GLOBAL');}}}catch(_e){console.warn('Falha ao enviar Hall Global:',_e?.message||_e);ckHallGlobalRows=null;ckHallPaint(null,'📱 SALVO LOCAL • GLOBAL OFFLINE');if(btn)btn.textContent='SALVO LOCAL ✓';}finally{ckHallBusy=false;setTimeout(()=>{if(btn){btn.disabled=false;btn.textContent='SALVAR NO RANKING';}},1800);}}`;

  let out=text;
  out=out.replace(/async function ckHallLoadGlobal\(\)\{[\s\S]*?\}\nfunction ckOpenHall/,loadFn+'\nfunction ckOpenHall');
  out=out.replace(/async function ckSaveHall\(\)\{[\s\S]*?\}\n\nconst TOWER_TOTAL=12;/,saveFn+'\n\nconst TOWER_TOTAL=12;');
  out=out.replace(/V06\.5 • HALL GLOBAL/g,'V06.5.2 • HALL GLOBAL');
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
