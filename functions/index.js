const admin = require('firebase-admin');
const functions = require('firebase-functions');

admin.initializeApp();

const db = admin.database();
const messaging = admin.messaging();

exports.onDustbinUpdate = functions.database
  .ref('/dustbins/{dustbinId}')
  .onUpdate(async (change, context) => {
    const { dustbinId } = context.params;
    const newValue = change.after.val();
    const oldValue = change.before.val();

    // Validate input: ignore null, undefined, NaN, non-number
    if (
      newValue === null ||
      newValue === undefined ||
      typeof newValue !== 'number' ||
      isNaN(newValue)
    ) {
      return;
    }

    // Ignore if value didn't actually change
    if (newValue === oldValue) {
      return;
    }

    // Determine dustbin state based on level
    let newState = 'NONE';
    if (newValue <= 10) {
      newState = 'FULL';
    } else if (newValue <= 20) {
      newState = 'ABOUT_TO_FULL';
    }

    // If state is NONE, update lastNotified and return (no notification)
    if (newState === 'NONE') {
      await db.ref(`/lastNotified/${dustbinId}`).set('NONE');
      return;
    }

    // Check previous notification state to prevent duplicates
    const lastNotifiedSnapshot = await db.ref(`/lastNotified/${dustbinId}`).get();
    const lastState = lastNotifiedSnapshot.val() || 'NONE';

    // Send only if new state differs from previous state
    if (newState === lastState) {
      return;
    }

    // Retrieve FCM token from database
    const tokenSnapshot = await db.ref('/fcmToken').get();
    const token = tokenSnapshot.val();

    // Return gracefully if token is missing
    if (!token) {
      await db.ref(`/lastNotified/${dustbinId}`).set(newState);
      return;
    }

    // Build notification title based on state
    const titles = {
      FULL: 'Dustbin Full 🚮',
      ABOUT_TO_FULL: 'Dustbin Almost Full ⚠️'
    };

    // Prepare FCM payload
    const payload = {
      notification: {
        title: titles[newState],
        body: `Dustbin ${dustbinId}: Level ${newValue}%`
      },
      data: {
        dustbinId,
        state: newState,
        level: String(newValue)
      },
      token
    };

    try {
      // Send notification via Firebase Cloud Messaging
      await messaging.send(payload);
      // Update last notified state after successful send
      await db.ref(`/lastNotified/${dustbinId}`).set(newState);
    } catch (error) {
      // Log error but still update state to avoid repeated attempts
      console.error(`Failed to send notification for dustbin ${dustbinId}:`, error);
      await db.ref(`/lastNotified/${dustbinId}`).set(newState);
    }
  });
