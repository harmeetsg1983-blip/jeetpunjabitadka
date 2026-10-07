package com.jeetpunjabitadka.partner

import android.app.*
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import androidx.core.content.ContextCompat

class OrderAlarmService : Service() {
    companion object {
        const val ACTION_START = "com.jeetpunjabitadka.partner.START_ALARM"
        const val ACTION_STOP = "com.jeetpunjabitadka.partner.STOP_ALARM"
        const val EXTRA_ORDER_ID = "order_id"
        const val EXTRA_OUTLET_ID = "outlet_id"
        const val EXTRA_ORDER_NO = "order_no"
        private const val CHANNEL_ID = "jpt_new_orders_alarm_v1"
        private const val NOTIFICATION_ID = 9101

        fun start(context: Context, orderId: String, outletId: String, orderNo: String) {
            val i = Intent(context, OrderAlarmService::class.java).apply {
                action = ACTION_START
                putExtra(EXTRA_ORDER_ID, orderId)
                putExtra(EXTRA_OUTLET_ID, outletId)
                putExtra(EXTRA_ORDER_NO, orderNo)
            }
            ContextCompat.startForegroundService(context, i)
        }

        fun stop(context: Context, orderId: String? = null) {
            context.startService(Intent(context, OrderAlarmService::class.java).apply {
                action = ACTION_STOP
                if (orderId != null) putExtra(EXTRA_ORDER_ID, orderId)
            })
        }
    }

    private var player: MediaPlayer? = null
    private var focusRequest: AudioFocusRequest? = null
    private var audioManager: AudioManager? = null

    override fun onCreate() {
        super.onCreate()
        createChannel()
        audioManager = getSystemService(AudioManager::class.java)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val id = intent.getStringExtra(EXTRA_ORDER_ID).orEmpty()
                val outlet = intent.getStringExtra(EXTRA_OUTLET_ID).orEmpty()
                val orderNo = intent.getStringExtra(EXTRA_ORDER_NO).orEmpty().ifBlank { id }
                startForegroundNow(id, outlet, orderNo)
                startAlarm()
            }
            ACTION_STOP -> stopAlarm()
        }
        return START_STICKY
    }

    private fun startForegroundNow(orderId: String, outletId: String, orderNo: String) {
        val open = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_ORDER_ID, orderId)
            putExtra(EXTRA_OUTLET_ID, outletId)
        }
        val pending = PendingIntent.getActivity(
            this, orderId.hashCode(), open,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_alert)
            .setContentTitle("New Order Received")
            .setContentText("Order #$orderNo • $outletId • Tap to View")
            .setContentIntent(pending)
            .setOngoing(true)
            .setAutoCancel(false)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_CALL)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()

        ServiceCompat.startForeground(
            this, NOTIFICATION_ID, notification,
            android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK
        )
    }

    private fun startAlarm() {
        player?.release()
        player = MediaPlayer()
        player!!.setAudioAttributes(
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()
        )
        player!!.isLooping = true
        player!!.setVolume(1f, 1f)

        val ringtoneUrl = "https://raw.githubusercontent.com/harmeetsg1983-blip/jeetpunjabitadka/main/ringtones/1000449570.mp4"
        player!!.setDataSource(this, Uri.parse(ringtoneUrl))
        player!!.setOnPreparedListener {
            requestAudioFocus()
            it.start()
        }
        player!!.setOnErrorListener { _, _, _ -> true }
        player!!.prepareAsync()
    }

    private fun requestAudioFocus() {
        val am = audioManager ?: return
        if (Build.VERSION.SDK_INT >= 26) {
            val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAcceptsDelayedFocusGain(false)
                .build()
            focusRequest = req
            am.requestAudioFocus(req)
        } else {
            @Suppress("DEPRECATION")
            am.requestAudioFocus(null, AudioManager.STREAM_ALARM, AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
        }
    }

    private fun stopAlarm() {
        try { player?.stop() } catch (_: Exception) {}
        player?.release()
        player = null
        focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
        focusRequest = null
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            val channel = NotificationChannel(
                CHANNEL_ID, "JPT New Order Alarm", NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Persistent new-order alarm"
                setSound(null, null)
                enableVibration(true)
                lockscreenVisibility = Notification.VISIBILITY_PUBLIC
            }
            getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
