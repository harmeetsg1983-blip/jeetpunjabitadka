/* JPT Scratch Card Outlet Control V1 — DB-driven, one outlet at a time. */
(function () {
  'use strict';
  let client=null, outlets=[], rows=[], selectedOutlet='';

  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function msg(t,ok){const e=document.getElementById('jptScratchMsg');if(e){e.textContent=t||'';e.className=ok?'success':'danger';}}
  function getClient(){
    if(client)return client;
    client=window.supabase.createClient(window.JPT_SUPABASE_URL,window.JPT_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
    return client;
  }
  function outletName(code){const o=outlets.find(x=>x.code===code);return o?(o.name||o.code):code;}

  async function loadData(){
    const c=getClient();
    const [or,sr]=await Promise.all([
      c.from('outlets').select('code,name,is_active,status').in('code',['JPT-001','SOP-002','PFA-003','NME-004','TOP-005']).order('code'),
      c.from('offers').select('id,outlet_id,title,code,discount_type,discount_value,discount_amount,min_order,max_order_amount,active,is_active,scratch_enabled,updated_at').in('outlet_id',['JPT-001','SOP-002','PFA-003','NME-004','TOP-005']).or('scratch_enabled.eq.true,code.like.JPT-SCRATCH-%').order('outlet_id').order('id')
    ]);
    if(or.error)throw or.error;if(sr.error)throw sr.error;
    outlets=(or.data||[]).filter(x=>x.is_active!==false);rows=sr.data||[];
    if(!selectedOutlet||!outlets.some(x=>x.code===selectedOutlet))selectedOutlet=outlets[0]?.code||'';
    renderOutletList();loadSelected();
  }

  function renderOutletList(){
    const sel=document.getElementById('jptScratchOutletSelect');if(!sel)return;
    sel.innerHTML=outlets.map(o=>{
      const on=rows.some(r=>r.outlet_id===o.code&&(r.active||r.is_active)&&r.scratch_enabled);
      return '<option value="'+esc(o.code)+'">'+esc(o.name||o.code)+' — '+esc(o.code)+(on?' • ON':' • OFF')+'</option>';
    }).join('');
    sel.value=selectedOutlet;
  }

  function loadSelected(){
    const r=rows.find(x=>x.outlet_id===selectedOutlet&&x.code==='JPT-SCRATCH-'+selectedOutlet)||rows.find(x=>x.outlet_id===selectedOutlet&&x.scratch_enabled);
    document.getElementById('jptScratchPct').value=r?Number(r.discount_value||0):20;
    document.getElementById('jptScratchCap').value=r?Number(r.discount_amount||0):40;
    document.getElementById('jptScratchMin').value=r?Number(r.min_order||0):0;
    document.getElementById('jptScratchMax').value=r&&r.max_order_amount!=null?Number(r.max_order_amount):220;
    document.getElementById('jptScratchActive').checked=!!(r&&(r.active||r.is_active)&&r.scratch_enabled);
    const live=document.getElementById('jptScratchLive');
    live.innerHTML='<b>'+esc(outletName(selectedOutlet))+'</b> <span class="muted">('+esc(selectedOutlet)+')</span>'+
      '<div class="muted" style="margin-top:5px">'+(r?('Current: '+Number(r.discount_value||0)+'% OFF · cap ₹'+Number(r.discount_amount||0)+' · eligible ₹'+Number(r.min_order||0)+'–₹'+(r.max_order_amount==null?'∞':Number(r.max_order_amount))+' · '+((r.active||r.is_active)?'ON':'OFF')):'No Scratch Card configured for this outlet.')+'</div>';
  }

  async function save(){
    if(!selectedOutlet)return msg('Select an outlet first.');
    const pct=Number(document.getElementById('jptScratchPct').value||0);
    const cap=Number(document.getElementById('jptScratchCap').value||0);
    const min=Number(document.getElementById('jptScratchMin').value||0);
    const rawMax=document.getElementById('jptScratchMax').value.trim();
    const max=rawMax===''?null:Number(rawMax);
    const active=document.getElementById('jptScratchActive').checked;
    if(!(pct>0&&pct<=100))return msg('Discount % must be between 0 and 100.');
    if(!(cap>0))return msg('Maximum discount must be greater than 0.');
    if(min<0)return msg('Minimum order cannot be negative.');
    if(max!==null&&(max<min||max<0))return msg('Maximum eligible order must be >= minimum order.');
    const btn=document.getElementById('jptScratchSave');btn.disabled=true;msg('Saving…');
    try{
      const c=getClient(),code='JPT-SCRATCH-'+selectedOutlet;
      // Keep exactly one controlled Scratch Card live per outlet. Legacy V106 scratch rows are disabled when this outlet is saved.
      const off=await c.from('offers').update({active:false,is_active:false,scratch_enabled:false,updated_at:new Date().toISOString()}).eq('outlet_id',selectedOutlet).or('scratch_enabled.eq.true,code.like.JPT-SCRATCH-%');
      if(off.error)throw off.error;
      const existing=rows.filter(x=>x.outlet_id===selectedOutlet&&x.code===code).sort((a,b)=>Number(b.id)-Number(a.id))[0];
      const row={outlet_id:selectedOutlet,title:'Royal Gold Scratch Card — '+pct+'% OFF',code,discount_type:'percentage',discount_value:pct,discount_amount:cap,min_order:min,max_order_amount:max,active:active,is_active:active,scratch_enabled:active,updated_at:new Date().toISOString()};
      const r=existing?.id?await c.from('offers').update(row).eq('id',existing.id).eq('outlet_id',selectedOutlet):await c.from('offers').insert(row);
      if(r.error)throw r.error;
      msg('Saved for '+outletName(selectedOutlet)+'.',true);await loadData();
    }catch(e){msg('Save failed: '+(e.message||e));}finally{btn.disabled=false;}
  }

  function render(){
    const old=document.getElementById('jptScratchManager');if(old)old.remove();
    const host=document.createElement('div');host.id='jptScratchManager';host.className='card';
    host.style.cssText='margin:10px 0;border:2px solid #8e6f2c;background:#100e09';
    host.innerHTML='<h2 style="margin:0 0 5px">✨ Royal Gold Scratch Card</h2>'+
      '<div class="muted">Each Scratch Card is controlled separately by outlet. Saving affects only the selected outlet.</div>'+
      '<div class="field"><label>Select Outlet</label><select id="jptScratchOutletSelect" class="select"></select></div>'+
      '<div id="jptScratchLive" class="notice"></div>'+
      '<div class="grid"><div class="field"><label>Discount %</label><input id="jptScratchPct" class="input" type="number" min="0" max="100" step="0.01"></div>'+
      '<div class="field"><label>Maximum discount ₹</label><input id="jptScratchCap" class="input" type="number" min="0" step="0.01"></div>'+
      '<div class="field"><label>Minimum order ₹</label><input id="jptScratchMin" class="input" type="number" min="0" step="0.01"></div>'+
      '<div class="field"><label>Maximum eligible order ₹</label><input id="jptScratchMax" class="input" type="number" min="0" step="0.01"></div></div>'+
      '<div class="field"><label><input id="jptScratchActive" type="checkbox"> Scratch Card ON</label></div>'+
      '<div id="jptScratchMsg" class="notice"></div>'+
      '<button type="button" class="btn gold" id="jptScratchSave">💾 Save This Outlet</button> '+
      '<button type="button" class="btn" id="jptScratchReload">↻ Reload</button>';
    const form=document.getElementById('offerForm'),offers=document.getElementById('offers');
    if(form?.parentNode)form.parentNode.insertBefore(host,form);else if(offers)offers.appendChild(host);else return;
    const legacy=document.getElementById('scratchSetup'); if(legacy){ legacy.textContent='✨ Scratch Cards'; legacy.onclick=function(){document.getElementById('jptScratchManager')?.scrollIntoView({behavior:'smooth',block:'start'});}; }
    document.getElementById('jptScratchOutletSelect').onchange=function(){selectedOutlet=this.value;loadSelected();};
    document.getElementById('jptScratchSave').onclick=save;
    document.getElementById('jptScratchReload').onclick=()=>loadData().catch(e=>msg('Reload failed: '+(e.message||e)));
    loadData().catch(e=>msg('Load failed: '+(e.message||e)));
  }
  function boot(){if(!window.supabase||!window.JPT_SUPABASE_URL||!window.JPT_SUPABASE_PUBLISHABLE_KEY||!document.getElementById('offers')){setTimeout(boot,300);return;}render();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();