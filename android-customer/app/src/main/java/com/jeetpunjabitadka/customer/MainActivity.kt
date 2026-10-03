package com.jeetpunjabitadka.customer

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import com.jeetpunjabitadka.customer.nativev1.BuildConfig
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : AppCompatActivity() {
    private lateinit var web: WebView
    private val customerUrl = "https://harmeetsg1983-blip.github.io/jeetpunjabitadka/index.html"
    private val supabaseUrl = "https://qrkbhrmxejtpvheplath.supabase.co"
    private val supabaseKey = "sb_publishable_xySAr0cGnVCaC_sgtwk8Zw_IW_b5sgh"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        web = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            webViewClient = WebViewClient()
            loadUrl(customerUrl)
        }
        setContentView(web)
        checkForNativeUpdate()
    }

    override fun onBackPressed() {
        if (web.canGoBack()) web.goBack() else super.onBackPressed()
    }

    private fun checkForNativeUpdate() {
        Thread {
            try {
                val url = URL("$supabaseUrl/rest/v1/app_release_policies?app_id=eq.jpt_customer_native_v1&platform=eq.android&select=current_version_code,current_version_name,min_supported_version_code,update_url,release_notes,is_mandatory&limit=1")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    connectTimeout = 6000
                    readTimeout = 6000
                    setRequestProperty("apikey", supabaseKey)
                    setRequestProperty("Accept", "application/json")
                }
                val code = conn.responseCode
                val body = if (code in 200..299) BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() } else ""
                conn.disconnect()
                if (code !in 200..299) return@Thread
                val arr = org.json.JSONArray(body)
                if (arr.length() == 0) return@Thread
                val policy = arr.getJSONObject(0)
                val latest = policy.optInt("current_version_code", BuildConfig.VERSION_CODE)
                val minimum = policy.optInt("min_supported_version_code", 0)
                val updateUrl = policy.optString("update_url", "").trim()
                val notes = policy.optString("release_notes", "").trim()
                val mandatory = policy.optBoolean("is_mandatory", false)
                if (latest <= BuildConfig.VERSION_CODE && minimum <= BuildConfig.VERSION_CODE) return@Thread
                if (updateUrl.isBlank()) return@Thread
                runOnUiThread {
                    if (isFinishing || isDestroyed) return@runOnUiThread
                    val dialog = AlertDialog.Builder(this@MainActivity)
                        .setTitle(if (minimum > BuildConfig.VERSION_CODE) "JPT Customer update required" else "New JPT Customer update")
                        .setMessage(buildString {
                            append("Installed: ").append(BuildConfig.VERSION_NAME)
                            append("\nAvailable: ").append(policy.optString("current_version_name", "New version"))
                            if (notes.isNotBlank()) append("\n\n").append(notes)
                        })
                        .setPositiveButton("UPDATE") { _, _ ->
                            try { startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(updateUrl))) } catch (_: Throwable) {}
                        }
                    if (minimum <= BuildConfig.VERSION_CODE && !mandatory) dialog.setNegativeButton("LATER", null)
                    dialog.setCancelable(minimum <= BuildConfig.VERSION_CODE && !mandatory)
                    dialog.show()
                }
            } catch (_: Throwable) { }
        }.start()
    }
}
