package com.jeetpunjabitadka.partner

import android.os.PowerManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class JPTFirebaseMessagingService : FirebaseMessagingService() {
    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        if (data["event_type"] != "order.created") return

        val orderId = data["order_id"].orEmpty()
        val outletId = data["outlet_id"].orEmpty()
        val orderNo = data["order_no"].orEmpty().ifBlank { orderId }
        if (orderId.isBlank() || outletId.isBlank()) return

        val pm = getSystemService(POWER_SERVICE) as PowerManager
        val lock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "JPT:OrderAlarmWakeLock")
        lock.acquire(10_000L)
        try {
            OrderAlarmService.start(this, orderId, outletId, orderNo)
        } finally {
            if (lock.isHeld) lock.release()
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences("jpt_fcm", MODE_PRIVATE)
            .edit().putString("token", token).apply()
    }
}
