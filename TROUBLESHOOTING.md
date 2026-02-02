# 🔧 TROUBLESHOOTING GUIDE

## Common Issues & Solutions

---

## ❌ **Cloud Functions Won't Deploy**

### Issue: `Error: Authentication required`

**Solution:**
```bash
firebase login
# Follow browser login
firebase deploy --only functions
```

---

### Issue: `Error: Insufficient permissions`

**Problem:** You don't have Blaze plan

**Solution:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Project → Upgrade to Blaze plan
3. Try deploy again

---

### Issue: `Error: Node version too old`

**Solution:**
```bash
# Check version
node --version

# If < 18, update Node.js from nodejs.org
# Then try again
firebase deploy --only functions
```

---

### Issue: `Error: Cannot find module 'firebase-admin'`

**Solution:**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

---

## 📱 **Android App Issues**

### Issue: App crashes on startup

**Check logcat:**
```bash
adb logcat | grep -i crash
```

**Most common causes:**
1. Missing import statement
2. Typo in App.js
3. Missing permission in AndroidManifest.xml

**Solution:**
- Verify imports at top of App.js
- Check for red squiggly lines
- Build → Clean Project
- Run again

---

### Issue: No notification permission prompt

**Solution:**
1. Go to Settings → Apps → Your App → Permissions
2. Find "Notifications" → Toggle ON
3. Restart app

---

### Issue: Notifications received but not displayed

**Problem:** App might need Android 13+ permission

**Solution:**
```xml
<!-- Add to AndroidManifest.xml -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

---

### Issue: FCM token not registered

**Check:**
```bash
firebase database:get /user_devices/dustbin_01/fcm_tokens
```

**Should show tokens.** If empty:
1. Check App.js Cloud Function URL is correct
2. Run: `firebase functions:log` to see errors
3. Make sure you allowed notification permission

---

## 🔌 **NodeMCU Issues**

### Issue: `WiFi: Failed to connect`

**Check:**
1. WiFi SSID is correct (case-sensitive)
2. WiFi password is correct
3. NodeMCU is within range
4. Your WiFi isn't using 5GHz (use 2.4GHz)

**Solution:**
```cpp
// Check in Arduino IDE Serial Monitor
// Should show: "✓ WiFi connected! IP: 192.168.x.x"
```

---

### Issue: `Firebase connection failed`

**Check:**
1. FIREBASE_HOST is correct (ends with `.firebaseio.com`)
2. FIREBASE_AUTH (database secret) is correct
3. Database exists in Firebase Console
4. WiFi is working

**Solution:**
```cpp
// Debug - add to NodeMCU code:
Serial.println("Host: " + String(FIREBASE_HOST));
Serial.println("Auth: " + String(FIREBASE_AUTH));
```

---

### Issue: Sensor reads 0 cm always

**Problem:** Wiring incorrect or no sensor detected

**Check:**
1. Trigger pin: GPIO 4 (D2)
2. Echo pin: GPIO 5 (D1)
3. Power pins: GND and 5V
4. Sensor is 2-400 cm from object

**Solution:**
```cpp
#define TRIGGER_PIN 4   // Verify these
#define ECHO_PIN 5      // match your wiring
```

---

### Issue: Erratic sensor readings

**Solutions:**
1. Add 100µF capacitor between sensor pins
2. Increase delay between readings:
   ```cpp
   delay(10000); // Was 5000, now 10 seconds
   ```
3. Position sensor directly above water
4. Remove obstacles

---

## 🗄️ **Firebase Database Issues**

### Issue: Data not appearing in database

**Check:**
1. NodeMCU shows "✓ Data sent to Firebase"
2. Go to [Firebase Console](https://console.firebase.google.com)
3. Realtime Database → Look for `/water_level`

**If still empty:**
```bash
# Check from terminal
firebase database:get /water_level

# Should show data. If not, check database rules:
firebase database:get /

