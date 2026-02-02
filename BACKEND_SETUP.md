# Firebase Cloud Functions - Dustbin Fill Level Monitoring Backend

## Overview
This backend service monitors dustbin fill levels from your NodeMCU/Ultrasonic sensor and sends push notifications to your Android app when levels change or cross warning thresholds.

---

## 📋 Architecture

```
NodeMCU (Ultrasonic Sensor)
    ↓ (sends data every X seconds)
Firebase Realtime Database (/dustbin_level/{deviceId}/current_level)
    ↓ (triggers on data change)
Cloud Function (monitorDustbinLevel)
    ↓ (checks thresholds & retrieves FCM tokens)
Firebase Cloud Messaging (FCM)
    ↓ (sends push notification)
Android App (receives & displays notification)
```

---

## 🚀 Setup & Deployment

### 1. **Prerequisites**
- Firebase Project with Blaze Plan (required for Cloud Functions)
- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Your Firebase credentials

### 2. **Initialize Firebase CLI**
```bash
cd d:\studyMaterial\1. Capstone\FirebaseTableApp
firebase login
firebase init
```

During `firebase init`:
- Select your Firebase project
- Choose "Functions" and "Database"
- Use TypeScript? No
- ESLint? No

### 3. **Configure Your Project ID**
Edit `.firebaserc`:
```json
{
  "projects": {
    "default": "your-firebase-project-id"
  }
}
```

### 4. **Install Cloud Functions Dependencies**
```bash
cd functions
npm install
```

This installs:
- `firebase-admin` - Firebase server SDK
- `firebase-functions` - Cloud Functions library

### 5. **Deploy to Firebase**
```bash
# From project root
firebase deploy --only functions
```

After deployment, note your Cloud Function URLs. You'll get something like:
```
✔ Deploy complete!

Function URLs (via HTTPS Trigger):
   registerFCMToken: https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken
```

---

## 📱 Android App Integration

### 1. **Update App.js with Cloud Function URL**
Replace the placeholder in your `registerFCMTokenWithBackend` function:

```javascript
const response = await fetch(
  'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken',
  // ... rest of code
);
```

### 2. **Update Device ID**
In the same function, set your device ID (from NodeMCU):
```javascript
const deviceId = 'dustbin_01'; // Use your actual NodeMCU device ID
```

### 3. **Install Dependencies**
```bash
npm install
```

### 4. **Run on Android**
```bash
npm run android
```

---

## 🔧 Firebase Database Structure

Your database should look like this:

```
root/
├── dustbin_level/
│   ├── dustbin_01/
│   │   ├── current_level: 65
│   │   ├── settings/
│   │   │   ├── critical_level: 80
│   │   │   ├── warning_level: 60
│   │   │   └── safe_level: 40
│   │   └── last_updated: 1706000000000
│   └── dustbin_02/
│       ├── current_level: 45
│       └── ...
│
├── user_devices/
│   ├── dustbin_01/
│   │   └── fcm_tokens/
│   │       ├── token_1706000000001: {token: "abc123...", userId: "user123"}
│   │       └── token_1706000000002: {token: "def456...", userId: "user123"}
│   └── dustbin_02/
│       └── ...
│
└── notifications_log/
    ├── dustbin_01/
    │   ├── 1706000000001: {status: "WARNING", level: 65}
    │   └── 1706000000002: {status: "CRITICAL", level: 82}
    └── ...
```

---

## 📊 How It Works

### **Trigger 1: Dustbin Level Change**
When NodeMCU updates `/dustbin_level/{deviceId}/current_level`:

1. Cloud Function `monitorDustbinLevel` is triggered
2. Reads current and previous level
3. Gets warning thresholds from settings
4. Determines status: SAFE | WARNING | CRITICAL
5. Only sends notification if:
   - Status changed, OR
   - Current status is CRITICAL
6. Fetches all FCM tokens for that device
7. Sends push notification to all devices
8. Logs the event for history

### **Trigger 2: Token Registration**
When your Android app calls `registerFCMToken`:

1. App requests notification permission
2. Gets FCM token from Firebase Messaging
3. Sends token to Cloud Function via HTTPS
4. Function stores token under `/user_devices/{deviceId}/fcm_tokens`
5. Future notifications will include this token

