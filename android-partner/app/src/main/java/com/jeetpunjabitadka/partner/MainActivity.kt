package com.jeetpunjabitadka.partner

import android.Manifest
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import com.jeetpunjabitadka.partner.nativev1.BuildConfig

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
                        append("Installed: " + BuildConfig.VERSION_NAME)
                        append("\nAvailable: " + policy.optString("current_version_name", "New version"))
                        if (releaseNotes.isNotBlank()) {
                            append("\n\n")
                            append(releaseNotes)
                        }
                    }
                    val dialog = androidx.appcompat.app.AlertDialog.Builder(this@MainActivity)
                        .setTitle(title)
                        .setMessage(message)
                        .setPositiveButton("UPDATE") { _, _ ->
                            try {
                                startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl)))
                            } catch (_: Throwable) {
                            }
                        }
                    if (minimum <= BuildConfig.VERSION_CODE && !mandatory) {
                        dialog.setNegativeButton("LATER", null)
                    }
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
        val task = object : Runnable {
            override fun run() {
                web.evaluateJavascript("""
                    (function(){
                      try {
                        if(window.JPTNativeAlert){
                          window.__jptNativeAlert=window.JPTNativeAlert;
                          if(window.showOrderAlarm && !window.__jptNativeAlarmHooked){
                            const original=window.showOrderAlarm;
                            window.showOrderAlarm=function(orderNo){
                              try{window.__jptNativeAlert.start(String(orderNo||''));}catch(e){}
                              return original.apply(this,arguments);
                            };
                            window.__jptNativeAlarmHooked=true;
                          }
                          if(window.sb && window.__jptNativeSessionSync===undefined){
                            window.__jptNativeSessionSync=setInterval(async function(){
                              try{
                                const s=await window.sb.auth.getSession();
                                const session=s&&s.data&&s.data.session;
                                if(session&&session.access_token){
                                  window.__jptNativeAlert.syncSession(session.access_token,session.refresh_token||'');
                                }
                              }catch(e){}
                            },30000);
                          }
                          if(window.orderAction && !window.__jptNativeOrderHooked){
                            const originalAction=window.orderAction;
                            window.orderAction=async function(id,status){
                              try{if(status&&status!=='new')window.__jptNativeAlert.stop();}catch(e){}
                              return originalAction.apply(this,arguments);
                            };
                            window.__jptNativeOrderHooked=true;
                          }
                        }
                      }catch(e){}
                    })();
                """.trimIndent(), null)
                web.postDelayed(this, 10000)
            }
        }
        bridgeRunnable = task
        web.post(task)
    }
}
