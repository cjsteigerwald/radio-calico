# Test Case Catalog

## Overview

This comprehensive catalog documents all regression test cases for RadioCalico, organized by feature area and priority level.

## Test Case Format

Each test case follows this standard format:
- **ID**: Unique identifier (e.g., TC-001)
- **Category**: Feature area
- **Priority**: P0 (Critical), P1 (High), P2 (Medium), P3 (Low)
- **Type**: Unit, Integration, E2E, Performance, Security
- **Automated**: Yes/No/Partial
- **Last Updated**: Date of last modification

---

## Audio Streaming Tests

### TC-001: Stream Initialization
**Category**: Audio Streaming
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Preconditions**:
- Application loaded
- Network connection available

**Test Steps**:
1. Load RadioCalico homepage
2. Verify audio player initializes
3. Check HLS.js loads successfully
4. Verify stream URL is accessible

**Expected Results**:
- Audio element created in DOM
- HLS library initialized without errors
- Stream manifest loads within 3 seconds
- No console errors

**Test Data**:
```javascript
streamUrl: 'https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8'
```

---

### TC-002: Play/Pause Functionality
**Category**: Audio Streaming
**Priority**: P0
**Type**: E2E
**Automated**: Yes

**Test Steps**:
1. Click play button
2. Verify audio starts playing
3. Click pause button
4. Verify audio pauses
5. Click play again
6. Verify resume from pause point

**Expected Results**:
- Audio plays on first click
- Visual feedback (play/pause icons toggle)
- Audio stops on pause
- Resumes correctly

**Regression Check**: Issue #11 - Elapsed time behavior

---

### TC-003: Volume Control
**Category**: Audio Streaming
**Priority**: P1
**Type**: Unit
**Automated**: Yes

**Test Steps**:
1. Adjust volume slider to 0%
2. Verify audio muted
3. Adjust to 50%
4. Verify medium volume
5. Adjust to 100%
6. Verify maximum volume

**Expected Results**:
- Volume changes immediately
- Settings persist on page reload
- No audio distortion at max volume

---

### TC-004: Stream Buffering Recovery
**Category**: Audio Streaming
**Priority**: P1
**Type**: Integration
**Automated**: Partial

**Test Steps**:
1. Start playback
2. Simulate network interruption
3. Wait for buffering state
4. Restore network
5. Verify automatic recovery

**Expected Results**:
- "Buffering..." status shown
- Auto-retry after network restore
- Playback resumes within 10 seconds
- No manual intervention required

---

### TC-005: Elapsed Time Tracking
**Category**: Audio Streaming
**Priority**: P0
**Type**: Unit
**Automated**: Yes

**Test Steps**:
1. Start playback
2. Verify elapsed time increments
3. Wait for track change
4. Verify elapsed time resets to 0:00
5. Continue playing new track
6. Verify elapsed time increments from 0

