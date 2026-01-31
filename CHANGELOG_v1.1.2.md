# SDAPWA v1.1.2 - CHANGELOG

**Release Date:** January 31, 2026

## Critical Bug Fixes

### 1. Firebase Quota Exhaustion Handling
**Problem:** The app was hitting Firebase quota limits, causing:
- Tasks not saving to Firestore
- "Sync manager not initialized" errors
- Complete sync failures

**Solution:**
- Reduced sync frequency from 30s to 60s
- Added sync throttling (minimum 10s between syncs)
- Implemented quota detection and graceful degradation
- Added offline queue for operations during quota exhaustion
- SyncManager now pauses real-time listeners when quota is exceeded

### 2. Version Display Fixed
**Problem:** Settings showed "SDAPWA v1.0.0" instead of current version

**Solution:** Updated `constants.js` to show correct version `1.1.2`

### 3. Timezone/Time Display Issues
**Problem:** `parseISO()` function was stripping the 'Z' suffix incorrectly, causing timezone confusion when displaying task times

**Solution:** 
- Fixed `parseISO()` to use native Date parsing which correctly handles UTC timestamps
- Added `localDateTimeToUTC()` helper for converting form inputs to UTC
- Added `utcToLocalDateTime()` helper for converting UTC to form display values
- All times now display correctly in user's local timezone (Central)

### 4. Create Task Button Not Working
**Problem:** Create task button did nothing or showed vague error

**Solution:**
- Added proper validation with specific error messages
- Added button disable/enable during submission to prevent double-clicks
- Added quota error handling with offline queue fallback
- Fixed local cache update to immediately show new tasks

### 5. Tasks Not Showing
**Problem:** Tasks weren't appearing in "Do These 3 Now" or "Before My Day Ends"

**Solution:**
- Fixed Dashboard to load from local cache when syncManager unavailable
- Ensured local cache is properly updated after task creation
- Fixed event dispatching to refresh UI after changes

### 6. Address Autocomplete Issues
**Problem:** 
- Search triggered on every keystroke (excessive API calls)
- Residential addresses not found unless state was omitted
- Business addresses and intersections shown instead of homes

**Solution:**
- Implemented 500ms debounce for address search
- Increased minimum query length to 5 characters
- Added `addressdetails=1` parameter for better address breakdown
- Sort results to prioritize houses/buildings over streets
- Added user hint to include city and zip code
- Results now sorted by type (house > building > residential > street)

### 7. Sync Now Button Error
**Problem:** Clicking "Sync Now" showed "sync manager not initialized"

**Solution:**
- Added initialization check with fallback
- If syncManager not ready, attempts to initialize it
- Shows proper status indicators in Settings

## New Features

### Offline Queue Management
- New "Process Offline Queue" button in Settings
- Shows count of pending items in Settings
- Automatic processing when coming back online

### Better Status Indicators
- Sync status now shows: Connected, Initializing, Offline, Quota Exceeded, Error
- Last sync time displays properly
- Offline queue count visible in Settings

## Files Changed

1. `js/utils/constants.js` - Version bump, new error messages, adjusted sync intervals
2. `js/utils/datetime.js` - Fixed parseISO, added timezone helpers
3. `js/ui/AddTask.js` - Debounced search, better validation, offline support
4. `js/ui/Dashboard.js` - Fixed task loading, completion handling
5. `js/ui/Settings.js` - Better sync handling, offline queue UI
6. `js/services/SyncManager.js` - Quota handling, throttling, error recovery

## Testing Checklist

Before deploying, verify:

- [ ] App version shows as "SDAPWA v1.1.2" in Settings
- [ ] Creating a time-based task works and task appears immediately
- [ ] Creating a location-based task works with address autocomplete
- [ ] Address search finds specific addresses (e.g., "1219 W Winona St, Chicago, 60640")
- [ ] Task times display correctly in Central timezone
- [ ] Completing a task updates UI immediately
- [ ] Sync Now button works without error
- [ ] When quota exceeded, tasks still save locally
- [ ] Offline queue shows item count in Settings
- [ ] After hard refresh, tasks persist

## Known Limitations

1. **Firebase Quota:** The free tier has daily limits. If exceeded:
   - Data saves locally
   - Sync resumes when quota resets (usually midnight UTC)
   - Consider upgrading Firebase plan for heavier usage

2. **Address Search:** Uses free Nominatim API which has rate limits:
   - Maximum 1 request per second (enforced by debounce)
   - May not find all addresses (OpenStreetMap data coverage varies)
   - Include zip code for best results

## Deployment Instructions

1. Replace all files in GitHub repository with contents of this package
2. Enable GitHub Pages if not already enabled
3. Clear browser cache and hard refresh to test
4. Verify version shows 1.1.2 in Settings

---
Built with ❤️ for ADHD task management
