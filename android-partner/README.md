# JPT Partner Native Android Alarm

This folder is a native Android foreground-service foundation for the existing JPT Partner PWA.

Production flow:
1. FCM sends an Android data-only, high-priority message with event_type=order.created, order_id, outlet_id and order_no.
2. JPTFirebaseMessagingService receives it while the app is backgrounded.
3. A short PARTIAL_WAKE_LOCK is acquired.
4. OrderAlarmService becomes a foreground mediaPlayback service.
5. A persistent high-priority notification is displayed.
6. MediaPlayer loops the JPT order ringtone.
7. Opening the notification stops the native alarm.
8. The existing partner web runtime calls AndroidOrderAlarm.stopAlarm on ACCEPT/REJECT.

Required before release:
- Add app/google-services.json.
- Replace BuildConfig.PARTNER_WEB_URL with the current production Partner Dashboard URL.
- Prefer packaging the verified JPT ringtone as app/src/main/res/raw/ringtone.mp4.
- Register native FCM tokens against the authenticated partner/outlet backend.
- Configure the server to send FCM HTTP v1 data-only Android HIGH priority messages.

No Firebase service-account key is stored in this repository.

Audio focus cannot guarantee bypassing every device-level Do Not Disturb or silent policy; device/OEM policy can still affect playback.

iOS note: Android-style continuous arbitrary looping audio from a terminated app is not a generally available iOS capability. Production iOS should use APNs/FCM notification behavior and, if the business qualifies, Apple's Critical Alerts entitlement and authorization.
