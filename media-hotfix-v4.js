/* JPT V106 MEDIA HOTFIX V4 — JPT BANNER LOCK
   Isolated media-only repair.
   Keeps the Customer App/menu/cart/runtime/payment untouched.
   JPT video is displayed inside one fixed advertisement banner box.
*/
(function () {
  'use strict';

  var VIDEO = 'jeet-golden-banner.mp4';

  var ASSETS = {
    'SOP-002': 'assets/outlets/SOP-002_banner.jpg',
    'PFA-003': 'assets/outlets/PFA-003_banner.jpg',
    'NME-004': 'assets/outlets/NME-004_banner.jpg',
    'TOP-005': 'assets/outlets/TOP-005_banner.jpg'
  };

  /*
    The actual JPT advertisement is a horizontal banner contained
    inside the portrait video file.

    Keep one fixed banner window.
    The video fills that window without changing its position.
  */
  var BANNER_RATIO = '1.40 / 1';

  function getOutlet() {
    try {
      var p = new URLSearchParams(location.search);
      return p.get('outlet') || window.outletId || 'JPT-001';
    } catch (e) {
      return window.outletId || 'JPT-001';
    }
  }

  function setupBox(box) {
    box.style.width = 'auto';
    box.style.maxWidth = 'none';
    box.style.height = 'auto';
    box.style.minHeight = '0';
    box.style.maxHeight = 'none';

    box.style.aspectRatio = BANNER_RATIO;
    box.style.boxSizing = 'border-box';

    box.style.position = 'relative';
    box.style.overflow = 'hidden';

    box.style.marginTop = '9px';
    box.style.marginRight = '14px';
    box.style.marginBottom = '9px';
    box.style.marginLeft = '14px';

    box.style.borderRadius = '14px';
    box.style.border = '1px solid #3d331e';
    box.style.background = '#090909';
  }

  function setupVideo(box, video) {
    video.muted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.controls = false;
    video.preload = 'auto';

    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');

    video.style.position = 'absolute';
    video.style.left = '50%';
    video.style.top = '50%';

    /*
      Cover the fixed banner box.
      The portrait video's empty top/bottom area is therefore
      outside the visible banner window.
    */
    video.style.width = '100%';
    video.style.height = '100%';

    video.style.maxWidth = 'none';
    video.style.maxHeight = 'none';

    video.style.objectFit = 'cover';
    video.style.objectPosition = 'center center';

    video.style.display = 'block';
    video.style.margin = '0';
    video.style.padding = '0';

    video.style.transform = 'translate(-50%, -50%)';

    video.style.background = '#090909';
  }

  function setupImage(box, img, src, id) {
    img.src = src;
    img.alt = id + ' restaurant promotional banner';

    img.style.position = 'absolute';
    img.style.left = '0';
    img.style.top = '0';

    img.style.width = '100%';
    img.style.height = '100%';

    img.style.maxWidth = 'none';
    img.style.maxHeight = 'none';

    img.style.objectFit = 'cover';
    img.style.objectPosition = 'center center';

    img.style.display = 'block';
    img.style.margin = '0';
    img.style.padding = '0';

    img.style.background = '#090909';
  }

  function mediaWindowActive(row) {
    try {
      if (!row || row.active === false) return false;
      var now = Date.now();
      var start = row.start_at ? Date.parse(row.start_at) : -Infinity;
      var end = row.end_at ? Date.parse(row.end_at) : Infinity;
      return start <= now && now <= end;
    } catch (e) { return false; }
  }

  function campaignMedia(row) {
    var s = row && row.schedule_json && typeof row.schedule_json === 'object'
      ? row.schedule_json : {};
    if (s.campaign_type !== 'media') return null;
    /* Lower outlet media has ONE authoritative source:
       Banner Control Center -> surface=customer_outlet_showcase.
       Never let top/home/legacy campaign media leak into #videoBanner. */
    if (s.surface !== 'customer_outlet_showcase') return null;
    var video = row.video_url || s.video_url || null;
    var image = row.banner_url || s.image_url || null;
    if (!video && !image) return null;
    return { video: video, image: image, title: row.title || '' };
  }

  async function loadManagedMedia(id) {
    try {
      var client = window.sb || window.supabaseClient;
      if (!client) return {B1:null,B2:null,B3:null};
      var result = await client
        .from('campaigns')
        .select('id,title,active,start_at,end_at,priority,banner_url,video_url,media_url,media_type,schedule_json,created_at')
        .eq('outlet_id', id)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(200);
      if (result.error) return {B1:null,B2:null,B3:null};
      var out={B1:null,B2:null,B3:null},legacy=null;
      (result.data||[]).filter(mediaWindowActive).forEach(function(row){
        var s=row.schedule_json&&typeof row.schedule_json==='object'?row.schedule_json:{};
        var video=row.video_url||s.video_url||null;
        var image=row.banner_url||row.media_url||s.image_url||null;
        if(!video&&!image)return;
        var media={video:video,image:image,title:row.title||''};
        if(s.controller==='jpt-central-media-lab-v1'&&s.surface==='customer_outlet_media'){
          var slot=String(s.slot||'').toUpperCase();
          if((slot==='B1'||slot==='B2'||slot==='B3')&&!out[slot])out[slot]=media;
        }else if(s.surface==='customer_outlet_showcase'&&!legacy){
          legacy=media;
        }
      });
      if(!out.B1&&legacy)out.B1=legacy;
      return out;
    }catch(e){return {B1:null,B2:null,B3:null};}
  }

  function ensureOutletSlots(){
    var b1=document.getElementById('videoBanner');if(!b1)return null;
    var wrap=document.getElementById('jptCentralOutletBanners');
    if(!wrap){
      wrap=document.createElement('section');wrap.id='jptCentralOutletBanners';wrap.setAttribute('aria-label','Outlet banners');
      b1.insertAdjacentElement('afterend',wrap);
    }
    ['B2','B3'].forEach(function(slot){
      if(!document.getElementById('jptOutletBanner'+slot)){
        var box=document.createElement('section');box.id='jptOutletBanner'+slot;box.className='videoBanner';wrap.appendChild(box);
      }
    });
    return {B1:b1,B2:document.getElementById('jptOutletBannerB2'),B3:document.getElementById('jptOutletBannerB3')};
  }

  function renderManagedMedia(box,media,id,slot){
    if(!box)return;
    setupBox(box);box.innerHTML='';
    if(media&&media.video){
      var video=document.createElement('video');video.setAttribute('data-jpt-central-slot',slot);video.src=media.video;setupVideo(box,video);
      var sound=document.createElement('button');sound.textContent='🔇';sound.setAttribute('aria-label','Unmute video');
      sound.style.cssText='position:absolute;right:8px;bottom:8px;z-index:5;border:1px solid #d8ae42;background:#111c;color:#f4d77a;border-radius:99px;padding:6px 9px;font-weight:900';
      sound.onclick=function(){video.muted=!video.muted;sound.textContent=video.muted?'🔇':'🔊';video.play().catch(function(){});};box.appendChild(sound);
      video.addEventListener('loadeddata',function(){video.muted=true;video.play().catch(function(){});},{once:true});video.play().catch(function(){});
    }else if(media&&media.image){
      var img=document.createElement('img');img.setAttribute('data-jpt-central-slot',slot);setupImage(box,img,media.image,id);
    }else{box.style.background='#090909';}
  }

  async function renderAllOutletBanners(){
    var boxes=ensureOutletSlots();if(!boxes)return;
    var all=await loadManagedMedia(getOutlet());
    renderManagedMedia(boxes.B1,all.B1,getOutlet(),'B1');
    renderManagedMedia(boxes.B2,all.B2,getOutlet(),'B2');
    renderManagedMedia(boxes.B3,all.B3,getOutlet(),'B3');
  }

  async function mainBox() {
    var boxes=ensureOutletSlots();if(!boxes)return;
    var id=getOutlet(),all=await loadManagedMedia(id);
    if(all.B1||all.B2||all.B3){
      renderManagedMedia(boxes.B1,all.B1,id,'B1');
      renderManagedMedia(boxes.B2,all.B2,id,'B2');
      renderManagedMedia(boxes.B3,all.B3,id,'B3');
      if(!all.B1&&id==='JPT-001'){
        var video=boxes.B1.querySelector('video');if(!video){boxes.B1.innerHTML='';video=document.createElement('video');boxes.B1.appendChild(video);}
        video.setAttribute('data-jpt-v106-media-v4','1');setupVideo(boxes.B1,video);
        if(video.getAttribute('src')!==VIDEO){video.src=VIDEO;video.load();}
        video.addEventListener('loadeddata',function(){video.muted=true;video.play().catch(function(){});},{once:true});video.play().catch(function(){});
      }
      return;
    }
    if(id==='JPT-001'){
      var v=boxes.B1.querySelector('video');if(!v){boxes.B1.innerHTML='';v=document.createElement('video');boxes.B1.appendChild(v);}
      v.setAttribute('data-jpt-v106-media-v4','1');setupVideo(boxes.B1,v);
      if(v.getAttribute('src')!==VIDEO){v.src=VIDEO;v.load();}
      v.addEventListener('loadeddata',function(){v.muted=true;v.play().catch(function(){});},{once:true});v.play().catch(function(){});return;
    }
    var src=ASSETS[id];renderManagedMedia(boxes.B1,src?{image:src}:null,id,'B1');
    renderManagedMedia(boxes.B2,null,id,'B2');renderManagedMedia(boxes.B3,null,id,'B3');
  }

  function setupHighlights() {
    var grid = document.getElementById('highlightGrid');
    if (!grid) return;

    grid.style.maxWidth = '100%';
    grid.style.overflowX = 'auto';
    grid.style.overflowY = 'hidden';
  }

  function apply() {
    document.documentElement.style.overflowX = 'hidden';
    document.body.style.overflowX = 'hidden';

    mainBox();
    setupHighlights();
  }

  function boot() {
    apply();

    /*
      Watch native app re-renders only.
      Do not continuously recreate the video.
    */
    var timer = null;

    var observer = new MutationObserver(function () {
      clearTimeout(timer);

      timer = setTimeout(function () {
        var media = document.querySelector(
          '#videoBanner video[data-jpt-v106-media-v4="1"], #videoBanner img[data-jpt-v106-media-v4="1"]'
        );

        if (!media) {
          apply();
        }
      }, 120);
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  window.addEventListener('jpt:outlet-changed', function () {
    mainBox();
  });

  window.addEventListener('popstate', function () {
    setTimeout(mainBox, 0);
  });

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot
    );
  } else {
    boot();
  }

})();
