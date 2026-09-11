/* JPT V106 Partner Operations v2 — stable order workflow + sales */
(function(){
'use strict';
if(window.__JPT_V106_PARTNER_OPERATIONS_V2__) return;
window.__JPT_V106_PARTNER_OPERATIONS_V2__=true;

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const money=n=>'₹'+Math.round(Number(n||0)).toLocaleString('en-IN');
const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));

function outlet(){return $('#outletSelect')?.value||localStorage.getItem('jpt_admin_outlet')||'JPT-001'}
function norm(s){return String(s||'').trim().toLowerCase().replace(/[–—]/g,'-').replace(/\s+/g,'_')}
function statusOf(c){
  const raw=[c.dataset.status,c.querySelector('.badge')?.textContent,c.className].filter(Boolean).join(' ');
  const s=norm(raw);
  if(/out[_ -]?for[_ -]?delivery|out[_ -]?delivery|dispatched/.test(s)) return 'out';
  if(/ready|prepared/.test(s)) return 'ready';
  if(/delivered|completed|cancelled|canceled|rejected|failed/.test(s)) return 'history';
  return 'active';
}
function orderNo(c){return c.dataset.orderNo||c.querySelector('select[data-order]')?.dataset.order||c.textContent.match(/JPT[A-Za-z0-9-]+/)?.[0]||''}

function style(){
 if($('#jptOpsStyleV2')) return;
 const s=document.createElement('style'); s.id='jptOpsStyleV2';
 s.textContent=`#jptOpsToolbarV2{margin:10px 0;padding:10px;border:1px solid #4b3b1e;border-radius:12px;background:#111}
 #jptOpsToolbarV2 .r{display:flex;gap:7px;flex-wrap:wrap}
 #jptOpsToolbarV2 button{padding:9px 10px;border-radius:9px;border:1px solid #4b3b1e;background:#17130d;color:#ddd;font-weight:800}
 #jptOpsToolbarV2 button.on{background:#f4d77a;color:#111}
 .jptOpsSectionV2{margin:10px 0}.jptOpsHeadV2{padding:9px;border-radius:9px;background:#17130d;color:#f4d77a;font-weight:1000;display:flex;justify-content:space-between}
 .jptOpsEmptyV2{padding:9px;color:#888;text-align:center}.jptOutBtnV2{margin-top:8px;width:100%;padding:10px;border:1px solid #d8ae42;border-radius:9px;background:#f4d77a;color:#111;font-weight:1000}
 #jptOpsSalesV2{display:none;margin-top:9px;padding:9px;background:#17130d;border-radius:9px}`;
 document.head.appendChild(s);
}

function toolbar(list){
 if($('#jptOpsToolbarV2')) return;
 const t=document.createElement('div'); t.id='jptOpsToolbarV2';
 t.innerHTML=`<div class="r">
 <button class="on" data-v="active">ACTIVE / PREPARING</button><button data-v="ready">READY</button>
 <button data-v="out">OUT FOR DELIVERY</button><button data-v="history">HISTORY / COMPLETED</button><button data-v="sales">SALES</button>
 </div><div id="jptOpsSalesV2"><b style="color:#f4d77a">SALES SUMMARY</b>
 <div class="r" style="margin-top:7px"><button class="on" data-p="today">TODAY</button><button data-p="yesterday">YESTERDAY</button><button data-p="7">7 DAYS</button><button data-p="month">1 MONTH</button></div>
 <div id="jptSalesBodyV2" style="margin-top:8px">Select a period.</div></div>`;
 list.parentNode.insertBefore(t,list);
 t.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>view(b.dataset.v));
 t.querySelectorAll('[data-p]').forEach(b=>b.onclick=()=>{t.querySelectorAll('[data-p]').forEach(x=>x.classList.remove('on'));b.classList.add('on');sales(b.dataset.p)});
}

function group(list){
 const cards=[...list.querySelectorAll(':scope > .order')];
 if(!cards.length) return false;
 const buckets={active:[],ready:[],out:[],history:[]};
 cards.forEach(c=>buckets[statusOf(c)].push(c));
 const current=$('#jptOpsToolbarV2 [data-v].on')?.dataset.v||'active';
 const frag=document.createDocumentFragment();
 [['active','ACTIVE / PREPARING'],['ready','READY'],['out','OUT FOR DELIVERY'],['history','HISTORY / COMPLETED']].forEach(([key,title])=>{
   const sec=document.createElement('section'); sec.className='jptOpsSectionV2'; sec.dataset.opsSection=key;
   const h=document.createElement('div'); h.className='jptOpsHeadV2'; h.innerHTML='<span>'+title+'</span><span>'+buckets[key].length+'</span>'; sec.appendChild(h);
   buckets[key].forEach(c=>sec.appendChild(c));
   if(!buckets[key].length){const e=document.createElement('div');e.className='jptOpsEmptyV2';e.textContent='No orders in this section.';sec.appendChild(e)}
   frag.appendChild(sec);
 });
 list.dataset.jptOpsV2Grouped='1'; list.replaceChildren(frag);
 attachReadyButtons(list); view(current); return true;
}

