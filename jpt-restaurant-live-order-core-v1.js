/* JPT RESTAURANT LIVE ORDER CORE V1
   Canonical live-order runtime for Restaurant Partner.
   Design:
   - Supabase orders table = authoritative state.
   - Supabase Realtime private Broadcast = live transport.
   - Polling/reconciliation = recovery path.
   - Alert owner = JPTPartnerOrderAlertV4.
   - UI is a consumer; this file does not render or rewrite the Orders board.
   - No Firebase/FCM dependency is introduced here.
*/
(function(){
'use strict';
if(window.JPTRestaurantLiveOrderCore?.version==='1.0.0') return;

const POLL_MS=10000;
const CONFIRM_ATTEMPTS=12;
const CONFIRM_DELAY_MS=500;
const rank={new:0,accepted:1,preparing:2,ready:3,out_for_delivery:4,delivered:5,completed:5,cancelled:99};

let channel=null,channels=[],topic='',topics=[],pollTimer=null,reconnectTimer=null;
let running=false,starting=false;
let outletCode='';
let rows=new Map();
let listeners=new Set();
let seen=new Set();
let generation=0;

function sb(){return window.sb||null}
function normStatus(v){
  v=String(v||'new').toLowerCase();
  return v==='canceled'?'cancelled':v==='completed'?'completed':v;
}
function currentOutlet(){
  return String(
    document.getElementById('outletSelect')?.value ||
    localStorage.getItem('jpt_admin_outlet') ||
    ''
  ).trim();
}
const OWNER_OUTLETS=['JPT-001','SOP-002','NME-004','PFA-003','TOP-005'];
async function resolveOutlets(){
  const client=sb();
  const selected=currentOutlet();
  try{
    const r=await client.rpc('partner_access_is_central_owner');
    if(!r?.error && r.data===true)return {central:true,codes:OWNER_OUTLETS.slice()};
  }catch(e){}
  return {central:false,codes:selected?[selected]:[]};
}
function emit(type,payload){
  const ev={type,payload,at:new Date().toISOString()};
  listeners.forEach(fn=>{try{fn(ev)}catch(e){}});
  try{window.dispatchEvent(new CustomEvent('jpt:restaurant-order-core',{detail:ev}))}catch(e){}
}
function on(fn){
  if(typeof fn!=='function') return ()=>{};
  listeners.add(fn);
  return ()=>listeners.delete(fn);
}
function rememberEvent(id){
  if(!id)return true;
  if(seen.has(id))return false;
  seen.add(id);
  if(seen.size>1000)seen.delete(seen.values().next().value);
  return true;
}
function apply(row,source){
  if(!row?.id)return;
  const id=String(row.id), old=rows.get(id);
  rows.set(id,row);
  const before=normStatus(old?.status), after=normStatus(row.status);
  if(before!==after) emit('status',{row,before,after,source});
  else emit('row',{row,source});
  if(after!=='new' && before==='new'){
    try{window.JPTPartnerOrderAlertV4?.stop?.();window.stopOrderAlarm?.(row.id)}catch(e){}
  }
}
function remove(id){rows.delete(String(id))}
function snapshot(){return Array.from(rows.values())}
async function read(id,outlet){
  const client=sb(); if(!client) throw new Error('Supabase client not ready');
  let q=client.from('orders')
    .select('*')
    .eq('id',id);
  if(outlet)q=q.eq('outlet_id',outlet);
  const r=await q.maybeSingle();
  if(r.error)throw r.error;
  return r.data||null;
}
async function load(outlet){
  const client=sb(); if(!client) return [];
  outlet=outlet||currentOutlet();
  let q=client.from('orders').select('*').order('created_at',{ascending:false}).limit(100);
  if(outlet)q=q.eq('outlet_id',outlet);
  const r=await q;
  if(r.error)throw r.error;
  const next=new Map();
  (r.data||[]).forEach(x=>next.set(String(x.id),x));
  rows=next;
  emit('snapshot',snapshot());
  return snapshot();
}
async function waitFor(id,outlet,target){
  let latest=null;
  for(let i=0;i<CONFIRM_ATTEMPTS;i++){
    latest=await read(id,outlet);
    const s=normStatus(latest?.status);
    if(latest && (s===target || ((rank[s]??-1)>(rank[target]??-1) && s!=='cancelled'))){
      apply(latest,'server-confirm');
      return latest;
    }
    if(i<CONFIRM_ATTEMPTS-1)await new Promise(r=>setTimeout(r,CONFIRM_DELAY_MS));
  }
  return null;
}
async function transition(id,target,extra={},expectedStatus){
  target=normStatus(target);
  const client=sb(); if(!client)throw new Error('Supabase client not ready');
  const existing=rows.get(String(id));
  const outlet=existing?.outlet_id||currentOutlet();
  const current=existing||await read(id,outlet);
  if(!current)throw new Error('Order not found');
  const serverStatus=normStatus(current.status);
  const allowed={
    accepted:['new'],
    preparing:['accepted'],
    ready:['accepted','preparing'],
    out_for_delivery:['ready'],
    delivered:['out_for_delivery'],
    completed:['out_for_delivery'],
    cancelled:['new']
  };
  if(serverStatus===target || ((rank[serverStatus]??-1)>(rank[target]??-1) && serverStatus!=='cancelled')){
    apply(current,'idempotent');
    return current;
  }
  const from=expectedStatus?normStatus(expectedStatus):serverStatus;
  if(!(allowed[target]||[]).includes(from)){
    const fresh=await read(id,outlet);
    if(fresh)apply(fresh,'transition-recheck');
    throw new Error('Invalid order transition: '+serverStatus.toUpperCase()+' → '+target.toUpperCase());
  }
  const patch={status:target,updated_at:new Date().toISOString(),...extra};
  let q=client.from('orders').update(patch).eq('id',id);
  if(outlet)q=q.eq('outlet_id',outlet);
  q=q.eq('status',serverStatus);
  if(current.updated_at)q=q.eq('updated_at',current.updated_at);
  const wr=await q;
  if(wr.error){
    const recovered=await waitFor(id,outlet,target);
    if(recovered)return recovered;
    throw wr.error;
  }
  const recovered=await waitFor(id,outlet,target);
  if(recovered)return recovered;
  const fresh=await read(id,outlet);
  if(fresh)apply(fresh,'post-write-read');
  throw new Error('Order status could not be confirmed by the server.');
}
async function accept(id,minutes){
  const m=Math.max(5,Math.min(120,Number(minutes||30)));
  const now=new Date(),deadline=new Date(now.getTime()+m*60000);
  return transition(id,'accepted',{
    target_minutes:m,
    accepted_at:now.toISOString(),
    deadline_at:deadline.toISOString(),
    eta_minutes:m+20
  },'new');
}
function startPreparing(id){return transition(id,'preparing',{},'accepted')}
function markReady(id){return transition(id,'ready',{},'preparing')}
function reject(id,reason){
  return transition(id,'cancelled',{rejection_reason:String(reason||'Rejected').slice(0,500)},'new');
}
function handleBroadcast(event,payload){
  const p=payload?.payload||payload||{};
  const record=p.record||p.new_record||p;
  const id=record?.id||p?.id||p?.order_id;
  const evId=String(
    p?.event_id ||
    (id?('order:'+id+':'+String(record?.updated_at||record?.created_at||Date.now())):'')
  );
  if(!rememberEvent(evId))return;
  if(id){
    read(id,outletCode).then(row=>{
      if(!row){remove(id);emit('deleted',{id:String(id),source:'broadcast'})}
      else apply(row,'broadcast');
    }).catch(()=>load(outletCode).catch(()=>{}));
  }else{
    load(outletCode).catch(()=>{});
  }
}
async function bind(){
  const client=sb(); if(!client)return false;
  const resolved=await resolveOutlets();
  outletCode=resolved.central?'':(resolved.codes[0]||'');
  if(!resolved.codes.length)return false;
  try{await client.realtime.setAuth()}catch(e){}
  for(const ch of channels){try{await client.removeChannel(ch)}catch(e){}}
  channels=[];channel=null;topics=resolved.codes.map(code=>'jpt:partner:outlet:'+code);topic=topics.join(',');
  const myGen=generation;
  resolved.codes.forEach(code=>{
    const t='jpt:partner:outlet:'+code;
    const ch=client.channel(t,{config:{private:true}})
      .on('broadcast',{event:'order_insert'},p=>handleBroadcast('order_insert',p))
      .on('broadcast',{event:'order_update'},p=>handleBroadcast('order_update',p))
      .on('broadcast',{event:'INSERT'},p=>handleBroadcast('INSERT',p))
      .on('broadcast',{event:'UPDATE'},p=>handleBroadcast('UPDATE',p))
      .subscribe((status,err)=>{
        emit('transport',{status,error:err||null,topic:t,outlet_id:code});
        if(myGen!==generation)return;
        if(status==='SUBSCRIBED'){
          load(resolved.central?'':code).catch(()=>{});
        }else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'||status==='CLOSED'){
          clearTimeout(reconnectTimer);
          reconnectTimer=setTimeout(()=>bind().catch(()=>{}),2000);
        }
      });
    channels.push(ch);
    if(!channel)channel=ch;
  });
  return true;
}
function startPolling(){
  clearInterval(pollTimer);
  pollTimer=setInterval(()=>{
    if(!running)return;
    load(outletCode).catch(()=>{});
    if(!channels.length)bind().catch(()=>{});
  },POLL_MS);
}
async function start(){
  if(running||starting)return;
  starting=true;
  try{
    const client=sb();
    if(!client)throw new Error('Supabase client not ready');
    const resolved=await resolveOutlets();
    outletCode=resolved.central?'':(resolved.codes[0]||'');
    if(!resolved.codes.length)return;
    running=true;generation++;
    await load(resolved.central?'':resolved.codes[0]);
    await bind();
    startPolling();
    emit('started',{outlet_id:outletCode});
  }finally{starting=false}
}
async function stop(){
  running=false;generation++;
  clearInterval(pollTimer);pollTimer=null;
  clearTimeout(reconnectTimer);reconnectTimer=null;
  for(const ch of channels){try{await sb()?.removeChannel(ch)}catch(e){}}
  channels=[];channel=null;topic='';topics=[];
  emit('stopped',{});
}
function get(id){return rows.get(String(id))||null}
window.JPTRestaurantLiveOrderCore={
  version:'1.0.0',
  start,stop,bind,load,on,get,snapshot,
  transition,accept,startPreparing,markReady,reject,
  getState:()=>({running,outlet_id:outletCode,topic,topics,connected:channels.length>0,count:rows.size})
};
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>start().catch(()=>{}),300),{once:true});
}else setTimeout(()=>start().catch(()=>{}),300);
})();