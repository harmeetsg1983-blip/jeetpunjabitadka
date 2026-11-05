package com.jeetpunjabitadka.partner

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.result.contract.ActivityResultContracts
import java.io.File

class MainActivity : ComponentActivity() {
    private lateinit var web: WebView
    private var fileChooserCallback: ValueCallback<Array<Uri>>? = null

    private val notificationPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { }

    private val ringtonePicker = registerForActivityResult(
        ActivityResultContracts.OpenDocument()
    ) { uri ->
        val callback = fileChooserCallback
        fileChooserCallback = null
        if (uri == null) {
            callback?.onReceiveValue(null)
            return@registerForActivityResult
        }
        callback?.onReceiveValue(arrayOf(uri))
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (Build.VERSION.SDK_INT >= 33 &&
            checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = WebViewClient()
            webChromeClient = object : WebChromeClient() {
                override fun onShowFileChooser(
                    webView: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    this@MainActivity.fileChooserCallback?.onReceiveValue(null)
                    this@MainActivity.fileChooserCallback = filePathCallback
                    return try {
                        ringtonePicker.launch(arrayOf("audio/*"))
                        true
                    } catch (e: Exception) {
                        this@MainActivity.fileChooserCallback = null
                        filePathCallback?.onReceiveValue(null)
                        false
                    }
                }
            }
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

    override fun onDestroy() {
        fileChooserCallback?.onReceiveValue(null)
        fileChooserCallback = null
        super.onDestroy()
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

        @JavascriptInterface
        fun notificationsAllowed(): Boolean {
            return Build.VERSION.SDK_INT < 33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED
        }

        @JavascriptInterface
        fun requestNotificationPermission(): Boolean {
            if (Build.VERSION.SDK_INT < 33) return true
            if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == android.content.pm.PackageManager.PERMISSION_GRANTED) return true
            runOnUiThread { notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS) }
            return false
        }

        @JavascriptInterface
        fun setOrderNotifications(enabled: Boolean) {
            getSharedPreferences("jpt_alarm", MODE_PRIVATE).edit().putBoolean("order_notifications", enabled).apply()
        }

        @JavascriptInterface
        fun testRingtone() {
            OrderAlarmService.test(this@MainActivity)
        }

        @JavascriptInterface
        fun setRingVolume(value: Int) {
            getSharedPreferences("jpt_alarm", MODE_PRIVATE).edit()
                .putInt("ring_volume", value.coerceIn(0, 100)).apply()
        }

        @JavascriptInterface
        fun saveRingtone(base64: String?, mimeType: String?, fileName: String?): Boolean {
            return try {
                val mime = mimeType.orEmpty().lowercase()
                if (!mime.startsWith("audio/")) return false
                val encoded = base64.orEmpty().substringAfter(",", base64.orEmpty())
                if (encoded.isBlank() || encoded.length > 14_000_000) return false
                val bytes = Base64.decode(encoded, Base64.DEFAULT)
                if (bytes.isEmpty() || bytes.size > 10 * 1024 * 1024) return false
                val target = File(filesDir, "jpt_order_ringtone")
                val temp = File(filesDir, "jpt_order_ringtone.tmp")
                temp.writeBytes(bytes)
                if (target.exists()) target.delete()
                if (!temp.renameTo(target)) return false
                getSharedPreferences("jpt_alarm", MODE_PRIVATE).edit()
                    .putString("ringtone_path", target.absolutePath)
                    .putString("ringtone_name", fileName.orEmpty().take(120))
                    .apply()
                true
            } catch (e: Exception) {
                false
            }
        }
    }
}
