/* JPT ORDER CONTROL BRIDGE V1
   Canonical live order lifecycle controller.
   Source of truth remains Supabase orders.
   Safe additive layer: no schema changes.
*/
(function(){
'use strict';
if(window.JPTOrderControlBridge?.version==='1.0.0') return;

const RANK={new:0,accepted:1,preparing:2,ready:3,out_for_delivery:4,delivered:5,completed:5,cancelled:99};
const busy=new Map();

function norm(v){
  const s=String(v||'new').toLowerCase().trim().replace(/\s+/g,'_');
  return s==='canceled'?'cancelled':s;
}
function allowed(from,to){
  from=norm(from);to=norm(to);
  if(to==='accepted') return from==='new';
  if(to==='preparing') return from==='accepted';
  if(to==='ready') return from==='preparing';
  if(to==='out_for_delivery') return from==='ready';
  if(to==='delivered'||to==='completed') return from==='out_for_delivery';
  if(to==='cancelled') return from==='new';
  return false;
}
function atOrBeyond(actual,target){
  actual=norm(actual);target=norm(target);
  return actual===target ||
    (RANK[actual]!==undefined && RANK[target]!==undefined &&
     RANK[actual]>RANK[target] && actual!=='cancelled');
}
async function read(id,outlet){
  const r=await window.sb.from('orders')
    .select('id,outlet_id,status,target_minutes,accepted_at,deadline_at,eta_minutes,updated_at')
    .eq('id',id).eq('outlet_id',outlet).maybeSingle();
  if(r.error) throw r.error;
  if(!r.data) throw new Error('Order was not found on the server.');
  return r.data;
}
async function waitFor(id,outlet,target,attempts,delay){
  for(let i=0;i<attempts;i++){
    const row=await read(id,outlet);
    if(atOrBeyond(row.status,target)) return row;
    if(i<attempts-1) await new Promise(r=>setTimeout(r,delay));
  }
  return null;
}
async function transition(id,outlet,next,extra){
  if(!window.sb) throw new Error('Order control backend unavailable.');
  const key=String(id)+'|'+String(outlet)+'|'+norm(next);
  if(busy.has(key)) return busy.get(key);
  const run=(async()=>{
    const current=await read(id,outlet);
    const from=norm(current.status),to=norm(next);

    if(atOrBeyond(from,to)) return current;
    if(!allowed(from,to)){
      throw new Error('Invalid order transition: '+from.toUpperCase()+' → '+to.toUpperCase());
    }

    const patch={...(extra||{}),status:to,updated_at:new Date().toISOString()};
    let q=await window.sb.from('orders').update(patch)
      .eq('id',id).eq('outlet_id',outlet).eq('status',from);

    if(q.error){
      const recovered=await waitFor(id,outlet,to,8,250);
      if(recovered) return recovered;
      throw q.error;
    }

    let verified=await waitFor(id,outlet,to,8,250);
    if(verified) return verified;

    const latest=await read(id,outlet);
    if(atOrBeyond(latest.status,to)) return latest;

    /* One bounded optimistic-concurrency retry. */
    if(norm(latest.status)===from && latest.updated_at===current.updated_at){
      const retry=await window.sb.from('orders').update(patch)
        .eq('id',id).eq('outlet_id',outlet).eq('updated_at',current.updated_at);
      if(retry.error){
        verified=await waitFor(id,outlet,to,6,250);
        if(verified) return verified;
        throw retry.error;
      }
      verified=await waitFor(id,outlet,to,8,250);
      if(verified) return verified;
    }
    throw new Error('Order status could not be confirmed by the server.');
  })();
  busy.set(key,run);
  try{return await run}finally{busy.delete(key)}
}

window.JPTOrderControlBridge={
  version:'1.0.0',
  statuses:['new','accepted','preparing','ready','out_for_delivery','delivered','completed','cancelled'],
  canTransition:allowed,
  transition,
  normalize:norm,
  rank:RANK,
  stopAlerts:function(id){
    try{window.JPTPartnerOrderAlertV4?.stop?.(true)}catch(e){}
    try{window.stopOrderAlarm?.(id)}catch(e){}
  }
};
})();