/* JPT Outlet Branding Manager V1 — additive only */
(function(){
'use strict';

const STYLE_ID='jpt-outlet-branding-manager-v1-style';
const CARD_ID='jptOutletBrandingManagerV1';

function esc(v){
  return String(v??'').replace(/[&<>"']/g,function(c){
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
  });
}

function addStyle(){
  if(document.getElementById(STYLE_ID)) return;
  const s=document.createElement('style');
  s.id=STYLE_ID;
  s.textContent=`
    #${CARD_ID}{margin-top:16px}
    #${CARD_ID} .jpt-brand-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    #${CARD_ID} .jpt-brand-field{display:flex;flex-direction:column;gap:6px}
    #${CARD_ID} .jpt-brand-field.full{grid-column:1/-1}
    #${CARD_ID} .jpt-brand-field label{font-size:12px;color:#aaa;font-weight:700}
    #${CARD_ID} input{width:100%;box-sizing:border-box}
    #${CARD_ID} .jpt-brand-actions{display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap}
    #${CARD_ID} .jpt-brand-preview{display:grid;grid-template-columns:72px 1fr;gap:12px;align-items:center;margin-top:12px}
    #${CARD_ID} .jpt-brand-logo-preview{width:72px;height:72px;border:1px solid #5a461b;border-radius:12px;overflow:hidden;background:#171717;display:grid;place-items:center;color:#777;font-size:11px;text-align:center}
    #${CARD_ID} .jpt-brand-logo-preview img{width:100%;height:100%;object-fit:cover}
    #${CARD_ID} .jpt-brand-banner-preview{height:100px;border:1px solid #5a461b;border-radius:12px;overflow:hidden;background:#171717;margin-top:8px}
    #${CARD_ID} .jpt-brand-banner-preview img{width:100%;height:100%;object-fit:cover}
    @media(max-width:700px){
      #${CARD_ID} .jpt-brand-grid{grid-template-columns:1fr}
      #${CARD_ID} .jpt-brand-field.full{grid-column:auto}
    }
  `;
  document.head.appendChild(s);
}

function getOutletId(){
  return String(window.activeOutlet || document.getElementById('outletSelect')?.value || '').trim();
}

async function loadBranding(){
  const id=getOutletId();
  if(!id || !window.sb) return;

  const r=await window.sb.from('outlets')
    .select('code,outlet_id,name,address,phone,contact_name,logo_url,banner_url')
    .eq('code',id)
    .maybeSingle();

  if(r.error){toast?.('Branding load failed: '+r.error.message);return;}
  const x=r.data;
  if(!x) return;

  const set=(id,val)=>{const e=document.getElementById(id);if(e)e.value=val??'';};
  set('jptBrandName',x.name);
  set('jptBrandAddress',x.address);
  set('jptBrandPhone',x.phone);
  set('jptBrandContact',x.contact_name);
  set('jptBrandLogoUrl',x.logo_url);
  set('jptBrandBannerUrl',x.banner_url);

  const lp=document.getElementById('jptBrandLogoPreview');
  lp.innerHTML=x.logo_url?'<img src="'+esc(x.logo_url)+'" alt="">':'No logo';
  const bp=document.getElementById('jptBrandBannerPreview');
  bp.innerHTML=x.banner_url?'<img src="'+esc(x.banner_url)+'" alt="">':'No banner';

  const n=document.getElementById('jptBrandCurrentOutlet');
  if(n)n.textContent=(x.name||x.code||id)+' • '+(x.code||id);
}

async function saveBranding(){
  const id=getOutletId();
  if(!id || !window.sb){toast?.('No active outlet selected');return;}

  const get=(x)=>document.getElementById(x)?.value.trim()||'';
  const patch={
    name:get('jptBrandName'),
    address:get('jptBrandAddress'),
    phone:get('jptBrandPhone'),
    contact_name:get('jptBrandContact'),
    logo_url:get('jptBrandLogoUrl'),
    banner_url:get('jptBrandBannerUrl')
  };

  if(!patch.name){toast?.('Outlet Name is required');return;}

  const btn=document.getElementById('jptBrandSave');
  if(btn)btn.disabled=true;

  try{
    const r=await window.sb.from('outlets').update(patch).eq('code',id);
    if(r.error){toast?.('Branding save failed: '+r.error.message);return;}

    try{await loadOutlet();}catch(e){}
    await loadBranding();
    toast?.('Outlet branding saved');
  }finally{
    if(btn)btn.disabled=false;
  }
}

function build(){
  if(document.getElementById(CARD_ID)) return;
  const settings=document.getElementById('settings');
  if(!settings) return;

  const card=document.createElement('div');
  card.id=CARD_ID;
  card.className='card';
  card.innerHTML=`
    <h3>Outlet Branding</h3>
    <p class="muted">Manage branding and contact details for the currently selected authorized outlet.</p>
    <div class="notice">Current outlet: <b id="jptBrandCurrentOutlet">Loading…</b></div>
    <div class="jpt-brand-grid" style="margin-top:12px">
      <div class="jpt-brand-field">
        <label>Outlet Name</label>
        <input id="jptBrandName" class="input" type="text" placeholder="Outlet name">
      </div>
      <div class="jpt-brand-field">
        <label>Contact Name</label>
        <input id="jptBrandContact" class="input" type="text" placeholder="Contact person">
      </div>
      <div class="jpt-brand-field">
        <label>Phone</label>
        <input id="jptBrandPhone" class="input" type="text" placeholder="Phone number">
      </div>
      <div class="jpt-brand-field">
        <label>Logo URL</label>
        <input id="jptBrandLogoUrl" class="input" type="url" placeholder="https://…">
      </div>
      <div class="jpt-brand-field full">
        <label>Address</label>
        <input id="jptBrandAddress" class="input" type="text" placeholder="Full outlet address">
      </div>
      <div class="jpt-brand-field full">
        <label>Banner URL</label>
        <input id="jptBrandBannerUrl" class="input" type="url" placeholder="https://…">
      </div>
    </div>

    <div class="jpt-brand-preview">
      <div class="jpt-brand-logo-preview" id="jptBrandLogoPreview">No logo</div>
      <div class="muted">Logo preview</div>
    </div>
    <div class="jpt-brand-banner-preview" id="jptBrandBannerPreview">No banner</div>

    <div class="jpt-brand-actions">
      <button class="btn gold" id="jptBrandSave" type="button">SAVE BRANDING</button>
      <button class="btn dark" id="jptBrandRefresh" type="button">REFRESH</button>
    </div>
  `;
  settings.appendChild(card);

  document.getElementById('jptBrandSave').onclick=saveBranding;
  document.getElementById('jptBrandRefresh').onclick=()=>loadBranding().catch(()=>{});
  ['jptBrandLogoUrl','jptBrandBannerUrl'].forEach(id=>{
    document.getElementById(id)?.addEventListener('input',()=>{
      const val=document.getElementById(id).value.trim();
      const target=id==='jptBrandLogoUrl'?'jptBrandLogoPreview':'jptBrandBannerPreview';
      const el=document.getElementById(target);
      el.innerHTML=val?'<img src="'+esc(val)+'" alt="">':(id==='jptBrandLogoUrl'?'No logo':'No banner');
    });
  });
}

function boot(){
  addStyle();
  let tries=0;
  const timer=setInterval(()=>{
    build();
    if(document.getElementById(CARD_ID)){
      loadBranding().catch(()=>{});
      clearInterval(timer);
    }
    if(++tries>=30)clearInterval(timer);
  },500);

  const sel=document.getElementById('outletSelect');
  if(sel)sel.addEventListener('change',()=>setTimeout(()=>loadBranding().catch(()=>{}),300));
}

document.readyState==='loading'
  ?document.addEventListener('DOMContentLoaded',boot)
  :boot();

})();
