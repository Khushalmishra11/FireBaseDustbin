# Firebase Dustbin Monitoring System

Real-time Android app with Node.js backend server for monitoring dustbin fill levels using NodeMCU sensors, Firebase Realtime Database, and Push Notifications.

---

## 📋 System Overview

- **Frontend**: React Native (Android)
- **Backend**: Node.js server (Firebase Admin SDK)
- **Database**: Firebase Realtime Database
- **Notifications**: Firebase Cloud Messaging (FCM)
- **Hardware**: NodeMCU ESP8266 with Ultrasonic Sensor

---

## 🔧 Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Java Development Kit (JDK 17)**
   - Download: https://www.microsoft.com/openjdk
   - Set `JAVA_HOME` environment variable

3. **Android Studio**
   - Download: https://developer.android.com/studio
   - Install Android SDK (API Level 34+)
   - Create Android Virtual Device (AVD) or connect physical device

4. **Git** (optional but recommended)
   - Download: https://git-scm.com/

### Firebase Setup

1. Create Firebase project at https://console.firebase.google.com
2. Enable **Realtime Database**
3. Enable **Cloud Messaging**
4. Download `google-services.json` and place in `/android/app/`
5. Download **Service Account Key**:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in project root

---

## 📥 Installation Steps

### 1. Clone/Download Project

```bash
cd "d:\studyMaterial\1. Capstone\FirebaseTableApp"
```

### 2. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure Firebase

#### A. Add google-services.json
Place your Firebase `google-services.json` file in:
```
android/app/google-services.json
```

#### B. Add Service Account Key
Place your service account JSON file as:
```
serviceAccountKey.json
```

#### C. Update Firebase Project ID
Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

---

## 🚀 Running the Application

### Method 1: Run Everything (Recommended)

Open **3 separate PowerShell terminals**:

#### Terminal 1: Metro Bundler
```powershell
cd "d:\studyMaterial\1. Capstone\FirebaseTableApp"
npm start
```

#### Terminal 2: Backend Server
```powershell
cd "d:\studyMaterial\1. Capstone\FirebaseTableApp"
$env:FIREBASE_DATABASE_URL = "https://your-project-id-default-rtdb.firebaseio.com"
node server.js
```
Replace `your-project-id` with your actual Firebase project ID.

#### Terminal 3: Android App
```powershell
cd "d:\studyMaterial\1. Capstone\FirebaseTableApp"
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
npx react-native run-android
```

Adjust `JAVA_HOME` path to match your JDK installation.

### Method 2: Run Individual Components

#### Metro Bundler Only
```powershell
npm start
```

#### Backend Server Only
```powershell
$env:FIREBASE_DATABASE_URL = "https://your-project-id-default-rtdb.firebaseio.com"
node server.js
```

#### Android App Only (Metro must be running)
```powershell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
npx react-native run-android
```

---

## 🗄️ Firebase Database Structure

```json
{
  "dustbins": {
    "bin1": {
      "level": 95
    },
    "bin2": {
      "level": 9
    }
  },
  "fcmToken": "cM7axQBbRL6PYaUIZ6CxBc...",
  "lastNotified": {
    "bin1": "NONE",
    "bin2": "FULL"
  }
}
```

### Structure Details

- **`/dustbins/{dustbinId}/level`**: Number (0-100) - sensor reading
- **`/fcmToken`**: String - Android device FCM token (auto-set by app)
- **`/lastNotified/{dustbinId}`**: String - Last notification state

---

## 📱 Notification Logic

### States

- **FULL**: `level ≤ 10` → Sends "Dustbin Full 🚮"
- **ABOUT_TO_FULL**: `level ≤ 20` → Sends "Dustbin Almost Full ⚠️"
- **NONE**: `level > 20` → No notification

### Rules

- Notifications sent **only when state changes**
- Prevents duplicate/spam notifications
- Server logs all state transitions

---

## 🔌 NodeMCU Hardware Setup

### Required Components

- NodeMCU ESP8266
- HC-SR04 Ultrasonic Sensor
- Jumper wires

### Connections

| Sensor Pin | NodeMCU Pin |
|------------|-------------|
| VCC        | 3.3V        |
| GND        | GND         |
| TRIG       | D1 (GPIO5)  |
| ECHO       | D2 (GPIO4)  |

