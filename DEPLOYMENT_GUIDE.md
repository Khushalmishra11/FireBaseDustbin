# 🚀 COMPLETE DEPLOYMENT GUIDE - Step by Step

## What We've Built For You

You now have a complete **real-time water level monitoring system** with:
1. ✅ **Cloud Functions** - Listens to database changes on Firebase
2. ✅ **Push Notifications** - Sends alerts to Android app
3. ✅ **Warning System** - 3-level alerts (Safe, Warning, Critical)
4. ✅ **Battery Efficient** - Cloud does the heavy lifting, not your phone
5. ✅ **Real-time Logs** - Tracks all notifications

---

## 📁 Files Created for You

```
FirebaseTableApp/
├── functions/                    ← Cloud Functions (NEW!)
│   ├── index.js                 ← Main backend service
│   ├── package.json             ← Dependencies
│   └── .gitignore
├── android/
│   └── app/
│       ├── build.gradle         ← UPDATED (added FCM)
│       └── src/main/
│           └── AndroidManifest.xml  ← UPDATED (added permissions)
├── App.js                        ← UPDATED (FCM handling)
├── package.json                  ← UPDATED (new dependencies)
├── .firebaserc                   ← Firebase config (NEW!)
├── firebase.json                 ← Firebase setup (NEW!)
├── database.rules.json           ← Database security (NEW!)
├── BACKEND_SETUP.md              ← Detailed backend docs (NEW!)
└── NODEMCU_CODE.ino              ← Example NodeMCU code (NEW!)
```

---

## ⚡ STEP 1: Setup Firebase Cloud Functions

