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
  between('function actionHtml(o){', '\nfunction render(){')
].join('\n');

const api = vm.runInNewContext(
  helpers + '\n;({status, lifecycleRank, mergeOrderMonotonic, actionHtml})',
  {},
  { timeout: 1000 }
);

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
  /rows\.set\(key,Object\.assign\(o,server\)\);\s*acknowledgeRingtone\(key\);/,
  'successful ACCEPT must acknowledge the ringtone only after the server returns a row'
);
const rejectHandler = between('async function reject(id){', '\nconst transitionBusy=new Set();');
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
  /if\(status\(fresh\.status\)!=='new'\)acknowledgeRingtone\(key\);/,
  'failed REJECT must not silence an order that remains NEW'
);


// The preparation timer must never replace or hide the actionable READY control.
const acceptedAction = api.actionHtml({ id: 6, status: 'accepted' });
assert.match(acceptedAction, /data-ready="6"/, 'ACCEPTED order must render a MARK READY action');
assert.match(acceptedAction, /MARK READY/, 'READY action label must be visible in the generated markup');

// All Outlet Select scopes queries/cards/realtime to the user's explicit scope;
// the default and invalid/stale scope both safely fall back to all authorized outlets.
assert.ok(source.includes("const ORDER_SCOPE_KEY='jpt_partner_order_scope';"), 'order scope must use its dedicated preference key');
assert.ok(source.includes('const codes=selectedOutletCodes(authorizedCodes);'), 'initial order queries must honor selected outlet scope');
assert.ok(source.includes('orderMatchesSelectedScope(o)'), 'order cards and realtime events must honor selected outlet scope');
assert.ok(source.includes('await initialLoad({alertNewOrders:true});'), 'startup/scope refresh must ring recent NEW orders already placed while app was closed');

// Avoid full card DOM replacement on every five-second safety poll; this prevents scroll jumps.
assert.ok(source.includes('body.dataset.jptRenderKey===renderKey&&body.children.length'), 'unchanged order snapshots must preserve the current order-card DOM');

// Header must not repeat outlet identity under the bell; outlet list remains in the picker.
const finalTouch = fs.readFileSync('jpt-partner-final-touch-v10.js', 'utf8');
assert.doesNotMatch(finalTouch, /<div class="jpt-v9-context">/, 'redundant outlet-name row under the bell must not render');
const outletPicker = fs.readFileSync('jpt-partner-final-touch-v12.js', 'utf8');
assert.ok(outletPicker.includes("allButton.textContent='All Outlet Select';"), 'outlet picker must offer All Outlet Select');
assert.ok(outletPicker.includes("localStorage.setItem('jpt_partner_order_scope','ALL')"), 'All Outlet Select must set all-outlet order scope');

console.log('GREEN: 29 order lifecycle, UPI, realtime, ringtone, All Outlet Select and UI-stability regression assertions passed');
