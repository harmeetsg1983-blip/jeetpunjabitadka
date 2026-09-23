/* JPT Campaign + Customer Media Layer V4
   Consolidated runtime-safe layer.
   - Initializes partner outlet access before reading outlet-scoped campaigns.
   - Campaign Builder: percentage / fixed / free item.
   - Explicit outlet selection; one secured row per selected outlet.
   - Campaign/media ON/OFF controls.
   - Separate Customer App media scheduler.
   - No schema changes; uses existing campaigns columns + schedule_json.
*/
(function(){
'use strict';

const isAdmin=!!document.getElementById('campaignList');
const isCustomer=!!document.getElementById('videoBanner');

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function toast(msg){
  if(typeof window.toast==='function') return window.toast(msg);
  const old=document.getElementById('jptV4Toast');
  const x=old||Object.assign(document.createElement('div'),{id:'jptV4Toast'});
  x.textContent=msg;x.style.cssText='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;background:#d8ae42;color:#111;padding:10px 14px;border-radius:10px;font-weight:900';
  if(!old)document.body.appendChild(x);
  clearTimeout(x._t);x._t=setTimeout(()=>x.remove(),2500);
}
function outletId(){return String(document.getElementById('outletSelect')?.value||'').trim();}
function outletRows(){
  return Array.isArray(window.JPT_PARTNER_OUTLETS)?window.JPT_PARTNER_OUTLETS:[];
}
function iso(v){if(!v)return '';try{return new Date(v).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'});}catch(e){return String(v);}}

async function ensureOutletReady(){
  const api=window.JPTPartnerAccess;
  if(api&&typeof api.reload==='function'){
    try{await api.reload();}catch(e){console.warn('[JPT V4] partner access reload',e)}
  }
  const sel=document.getElementById('outletSelect');
  const rows=outletRows();
  if(sel&&rows.length&&!sel.value)sel.value=String(rows[0].outlet_id||rows[0].code||'');
  return outletId();
}

if(isAdmin && !document.getElementById('jptCampaignV4')){
  const panel=document.getElementById('campaigns');
  const wrap=document.createElement('div');
  wrap.id='jptCampaignV4';
  wrap.style.marginTop='14px';
  wrap.innerHTML=`
  <div class="card">
    <h3>🎯 Campaign Builder</h3>
    <div class="notice">Discount campaigns are separate from Customer App media. Select the outlet(s) that should receive the campaign.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div><label>Campaign title</label><input id="jpt4Title" class="input" placeholder="Weekend 20% Off"></div>
      <div><label>Type</label><select id="jpt4Type" class="select"><option value="percent">Percentage discount</option><option value="fixed">Fixed discount</option><option value="free_item">Free item</option></select></div>
      <div id="jpt4ValueBox"><label>Discount value</label><input id="jpt4Value" class="input" type="number" min="0" step="0.01" placeholder="20"></div>
      <div id="jpt4FreeBox" style="display:none"><label>Free item</label><select id="jpt4Free" class="select"><option value="">Select outlet first</option></select></div>
      <div><label>Minimum order ₹</label><input id="jpt4Min" class="input" type="number" min="0" value="0"></div>
      <div><label>Priority</label><input id="jpt4Priority" class="input" type="number" value="50"></div>
      <div><label>Start</label><input id="jpt4Start" class="input" type="datetime-local"></div>
      <div><label>End</label><input id="jpt4End" class="input" type="datetime-local"></div>
    </div>
    <div style="margin-top:10px"><label>Target outlet(s)</label><div id="jpt4Outlets" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:7px"></div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px"><button id="jpt4Save" class="btn gold">SAVE CAMPAIGN</button><button id="jpt4Clear" class="btn">CLEAR</button></div>
    <div id="jpt4Notice" class="notice"></div>
  </div>

  <div class="card">
    <h3>🎬 Customer App Media Scheduler</h3>
    <div class="notice">Separate from discounts. This controls festival/weekend/special-day/local-event media in the Customer App top media area.</div>
    <div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px">
      <div><label>Creative title</label><input id="jpt4MTitle" class="input" placeholder="Festival Creative"></div>
      <div><label>Media type</label><select id="jpt4MType" class="select"><option value="festival">Festival</option><option value="weekend">Weekend</option><option value="special_day">Special Day</option><option value="local_event">Local Event</option></select></div>
      <div><label>Video URL (optional)</label><input id="jpt4Video" class="input" placeholder="https://.../video.mp4"></div>
      <div><label>Image / banner URL (optional)</label><input id="jpt4Image" class="input" placeholder="https://.../banner.jpg"></div>
      <div><label>Start</label><input id="jpt4MStart" class="input" type="datetime-local"></div>
      <div><label>End</label><input id="jpt4MEnd" class="input" type="datetime-local"></div>
      <div><label>Priority</label><input id="jpt4MPriority" class="input" type="number" value="80"></div>
    </div>
    <div style="margin-top:10px"><label>Target outlet(s)</label><div id="jpt4MOutlets" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:7px"></div></div>
    <button id="jpt4MSave" class="btn gold" style="margin-top:10px">SAVE CUSTOMER MEDIA</button>
    <div id="jpt4MNotice" class="notice"></div>
  </div>

  <div class="card">
    <h3>⚙️ Campaign & Customer Media Control</h3>
    <div class="notice">Discount ON/OFF and Customer Media ON/OFF are separate.</div>
    <button id="jpt4Refresh" class="btn">REFRESH</button>
    <div id="jpt4List" style="margin-top:8px"><div class="notice">Loading...</div></div>
  </div>`;
  panel.appendChild(wrap);

  function renderOutlets(id){
    const box=document.getElementById(id), rows=outletRows();
    if(!box)return;
    if(!rows.length){
      const o=outletId();
      box.innerHTML=o?`<label><input type="checkbox" checked data-jpt4-outlet value="${esc(o)}"> ${esc(o)}</label>`:'<div class="notice">No authorized outlets loaded.</div>';
      return;
    }
    box.innerHTML=rows.map(o=>{
      const idv=String(o.outlet_id||o.code||o.id||'');
      const name=String(o.outlet_name||o.name||idv);
      return `<label style="display:flex;gap:7px;align-items:center;border:1px solid #3c321f;border-radius:9px;padding:8px;background:#121212"><input type="checkbox" data-jpt4-outlet value="${esc(idv)}"> ${esc(name)} (${esc(idv)})</label>`;
    }).join('');
    const active=outletId();
    box.querySelectorAll('[data-jpt4-outlet]').forEach(x=>{if(x.value===active)x.checked=true;});
  }
  function selected(id){return [...document.querySelectorAll(`#${id} [data-jpt4-outlet]:checked`)].map(x=>x.value).filter(Boolean);}

  async function freeItems(){
    const ids=selected('jpt4Outlets'), outlet=ids[0]||outletId(), s=document.getElementById('jpt4Free');
    if(!s)return;
    if(!outlet){s.innerHTML='<option value="">Select outlet first</option>';return;}
    const r=await window.sb.from('menu_items').select('id,name,price').eq('outlet_id',outlet).eq('is_deleted',false).order('name');
    if(r.error){s.innerHTML='<option value="">Unable to load menu items</option>';return;}
    s.innerHTML=(r.data||[]).map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — ₹${Number(x.price||0).toLocaleString('en-IN')}</option>`).join('')||'<option value="">No menu items</option>';
  }

  async function refresh(){
    const list=document.getElementById('jpt4List'), outlet=outletId(), sb=window.sb;
    if(!outlet){list.innerHTML='<div class="notice">Select an outlet first.</div>';return;}
    const r=await sb.from('campaigns').select('*').eq('outlet_id',outlet).order('priority',{ascending:false}).order('created_at',{ascending:false});
    if(r.error){list.innerHTML='<div class="danger">'+esc(r.error.message)+'</div>';return;}
    const rows=r.data||[];
    if(!rows.length){list.innerHTML='<div class="notice">No campaigns/media found for this outlet.</div>';return;}
    list.innerHTML=rows.map(c=>{
      const s=c.schedule_json&&typeof c.schedule_json==='object'?c.schedule_json:{};
      const media=s.campaign_type==='media', type=media?'CUSTOMER MEDIA • '+String(s.media_type||'media').replaceAll('_',' '):String(s.campaign_type||'campaign').toUpperCase();
      const active=!!c.active;
      return `<div style="border:1px solid #3c321f;border-radius:10px;padding:10px;margin:8px 0;background:#121212;display:flex;justify-content:space-between;gap:10px;align-items:center">
        <div><b>${esc(c.title||'Campaign')}</b><div class="muted">${esc(type)} • priority ${Number(c.priority||0)}${c.start_at?' • '+esc(iso(c.start_at)):''}${c.end_at?' → '+esc(iso(c.end_at)):''}</div></div>
        <button class="btn ${active?'gold':''}" data-jpt4-toggle="${esc(c.id)}" data-active="${active?'1':'0'}">${active?'ON':'OFF'}</button>
      </div>`;
    }).join('');
    list.querySelectorAll('[data-jpt4-toggle]').forEach(b=>b.onclick=async()=>{
      const id=b.dataset.jpt4Toggle,next=b.dataset.active!=='1';
      b.disabled=true;
      const u=await sb.from('campaigns').update({active:next}).eq('id',id).eq('outlet_id',outlet);
      b.disabled=false;
      if(u.error){toast('Update failed: '+u.error.message);return;}
      toast(next?'Turned ON':'Turned OFF');await refresh();
      if(typeof window.loadCampaigns==='function')await window.loadCampaigns();
    });
  }

  document.getElementById('jpt4Type').onchange=()=>{
    const t=document.getElementById('jpt4Type').value;
    document.getElementById('jpt4ValueBox').style.display=t==='free_item'?'none':'block';
    document.getElementById('jpt4FreeBox').style.display=t==='free_item'?'block':'none';
    if(t==='free_item')freeItems();
  };
  document.getElementById('jpt4Outlets').onchange=freeItems;
  document.getElementById('jpt4Save').onclick=async()=>{
    const sb=window.sb,title=document.getElementById('jpt4Title').value.trim(),type=document.getElementById('jpt4Type').value,outs=selected('jpt4Outlets'),value=Number(document.getElementById('jpt4Value').value||0),min=Number(document.getElementById('jpt4Min').value||0);
    if(!title)return toast('Campaign title required');
    if(!outs.length)return toast('Select at least one outlet');
    if(type!=='free_item'&&value<=0)return toast('Enter discount value');
    const freeId=document.getElementById('jpt4Free').value||null;
    const free=(await sb.from('menu_items').select('id,name,price').eq('id',freeId).maybeSingle()).data;
    const st=document.getElementById('jpt4Start').value?new Date(document.getElementById('jpt4Start').value).toISOString():null;
    const en=document.getElementById('jpt4End').value?new Date(document.getElementById('jpt4End').value).toISOString():null;
    const priority=Number(document.getElementById('jpt4Priority').value||50);
    const rows=outs.map(outlet_id=>({outlet_id,title,message:type==='percent'?`${value}% discount`:type==='fixed'?`₹${value} discount`:`Free item: ${free?.name||'selected item'}`,active:true,start_at:st,end_at:en,priority,schedule_json:{version:1,campaign_type:type,discount_value:type==='free_item'?0:value,min_order:min,free_item_id:type==='free_item'?freeId:null,free_item_name:type==='free_item'?(free?.name||null):null,created_by_ui:'jpt-campaign-builder-v4'}}));
    const r=await sb.from('campaigns').insert(rows);
    if(r.error)return toast('Campaign save failed: '+r.error.message);
    document.getElementById('jpt4Notice').textContent=`Saved for ${outs.length} outlet(s).`;toast('Campaign saved');await refresh();
  };
  document.getElementById('jpt4Clear').onclick=()=>['jpt4Title','jpt4Value'].forEach(id=>document.getElementById(id).value='');
  document.getElementById('jpt4MSave').onclick=async()=>{
    const sb=window.sb,title=document.getElementById('jpt4MTitle').value.trim(),type=document.getElementById('jpt4MType').value,outs=selected('jpt4MOutlets'),video=document.getElementById('jpt4Video').value.trim(),image=document.getElementById('jpt4Image').value.trim();
    if(!title)return toast('Creative title required');if(!outs.length)return toast('Select at least one outlet');if(!video&&!image)return toast('Add a video or image URL');
    const st=document.getElementById('jpt4MStart').value?new Date(document.getElementById('jpt4MStart').value).toISOString():null;
    const en=document.getElementById('jpt4MEnd').value?new Date(document.getElementById('jpt4MEnd').value).toISOString():null;
    const priority=Number(document.getElementById('jpt4MPriority').value||80);
    const rows=outs.map(outlet_id=>({outlet_id,title,message:type+' customer media',active:true,start_at:st,end_at:en,priority,banner_url:image||null,video_url:video||null,schedule_json:{version:1,campaign_type:'media',media_type:type,video_url:video||null,image_url:image||null,created_by_ui:'jpt-customer-media-scheduler-v4'}}));
    const r=await sb.from('campaigns').insert(rows);
    if(r.error)return toast('Media save failed: '+r.error.message);
    document.getElementById('jpt4MNotice').textContent=`Saved for ${outs.length} outlet(s).`;toast('Customer media saved');await refresh();
  };
  document.getElementById('jpt4Refresh').onclick=refresh;

  (async()=>{
    await ensureOutletReady();
    renderOutlets('jpt4Outlets');renderOutlets('jpt4MOutlets');
    await freeItems();
    await refresh();
  })();

  const sel=document.getElementById('outletSelect');
  if(sel)sel.addEventListener('change',async()=>{renderOutlets('jpt4Outlets');renderOutlets('jpt4MOutlets');await freeItems();await refresh();});
}

if(isCustomer){
  window.renderVideo=function(){
    try{
      const media=(Array.isArray(window.campaigns)?window.campaigns:[]).filter(c=>{
        const s=c&&c.schedule_json;
        return s&&typeof s==='object'&&s.campaign_type==='media';
      }).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0));
      const el=document.getElementById('videoBanner');if(!el)return;
      if(!media.length){el.innerHTML='<div class="videoFallback"><div><b>🎬 Festival & Restaurant Video</b>No scheduled customer media is active.</div></div>';return;}
      const c=media[0],s=c.schedule_json||{},src=c.video_url||s.video_url||null,img=c.banner_url||s.image_url||null;
      el.innerHTML=src?`<video controls muted playsinline loop autoplay poster="${esc(img||'')}"><source src="${esc(src)}"></video>`:img?`<img src="${esc(img)}" alt="${esc(c.title||'Customer media')}">`:'';
    }catch(e){console.warn('[JPT V4 customer media]',e);}
  };
  setTimeout(()=>window.renderVideo(),1500);
}
})();