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
            webViewClient = WebViewClient()
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

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }
}
