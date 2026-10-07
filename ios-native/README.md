# JPT Partner iOS Background Alarm

The current JPT Partner repository is a web/PWA codebase and has no native iOS target.

The requested Android behavior cannot be ported 1:1 to iOS. iOS controls background execution and notification audio. A production iOS implementation should use APNs/FCM notification categories and, where eligible, Apple's Critical Alerts entitlement and user authorization.

This repository does not add a fake iOS implementation that would appear to work only while the app is foregrounded.
