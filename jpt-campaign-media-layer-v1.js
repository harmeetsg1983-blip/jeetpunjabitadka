/* JPT Campaign + Customer Media Layer V1
   Additive only. Does not replace admin.html or customer app.
   - Partner Campaign Builder: percent / fixed / free item
   - Explicit outlet selection; one secured campaign row per selected outlet
   - Separate Customer App Media Scheduler: festival/weekend/special/local-event video/image
   - Uses existing public.campaigns columns + schedule_json; no schema change.
*/
(function(){
'use strict';

const isAdmin = !!document.getElementById('campaignList');
const isCustomer = !!document.getElementById('videoBanner');

function escJ(v){
  return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function toastJ(msg){
  if(typeof window.toast==='function') return window.toast(msg);
  let x=document.getElementById('jptLayerToast');
  if(!x){x=document.createElement('div');x.id='jptLayerToast';x.style='position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:999999;background:#d8ae42;color:#111;padding:10px 14px;border-radius:10px;font-weight:800;font-size:12px';document.body.appendChild(x)}
  x.textContent=msg;x.style.display='block';clearTimeout(x._t);x._t=setTimeout(()=>x.style.display='none',2500);
}
function moneyJ(n){return '₹'+Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:2});}

if(isAdmin){
  const style=document.createElement('style');
  style.textContent=`
  #jptCampaignBuilder{margin-top:14px}
  #jptCampaignBuilder .jpt-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
  #jptCampaignBuilder label{display:block;font-size:12px;color:#aaa;margin-bottom:4px}
  #jptCampaignBuilder input,#jptCampaignBuilder select{width:100%;box-sizing:border-box;padding:10px;border-radius:9px;border:1px solid #444;background:#111;color:#fff}
  #jptCampaignBuilder .jpt-outlets{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:7px}
  #jptCampaignBuilder .jpt-outlet{display:flex;gap:7px;align-items:center;border:1px solid #3c321f;border-radius:9px;padding:8px;background:#121212}
  #jptCampaignBuilder .jpt-outlet input{width:auto}
  #jptCampaignBuilder .jpt-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
  #jptCampaignBuilder .jpt-btn{border:1px solid #6b5420;background:#d8ae42;color:#111;border-radius:9px;padding:10px 13px;font-weight:900;cursor:pointer}
  #jptCampaignBuilder .jpt-btn.secondary{background:#171717;color:#d8ae42}
  #jptCampaignBuilder .jpt-hidden{display:none}
  #jptCampaignBuilder .jpt-note{font-size:11px;color:#999;margin-top:6px;line-height:1.4}
  @media(max-width:650px){#jptCampaignBuilder .jpt-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);

  const panel=document.getElementById('campaigns');
  if(panel && !document.getElementById('jptCampaignBuilder')){
    const wrap=document.createElement('div');
    wrap.id='jptCampaignBuilder';
    wrap.innerHTML=`
    <div class="card">
      <h3>🎯 Campaign Builder — Discounts</h3>
      <div class="notice">Discount campaigns are separate from Customer App media. Select exactly which outlet(s) receive this campaign.</div>
      <div class="jpt-grid">
        <div><label>Campaign title</label><input id="jptCbTitle" placeholder="Weekend 20% Off"></div>
        <div><label>Campaign type</label><select id="jptCbType">
          <option value="percent">Percentage discount</option>
          <option value="fixed">Fixed discount</option>
          <option value="free_item">Free item</option>
        </select></div>
        <div id="jptCbValueBox"><label>Discount value</label><input id="jptCbValue" type="number" min="0" step="0.01" placeholder="20"></div>
        <div id="jptCbFreeBox" class="jpt-hidden"><label>Free item</label><select id="jptCbFreeItem"><option value="">Select outlet first</option></select></div>
        <div><label>Minimum order ₹</label><input id="jptCbMin" type="number" min="0" step="1" value="0"></div>
        <div><label>Priority</label><input id="jptCbPriority" type="number" step="1" value="50"></div>
        <div><label>Start</label><input id="jptCbStart" type="datetime-local"></div>
        <div><label>End</label><input id="jptCbEnd" type="datetime-local"></div>
      </div>
      <div style="margin-top:10px"><label>Target outlet(s)</label><div id="jptCbOutlets" class="jpt-outlets"></div>
      <div class="jpt-note">For multi-outlet selection, the system safely creates one outlet-scoped campaign row per selected outlet.</div></div>
      <div class="jpt-actions"><button class="jpt-btn" id="jptCbSave">SAVE CAMPAIGN</button><button class="jpt-btn secondary" id="jptCbClear">CLEAR</button></div>
      <div id="jptCbNotice" class="jpt-note"></div>
    </div>

    <div class="card">
      <h3>🎬 Customer App Media Scheduler</h3>
      <div class="notice">Separate module: schedules festival/weekend/special/local-event video or image creatives in the Customer App top media area. It does NOT create a discount.</div>
      <div class="jpt-grid">
        <div><label>Creative title</label><input id="jptMediaTitle" placeholder="Navratri Festival"></div>
        <div><label>Creative type</label><select id="jptMediaType"><option value="festival">Festival</option><option value="weekend">Weekend</option><option value="special_day">Special Day</option><option value="local_event">Local Event</option></select></div>
        <div><label>Video URL (optional)</label><input id="jptMediaVideo" placeholder="https://.../festival.mp4"></div>
        <div><label>Image / banner URL (optional)</label><input id="jptMediaImage" placeholder="https://.../banner.jpg"></div>
        <div><label>Start</label><input id="jptMediaStart" type="datetime-local"></div>
        <div><label>End</label><input id="jptMediaEnd" type="datetime-local"></div>
        <div><label>Priority</label><input id="jptMediaPriority" type="number" value="80"></div>
      </div>
      <div style="margin-top:10px"><label>Target outlet(s)</label><div id="jptMediaOutlets" class="jpt-outlets"></div>
      <div class="jpt-note">Media is outlet-scoped too. ON/OFF is controlled by the Active switch in the campaign record.</div></div>
      <div class="jpt-actions"><button class="jpt-btn" id="jptMediaSave">SAVE CUSTOMER MEDIA</button></div>
      <div id="jptMediaNotice" class="jpt-note"></div>
    </div>`;
    panel.appendChild(wrap);

    function outletRows(containerId,name){
      const box=document.getElementById(containerId);
      const rows=Array.isArray(window.currentOutletRows)?window.currentOutletRows:[];
      if(rows.length){
        box.innerHTML=rows.map(o=>`<label class="jpt-outlet"><input type="checkbox" value="${escJ(o.outlet_id||o.code||o.id)}" data-jpt-outlet> <span>${escJ(o.name||o.outlet_id||o.code||o.id)}</span></label>`).join('');
      }else{
        const id=window.activeOutlet||'JPT-001';
        box.innerHTML=`<label class="jpt-outlet"><input type="checkbox" checked value="${escJ(id)}" data-jpt-outlet> <span>${escJ(id)}</span></label>`;
      }
    }
    function selected(containerId){
      return [...document.querySelectorAll(`#${containerId} [data-jpt-outlet]:checked`)].map(x=>x.value).filter(Boolean);
    }
    function refillFreeItems(){
      const box=document.getElementById('jptCbFreeItem'), ids=selected('jptCbOutlets');
      if(!box)return;
      const outlet=ids[0]||window.activeOutlet;
      const items=Array.isArray(window.menuItems)?window.menuItems.filter(x=>String(x.outlet_id||window.activeOutlet)===String(outlet)):window.menuItems||[];
      box.innerHTML=(items||[]).map(x=>`<option value="${escJ(x.id)}">${escJ(x.name)} — ${moneyJ(x.price)}</option>`).join('')||'<option value="">No menu items loaded for selected outlet</option>';
    }
    function toggleType(){
      const t=document.getElementById('jptCbType').value;
      document.getElementById('jptCbValueBox').classList.toggle('jpt-hidden',t==='free_item');
      document.getElementById('jptCbFreeBox').classList.toggle('jpt-hidden',t!=='free_item');
    }
    outletRows('jptCbOutlets');
    outletRows('jptMediaOutlets');
    document.getElementById('jptCbType').onchange=toggleType;
    document.getElementById('jptCbOutlets').onchange=refillFreeItems;
    toggleType();refillFreeItems();

    document.getElementById('jptCbClear').onclick=()=>{
      ['jptCbTitle','jptCbValue','jptCbMin'].forEach(id=>document.getElementById(id).value='');
      document.getElementById('jptCbPriority').value='50';
      document.getElementById('jptCbStart').value='';document.getElementById('jptCbEnd').value='';
    };

    document.getElementById('jptCbSave').onclick=async()=>{
      const sb=window.sb, title=document.getElementById('jptCbTitle').value.trim(), type=document.getElementById('jptCbType').value;
      const outlets=selected('jptCbOutlets'), value=Number(document.getElementById('jptCbValue').value||0), min=Number(document.getElementById('jptCbMin').value||0);
      if(!sb)return toastJ('Supabase client not ready'); if(!title)return toastJ('Campaign title required'); if(!outlets.length)return toastJ('Select at least one outlet');
      if(type!=='free_item' && value<=0)return toastJ('Enter discount value');
      const freeId=document.getElementById('jptCbFreeItem').value||null;
      const freeItem=(window.menuItems||[]).find(x=>String(x.id)===String(freeId));
      const start=document.getElementById('jptCbStart').value?new Date(document.getElementById('jptCbStart').value).toISOString():null;
      const end=document.getElementById('jptCbEnd').value?new Date(document.getElementById('jptCbEnd').value).toISOString():null;
      const priority=Number(document.getElementById('jptCbPriority').value||50);
      const rows=outlets.map(outlet_id=>({outlet_id,title,message:type==='percent'?`${value}% discount`:type==='fixed'?`${moneyJ(value)} discount`:`Free item: ${freeItem?.name||'selected item'}`,active:true,start_at:start,end_at:end,priority,schedule_json:{version:1,campaign_type:type,discount_value:type==='free_item'?0:value,min_order:min,free_item_id:type==='free_item'?freeId:null,free_item_name:type==='free_item'?(freeItem?.name||null):null,created_by_ui:'jpt-campaign-builder-v1'}}));
      const r=await sb.from('campaigns').insert(rows);
      if(r.error)return toastJ('Campaign save failed: '+r.error.message);
      document.getElementById('jptCbNotice').textContent=`✅ Saved for ${outlets.length} outlet(s).`;
      toastJ('Campaign saved');
      if(typeof window.loadCampaigns==='function')await window.loadCampaigns();
    };

    document.getElementById('jptMediaSave').onclick=async()=>{
      const sb=window.sb,title=document.getElementById('jptMediaTitle').value.trim(),type=document.getElementById('jptMediaType').value;
      const outlets=selected('jptMediaOutlets'),video=document.getElementById('jptMediaVideo').value.trim(),image=document.getElementById('jptMediaImage').value.trim();
      if(!sb)return toastJ('Supabase client not ready');if(!title)return toastJ('Creative title required');if(!outlets.length)return toastJ('Select at least one outlet');if(!video&&!image)return toastJ('Add a video URL or image URL');
      const start=document.getElementById('jptMediaStart').value?new Date(document.getElementById('jptMediaStart').value).toISOString():null;
      const end=document.getElementById('jptMediaEnd').value?new Date(document.getElementById('jptMediaEnd').value).toISOString():null;
      const priority=Number(document.getElementById('jptMediaPriority').value||80);
      const rows=outlets.map(outlet_id=>({outlet_id,title,message:type+' customer media',active:true,start_at:start,end_at:end,priority,banner_url:image||null,video_url:video||null,schedule_json:{version:1,campaign_type:'media',media_type:type,video_url:video||null,image_url:image||null,created_by_ui:'jpt-customer-media-scheduler-v1'}}));
      const r=await sb.from('campaigns').insert(rows);
      if(r.error)return toastJ('Media save failed: '+r.error.message);
      document.getElementById('jptMediaNotice').textContent=`✅ Customer media scheduled for ${outlets.length} outlet(s).`;
      toastJ('Customer media saved');
      if(typeof window.loadCampaigns==='function')await window.loadCampaigns();
    };
  }
}

