package com.jeetpunjabitadka.partner

import android.app.*
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import java.io.File

class OrderAlertService : Service() {
    companion object { const val START = "JPT_START_ORDER_ALERT"; const val STOP = "JPT_STOP_ORDER_ALERT"; private const val CHANNEL = "jpt_new_order"; private const val NOTIF = 7001
        private const val AUDIO_URL = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/1000449570.mp4"
    }
    private var player: MediaPlayer? = null

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
        return START_STICKY
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
        if (player?.isPlaying == true) return
        try {
            player?.release()
            player = MediaPlayer().apply {
                setAudioAttributes(AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
                setDataSource(AUDIO_URL)
                isLooping = true
                setOnPreparedListener { it.start() }
                prepareAsync()
            }
        } catch (_: Throwable) {}
    }

    private fun stopAlert() {
        player?.stop(); player?.release(); player = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() { player?.release(); player = null; super.onDestroy() }
    override fun onBind(intent: Intent?): IBinder? = null
}