### 1️⃣ Create a Firebase Project (if you don't have one)
- Go to [firebase.google.com](https://firebase.google.com)
- Click "Get Started"
- Create new project
- **IMPORTANT:** Select **Blaze Plan** (Cloud Functions requires it)
  - Blaze is pay-as-you-go, but very cheap for small projects

### 2️⃣ Get Your Firebase Project ID
- Go to Firebase Console → Settings ⚙️
- Copy your **Project ID** (looks like: `my-project-123456`)

### 3️⃣ Update `.firebaserc`
Edit the file at project root:
```json
{
  "projects": {
    "default": "YOUR_PROJECT_ID_HERE"
  }
}
```

### 4️⃣ Install Firebase CLI
```bash
npm install -g firebase-tools
```

### 5️⃣ Login to Firebase
```bash
firebase login
```
- Opens browser for authentication
- Approve the login

### 6️⃣ Deploy Cloud Functions
```bash
firebase deploy --only functions
```

**Expected output:**
```
✔ Deploy complete!

Function URLs (via HTTPS Trigger):
   registerFCMToken: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken
   monitorWaterLevel: database.googleapis.com/water_level
   cleanupOldNotifications: pubsub.googleapis.com (scheduled)
```

### 7️⃣ Copy the registerFCMToken URL
You'll need this in the next step!

---

## 📱 STEP 2: Update Android App

### 1️⃣ Update App.js with Cloud Function URL

Open `App.js` and find this line (around line 85):
```javascript
const response = await fetch(
  'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken',
```

Replace with your actual URL from Step 1.7:
```javascript
const response = await fetch(
  'https://us-central1-my-project-123456.cloudfunctions.net/registerFCMToken',
```

### 2️⃣ Set Your Device ID

Find this line in App.js (around line 73):
```javascript
const deviceId = 'dustbin_01';
```

Use the **same device ID** your NodeMCU will use!

### 3️⃣ Install NPM Dependencies
```bash
npm install
```

This installs:
- Firebase Messaging (for notifications)
- NetInfo (for network status)

### 4️⃣ Build & Run Android App
```bash
npm run android
```

Or manually:
```bash
npx react-native run-android
```

**What happens:**
- App requests notification permission
- Gets FCM token
- Registers token with Cloud Functions
- Ready to receive notifications! ✅

---

## 💾 STEP 3: Setup NodeMCU Code

### 1️⃣ Setup Arduino IDE
1. Install Arduino IDE from [arduino.cc](https://arduino.cc)
2. File → Preferences → Add this URL to "Board Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. Tools → Board Manager → Search "ESP32" → Install
4. Tools → Board → Select "ESP32 Dev Module"

### 2️⃣ Get Firebase Database URL

- Firebase Console → Realtime Database → Data
- Copy URL at top (looks like: `my-project-123456.firebaseio.com`)

### 3️⃣ Get Database Secret

- Firebase Console → Settings → Service Accounts
- Database Secrets → Copy your secret key

### 4️⃣ Edit NODEMCU_CODE.ino

Open `NODEMCU_CODE.ino` and fill in:

```cpp
// WiFi Credentials
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Credentials
#define FIREBASE_HOST "my-project-123456.firebaseio.com"
#define FIREBASE_AUTH "YOUR_DATABASE_SECRET"

// Tank Configuration
#define TANK_HEIGHT_CM 200        // Your tank height
#define DEVICE_ID "dustbin_01"    // Must match app device ID!
```

### 5️⃣ Upload to NodeMCU
1. Copy code to Arduino IDE
2. Tools → Port → Select your NodeMCU COM port
3. Sketch → Upload
4. Check Serial Monitor (115200 baud) for status

**Expected output:**
```
✓ WiFi connected!
IP: 192.168.1.100
✓ Firebase initialized!
Distance: 50 cm | Water Level: 75%
✓ Data sent to Firebase
```

---

## ✅ STEP 4: Test the Complete System

### Test 1: Manual Database Update
```bash
firebase database:set /water_level/dustbin_01/current_level 50
firebase database:set /water_level/dustbin_01/current_level 75  # Should trigger notification!
```

**Check Android:**
- Should see alert with "Water Level - WARNING"

### Test 2: Watch Cloud Function Logs
```bash
firebase functions:log
```

Keep this running to see real-time logs when notifications send.

### Test 3: Real NodeMCU Data
1. NodeMCU running and sending data
2. Update water level in tank
3. Watch Android app receive notifications in real-time

---

## 🎯 Expected Database Structure

After deployment, your database should look like:

```
root/
├── water_level/
│   └── dustbin_01/
│       ├── current_level: 75
│       ├── last_updated: 1706000000000
│       └── settings/
│           ├── critical_level: 80
│           ├── warning_level: 60
│           └── safe_level: 40
│
├── user_devices/
│   └── dustbin_01/
│       └── fcm_tokens/
│           └── token_XXXX: {token: "abc123...", userId: "user123"}
│
└── notifications_log/
    └── dustbin_01/
        └── 1706000000001: {status: "WARNING", level: 75}
```

---

## 🚨 Warning Levels Explained

| Level | Status | Color | Action |
|-------|--------|-------|--------|
| 0-40% | SAFE | 🟢 Green | Normal operation |
| 40-60% | WARNING | 🟠 Orange | Tank filling |
| 60-80% | WARNING | 🟠 Orange | Getting full |
| 80-100% | CRITICAL | 🔴 Red | Tank almost full! |

**Customization:**
Edit in Firebase Console:
```
/water_level/dustbin_01/settings/
├── safe_level: 40
├── warning_level: 60
└── critical_level: 80
```

---

## 📊 How Notifications Are Triggered

```
User updates tank water level
         ↓
NodeMCU reads ultrasonic sensor
         ↓
Sends: PUT /water_level/dustbin_01/current_level = 75
         ↓
Firebase detects change
         ↓
Cloud Function monitorWaterLevel triggered
         ↓
Compares: 75% > 60% (warning level)?
         ↓
YES → Fetch FCM tokens → Send notification
         ↓
Android app receives notification
         ↓
User sees alert: "Water Level - WARNING, Level: 75%"
```

---

## 🔍 Troubleshooting Checklist

### ❌ Cloud Functions won't deploy?
```bash
# Make sure Node.js 18+
node --version

# Update firebase-tools
npm install -g firebase-tools@latest

# Deploy again
firebase deploy --only functions
```

### ❌ Android app not receiving notifications?
1. Check notification permission is granted
2. Verify FCM token is registered:
   ```bash
   firebase database:get /user_devices/dustbin_01/fcm_tokens
   ```
3. Check logs:
   ```bash
   adb logcat | grep Firebase
   ```

### ❌ NodeMCU not sending data?
1. Check WiFi connection (Serial Monitor should show IP)
2. Verify Firebase credentials are correct
3. Check ultrasonic sensor wiring
4. Use Firebase Console → Realtime Database to see if data appears

### ❌ Notifications not showing despite valid data?
1. Check Cloud Function logs: `firebase functions:log`
2. Verify database rules allow reads
3. Ensure DEVICE_ID matches (app vs NodeMCU)

---

## 📞 Useful Commands

```bash
# View Cloud Function logs
firebase functions:log

# Deploy only functions
firebase deploy --only functions

# Deploy only database rules
firebase deploy --only database

# View database content
firebase database:get /

# Update single value
firebase database:set /water_level/dustbin_01/current_level 50

# Remove data
firebase database:remove /water_level/dustbin_01

# Start local emulator
firebase emulators:start

# SSH into device
adb shell

# Check Android notifications
adb logcat | grep -i notification
```

---

## 🎉 Success Indicators

✅ **You know it's working when:**

1. Firebase deploys successfully
2. Android app shows "Notification permission" alert
3. Water level appears in Firebase Console
4. Changing level → notification appears on Android
5. Cloud Function logs show "Notification sent successfully"
6. Water level above 80% → "CRITICAL" notification
7. Water level below 40% → "SAFE" notification

---

## 📈 Next Steps (Optional Enhancements)

1. **Multiple Devices:** Add more device IDs
2. **User Accounts:** Implement authentication
3. **Email Alerts:** Send emails via SendGrid
4. **Mobile App UI:** Add notification history page
5. **Analytics:** Track water usage patterns
6. **Mobile App UI:** Show real-time graph of water level

---

## 📝 Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| Cloud Functions | `/functions/index.js` | Backend service |
| Android Notifications | `App.js` (FCM setup) | Handles push notifications |
| NodeMCU Code | `NODEMCU_CODE.ino` | Sends sensor data |
| Database Config | `firebase.json` | Firebase settings |
| Database Rules | `database.rules.json` | Access control |
| Backend Docs | `BACKEND_SETUP.md` | Detailed guide |

---

## 🎓 Learning Resources

- [Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase Realtime Database](https://firebase.google.com/docs/database)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [React Native Firebase](https://rnfirebase.io/)
- [NodeMCU ESP32 Guide](https://randomnerdtutorials.com/esp32-firebase/)

---

**Status: ✅ READY TO DEPLOY**

All files are created and configured. Follow steps 1-4 above to get your system running!

Questions? Check the troubleshooting section or review `BACKEND_SETUP.md` for more details.

**Last Updated:** February 2026
