package com.jeetpunjabitadka.partner

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val partnerUrl = "https://harmeetsg1983-blip.github.io/jeetpunjabitadka/admin.html"
    private var bridgeRunnable: Runnable? = null
    private val supabaseUrl = "https://qrkbhrmxejtpvheplath.supabase.co"
    private val supabaseKey = "sb_publishable_xySAr0cGnVCaC_sgtwk8Zw_IW_b5sgh"

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
        checkForNativeUpdate()
    }

    inner class NativeAlertBridge {
        @JavascriptInterface fun start(orderNo: String) {
            val intent = Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.START)
                .putExtra("order_no", orderNo)
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
        }

        @JavascriptInterface fun syncSession(accessToken: String, refreshToken: String) {
            if (accessToken.isBlank()) return
            val intent = Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.SYNC_SESSION)
                .putExtra("access_token", accessToken)
                .putExtra("refresh_token", refreshToken)
            if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent) else startService(intent)
        }

        @JavascriptInterface fun stop() {
            val intent = Intent(this@MainActivity, OrderAlertService::class.java)
                .setAction(OrderAlertService.STOP)
            if (Build.VERSION.SDK_INT >= 26) startService(intent) else startService(intent)
        }
    }

    private fun checkForNativeUpdate() {
        Thread {
            try {
                val url = URL("$supabaseUrl/rest/v1/app_release_policies?app_id=eq.jpt_partner_native_v1&platform=eq.android&select=current_version_code,current_version_name,min_supported_version_code,update_url,release_notes,is_mandatory&limit=1")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 6000
                    readTimeout = 6000
                    setRequestProperty("apikey", supabaseKey)
                    setRequestProperty("Accept", "application/json")
                }
                val code = conn.responseCode
                val body = if (code in 200..299) {
                    BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
                } else ""
                conn.disconnect()
                if (code !in 200..299) return@Thread
                val arr = org.json.JSONArray(body)
                if (arr.length() == 0) return@Thread
                val policy = arr.getJSONObject(0)
                val latest = policy.optInt("current_version_code", BuildConfig.VERSION_CODE)
                val minimum = policy.optInt("min_supported_version_code", 0)
                val updateUrl = policy.optString("update_url", "").trim()
                val releaseNotes = policy.optString("release_notes", "").trim()
                val mandatory = policy.optBoolean("is_mandatory", false)
                if (latest <= BuildConfig.VERSION_CODE && minimum <= BuildConfig.VERSION_CODE) return@Thread
                if (updateUrl.isBlank()) return@Thread
                runOnUiThread {
                    if (isFinishing || isDestroyed) return@runOnUiThread
                    val title = if (minimum > BuildConfig.VERSION_CODE) "Update required" else "New JPT Partner update"
                    val message = buildString {
                        append("Installed: ")\n                        append(BuildConfig.VERSION_NAME)\n                        append("\\nAvailable: ")\n                        append(policy.optString("current_version_name", "new version"))\n                        if (releaseNotes.isNotBlank()) {\n                            append("\\n\\n")\n                            append(releaseNotes)\n                        }\n                    }
                    val dialog = androidx.appcompat.app.AlertDialog.Builder(this)
                        .setTitle(title)
                        .setMessage(message)
                        .setPositiveButton("UPDATE") { _, _ ->
                            try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl))) } catch (_: Throwable) { }
                        }
                    if (minimum <= BuildConfig.VERSION_CODE && !mandatory) dialog.setNegativeButton("LATER", null)
                    dialog.setCancelable(minimum <= BuildConfig.VERSION_CODE && !mandatory)
                    dialog.show()
                }
            } catch (_: Throwable) {
                // Update policy is optional; dashboard and order monitoring continue if unavailable.
            }
        }.start()
    }

    private fun installNativeAlertBridge() {
        bridgeRunnable?.let { web.removeCallbacks(it) }
        val runnable = object : Runnable {
            override fun run() {
                if (isFinishing || isDestroyed) return
                web.evaluateJavascript("""(function(){
                    if(!window.JPTNativeAlert)return;
                    if(!window.__JPT_NATIVE_SESSION_SYNC){
                        window.__JPT_NATIVE_SESSION_SYNC=true;
                        const sync=async()=>{try{
                            if(window.sb?.auth?.getSession){
                                const r=await window.sb.auth.getSession();
                                const s=r?.data?.session;
                                if(s?.access_token) window.JPTNativeAlert.syncSession(String(s.access_token),String(s.refresh_token||""));
                            }
                        }catch(e){}};
                        sync();
                        setInterval(sync,30000);
                    }
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