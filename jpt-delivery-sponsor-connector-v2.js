/* JPT Delivery Sponsor Connector V3 */
(function(){
'use strict';

if(window.__JPT_DELIVERY_SPONSOR_CONNECTOR_V3__)return;
window.__JPT_DELIVERY_SPONSOR_CONNECTOR_V3__=true;

function load(src,attr){
  return new Promise((resolve)=>{
    if(document.querySelector('script['+attr+']'))return resolve();

    const s=document.createElement('script');
    s.src=src;
    s.setAttribute(attr,'1');
    s.onload=resolve;
    s.onerror=resolve;
    document.body.appendChild(s);
  });
}

async function boot(){
  await load(
    './jpt-delivery-sponsor-slider-v3.js?v=3',
    'data-jpt-delivery-sponsor-v3'
  );
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}

})();