async function moveOut(no,btn){
 btn.disabled=true; btn.textContent='UPDATING…';
 const sbx=(typeof sb!=='undefined'?sb:window.sb);
 if(!sbx){btn.disabled=false;btn.textContent='🚚 OUT FOR DELIVERY';return}
 const id=btn.closest('.order')?.querySelector('select[data-order]')?.dataset.order||'';
 if(!id){btn.disabled=false;btn.textContent='🚚 OUT FOR DELIVERY';return}
 const r=await sbx.from('orders').update({status:'out_for_delivery',updated_at:new Date().toISOString()}).eq('id',id).eq('outlet_id',outlet());
 if(r.error){btn.disabled=false;btn.textContent='🚚 OUT FOR DELIVERY';if(typeof window.msg==='function')window.msg('Order update failed: '+r.error.message);return}
 if(typeof window.msg==='function')window.msg('🚚 Order moved to OUT FOR DELIVERY.');
 if(typeof window.loadOrders==='function') await window.loadOrders();
}
function attachReadyButtons(list){
 $$('.jptOutBtnV2').forEach(x=>x.remove());
 list.querySelectorAll('.jptOpsSectionV2[data-ops-section="ready"] > .order').forEach(c=>{
   const no=orderNo(c); if(!no)return;
   const b=document.createElement('button'); b.className='jptOutBtnV2'; b.type='button'; b.textContent='🚚 OUT FOR DELIVERY'; b.onclick=()=>moveOut(no,b); c.appendChild(b);
 });
}
function view(v){
 const t=$('#jptOpsToolbarV2'); if(!t)return;
 t.querySelectorAll('[data-v]').forEach(b=>b.classList.toggle('on',b.dataset.v===v));
 const salesBox=$('#jptOpsSalesV2'); if(salesBox)salesBox.style.display=v==='sales'?'block':'none';
 $$('#ordersList .jptOpsSectionV2').forEach(x=>x.style.display=((v==='active'&&x.dataset.opsSection==='active')||(v==='ready'&&x.dataset.opsSection==='ready')||(v==='out'&&x.dataset.opsSection==='out')||(v==='history'&&x.dataset.opsSection==='history'))?'block':'none');
 if(v==='sales')sales(t.querySelector('[data-p].on')?.dataset.p||'today');
}
function dateIST(d){const p=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(d);return p.find(x=>x.type==='year').value+'-'+p.find(x=>x.type==='month').value+'-'+p.find(x=>x.type==='day').value}
async function sales(period){
 const body=$('#jptSalesBodyV2'); if(!body)return; body.textContent='Loading…';
 const now=new Date(); let from=dateIST(now),to=dateIST(new Date(now.getTime()+86400000));
 if(period==='yesterday'){from=dateIST(new Date(now.getTime()-86400000));to=dateIST(now)}
 else if(period==='7'){from=dateIST(new Date(now.getTime()-6*86400000))}
 else if(period==='month'){from=dateIST(new Date(now.getTime()-29*86400000))}
 try{
   const q=await sb.from('orders').select('outlet_id,total,total_amount,status,created_at').gte('created_at',from+'T00:00:00+05:30').lt('created_at',to+'T00:00:00+05:30');
   if(q.error)throw q.error;
   const rows=(q.data||[]).filter(o=>['delivered','completed'].includes(norm(o.status)));
   let total=0,count=0; const by={};
   rows.forEach(o=>{const v=Number(o.total??o.total_amount??0);total+=v;count++;const k=o.outlet_id||'Unknown';by[k]??={n:0,t:0};by[k].n++;by[k].t+=v});
   const n=await sb.from('outlets').select('outlet_id,name'); const names={}; (n.data||[]).forEach(x=>names[x.outlet_id]=x.name);
   const lines=Object.entries(by).sort((a,b)=>b[1].t-a[1].t).map(([id,v])=>'<div style="display:flex;justify-content:space-between;padding:7px 0;border-top:1px solid #2d2518"><span>'+esc(names[id]||id)+'</span><b>'+money(v.t)+' ('+v.n+')</b></div>').join('');
   body.innerHTML='<div style="font-size:20px;font-weight:1000;color:#f4d77a">'+money(total)+'</div><div style="font-size:11px;color:#aaa">'+period.toUpperCase()+' · '+count+' delivered/completed orders · ALL OUTLETS</div>'+(lines||'<div class="jptOpsEmptyV2">No delivered/completed sales in this period.</div>');
 }catch(e){body.textContent='Sales could not be loaded right now.'}
}
function enhance(){const l=$('#ordersList');if(!l)return;style();toolbar(l);group(l)}
function boot(){const l=$('#ordersList');if(!l)return setTimeout(boot,400);const mo=new MutationObserver(()=>{if(window.__JPT_V106_OPS_V2_BUSY__)return;window.__JPT_V106_OPS_V2_BUSY__=true;setTimeout(()=>{try{enhance()}finally{window.__JPT_V106_OPS_V2_BUSY__=false}},0)});mo.observe(l,{childList:true,subtree:true});enhance()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
