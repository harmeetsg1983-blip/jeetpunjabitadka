/* JPT V106 MEDIA HOTFIX V4 — isolated, stable media/layout repair.
   Protects native menu/cart/runtime. No Supabase writes. No menu mutations.
   Fixes: horizontal overflow from 100%+margins, media cropping, repeated video resets.
*/
(function(){
  'use strict';
  var VIDEO='jeet-golden-banner.mp4';
  var BASE='assets/outlets/';
  var ASSETS={
    'SOP-002':BASE+'SOP-002_banner.jpg',
    'PFA-003':BASE+'PFA-003_banner.jpg',
    'NME-004':BASE+'NME-004_banner.jpg',
    'TOP-005':BASE+'TOP-005_banner.jpg'
  };
  var LOCK='180px';
  var scheduled=false;

  function outlet(){
    try{
      var p=new URLSearchParams(location.search);
      return p.get('outlet')||window.outletId||'JPT-001';
    }catch(e){ return window.outletId||'JPT-001'; }
  }

  function mainBox(){
    var box=document.getElementById('videoBanner');
    if(!box)return;
    /* Keep original 14px side margins without creating 100% + margins overflow. */
    box.style.width='auto';
    box.style.maxWidth='none';
    box.style.height=LOCK;
    box.style.minHeight=LOCK;
    box.style.maxHeight=LOCK;
    box.style.boxSizing='border-box';
    box.style.overflow='hidden';
    box.style.position='relative';
    box.style.display='block';
    box.style.aspectRatio='auto';
    box.style.marginTop='9px';
    box.style.marginRight='14px';
    box.style.marginBottom='9px';
    box.style.marginLeft='14px';
    box.style.background='#090909';

    var id=outlet();
    if(id==='JPT-001'){
      var v=box.querySelector('video');
      if(!v){
        box.innerHTML='';
        v=document.createElement('video');
        box.appendChild(v);
      }
      v.setAttribute('data-jpt-v106-media-v4','1');
      v.muted=true; v.autoplay=true; v.loop=true; v.playsInline=true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      v.controls=false;
      v.preload='auto';
      v.style.position='absolute';
      v.style.inset='0';
      v.style.width='100%';
      v.style.height='100%';
      /* Contain prevents the banner/video from losing its left/right content. */
      v.style.objectFit='contain';
      v.style.objectPosition='center center';
      v.style.display='block';
      v.style.margin='0';
      if(v.getAttribute('src')!==VIDEO){
        v.src=VIDEO;
        v.load();
      }
      v.play().catch(function(){});
      return;
    }

    var src=ASSETS[id];
    if(!src)return;
    var img=box.querySelector('img');
    if(!img){
      box.innerHTML='';
      img=document.createElement('img');
      box.appendChild(img);
    }
    img.setAttribute('data-jpt-v106-media-v4','1');
    if(img.getAttribute('src')!==src)img.src=src;
    img.alt=id+' restaurant promotional banner';
    img.loading='eager';
    img.decoding='async';
    img.style.position='absolute';
    img.style.inset='0';
    img.style.width='100%';
    img.style.height='100%';
    img.style.objectFit='contain';
    img.style.objectPosition='center center';
    img.style.display='block';
    img.style.margin='0';
    img.style.background='#090909';
  }

  function highlights(){
    var grid=document.getElementById('highlightGrid');
    if(!grid)return;
    grid.style.width='auto';
    grid.style.maxWidth='100%';
    grid.style.boxSizing='border-box';
    grid.style.overflowX='auto';
    grid.style.overflowY='hidden';
    Object.keys(ASSETS).forEach(function(id){
      var cards=grid.querySelectorAll('.highlight[onclick*="'+id+'"]');
      cards.forEach(function(card){
        card.style.position='relative';
        card.style.overflow='hidden';
        card.style.boxSizing='border-box';
        card.style.minHeight='138px';
        card.style.height='138px';
        card.style.flex='0 0 210px';
        card.style.aspectRatio='auto';
        card.style.padding='13px';
        var img=card.querySelector('img[data-jpt-v106-media-v4="1"]');
        if(!img){
          img=document.createElement('img');
          img.setAttribute('data-jpt-v106-media-v4','1');
          card.insertBefore(img,card.firstChild);
        }
        if(img.getAttribute('src')!==ASSETS[id])img.src=ASSETS[id];
        img.alt=id+' outlet banner';
        img.loading='eager'; img.decoding='async';
        img.style.position='absolute'; img.style.inset='0';
        img.style.width='100%'; img.style.height='100%';
        img.style.objectFit='cover'; img.style.objectPosition='center';
        img.style.display='block'; img.style.zIndex='0';
        Array.prototype.forEach.call(card.children,function(ch){
          if(ch!==img){ch.style.position='relative';ch.style.zIndex='1';}
        });
      });
    });
  }

  function apply(){
    scheduled=false;
    /* Prevent the media patch itself from ever widening the page. */
    document.documentElement.style.overflowX='hidden';
    document.body.style.overflowX='hidden';
    mainBox();
    highlights();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(apply,120);
  }
  function boot(){
    apply();
    var obs=new MutationObserver(schedule);
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    [400,1000,2000,3500].forEach(function(ms){setTimeout(apply,ms);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
