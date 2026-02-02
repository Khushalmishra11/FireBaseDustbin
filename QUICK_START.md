# ⚡ QUICK START (5 Minutes)

## For the impatient developer! 🚀

### **Prerequisites (1 min)**
- ✅ Firebase project with **Blaze plan**
- ✅ Node.js 18+ installed
- ✅ Firebase CLI: `npm install -g firebase-tools`

---

## **Step 1: Deploy Cloud Functions (2 min)**

```bash
# Update .firebaserc with your project ID
# Edit line 3: "YOUR_PROJECT_ID_HERE" → your actual ID

firebase login
firebase deploy --only functions
```

**Copy the URL** that shows up (looks like):
```
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken
```

---

## **Step 2: Update App (1 min)**

Open `App.js` and find line ~85:
```javascript
'https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/registerFCMToken'
```

Replace with your URL from Step 1.

```bash
npm install
npm run android
```

**If it works:** You'll see notification permission request → ALLOW

---

## **Step 3: Test It! (1 min)**

### Option A: Manual test
```bash
firebase database:set /water_level/dustbin_01/current_level 50
firebase database:set /water_level/dustbin_01/current_level 75
# Watch Android → Should get alert!
```

### Option B: Real NodeMCU
- Fill in `NODEMCU_CODE.ino` with WiFi + Firebase details
- Upload to ESP32
- Update tank water level
- Watch Android get notifications

---

## **That's it!** ✨

Your system is live. Water level changes → Android notifications!

---

### Troubleshooting Quick Ref

| Problem | Solution |
|---------|----------|
| Won't deploy | Check project ID in `.firebaserc` |
| No notifications | Check App.js has correct Cloud Function URL |
| NodeMCU fails | Verify WiFi & Firebase credentials |
| Permission denied | Restart app and tap ALLOW on permission prompt |

---

**Need more details?** See `DEPLOYMENT_GUIDE.md`
**Want to understand the architecture?** See `SYSTEM_OVERVIEW.md`
