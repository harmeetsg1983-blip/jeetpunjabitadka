(function(){
  'use strict';

  /* V106 media hotfix — safe, one-pass version.
     Does not replace the page, menu, cart, checkout, Supabase or outlet logic.
     It only styles/loads the media boxes after the app has rendered them. */
  var BASE='assets/outlets/';
  var ASSETS={
    'SOP-002':BASE+'SOP-002_banner.jpg',
    'PFA-003':BASE+'PFA-003_banner.jpg',
    'NME-004':BASE+'NME-004_banner.jpg',
    'TOP-005':BASE+'TOP-005_banner.jpg'
  };

  function currentOutlet(){
    try{
      var p=new URLSearchParams(location.search);
      return p.get('outlet') || window.outletId || 'JPT-001';
    }catch(e){
      return window.outletId || 'JPT-001';
    }
  }

  function applyHighlightImages(){
    var grid=document.getElementById('highlightGrid');
    if(!grid)return;
    grid.querySelectorAll('.highlight').forEach(function(card){
      var m=(card.getAttribute('onclick')||'').match(/switchOutlet\(['\"]([^'\"]+)/);
      var id=m?m[1]:'';
      var src=ASSETS[id];
      if(!src)return;
      card.style.backgroundImage='url("'+src+'")';
      card.style.backgroundSize='cover';
      card.style.backgroundPosition='center';
      card.style.backgroundRepeat='no-repeat';
      card.style.aspectRatio='16 / 9';
      card.style.minHeight='0';
      card.style.height='auto';
    });
  }

  function applyMainBanner(){
    var box=document.getElementById('videoBanner');
    if(!box)return;

    var id=currentOutlet();

    /* JPT-001 keeps the exact user-supplied MP4. Never crop it. */
    if(id==='JPT-001'){
      var v=box.querySelector('video');
      if(v){
        v.muted=true;
        v.autoplay=true;
        v.loop=true;
        v.playsInline=true;
        v.setAttribute('playsinline','');
        v.setAttribute('webkit-playsinline','');
        v.style.width='100%';
        v.style.height='auto';
        v.style.maxHeight='none';
        v.style.objectFit='contain';
        v.style.objectPosition='center';
        v.style.display='block';
        v.play().catch(function(){});
      }
      box.style.minHeight='0';
      box.style.height='auto';
      box.style.background='#111';
      box.style.overflow='hidden';
      return;
    }

    var src=ASSETS[id];
    if(!src)return;

    /* Do not repeatedly rewrite innerHTML: that can create a MutationObserver loop. */
    var img=box.querySelector('img[data-v106-outlet-banner="1"]');
    if(!img){
      box.innerHTML='';
      img=document.createElement('img');
      img.setAttribute('data-v106-outlet-banner','1');
      img.alt=id+' restaurant promotional banner';
      img.loading='eager';
      img.decoding='async';
      box.appendChild(img);
    }
    if(img.getAttribute('src')!==src)img.src=src;
    img.style.width='100%';
    img.style.height='auto';
    img.style.minHeight='0';
    img.style.objectFit='contain';
    img.style.objectPosition='center';
    img.style.display='block';

    box.style.minHeight='0';
    box.style.height='auto';
    box.style.aspectRatio='16 / 9';
    box.style.background='#111';
    box.style.borderRadius='14px';
    box.style.overflow='hidden';
  }

  function apply(){
    applyHighlightImages();
    applyMainBanner();
  }

  function boot(){
    apply();
    /* Only watch for newly rendered highlight/video elements, without rewriting
       the same element repeatedly. A small debounce keeps this safe. */
    var timer=null;
    var obs=new MutationObserver(function(){
      clearTimeout(timer);
      timer=setTimeout(apply,80);
    });
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    [300,1000,2000,4000].forEach(function(ms){setTimeout(apply,ms);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
