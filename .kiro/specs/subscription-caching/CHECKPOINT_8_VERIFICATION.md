# Checkpoint 8: Full Cache Lifecycle Verification Guide

This checkpoint verifies the complete subscription caching lifecycle implemented in Tasks 1-7. It covers all cache operations from login to logout, including app restart recovery.

## Prerequisites

1. Backend server running (`flowposbackend`)
2. FlowPOS app running (`flowpos`)
3. A test user account with valid credentials
4. Access to console logs (React Native debugger or Metro bundler)

## Full Cache Lifecycle Overview

The subscription cache lifecycle consists of these phases:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SUBSCRIPTION CACHE LIFECYCLE                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  1. LOGIN FLOW                                                               │
│     ├── User logs in successfully                                            │
│     ├── AuthContext triggers subscription fetch (non-blocking)               │
│     ├── SubscriptionContext fetches from backend                             │
│     └── Data stored in memory + AsyncStorage                                 │
│                                                                              │
│  2. CACHE-FIRST READS                                                        │
│     ├── Screen requests subscription data                                    │
│     ├── Cache hit → Return immediately (no API call)                         │
│     └── Cache miss → Fetch from backend → Store in cache                     │
│                                                                              │
│  3. WRITE-THROUGH UPDATES                                                    │
│     ├── Subscription update succeeds                                         │
│     ├── Cache updated immediately with response                              │
│     └── No refetch required                                                  │
│                                                                              │
│  4. APP RESTART RECOVERY                                                     │
│     ├── App starts                                                           │
│     ├── Load cached data from AsyncStorage immediately                       │
│     ├── Check if data is stale                                               │
│     └── Trigger background refresh if stale (non-blocking)                   │
│                                                                              │
│  5. LOGOUT CLEANUP                                                           │
│     ├── User logs out                                                        │
│     ├── Clear in-memory cache                                                │
│     ├── Clear AsyncStorage                                                   │
│     └── Reset to initial state                                               │
│                                                                              │
│  6. ERROR HANDLING                                                           │
│     ├── Network failure → Use UNKNOWN state                                  │
│     ├── API error → Use UNKNOWN state                                        │
│     └── App continues functioning normally                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Verification Tests

### Test 1: Login Flow - Cache Population (Requirements 2.1, 2.5, 2.6)

**Steps:**
1. Ensure you are logged out (clear app data if needed)
2. Open the app and log in with valid credentials
3. Watch the console logs during login

**Expected Console Logs:**
```
🔐 Starting login process...
✅ Login API successful, storing data...
💾 Data stored, updating state...
📦 Triggering subscription fetch (non-blocking)...
🎉 Login complete!
[SubscriptionCache] Triggering subscription fetch after login (non-blocking)
[SubscriptionCache] Data fetched and stored in cache
[SubscriptionCache] Data stored in AsyncStorage
```

**Verification Checklist:**
- [ ] Login completes without delay (subscription fetch is non-blocking)
- [ ] Navigation to main screen happens immediately
- [ ] Subscription data is fetched in background
- [ ] Data is stored in both memory and AsyncStorage

---

### Test 2: Cache-First Read Strategy (Requirements 3.1, 3.2, 3.3)

**Steps:**
1. After successful login, navigate to a screen that uses subscription data
2. Navigate away and back to the same screen
3. Watch console logs for cache behavior

**Expected Console Logs (First Access):**
```
[SubscriptionCache] Cache hit - returning cached data immediately
```

**Expected Console Logs (Subsequent Access):**
```
[SubscriptionCache] Cache hit - returning cached data immediately
```

**Verification Checklist:**
- [ ] First access returns cached data (from login fetch)
- [ ] Subsequent accesses return cached data immediately
- [ ] NO additional API calls are made
- [ ] All screens receive the same subscription data

---

### Test 3: Request Deduplication (Requirements 1.3, 1.4, 1.5)

**Steps:**
1. Clear the cache (logout and login again)
2. Trigger multiple simultaneous subscription requests
3. Watch console logs for deduplication

**Expected Console Logs:**
```
[SubscriptionCache] Cache miss - fetching from backend
[SubscriptionCache] Returning in-flight promise (deduplication)
[SubscriptionCache] Returning in-flight promise (deduplication)
[SubscriptionCache] Data fetched and stored in cache
```

