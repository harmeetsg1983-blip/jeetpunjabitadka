/* JPT Outlet Showcase V1
   Customer home: five outlet cards, large top video/media sponsor area + lower outlet poster.
   Top media: images rotate every 10s; videos advance on ended.
   Top frame uses outlet accent (green-family sponsor glow); lower poster uses gold highlight.
   Read-only customer layer; outlet management remains in Restaurant Partner/Admin.
*/
(function(){
'use strict';
if(window.__JPT_OUTLET_SHOWCASE_V1__) return;
window.__JPT_OUTLET_SHOWCASE_V1__=true;

const OUT={
 "JPT-001":{name:"Jeet Punjabi Tadka",accent:"#d8ae42"},
 "SOP-002":{name:"Shan-e-Punjab",accent:"#49b36a"},
 "PFA-003":{name:"Punjabi Food Adda",accent:"#df6680"},
 "NME-004":{name:"99 Meal Express",accent:"#f29b32"},
 "TOP-005":{name:"Taste of Punjab",accent:"#7b74e8"}
};
const fallback=window.ROYAL_MEDIA||{};
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const css=document.createElement('style');css.textContent=`
#jptOutletShowcase{margin:12px 14px 18px}
.jpt-os-head{display:flex;justify-content:space-between;align-items:center;margin:0 0 9px}
.jpt-os-head b{font-size:17px;color:#f4d77a}
.jpt-os-head small{font-size:10px;color:#888}
.jpt-os-list{display:flex;flex-direction:column;gap:16px}
.jpt-os-card{border:1px solid rgba(216,174,66,.72);border-radius:18px;background:#080808;overflow:hidden;box-shadow:0 10px 30px #0009}
.jpt-os-name{padding:10px 12px 8px;font-weight:1000;font-size:17px;background:linear-gradient(180deg,#171717,#0a0a0a)}
.jpt-os-name span{font-size:10px;color:#999;font-weight:700;margin-left:6px}
.jpt-os-video{position:relative;height:300px;background:#020202;overflow:hidden;border-top:1px solid rgba(255,255,255,.04);border-bottom:1px solid rgba(255,255,255,.05)}
.jpt-os-video:after{content:"";position:absolute;inset:0;pointer-events:none;border:2px solid var(--os-accent);box-shadow:inset 0 0 20px color-mix(in srgb,var(--os-accent) 28%,transparent),0 0 18px color-mix(in srgb,var(--os-accent) 18%,transparent);border-radius:0}
.jpt-os-video video,.jpt-os-video img{width:100%;height:100%;display:block;object-fit:cover}
.jpt-os-video video{position:relative;z-index:1}
.jpt-os-empty{height:100%;display:grid;place-items:center;text-align:center;color:#aaa;padding:20px;position:relative;z-index:1;background:linear-gradient(135deg,#06130a,#050505)}
.jpt-os-empty b{display:block;color:#8be6a7;font-size:15px;margin-bottom:4px}
.jpt-os-poster{position:relative;height:180px;background:#111;overflow:hidden;border-top:3px solid rgba(216,174,66,.95)}
.jpt-os-poster img{width:100%;height:100%;display:block;object-fit:cover}
.jpt-os-poster:after{content:"";position:absolute;inset:0;pointer-events:none;border:2px solid #d8ae42;box-shadow:inset 0 0 22px rgba(216,174,66,.28),0 0 15px rgba(216,174,66,.18)}
.jpt-os-poster-empty{height:100%;display:grid;place-items:center;color:#9b8b62;background:linear-gradient(135deg,#20180b,#080808)}
.jpt-os-footer{padding:8px 12px 10px;display:flex;justify-content:space-between;align-items:center;background:#0d0d0d}
.jpt-os-footer b{font-size:11px;color:#f4d77a}.jpt-os-footer button{border:1px solid #d8ae42;background:#17130a;color:#f4d77a;border-radius:9px;padding:7px 11px;font-weight:900}
`;document.head.appendChild(css);

function active(c){
 const now=Date.now(),s=c.start_at?Date.parse(c.start_at):-Infinity,e=c.end_at?Date.parse(c.end_at):Infinity;
 return c.active!==false && s<=now && now<=e;
}
function mediaOf(c){
 const s=c&&typeof c.schedule_json==='object'?c.schedule_json:{};
 if(s.campaign_type!=='media')return null;
 const video=c.video_url||s.video_url||null, image=c.banner_url||s.image_url||null;
 if(!video&&!image)return null;
 return {video,image,priority:Number(c.priority||0),id:c.id};
}
function playQueue(host,queue){
 let idx=0,timer=null,token=0;
 const show=()=>{
  const item=queue[idx%queue.length];idx++;
  const my=++token;
  host.innerHTML='';
  if(item.video){
   const v=document.createElement('video');
   v.src=item.video;v.muted=true;v.playsInline=true;v.autoplay=true;v.controls=false;
   v.style.cssText='width:100%;height:100%;object-fit:cover;display:block';
   host.appendChild(v);
   const next=()=>{if(my!==token)return;clearTimeout(timer);show()};
   v.addEventListener('ended',next,{once:true});
   v.addEventListener('error',next,{once:true});
   const p=v.play();if(p&&p.catch)p.catch(()=>{});
  }else{
   const img=document.createElement('img');img.src=item.image;img.alt='Outlet video sponsor';host.appendChild(img);
   clearTimeout(timer);timer=setTimeout(()=>{if(my===token)show()},10000);
  }
 };
 if(queue.length)show();
}
async function mount(){
 const anchor=document.getElementById('highlightGrid');
 if(!anchor||document.getElementById('jptOutletShowcase'))return;
 const wrap=document.createElement('section');wrap.id='jptOutletShowcase';
 wrap.innerHTML='<div class="jpt-os-head"><b>🏪 Our Restaurants</b><small>VIDEO • POSTER</small></div><div class="jpt-os-list" id="jptOsList"></div>';
 anchor.parentNode.insertBefore(wrap,anchor);
 anchor.style.display='none';
 const list=wrap.querySelector('#jptOsList');
 try{
  const sb=window.sb;
  const ids=Object.keys(OUT);
  const [or,cr]=await Promise.all([
   sb.from('outlets').select('*').in('outlet_id',ids),
   sb.from('campaigns').select('*').in('outlet_id',ids)
  ]);
  const recs=Object.fromEntries((or.data||[]).map(x=>[x.outlet_id,x]));
  const by={};ids.forEach(id=>{by[id]=[]});
  (cr.data||[]).forEach(c=>{if(by[c.outlet_id]){const m=mediaOf(c);if(m&&active(c))by[c.outlet_id].push(m)}});
  ids.forEach(id=>{by[id].sort((a,b)=>b.priority-a.priority);by[id]=by[id].slice(0,1)});
  list.innerHTML=ids.map(id=>{
   const o=OUT[id],r=recs[id]||{},legacy=r.banner_url||r.cover_image||r.banner_image||r.image_url||r.image||fallback[id]||'';
   return '<article class="jpt-os-card" style="--os-accent:'+o.accent+'">'+
    '<div class="jpt-os-name" style="color:'+o.accent+'">'+esc(r.name||o.name)+' <span>'+id+'</span></div>'+
    '<div class="jpt-os-video" data-os-video="'+id+'">'+(legacy&&!by[id].length?'<img src="'+esc(legacy)+'" alt="'+esc(r.name||o.name)+' banner">':'<div class="jpt-os-empty"><div><b>🎬 OUTLET BANNER</b>Upload one image or video for this outlet</div></div>')+'</div>'+
    '<div class="jpt-os-footer"><b>LIVE BANNER • '+id+'</b><button type="button" data-os-open="'+id+'">VIEW MENU</button></div>'+
   '</article>';
  }).join('');
  ids.forEach(id=>{const h=list.querySelector('[data-os-video="'+id+'"]');if(h&&by[id].length)playQueue(h,by[id]);});
  list.querySelectorAll('[data-os-open]').forEach(b=>b.onclick=()=>window.switchOutlet&&window.switchOutlet(b.dataset.osOpen));
 }catch(e){console.warn('[JPT Outlet Showcase]',e);}
}
let n=0;const t=setInterval(()=>{try{mount()}catch(e){}if(document.getElementById('jptOutletShowcase')||++n>30)clearInterval(t)},500);
})();