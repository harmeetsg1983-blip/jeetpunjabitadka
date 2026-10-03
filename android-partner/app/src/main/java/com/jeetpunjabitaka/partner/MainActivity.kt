package com.jeetpunjabitaka.partner

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
                    installNativeAlertBridge()
                }
            }
            addJavascriptInterface(NativeAlertBridge(), "JPTNativeAlert")
            loadUrl(partnerUrl)
        }
        setContentView(web)
    }

    inner class NativeAlertBridge {
        @JavascriptInterface fun start(orderNo: String) {
            startService(Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.START)
                .putExtra("order_no", orderNo))
        }

        @JavascriptInterface fun stop() {
            startService(Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.STOP))
        }
    }

    private fun installNativeAlertBridge() {
        bridgeRunnable?.let { web.removeCallbacks(it) }
        val runnable = object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                web.evaluateJavascript("""(function(){
                    if(window.__JPT_NATIVE_BRIDGE_INSTALLED)return;
                    if(typeof window.showOrderAlarm!=="function")return;
                    window.__JPT_NATIVE_BRIDGE_INSTALLED=true;
                    const originalShow=window.showOrderAlarm;
                    window.showOrderAlarm=function(o){
                        try{window.JPTNativeAlert.start(String(o?.order_no||o?.id||"NEW ORDER"));}catch(e){}
                        return originalShow.apply(this,arguments);
                    };
                    if(typeof window.orderAction==="function"){
                        const originalAction=window.orderAction;
                        window.orderAction=async function(id,status,extra){
                            const r=await originalAction.apply(this,arguments);
                            if(r!==false && String(status||"").toLowerCase()!=="new"){
                                try{window.JPTNativeAlert.stop();}catch(e){}
                            }
                            return r;
                        };
                    }
                })()""", null)
                if (!isFinishing && !isDestroyed) {
                    web.postDelayed(this, 1000)
                }
            }
        }
        bridgeRunnable = runnable
        web.postDelayed(runnable, 1500)
    }

    override fun onDestroy() {
        bridgeRunnable?.let { web.removeCallbacks(it) }
        bridgeRunnable = null
        web.destroy()
        super.onDestroy()
    }
}