**Expected Results**:
- Timer shows MM:SS format
- Updates every second
- **Resets to 0:00 on track change** (Issue #11 fix)
- Accurate to ±1 second

**Test Code**:
```javascript
test('elapsed time resets on track change', async () => {
  await audioPlayer.play();
  await wait(30000);
  const trackChangeEvent = new CustomEvent('trackChanged');
  document.dispatchEvent(trackChangeEvent);
  expect(audioPlayer.getElapsedTime()).toBe(0);
});
```

---

## Metadata Display Tests

### TC-006: Track Information Display
**Category**: Metadata
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Start playback
2. Wait for metadata load
3. Verify artist name displays
4. Verify song title displays
5. Verify album info (if available)

**Expected Results**:
- Metadata loads within 10 seconds
- Special characters display correctly
- Long titles truncate gracefully
- Updates on track change

---

### TC-007: Album Artwork Fetching
**Category**: Metadata
**Priority**: P1
**Type**: Integration
**Automated**: No

**Test Steps**:
1. Play track with known artwork
2. Verify artwork loads
3. Play track without artwork
4. Verify placeholder displays
5. Check artwork caching

**Expected Results**:
- Artwork loads from iTunes API
- Placeholder for missing artwork
- Cached artwork loads instantly
- No CORS errors

---

### TC-008: Recent Tracks List
**Category**: Metadata
**Priority**: P2
**Type**: Unit
**Automated**: Yes

**Test Steps**:
1. Play multiple tracks
2. Verify recent tracks updates
3. Check maximum 10 tracks shown
4. Verify no duplicates
5. Check timestamp accuracy

**Expected Results**:
- List updates in real-time
- FIFO order maintained
- Duplicates filtered out
- Timestamps correct

---

### TC-009: Quality Information Display
**Category**: Metadata
**Priority**: P2
**Type**: Unit
**Automated**: Yes

**Test Steps**:
1. Load metadata with quality info
2. Verify source quality displays
3. Verify stream quality displays
4. Test with missing quality data
5. Check format (e.g., "24-bit 96kHz")

**Expected Results**:
- Quality info formatted correctly
- "Unknown" for missing data
- Updates with metadata

---

## Rating System Tests

### TC-010: Submit Like Rating
**Category**: Rating System
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Play any track
2. Click thumbs up button
3. Verify visual feedback
4. Check API call succeeds
5. Verify count updates

**Expected Results**:
- Button highlights on click
- API responds < 500ms
- Count increments by 1
- Rating persists on refresh

**Test Data**:
```json
{
  "songId": "test-song-001",
  "rating": 1,
  "userIdentifier": "test-user-001"
}
```

---

### TC-011: Toggle Rating
**Category**: Rating System
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Submit like rating
2. Click thumbs down
3. Verify like removed
4. Verify dislike added
5. Click thumbs down again
6. Verify rating cleared

**Expected Results**:
- Only one rating active at a time
- Counts update correctly
- Toggle behavior works
- Database updates properly

---

### TC-012: Rating Persistence
**Category**: Rating System
**Priority**: P1
**Type**: E2E
**Automated**: Yes

**Test Steps**:
1. Rate a song
2. Refresh page
3. Navigate to same song
4. Verify rating preserved
5. Clear browser data
6. Verify rating still exists

**Expected Results**:
- Rating tied to user identifier
- Survives page refresh
- Persists in database
- Not affected by cache clear

---

## Database Operations Tests

### TC-013: SQLite Connection
**Category**: Database
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Start application with SQLite
2. Verify connection established
3. Test basic CRUD operations
4. Check connection pooling
5. Test concurrent operations

**Expected Results**:
- Connection < 100ms
- All operations succeed
- No lock conflicts
- Handles concurrent requests

---

### TC-014: PostgreSQL Connection
**Category**: Database
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Configure PostgreSQL mode
2. Start application
3. Verify pool creation
4. Test failover (if configured)
5. Check connection limits

**Expected Results**:
- Pool initialized correctly
- Connections reused
- Failover works
- Respects max connections

---

### TC-015: Database Migration
**Category**: Database
**Priority**: P1
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Run migration script
2. Verify schema created
3. Check indexes created
4. Test data migration
5. Verify data integrity

**Expected Results**:
- Migrations run in order
- No data loss
- Indexes improve performance
- Rollback possible

---

## API Endpoint Tests

### TC-016: Health Check Endpoint
**Category**: API
**Priority**: P0
**Type**: Unit
**Automated**: Yes

**Test Steps**:
1. GET /api/health
2. Verify 200 status
3. Check response time
4. Verify response format
5. Test under load

**Expected Results**:
- Always returns 200 OK
- Response < 50ms
- JSON format correct
- Handles 1000 req/s

---

### TC-017: Create User Endpoint
**Category**: API
**Priority**: P1
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. POST /api/users with valid data
2. Verify 201 created
3. Check user in database
4. Test duplicate username
5. Test validation errors

**Expected Results**:
- User created successfully
- Proper error for duplicates
- Validation messages clear
- Response includes user ID

---

### TC-018: Get Song Ratings Endpoint
**Category**: API
**Priority**: P1
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. GET /api/songs/:id/ratings
2. Verify rating counts
3. Include user identifier
4. Check user's rating
5. Test non-existent song

**Expected Results**:
- Correct counts returned
- User rating included
- 404 for missing songs
- Response < 200ms

---

## Security Tests

### TC-019: SQL Injection Prevention
**Category**: Security
**Priority**: P0
**Type**: Security
**Automated**: Yes

**Test Steps**:
1. Submit rating with SQL injection
2. Test user creation with injection
3. Try URL parameter injection
4. Test special characters
5. Verify all queries parameterized

**Expected Results**:
- All attempts blocked
- No database errors
- Proper sanitization
- Parameterized queries only

**Test Payloads**:
```sql
'; DROP TABLE users; --
' OR '1'='1
UNION SELECT * FROM users
```

---

### TC-020: XSS Prevention
**Category**: Security
**Priority**: P0
**Type**: Security
**Automated**: Yes

**Test Steps**:
1. Submit XSS in song rating
2. Try script tags in metadata
3. Test event handlers
4. Check output encoding
5. Verify CSP headers

**Expected Results**:
- Scripts don't execute
- Proper HTML escaping
- CSP blocks inline scripts
- No alert boxes

**Test Payloads**:
```javascript
<script>alert('XSS')</script>
<img src=x onerror=alert('XSS')>
javascript:alert('XSS')
```

---

### TC-021: Rate Limiting
**Category**: Security
**Priority**: P1
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Send 100 requests rapidly
2. Verify rate limit triggered
3. Check 429 status returned
4. Wait for reset
5. Verify access restored

**Expected Results**:
- Rate limit at 100 req/min
- Clear error message
- Reset after timeout
- Per-IP limiting

---

## Performance Tests

### TC-022: Page Load Performance
**Category**: Performance
**Priority**: P1
**Type**: Performance
**Automated**: Yes

**Metrics to Measure**:
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms

---

### TC-023: API Response Times
**Category**: Performance
**Priority**: P1
**Type**: Performance
**Automated**: Yes

**Endpoints to Test**:
| Endpoint | Target | Critical |
|----------|--------|----------|
| /api/health | < 50ms | < 100ms |
| /api/users | < 100ms | < 200ms |
| /api/songs/rate | < 150ms | < 300ms |
| /api/songs/:id/ratings | < 100ms | < 200ms |

---

### TC-024: Memory Usage
**Category**: Performance
**Priority**: P2
**Type**: Performance
**Automated**: Partial

**Test Steps**:
1. Monitor initial memory
2. Play for 1 hour
3. Check memory growth
4. Verify no memory leaks
5. Test with multiple tabs

**Expected Results**:
- Initial < 50MB
- Growth < 10MB/hour
- No memory leaks
- Garbage collection works

---

## Cross-Browser Tests

### TC-025: Chrome Compatibility
**Category**: Compatibility
**Priority**: P0
**Type**: E2E
**Automated**: Yes

**Versions**: Latest, Latest-1

**Test Areas**:
- Audio playback
- UI rendering
- Console errors
- Performance
- PWA features

---

### TC-026: Firefox Compatibility
**Category**: Compatibility
**Priority**: P0
**Type**: E2E
**Automated**: Yes

**Specific Checks**:
- HLS.js compatibility
- Audio codec support
- CSS rendering
- JavaScript features

---

### TC-027: Safari Compatibility
**Category**: Compatibility
**Priority**: P0
**Type**: E2E
**Automated**: Partial

**Specific Checks**:
- Native HLS support
- iOS audio policies
- Touch interactions
- PWA limitations

---

### TC-028: Mobile Browsers
**Category**: Compatibility
**Priority**: P1
**Type**: E2E
**Automated**: Partial

**Devices**:
- iOS Safari (iPhone/iPad)
- Chrome Mobile (Android)
- Samsung Internet

**Test Areas**:
- Touch controls
- Responsive design
- Audio autoplay policies
- Performance on mobile

---

## PWA Feature Tests

### TC-029: Service Worker Installation
**Category**: PWA
**Priority**: P2
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Load application
2. Verify SW registers
3. Check caching strategy
4. Test offline mode
5. Verify updates

**Expected Results**:
- SW installs on first visit
- Assets cached properly
- Basic offline support
- Updates on new version

---

### TC-030: App Installation
**Category**: PWA
**Priority**: P3
**Type**: E2E
**Automated**: No

**Test Steps**:
1. Visit on mobile
2. See install prompt
3. Install app
4. Launch from home screen
5. Test app features

**Expected Results**:
- Install prompt appears
- Adds to home screen
- Launches fullscreen
- All features work

---

## Error Handling Tests

### TC-031: Network Error Recovery
**Category**: Error Handling
**Priority**: P1
**Type**: Integration
**Automated**: Partial

**Test Steps**:
1. Disconnect network
2. Verify error message
3. Reconnect network
4. Verify auto-recovery
5. Check state consistency

**Expected Results**:
- Clear error message
- No crashes
- Automatic retry
- State preserved

---

### TC-032: API Error Handling
**Category**: Error Handling
**Priority**: P1
**Type**: Integration
**Automated**: Yes

**Test Scenarios**:
- 400 Bad Request
- 401 Unauthorized
- 404 Not Found
- 500 Server Error
- Timeout

**Expected Behavior**:
- User-friendly messages
- Retry mechanism
- Fallback behavior
- Error logging

---

### TC-033: Stream Error Recovery
**Category**: Error Handling
**Priority**: P0
**Type**: Integration
**Automated**: Yes

**Test Steps**:
1. Simulate stream 404
2. Verify error handling
3. Test manifest errors
4. Check chunk failures
5. Verify recovery attempts

**Expected Results**:
- Graceful degradation
- Retry logic works
- Clear error messages
- No infinite loops

---

## Accessibility Tests

### TC-034: Keyboard Navigation
**Category**: Accessibility
**Priority**: P2
**Type**: E2E
**Automated**: Partial

**Test Steps**:
1. Tab through controls
2. Use Enter to activate
3. Use arrow keys for slider
4. Test escape key
5. Verify focus indicators

**Expected Results**:
- All controls reachable
- Logical tab order
- Visual focus indicators
- Keyboard shortcuts work

---

### TC-035: Screen Reader Support
**Category**: Accessibility
**Priority**: P2
**Type**: E2E
**Automated**: No

**Test Steps**:
1. Test with NVDA/JAWS
2. Verify ARIA labels
3. Check role attributes
4. Test state announcements
5. Verify landmarks

**Expected Results**:
- All content readable
- Proper semantics
- State changes announced
- Navigation possible

---

## Test Execution Schedule

| Test Category | Frequency | Trigger |
|---------------|-----------|---------|
| Critical Path (P0) | Every commit | Automated |
| High Priority (P1) | Every PR | Automated |
| Medium Priority (P2) | Daily | Scheduled |
| Low Priority (P3) | Weekly | Manual |
| Security | Weekly | Scheduled |
| Performance | Before release | Manual |
| Accessibility | Monthly | Manual |
| Cross-browser | Before release | Automated |

## Test Data Requirements

### Standard Test Data Set
```javascript
export const testData = {
  users: [
    { id: 'user-001', username: 'testuser1', email: 'test1@example.com' },
    { id: 'user-002', username: 'testuser2', email: 'test2@example.com' }
  ],
  songs: [
    { id: 'song-001', artist: 'Test Artist 1', title: 'Test Song 1' },
    { id: 'song-002', artist: 'Test Artist 2', title: 'Test Song 2' }
  ],
  ratings: [
    { songId: 'song-001', userId: 'user-001', rating: 1 },
    { songId: 'song-001', userId: 'user-002', rating: -1 }
  ]
};
```

## Regression Test Suite

### Must-Pass Tests for Release
1. TC-001: Stream Initialization
2. TC-002: Play/Pause Functionality
3. TC-005: Elapsed Time Tracking
4. TC-006: Track Information Display
5. TC-010: Submit Like Rating
6. TC-013/014: Database Connection
7. TC-016: Health Check Endpoint
8. TC-019: SQL Injection Prevention
9. TC-031: Network Error Recovery

### Recently Fixed Issues (Extra Focus)
- **Issue #11**: Elapsed time reset on track change
  - Test cases: TC-005
  - Added specific regression test
  - Monitor for 3 releases