package com.jeetpunjabitaka.partner

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit

class OrderAlertService : Service() {
    companion object {
        const val START = "JPT_START_ORDER_ALERT"
        const val STOP = "JPT_STOP_ORDER_ALERT"
        const val SYNC_SESSION = "JPT_SYNC_PARTNER_SESSION"
        private const val CHANNEL = "jpt_new_order"
        private const val NOTIF = 7001
        private const val AUDIO_URL = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/1000449570.mp4"
        private const val PREFS = "jpt_partner_monitor"
        private const val POLL_MS = 2500L
    }

    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private val executor = Executors.newSingleThreadScheduledExecutor()
    private var pollFuture: ScheduledFuture<*>? = null
    private val seenOrderIds = linkedSetOf<String>()
    @Volatile private var supabaseUrl = ""
    @Volatile private var publishableKey = ""
    @Volatile private var accessToken = ""
    @Volatile private var refreshToken = ""
    @Volatile private var firstPoll = true

    override fun onCreate() {
        super.onCreate()
        createChannel()
        loadSession()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            SYNC_SESSION -> {
                ensureForeground("Partner background monitoring")
                syncSession(intent.getStringExtra("session_json"))
                startPolling()
            }
            START -> {
                ensureForeground("New order")
                startAlert(intent.getStringExtra("order_no") ?: "New order")
                startPolling()
            }
            STOP -> stopAlert()
        }
        return START_STICKY
    }

    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(CHANNEL, "New Orders", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Jeet Punjabi Tadka restaurant new-order alerts"
                setSound(null, null)
                enableVibration(true)
                setBypassDnd(false)
            }
            nm.createNotificationChannel(ch)
        }
    }

    private fun ensureForeground(text: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Jeet Punjabi Tadka Partner")
            .setContentText(text)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        startForeground(NOTIF, notification)
    }

    private fun syncSession(payload: String?) {
        if (payload.isNullOrBlank()) return
        try {
            val p = JSONObject(payload)
            supabaseUrl = p.optString("url", "").trimEnd('/')
            publishableKey = p.optString("key", "")
            accessToken = p.optString("access", "")
            refreshToken = p.optString("refresh", "")
            if (supabaseUrl.isNotBlank() && publishableKey.isNotBlank() && accessToken.isNotBlank()) {
                getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                    .putString("url", supabaseUrl)
                    .putString("key", publishableKey)
                    .putString("access", accessToken)
                    .putString("refresh", refreshToken)
                    .apply()
            }
        } catch (_: Throwable) {}
    }

    private fun loadSession() {
        val p = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        supabaseUrl = p.getString("url", "") ?: ""
        publishableKey = p.getString("key", "") ?: ""
        accessToken = p.getString("access", "") ?: ""
        refreshToken = p.getString("refresh", "") ?: ""
    }

    private fun startPolling() {
        if (pollFuture?.isCancelled == false || pollFuture?.isDone == false) return
        pollFuture = executor.scheduleWithFixedDelay({
            try { pollNewOrders() } catch (_: Throwable) {}
        }, 0, POLL_MS, TimeUnit.MILLISECONDS)
    }

    private fun pollNewOrders() {
        if (supabaseUrl.isBlank() || publishableKey.isBlank() || accessToken.isBlank()) return
        val endpoint = "$supabaseUrl/rest/v1/orders?select=id,order_no,status,outlet_id,created_at&status=eq.new&order=created_at.desc&limit=50"
        val result = httpGet(endpoint, accessToken)
        if (result.code == 401 && refreshAccessToken()) {
            pollNewOrders()
            return
        }
        if (result.code !in 200..299) return
        val rows = try { JSONArray(result.body) } catch (_: Throwable) { return }

        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val id = row.optString("id")
            if (id.isBlank()) continue
            if (seenOrderIds.add(id)) {
                startAlert(row.optString("order_no").ifBlank { "New order" })
            }
        }
        while (seenOrderIds.size > 200) {
            seenOrderIds.iterator().let { if (it.hasNext()) { it.next(); it.remove() } }
        }
        firstPoll = false
    }

    private data class HttpResult(val code: Int, val body: String)

    private fun httpGet(endpoint: String, token: String): HttpResult {
        val c = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("apikey", publishableKey)
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
        }
        return try {
            val body = readBody(c)
            HttpResult(c.responseCode, body)
        } finally { c.disconnect() }
    }

    private fun refreshAccessToken(): Boolean {
        if (supabaseUrl.isBlank() || publishableKey.isBlank() || refreshToken.isBlank()) return false
        val c = try {
            (URL("$supabaseUrl/auth/v1/token?grant_type=refresh_token").openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("apikey", publishableKey)
                setRequestProperty("Content-Type", "application/json")
            }
        } catch (_: Throwable) { return false }

        return try {
            c.outputStream.use { it.write(JSONObject().put("refresh_token", refreshToken).toString().toByteArray()) }
            val body = readBody(c)
            if (c.responseCode !in 200..299) return false
            val p = JSONObject(body)
            val nextAccess = p.optString("access_token", "")
            val nextRefresh = p.optString("refresh_token", refreshToken)
            if (nextAccess.isBlank()) return false
            accessToken = nextAccess
            refreshToken = nextRefresh
            getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
                .putString("access", accessToken)
                .putString("refresh", refreshToken)
                .apply()
            true
        } catch (_: Throwable) {
            false
        } finally { c.disconnect() }
    }

    private fun readBody(c: HttpURLConnection): String {
        val stream = try { c.inputStream } catch (_: Throwable) { c.errorStream }
        return stream?.let { BufferedReader(InputStreamReader(it)).use { r -> r.readText() } } ?: ""
    }

    private fun startAlert(orderNo: String) {
        ensureForeground("New Order • $orderNo")
        acquireWakeLock()
        if (player?.isPlaying == true) return
        try {
            player?.release()
            player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                setOnErrorListener { _, _, _ -> stopAlert(); true }
                setDataSource(AUDIO_URL)
                isLooping = true
                setOnPreparedListener { it.start() }
                prepareAsync()
            }
        } catch (_: Throwable) { stopAlert() }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(PowerManager::class.java)
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JPTPartner:NewOrderAlert").apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun stopAlert() {
        try { player?.stop() } catch (_: Throwable) {}
        player?.release()
        player = null
        releaseWakeLock()
        if (accessToken.isNotBlank()) ensureForeground("Partner background monitoring")
    }

    override fun onDestroy() {
        pollFuture?.cancel(true)
        pollFuture = null
        executor.shutdownNow()
        player?.release()
        player = null
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
