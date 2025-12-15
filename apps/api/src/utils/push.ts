// ============================================================================
// Firebase Cloud Messaging (FCM) Push Notifications
// ============================================================================

import admin from 'firebase-admin';
import { prisma } from '../config/database.js';

// Initialize Firebase Admin SDK
let firebaseInitialized = false;

function initializeFirebase() {
  if (firebaseInitialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase credentials not configured. Push notifications disabled.');
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    firebaseInitialized = true;
    console.log('Firebase Admin SDK initialized');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
  }
}

// Initialize on module load
initializeFirebase();

interface PushNotificationData {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

interface BatchNotificationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{ token: string; error: string }>;
}

/**
 * Send push notification to a single user
 */
export async function sendPushToUser(
  userId: string,
  notification: PushNotificationData
): Promise<boolean> {
  if (!firebaseInitialized) {
    console.log(`[Push] Firebase not initialized. Would send to user ${userId}:`, notification.title);
    return false;
  }

  try {
    // Get user's FCM token
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fcmToken: true },
    });

    if (!user?.fcmToken) {
      console.log(`[Push] No FCM token for user ${userId}`);
      return false;
    }

    const message: admin.messaging.Message = {
      token: user.fcmToken,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'masasia_default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[Push] Sent to user ${userId}: ${response}`);

    // Update notification record
    await prisma.notification.updateMany({
      where: {
        userId,
        pushSent: false,
        createdAt: { gte: new Date(Date.now() - 5000) }, // Last 5 seconds
      },
      data: {
        pushSent: true,
        pushSentAt: new Date(),
      },
    });

    return true;
  } catch (error) {
    const fcmError = error as { code?: string; message?: string };
    console.error(`[Push] Failed to send to user ${userId}:`, fcmError.message);

    // If token is invalid, clear it
    if (fcmError.code === 'messaging/invalid-registration-token' ||
        fcmError.code === 'messaging/registration-token-not-registered') {
      await prisma.user.update({
        where: { id: userId },
        data: { fcmToken: null },
      });
      console.log(`[Push] Cleared invalid FCM token for user ${userId}`);
    }

    return false;
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  notification: PushNotificationData
): Promise<BatchNotificationResult> {
  const result: BatchNotificationResult = {
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  if (!firebaseInitialized) {
    console.log(`[Push] Firebase not initialized. Would send to ${userIds.length} users`);
    result.failureCount = userIds.length;
    return result;
  }

  // Get FCM tokens for all users
  const users = await prisma.user.findMany({
    where: { id: { in: userIds }, fcmToken: { not: null } },
    select: { id: true, fcmToken: true },
  });

  if (users.length === 0) {
    console.log('[Push] No users with FCM tokens found');
    result.failureCount = userIds.length;
    return result;
  }

  const tokens = users.map(u => u.fcmToken!);

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: notification.title,
      body: notification.body,
      imageUrl: notification.imageUrl,
    },
    data: notification.data,
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'masasia_default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);

    result.successCount = response.successCount;
    result.failureCount = response.failureCount;

    // Process failures
    const invalidTokenUserIds: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const errorCode = resp.error?.code;
        result.errors.push({
          token: tokens[idx],
          error: resp.error?.message || 'Unknown error',
        });

        // Track invalid tokens
        if (errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered') {
          const user = users[idx];
          if (user) invalidTokenUserIds.push(user.id);
        }
      }
    });

    // Clear invalid tokens
    if (invalidTokenUserIds.length > 0) {
      await prisma.user.updateMany({
        where: { id: { in: invalidTokenUserIds } },
        data: { fcmToken: null },
      });
      console.log(`[Push] Cleared ${invalidTokenUserIds.length} invalid FCM tokens`);
    }

    console.log(`[Push] Batch result: ${result.successCount} success, ${result.failureCount} failures`);
  } catch (error) {
    console.error('[Push] Batch send failed:', error);
    result.failureCount = tokens.length;
  }

  return result;
}

/**
 * Send push notification to a topic (e.g., all providers in an area)
 */
export async function sendPushToTopic(
  topic: string,
  notification: PushNotificationData
): Promise<boolean> {
  if (!firebaseInitialized) {
    console.log(`[Push] Firebase not initialized. Would send to topic ${topic}`);
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      topic,
      notification: {
        title: notification.title,
        body: notification.body,
        imageUrl: notification.imageUrl,
      },
      data: notification.data,
      android: {
        priority: 'high',
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`[Push] Sent to topic ${topic}: ${response}`);
    return true;
  } catch (error) {
    console.error(`[Push] Failed to send to topic ${topic}:`, error);
    return false;
  }
}

/**
 * Subscribe user to a topic
 */
export async function subscribeToTopic(userId: string, topic: string): Promise<boolean> {
  if (!firebaseInitialized) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return false;

  try {
    await admin.messaging().subscribeToTopic([user.fcmToken], topic);
    console.log(`[Push] User ${userId} subscribed to topic ${topic}`);
    return true;
  } catch (error) {
    console.error(`[Push] Failed to subscribe user ${userId} to topic ${topic}:`, error);
    return false;
  }
}

/**
 * Unsubscribe user from a topic
 */
export async function unsubscribeFromTopic(userId: string, topic: string): Promise<boolean> {
  if (!firebaseInitialized) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fcmToken: true },
  });

  if (!user?.fcmToken) return false;

  try {
    await admin.messaging().unsubscribeFromTopic([user.fcmToken], topic);
    console.log(`[Push] User ${userId} unsubscribed from topic ${topic}`);
    return true;
  } catch (error) {
    console.error(`[Push] Failed to unsubscribe user ${userId} from topic ${topic}:`, error);
    return false;
  }
}

/**
 * Update user's FCM token
 */
export async function updateFcmToken(userId: string, fcmToken: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { fcmToken },
  });
  console.log(`[Push] Updated FCM token for user ${userId}`);
}
