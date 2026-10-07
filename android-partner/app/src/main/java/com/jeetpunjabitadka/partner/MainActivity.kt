package com.jeetpunjabitadka.partner

import android.Manifest
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33) notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = WebViewClient()
            webChromeClient = WebChromeClient()
            addJavascriptInterface(OrderBridge(), "AndroidOrderAlarm")
        }
        setContentView(web)
        web.loadUrl(BuildConfig.PARTNER_WEB_URL)
        handleOrderIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleOrderIntent(intent)
    }

    private fun handleOrderIntent(intent: Intent?) {
        val orderId = intent?.getStringExtra(OrderAlarmService.EXTRA_ORDER_ID) ?: return
        OrderAlarmService.stop(this, orderId)
        val outletId = intent.getStringExtra(OrderAlarmService.EXTRA_OUTLET_ID).orEmpty()
        val safeId = org.json.JSONObject.quote(orderId)
        val safeOutlet = org.json.JSONObject.quote(outletId)
        web.post {
            web.evaluateJavascript(
                "window.dispatchEvent(new CustomEvent('jpt:native-order-opened',{detail:{orderId:$safeId,outletId:$safeOutlet}}));",
                null
            )
        }
    }

    inner class OrderBridge {
        @JavascriptInterface
        fun startAlarm(orderId: String?, outletId: String?, orderNo: String?) {
            val id = orderId.orEmpty()
            if (id.isBlank()) return
            OrderAlarmService.start(
                this@MainActivity,
                id,
                outletId.orEmpty(),
                orderNo.orEmpty().ifBlank { id }
            )
        }

        @JavascriptInterface
        fun stopAlarm(orderId: String?) {
            OrderAlarmService.stop(this@MainActivity, orderId)
        }
    }
}
