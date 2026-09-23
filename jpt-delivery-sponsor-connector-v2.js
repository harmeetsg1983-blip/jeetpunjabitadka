/* JPT Delivery Sponsor Connector V2 */
(function(){
'use strict';
if(window.__JPT_DELIVERY_SPONSOR_CONNECTOR_V2__)return;
window.__JPT_DELIVERY_SPONSOR_CONNECTOR_V2__=true;
function boot(){
 const src='./jpt-delivery-sponsor-slider-v2.js?v=2';
 if(document.querySelector('script[data-jpt-delivery-sponsor-v2]'))return;
 const s=document.createElement('script');s.src=src;s.dataset.jptDeliverySponsorV2='1';document.body.appendChild(s);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();