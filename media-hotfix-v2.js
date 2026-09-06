(function(){
  'use strict';
  /* V106 PERMANENT MEDIA LOCK — fixed 180px media slot; prevents layout jumping. */
  var VIDEO='jeet-golden-banner.mp4';
  var BASE='assets/outlets/';
  var ASSETS={
    'SOP-002':BASE+'SOP-002_banner.jpg',
    'PFA-003':BASE+'PFA-003_banner.jpg',
    'NME-004':BASE+'NME-004_banner.jpg',
    'TOP-005':BASE+'TOP-005_banner.jpg'
  };
  var LOCK='180px';
  function currentOutlet(){
    try{var p=new URLSearchParams(location.search);return p.get('outlet')||window.outletId||'JPT-001';}
    catch(e){return window.outletId||'JPT-001';}
  }
  function lockBox(box){
    box.style.minHeight=LOCK; box.style.height=LOCK; box.style.maxHeight=LOCK;
    box.style.aspectRatio='auto'; box.style.overflow='hidden'; box.style.position='relative';
    box.style.boxSizing='border-box'; box.style.background='#111';
  }
  function lockMedia(el){
    el.style.position='absolute'; el.style.inset='0'; el.style.width='100%'; el.style.height='100%';
    el.style.minHeight='100%'; el.style.maxHeight='100%'; el.style.objectFit='cover';
    el.style.objectPosition='center'; el.style.display='block'; el.style.margin='0';
  }
  function applyHighlightImages(){
    var grid=document.getElementById('highlightGrid'); if(!grid)return;
    grid.querySelectorAll('.highlight').forEach(function(card){
      var m=(card.getAttribute('onclick')||'').match(/switchOutlet\(['"]([^'"]+)/);
      var id=m?m[1]:''; var src=ASSETS[id]; if(!src)return;
      card.style.backgroundImage='url("'+src+'")'; card.style.backgroundSize='cover';
      card.style.backgroundPosition='center'; card.style.backgroundRepeat='no-repeat';
      card.style.aspectRatio='16 / 9'; card.style.minHeight='0'; card.style.height='auto';
    });
  }
  function applyMainBanner(){
    var box=document.getElementById('videoBanner'); if(!box)return;
    var id=currentOutlet(); lockBox(box);
    if(id==='JPT-001'){
      var v=box.querySelector('video[data-v106-main-video="1"]');
      if(!v){
        box.innerHTML='';
        v=document.createElement('video');
        v.setAttribute('data-v106-main-video','1');
        v.src=VIDEO; v.muted=true; v.autoplay=true; v.loop=true; v.playsInline=true;
        v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
        box.appendChild(v);
      }
      if(v.getAttribute('src')!==VIDEO)v.src=VIDEO;
      v.muted=true; v.autoplay=true; v.loop=true; v.playsInline=true; lockMedia(v);
      v.play().catch(function(){});
      return;
    }
    var src=ASSETS[id]; if(!src)return;
    var img=box.querySelector('img[data-v106-outlet-banner="1"]');
    if(!img){box.innerHTML='';img=document.createElement('img');img.setAttribute('data-v106-outlet-banner','1');box.appendChild(img);}
    if(img.src!==new URL(src,location.href).href)img.src=src;
    img.alt=id+' restaurant promotional banner'; img.loading='eager'; img.decoding='async'; lockMedia(img);
  }
  function apply(){applyHighlightImages();applyMainBanner();}
  function boot(){
    apply(); var timer=null;
    var obs=new MutationObserver(function(){clearTimeout(timer);timer=setTimeout(apply,120);});
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    [500,1500,3000].forEach(function(ms){setTimeout(apply,ms);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();