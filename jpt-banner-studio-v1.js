/* JPT — ISOLATED BANNER STUDIO V1
   Preview-only media fitting. No production/admin/order mutations.
*/
(function(){
'use strict';
if(window.JPTBannerStudioV1)return;
const API={
  version:'1.0.0-preview-only',
  fitMode:'cover',
  inspect(file){
    if(!file) return null;
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const finish=(kind,w,h,duration)=>{
        const ratio=w&&h?w/h:null;
        const shape=ratio?ratio>1.9?'ultra-wide':ratio>1.15?'landscape':ratio<.85?'portrait':'near-square':'unknown';
        resolve({kind,name:file.name,type:file.type,size:file.size,width:w,height:h,ratio,shape,duration:duration??null,url});
      };
      if(file.type.startsWith('image/')){
        const im=new Image();
        im.onload=()=>finish('image',im.naturalWidth,im.naturalHeight);
        im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Image could not be read'))};
        im.src=url;
      }else if(file.type.startsWith('video/')){
        const v=document.createElement('video');
        v.preload='metadata';
        v.onloadedmetadata=()=>finish('video',v.videoWidth,v.videoHeight,v.duration);
        v.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Video could not be read'))};
        v.src=url;
      }else{URL.revokeObjectURL(url);reject(Error('Unsupported media'))}
    });
  },
  recommend(meta){
    if(!meta)return null;
    return {container:'fixed banner frame',fit:'cover',overflow:'hidden',objectPosition:'50% 50%',reason:'Preserves the banner boundary while automatically cropping excess area.'};
  },
  mount(target){
    const root=typeof target==='string'?document.querySelector(target):target;
    if(!root)return false;
    root.innerHTML='<div class="jpt-bs"><div class="jpt-bs-head"><b>JPT BANNER STUDIO</b><span>Preview only</span></div><input class="jpt-bs-file" type="file" accept="image/*,video/*"><div class="jpt-bs-meta">Choose image or video to inspect.</div><div class="jpt-bs-frame"><div class="jpt-bs-empty">Preview will appear here</div></div><div class="jpt-bs-rule">Automatic fit: banner frame stays fixed, media uses cover + hidden overflow. No media can visually escape the banner.</div></div>';
    const file=root.querySelector('.jpt-bs-file'),meta=root.querySelector('.jpt-bs-meta'),frame=root.querySelector('.jpt-bs-frame');
    file.onchange=async()=>{
      const f=file.files?.[0];if(!f)return;
      try{
        const m=await API.inspect(f);
        meta.textContent=m.kind.toUpperCase()+' • '+m.width+'×'+m.height+' • '+(m.ratio?m.ratio.toFixed(2):'—')+' ratio'+(m.duration?(' • '+m.duration.toFixed(1)+' sec'):'');
        frame.innerHTML=m.kind==='video'?'<video muted playsinline controls></video>':'<img alt="Banner preview">';
        const el=frame.firstElementChild;el.src=m.url;el.style.objectFit='cover';el.style.objectPosition='50% 50%';
      }catch(e){meta.textContent='Preview error: '+e.message}
    };
    return true;
  }
};
window.JPTBannerStudioV1=Object.freeze(API);
})();