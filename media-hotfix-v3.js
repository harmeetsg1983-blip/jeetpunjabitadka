/* JPT V106 MEDIA HOTFIX V3 — isolated visual repair only.
   Protects native menu/cart/runtime. No Supabase writes. No menu mutations.
   Fixes: centered main video slot + guaranteed four outlet highlight images.
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
    }catch(e){
      return window.outletId||'JPT-001';
    }
  }

  function mainBox(){
    var box=document.getElementById('videoBanner');
    if(!box)return;
    box.style.position='relative';
    box.style.width='100%';
    box.style.height=LOCK;
    box.style.minHeight=LOCK;
    box.style.maxHeight=LOCK;
    box.style.overflow='hidden';
    box.style.boxSizing='border-box';
    box.style.display='block';
    box.style.aspectRatio='auto';
    box.style.marginTop='9px';
    box.style.marginBottom='9px';

    var id=outlet();

    if(id==='JPT-001'){
      var v=box.querySelector('video[data-jpt-v106-media-v3="1"]')||box.querySelector('video');
      if(!v){
        v=document.createElement('video');
        box.innerHTML='';
        box.appendChild(v);
      }
      v.setAttribute('data-jpt-v106-media-v3','1');
      v.src=VIDEO;
      v.muted=true;
      v.autoplay=true;
      v.loop=true;
      v.playsInline=true;
      v.setAttribute('playsinline','');
      v.setAttribute('webkit-playsinline','');
      v.controls=false;
      v.style.position='absolute';
      v.style.inset='0';
      v.style.width='100%';
      v.style.height='100%';
      v.style.objectFit='cover';
      v.style.objectPosition='center center';
      v.style.display='block';
      v.style.margin='0';
      v.play().catch(function(){});
      return;
    }

    var src=ASSETS[id];
    if(!src)return;
    var img=box.querySelector('img[data-jpt-v106-media-v3="1"]');
    if(!img){
      box.innerHTML='';
      img=document.createElement('img');
      img.setAttribute('data-jpt-v106-media-v3','1');
      box.appendChild(img);
    }
    img.src=src;
    img.alt=id+' restaurant promotional banner';
    img.loading='eager';
    img.decoding='async';
    img.style.position='absolute';
    img.style.inset='0';
    img.style.width='100%';
    img.style.height='100%';
    img.style.objectFit='cover';
    img.style.objectPosition='center center';
    img.style.display='block';
    img.style.margin='0';
  }

  function highlights(){
    var grid=document.getElementById('highlightGrid');
    if(!grid)return;

    Object.keys(ASSETS).forEach(function(id){
      var cards=grid.querySelectorAll('.highlight[onclick*="'+id+'"]');
      cards.forEach(function(card){
        card.style.position='relative';
        card.style.overflow='hidden';
        card.style.minHeight='138px';
        card.style.height='138px';
        card.style.aspectRatio='auto';
        card.style.padding='13px';

        var img=card.querySelector('img[data-jpt-v106-media-v3="1"]');
        if(!img){
          img=document.createElement('img');
          img.setAttribute('data-jpt-v106-media-v3','1');
          card.insertBefore(img,card.firstChild);
        }
        img.src=ASSETS[id];
        img.alt=id+' outlet banner';
        img.loading='eager';
        img.decoding='async';
        img.style.position='absolute';
        img.style.inset='0';
        img.style.width='100%';
        img.style.height='100%';
        img.style.objectFit='cover';
        img.style.objectPosition='center';
        img.style.display='block';
        img.style.zIndex='0';

        Array.prototype.forEach.call(card.children,function(ch){
          if(ch!==img){
            ch.style.position='relative';
            ch.style.zIndex='1';
          }
        });
      });
    });
  }

  function apply(){
    scheduled=false;
    mainBox();
    highlights();
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(apply,80);
  }

  function boot(){
    apply();
    var obs=new MutationObserver(schedule);
    if(document.body)obs.observe(document.body,{childList:true,subtree:true});
    [300,900,1800,3000].forEach(function(ms){setTimeout(apply,ms);});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
