# Implementation Plan: Subscription Caching

## Overview

This implementation plan creates a centralized subscription caching system using React Context. The approach refactors the existing `useSubscription` hook to use a new `SubscriptionContext` as the single cache owner, integrates with `AuthContext` for login/logout flows, and ensures all screens access subscription data through the unified hook.

## Tasks

- [x] 1. Create SubscriptionContext as the single cache owner
  - [x] 1.1 Create SubscriptionContext with Provider component
    - Create `flowpos/src/context/SubscriptionContext.js`
    - Implement in-memory cache with `inFlightPromise` for request deduplication
    - Implement AsyncStorage persistence for subscription data
    - Expose subscription data, loading state, and error state
    - Implement `refreshSubscription` and `clearCache` actions
    - Implement `updateSubscriptionCache` for write-through updates
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3_

- [x] 2. Implement safe default state and failsafe behavior
  - [x] 2.1 Implement UNKNOWN subscription state
    - Define `UNKNOWN_SUBSCRIPTION_STATE` constant with no enforcement
    - Ensure status is 'UNKNOWN' when data unavailable
    - Set limits to 'unlimited' or high values (no enforcement)
    - Leave features empty (no feature checks)
    - _Requirements: 3.5, 8.2, 8.3_

  - [x] 2.2 Implement error handling with safe defaults
    - Catch all fetch errors and set UNKNOWN state
    - Log errors internally without exposing to users
    - Ensure app continues functioning on errors
    - _Requirements: 8.4, 8.5, 8.6_

- [x] 3. Implement cache-first read strategy
  - [x] 3.1 Implement cache-first logic in SubscriptionContext
    - Check in-memory cache first
    - Return cached data immediately if available
    - Fetch from backend only on cache miss
    - Store response in cache after successful fetch
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Verify core caching works manually

- [x] 5. Integrate with AuthContext for login flow
  - [x] 5.1 Trigger subscription fetch after successful login
    - Modify `AuthContext.login` to call subscription fetch
    - Ensure fetch is non-blocking (does not delay navigation)
    - Store subscription data in both memory and AsyncStorage
    - _Requirements: 2.1, 2.5, 2.6_

  - [x] 5.2 Implement logout cleanup
    - Clear subscription cache on logout
    - Clear both in-memory state and AsyncStorage
    - Reset to initial state
    - _Requirements: 7.1, 7.2_

- [x] 6. Implement write-through cache update
  - [x] 6.1 Implement updateSubscriptionCache method
    - Update cache immediately with new data
    - Update both memory and AsyncStorage
    - Do not trigger refetch after update
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Implement app restart recovery
  - [x] 7.1 Load cached data from AsyncStorage on app start
    - Check AsyncStorage for existing subscription data
    - Load into memory immediately if available
    - Make data available without waiting for API
    - _Requirements: 10.1, 10.2_

  - [x] 7.2 Implement background refresh for stale data
    - Check timestamp of cached data
    - Trigger background refresh if stale (older than session)
    - Do not block UI during refresh
    - _Requirements: 10.3, 10.4, 10.5_

- [x] 8. Checkpoint - Verify full cache lifecycle manually

- [x] 9. Refactor useSubscription hook to use SubscriptionContext
  - [x] 9.1 Update useSubscription hook
    - Import and use SubscriptionContext
    - Remove direct API calls from hook
    - Expose same interface for backward compatibility
    - _Requirements: 4.1, 4.2_

- [x] 10. Update App.js to include SubscriptionProvider
  - [x] 10.1 Wrap app with SubscriptionProvider
    - Add SubscriptionProvider inside AuthProvider
    - Ensure proper provider hierarchy
    - _Requirements: 4.1_

- [x] 11. Verify no plan enforcement exists
  - [x] 11.1 Audit SubscriptionContext for enforcement logic
    - Verify no canUserPerformAction calls
    - Verify no limit checking
    - Verify no feature blocking
    - Verify no UI hiding logic
    - _Requirements: 5.1, 5.2, 5.5, 5.6, 5.7_

- [x] 12. Final checkpoint - Manual integration verification
  - Verify subscription data is fetched once per session
  - Verify all screens receive consistent data
  - Verify logout clears all data
  - Verify app restart recovers cached data

## Notes

- Tests will be done manually by the user
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- The implementation uses JavaScript with React Native and AsyncStorage