**Verification Checklist:**
- [ ] Only ONE API call is made despite multiple requests
- [ ] All requesters receive the same data
- [ ] In-flight promise is reused for concurrent requests

---

### Test 4: Write-Through Cache Update (Requirements 6.1, 6.2, 6.3)

**Steps:**
1. Navigate to subscription/settings screen
2. Trigger a subscription update (if available)
3. Verify cache is updated immediately

**Expected Console Logs:**
```
[SubscriptionCache] Cache updated via write-through
[SubscriptionCache] Data stored in AsyncStorage
```

**Verification Checklist:**
- [ ] Cache is updated immediately after successful update
- [ ] NO refetch API call is made
- [ ] UI reflects new subscription data immediately
- [ ] Both memory and AsyncStorage are updated

---

### Test 5: App Restart Recovery (Requirements 10.1, 10.2, 10.3, 10.4, 10.5)

**Steps:**
1. Login and ensure subscription data is cached
2. Close the app completely (force close)
3. Reopen the app
4. Watch console logs during startup

**Expected Console Logs (Fresh Cache):**
```
[SubscriptionCache] Loaded cached data from AsyncStorage immediately
[SubscriptionCache] Cached data is fresh, no background refresh needed
```

**Expected Console Logs (Stale Cache - older than 24 hours):**
```
[SubscriptionCache] Loaded cached data from AsyncStorage immediately
[SubscriptionCache] Cache is stale: { ageMs: ..., thresholdMs: 86400000, ageHours: ... }
[SubscriptionCache] Triggering background refresh for stale data
[SubscriptionCache] Data fetched and stored in cache
```

**Verification Checklist:**
- [ ] Cached data is loaded immediately on app start
- [ ] Subscription data is available without waiting for API
- [ ] UI is NOT blocked during cache loading
- [ ] Stale data triggers background refresh (non-blocking)
- [ ] Fresh data does NOT trigger unnecessary refresh

---

### Test 6: Logout Cleanup (Requirements 7.1, 7.2, 7.3, 7.4)

**Steps:**
1. Ensure you are logged in with subscription data cached
2. Log out of the app
3. Watch console logs during logout
4. Log in with a different user (or same user)

**Expected Console Logs (Logout):**
```
🧹 Clearing subscription cache on logout...
[SubscriptionCache] Clearing subscription cache on logout
[SubscriptionCache] Cache cleared successfully
✅ Complete logout - all data cleared
```

**Expected Console Logs (New Login):**
```
[SubscriptionCache] No cached data, using UNKNOWN state
📦 Triggering subscription fetch (non-blocking)...
[SubscriptionCache] Triggering subscription fetch after login (non-blocking)
[SubscriptionCache] Data fetched and stored in cache
```

**Verification Checklist:**
- [ ] In-memory cache is cleared on logout
- [ ] AsyncStorage subscription data is cleared on logout
- [ ] New login fetches fresh data from backend
- [ ] No data leakage between user sessions

---

### Test 7: Error Handling - Network Failure (Requirements 8.2, 8.3, 8.5, 8.6)

**Steps:**
1. Login successfully and cache subscription data
2. Enable airplane mode / disconnect from network
3. Try to refresh subscription data
4. Verify app continues functioning

**Expected Console Logs:**
```
[SubscriptionCache] Network error during fetch: { operation: 'fetch', error: '...', timestamp: '...' }
[SubscriptionCache] Keeping cached data despite fetch error
```

OR (if no cached data):
```
[SubscriptionCache] Network error during fetch: { operation: 'fetch', error: '...', timestamp: '...' }
[SubscriptionCache] Set UNKNOWN state due to fetch error
```

**Verification Checklist:**
- [ ] App does NOT crash on network error
- [ ] Error is logged internally (not exposed to user)
- [ ] Cached data is preserved if available
- [ ] UNKNOWN state is used if no cached data
- [ ] All features remain accessible (no blocking)

---

### Test 8: Error Handling - API Error (Requirements 8.4, 8.5, 8.6)

**Steps:**
1. Simulate an API error (e.g., invalid token)
2. Try to fetch subscription data
3. Verify app continues functioning

**Expected Console Logs:**
```
[SubscriptionCache] API returned error: { operation: 'fetch', status: ..., message: '...', timestamp: '...' }
[SubscriptionCache] Set UNKNOWN state due to fetch error
```

