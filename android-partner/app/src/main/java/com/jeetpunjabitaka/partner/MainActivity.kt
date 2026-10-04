package com.jeetpunjabitadka.partner.nativev1

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val partnerUrl = "https://harmeetsg1983-blip.github.io/jeetpunjabitadka/admin.html"
    private var bridgeRunnable: Runnable? = null
    private var sessionRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) {
            ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9001)
        }
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String) {
                    super.onPageFinished(view, url)
                    installNativeBridge()
                }
            }
            addJavascriptInterface(NativeAlertBridge(), "JPTNativeAlert")
            loadUrl(partnerUrl)
        }
        setContentView(web)
    }

    inner class NativeAlertBridge {
        @JavascriptInterface fun start(orderNo: String) {
            startForegroundServiceCompat(Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.START)
                .putExtra("order_no", orderNo))
        }

        @JavascriptInterface fun stop() {
            startForegroundServiceCompat(Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.STOP))
        }

        @JavascriptInterface fun sync(payload: String) {
            if (payload.isBlank()) return
            startForegroundServiceCompat(Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.SYNC_SESSION)
                .putExtra("session_json", payload))
        }
    }

    private fun startForegroundServiceCompat(intent: Intent) {
        try {
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
        } catch (_: Throwable) {
            try { startService(intent) } catch (_: Throwable) {}
        }
    }

    private fun installNativeBridge() {
        bridgeRunnable?.let { web.removeCallbacks(it) }
        sessionRunnable?.let { web.removeCallbacks(it) }

        val bridge = object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                web.evaluateJavascript("""
                    (function(){
                      try{
                        if(window.JPTNativeAlert){
                          if(window.showOrderAlarm && !window.__jptNativeAlarmHooked){
                            const originalShow=window.showOrderAlarm;
                            window.showOrderAlarm=function(o){
                              try{window.JPTNativeAlert.start(String(o?.order_no||o?.id||"NEW ORDER"));}catch(e){}
                              return originalShow.apply(this,arguments);
                            };
                            window.__jptNativeAlarmHooked=true;
                          }
                          if(window.orderAction && !window.__jptNativeOrderHooked){
                            const originalAction=window.orderAction;
                            window.orderAction=async function(id,status,extra){
                              const s=String(status||"").toLowerCase();
                              if(s!=="new"){
                                try{window.JPTNativeAlert.stop();}catch(e){}
                              }
                              return originalAction.apply(this,arguments);
                            };
                            window.__jptNativeOrderHooked=true;
                          }
                        }
                      }catch(e){}
                    })();
                """.trimIndent(), null)
                web.postDelayed(this, 1000)
            }
        }
        bridgeRunnable = bridge
        web.post(bridge)

        val session = object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                web.evaluateJavascript("""
                    (async function(){
                      try{
                        if(!window.sb||!window.JPTNativeAlert)return;
                        const s=await window.sb.auth.getSession();
                        const session=s&&s.data&&s.data.session;
                        const url=window.JPT_SUPABASE_URL||"";
                        const key=window.JPT_SUPABASE_PUBLISHABLE_KEY||"";
                        if(session&&session.access_token&&url&&key){
                          window.JPTNativeAlert.sync(JSON.stringify({
                            url:url,key:key,access_token:session.access_token,
                            refresh_token:session.refresh_token||""
                          }));
                        }
                      }catch(e){}
                    })();
                """.trimIndent(), null)
                web.postDelayed(this, 30000)
            }
        }
        sessionRunnable = session
        web.post(session)
    }

    override fun onDestroy() {
        bridgeRunnable?.let { web.removeCallbacks(it) }
        sessionRunnable?.let { web.removeCallbacks(it) }
        bridgeRunnable = null
        sessionRunnable = null
        web.destroy()
        super.onDestroy()
    }
}
