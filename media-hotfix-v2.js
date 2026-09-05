(function(){
  'use strict';

  /* V106 FINAL MEDIA FIX
     Display-only media correction.
     Does not modify the MP4 file or menu/cart/checkout/Supabase/outlet logic. */

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
      if(p.get('outlet')) return p.get('outlet');
    }catch(e){}
    try{
      if(typeof outletId !== 'undefined' && outletId) return outletId;
    }catch(e){}
    return 'JPT-001';
  }

  function applyHighlightImages(){
    var grid=document.getElementById('highlightGrid');
    if(!grid)return;
    grid.querySelectorAll('.highlight').forEach(function(card){
      var m=(card.getAttribute('onclick')||'').match(/switchOutlet\(['"]([^'"]+)/);
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

    /* JPT-001: keep the exact MP4, but crop ONLY its display area.
       The uploaded portrait video contains a horizontal banner in its center.
       A fixed 4:3 frame + object-fit:cover shows that banner cleanly without
       changing the original video file. */
    if(id==='JPT-001'){
      var v=box.querySelector('video');
      if(!v)return;

      box.style.position='relative';
      box.style.minHeight='0';
      box.style.height='auto';
      box.style.aspectRatio='4 / 3';
      box.style.background='#111';
      box.style.overflow='hidden';
      box.style.borderRadius='14px';

      v.muted=true;
      v.autoplay=true;
      v.loop=true;
      v.playsInline=true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      v.style.position='absolute';
      v.style.inset='0';
      v.style.width='100%';
      v.style.height='100%';
      v.style.maxHeight='none';
      v.style.objectFit='cover';
      v.style.objectPosition='center center';
      v.style.display='block';
      v.play().catch(function(){});
      return;
    }

    var src=ASSETS[id];
    if(!src)return;

    /* Non-JPT outlets use their supplied banner image inside a 16:9 frame.
       Create the image once so MutationObserver cannot cause a rewrite loop. */
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
    if(img.getAttribute('src')!==src) img.src=src;

    box.style.position='relative';
    box.style.minHeight='0';
    box.style.height='auto';
    box.style.aspectRatio='16 / 9';
    box.style.background='#111';
    box.style.borderRadius='14px';
    box.style.overflow='hidden';

    img.style.width='100%';
    img.style.height='100%';
    img.style.minHeight='0';
    img.style.objectFit='contain';
    img.style.objectPosition='center';
    img.style.display='block';
  }

  function apply(){
    applyHighlightImages();
    applyMainBanner();
  }

  function boot(){
    apply();

    var timer=null;
    var obs=new MutationObserver(function(){
      clearTimeout(timer);
      timer=setTimeout(apply,100);
    });
    if(document.body) obs.observe(document.body,{childList:true,subtree:true});

    [300,1000,2000,4000].forEach(function(ms){
      setTimeout(apply,ms);
    });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
