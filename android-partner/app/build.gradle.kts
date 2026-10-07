plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services")
}

android {
    namespace = "com.jeetpunjabitadka.partner"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.jeetpunjabitadka.partner"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "PARTNER_WEB_URL", ""https://REPLACE-WITH-CURRENT-JPT-PARTNER-URL/admin.html"")
    }
    buildFeatures { buildConfig = true }
}

dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.10.1")
    implementation("androidx.webkit:webkit:1.12.1")
    implementation(platform("com.google.firebase:firebase-bom:34.4.0"))
    implementation("com.google.firebase:firebase-messaging")
}
