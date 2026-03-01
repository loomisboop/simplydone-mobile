/**
 * SimplyDone PWA - Firebase Cloud Functions
 * Handles push notifications for scheduled tasks, location tasks, and BMDE reminders
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// ============================================================================
// SCHEDULED FUNCTION: Check for tasks that need notifications (runs every minute)
// ============================================================================

exports.checkScheduledTasks = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async (context) => {
        console.log('⏰ Checking for scheduled task notifications...');
        
        const now = new Date();
        const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
        const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
        
        try {
            // Get all users
            const usersSnapshot = await db.collection('users').get();
            
            for (const userDoc of usersSnapshot.docs) {
                const userId = userDoc.id;
                const userData = userDoc.data();
                
                // Skip if user has no FCM token
                if (!userData.fcmToken) continue;
                
                // Get user's active tasks
                const tasksSnapshot = await db.collection('users').doc(userId)
                    .collection('tasks')
                    .where('deleted', '==', false)
                    .where('trigger_type', '==', 'time')
                    .get();
                
                for (const taskDoc of tasksSnapshot.docs) {
                    const task = taskDoc.data();
                    const taskId = taskDoc.id;
                    
                    // Skip completed tasks
                    if (task.completed_at) continue;
                    
                    // Skip if no start time
                    if (!task.start) continue;
                    
                    const startTime = new Date(task.start);
                    
                    // Check if task is starting now (within last 2 minutes)
                    if (startTime >= twoMinutesAgo && startTime <= now) {
                        await sendTaskStartNotification(userId, userData.fcmToken, task, taskId);
                    }
                    
                    // Check if task starts in ~5 minutes (4-6 minute window)
                    const fourMinutesFromNow = new Date(now.getTime() + 4 * 60 * 1000);
                    const sixMinutesFromNow = new Date(now.getTime() + 6 * 60 * 1000);
                    
                    if (startTime >= fourMinutesFromNow && startTime <= sixMinutesFromNow) {
                        await sendTaskUpcomingNotification(userId, userData.fcmToken, task, taskId);
                    }
                }
                
                // Check BMDE tasks
                await checkBMDETasks(userId, userData, now);
            }
            
            console.log('✓ Scheduled task check complete');
            return null;
            
        } catch (error) {
            console.error('Error checking scheduled tasks:', error);
            return null;
        }
    });

// ============================================================================
// HELPER: Send "Task Starting Now" notification
// ============================================================================

async function sendTaskStartNotification(userId, fcmToken, task, taskId) {
    // Check if we already sent this notification
    const notifKey = `task_start_${taskId}`;
    const alreadySent = await checkNotificationSent(userId, notifKey);
    if (alreadySent) return;
    
    const message = {
        token: fcmToken,
        notification: {
            title: '✓ Task Starting Now',
            body: task.name
        },
        data: {
            type: 'task_start',
            taskId: taskId,
            taskName: task.name
        },
        webpush: {
            fcmOptions: {
                link: '/'
            },
            notification: {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                tag: `task-start-${taskId}`
            }
        }
    };
    
    try {
        await messaging.send(message);
        await markNotificationSent(userId, notifKey);
        console.log(`📤 Sent task start notification: ${task.name}`);
    } catch (error) {
        console.error('Error sending task start notification:', error);
        // If token is invalid, remove it
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId).update({ fcmToken: null });
        }
    }
}

// ============================================================================
// HELPER: Send "Task Starting Soon" notification
// ============================================================================

async function sendTaskUpcomingNotification(userId, fcmToken, task, taskId) {
    const notifKey = `task_upcoming_${taskId}`;
    const alreadySent = await checkNotificationSent(userId, notifKey);
    if (alreadySent) return;
    
    const message = {
        token: fcmToken,
        notification: {
            title: '⏰ Task Starting Soon',
            body: `${task.name} starts in 5 minutes`
        },
        data: {
            type: 'task_upcoming',
            taskId: taskId,
            taskName: task.name
        },
        webpush: {
            fcmOptions: {
                link: '/'
            },
            notification: {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                vibrate: [100, 50, 100],
                tag: `task-upcoming-${taskId}`
            }
        }
    };
    
    try {
        await messaging.send(message);
        await markNotificationSent(userId, notifKey);
        console.log(`📤 Sent task upcoming notification: ${task.name}`);
    } catch (error) {
        console.error('Error sending task upcoming notification:', error);
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId).update({ fcmToken: null });
        }
    }
}

// ============================================================================
// HELPER: Check BMDE tasks (1 hour before workday ends)
// ============================================================================

async function checkBMDETasks(userId, userData, now) {
    const workdayEnd = userData.workdayEndTime || '17:00';
    const [hours, minutes] = workdayEnd.split(':').map(Number);
    
    // Calculate workday end time for today
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);
    
    // One hour before
    const oneHourBefore = new Date(endTime.getTime() - 60 * 60 * 1000);
    
    // Check if we're in the 1-hour warning window (within 2 minutes of the hour mark)
    const timeDiff = Math.abs(now.getTime() - oneHourBefore.getTime());
    if (timeDiff > 2 * 60 * 1000) return; // Not in the warning window
    
    // Get incomplete BMDE tasks
    const tasksSnapshot = await db.collection('users').doc(userId)
        .collection('tasks')
        .where('deleted', '==', false)
        .where('before_day_ends', '==', true)
        .get();
    
    const incompleteTasks = tasksSnapshot.docs.filter(doc => !doc.data().completed_at);
    
    if (incompleteTasks.length === 0) return;
    
    const notifKey = `bmde_warning_${now.toISOString().split('T')[0]}`;
    const alreadySent = await checkNotificationSent(userId, notifKey);
    if (alreadySent) return;
    
    const taskNames = incompleteTasks.slice(0, 3).map(doc => doc.data().name).join(', ');
    const message = {
        token: userData.fcmToken,
        notification: {
            title: '⚠️ Before My Day Ends Reminder',
            body: `${incompleteTasks.length} task(s) pending: ${taskNames}${incompleteTasks.length > 3 ? '...' : ''}`
        },
        data: {
            type: 'bmde_warning',
            taskCount: String(incompleteTasks.length)
        },
        webpush: {
            fcmOptions: {
                link: '/'
            },
            notification: {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                vibrate: [200, 100, 200],
                requireInteraction: true,
                tag: 'bmde-warning'
            }
        }
    };
    
    try {
        await messaging.send(message);
        await markNotificationSent(userId, notifKey);
        console.log(`📤 Sent BMDE warning: ${incompleteTasks.length} tasks`);
    } catch (error) {
        console.error('Error sending BMDE notification:', error);
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId).update({ fcmToken: null });
        }
    }
}

// ============================================================================
// HELPER: Track sent notifications (prevent duplicates)
// ============================================================================

async function checkNotificationSent(userId, notifKey) {
    const doc = await db.collection('users').doc(userId)
        .collection('notifications_sent').doc(notifKey).get();
    return doc.exists;
}

async function markNotificationSent(userId, notifKey) {
    await db.collection('users').doc(userId)
        .collection('notifications_sent').doc(notifKey).set({
            sentAt: admin.firestore.FieldValue.serverTimestamp()
        });
    
    // Auto-delete after 24 hours (cleanup)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldNotifs = await db.collection('users').doc(userId)
        .collection('notifications_sent')
        .where('sentAt', '<', oneDayAgo)
        .get();
    
    const batch = db.batch();
    oldNotifs.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
}

// ============================================================================
// FIRESTORE TRIGGER: When a task is created/updated, schedule notification
// ============================================================================

exports.onTaskWrite = functions.firestore
    .document('users/{userId}/tasks/{taskId}')
    .onWrite(async (change, context) => {
        const { userId, taskId } = context.params;
        
        // Task deleted
        if (!change.after.exists) {
            // Clean up any scheduled notifications for this task
            await db.collection('users').doc(userId)
                .collection('notifications_sent').doc(`task_start_${taskId}`).delete().catch(() => {});
            await db.collection('users').doc(userId)
                .collection('notifications_sent').doc(`task_upcoming_${taskId}`).delete().catch(() => {});
            return null;
        }
        
        const task = change.after.data();
        
        // If task was just completed, no action needed
        if (task.completed_at) {
            return null;
        }
        
        // Log for debugging
        console.log(`📝 Task written: ${task.name} (${taskId})`);
        
        return null;
    });

// ============================================================================
// HTTP FUNCTION: Register FCM token for a user
// ============================================================================

exports.registerFCMToken = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userId = context.auth.uid;
    const { token } = data;
    
    if (!token) {
        throw new functions.https.HttpsError('invalid-argument', 'FCM token is required');
    }
    
    try {
        await db.collection('users').doc(userId).set({
            fcmToken: token,
            fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        console.log(`✓ FCM token registered for user: ${userId}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error registering FCM token:', error);
        throw new functions.https.HttpsError('internal', 'Failed to register token');
    }
});

// ============================================================================
// HTTP FUNCTION: Update workday end time
// ============================================================================

exports.updateWorkdayEndTime = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userId = context.auth.uid;
    const { workdayEndTime } = data;
    
    if (!workdayEndTime || !/^\d{2}:\d{2}$/.test(workdayEndTime)) {
        throw new functions.https.HttpsError('invalid-argument', 'Valid workday end time required (HH:MM)');
    }
    
    try {
        await db.collection('users').doc(userId).set({
            workdayEndTime: workdayEndTime
        }, { merge: true });
        
        console.log(`✓ Workday end time updated for user: ${userId} to ${workdayEndTime}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error updating workday end time:', error);
        throw new functions.https.HttpsError('internal', 'Failed to update workday end time');
    }
});

// ============================================================================
// HTTP FUNCTION: Send test notification
// ============================================================================

exports.sendTestNotification = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    
    const userId = context.auth.uid;
    
    // Get user's FCM token
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || !userData.fcmToken) {
        throw new functions.https.HttpsError('failed-precondition', 'No FCM token registered');
    }
    
    const message = {
        token: userData.fcmToken,
        notification: {
            title: '🎉 Test Notification',
            body: 'Push notifications are working! You\'ll receive alerts even when the app is closed.'
        },
        data: {
            type: 'test'
        },
        webpush: {
            fcmOptions: {
                link: '/'
            },
            notification: {
                icon: '/assets/icons/icon-192.png',
                badge: '/assets/icons/icon-96.png',
                vibrate: [200, 100, 200],
                tag: 'test-notification'
            }
        }
    };
    
    try {
        await messaging.send(message);
        console.log(`📤 Sent test notification to user: ${userId}`);
        return { success: true };
        
    } catch (error) {
        console.error('Error sending test notification:', error);
        if (error.code === 'messaging/registration-token-not-registered') {
            await db.collection('users').doc(userId).update({ fcmToken: null });
            throw new functions.https.HttpsError('failed-precondition', 'FCM token expired. Please re-enable notifications.');
        }
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
    }
});
