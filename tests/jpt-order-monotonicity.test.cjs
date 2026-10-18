const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const source = fs.readFileSync('jpt-unified-partner-orders-v1.js', 'utf8');
const start = source.indexOf('function status(v){');
const end = source.indexOf('\nfunction items(x){', start);
assert.notEqual(start, -1, 'status() helper must exist');
assert.notEqual(end, -1, 'order helper block must end before items()');

const api = vm.runInNewContext(
  source.slice(start, end) + '\n;({status, lifecycleRank, mergeOrderMonotonic})',
  {},
  { timeout: 1000 }
);

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

console.log('GREEN: 4 order lifecycle monotonicity regression tests passed');
