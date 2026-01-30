# SDAPWA v1.1.1 - Critical Hotfix

**Release Date**: January 30, 2026  
**Fixes**: 2 critical bugs from v1.1.0

---

## 🔧 BUG FIXES

### Bug #1: Task Completion Not Syncing to PC ✅ FIXED
**Issue**: Tasks marked done on web reappeared and didn't sync to PC
**Root Cause**: Incorrect Firestore collection path syntax
**Was**: `collection('users/' + userId + '/tasks')`
**Now**: `collection('users').doc(userId).collection('tasks')`
**Impact**: Task completions now save correctly and sync to PC within 5 seconds

### Bug #2: Times Showing 6 Hours Later ✅ FIXED
**Issue**: Task times showed 6 hours later than entered (e.g., 6pm → 12am)
**Root Cause**: datetime-local input interpreted as UTC instead of local time
**Fix**: Added `parseLocalDateTime()` function that:
  1. Parses datetime-local string as local time
  2. Creates Date object in user's timezone
  3. Converts to UTC ISO string properly
**Impact**: Task times now display correctly in user's local timezone

---

## 📝 FILES CHANGED

- `js/ui/Dashboard.js` - Fixed Firestore path, added logging
- `js/ui/AddTask.js` - Fixed time parsing, fixed Firestore path  
- `js/ui/TaskList.js` - Fixed Firestore paths (3 locations)
- `js/services/SyncManager.js` - Fixed Firestore paths (5 locations)
- `js/ui/GoalsDetail.js` - Fixed Firestore path
- `js/ui/Mindfulness.js` - Fixed Firestore paths (2 locations)

**Total**: 6 files, 13 Firestore path fixes, 1 time parsing fix

---

## ✅ VERIFICATION

**Test Scenario 1: Task Completion**
1. Create task on web app
2. Mark done
3. Check PC app within 10 seconds
4. ✅ Task shows as completed on PC

**Test Scenario 2: Time Display**
1. Create task: Start 6:00 PM, Stop 9:00 PM
2. Save task
3. ✅ Task displays: 6:00 PM - 9:00 PM (not 12:00 AM - 3:00 AM)

---

## 🚀 DEPLOYMENT

Upload to GitHub as before. All fixes are backward compatible.
