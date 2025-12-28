# Implementation Plan: API Optimization

## Overview

This implementation plan breaks down the API optimization work into discrete, incremental tasks. Each task builds on previous tasks and focuses on code changes only. The implementation follows the strict constraints: NO UI/UX changes, NO API contract changes, NO database changes.

## Tasks

- [x] 1. Create APIDeduplicator utility
  - Create `flowpos/src/utils/APIDeduplicator.js`
  - Wrap existing `RequestDeduplicator` with public API
  - Add endpoint key constants (PRODUCTS, ORDERS, STORE, SUBSCRIPTION)
  - Add `isInFlight()` method to check pending requests
  - Export singleton instance for global use
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [ ]* 1.1 Write property test for APIDeduplicator
  - **Property 1: Request Deduplication Invariant**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [x] 2. Create RetryController utility
  - Create `flowpos/src/utils/RetryController.js`
  - Implement exponential backoff (base 1000ms, max 10000ms)
  - Set max attempts to 3
  - Add method check to skip retry for POST/PUT/DELETE
  - Return clean error after max retries
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 2.1 Write property test for RetryController
  - **Property 5: Retry with Exponential Backoff**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [x] 3. Create NetworkGuard utility
  - Create `flowpos/src/utils/NetworkGuard.js`
  - Add `isOnline()` method using NetInfo
  - Add `guardedApiCall()` method that blocks when offline
  - Return OfflineError immediately when offline
  - Ensure NO queuing of offline calls
  - Ensure NO cache writes when offline
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 3.1 Write property test for NetworkGuard
  - **Property 6: Offline Blocking**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 4. Create CallCounter utility
  - Create `flowpos/src/utils/CallCounter.js`
  - Track call counts per endpoint per session
  - Define thresholds (products: 20, orders: 20, store: 10, subscription: 5)
  - Log warning when threshold exceeded
  - Do NOT block calls when threshold exceeded
  - Add reset method for session start
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 4.1 Write property test for CallCounter
  - **Property 7: API Call Tracking**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 5. Checkpoint - Ensure all utility tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Integrate APIDeduplicator into ProductsService
  - Import APIDeduplicator in `flowpos/src/services/ProductsService.js`
  - Wrap `getProductsFromCloud()` with deduplication
  - Use endpoint key `PRODUCTS`
  - Verify existing deduplicator usage is consistent
  - _Requirements: 1.2_

- [x] 7. Integrate APIDeduplicator into OrdersService
  - Import APIDeduplicator in `flowpos/src/services/OrdersService.js`
  - Wrap `getOrdersFromCloud()` with deduplication
  - Use endpoint key `ORDERS`
  - _Requirements: 1.3_

- [x] 8. Integrate RetryController into NetworkService
  - Import RetryController in `flowpos/src/services/NetworkService.js`
  - Wrap GET requests in `apiCall()` with retry logic
  - Skip retry for POST/PUT/DELETE methods
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 9. Integrate NetworkGuard into NetworkService
  - Import NetworkGuard in `flowpos/src/services/NetworkService.js`
  - Add offline check at start of `apiCall()`
  - Return OfflineError immediately when offline
  - _Requirements: 7.1, 7.2_

- [x] 10. Integrate CallCounter into NetworkService
  - Import CallCounter in `flowpos/src/services/NetworkService.js`
  - Increment count after each API call
  - Log warning when threshold exceeded
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Checkpoint - Ensure service integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Optimize POSScreen lifecycle
  - Update `flowpos/src/screens/POSScreen.js`
  - Remove duplicate `refreshProducts()` call on focus if cache is fresh
  - Check `lastFetchRef` timestamp before calling API
  - Use 5-minute staleness threshold for focus refresh
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 13. Optimize InventoryScreen lifecycle
  - Update `flowpos/src/screens/manage/InventoryScreen.js`
  - Remove duplicate API calls on mount and focus
  - Check cache staleness before refresh
  - _Requirements: 3.1, 3.2, 3.4_

- [x] 14. Optimize ManageScreen lifecycle
  - Update `flowpos/src/screens/ManageScreen.js`
  - Remove unnecessary API calls on tab switch
  - Use cached data when available
  - _Requirements: 3.3, 3.4_

- [x] 15. Optimize OrdersScreen lifecycle
  - Update `flowpos/src/screens/OrdersScreen.js`
  - Remove `checkWhatsAppStatus()` call on every focus
  - Cache WhatsApp status with staleness check
  - _Requirements: 3.2, 3.4_

- [x] 16. Checkpoint - Ensure screen optimization tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Fix duplicate GET /api/store on login
  - Update `flowpos/src/context/AuthContext.js`
  - Consolidate StoreSettingsContext and AppSettingsContext fetch
  - Make single API call, distribute data to both contexts
  - _Requirements: 1.4, 2.1, 2.2_

- [ ]* 17.1 Write property test for cache-first access
  - **Property 2: Cache-First Access Pattern**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 8.1, 8.2, 8.3, 8.4**

- [x] 18. Optimize DataSyncContext background sync
  - Update `flowpos/src/context/DataSyncContext.js`
  - Add cache staleness check before background fetch
  - Skip API call if cache is fresh
  - Respect network availability
  - _Requirements: 4.2, 4.3, 4.4_

- [ ]* 18.1 Write property test for background vs user-triggered
  - **Property 4: User-Triggered vs Background Call Separation**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [x] 19. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 20. Create API optimization validation report
  - Document APIs optimized
  - Document before vs after call counts
  - Document where deduplication was applied
  - Document where cache-first logic was enforced
  - Document retry logic summary
  - Document any assumptions made
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All changes are frontend-only, no backend modifications
