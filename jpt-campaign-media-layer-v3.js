/* JPT Campaign + Customer Media Layer V3
   Runtime fix: reads the real admin outlet selector instead of relying on
   admin.html's lexical activeOutlet variable.
   Additive only; preserves V5 and V2 functionality.
*/
(function(){
'use strict';

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function toast(msg){
  if(typeof window.toast==='function') return window.toast(msg);
  alert(msg);
}
function getOutlet(){
  const s=document.getElementById('outletSelect');
  return String(s?.value||'').trim();
}
function getOutletRows(){
  if(Array.isArray(window.JPT_PARTNER_OUTLETS)) return window.JPT_PARTNER_OUTLETS;
  return [];
}
function isoLocal(v){
  if(!v)return '';
  try{return new Date(v).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'});}catch(e){return v;}
}

if(document.getElementById('campaignList') && !document.getElementById('jptCampaignManagerV3')){
  const panel=document.getElementById('campaigns');
  const box=document.createElement('div');
  box.id='jptCampaignManagerV3';
  box.className='card';
  box.style.marginTop='14px';
  box.innerHTML=`
    <h3>⚙️ Campaign & Customer Media Control</h3>
    <div class="notice">ON/OFF controls are separate. Turning a discount OFF does not change Customer App media.</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">
      <button id="jptV3Refresh" class="jpt-btn">REFRESH</button>
    </div>
    <div id="jptV3List"><div class="notice">Loading...</div></div>`;
  panel.appendChild(box);

  async function load(){
    const list=document.getElementById('jptV3List');
    const sb=window.sb;
    const outlet=getOutlet();
    if(!sb){list.innerHTML='<div class="danger">Supabase client not ready.</div>';return;}
    if(!outlet){list.innerHTML='<div class="notice">Select an outlet first.</div>';return;}
    const r=await sb.from('campaigns').select('*').eq('outlet_id',outlet).order('priority',{ascending:false}).order('created_at',{ascending:false});
    if(r.error){list.innerHTML='<div class="danger">'+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    if(!rows.length){list.innerHTML='<div class="notice">No campaigns/media found for this outlet.</div>';return;}

    list.innerHTML=rows.map(c=>{
      const s=(c.schedule_json&&typeof c.schedule_json==='object')?c.schedule_json:{};
      const media=s.campaign_type==='media';
      const type=media?'CUSTOMER MEDIA • '+String(s.media_type||'media').replace('_',' '):String(s.campaign_type||'campaign').toUpperCase();
      const active=!!c.active;
      return `<div style="border:1px solid #3c321f;border-radius:10px;padding:10px;margin:8px 0;background:#121212">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="min-width:0"><b>${esc(c.title||'Campaign')}</b>
            <div class="muted">${esc(type)} • priority ${Number(c.priority||0)}${c.start_at?' • '+esc(isoLocal(c.start_at)):''}${c.end_at?' → '+esc(isoLocal(c.end_at)):''}</div>
          </div>
          <button data-jpt-toggle="${esc(c.id)}" data-jpt-active="${active?'1':'0'}"
            style="border:1px solid #6b5420;border-radius:9px;padding:9px 12px;font-weight:900;cursor:pointer;background:${active?'#d8ae42':'#171717'};color:${active?'#111':'#d8ae42'}">
            ${active?'ON':'OFF'}
          </button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-jpt-toggle]').forEach(btn=>{
      btn.onclick=async()=>{
        const id=btn.getAttribute('data-jpt-toggle');
        const next=btn.getAttribute('data-jpt-active')!=='1';
        btn.disabled=true;
        const u=await sb.from('campaigns').update({active:next}).eq('id',id).eq('outlet_id',outlet);
        btn.disabled=false;
        if(u.error){toast('Update failed: '+u.error.message);return;}
        toast(next?'Campaign/media turned ON':'Campaign/media turned OFF');
        await load();
        if(typeof window.loadCampaigns==='function') await window.loadCampaigns();
      };
    });
  }

  document.getElementById('jptV3Refresh').onclick=load;
  load();

  const sel=document.getElementById('outletSelect');
  if(sel) sel.addEventListener('change',()=>setTimeout(load,250));

  setInterval(()=>{
    const now=getOutlet();
    if(now!==box._outlet){box._outlet=now;load();}
  },1000);
}
})();
