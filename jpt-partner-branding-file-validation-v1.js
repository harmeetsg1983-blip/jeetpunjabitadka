/* JPT Partner Branding File Validation V1
   Validates branding images before the existing uploader is used.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BRANDING_FILE_VALIDATION_V1__) return;
  window.__JPT_PARTNER_BRANDING_FILE_VALIDATION_V1__=true;

  const maxBytes=5*1024*1024;

  function validate(input,msg){
    if(!input)return;
    input.addEventListener('change',()=>{
      const f=input.files?.[0];
      if(!f)return;
      if(!/^image\//i.test(f.type)){
        alert('Please select an image file.');
        input.value='';
        return;
      }
      if(f.size>maxBytes){
        alert('Image is larger than 5 MB. Please choose a smaller image.');
        input.value='';
        return;
      }
      if(msg)msg.textContent='✓ '+f.name+' ready';
    });
  }

  function boot(){
    validate(document.getElementById('jptBrandLogoFile'),document.getElementById('jptBrandUploadMsg'));
    validate(document.getElementById('jptBrandBannerFile'),document.getElementById('jptBrandUploadMsg'));
  }
  setTimeout(boot,1500);
  setInterval(boot,5000);
})();
