# JPT Native Partner V1

This is a recovery-track native Android shell for the existing Partner Dashboard. It preserves the existing web dashboard and adds a native Android foreground-service alert path.

Current scope:
- Existing Partner Dashboard remains the UI/data layer.
- Native Android notification permission is requested.
- Native foreground service owns continuous NEW ORDER playback.
- The service downloads the existing exact NEW ORDER MP4 from the repository and loops its AAC audio track.
- JavaScript bridge: JPTNativeAlert.start(orderNo) / stop().
- This branch is intentionally separate from main until the Android build and real-device test pass.

Important production gate:
- Background/locked delivery still requires a verified event source (FCM or a proven native realtime/polling service) and real-device testing.
- Do not mark production GREEN from source inspection alone.
