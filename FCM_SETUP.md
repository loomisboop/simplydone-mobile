# Firebase Cloud Messaging (FCM) Setup Instructions

## Overview
This update adds **true background push notifications** to SimplyDone PWA. Notifications will now work even when the app is closed!

## Setup Steps

### Step 1: Generate VAPID Key
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **simplydonesync**
3. Click the ⚙️ gear icon → **Project settings**
4. Go to the **Cloud Messaging** tab
5. Scroll down to **Web Push certificates**
6. Click **Generate key pair**
7. Copy the generated public key

### Step 2: Add VAPID Key to App
1. Open `js/firebase-config.js`
2. Find this line:
   ```javascript
   window.FIREBASE_VAPID_KEY = ""; // TODO: Add your VAPID key here
   ```
3. Paste your VAPID key between the quotes:
   ```javascript
   window.FIREBASE_VAPID_KEY = "BLxT1234...your-key-here...";
   ```

### Step 3: Deploy Cloud Functions
1. Install Firebase CLI (if not already):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Navigate to your project directory and deploy functions:
   ```bash
   cd /path/to/your/project
   firebase deploy --only functions
   ```

4. If prompted to enable Cloud Functions billing, follow the instructions (Blaze plan required for scheduled functions)

### Step 4: Deploy Firestore Rules (Optional but Recommended)
```bash
firebase deploy --only firestore:rules
```

### Step 5: Test Push Notifications
1. Open the app on your iOS device
2. Go to **Settings**
3. Tap **Enable Push Notifications**
4. Allow notifications when prompted
5. Tap **Test Push Notification**
6. You should receive a notification even if you switch to another app!

## How It Works

### Cloud Functions
- **checkScheduledTasks**: Runs every minute, checks all users' tasks
  - Sends "Task Starting Now" when a task's start time arrives
  - Sends "Task Starting Soon" 5 minutes before start
  - Sends BMDE reminder 1 hour before workday ends

- **registerFCMToken**: Stores user's FCM token for push notifications
- **updateWorkdayEndTime**: Syncs workday end time for BMDE reminders
- **sendTestNotification**: Sends a test push notification

### Client Side
- **FCMClient.js**: Handles FCM token registration and foreground messages
- **service-worker.js**: Handles background push messages

## Troubleshooting

### Notifications not appearing
1. Check that VAPID key is correctly set
2. Verify notification permissions in iOS Settings
3. Check Firebase Console → Cloud Messaging for delivery reports

### Cloud Functions not deploying
1. Ensure you're on the Blaze (pay-as-you-go) plan
2. Check that Cloud Functions API is enabled
3. Run `firebase functions:log` to see error details

### Token not registering
1. Check browser console for errors
2. Verify service worker is registered
3. Try clearing site data and re-enabling notifications

## Costs
Firebase Cloud Functions on the Blaze plan:
- **First 2 million invocations/month**: Free
- **Beyond that**: $0.40 per million invocations

For a single user checking tasks every minute:
- ~43,200 invocations/month = **Free tier**

## Files Added/Modified

### New Files
- `js/services/FCMClient.js` - FCM client handling
- `functions/package.json` - Cloud Functions dependencies
- `functions/index.js` - Cloud Functions code
- `firebase.json` - Firebase configuration
- `firestore.rules` - Updated Firestore rules
- `firestore.indexes.json` - Firestore indexes

### Modified Files
- `index.html` - Added FCM and Functions SDK
- `js/firebase-config.js` - Added VAPID key placeholder and Functions init
- `js/auth.js` - Initialize FCMClient on sign-in
- `js/ui/Settings.js` - Added push notification UI
- `service-worker.js` - Added FCM background message handling
