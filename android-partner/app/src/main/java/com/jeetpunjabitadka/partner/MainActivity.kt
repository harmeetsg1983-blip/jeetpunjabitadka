package com.jeetpunjabitadka.partner

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

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) ActivityCompat.requestPermissions(this, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 9001)
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
            startService(Intent(this@MainActivity, OrderAlertService::class.java).setAction(OrderAlertService.START).putExtra("order_no", orderNo))
        }
        @JavascriptInterface fun stop() {
            startService(Intent(this@MainActivity, OrderAlertService::class.java).setAction(OrderAlertService.STOP))
        }
    }

    private fun installNativeAlertBridge() {
        web.postDelayed(object : Runnable {
            override fun run() {
                web.evaluateJavascript("""(function(){
                    if(window.__JPT_NATIVE_BRIDGE_INSTALLED)return;
                    if(typeof window.showOrderAlarm!=="function")return;
                    window.__JPT_NATIVE_BRIDGE_INSTALLED=true;
                    const originalShow=window.showOrderAlarm;
                    window.showOrderAlarm=function(o){try{window.JPTNativeAlert.start(String(o?.order_no||o?.id||"NEW ORDER"));}catch(e){};return originalShow.apply(this,arguments)};
                    if(typeof window.orderAction==="function"){
                        const originalAction=window.orderAction;
                        window.orderAction=async function(id,status,extra){const r=await originalAction.apply(this,arguments);if(r!==false && String(status||"").toLowerCase()!=="new"){try{window.JPTNativeAlert.stop();}catch(e){}}return r};
                    }
                })()""", null)
                if(!isFinishing) web.postDelayed(this, 1000)
            }
        }, 1500)
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
