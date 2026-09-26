/* JPT Partner Timing Manager V1
   UI-only feature layer. Does not rewrite admin.html or customer app.
   Uses existing outlets.opening_time / closing_time and outlets.metadata.
*/
(function(){
  'use strict';

  const DAYS = [
    ['1','Monday'],['2','Tuesday'],['3','Wednesday'],
    ['4','Thursday'],['5','Friday'],['6','Saturday'],['0','Sunday']
  ];

  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function getOutletId(){
    return String(window.activeOutlet || document.getElementById('outletSelect')?.value || '');
  }

  function getClient(){
    return window.sb || null;
  }

  function ensurePanel(){
    const settings = document.getElementById('settings');
    if(!settings || document.getElementById('jptTimingManagerV1')) return;

    const card = document.createElement('div');
    card.id = 'jptTimingManagerV1';
    card.className = 'card';
    card.style.marginTop = '10px';
    card.innerHTML = `
      <h3 style="color:#d8ae42">⏰ Outlet Timings</h3>
      <div class="notice">
        Set weekly opening hours for this outlet. Existing outlet opening/closing fields remain the source of truth;
        this manager adds a weekly schedule in outlet metadata without changing the customer app.
      </div>
      <div id="jptTimingRows"></div>
      <div class="rowactions" style="margin-top:10px">
        <button class="btn gold" id="jptTimingSave" style="background:#d8ae42!important;color:#111!important;border:1px solid #d8ae42!important;font-weight:700!important;opacity:1!important;visibility:visible!important;">Save Timings</button>
        <button class="btn" id="jptTimingRefresh">↻ Refresh</button>
      </div>
      <div id="jptTimingNotice" class="notice">Loading timing settings…</div>
    `;
    settings.appendChild(card);

    document.getElementById('jptTimingSave').onclick = save;
    document.getElementById('jptTimingRefresh').onclick = load;
  }

  function defaultRows(outlet){
    const open = String(outlet?.opening_time || '11:00:00').slice(0,5);
    const close = String(outlet?.closing_time || '23:00:00').slice(0,5);
    const closedDay = outlet?.metadata?.weekly_closed_day != null
      ? String(outlet.metadata.weekly_closed_day)
      : null;

    return DAYS.map(([key,name])=>({
      key,name,
      closed: closedDay === key,
      open,
      close
    }));
  }

  function render(rows){
    const root = document.getElementById('jptTimingRows');
    if(!root) return;
    root.innerHTML = rows.map((r,i)=>`
      <div class="card jpt-timing-row" data-day="${esc(r.key)}" style="margin:8px 0;padding:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <b>${esc(r.name)}</b>
          <label class="muted">
            <input type="checkbox" class="jptClosed" ${r.closed?'checked':''}>
            Closed
          </label>
        </div>
        <div class="two" style="margin-top:8px">
          <div class="field">
            <label>Opening</label>
            <input class="input jptOpen" type="time" value="${esc(r.open)}">
          </div>
          <div class="field">
            <label>Closing</label>
            <input class="input jptClose" type="time" value="${esc(r.close)}">
          </div>
        </div>
      </div>
    `).join('');
  }

  async function load(){
    const sb = getClient(), outletId = getOutletId();
    const notice = document.getElementById('jptTimingNotice');
    if(!sb || !outletId || !notice) return;

    notice.textContent = 'Loading timing settings…';
    let r = await sb.from('outlets')
      .select('id,code,name,opening_time,closing_time,metadata')
      .eq('code',outletId)
      .maybeSingle();

    if(r.error){
      notice.innerHTML = '<span class="danger">'+esc(r.error.message)+'</span>';
      return;
    }

    const outlet = r.data || {};
    const metadata = (outlet.metadata && typeof outlet.metadata === 'object') ? outlet.metadata : {};
    const saved = Array.isArray(metadata.weekly_schedule) ? metadata.weekly_schedule : null;
    const rows = defaultRows(outlet);

    if(saved){
      saved.forEach(x=>{
        const row = rows.find(y=>y.key===String(x.day));
        if(!row) return;
        row.closed = !!x.closed;
        if(x.open) row.open = String(x.open).slice(0,5);
        if(x.close) row.close = String(x.close).slice(0,5);
      });
    }

    render(rows);
    notice.innerHTML = '<span class="success">Timing settings loaded for '+esc(outlet.name || outletId)+'.</span>';
  }

  async function save(){
    const sb = getClient(), outletId = getOutletId();
    const notice = document.getElementById('jptTimingNotice');
    if(!sb || !outletId || !notice) return;

    const rows = [...document.querySelectorAll('#jptTimingRows .jpt-timing-row')].map(row=>({
      day: row.dataset.day,
      open: row.querySelector('.jptOpen')?.value || '11:00',
      close: row.querySelector('.jptClose')?.value || '23:00',
      closed: !!row.querySelector('.jptClosed')?.checked
    }));

    for(const r of rows){
      if(!r.closed && (!r.open || !r.close)){
        notice.innerHTML = '<span class="danger">Every open day needs an opening and closing time.</span>';
        return;
      }
      if(!r.closed && r.open === r.close){
        notice.innerHTML = '<span class="danger">'+esc(DAYS.find(d=>d[0]===r.day)?.[1] || 'Day')+' cannot have identical opening and closing times.</span>';
        return;
      }
    }

    notice.textContent = 'Saving timing settings…';

    const current = await sb.from('outlets')
      .select('metadata,opening_time,closing_time')
      .eq('code',outletId)
      .maybeSingle();

    if(current.error){
      notice.innerHTML = '<span class="danger">'+esc(current.error.message)+'</span>';
      return;
    }

    const meta = (current.data?.metadata && typeof current.data.metadata === 'object')
      ? {...current.data.metadata}
      : {};

    meta.weekly_schedule = rows;
    meta.timing_manager_version = 'v1';

    const monday = rows.find(x=>x.day==='1') || rows.find(x=>!x.closed);
    const fallbackOpen = monday?.open || '11:00';
    const fallbackClose = monday?.close || '23:00';

    const patch = {
      opening_time: fallbackOpen + ':00',
      closing_time: fallbackClose + ':00',
      metadata: meta
    };

    let r = await sb.from('outlets').update(patch).eq('code',outletId);
    if(r.error){
      notice.innerHTML = '<span class="danger">'+esc(r.error.message)+'</span>';
      return;
    }

    notice.innerHTML = '<span class="success">✓ Weekly outlet timings saved successfully.</span>';
    try{
      if(typeof window.loadOutlet === 'function') await window.loadOutlet();
    }catch(e){}
  }

  function boot(){
    ensurePanel();
    load();
    const select = document.getElementById('outletSelect');
    if(select && !select.__jptTimingBound){
      select.__jptTimingBound = true;
      select.addEventListener('change',()=>setTimeout(load,250));
    }
  }

  let tries=0;
  const timer=setInterval(()=>{
    tries++;
    if(document.getElementById('settings') && window.sb){
      clearInterval(timer);
      boot();
    }
    if(tries>80) clearInterval(timer);
  },250);

  window.JPTTimingManagerV1 = {boot,load,save};
})();
