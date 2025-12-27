# Checkpoint 4: Core Caching Verification Guide

This checkpoint verifies that the core subscription caching functionality implemented in Tasks 1-3 works correctly.

## Prerequisites

1. Backend server running (`flowposbackend`)
2. FlowPOS app running (`flowpos`)
3. A test user account

## Verification Steps

### 1. Verify SubscriptionContext Creation (Task 1)

**File to check:** `flowpos/src/context/SubscriptionContext.js`

✅ Verify the following are implemented:
- [ ] `SubscriptionProvider` component exists
- [ ] In-memory cache with `inFlightPromiseRef` for request deduplication
- [ ] AsyncStorage persistence using `STORAGE_KEYS`
- [ ] `subscription`, `isLoading`, `error` state exposed
- [ ] `refreshSubscription`, `clearCache`, `updateSubscriptionCache` actions
- [ ] `getSubscription`, `hasCachedSubscription`, `getCachedSubscription` helpers

### 2. Verify UNKNOWN State and Failsafe Behavior (Task 2)

**Check `UNKNOWN_SUBSCRIPTION_STATE` constant:**
```javascript
// Expected structure:
{
  plan: 'unknown',
  status: 'UNKNOWN',
  startedAt: null,
  expiresAt: null,
  limits: {
    maxProducts: 'unlimited',      // No enforcement
    maxTransactions: 'unlimited',  // No enforcement
    maxDevices: 999,               // No enforcement
    storageGB: 999                 // No enforcement
  },
  features: {},                    // Empty - no feature checks
  planDetails: {
    name: 'Unknown',
    price: 0,
    currency: 'INR'
  }
}
```

✅ Verify failsafe behavior:
- [ ] Errors are logged internally with `console.error('[SubscriptionCache]...')`
- [ ] Errors are NOT exposed to users
- [ ] App continues functioning on errors (returns UNKNOWN state)

### 3. Verify Cache-First Read Strategy (Task 3)

**Test the `getSubscription` method logic:**

1. **Cache Hit Scenario:**
   - When `subscription` exists and `isCached` is true
   - Should return cached data immediately
   - Should NOT make API call

2. **Cache Miss Scenario:**
   - When cache is empty
   - Should fetch from backend
   - Should store response in cache after successful fetch

3. **Error Scenario:**
   - When fetch fails
   - Should return existing cached data if available
   - Should return UNKNOWN state if no cached data

## Manual Testing Steps

### Test 1: Initial Load (Cache Miss)

1. Clear AsyncStorage (logout and clear app data)
2. Login to the app
3. Check console logs for:
   ```
   [SubscriptionCache] No cached data, using UNKNOWN state
   ```
   OR
   ```
   [SubscriptionCache] Cache miss - fetching from backend
   [SubscriptionCache] Data fetched and stored in cache
   ```

### Test 2: Cache Hit

1. After successful login and subscription fetch
2. Navigate to a different screen
3. Navigate back
4. Check console logs for:
   ```
   [SubscriptionCache] Cache hit - returning cached data immediately
   ```
5. Verify NO new API calls are made

### Test 3: AsyncStorage Persistence

1. Login and let subscription data load
2. Close the app completely
3. Reopen the app
4. Check console logs for:
   ```
   [SubscriptionCache] Loaded cached data from AsyncStorage
   ```
5. Verify subscription data is available immediately

### Test 4: Error Handling

1. Disconnect from network (airplane mode)
2. Try to refresh subscription
3. Verify:
   - App does NOT crash
   - Error is logged internally
   - UNKNOWN state is used OR cached data is preserved
   - UI continues to function

### Test 5: Request Deduplication

1. Add temporary logging to track API calls
2. Trigger multiple simultaneous subscription requests
3. Verify only ONE API call is made
4. Verify all requesters receive the same data

## Console Log Patterns to Look For

**Success patterns:**
- `[SubscriptionCache] Loaded cached data from AsyncStorage`
- `[SubscriptionCache] Cache hit - returning cached data immediately`
- `[SubscriptionCache] Data fetched and stored in cache`
- `[SubscriptionCache] Subscription refreshed successfully`
- `[SubscriptionCache] Returning in-flight promise (deduplication)`

**Error patterns (should NOT crash app):**
- `[SubscriptionCache] Error: { operation: '...', error: '...', timestamp: '...' }`
- `[SubscriptionCache] Set UNKNOWN state due to fetch error`
- `[SubscriptionCache] Keeping cached data despite fetch error`

## Verification Checklist

| Feature | Status |
|---------|--------|
| SubscriptionContext created | ⬜ |
| In-memory cache works | ⬜ |
| AsyncStorage persistence works | ⬜ |
| Request deduplication works | ⬜ |
| UNKNOWN state defined correctly | ⬜ |
| Error handling returns safe defaults | ⬜ |
| Cache-first strategy works | ⬜ |
| Cache miss triggers fetch | ⬜ |
| Successful fetch stores in cache | ⬜ |
| App continues on errors | ⬜ |

## Notes

- This checkpoint is for manual verification only
- No automated tests are required for this checkpoint
- The implementation should be verified by running the app and checking console logs
- All features should work without blocking the UI or crashing the app
