package com.jeetpunjabitadka.partner.nativev1

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class OrderAlertService : Service() {
    companion object {
        const val START = "JPT_START_ORDER_ALERT"
        const val STOP = "JPT_STOP_ORDER_ALERT"
        private const val CHANNEL = "jpt_new_order"
        private const val NOTIF = 7001
        private const val AUDIO_URL = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/1000449570.mp4"
    }

    private var player: MediaPlayer? = null
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate() {
        super.onCreate()
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

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            STOP -> stopAlert()
            START -> startAlert(intent.getStringExtra("order_no") ?: "New order")
        }
        return START_NOT_STICKY
    }

    private fun startAlert(orderNo: String) {
        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle("New Order")
            .setContentText(orderNo)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .build()
        startForeground(NOTIF, notification)
        acquireWakeLock()
        if (player?.isPlaying == true) return
        try {
            player?.release()
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
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
        player?.stop()
        player?.release()
        player = null
        releaseWakeLock()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        player?.release()
        player = null
        releaseWakeLock()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
