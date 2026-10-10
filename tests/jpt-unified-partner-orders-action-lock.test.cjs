'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const source = fs.readFileSync('jpt-unified-partner-orders-v1.js', 'utf8');

function section(start, end) {
  const a = source.indexOf(start);
  assert.notEqual(a, -1, 'missing section: ' + start);
  const b = source.indexOf(end, a);
  assert.notEqual(b, -1, 'missing section boundary: ' + end);
  return source.slice(a, b);
}

test('ACCEPT acquires the per-order action lock before its first await', () => {
  const body = section('async function accept(id){', 'async function reject(id){');
  assert.match(body, /if\(actionBusy\.has\(key\)\)return;/);
  assert.ok(body.indexOf('actionBusy.add(key)') < body.indexOf('await window.sb.rpc'));
  assert.match(body, /finally\s*\{[\s\S]*?actionBusy\.delete\(key\)/);
});

test('REJECT uses the same per-order lock and always releases it', () => {
  const body = section('async function reject(id){', 'const transitionBusy=new Set();');
  assert.match(body, /if\(actionBusy\.has\(key\)\|\|transitionBusy\.has\(key\)\)return;/);
  assert.ok(body.indexOf('actionBusy.add(key)') < body.indexOf('await window.sb.rpc'));
  assert.match(body, /finally\s*\{[\s\S]*?actionBusy\.delete\(key\)/);
  assert.match(body, /const fresh=await read\(id,o\.outlet_id\)/);
});

test('READY and delivery lifecycle actions share the same lock as ACCEPT/REJECT', () => {
  const body = section('async function lifecycleTransition(id,next){', 'async function markReady(id)');
  assert.match(body, /if\(transitionBusy\.has\(key\)\|\|actionBusy\.has\(key\)\)return;/);
  assert.match(body, /actionBusy\.add\(key\);\s*transitionBusy\.add\(key\);/);
  assert.match(body, /finally\s*\{[\s\S]*?transitionBusy\.delete\(key\);\s*actionBusy\.delete\(key\);/);
});

test('existing ringtone asset and audio-owner wiring remain present', () => {
  assert.match(source, /ringtones\/1000449570\.mp4/);
  assert.match(source, /function startRingtone\(/);
  assert.match(source, /function stopRingtone\(/);
});

test('lifecycle transition fails closed if authoritative server read fails', () => {
  const body = section('async function lifecycleTransition(id,next){', 'async function markReady(id)');
  assert.match(body, /const fresh=await read\(id,before\.outlet_id\)\.catch\(\(\)=>null\)/);
  assert.match(body, /\}else\{[\s\S]*?current server state could not be verified[\s\S]*?return;\s*\}\s*const r=await window\.sb\.rpc/);
});
