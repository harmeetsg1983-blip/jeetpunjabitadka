/* JPT V106 MEDIA HOTFIX V4 — FINAL RATIO-LOCK
   Isolated media-only repair.
   Does NOT modify menu/cart/runtime/Supabase/payment.
   Purpose: make the media box exactly match the media's natural aspect ratio.
   No crop. No overflow. No artificial 180px height. No competing video reset.
*/
(function(){
  'use strict';

  var VIDEO = 'jeet-golden-banner.mp4';
  var BASE = 'assets/outlets/';
  var ASSETS = {
    'SOP-002': BASE + 'SOP-002_banner.jpg',
    'PFA-003': BASE + 'PFA-003_banner.jpg',
    'NME-004': BASE + 'NME-004_banner.jpg',
    'TOP-005': BASE + 'TOP-005_banner.jpg'
  };

  function getOutlet(){
    try{
      var p = new URLSearchParams(location.search);
      return p.get('outlet') || window.outletId || 'JPT-001';
    }catch(e){
      return window.outletId || 'JPT-001';
    }
  }

  function baseBox(box){
    box.style.width = 'auto';
    box.style.maxWidth = 'none';
    box.style.height = 'auto';
    box.style.minHeight = '0';
    box.style.maxHeight = 'none';
    box.style.boxSizing = 'border-box';
    box.style.overflow = 'hidden';
    box.style.position = 'relative';
    box.style.display = 'block';
    box.style.aspectRatio = 'auto';
    box.style.marginTop = '9px';
    box.style.marginRight = '14px';
    box.style.marginBottom = '9px';
    box.style.marginLeft = '14px';
    box.style.background = '#090909';
  }

  function sizeVideo(box, video){
    video.style.position = 'relative';
    video.style.inset = 'auto';
    video.style.width = '100%';
    video.style.height = 'auto';
    video.style.maxWidth = '100%';
    video.style.maxHeight = 'none';
    video.style.objectFit = 'contain';
    video.style.objectPosition = 'center center';
    video.style.display = 'block';
    video.style.margin = '0';
    video.style.padding = '0';
    video.style.transform = 'none';

    /* Once metadata is known, explicitly lock the box to the video's
       natural aspect ratio. This prevents both cropping and letterboxing. */
    function lockRatio(){
      if(!video.videoWidth || !video.videoHeight) return;
      box.style.aspectRatio = video.videoWidth + ' / ' + video.videoHeight;
      box.style.height = 'auto';
    }

    if(video.readyState >= 1) lockRatio();
    video.addEventListener('loadedmetadata', lockRatio, {once:false});
  }

  function mainBox(){
    var box = document.getElementById('videoBanner');
    if(!box) return;

    baseBox(box);

    var id = getOutlet();

    if(id === 'JPT-001'){
      var video = box.querySelector('video');

      if(!video){
        box.innerHTML = '';
        video = document.createElement('video');
        box.appendChild(video);
      }

      video.setAttribute('data-jpt-v106-media-v4','1');
      video.muted = true;
      video.autoplay = true;
      video.loop = true;
      video.playsInline = true;
      video.setAttribute('playsinline','');
      video.setAttribute('webkit-playsinline','');
      video.controls = false;
      video.preload = 'auto';

      if(video.getAttribute('src') !== VIDEO){
        video.src = VIDEO;
        video.load();
      }

      sizeVideo(box, video);
      video.play().catch(function(){});
      return;
    }

    var src = ASSETS[id];
    if(!src) return;

    var img = box.querySelector('img');

    if(!img){
      box.innerHTML = '';
      img = document.createElement('img');
      box.appendChild(img);
    }

    img.setAttribute('data-jpt-v106-media-v4','1');
    if(img.getAttribute('src') !== src) img.src = src;
    img.alt = id + ' restaurant promotional banner';
    img.loading = 'eager';
    img.decoding = 'async';

    img.style.position = 'relative';
    img.style.inset = 'auto';
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxWidth = '100%';
    img.style.maxHeight = 'none';
    img.style.objectFit = 'contain';
    img.style.objectPosition = 'center center';
    img.style.display = 'block';
    img.style.margin = '0';
    img.style.padding = '0';
    img.style.background = '#090909';

    function lockImageRatio(){
      if(!img.naturalWidth || !img.naturalHeight) return;
      box.style.aspectRatio = img.naturalWidth + ' / ' + img.naturalHeight;
      box.style.height = 'auto';
    }
    if(img.complete) lockImageRatio();
    img.addEventListener('load', lockImageRatio, {once:false});
  }

  function highlights(){
    var grid = document.getElementById('highlightGrid');
    if(!grid) return;

    grid.style.width = 'auto';
    grid.style.maxWidth = '100%';
    grid.style.boxSizing = 'border-box';
    grid.style.overflowX = 'auto';
    grid.style.overflowY = 'hidden';

    Object.keys(ASSETS).forEach(function(id){
      var cards = grid.querySelectorAll('.highlight[onclick*="' + id + '"]');

      cards.forEach(function(card){
        card.style.position = 'relative';
        card.style.overflow = 'hidden';
        card.style.boxSizing = 'border-box';
        card.style.minHeight = '138px';
        card.style.height = '138px';
        card.style.flex = '0 0 210px';
        card.style.aspectRatio = 'auto';
        card.style.padding = '13px';

        var img = card.querySelector('img[data-jpt-v106-media-v4="1"]');
        if(!img){
          img = document.createElement('img');
          img.setAttribute('data-jpt-v106-media-v4','1');
          card.insertBefore(img, card.firstChild);
        }

        if(img.getAttribute('src') !== ASSETS[id]) img.src = ASSETS[id];

        img.alt = id + ' outlet banner';
        img.loading = 'eager';
        img.decoding = 'async';
        img.style.position = 'absolute';
        img.style.inset = '0';
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'cover';
        img.style.objectPosition = 'center';
        img.style.display = 'block';
        img.style.zIndex = '0';

        Array.prototype.forEach.call(card.children,function(ch){
          if(ch !== img){
            ch.style.position = 'relative';
            ch.style.zIndex = '1';
          }
        });
      });
    });
  }

  function apply(){
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';
    mainBox();
    highlights();
  }

  function boot(){
    apply();

    /* Observe only for native outlet/menu re-renders.
       This controller never repeatedly replaces the video element. */
    var obs = new MutationObserver(function(){
      setTimeout(apply, 80);
    });

    if(document.body){
      obs.observe(document.body,{childList:true,subtree:true});
    }
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded',boot);
  }else{
    boot();
  }
})();
