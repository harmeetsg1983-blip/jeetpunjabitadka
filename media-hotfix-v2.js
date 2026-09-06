(function(){
  'use strict';
  /* V106 FINAL MEDIA FIX — only controls the main media banner and outlet highlight images. */
  var VIDEO='jeet-golden-banner.mp4';
  var BASE='assets/outlets/';
  var ASSETS={
    'SOP-002':BASE+'SOP-002_banner.jpg',
    'PFA-003':BASE+'PFA-003_banner.jpg',
    'NME-004':BASE+'NME-004_banner.jpg',
    'TOP-005':BASE+'TOP-005_banner.jpg'
  };
  function currentOutlet(){
    try{var p=new URLSearchParams(location.search);return p.get('outlet')||window.outletId||'JPT-001';}
    catch(e){return window.outletId||'JPT-001';}
  }
  function applyHighlightImages(){
    var grid=document.getElementById('highlightGrid'); if(!grid)return;
    grid.querySelectorAll('.highlight').forEach(function(card){
      var m=(card.getAttribute('onclick')||'').match(/switchOutlet\(['\"]([^'\"]+)/); var id=m?m[1]:''; var src=ASSETS[id]; if(!src)return;
      card.style.backgroundImage='url("'+src+'")'; card.style.backgroundSize='cover'; card.style.backgroundPosition='center'; card.style.backgroundRepeat='no-repeat';
      card.style.aspectRatio='16 / 9'; card.style.minHeight='0'; card.style.height='auto';
    });
  }
  function applyMainBanner(){
    var box=document.getElementById('videoBanner'); if(!box)return;
    var id=currentOutlet();
    if(id==='JPT-001'){
      var v=box.querySelector('video[data-v106-main-video="1"]');
      if(!v){
        box.innerHTML='';
        v=document.createElement('video');
        v.setAttribute('data-v106-main-video','1');
        v.src=VIDEO;
        v.muted=true; v.autoplay=true; v.loop=true; v.playsInline=true;
        v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
        box.appendChild(v);
      }
      if(v.getAttribute('src')!==VIDEO)v.src=VIDEO;
      v.muted=true; v.autoplay=true; v.loop=true; v.playsInline=true;
      v.style.width='100%'; v.style.height='180px'; v.style.objectFit='cover'; v.style.objectPosition='center 40%'; v.style.display='block';
      box.style.minHeight='0'; box.style.height='180px'; box.style.aspectRatio='auto'; box.style.background='#111'; box.style.overflow='hidden';
      v.play().catch(function(){});
      return;
    }
    var src=ASSETS[id]; if(!src)return;
    var img=box.querySelector('img[data-v106-outlet-banner="1"]');
    if(!img){box.innerHTML='';img=document.createElement('img');img.setAttribute('data-v106-outlet-banner','1');box.appendChild(img);}
    if(img.src!==new URL(src,location.href).href)img.src=src;
    img.alt=id+' restaurant promotional banner'; img.loading='eager'; img.decoding='async';
    img.style.width='100%'; img.style.height='180px'; img.style.objectFit='cover'; img.style.objectPosition='center'; img.style.display='block';
    box.style.minHeight='0'; box.style.height='180px'; box.style.aspectRatio='auto'; box.style.background='#111'; box.style.borderRadius='14px'; box.style.overflow='hidden';
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
