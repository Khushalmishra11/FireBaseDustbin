const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
admin.initializeApp();

const db = admin.database();
const messaging = admin.messaging();

/**
 * Cloud Function: Monitors dustbin fill level changes in Realtime Database
 * Triggers when: /dustbin_level/{deviceId}/current_level changes
 * Sends push notifications when level changes or crosses warning thresholds
 */
exports.monitorDustbinLevel = functions.database
  .ref("/dustbin_level/{deviceId}/current_level")
  .onWrite(async (change, context) => {
    try {
      const deviceId = context.params.deviceId;
      const newLevel = change.after.val(); // Current value
      const previousLevel = change.before.val(); // Previous value

      console.log(
        `Dustbin Level Updated - Device: ${deviceId}, Previous: ${previousLevel}, Current: ${newLevel}`
      );

      // If no data yet, skip
      if (newLevel === null) {
        console.log("No data available, skipping notification");
        return;
      }

      // Get warning thresholds from database
      const thresholdSnapshot = await db
        .ref(`/dustbin_level/${deviceId}/settings`)
        .once("value");
      const settings = thresholdSnapshot.val() || {};

      const CRITICAL_LEVEL = settings.critical_level || 80; // 80% = CRITICAL
      const WARNING_LEVEL = settings.warning_level || 60; // 60% = WARNING
      const SAFE_LEVEL = settings.safe_level || 40; // Below 40% = SAFE

      // Determine current status
      let status = "SAFE";
      let statusColor = "#4CAF50"; // Green
      let priority = "normal";

      if (newLevel >= CRITICAL_LEVEL) {
        status = "CRITICAL";
        statusColor = "#FF0000"; // Red
        priority = "high";
      } else if (newLevel >= WARNING_LEVEL) {
        status = "WARNING";
        statusColor = "#FFA500"; // Orange
        priority = "normal";
      }

      // Get previous status
      let previousStatus = "SAFE";
      if (previousLevel !== null) {
        if (previousLevel >= CRITICAL_LEVEL) {
          previousStatus = "CRITICAL";
        } else if (previousLevel >= WARNING_LEVEL) {
          previousStatus = "WARNING";
        }
      }

      // Only send notification if status changed OR if it's critical
      const statusChanged = status !== previousStatus;
      const isCritical = status === "CRITICAL";

      if (!statusChanged && !isCritical && previousLevel !== null) {
        console.log("Status unchanged and not critical, skipping notification");
        return;
      }

      // Get all device tokens for this device
      const tokensSnapshot = await db
        .ref(`/user_devices/${deviceId}/fcm_tokens`)
        .once("value");
      const tokens = tokensSnapshot.val() || {};

      if (Object.keys(tokens).length === 0) {
        console.log(`No FCM tokens found for device: ${deviceId}`);
        return;
      }

      // Build notification payload
      const notificationTitle = `Dustbin Level - ${status}`;
      const notificationBody = `Level: ${newLevel}% (${getStatusMessage(status, newLevel)}%)`;

      const message = {
        notification: {
          title: notificationTitle,
          body: notificationBody,
        },
        data: {
          deviceId: deviceId,
          level: newLevel.toString(),
          status: status,
          timestamp: new Date().toISOString(),
          criticalLevel: CRITICAL_LEVEL.toString(),
          warningLevel: WARNING_LEVEL.toString(),
        },
      };

      // Send to all tokens
      const tokenList = Object.keys(tokens);
      console.log(
        `Sending notification to ${tokenList.length} device(s) for ${deviceId}`
      );

      const response = await messaging.sendMulticast({
        ...message,
        tokens: tokenList,
      });

      console.log(`Notification sent successfully: ${response.successCount} sent`);

      // Log the notification event to database for history
      await logNotificationEvent(deviceId, status, newLevel);

      return response;
    } catch (error) {
      console.error("Error in monitorDustbinLevel function:", error);
      throw error;
    }
  });

/**
 * Helper function to get friendly status message
 */
function getStatusMessage(status, level) {
  switch (status) {
    case "CRITICAL":
      return "Bin is almost full! ⚠️";
    case "WARNING":
      return "Bin fill level is high 👀";
    case "SAFE":
      return "Bin fill level is normal ✓";
    default:
      return "Level: " + level;
  }
}

/**
 * Log notification events to database for history/analytics
 */
async function logNotificationEvent(deviceId, status, level) {
  const timestamp = admin.database.ServerValue.TIMESTAMP;
  const eventRef = db.ref(
    `/notifications_log/${deviceId}/${Date.now()}`
  );

  await eventRef.set({
    status: status,
    level: level,
    timestamp: timestamp,
  });

  console.log("Notification event logged");
}

/**
 * Cloud Function: Clean up old notification logs (keep only last 30 days)
 * Runs on schedule every day
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule("every day 02:00")
  .timeZone("Asia/Kolkata")
  .onRun(async (context) => {
    try {
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const logsRef = db.ref("/notifications_log");

      const snapshot = await logsRef.once("value");
      const allLogs = snapshot.val() || {};

      for (const deviceId in allLogs) {
        const deviceLogs = allLogs[deviceId];
        for (const timestamp in deviceLogs) {
          if (parseInt(timestamp) < thirtyDaysAgo) {
            await db.ref(`/notifications_log/${deviceId}/${timestamp}`).remove();
          }
        }
      }

      console.log("Old notification logs cleaned up");
      return null;
    } catch (error) {
      console.error("Error cleaning up notifications:", error);
      throw error;
    }
  });

/**
 * Cloud Function: Register FCM token
 * Called from Android app when user first opens it
 * HTTP trigger for device to register its FCM token
 */
exports.registerFCMToken = functions.https.onRequest(
  async (req, res) => {
    try {
      const { deviceId, token, userId } = req.body;

      if (!deviceId || !token) {
        return res.status(400).json({
          error: "deviceId and token are required",
        });
      }

      const tokenKey = `token_${Date.now()}`;
      await db
        .ref(`/user_devices/${deviceId}/fcm_tokens/${tokenKey}`)
        .set({
          token: token,
          userId: userId || "anonymous",
          registeredAt: admin.database.ServerValue.TIMESTAMP,
        });

      res.status(200).json({
        success: true,
        message: "FCM token registered successfully",
        deviceId: deviceId,
      });
    } catch (error) {
      console.error("Error registering FCM token:", error);
      res.status(500).json({ error: error.message });
    }
  }
);
