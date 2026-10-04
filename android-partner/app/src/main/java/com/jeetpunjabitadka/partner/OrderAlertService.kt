package com.jeetpunjabitadka.partner

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.*
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

class OrderAlertService : Service() {
    companion object {
        const val START = "JPT_START_ORDER_ALERT"
        const val STOP = "JPT_STOP_ORDER_ALERT"
        const val SYNC_SESSION = "JPT_SYNC_SESSION"
        private const val CHANNEL = "jpt_new_order"
        private const val NOTIF = 7001
        private const val AUDIO_URL = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/1000449570.mp4"
        private const val SUPABASE_URL = "https://qrkbhrmxejtpvheplath.supabase.co"
        private const val SUPABASE_KEY = "sb_publishable_xySAr0cGnVCaC_sgtwk8Zw_IW_b5sgh"
        private const val PREFS = "jpt_native_partner_session"
        private const val ACCESS = "access_token"
        private const val REFRESH = "refresh_token"
        private const val POLL_MS = 2500L
    }

    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var pollHandler: Handler? = null
    private var pollRunnable: Runnable? = null
    private val knownNewOrders = linkedSetOf<String>()
    private var firstPoll = true

    override fun onCreate() {
        super.onCreate()
        createChannel()
        startForeground(NOTIF, buildNotification("Monitoring for new orders"))
        startPolling()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            SYNC_SESSION -> {
                saveSession(
                    intent.getStringExtra(ACCESS).orEmpty(),
                    intent.getStringExtra(REFRESH).orEmpty()
                )
                firstPoll = true
            }
            START -> startAlert(intent.getStringExtra("order_no") ?: "New order")
            STOP -> stopAlertAndMonitoring()
        }
        return START_STICKY
    }

    private fun createChannel() {
        val nm = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26) {
            val ch = NotificationChannel(
                CHANNEL, "New Orders", NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Jeet Punjabi Tadka restaurant new-order alerts"
                setSound(null, null)
                enableVibration(true)
                setBypassDnd(false)
            }
            nm.createNotificationChannel(ch)
        }
    }

    private fun buildNotification(text: String): Notification =
        NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("JPT Partner")
            .setContentText(text)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setContentIntent(
                PendingIntent.getActivity(
                    this, 7002,
                    Intent(this, MainActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or
                        if (Build.VERSION.SDK_INT >= 23) PendingIntent.FLAG_IMMUTABLE else 0
                )
            )
            .build()

    private fun saveSession(access: String, refresh: String) {
        getSharedPreferences(PREFS, MODE_PRIVATE).edit()
            .putString(ACCESS, access)
            .putString(REFRESH, refresh)
            .apply()
    }

    private fun accessToken(): String =
        getSharedPreferences(PREFS, MODE_PRIVATE).getString(ACCESS, "").orEmpty()

    private fun refreshToken(): String =
        getSharedPreferences(PREFS, MODE_PRIVATE).getString(REFRESH, "").orEmpty()

    private fun startPolling() {
        if (pollHandler != null) return
        pollHandler = Handler(Looper.getMainLooper())
        pollRunnable = object : Runnable {
            override fun run() {
                Thread { pollOrders() }.start()
                pollHandler?.postDelayed(this, POLL_MS)
            }
        }
        pollHandler?.post(pollRunnable!!)
    }

    private fun pollOrders() {
        val token = accessToken()
        if (token.isBlank()) return
        try {
            val response = requestOrders(token)
            if (response.first == 401 && refreshSession()) {
                val retry = requestOrders(accessToken())
                if (retry.first == 200) processOrders(retry.second)
            } else if (response.first == 200) {
                processOrders(response.second)
            }
        } catch (_: Throwable) {
            // The next poll retries without interrupting the dashboard.
        }
    }

    private fun requestOrders(token: String): Pair<Int, String> {
        val url = URL(
            "$SUPABASE_URL/rest/v1/orders" +
                "?select=id,order_no,status,outlet_id,created_at" +
                "&status=eq.new&order=created_at.desc&limit=50"
        )
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 8000
            readTimeout = 8000
            setRequestProperty("apikey", SUPABASE_KEY)
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Accept", "application/json")
        }
        return try {
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let { BufferedReader(InputStreamReader(it)).use { r -> r.readText() } } ?: ""
            code to body
        } finally {
            conn.disconnect()
        }
    }

    private fun processOrders(body: String) {
        val rows = JSONArray(body)
        val current = linkedSetOf<String>()
        for (i in 0 until rows.length()) {
            val row = rows.optJSONObject(i) ?: continue
            val id = row.optString("id").ifBlank { row.optString("order_no") }
            if (id.isNotBlank()) current.add(id)
        }

        val fresh = current.filter { !knownNewOrders.contains(it) }
        knownNewOrders.retainAll(current)
        knownNewOrders.addAll(current)

        if (firstPoll) {
            firstPoll = false
            if (fresh.isNotEmpty()) {
                val row = rows.optJSONObject(0)
                startAlert(row?.optString("order_no").orEmpty().ifBlank { "New order" })
            }
            return
        }

        if (fresh.isNotEmpty()) {
            val newest = rows.optJSONObject(0)
            startAlert(newest?.optString("order_no").orEmpty().ifBlank { "New order" })
        }
    }

    private fun refreshSession(): Boolean {
        val refresh = refreshToken()
        if (refresh.isBlank()) return false
        return try {
            val url = URL("$SUPABASE_URL/auth/v1/token?grant_type=refresh_token")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                doOutput = true
                connectTimeout = 8000
                readTimeout = 8000
                setRequestProperty("apikey", SUPABASE_KEY)
                setRequestProperty("Content-Type", "application/x-www-form-urlencoded")
            }
            val form = "refresh_token=" + URLEncoder.encode(refresh, "UTF-8")
            conn.outputStream.use { it.write(form.toByteArray(Charsets.UTF_8)) }
            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let { BufferedReader(InputStreamReader(it)).use { r -> r.readText() } } ?: ""
            conn.disconnect()
            if (code !in 200..299) return false
            val obj = org.json.JSONObject(body)
            val access = obj.optString("access_token")
            val nextRefresh = obj.optString("refresh_token").ifBlank { refresh }
            if (access.isBlank()) return false
            saveSession(access, nextRefresh)
            true
        } catch (_: Throwable) {
            false
        }
    }

    private fun startAlert(orderNo: String) {
        startForeground(NOTIF, buildNotification("NEW ORDER • $orderNo"))
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
                setOnErrorListener { _, _, _ -> stopAlertOnly(); true }
                setDataSource(AUDIO_URL)
                isLooping = true
                setOnPreparedListener { it.start() }
                prepareAsync()
            }
        } catch (_: Throwable) {
            stopAlertOnly()
        }
    }

    private fun acquireWakeLock() {
        if (wakeLock?.isHeld == true) return
        val pm = getSystemService(PowerManager::class.java)
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK, "JPTPartner:NewOrderAlert"
        ).apply {
            setReferenceCounted(false)
            acquire(10 * 60 * 1000L)
        }
    }

    private fun releaseWakeLock() {
        wakeLock?.let { if (it.isHeld) it.release() }
        wakeLock = null
    }

    private fun stopAlertOnly() {
        player?.stop()
        player?.release()
        player = null
        releaseWakeLock()
        startForeground(NOTIF, buildNotification("Monitoring for new orders"))
    }

    private fun stopAlertAndMonitoring() {
        // Accept/preparing/ready/out-for-delivery must stop only the ringtone.
        // Background NEW ORDER monitoring must remain alive for the next order.
        stopAlertOnly()
    }

    override fun onDestroy() {
        pollRunnable?.let { pollHandler?.removeCallbacks(it) }
        pollRunnable = null
        pollHandler = null
        player?.release()
        player = null
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
