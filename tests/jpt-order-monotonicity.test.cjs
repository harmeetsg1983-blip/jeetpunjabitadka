const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('jpt-unified-partner-orders-v1.js', 'utf8');
function between(startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.notEqual(start, -1, 'missing source anchor: ' + startMarker);
  assert.notEqual(end, -1, 'missing source anchor: ' + endMarker);
  return source.slice(start, end);
}

const helpers = [
  between('function status(v){', '\nfunction items(x){'),
  between('function esc(v){', '\nfunction money(v){'),
  between('function actionHtml(o){', '\nfunction render(){'),
  between('function countdownDeadline(order){', '\nfunction remaining(deadline){')
].join('\n');

const api = vm.runInNewContext(
  helpers + '\n;({status, boardStatus, queueForStatus, lifecycleRank, mergeOrderMonotonic, actionHtml, countdownDeadline})',
  {},
  { timeout: 1000 }
);

// Queue routing is behavioral, not just a source-string check.
assert.equal(api.queueForStatus('new'), 'new', 'NEW orders must stay in NEW ORDERS');
assert.equal(api.queueForStatus('received'), 'new', 'legacy RECEIVED alias must route to NEW ORDERS');
assert.equal(api.queueForStatus('accepted'), 'preparing', 'ACCEPTED orders must move to PREPARATION');
assert.equal(api.queueForStatus('preparing'), 'preparing', 'PREPARING orders must stay in PREPARATION');
const acceptedAt = '2026-11-06T10:00:00.000Z';
assert.equal(api.countdownDeadline({accepted_at:acceptedAt,target_minutes:25,deadline_at:'2026-11-06T10:00:03.000Z'}), '2026-11-06T10:25:00.000Z', 'preparation countdown must anchor to accepted_at plus selected minutes, not a stale deadline');
const primeSource = between('async function primeOrderAudio(){', '\nfunction retryBlockedRingtones(){');
assert.ok(primeSource.includes('audioPrime=new Audio('), 'audio priming must use a dedicated media element');
assert.ok(!primeSource.includes('audio.pause()') && !primeSource.includes('audio.muted=true'), 'audio priming must never pause or mute the live ringtone element');
assert.equal(api.queueForStatus('ready'), 'ready', 'READY orders must route to READY');
assert.equal(api.queueForStatus('out_for_delivery'), 'out_for_delivery', 'delivery handoff orders must route to OUT FOR DELIVERY');
assert.equal(api.queueForStatus('delivered'), 'history', 'delivered orders must route to HISTORY');
assert.equal(api.queueForStatus('cancelled'), 'history', 'cancelled orders must route to HISTORY');
assert.equal(api.queueForStatus('canceled'), 'history', 'legacy CANCELED alias must route to HISTORY');
assert.equal(api.boardStatus({status:'accepted'}), 'preparing', 'ACCEPTED must display as PREPARATION without changing persisted status');

// Realtime/SELECT ordering must not regress a known lifecycle state.
assert.equal(
  api.mergeOrderMonotonic({ id: 1, status: 'delivered' }, { id: 1, status: 'cancelled' }).status,
  'delivered',
  'a delayed cancellation event must not regress a delivered order'
);
assert.equal(
  api.mergeOrderMonotonic({ id: 1, status: 'cancelled' }, { id: 1, status: 'delivered' }).status,
  'cancelled',
  'a delayed delivered event must not overwrite a terminal cancellation'
);
assert.equal(
  api.mergeOrderMonotonic({ id: 1, status: 'accepted' }, { id: 1, status: 'new' }).status,
  'accepted',
  'a stale NEW event must not regress an accepted order'
);
assert.equal(
  api.mergeOrderMonotonic({ id: 1, status: 'new' }, { id: 1, status: 'accepted' }).status,
  'accepted',
  'a forward lifecycle update must still be applied'
);

