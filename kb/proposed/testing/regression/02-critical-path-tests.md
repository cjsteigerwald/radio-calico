# Critical Path Testing Scenarios

## Overview

Critical path tests represent the most important user journeys that must always function correctly. These tests have the highest priority and must pass before any release.

## Critical User Journeys

### CP-001: First Time User Experience
**Priority**: P0
**Frequency**: Every build
**Dependencies**: None

#### Test Steps
1. User visits RadioCalico homepage
2. Audio player loads successfully
3. Stream starts playing within 5 seconds
4. Current track metadata displays
5. Album artwork appears (or placeholder)
6. Play/pause controls respond
7. Volume control adjusts audio

#### Validation Points
- [ ] No JavaScript errors in console
- [ ] Audio element initialized
- [ ] HLS stream connected
- [ ] Metadata visible within 10 seconds
- [ ] Controls interactive immediately

#### Known Issues
- **Issue #11**: Elapsed time must reset on track change (FIXED)

---

### CP-002: Audio Streaming Playback
**Priority**: P0
**Frequency**: Every commit
**Dependencies**: CDN availability

#### Test Steps
1. Click play button
2. Audio begins streaming
3. Monitor for 5 minutes continuous play
4. Verify no buffering interruptions
5. Check audio quality consistency
6. Validate elapsed time increments

#### Validation Points
- [ ] Stream URL accessible
- [ ] HLS chunks loading sequentially
- [ ] Bitrate adaptation working
- [ ] No audio dropouts
- [ ] Elapsed time accurate

#### Regression Cases
```javascript
// Test: Elapsed time resets on track change
test('elapsed time resets when track changes', async () => {
  await player.play();
  await wait(30000); // 30 seconds
  const oldElapsed = player.getElapsedTime();

  await simulateTrackChange();
  await wait(1000);

  expect(player.getElapsedTime()).toBeLessThan(5);
  expect(player.getElapsedTime()).not.toBe(oldElapsed);
});
```

---

### CP-003: Song Rating System
**Priority**: P0
**Frequency**: Every build
**Dependencies**: Backend API, Database

#### Test Steps
1. Play any track
2. Click thumbs up button
3. Verify visual feedback
4. Check rating count updates
5. Click thumbs down button
6. Verify rating changes
7. Refresh page
8. Confirm rating persists

#### Validation Points
- [ ] API endpoint responds < 500ms
- [ ] Database write successful
- [ ] UI updates immediately
- [ ] User identifier consistent
- [ ] Rating toggle logic correct

#### Test Data
```json
{
  "test_songs": [
    {
      "songId": "test-song-001",
      "artist": "Test Artist",
      "title": "Test Song",
      "expectedRating": 1
    }
  ]
}
```

---

### CP-004: Track Metadata Updates
**Priority**: P0
**Frequency**: Every build
**Dependencies**: Metadata service

#### Test Steps
1. Start playback
2. Wait for track metadata
3. Monitor metadata polling (10s intervals)
4. Detect track change
5. Verify new metadata loads
6. Check recent tracks updates
7. Validate quality information

#### Validation Points
- [ ] Metadata fetches every 10 seconds
- [ ] Track changes detected accurately
- [ ] Artist/Title/Album displayed
- [ ] Recent tracks list updates
- [ ] Quality info displayed (if available)

#### Edge Cases
- Empty metadata fields
- Special characters in titles
- Very long artist/song names
- Rapid track changes
- Network interruption during fetch

---

### CP-005: Database Operations
**Priority**: P0
**Frequency**: Every build
**Dependencies**: Database (SQLite/PostgreSQL)

#### Test Steps
1. Verify database connection
2. Create test user
3. Submit song rating
4. Query rating counts
5. Update existing rating
6. Verify transaction integrity
7. Test connection pooling (PostgreSQL)

#### Validation Points
- [ ] Connection established < 100ms
- [ ] CRUD operations successful
- [ ] Transactions atomic
- [ ] Connection pool healthy
- [ ] Failover works (if configured)

#### Database Scenarios
```sql
-- Test: Unique constraint on ratings
INSERT INTO song_ratings (song_id, user_identifier, rating)
VALUES ('test-001', 'user-001', 1);

-- Should update, not duplicate
INSERT INTO song_ratings (song_id, user_identifier, rating)
VALUES ('test-001', 'user-001', -1)
ON CONFLICT (song_id, user_identifier)
DO UPDATE SET rating = EXCLUDED.rating;
```

---

### CP-006: Cross-Browser Compatibility
**Priority**: P0
**Frequency**: Before release
**Dependencies**: None

