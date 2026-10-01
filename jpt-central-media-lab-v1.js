/* JPT Central Media Lab V1
   Customer outlet media controller scaffold.
   Dynamic outlets; reserved slots B1/B2/B3.
   Special Offer / Campaign Hero remains separate.
*/
(function(){
'use strict';
if(window.__JPT_CENTRAL_MEDIA_LAB_V1__) return;
window.__JPT_CENTRAL_MEDIA_LAB_V1__=true;
const sb=()=>window.sb||window.supabaseClient||null;
const machine=(code,slot)=>'OUTLET-'+String(code||'').toUpperCase().replace(/[^A-Z0-9_-]/g,'')+'-B'+slot;
window.JPTCentralMediaLab={machineId:machine,slots:['B1','B2','B3'],getClient:sb};
})();