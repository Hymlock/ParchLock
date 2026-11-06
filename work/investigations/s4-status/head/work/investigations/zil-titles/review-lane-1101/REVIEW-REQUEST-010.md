# REVIEW-REQUEST-010 - versionCode 50 -> 51 (grok)
Diff: REVIEW-010-vc51.patch, android/app/build.gradle line 11 only. versionName stays "2.0.0". Precedent 1d9a3130 (48->49).
Why: new APK carries A1 f7a01019, Z3 3f58ef00, Sorcerer dark d82276ba; Android must see it as an upgrade over vc50.