// Failed lifecycle transitions must not leave the optimistic UI state behind.
const failedTransitionReconcile = between('async function lifecycleTransition(id,next){', '\nasync function markReady(id)');
assert.ok(failedTransitionReconcile.includes('const priorForMerge=prior.__optimisticStatus===next?before:prior;'), 'failed transition recovery must discard only the optimistic status before reconciling');
assert.ok(failedTransitionReconcile.includes('mergeOrderMonotonic(priorForMerge,fresh)'), 'failed transition recovery must preserve later confirmed lifecycle states against stale SELECT responses');
assert.ok(!failedTransitionReconcile.includes('rows.set(key,Object.assign({},o,fresh))'), 'lifecycle preflight must not replace a newer row with a stale SELECT snapshot');
assert.ok(failedTransitionReconcile.includes('mergeOrderMonotonic(rows.get(key)||o,fresh)'), 'lifecycle preflight must reconcile fresh reads against the latest row');
assert.ok(!failedTransitionReconcile.includes('const reconciled=Object.assign({},prior,fresh);'), 'failed transition recovery must not blindly overwrite lifecycle state from a possibly stale SELECT');

// UPI verification must be enforced by rendered controls for NEW and ACCEPTED.
const unverifiedNew = api.actionHtml({ id: 2, status: 'new', payment: 'UPI', payment_verified: false });
assert.match(unverifiedNew, /data-accept="2" disabled/, 'unverified UPI NEW order must disable ACCEPT');
const unverifiedAccepted = api.actionHtml({ id: 3, status: 'accepted', payment: 'UPI', payment_verified: false });
assert.match(unverifiedAccepted, /data-ready="3" disabled/, 'unverified UPI ACCEPTED order must disable READY');

const verifiedNew = api.actionHtml({ id: 4, status: 'new', payment: 'UPI', payment_verified: true });
assert.doesNotMatch(verifiedNew, /data-accept="4" disabled/, 'verified UPI order must retain ACCEPT');
const verifiedAccepted = api.actionHtml({ id: 5, status: 'accepted', payment: 'UPI', payment_verified: true });
assert.doesNotMatch(verifiedAccepted, /data-ready="5" disabled/, 'verified UPI order must retain READY');

// Defense in depth: the runtime handlers must guard UPI even if controls are bypassed.
assert.ok(
  source.includes("UPI payment must be verified before accepting this order."),
  'ACCEPT handler must retain its UPI verification guard'
);
assert.ok(
  source.includes("UPI payment must be verified before marking this order ready."),
  'READY handler must retain its UPI verification guard'
);

const readyHandler = between('async function lifecycleTransition(id,next){', '\nasync function markReady(id)');
assert.doesNotMatch(readyHandler,/delivery_offer_next/, 'MARK READY must complete within the Restaurant Partner flow without invoking delivery dispatch');

// Restaurant Partner READY must not invoke delivery dispatch.
// Realtime recovery contract: keep both Postgres Changes and private Broadcast paths.
assert.ok(
  source.includes("window.sb.channel('jpt:partner:outlet:'+code,{config:{private:true}})"),
  'partner must subscribe to the private per-outlet broadcast topic'
);
assert.ok(
  source.includes("broadcastCh.on('broadcast',{event:'order_insert'}"),
  'partner must handle order_insert broadcast events'
);
assert.ok(
  source.includes("broadcastCh.on('broadcast',{event:'order_update'}"),
  'partner must handle order_update broadcast events'
);

 
// Ringtone acknowledgement must follow server-confirmed order transitions.
// A failed ACCEPT/REJECT must not silently silence a still-NEW order.
const acceptHandler = between('async function accept(id){', '\nasync function reject(id){');
const acceptPreflight = acceptHandler.slice(0, acceptHandler.indexOf('let canonical;'));
assert.doesNotMatch(
  acceptPreflight,
  /acknowledgeRingtone\(key\)/,
  'ACCEPT must not acknowledge/silence the alert before server preflight succeeds'
);
assert.match(
  acceptHandler,
  /const latestBeforeConfirm=rows\.get\(key\)\|\|o;[\s\S]*?mergeOrderMonotonic\(latestBeforeConfirm,server\);[\s\S]*?acknowledgeRingtone\(key\);/,
  'successful ACCEPT must reconcile monotonically and acknowledge only after the server returns a row'
);
assert.ok(
  acceptHandler.includes('mergeOrderMonotonic(latest,fresh)'),
  'failed ACCEPT reconciliation must not let a stale SELECT overwrite a newer Realtime lifecycle'
);
assert.ok(
  acceptHandler.includes('const conflictRow=mergeOrderMonotonic(reconciled,{status:serverStatus})'),
  'ACCEPT conflict status must be reconciled without regressing a newer confirmed terminal/forward state'
);
const rejectHandler = between('async function reject(id){', '\nconst transitionBusy=new Set();');
assert.match(rejectHandler,/canonical=await read\(id,o\.outlet_id\);[\s\S]*?if\(status\(canonical\.status\)!=='new'\)[\s\S]*?Duplicate REJECT blocked\./,
  'REJECT must verify the canonical server row is still NEW before sending cancellation');
