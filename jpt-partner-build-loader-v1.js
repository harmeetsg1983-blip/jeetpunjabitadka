/* JPT Partner Build Loader V1
   Controlled integration for pending Partner Dashboard build layers.
   Existing admin.html logic is not replaced.
*/
(function(){
  'use strict';
  if(window.__JPT_PARTNER_BUILD_LOADER_V1__) return;
  window.__JPT_PARTNER_BUILD_LOADER_V1__=true;

  const files=['jpt-partner-branding-upload-v1.js', 'jpt-partner-branding-preview-v1.js', 'jpt-partner-outlet-selector-guard-v1.js', 'jpt-partner-login-context-v1.js', 'jpt-partner-onboarding-dedupe-v1.js', 'jpt-partner-branding-readiness-v1.js', 'jpt-partner-branding-fields-sync-v1.js', 'jpt-partner-outlet-completeness-v1.js', 'jpt-partner-application-safety-v1.js', 'jpt-partner-outlet-switch-event-v1.js', 'jpt-partner-settings-navigation-v1.js', 'jpt-partner-central-owner-visibility-v1.js', 'jpt-partner-active-outlet-badge-v1.js', 'jpt-partner-session-expiry-guard-v1.js', 'jpt-partner-error-notice-v1.js', 'jpt-partner-branding-upload-status-v1.js', 'jpt-partner-menu-permission-guard-v1.js', 'jpt-partner-onboarding-outlet-preview-v1.js', 'jpt-partner-outlet-data-refresh-v1.js', 'jpt-partner-safe-ui-hooks-v1.js', 'jpt-partner-branding-apply-status-v1.js', 'jpt-partner-branding-file-validation-v1.js', 'jpt-partner-branding-refresh-hook-v1.js', 'jpt-partner-branding-url-preview-v1.js', 'jpt-partner-outlet-context-indicator-v1.js'];

  function load(src){
    return new Promise(resolve=>{
      if(document.querySelector('script[data-jpt-build-src="'+src+'"]')) return resolve();
      const s=document.createElement('script');
      s.src='./'+src+'?v=1';
      s.setAttribute('data-jpt-build-src',src);
      s.onload=resolve;
      s.onerror=resolve;
      document.body.appendChild(s);
    });
  }

  async function boot(){
    for(const file of files) await load(file);
    window.dispatchEvent(new CustomEvent('jpt:pending-build-loaded',{
      detail:{count:files.length,timestamp:Date.now()}
    }));
  }

  if(document.readyState==='loading')
    document.addEventListener('DOMContentLoaded',boot);
  else
    boot();
})();
