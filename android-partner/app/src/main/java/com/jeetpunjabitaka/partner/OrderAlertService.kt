package com.jeetpunjabitadka.partner.nativev1

import android.app.*
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
import java.util.concurrent.ScheduledExecutorService
import java.util.concurrent.TimeUnit

class OrderAlertService : Service() {
    companion object {
        const val START = "JPT_START_ORDER_ALERT"
        const val STOP = "JPT_STOP_ORDER_ALERT"
        const val SYNC_SESSION = "JPT_SYNC_SESSION"
        private const val CHANNEL = "jpt_new_order"
        private const val NOTIF = 7001
        private const val PREFS = "jpt_partner_native_session"
        private const val SESSION = "session_json"
        private const val AUDIO_URL = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/1000449570.mp4"
    }

    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var executor: ScheduledExecutorService? = null
    private val seen = linkedSetOf<String>()
    @Volatile private var running = false

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForegroundNow()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            SYNC_SESSION -> {
                val payload = intent.getStringExtra(SESSION).orEmpty()
                if (payload.isNotBlank()) {
                    getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(SESSION, payload).apply()
                }
                startPolling()
            }
            START -> startAlert(intent.getStringExtra("order_no") ?: "New order")
            STOP -> stopPlaybackOnly()
        }
        startForegroundNow()
        return START_STICKY
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val nm = getSystemService(NotificationManager::class.java)
            val ch = NotificationChannel(CHANNEL, "New Orders", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "Jeet Punjabi Tadka restaurant new-order alerts"
                setSound(null, null)
                enableVibration(true)
                setBypassDnd(false)
            }
            nm.createNotificationChannel(ch)
        }
    }

    private fun startForegroundNow() {
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("Jeet Partner")
            .setContentText("Order monitoring active")
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
        if (Build.VERSION.SDK_INT >= 26) startForeground(NOTIF, notification)
    }

    private fun startPolling() {
        if (running) return
        running = true
        executor = Executors.newSingleThreadScheduledExecutor()
        executor?.scheduleWithFixedDelay({ pollNewOrders() }, 0, 2500, TimeUnit.MILLISECONDS)
    }

    private fun pollNewOrders() {
        try {
            val raw = getSharedPreferences(PREFS, MODE_PRIVATE).getString(SESSION, null) ?: return
            val s = JSONObject(raw)
            val url = s.optString("url").trimEnd('/')
            val key = s.optString("key")
            val access = s.optString("access_token")
            if (url.isBlank() || key.isBlank() || access.isBlank()) return

            val endpoint = "$url/rest/v1/orders?select=id,order_no,status,outlet_id,created_at&status=eq.new&order=created_at.desc&limit=50"
            val conn = (URL(endpoint).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 7000
                readTimeout = 7000
                setRequestProperty("apikey", key)
                setRequestProperty("Authorization", "Bearer $access")
                setRequestProperty("Accept", "application/json")
            }
            val code = conn.responseCode
            val body = if (code in 200..299) {
                BufferedReader(InputStreamReader(conn.inputStream)).use { it.readText() }
            } else ""
            conn.disconnect()

            if (code == 401) return
            if (code !in 200..299 || body.isBlank()) return

            val rows = JSONArray(body)
            for (i in 0 until rows.length()) {
                val row = rows.getJSONObject(i)
                val id = row.optString("id")
                if (id.isBlank() || seen.contains(id)) continue
                seen.add(id)
                if (seen.size > 500) seen.remove(seen.first())
                startAlert(row.optString("order_no").ifBlank { id })
            }
        } catch (_: Throwable) {}
    }

    private fun startAlert(orderNo: String) {
        startForegroundNow()
        acquireWakeLock()
        if (player?.isPlaying == true) return
        try {
            player?.release()
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                setOnErrorListener { _, _, _ -> stopPlaybackOnly(); true }
                setDataSource(AUDIO_URL)
                isLooping = true
                setOnPreparedListener { it.start() }
                prepareAsync()
            }
        } catch (_: Throwable) {
            stopPlaybackOnly()
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(PowerManager::class.java)
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JPTPartner:NewOrderAlert").apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun stopPlaybackOnly() {
        try { player?.stop() } catch (_: Throwable) {}
        try { player?.release() } catch (_: Throwable) {}
        player = null
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    override fun onDestroy() {
        stopPlaybackOnly()
        executor?.shutdownNow()
        executor = null
        running = false
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