### Upload Code

1. Open `NODEMCU_CODE.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   #define WIFI_SSID "YourWiFiName"
   #define WIFI_PASSWORD "YourWiFiPassword"
   ```
3. Update Firebase details:
   ```cpp
   #define FIREBASE_HOST "your-project-id-default-rtdb.firebaseio.com"
   #define FIREBASE_AUTH "your-database-secret"
   ```
4. Select Board: NodeMCU 1.0 (ESP-12E Module)
5. Upload to NodeMCU

---

## 🐛 Troubleshooting

### Android Build Fails

```powershell
# Clean build
cd android
.\gradlew clean
cd ..

# Rebuild
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
npx react-native run-android
```

### Metro Bundler Port Conflict

```powershell
# Kill existing Metro process
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restart
npm start
```

### Backend Server Not Running

```powershell
# Stop all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restart server
$env:FIREBASE_DATABASE_URL = "https://your-project-id-default-rtdb.firebaseio.com"
node server.js
```

### No Notifications Received

1. **Check FCM Token**:
   - Open app on Android
   - Look for "✓ Notifications Enabled" banner
   - Check Firebase Console: `/fcmToken` should exist

2. **Check Server Logs**:
   - Server should log: `✓ Notification sent for bin1: FULL`
   - If no logs, server may not be running

3. **Check Notification Permission**:
   - Android Settings → Apps → FirebaseTableApp → Notifications → Enable

4. **Test Manually**:
   - Change `/dustbins/bin1/level` from 50 → 8 in Firebase Console
   - Should trigger FULL notification

### Firebase Permission Denied

Update Realtime Database Rules (for development):
```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

⚠️ **Note**: Use proper authentication rules in production.

---

## 📁 Project Structure

```
FirebaseTableApp/
├── android/                  # Android native code
│   └── app/
│       └── google-services.json
├── functions/                # Firebase Cloud Functions (optional)
│   └── index.js
├── ios/                      # iOS native code (unused)
├── node_modules/             # Dependencies
├── App.js                    # Main React Native app
├── server.js                 # Node.js backend server
├── serviceAccountKey.json    # Firebase admin credentials (DO NOT COMMIT)
├── package.json              # Dependencies
├── firebase.json             # Firebase config
├── .firebaserc               # Firebase project
├── NODEMCU_CODE.ino          # NodeMCU firmware
└── README.md                 # This file
```

---

## 🔐 Security Notes

**DO NOT COMMIT** these files to Git:
- `serviceAccountKey.json`
- `google-services.json`
- `node_modules/`

Add to `.gitignore`:
```
serviceAccountKey.json
android/app/google-services.json
node_modules/
```

---

## 📊 Testing the System

### 1. Start All Services

Ensure Metro, Backend Server, and Android App are running.

### 2. Simulate Sensor Data

In Firebase Console, manually update:
```
/dustbins/bin1/level = 50  (NONE - no notification)
/dustbins/bin1/level = 15  (ABOUT_TO_FULL - sends notification)
/dustbins/bin1/level = 8   (FULL - sends notification)
```

### 3. Verify Notifications

- **App Open**: Alert popup appears
- **App Closed**: Notification in Android notification center
- **Server Logs**: Shows notification sent

---

## 🛠️ Useful Commands

### Clean Install
```powershell
Remove-Item node_modules -Recurse -Force
Remove-Item package-lock.json -Force
npm install --legacy-peer-deps
```

### Restart Everything
```powershell
# Kill all Node processes
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Restart Metro
npm start

# New terminal - Restart Server
$env:FIREBASE_DATABASE_URL = "https://your-project-id-default-rtdb.firebaseio.com"
node server.js

# New terminal - Restart App
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.18.8-hotspot"
npx react-native run-android
```

### Check Running Processes
```powershell
Get-Process node
```

### View Android Logs
```powershell
adb logcat | Select-String "FirebaseTableApp"
```

---

## 📞 Support

For issues or questions, check:
1. Firebase Console → Realtime Database (verify data structure)
2. Server terminal logs (check for errors)
3. Metro bundler terminal (check for build errors)
4. Android Logcat (check for runtime errors)

---

## 📝 License

This project is for educational/capstone purposes.

---

**Version**: 1.0.0  
**Last Updated**: February 2026
