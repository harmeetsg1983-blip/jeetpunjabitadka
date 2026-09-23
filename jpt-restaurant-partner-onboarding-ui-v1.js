/* JPT Restaurant Partner Onboarding UI V1
   Additive layer only. Existing dashboard/customer/order/menu logic is preserved.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_ONBOARDING_UI_V1__) return;
  window.__JPT_PARTNER_ONBOARDING_UI_V1__=true;

  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let apps=[];

  function addStyle(){
    if($('jpt-onboarding-style')) return;
    const s=document.createElement('style'); s.id='jpt-onboarding-style';
    s.textContent=`
      #jptPartnerOnboardBtn{display:none}
      #jptPartnerOnboardPanel{display:none}
      #jptPartnerOnboardPanel.active{display:block}
      .jpt-ob-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .jpt-ob-full{grid-column:1/-1}
      .jpt-ob-card{background:linear-gradient(145deg,#151515,#0c0c0c);border:1px solid #3a2d17;border-radius:16px;padding:14px;margin-bottom:10px}
      .jpt-ob-title{color:#f6d779;font-weight:900;font-size:18px}
      .jpt-ob-status{display:inline-block;border:1px solid #514324;border-radius:99px;padding:4px 9px;font-size:10px;text-transform:uppercase}
      .jpt-ob-status.approved{border-color:#27733e;color:#79e39b}
      .jpt-ob-status.rejected,.jpt-ob-status.suspended{border-color:#7b2828;color:#ff9999}
      .jpt-ob-status.pending{color:#f6d779}
      .jpt-ob-row{display:flex;gap:10px;align-items:center;justify-content:space-between;border-bottom:1px solid #29231a;padding:12px 0}
      .jpt-ob-row:last-child{border-bottom:0}
      @media(max-width:760px){.jpt-ob-grid{grid-template-columns:1fr}.jpt-ob-full{grid-column:auto}.jpt-ob-row{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(s);
  }

  function panel(){
    if($('jptPartnerOnboardPanel')) return $('jptPartnerOnboardPanel');
    const settings=$('settings');
    if(!settings) return null;
    const wrap=document.createElement('section');
    wrap.id='jptPartnerOnboardPanel';
    wrap.className='panel';
    wrap.innerHTML=`
      <div class="jpt-ob-card">
        <div class="jpt-ob-title">Restaurant Partner Management</div>
        <div class="notice">Central Owner can register a restaurant, review applications and control approval status. Existing outlet/menu/order systems remain unchanged.</div>
        <div class="rowactions">
          <button class="btn gold" id="jptObNew">＋ New Restaurant</button>
          <button class="btn" id="jptObRefresh">↻ Refresh Applications</button>
        </div>
      </div>
      <div class="jpt-ob-card" id="jptObForm" style="display:none">
        <h3>New Restaurant Application</h3>
        <div class="jpt-ob-grid">
          <div class="field"><label>Restaurant Name *</label><input class="input" id="jptObRestaurant"></div>
          <div class="field"><label>Owner Name</label><input class="input" id="jptObOwner"></div>
          <div class="field"><label>Owner Email</label><input class="input" id="jptObEmail" type="email"></div>
          <div class="field"><label>Owner Phone</label><input class="input" id="jptObPhone" type="tel"></div>
          <div class="field jpt-ob-full"><label>Address</label><textarea class="area" id="jptObAddress"></textarea></div>
          <div class="field"><label>Logo URL</label><input class="input" id="jptObLogo"></div>
          <div class="field"><label>Banner URL</label><input class="input" id="jptObBanner"></div>
          <div class="field jpt-ob-full"><label>Notes</label><textarea class="area" id="jptObNotes"></textarea></div>
        </div>
        <div class="rowactions">
          <button class="btn gold" id="jptObSave">Submit Application</button>
          <button class="btn" id="jptObCancel">Cancel</button>
        </div>
      </div>
      <div class="jpt-ob-card">
        <h3>Applications</h3>
        <div id="jptObNotice" class="notice">Loading…</div>
        <div id="jptObList"></div>
      </div>`;
    settings.parentNode.insertBefore(wrap,settings);
    return wrap;
  }

  function clearForm(){
    ['jptObRestaurant','jptObOwner','jptObEmail','jptObPhone','jptObAddress','jptObLogo','jptObBanner','jptObNotes'].forEach(id=>{if($(id)) $(id).value=''});
  }

  async function isCentral(){
    if(!window.sb) return false;
    const r=await sb.rpc('partner_access_is_central_owner');
    return !r.error && r.data===true;
  }

  async function load(){
    const p=panel(); if(!p) return;
    const ok=await isCentral();
    const btn=$('jptPartnerOnboardBtn');
    if(btn) btn.style.display=ok?'inline-flex':'none';
    if(!ok){$('jptObNotice').textContent='Central Owner access required.';return}
    const r=await sb.rpc('partner_list_applications');
    if(r.error){$('jptObNotice').innerHTML='<span class="danger">'+esc(r.error.message)+'</span>';return}
    apps=r.data||[];
    $('jptObNotice').textContent=apps.length+' application(s)';
    $('jptObList').innerHTML=apps.map(a=>`
      <div class="jpt-ob-row">
        <div class="grow">
          <b>${esc(a.restaurant_name)}</b>
          <div class="muted">${esc(a.owner_name||'')} ${a.owner_email?'• '+esc(a.owner_email):''} ${a.owner_phone?'• '+esc(a.owner_phone):''}</div>
          <div class="muted">${esc(a.address||'')}</div>
        </div>
        <div>
          <span class="jpt-ob-status ${esc(a.status)}">${esc(a.status)}</span>
          <div class="rowactions" style="margin-top:7px">
            ${a.status==='pending'?`
              <button class="btn green" data-ob-approve="${esc(a.id)}">APPROVE</button>
              <button class="btn red" data-ob-reject="${esc(a.id)}">REJECT</button>`:''}
            ${a.status==='approved'?`<button class="btn red" data-ob-suspend="${esc(a.id)}">SUSPEND</button>`:''}
            ${a.status==='suspended'?`<button class="btn green" data-ob-approve="${esc(a.id)}">RE-APPROVE</button>`:''}
          </div>
        </div>
      </div>`).join('') || '<div class="notice">No applications yet.</div>';

    document.querySelectorAll('[data-ob-approve]').forEach(b=>b.onclick=()=>setStatus(b.dataset.obApprove,'approved'));
    document.querySelectorAll('[data-ob-reject]').forEach(b=>b.onclick=()=>setStatus(b.dataset.obReject,'rejected'));
    document.querySelectorAll('[data-ob-suspend]').forEach(b=>b.onclick=()=>setStatus(b.dataset.obSuspend,'suspended'));
  }

  async function setStatus(id,status){
    const note=prompt('Optional note for this status:')||null;
    const r=await sb.rpc('partner_set_application_status',{p_application_id:id,p_status:status,p_notes:note});
    if(r.error){toast?.('Status update failed: '+r.error.message);return}
    toast?.('Application marked '+status.toUpperCase());
    await load();
  }

  async function save(){
    const restaurant=$('jptObRestaurant').value.trim();
    if(!restaurant){toast?.('Restaurant Name is required');return}
    const payload={
      restaurant_name:restaurant,
      owner_name:$('jptObOwner').value.trim()||null,
      owner_email:$('jptObEmail').value.trim()||null,
      owner_phone:$('jptObPhone').value.trim()||null,
      address:$('jptObAddress').value.trim()||null,
      logo_url:$('jptObLogo').value.trim()||null,
      banner_url:$('jptObBanner').value.trim()||null,
      notes:$('jptObNotes').value.trim()||null
    };
    const r=await sb.from('restaurant_partner_applications').insert(payload);
    if(r.error){toast?.('Application save failed: '+r.error.message);return}
    $('jptObForm').style.display='none'; clearForm();
    toast?.('Restaurant application submitted');
    await load();
  }

  function wire(){
    addStyle();
    const p=panel(); if(!p) return;
    const tabs=document.querySelector('.tabs');
    if(tabs && !$('jptPartnerOnboardBtn')){
      const b=document.createElement('button');
      b.id='jptPartnerOnboardBtn'; b.className='btn'; b.textContent='Partner Management';
      b.onclick=()=>showPanel('jptPartnerOnboardPanel');
      tabs.appendChild(b);
    }
    $('jptObNew').onclick=()=>{$('jptObForm').style.display='block'};
    $('jptObCancel').onclick=()=>{$('jptObForm').style.display='none';clearForm()};
    $('jptObSave').onclick=save;
    $('jptObRefresh').onclick=load;
    load();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>setTimeout(wire,0));
  else setTimeout(wire,0);
})();
