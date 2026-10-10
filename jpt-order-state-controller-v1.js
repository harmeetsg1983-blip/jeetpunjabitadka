/* JPT Isolated Order-State Controller — Approach B
 * Dependency-injected state/sync layer. No DOM, audio, ringtone, or Supabase SDK imports.
 * Not production-wired until the integration PR explicitly opts into it.
 */
(function(root,factory){
  if(typeof module==='object'&&module.exports) module.exports=factory();
  else root.JPTOrderStateController=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const DEFAULT_ALLOWED={
    accepted:['new'],
    cancelled:['new'],
    ready:['accepted','preparing'],
    out_for_delivery:['ready'],
    delivered:['out_for_delivery']
  };
  const normalize=v=>String(v||'').trim().toLowerCase();
  const rowVersion=row=>{
    const t=Date.parse(row&&row.updated_at||'');
    return Number.isFinite(t)?t:0;
  };
  function createOrderStateController(options){
    if(!options||typeof options.readOrder!=='function'||typeof options.transitionOrder!=='function')
      throw new TypeError('readOrder and transitionOrder are required');
    const readOrder=options.readOrder;
    const transitionOrder=options.transitionOrder;
    const onState=typeof options.onState==='function'?options.onState:()=>{};
    const getStatus=typeof options.getStatus==='function'?options.getStatus:r=>normalize(r&&r.status);
    const allowed=options.allowedTransitions||DEFAULT_ALLOWED;
    const locks=new Set();
    const currentRows=new Map();
    const pendingRealtime=new Map();
    function keyOf(id){return String(id);}
    function publish(id,row,meta){
      if(row)currentRows.set(keyOf(id),row);
      onState({id:keyOf(id),row:row||null,meta:meta||{}});
      return row||null;
    }
    function newer(candidate,current){
      if(!current)return true;
      const a=rowVersion(candidate),b=rowVersion(current);
      if(a&&b)return a>=b;
      // If either row lacks updated_at, caller should prefer an authoritative read.
      return false;
    }
    async function refresh(id,outletId){
      const row=await readOrder(id,outletId);
      if(!row){currentRows.delete(keyOf(id));publish(id,null,{source:'server-read',missing:true});return null;}
      currentRows.set(keyOf(id),row);
      publish(id,row,{source:'server-read'});
      return row;
    }
    async function transition(id,nextStatus,params){
      const key=keyOf(id),next=normalize(nextStatus);
      if(locks.has(key))return {ok:false,reason:'busy',row:currentRows.get(key)||null};
      // Lock is acquired synchronously before the first await.
      locks.add(key);
      onState({id:key,row:currentRows.get(key)||null,meta:{busy:true,action:next}});
      try{
        const before=await readOrder(id,params&&params.outletId);
        if(!before){
          currentRows.delete(key);
          publish(id,null,{source:'server-read',missing:true,busy:true});
          return {ok:false,reason:'not-found',row:null};
        }
        currentRows.set(key,before);
        publish(id,before,{source:'server-read',busy:true});
        const serverStatus=getStatus(before);
        if(!(allowed[next]||[]).map(normalize).includes(serverStatus)){
          return {ok:false,reason:'invalid-transition',row:before,serverStatus};
        }
        let transitionError=null;
        try{
          await transitionOrder(id,next,params||{});
        }catch(error){transitionError=error;}
        // A server read is authoritative whether RPC succeeded, failed, or raced.
        let after=null,readError=null;
        try{after=await readOrder(id,params&&params.outletId);}catch(error){readError=error;}
        if(after){
          currentRows.set(key,after);
          publish(id,after,{source:'reconciliation',busy:true,rpcFailed:!!transitionError});
          const confirmed=getStatus(after)===next ||
            (next==='ready'&&['out_for_delivery','delivered'].includes(getStatus(after))) ||
            (next==='out_for_delivery'&&getStatus(after)==='delivered');
          return {ok:confirmed,row:after,reason:confirmed?'confirmed':transitionError?'rpc-failed':'not-confirmed',error:transitionError||null};
        }
        // Never claim success from optimistic state if authoritative verification failed.
        if(transitionError)return {ok:false,reason:'rpc-and-read-failed',row:before,error:transitionError,readError};
        return {ok:false,reason:'verification-failed',row:before,readError};
      }finally{
        locks.delete(key);
        const pending=pendingRealtime.get(key);
        pendingRealtime.delete(key);
        if(pending){
          const known=currentRows.get(key);
          if(newer(pending,known)){currentRows.set(key,pending);publish(id,pending,{source:'realtime-after-action'});}
          else {
            // Ask the database for truth after a potentially concurrent event.
            try{await refresh(id,params&&params.outletId);}catch(error){onState({id:key,row:currentRows.get(key)||null,meta:{source:'reconcile-read-failed',error}});}
          }
        }
        onState({id:key,row:currentRows.get(key)||null,meta:{busy:false,action:next}});
      }
    }
    function applyRealtime(row){
      if(!row||row.id===undefined||row.id===null)return false;
      const key=keyOf(row.id);
      if(locks.has(key)){
        const prior=pendingRealtime.get(key);
        if(newer(row,prior))pendingRealtime.set(key,row);
        return true;
      }
      const known=currentRows.get(key);
      if(newer(row,known)){
        currentRows.set(key,row);
        publish(row.id,row,{source:'realtime'});
        return true;
      }
      // Missing timestamps are ambiguous; don't overwrite state with an unversioned event.
      return false;
    }
    function isBusy(id){return locks.has(keyOf(id));}
    function getRow(id){return currentRows.get(keyOf(id))||null;}
    function clear(){locks.clear();currentRows.clear();pendingRealtime.clear();}
    return Object.freeze({transition,refresh,applyRealtime,isBusy,getRow,clear});
  }
  return Object.freeze({createOrderStateController,DEFAULT_ALLOWED_TRANSITIONS:DEFAULT_ALLOWED});
});
