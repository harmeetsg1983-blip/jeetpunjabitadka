/* JPT Sponsor Manager V3 — outlet targeting clarity patch
   Loads after V2 and adds an explicit targeting status note; V2 remains the working manager.
*/
(function(){
'use strict';
if(window.__JPT_SPONSOR_MANAGER_V3__)return;
window.__JPT_SPONSOR_MANAGER_V3__=true;
function boot(){const box=document.getElementById('jptSponsorManager');if(!box){setTimeout(boot,700);return}if(box.querySelector('.jpt-sm-v3-note'))return;const n=document.createElement('div');n.className='jpt-sm-v3-note';n.style.cssText='margin-top:10px;padding:9px 11px;border:1px solid #3b6;border-radius:10px;background:#0c1810;color:#bff3cd;font-size:11px;line-height:1.4';n.textContent='Outlet targeting is active: ALL LIVE shows to every eligible live outlet; SELECTED OUTLET shows only on the chosen outlet. Sponsor ads remain separate from offers/discounts.';box.querySelector('.jpt-sm')?.appendChild(n)}boot();
})();