**Verification Checklist:**
- [ ] App does NOT crash on API error
- [ ] Error is logged internally (not exposed to user)
- [ ] UNKNOWN state is used on error
- [ ] All features remain accessible (no blocking)

---

### Test 9: UNKNOWN State Behavior (Requirements 3.5, 8.2, 8.3)

**Steps:**
1. Force UNKNOWN state (disconnect network before login, or clear cache)
2. Navigate through the app
3. Verify all features work normally

**Expected UNKNOWN State:**
```javascript
{
  plan: 'unknown',
  status: 'UNKNOWN',
  startedAt: null,
  expiresAt: null,
  limits: {
    maxProducts: 'unlimited',
    maxTransactions: 'unlimited',
    maxDevices: 999,
    storageGB: 999
  },
  features: {},
  planDetails: {
    name: 'Unknown',
    price: 0,
    currency: 'INR'
  }
}
```

**Verification Checklist:**
- [ ] UNKNOWN state has no enforcement (unlimited limits)
- [ ] All features remain accessible
- [ ] No UI elements are hidden
- [ ] App functions normally with UNKNOWN state

---

### Test 10: Session Isolation (Requirements 7.3, 7.4)

**Steps:**
1. Login as User A, verify subscription data
2. Logout
3. Login as User B
4. Verify User B gets their own subscription data (not User A's)

**Verification Checklist:**
- [ ] User A's data is completely cleared on logout
- [ ] User B gets fresh data from backend
- [ ] No data leakage between users
- [ ] Each user session is isolated

---

## Console Log Patterns Reference

### Success Patterns (Expected):
```
[SubscriptionCache] Loaded cached data from AsyncStorage immediately
[SubscriptionCache] Cache hit - returning cached data immediately
[SubscriptionCache] Data fetched and stored in cache
[SubscriptionCache] Subscription refreshed successfully
[SubscriptionCache] Returning in-flight promise (deduplication)
[SubscriptionCache] Cache updated via write-through
[SubscriptionCache] Cache cleared successfully
[SubscriptionCache] Cached data is fresh, no background refresh needed
[SubscriptionCache] Triggering background refresh for stale data
[SubscriptionCache] Global subscription actions registered
```

### Error Patterns (Should NOT crash app):
```
[SubscriptionCache] Error: { operation: '...', error: '...', timestamp: '...' }
[SubscriptionCache] Set UNKNOWN state due to fetch error
[SubscriptionCache] Keeping cached data despite fetch error
[SubscriptionCache] Network error during fetch: { ... }
[SubscriptionCache] API returned error: { ... }
[SubscriptionCache] Error parsing cached data: { ... }
[SubscriptionCache] Background refresh failed: { ... }
```

---

## Final Verification Checklist

| Feature | Requirement | Status |
|---------|-------------|--------|
| Login triggers subscription fetch | 2.1 | ⬜ |
| Fetch is non-blocking | 2.5, 2.6 | ⬜ |
| Data stored in memory + AsyncStorage | 2.2, 2.3 | ⬜ |
| Cache-first read strategy | 3.1, 3.2, 3.3 | ⬜ |
| Request deduplication | 1.3, 1.4, 1.5 | ⬜ |
| Write-through cache update | 6.1, 6.2, 6.3 | ⬜ |
| App restart recovery | 10.1, 10.2 | ⬜ |
| Stale data background refresh | 10.3, 10.4, 10.5 | ⬜ |
| Logout clears memory cache | 7.1 | ⬜ |
| Logout clears AsyncStorage | 7.2 | ⬜ |
| Fresh data on new login | 7.3 | ⬜ |
| Session isolation | 7.4 | ⬜ |
| UNKNOWN state on error | 8.2, 8.3 | ⬜ |
| Error logging (internal) | 8.4 | ⬜ |
| App continues on error | 8.5, 8.6 | ⬜ |
| No feature blocking | 5.1, 5.2 | ⬜ |

---

## Notes

- This checkpoint is for manual verification only
- No automated tests are required for this checkpoint
- All features should work without blocking the UI or crashing the app
- The implementation should be verified by running the app and checking console logs
- If any test fails, refer to the specific requirement and implementation in SubscriptionContext.js

## Completion Criteria

This checkpoint is complete when:
1. All 10 verification tests pass
2. All items in the final verification checklist are checked
3. No crashes or blocking behavior observed
4. Console logs match expected patterns
