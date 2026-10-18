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

console.log('GREEN: 13 order lifecycle, UPI-control and realtime-wiring regression assertions passed');
