'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {createOrderStateController}=require('../jpt-order-state-controller-v1.js');
function harness(initial){
 const db=new Map(Object.entries(initial||{})); const events=[];
 let transitionImpl=async(id,next)=>{const r=db.get(String(id));db.set(String(id),{...r,status:next,updated_at:new Date(Date.parse(r.updated_at||'2026-01-01T00:00:00Z')+1000).toISOString()});};
 let readImpl=async id=>db.get(String(id))||null;
 const c=createOrderStateController({readOrder:async(id,outletId)=>readImpl(id,outletId),transitionOrder:async(id,next,params)=>transitionImpl(id,next,params),onState:e=>events.push(e)});
 return {c,db,events,setTransition(fn){transitionImpl=fn;},setRead(fn){readImpl=fn;}};
}
const row=(id,status,updated_at='2026-01-01T00:00:00Z')=>({id:String(id),outlet_id:'JPT-001',status,updated_at});
test('locks duplicate clicks synchronously while first action is pending',async()=>{
 const h=harness({'1':row(1,'new')});let release;h.setTransition((id,next)=>new Promise(resolve=>{release=()=>{const r=h.db.get(String(id));h.db.set(String(id),{...r,status:next,updated_at:'2026-01-01T00:00:01Z'});resolve();};}));
 const first=h.c.transition('1','accepted',{});assert.equal(h.c.isBusy('1'),true);await new Promise(setImmediate);
 const second=await h.c.transition('1','accepted',{});assert.equal(second.reason,'busy');release();
 const result=await first;assert.equal(result.ok,true);assert.equal(h.db.get('1').status,'accepted');assert.equal(h.c.isBusy('1'),false);
});
test('blocks READY when authoritative server state is NEW',async()=>{
 const h=harness({'2':row(2,'new')});const result=await h.c.transition('2','ready',{});
 assert.equal(result.ok,false);assert.equal(result.reason,'invalid-transition');assert.equal(h.db.get('2').status,'new');
});
test('reconciles a failed RPC against a server state changed by another actor',async()=>{
 const h=harness({'3':row(3,'new')});h.setTransition(async()=>{h.db.set('3',row(3,'accepted','2026-01-01T00:00:05Z'));throw new Error('Order is not NEW');});
 const result=await h.c.transition('3','accepted',{});assert.equal(result.ok,true);assert.equal(result.row.status,'accepted');assert.equal(result.reason,'confirmed');
});
test('realtime updates are held during action and reconciled afterward',async()=>{
 const h=harness({'4':row(4,'new')});let release;h.setTransition((id,next)=>new Promise(resolve=>{release=()=>{const r=h.db.get(String(id));h.db.set(String(id),{...r,status:next,updated_at:'2026-01-01T00:00:01Z'});resolve();};}));
 const first=h.c.transition('4','accepted',{});assert.equal(h.c.applyRealtime(row(4,'ready','2026-01-01T00:00:10Z')),true);await new Promise(setImmediate);release();await first;
 assert.equal(h.c.getRow('4').status,'ready');
});
test('ignores older realtime events instead of rolling state backwards',async()=>{
 const h=harness({'5':row(5,'accepted','2026-01-01T00:00:10Z')});await h.c.refresh('5');
 assert.equal(h.c.applyRealtime(row(5,'new','2026-01-01T00:00:01Z')),false);assert.equal(h.c.getRow('5').status,'accepted');
});
test('failed authoritative verification never reports success',async()=>{
 const h=harness({'6':row(6,'new')});let reads=0;h.setRead(async id=>{reads++;if(reads>1)throw new Error('verification read failed');return h.db.get(String(id))||null;});h.setTransition(async()=>{throw new Error('network failed');});
 const result=await h.c.transition('6','accepted',{});assert.equal(result.ok,false);assert.equal(result.reason,'rpc-and-read-failed');
});
