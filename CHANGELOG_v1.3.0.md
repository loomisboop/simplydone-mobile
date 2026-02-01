# SimplyDone PWA v1.3.0 - Complete Feature Update

## Release Date: February 2, 2026

## Summary
Major feature update addressing 20+ items including task details, goals display, audio system, location tasks, BMDE logic, drag/drop reordering, and iOS PWA compatibility.

---

## New Features

### 1. Task Details Modal ✓
- "Details" button now shows actual task details instead of "coming soon"
- Displays: name, duration, priority, type (time/location)
- For time-based tasks: start/stop times
- For location tasks: nickname, address, radius (in feet), arrival time
- Edit button to modify task

### 2. Goals Display - Separate Tiles ✓
- Goals now display as 3 separate horizontal tiles
- Each tile shows goal name, progress bar, and completion count
- Row spans full screen width matching task cards below
- Tap any tile to go to Goals Detail screen

### 3. Mindfulness Audio System ✓
- Complete Web Audio API implementation (no external files needed)
- Nature Sounds: Rain, Ocean Waves, Forest, Stream, White Noise
- Binaural Beats: Alpha (10Hz relaxation), Theta (6Hz meditation), Beta (18Hz focus)
- End chime plays when meditation timer completes
- All audio tested and working on iOS/Android

### 4. Location-Based Task Improvements ✓
- Edit screen no longer shows start/stop time fields for location tasks
- Geofence radius now displayed and editable in feet (converted to meters for storage)
- Location tasks stay in "Do These 3 Now" until marked done (no auto-removal)
- Improved geofence detection for iPhone with polling fallback

### 5. Notifications ✓
- Push notifications for new tasks added to "Do These 3 Now"
- Arrival notifications when entering geofence
- Audio chimes accompany notifications
- Test notification button in Settings

### 6. Before My Day Ends (BMDE) Logic ✓
- BMDE task creation no longer requires start time
- End time auto-set to workday end time from Settings
- New "Workday ends at" time picker in Settings
- When parking task to BMDE, start time is removed
- BMDE tasks have: no start time, end time = workday end, start date = today

### 7. Task Visibility - Mutual Exclusivity ✓
- Each task now appears in only ONE of:
  - "Do These 3 Now"
  - "Before My Day Ends"
  - "Rainy Day"
- All tasks always visible in "All Tasks" master list

### 8. Drag & Drop Reordering ✓
- Hold and drag to reorder tasks within any list
- Works on both desktop (mouse) and mobile (touch with long-press)
- Custom order is saved and persists across sessions
- Available in "Do These 3 Now" and "Before My Day Ends"

### 9. iOS PWA Fixes ✓
- Changed authentication from signInWithPopup to signInWithRedirect
- Fixed manifest.json start_url from "/" to "./" for GitHub Pages
- Improved geofence polling for iOS background limitations
- Better touch handling for drag/drop

---

## Bug Fixes

### Sync Issues
- Health data (Doing/Being/Steps) now properly syncs from PC

### Audio
- Nature sounds now play correctly during meditation
- End chime now plays when meditation completes

### Location Tasks
- Geofence triggers now work on iPhone
- Location task behavior fixed: stays until done

---

## Technical Changes

### New Files
- `/js/audio/AudioSystem.js` - Web Audio API sound generation

### Modified Files
- `/js/utils/constants.js` - v1.3.0, new storage keys, MEDITATION_SOUNDS
- `/js/utils/datetime.js` - Added formatForInput, formatDateTime
- `/js/auth.js` - iOS redirect authentication
- `/js/ui/Dashboard.js` - Complete rewrite with new features
- `/js/ui/Mindfulness.js` - Audio system integration, binaural beats
- `/js/ui/Settings.js` - Workday end time setting
- `/js/ui/TaskList.js` - Location task edit fix
- `/js/ui/AddTask.js` - BMDE tab without start time
- `/js/services/GeofenceMonitor.js` - iOS compatibility
- `/js/services/NotificationManager.js` - Audio integration
- `/css/screens.css` - Goals tiles, drag/drop, modals
- `/manifest.json` - start_url fix
- `/index.html` - AudioSystem.js include

---

## Compatibility
- Syncs with SDPC v0.84+
- iOS 15+, Android 10+, Chrome 90+, Safari 15+
- GitHub Pages compatible

---

## Known Limitations
- Apple Health auto-sync not possible in PWA (requires native app)
- Background location monitoring limited on iOS