#### Browsers to Test
- Chrome (latest, latest-1)
- Firefox (latest, latest-1)
- Safari (latest, latest-1)
- Edge (latest)
- Mobile Safari (iOS 14+)
- Chrome Mobile (Android 10+)

#### Test Points
- [ ] Audio playback works
- [ ] UI renders correctly
- [ ] No console errors
- [ ] Touch controls responsive
- [ ] PWA features function

---

### CP-007: API Health and Availability
**Priority**: P0
**Frequency**: Continuous
**Dependencies**: Backend services

#### Endpoints to Monitor
```bash
# Health check
GET /api/health
Expected: 200 OK

# Database health
GET /api/health/db
Expected: 200 OK with connection status

# User operations
POST /api/users
GET /api/users

# Rating operations
POST /api/songs/rate
GET /api/songs/:id/ratings
```

#### Performance Thresholds
- Health check: < 50ms
- Database check: < 100ms
- API operations: < 200ms
- 99th percentile: < 500ms

---

### CP-008: Error Handling and Recovery
**Priority**: P0
**Frequency**: Every build
**Dependencies**: All components

#### Error Scenarios
1. **Network Failure**
   - Disconnect network
   - Verify graceful degradation
   - Reconnect and verify recovery

2. **Stream Interruption**
   - Simulate CDN failure
   - Check error message display
   - Verify auto-retry logic

3. **API Failures**
   - Mock 500 errors
   - Verify error handling
   - Check retry mechanism

4. **Database Unavailable**
   - Shutdown database
   - Verify error messages
   - Test fallback behavior

#### Recovery Validation
- [ ] Errors logged properly
- [ ] User-friendly messages shown
- [ ] Auto-recovery attempted
- [ ] No data corruption
- [ ] State consistency maintained

---

### CP-009: Performance Benchmarks
**Priority**: P0
**Frequency**: Before release
**Dependencies**: None

#### Key Metrics
| Metric | Target | Critical |
|--------|--------|----------|
| First Contentful Paint | < 1.5s | < 3s |
| Time to Interactive | < 3s | < 5s |
| Stream Start Time | < 3s | < 5s |
| API Response Time | < 200ms | < 500ms |
| Memory Usage | < 50MB | < 100MB |
| CPU Usage (idle) | < 5% | < 10% |

#### Load Testing
```javascript
// Concurrent user simulation
for (let i = 0; i < 100; i++) {
  await simulateUser({
    actions: ['visit', 'play', 'rate', 'pause'],
    duration: 300000 // 5 minutes
  });
}
```

---

### CP-010: Security Validations
**Priority**: P0
**Frequency**: Weekly
**Dependencies**: All components

#### Security Checks
1. **Input Validation**
   - SQL injection attempts
   - XSS payload testing
   - Command injection tests

2. **Authentication** (if implemented)
   - Session management
   - Token validation
   - Rate limiting

3. **Data Protection**
   - HTTPS enforcement
   - Secure headers
   - CORS configuration

4. **Dependency Scanning**
   ```bash
   npm audit
   npm outdated
   ```

---

## Test Execution Matrix

| Test ID | Manual | Automated | Frequency | Last Run | Status |
|---------|--------|-----------|-----------|----------|---------|
| CP-001 | ✓ | ✓ | Every build | - | - |
| CP-002 | ✓ | ✓ | Every commit | - | - |
| CP-003 | ✓ | ✓ | Every build | - | - |
| CP-004 | ✓ | Partial | Every build | - | - |
| CP-005 | ✓ | ✓ | Every build | - | - |
| CP-006 | ✓ | Planned | Release | - | - |
| CP-007 | - | ✓ | Continuous | - | - |
| CP-008 | ✓ | Partial | Every build | - | - |
| CP-009 | ✓ | ✓ | Release | - | - |
| CP-010 | ✓ | ✓ | Weekly | - | - |

## Failure Response

### Severity Levels
- **Critical**: Block release, immediate fix required
- **High**: Fix before next release
- **Medium**: Fix within sprint
- **Low**: Track in backlog

### Escalation Path
1. Test fails in CI/CD
2. Developer notified via Slack/email
3. If critical: Team lead notified
4. If not fixed in 2 hours: Manager escalation
5. Rollback decision point at 4 hours

## Test Data Management

### Data Requirements
- Minimum 10 test users
- 50+ test songs with ratings
- Various metadata formats
- Edge case data (nulls, special chars)
- Performance test datasets (1000+ records)

### Data Refresh Strategy
- Daily: Reset test database
- Weekly: Update test metadata
- Monthly: Refresh test users
- Quarterly: Review test data relevance