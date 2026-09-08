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

  function mainBox() {
    var box = document.getElementById('videoBanner');
    if (!box) return;

    setupBox(box);

    var id = getOutlet();

    if (id === 'JPT-001') {
      var video = box.querySelector('video');

      if (!video) {
        box.innerHTML = '';
        video = document.createElement('video');
        box.appendChild(video);
      }

      video.setAttribute(
        'data-jpt-v106-media-v4',
        '1'
      );

      setupVideo(box, video);

      if (video.getAttribute('src') !== VIDEO) {
        video.src = VIDEO;
        video.load();
      }

      var play = function () {
        video.muted = true;
        video.play().catch(function () {});
      };

      video.addEventListener('loadeddata', play, {
        once: true
      });

      play();

      return;
    }

    var src = ASSETS[id];
    if (!src) return;

    var img = box.querySelector('img');

    if (!img) {
      box.innerHTML = '';
      img = document.createElement('img');
      box.appendChild(img);
    }

    img.setAttribute(
      'data-jpt-v106-media-v4',
      '1'
    );

    setupImage(box, img, src, id);
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
        var video = document.querySelector(
          '#videoBanner video'
        );

        if (!video ||
            video.getAttribute(
              'data-jpt-v106-media-v4'
            ) !== '1') {
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

  if (document.readyState === 'loading') {
    document.addEventListener(
      'DOMContentLoaded',
      boot
    );
  } else {
    boot();
  }

})();
