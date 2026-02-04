const admin = require('firebase-admin');

const serviceAccount = require('./serviceAccountKey.json');

const databaseURL =
  serviceAccount.databaseURL ||
  process.env.FIREBASE_DATABASE_URL ||
  `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL,
});

const db = admin.database();
const messaging = admin.messaging();

const DUSTBINS_REF = db.ref('/dustbins');
const TOKEN_REF = db.ref('/fcmToken');
const LAST_NOTIFIED_REF = db.ref('/lastNotified');

function getState(level) {
  if (typeof level !== 'number' || Number.isNaN(level)) return null;
  if (level <= 10) return 'FULL';
  if (level <= 20) return 'ABOUT_TO_FULL';
  return 'NONE';
}

async function getToken() {
  const snap = await TOKEN_REF.get();
  const token = snap.val();
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

async function getLastState(dustbinId) {
  const snap = await LAST_NOTIFIED_REF.child(dustbinId).get();
  return snap.val() || 'NONE';
}

async function setLastState(dustbinId, state) {
  await LAST_NOTIFIED_REF.child(dustbinId).set(state);
}

async function handleDustbinUpdate(dustbinId, dustbinData) {
  // Extract level from either direct number or object.level
  let level = dustbinData;
  if (typeof dustbinData === 'object' && dustbinData !== null) {
    level = dustbinData.level;
  }

  const state = getState(level);
  if (!state || state === 'NONE') {
    console.log(`Dustbin ${dustbinId}: Level ${level} - No notification needed (state: NONE)`);
    return;
  }

  const lastState = await getLastState(dustbinId);
  if (state === lastState) {
    console.log(`Dustbin ${dustbinId}: State unchanged (${state}) - Skipping notification`);
    return;
  }

  const token = await getToken();
  if (!token) {
    console.log(`Dustbin ${dustbinId}: No FCM token found - Skipping notification`);
    return;
  }

  const titles = {
    FULL: 'Dustbin Full 🚮',
    ABOUT_TO_FULL: 'Dustbin Almost Full ⚠️',
  };

  const message = {
    token,
    notification: {
      title: titles[state],
      body: `Dustbin ${dustbinId}: Level ${level}`,
    },
    data: {
      dustbinId: String(dustbinId),
      state,
      level: String(level),
    },
  };

  try {
    await messaging.send(message);
    await setLastState(dustbinId, state);
    console.log(`✓ Notification sent for ${dustbinId}: ${state} (Level ${level})`);
  } catch (err) {
    const code = err && err.code;
    console.error(`Error sending notification for ${dustbinId}:`, err.message);
    if (
      code === 'messaging/registration-token-not-registered' ||
      code === 'messaging/invalid-registration-token'
    ) {
      console.log('Invalid token - removing from database');
      await TOKEN_REF.remove();
    }
    await setLastState(dustbinId, state);
  }
}

function attachListeners() {
  const onChild = async (snap) => {
    const dustbinId = snap.key;
    const data = snap.val();
    console.log(`Update detected: ${dustbinId} =`, data);
    await handleDustbinUpdate(dustbinId, data);
  };

  DUSTBINS_REF.on('child_added', onChild);
  DUSTBINS_REF.on('child_changed', onChild);
  console.log('✓ Server listening for dustbin updates...');
}

attachListeners();