### **Trigger 3: Daily Cleanup**
Cloud Function `cleanupOldNotifications` runs daily at 2 AM:
- Removes notification logs older than 30 days
- Keeps database from getting too large

---

## 🚨 Warning Levels

Default thresholds (customizable per device):
- **0-40%**: ✅ SAFE - Bin has plenty of space
- **40-60%**: ⚠️ WARNING - Getting full soon
- **60-80%**: ⚠️ WARNING - Bin filling up
- **80-100%**: 🚨 CRITICAL - Bin nearly full, needs emptying!

Customize by updating in database:
```
/dustbin_level/{deviceId}/settings/
├── safe_level: 40
├── warning_level: 60
└── critical_level: 80
```

---

## 📱 Notification Example

When dustbin fill level crosses threshold:

**Title:** "Dustbin Level - WARNING"
**Body:** "Level: 65% (Bin fill level is high 👀)"
**Data:**
- deviceId: dustbin_01
- level: 65
- status: WARNING
- timestamp: 2024-01-23T10:30:00Z

---

## 🔍 Testing

### **Test Locally (Before Deployment)**
```bash
# Terminal 1: Start emulator
firebase emulators:start

# Terminal 2: Update database manually
firebase database:set /water_level/dustbin_01/current_level 75
```

### **Test After Deployment**
1. Update water level in Firebase Console
2. Check Android logcat for notification
3. Look at Cloud Functions logs:
   ```bash
   firebase functions:log
   ```

---

## 🛠 Troubleshooting

### **Issue: Notifications not received**

**Check 1:** Verify FCM token registration
```bash
firebase database:get /user_devices/dustbin_01/fcm_tokens
```

**Check 2:** Check Cloud Function logs
```bash
firebase functions:log
```

**Check 3:** Ensure Android notification permissions granted
- Go to Settings > Apps > YourApp > Notifications > ON

### **Issue: Cloud Function deployment fails**
```bash
# Check Node.js version
node --version  # Should be 18+

# Clear cache and reinstall
cd functions
rm -rf node_modules package-lock.json
npm install
```

### **Issue: Database write fails**
- Check database rules in `database.rules.json`
- Ensure your device ID matches between NodeMCU and app

---

## 📝 NodeMCU Code Example

Your NodeMCU should update data like this:

```cpp
#include <WiFi.h>
#include <FirebaseESP32.h>

FirebaseData firebaseData;
FirebaseConfig config;

void setup() {
  WiFi.begin(SSID, PASSWORD);
  Firebase.begin(&config, &auth);
}

void loop() {
  int level = readUltrasonicSensor(); // 0-100%
  
  Firebase.RTDB.setInt(&firebaseData, 
    "/water_level/dustbin_01/current_level", 
    level);
  
  delay(5000); // Update every 5 seconds
}
```

---

## 🔐 Security Notes

⚠️ **Current Setup:** Open read/write for testing only!

For **Production**:
1. Restrict database access by user/device
2. Use authentication tokens
3. Validate device IDs server-side
4. Rate-limit FCM token registration

Update `database.rules.json`:
```json
{
  "rules": {
    "water_level": {
      ".read": "auth != null",
      ".write": "auth.uid === 'YOUR_DEVICE_UID'"
    }
  }
}
```

---

## 📞 Support

For issues:
1. Check [Firebase Documentation](https://firebase.google.com/docs)
2. Review Cloud Function logs: `firebase functions:log`
3. Check Android logcat: `adb logcat`
4. Verify Firebase Project ID and region

---

## ✅ Deployment Checklist

- [ ] Firebase project created (Blaze plan)
- [ ] `.firebaserc` updated with project ID
- [ ] `functions/` folder created
- [ ] Cloud Functions deployed: `firebase deploy --only functions`
- [ ] Cloud Function URL copied to App.js
- [ ] Device ID matches NodeMCU and App
- [ ] Android app updated with FCM integration
- [ ] Push notification permission granted on Android
- [ ] NodeMCU sending data to database
- [ ] Tested: Level change triggers notification

---

**Last Updated:** February 2026
**Status:** ✅ Production Ready