assert.ok(rejectHandler.indexOf('canonical=await read(id,o.outlet_id)') < rejectHandler.indexOf("p_next_status:'cancelled'"),
  'REJECT preflight read must happen before the cancellation RPC');
const rejectPreflight = rejectHandler.slice(0, rejectHandler.indexOf('try{'));
assert.doesNotMatch(
  rejectPreflight,
  /acknowledgeRingtone\(key\)/,
  'REJECT must keep the NEW-order alert active until the server confirms cancellation'
);
assert.doesNotMatch(
  rejectHandler,
  /else o\.status='cancelled'/,
  'REJECT must never fabricate cancellation when the RPC returns no row'
);
assert.match(
  rejectHandler,
  /if\(status\(server\.status\)!=='cancelled'\)[\s\S]*?throw new Error\('Server did not confirm cancellation/,
  'REJECT must validate the server-returned lifecycle state before reporting success'
);
assert.match(
  rejectHandler,
  /if\(status\(server\.status\)!=='cancelled'\)[\s\S]*?acknowledgeRingtone\(key\);\s*toast\('Order rejected\.'\);/,
  'REJECT success feedback must follow server-confirmed cancellation'
);
assert.match(
  rejectHandler,
  /if\(status\(reconciled\.status\)!=='new'\)acknowledgeRingtone\(key\);/,
  'failed REJECT must not silence an order that remains NEW'
);


// Each lifecycle state must expose only its valid next operator action.
const newAction = api.actionHtml({ id: 10, status: 'new' });
assert.match(newAction, /data-accept="10"/, 'NEW order must expose ACCEPT');
assert.match(newAction, /data-reject="10"/, 'NEW order must expose REJECT');
assert.doesNotMatch(newAction, /data-ready="10"|data-delivery="10"|data-delivered="10"/, 'NEW order must not expose later lifecycle actions');
const acceptedNext = api.actionHtml({ id: 11, status: 'accepted' });
assert.match(acceptedNext, /data-ready="11"/, 'ACCEPTED order must expose MARK READY');
const preparingNext = api.actionHtml({ id: 12, status: 'preparing' });
assert.match(preparingNext, /data-ready="12"/, 'PREPARING order must expose MARK READY');
const readyNext = api.actionHtml({ id: 13, status: 'ready' });
assert.match(readyNext, /data-delivery="13"/, 'READY order must expose OUT FOR DELIVERY');
const deliveryNext = api.actionHtml({ id: 14, status: 'out_for_delivery' });
assert.match(deliveryNext, /data-delivered="14"/, 'OUT FOR DELIVERY order must expose MARK DELIVERED');
for (const terminal of ['delivered','cancelled']) {
  assert.doesNotMatch(api.actionHtml({ id: 15, status: terminal }), /data-accept=|data-reject=|data-ready=|data-delivery=|data-delivered=/, terminal+' order must not expose active lifecycle actions');
}
assert.match(api.actionHtml({ id: 16, status: 'received' }), /data-accept="16"/, 'legacy RECEIVED status must retain NEW-order actions');

// The preparation timer must never replace or hide the actionable READY control.
const acceptedAction = api.actionHtml({ id: 6, status: 'accepted' });
assert.match(acceptedAction, /data-ready="6"/, 'ACCEPTED order must render a MARK READY action');
assert.match(acceptedAction, /MARK READY/, 'READY action label must be visible in the generated markup');
const preparingAction = api.actionHtml({ id: 7, status: 'preparing', deadline_at: new Date(Date.now()+30*60*1000).toISOString() });
assert.match(preparingAction, /data-ready="7"/, 'preparation countdown must never gate early MARK READY');
assert.ok(source.includes('PREP TIME LEFT · '+''), 'countdown must be labelled as preparation time, not as the READY action');
const orderRenderSource = between('function render(){', 'function updateCounts(');
assert.ok(orderRenderSource.includes('const timerButton='), 'preparation countdown must render in its own timer element');
assert.match(orderRenderSource, /jpt-prep[^\n]*timerButton\+rider/, 'countdown must stay in the prep panel separate from the action panel');
assert.match(orderRenderSource, /jpt-actions[^\n]*\+action\+/, 'READY action must render in the separate actions panel');

// All Outlet Select scopes queries/cards/realtime to the user's explicit scope;
// the default and invalid/stale scope both safely fall back to all authorized outlets.
assert.ok(source.includes("const ORDER_SCOPE_KEY='jpt_partner_order_scope';"), 'order scope must use its dedicated preference key');
assert.ok(source.includes(': selectedOutletCodes(authorizedCodes);'), 'live order queries must honor selected outlet scope');
assert.ok(source.includes("? (historyOutlet==='ALL'"), 'history query scope must support all authorized outlets independently');
assert.ok(source.includes('orderMatchesSelectedScope(o)'), 'order cards and realtime events must honor selected outlet scope');
assert.ok(source.includes('await initialLoad({alertNewOrders:true});'), 'startup/scope refresh must ring recent NEW orders already placed while app was closed');

// NEW orders have their own first queue; ACCEPTED/PREPARING belong to preparation.
assert.ok(source.includes("if(st==='new')return 'new';"), 'NEW orders must remain in the dedicated NEW ORDERS queue');
assert.ok(source.includes("if(['accepted','preparing'].includes(st))return 'preparing';"), 'accepted orders must move into PREPARATION');
assert.ok(source.includes("let selectedQueue='new';"), 'dashboard must open on NEW ORDERS by default');

// Queue changes must not auto-navigate the operator away from the selected screen.
const queueFocus = between('function focusQueueForStatus(value){', '\nfunction syncHistoryTools(){');
assert.match(queueFocus, /Deliberately keep the operator on the chosen queue[\s\S]*?return;/,
  'status transitions must not switch the operator to another queue automatically');
assert.ok(source.includes("const historyOutlet=String(document.getElementById('orderHistoryOutlet')?.value||'ALL')"),
  'history outlet selector must determine the history query scope');
assert.ok(source.includes("(selectedQueue==='history'||orderMatchesSelectedScope(o))"),
  'history may show all authorized outlets independent of the active live queue scope');
assert.ok(source.includes("outletFilter.addEventListener('change',async()=>{"),
  'changing the history outlet must reload the history data');

// Avoid full card DOM replacement on every five-second safety poll; this prevents scroll jumps.
assert.ok(source.includes('body.dataset.jptRenderKey===renderKey&&body.children.length'), 'unchanged order snapshots must preserve the current order-card DOM');

// Header must not repeat outlet identity under the bell; outlet list remains in the picker.
const finalTouch = fs.readFileSync('jpt-partner-final-touch-v10.js', 'utf8');
assert.ok(finalTouch.includes('if(POSTERS.length<2)'), 'single-poster dashboard must not show misleading carousel arrows');
assert.ok(finalTouch.includes('jpt-v9-poster-fallback'), 'failed poster media must show a branded fallback instead of a blank grey box');
assert.ok(finalTouch.includes('jpt-v9-logo-fallback'), 'failed embedded logo media must show a readable JPT fallback');
assert.doesNotMatch(finalTouch, /<div class="jpt-v9-context">/, 'redundant outlet-name row under the bell must not render');
const outletPicker = fs.readFileSync('jpt-partner-final-touch-v12.js', 'utf8');
assert.ok(outletPicker.includes("allButton.textContent='SELECT ALL OUTLETS';"), 'outlet picker must offer SELECT ALL OUTLETS');
assert.ok(outletPicker.includes("localStorage.setItem('jpt_partner_order_scope','ALL')"), 'All Outlet Select must set all-outlet order scope');

const adminUi = fs.readFileSync('admin.html', 'utf8');
assert.ok(adminUi.includes('#orderQueueBar.jpt-status-tabs{position:relative!important;top:auto!important;z-index:1!important;transform:none!important}'), 'order queue tabs must not float over the header/logout control');
const navUi = fs.readFileSync('jpt-partner-dual-bar-nav-v1.js', 'utf8');
assert.ok(navUi.includes("window.scrollTo({top:0,behavior:'auto'});"), 'partner navigation must avoid animated scroll jumps');


// Exercise outlet-scope selection with a local-only storage stub (no Supabase writes).
const scopeSource = between('function managedOutlets(){', 'function orderBelongsToManagedOutlet(o){');
const scopeStore = {
  value: null,
  getItem(key) { return key === 'jpt_partner_order_scope' ? this.value : null; },
  setItem(key, value) { if (key === 'jpt_partner_order_scope') this.value = value; }
};
const scopeApi = vm.runInNewContext(
  scopeSource + '\n;({selectedOutletCodes, orderMatchesSelectedScope})',
  {
    window: { JPTPartnerAccess: { getOutlets: () => [{outlet_id:'JPT-001'},{outlet_id:'NME-001'}] } },
    localStorage: scopeStore,
    outletSelect: { value: 'JPT-001' }
  },
  { timeout: 1000 }
);
assert.equal([...scopeApi.selectedOutletCodes(['JPT-001','NME-001'])].join(','), 'JPT-001', 'default order scope must isolate JPT-001');
assert.equal([...scopeApi.selectedOutletCodes(['NME-001'])].length, 0, 'JPT-only default must fail closed when JPT-001 is not authorized');
scopeStore.value = 'NME-001';
assert.equal([...scopeApi.selectedOutletCodes(['JPT-001','NME-001'])].join(','), 'NME-001', 'a specific outlet scope must filter the query');
assert.equal(scopeApi.orderMatchesSelectedScope({outlet_id:'JPT-001'}), false, 'events from another outlet must not enter a specific outlet scope');
scopeStore.value = 'NOT_AUTHORIZED';
assert.equal([...scopeApi.selectedOutletCodes(['JPT-001','NME-001'])].join(','), 'JPT-001,NME-001', 'stale non-JPT user-selected scope must fail open to authorized all-outlet view');
assert.equal(scopeStore.value, 'ALL', 'stale scope must be reset to All Outlet Select');

assert.ok(source.includes('primeOrderAudio().then(primed=>{if(primed)retryBlockedRingtones()})'), 'first user gesture must retry a browser-blocked new-order ringtone automatically');
assert.ok(source.includes('async function enableBackgroundAlerts(){'), 'order sound permission flow must be declared async before awaiting browser permission/audio priming');
assert.ok(!source.includes('async async function enableBackgroundAlerts(){'), 'order sound permission function must not have a duplicated async keyword that breaks script parsing');
assert.ok(source.includes('async function primeOrderAudio(){'), 'audio priming must be async because it awaits media playback and AudioContext resume');
assert.ok(source.includes('if(p?.then) await p;'), 'audio priming must report playback rejection instead of silently treating a blocked ringtone as primed');
assert.ok(!source.includes('if(p?.then) await p.catch(()=>{});'), 'audio priming must not swallow browser playback rejection');
assert.ok(!source.includes('\nfunction primeOrderAudio(){'), 'audio priming must not remain a non-async function with await expressions');
assert.ok(!source.includes('async async function primeOrderAudio(){'), 'audio priming must not have a duplicate async keyword that breaks script parsing');


// Order accessibility regression checks: explicit tap-to-speak only, with outlet scope enforced.
assert.ok(source.includes('function cookingInstructions(o){'), 'partner order cards must resolve supported cooking-instruction fields');
assert.ok(source.includes("o?.customer_note??o?.notes??''"), 'partner order card and voice readout must consume the existing notes field used by checkout');
assert.equal((source.match(/COOKING INSTRUCTIONS/g)||[]).length, 1, 'each order card must show one cooking-instructions panel, not duplicate panels');
assert.equal((source.match(/data-speak-order=/g)||[]).length, 1, 'each order card must show one listen-to-order button');
assert.ok(source.includes('COOKING INSTRUCTIONS'), 'customer cooking instructions must be visibly separated on the order card');
assert.ok(source.includes('data-speak-order='), 'each order card must provide a listen-to-order control');
assert.ok(source.includes("body.querySelectorAll('[data-speak-order]').forEach(b=>b.onclick=()=>{const o=rows.get(String(b.dataset.speakOrder));if(o&&orderBelongsToManagedOutlet(o)&&orderMatchesSelectedScope(o))speakOrder(o);})"), 'speech playback must be an explicit tap scoped to authorized order cards');
assert.ok(!source.includes('noteHtml+voiceHtml'), 'order card must not reference removed duplicate instruction/voice markup');
assert.ok(!source.includes("document.querySelectorAll('[data-speak-order]').forEach"), 'a global speech binding must not override the authorized card-scope handler');
assert.ok(source.includes("if(!o||!orderBelongsToManagedOutlet(o)||!orderMatchesSelectedScope(o))return;"), 'speech readout must not expose orders outside the authorized selected scope');
assert.ok(source.includes("window.speechSynthesis.speak(u)"), 'listen control must invoke browser speech synthesis');
assert.ok(source.includes("u.lang='en-IN'"), 'speech readout must use an India English voice locale');
assert.ok(!source.includes('speakOrder(o.id);'), 'speech must not start automatically when rendering a card');

const adminHtmlSource = fs.readFileSync('admin.html', 'utf8');
assert.ok(adminHtmlSource.includes("select('id',{count:'exact',head:true})"), 'dashboard Orders Today metric must use an exact read-only count');
assert.ok(adminHtmlSource.includes("function notifyOutletDataRefreshed(){window.dispatchEvent(new CustomEvent('jpt:outlet-data-refreshed'))}"), 'visible home metrics must refresh after their hidden source values are updated');
assert.ok((adminHtmlSource.match(/notifyOutletDataRefreshed\(\)/g)||[]).length>=4, 'menu, offers, campaigns and daily orders must refresh the visible partner home metrics');
const countWriterStart = source.indexOf('function updateCounts(');
const countWriterEnd = source.indexOf(String.fromCharCode(10)+'async function read(',countWriterStart);
assert.ok(countWriterStart>=0&&countWriterEnd>countWriterStart,'order count writer must be present for regression inspection');
const countWriter = source.slice(countWriterStart,countWriterEnd);
assert.ok(!countWriter.includes("getElementById('ordersCount')"), 'active queue row count must not overwrite the outlet-scoped Orders Today metric');
assert.ok(adminHtmlSource.includes(".eq('outlet_id',activeOutlet)") && adminHtmlSource.includes("metric.title='Orders created today for '+activeOutlet"), 'dashboard daily order count must be scoped to the selected outlet');
assert.ok(adminHtmlSource.includes("in('status',['new','accepted','preparing','ready','out_for_delivery'])") && adminHtmlSource.includes('older than 24 hours'), 'dashboard must flag old active orders for manual review without auto-changing their status');
assert.ok(adminHtmlSource.includes('imageById[String(x.id)]||nameFallback||x.image_url||'), 'menu image mapping must resolve both menu item IDs and safe unique-name fallbacks');
assert.ok(adminHtmlSource.includes('menuNameCounts.get(nameKey)===1&&!ambiguousNames.has(nameKey)'), 'menu image fallback must not assign an ambiguous same-name image to multiple dishes');
const brandThemeSource = fs.readFileSync('jpt-partner-brand-status-theme-v2.js', 'utf8');
assert.ok(brandThemeSource.includes("hero.classList.toggle('jpt-no-outlet-banner',!banner)"), 'partner hero must detect outlets with no banner');
assert.ok(brandThemeSource.includes('.hero.jpt-no-outlet-banner{'), 'partner hero must collapse its empty banner space when no outlet banner exists');
const partnerSwSource = fs.readFileSync('jpt-partner-sw.js', 'utf8');
const partnerAppSource = fs.readFileSync('partner-app.html', 'utf8');
assert.ok(adminHtmlSource.includes('jpt-unified-partner-orders-v1.js?v=20261107-jpt-only-audio-timer-scope-1'), 'partner HTML must cache-bust the corrected order runtime');
assert.ok(partnerSwSource.includes('jpt-partner-pwa-v35-jpt-only-scope'), 'partner service-worker cache generation must advance with runtime fixes');
assert.ok(partnerAppSource.includes('jpt-partner-sw.js?v=20261107-jpt-only-scope-1'), 'partner app shell must register the current service-worker URL');
assert.ok(adminHtmlSource.includes('jpt-partner-sw.js?v=20261107-jpt-only-scope-1'), 'admin dashboard must register the same current service-worker URL');



assert.ok(source.includes('const latestBeforeConfirm=rows.get(key)||o;'), 'REJECT confirmation must reconcile with latest Realtime row');
assert.ok(source.includes('const confirmed=mergeOrderMonotonic(latestBeforeConfirm,server);'), 'REJECT confirmation must preserve monotonic lifecycle state');
assert.ok(source.includes('const reconciled=mergeOrderMonotonic(latest,fresh);'), 'failed REJECT reconciliation must not regress a newer state');

console.log('GREEN: order lifecycle, multi-outlet, ringtone, UI stability and order voice/instruction regression assertions passed');
