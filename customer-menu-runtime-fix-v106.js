/* JPT V106 CUSTOMER MENU RUNTIME FIX — V6 SAFE BASELINE
   IMPORTANT:
   The production index.html already contains the complete native
   Supabase menu loader, original items state, render(), cartState,
   change(), cartRows(), images, offers and outlet switching.

   This file is intentionally non-invasive.
   It prevents the previous recovery bridges from replacing/interfering
   with the native Customer App runtime.

   No database writes. No menu mutations. No cart replacement.
*/
(function(){
'use strict';
document.documentElement.setAttribute('data-jpt-v106-runtime','native-baseline-v6');
})();
