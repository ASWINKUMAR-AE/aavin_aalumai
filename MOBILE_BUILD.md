# Mobile Application Build Guide

## 1. Prerequisites
- Flutter SDK 3.47+
- Android Studio / Android SDK (Platform 34, Build Tools 34.0.0)
- Java 17+

## 2. Dependencies & Build
```bash
cd mobile
flutter pub get
```

### Run on Connected Android Device
```bash
flutter run -d <device_id>
```

### Build Production APK
```bash
flutter build apk --release --split-per-abi
```
Generated APKs:
`build/app/outputs/flutter-apk/app-arm64-v8a-release.apk`