# Should show existing nodes like dustbins, etc.
```

---

### Issue: `Permission denied` on database write

**Problem:** Database rules too restrictive

**Solution:**
Edit `database.rules.json`:
```json
{
  "rules": {
    "water_level": {
      ".read": true,
      ".write": true
    }
  }
}
```

Then deploy:
```bash
firebase deploy --only database
```

---

## 🔔 **Notification Issues**

### Issue: Cloud Function triggered but no notification sent

**Check logs:**
```bash
firebase functions:log
```

**Look for:**
- "No FCM tokens found" → Tokens not registered
- "Notification sent successfully" → It worked!
- Error message → Copy and search for solution

**Solutions by error:**
1. **"No tokens"** → Run app and wait for permission prompt
2. **"Status unchanged"** → That's normal, only sends on change
3. **"Firebase error"** → Check database rules

---

### Issue: Duplicate notifications

**Problem:** Multiple devices registered with same token, or function triggers twice

**Solution:**
```bash
# Check tokens
firebase database:get /user_devices/dustbin_01/fcm_tokens

# If duplicates, remove old ones:
firebase database:remove /user_devices/dustbin_01/fcm_tokens
# Then restart app to re-register
```

---

### Issue: Notification shows generic text instead of custom

**Problem:** FCM payload not set correctly

**Check** in `functions/index.js` around line 85:
```javascript
const message = {
  notification: {
    title: notificationTitle,  // Your custom title
    body: notificationBody,    // Your custom body
  },
  data: { ... }
};
```

If this looks wrong, fix and redeploy:
```bash
firebase deploy --only functions
```

---

## 🚀 **Performance Issues**

### Issue: Notifications delayed (5+ seconds)

**Normal latency: 1-3 seconds**

**If longer:**
1. Check Cloud Function logs for slow processing
2. Verify database queries are fast
3. Check device internet speed

---

### Issue: Too many notifications

**Problem:** Function triggers for every 1% change

**Solution:** Update threshold in `functions/index.js` or adjust how often NodeMCU sends data:

```cpp
delay(5000); // Send every 5 seconds
// Change to:
delay(10000); // Send every 10 seconds
```

---

## 📊 **Database Structure Issues**

### Issue: Can't see expected database structure

**Expected structure:**
```
/water_level/dustbin_01/current_level: 75
/user_devices/dustbin_01/fcm_tokens/...
```

**If missing:**
1. NodeMCU hasn't written yet → Wait 5 seconds
2. Check NodeMCU logs for "✓ Data sent"
3. Check device ID matches (both use "dustbin_01")

---

## 🐛 **Debug Mode - Check Everything**

### Enable detailed logging:

**NodeMCU:**
```cpp
#define DEBUG 1
#if DEBUG
  Serial.println("Debug: " + String(value));
#endif
```

**Android:**
```bash
adb logcat | grep -i firebase
adb logcat | grep -i notification
```

**Cloud Functions:**
```bash
firebase functions:log --follow
```

---

## ✅ **Verification Checklist**

Before concluding something is broken:

- [ ] Firebase project is Blaze plan
- [ ] Cloud Functions deployed: `firebase deploy --only functions`
- [ ] `.firebaserc` has correct project ID
- [ ] App.js has correct Cloud Function URL
- [ ] App has notification permission (checked in Settings)
- [ ] NodeMCU WiFi is connected (see in Serial Monitor)
- [ ] NodeMCU firebase auth is correct
- [ ] Device IDs match (NodeMCU and App)
- [ ] Database has `/water_level/dustbin_01/` path
- [ ] FCM tokens exist in database
- [ ] No errors in logs: `firebase functions:log`

---

## 🆘 **Still Stuck?**

1. **Check the full guide:** `DEPLOYMENT_GUIDE.md`
2. **Understand the system:** `SYSTEM_OVERVIEW.md`
3. **Review backend code:** `functions/index.js` (well-commented)
4. **Review app code:** `App.js` (FCM setup section)
5. **Firebase docs:** https://firebase.google.com/docs

---

## 📞 **Getting Help**

### Collect this info before asking for help:
1. Full error message (copy-paste)
2. Last 20 lines of: `firebase functions:log`
3. Last 50 lines of: `adb logcat`
4. Screenshot of Firebase Console showing database structure
5. What you were trying to do when error occurred

### Where to ask:
- Firebase Discord: https://discord.gg/firebase
- Stack Overflow: tag `firebase` + `google-cloud-functions`
- GitHub Issues (if it's code related)

---

**Remember:** 90% of issues are simple typos or missing configuration. Go slow, verify each step! 🐢

**Last Updated:** February 2026
