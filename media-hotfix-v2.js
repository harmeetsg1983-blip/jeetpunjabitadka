(function(){
  'use strict';
  var BASE='assets/outlets/';
  var ASSETS={
    'SOP-002':BASE+'SOP-002_banner.jpg',
    'PFA-003':BASE+'PFA-003_banner.jpg',
    'NME-004':BASE+'NME-004_banner.jpg',
    'TOP-005':BASE+'TOP-005_banner.jpg'
  };
  function outletFromUrl(){
    try{return new URLSearchParams(location.search).get('outlet')||'JPT-001';}catch(e){return 'JPT-001';}
  }
  function applyHighlightImages(){
    document.querySelectorAll('#highlightGrid .highlight').forEach(function(card){
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
    var id=outletFromUrl();
    if(id==='JPT-001'){
      var v=box.querySelector('video');
      if(v){v.muted=true;v.autoplay=true;v.loop=true;v.playsInline=true;v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');v.play().catch(function(){});}
      return;
    }
    var src=ASSETS[id];
    if(!src)return;
    box.innerHTML='<img src="'+src+'" alt="'+id+' restaurant promotional banner" loading="eager" decoding="async">';
    box.style.minHeight='0';
    box.style.aspectRatio='16 / 9';
    box.style.background='#111';
    box.style.borderRadius='14px';
    box.style.overflow='hidden';
    var img=box.querySelector('img');
    if(img){img.style.width='100%';img.style.height='100%';img.style.objectFit='contain';img.style.objectPosition='center';img.style.display='block';}
  }
  function apply(){
    applyHighlightImages();
    applyMainBanner();
  }
  function boot(){
    apply();
    var obs=new MutationObserver(function(){applyHighlightImages();applyMainBanner();});
    obs.observe(document.body,{childList:true,subtree:true});
    [300,800,1500,3000,5000].forEach(function(ms){setTimeout(apply,ms);});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
