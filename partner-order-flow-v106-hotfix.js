/* JPT V106 -> Partner Order Flow Hotfix
   Safe overlay: does not replace Supabase config, menu, images, offers or outlet logic.
   It normalizes order items, adds ACCEPT/REJECT + 30/40/50/60 minute target,
   and keeps the existing alarm/realtime system intact.
*/
(function(){
  'use strict';

  const allowed=[30,40,50,60];
  const esc2 = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money2 = n => '₹'+Math.round(Number(n||0)).toLocaleString('en-IN');

  function normalizeItems(raw){
    if(Array.isArray(raw)) return raw;
    if(typeof raw==='string'){
      try{
        const x=JSON.parse(raw);
        return Array.isArray(x)?x:[];
      }catch(e){
        return [];
      }
    }
    return [];
  }

  async function saveOrder(id, patch){
    const r=await sb.from('orders').update({...patch,updated_at:new Date().toISOString()})
      .eq('id',id).eq('outlet_id',currentOutlet);
    if(r.error){ msg('Order update failed: '+r.error.message); return false; }
    return true;
  }

  window.loadOrders = async function(){
    const r=await outletFilter(sb.from('orders').select('*')).order('created_at',{ascending:false}).limit(50);
    if(r.error){ msg('Orders: '+r.error.message); return; }

    const data=r.data||[];
    const fresh=data.filter(o=>o.status==='new');
    $('newCount').textContent=fresh.length;

    $('ordersList').innerHTML=data.length ? data.map(o=>{
      const items=normalizeItems(o.items);
      const target=allowed.includes(Number(o.target_minutes))?Number(o.target_minutes):30;
      const acceptedAt=o.accepted_at || '';
      const deadline=o.deadline_at || (acceptedAt
        ? new Date(new Date(acceptedAt).getTime()+target*60000).toISOString()
        : '');
      const left=deadline?Math.max(0,new Date(deadline).getTime()-Date.now()):0;
      const secs=Math.floor(left/1000), mm=Math.floor(secs/60), ss=secs%60;
      const timerClass=left<=0&&o.status==='preparing'?'expired':left<=5*60000?'warn':'';

      const action = o.status==='new'
        ? `<div class="partnerActions">
             <div class="small" style="margin-bottom:7px">Select preparation time, then accept:</div>
             <div class="timerChoices">${allowed.map(m=>`<button type="button" class="timerChoice ${m===target?'active':''}" data-po-timer="${esc2(o.id)}" data-min="${m}">${m} min</button>`).join('')}</div>
             <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:9px">
               <button type="button" class="btn primary" data-po-accept="${esc2(o.id)}">✅ ACCEPT ORDER</button>
               <button type="button" class="btn danger" data-po-reject="${esc2(o.id)}">❌ REJECT</button>
             </div>
           </div>`
        : `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
             <button type="button" class="btn ${o.status==='preparing'?'primary':'dark'}" data-po-prep="${esc2(o.id)}">👨‍🍳 ${o.status==='preparing'?'PREPARING':'START PREPARING'}</button>
             <button type="button" class="btn online" data-po-ready="${esc2(o.id)}">🟢 READY</button>
           </div>`;

      return `<div class="order ${o.status==='new'?'new':''}">
        <div class="order-top">
          <div><b>${esc2(o.order_no||('#'+String(o.id).slice(0,8)))}</b>
          <div class="small">${o.created_at?new Date(o.created_at).toLocaleString():''}</div></div>
          <span class="badge">${esc2(o.status||'new')}</span>
        </div>
        <div style="margin:8px 0"><b>${esc2(o.customer_name||'Customer')}</b>
          ${o.customer_phone?' · '+esc2(o.customer_phone):o.phone?' · '+esc2(o.phone):''}
          <br>${esc2(o.customer_address||o.address||'')}
          <br>${esc2(o.order_type||'')}${o.payment?' · '+esc2(o.payment):''}
        </div>
        ${items.length ? items.map(x=>`<div class="item">
          <div style="flex:1"><b>${esc2(x.name||x.item_name||'Item')}</b> × ${Number(x.qty??x.quantity??1)}</div>
          <div>${money2(Number(x.price??x.unit_price??0)*Number(x.qty??x.quantity??1))}</div>
        </div>`).join('') :
          `<div class="item"><div style="color:#ffcf6b">⚠️ Item details unavailable in order record.</div></div>`}
        <div class="row" style="margin-top:9px"><span>Subtotal ${money2(o.subtotal)} · Discount ${money2(o.discount)}</span><b>${money2(o.total)}</b></div>
        ${o.note||o.notes?`<div class="small">Note: ${esc2(o.note||o.notes)}</div>`:''}
        <div class="timerBox">
          <div class="row"><span><b>⏱️ Preparation Timer</b></span>
          <span class="countdown ${timerClass}" data-po-deadline="${esc2(deadline)}">${deadline&&left>0?`${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`:o.status==='preparing'?'TIME OVER':'Not started'}</span></div>
          <div class="small">${o.status==='new'?'Choose 30/40/50/60 minutes before accepting.':`Target: ${target} min${acceptedAt?' · accepted '+new Date(acceptedAt).toLocaleTimeString() :''}`}</div>
        </div>
        ${action}
      </div>`;
    }).join('') : '<div class="muted">No orders yet.</div>';

    document.querySelectorAll('[data-po-timer]').forEach(b=>b.onclick=async()=>{
      const minutes=Math.min(60,Math.max(30,Number(b.dataset.min)||30));
      document.querySelectorAll(`[data-po-timer="${CSS.escape(b.dataset.poTimer)}"]`).forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      b.closest('.order')?.querySelectorAll('[data-po-accept]').forEach(x=>x.dataset.selectedMinutes=String(minutes));
      msg(`Preparation target selected: ${minutes} minutes.`);
    });

    document.querySelectorAll('[data-po-accept]').forEach(b=>b.onclick=async()=>{
      unlockAlarmAudio?.();
      const minutes=Number(b.dataset.selectedMinutes||b.closest('.order')?.querySelector('.timerChoice.active')?.dataset.min||30);
      const acceptedAt=new Date().toISOString();
      const deadline=new Date(Date.now()+minutes*60000).toISOString();
      if(!await saveOrder(b.dataset.poAccept,{status:'accepted',target_minutes:minutes,accepted_at:acceptedAt,deadline_at:deadline,eta_minutes:minutes+20})){return}
      msg(`✅ Order accepted — ${minutes} min preparation + 20 min delivery buffer.`);
      await loadOrders();
    });

    document.querySelectorAll('[data-po-reject]').forEach(b=>b.onclick=async()=>{
      if(!confirm('Reject this customer order?')) return;
      if(!await saveOrder(b.dataset.poReject,{status:'cancelled',rejection_reason:'Rejected by restaurant'}))return;
      msg('Order rejected.');
      await loadOrders();
    });

    document.querySelectorAll('[data-po-prep]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.poPrep;
      const ok=await saveOrder(id,{status:'preparing'});
      if(ok){msg('👨‍🍳 Order is now PREPARING.');await loadOrders();}
    });

    document.querySelectorAll('[data-po-ready]').forEach(b=>b.onclick=async()=>{
      const ok=await saveOrder(b.dataset.poReady,{status:'ready'});
      if(ok){msg('🟢 Order marked READY.');await loadOrders();}
    });

    if(fresh.length&&!lastSeen){
      lastSeen=fresh[0].created_at;
      localStorage.setItem('jpt_admin_last_seen',lastSeen);
    }
  };

  function tick(){
    document.querySelectorAll('[data-po-deadline]').forEach(el=>{
      const d=el.dataset.poDeadline;if(!d)return;
      const left=Math.max(0,new Date(d).getTime()-Date.now());
      const s=Math.floor(left/1000),m=Math.floor(s/60),sec=s%60;
      el.classList.toggle('warn',left>0&&left<=5*60000);
      el.classList.toggle('expired',left<=0);
      el.textContent=left>0?`${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:'TIME OVER';
    });
  }

  function boot(){
    const style=document.createElement('style');
    style.textContent='.partnerActions{margin-top:10px;padding:10px;border:1px solid #4b3b1e;border-radius:12px;background:#17130d}.partnerActions .timerChoices{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}.partnerActions .timerChoice{min-height:42px}';
    document.head.appendChild(style);
    const old=window.loadOrders;
    if(typeof old==='function') window.loadOrders().catch(()=>{});
    setInterval(tick,1000);
    setInterval(()=>{if(typeof window.loadOrders==='function')window.loadOrders().catch(()=>{})},30000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
