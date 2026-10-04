plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.jeetpunjabitadka.partner.nativev1"
    compileSdk = 35
    buildFeatures {
        buildConfig = true
    }
    defaultConfig {
        applicationId = "com.jeetpunjabitadka.partner.nativev1"
        minSdk = 26
        targetSdk = 35
        versionCode = 3
        versionName = "1.0.2-native-v1"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    signingConfigs {
        create("ciDebug") {
            storeFile = rootProject.file("ci-debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    val releaseKeystorePath = System.getenv("JPT_RELEASE_KEYSTORE_PATH")
    val releaseKeystorePassword = System.getenv("JPT_RELEASE_KEYSTORE_PASSWORD")
    val releaseKeyAlias = System.getenv("JPT_RELEASE_KEY_ALIAS")
    val releaseKeyPassword = System.getenv("JPT_RELEASE_KEY_PASSWORD")
    val hasReleaseSigning = listOf(
        releaseKeystorePath, releaseKeystorePassword, releaseKeyAlias, releaseKeyPassword
    ).all { !it.isNullOrBlank() }

    if (hasReleaseSigning) {
        signingConfigs.create("productionRelease") {
            storeFile = file(releaseKeystorePath!!)
            storePassword = releaseKeystorePassword
            keyAlias = releaseKeyAlias
            keyPassword = releaseKeyPassword
        }
    }

    buildTypes {
        getByName("debug") {
            signingConfig = signingConfigs.getByName("ciDebug")
        }
        getByName("release") {
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("productionRelease")
            }
            isMinifyEnabled = false
        }
    }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.webkit:webkit:1.12.1")
}