if(isCustomer){
  // Customer media is explicitly limited to campaign rows tagged campaign_type=media.
  // This prevents a discount campaign from changing the customer video area.
  const originalLoadManagedMenu=window.loadManagedMenu;
  // Function declaration in index.html is hoisted into global scope in classic scripts.
  // Patch the video renderer itself after page code has initialized.
  const originalRenderVideo=window.renderVideo;
  window.renderVideo=function(){
    try{
      const media=(Array.isArray(window.campaigns)?window.campaigns:[]).filter(c=>{
        const s=c&&c.schedule_json;
        return s&&typeof s==='object'&&s.campaign_type==='media';
      }).sort((a,b)=>Number(b.priority||0)-Number(a.priority||0));
      if(!media.length){
        const el=document.getElementById('videoBanner');
        if(el)el.innerHTML='<div class="videoFallback"><div><b>🎬 Festival & Restaurant Video</b>No scheduled customer media is active.</div></div>';
        return;
      }
      const c=media[0],s=c.schedule_json||{},src=c.video_url||s.video_url||null,img=c.banner_url||s.image_url||null;
      const el=document.getElementById('videoBanner');if(!el)return;
      el.innerHTML=src?`<video controls muted playsinline loop autoplay poster="${escJ(img||'')}"><source src="${escJ(src)}"></video>`:img?`<img src="${escJ(img)}" alt="${escJ(c.title||'Customer media')}">`:'';
    }catch(e){console.warn('JPT customer media layer',e);if(typeof originalRenderVideo==='function')originalRenderVideo();}
  };
  // Re-run once after the existing app has loaded its campaign rows.
  setTimeout(()=>{if(typeof window.renderVideo==='function')window.renderVideo()},1200);
}
})();