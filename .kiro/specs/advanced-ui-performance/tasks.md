# Implementation Plan: Advanced UI Performance Optimization

## Overview

This implementation plan follows the strict 11-step sequence for advanced UI performance optimizations while preserving backend authority, API contracts, and ensuring complete rollback safety. Each step builds incrementally with mandatory validation checkpoints.

## Tasks

- [ ] 1. STEP 1 — ENFORCE SINGLE PRODUCT READ ENTRY POINT
  - Create ProductFetchCoordinator as the only way to read products
  - Search entire codebase for productsService.getProducts() calls
  - Replace all screen-level calls with ProductFetchCoordinator.fetchProducts()
  - Allow service calls only inside coordinator
  - Ensure manual refresh still hits API and coordinator returns cached data only when allowed
  - _Requirements: 1.1, 1.2, 1.6, 11.1, 11.2_

- [ ]* 1.1 Write property test for single entry point enforcement
  - **Property 1: Single Entry Point Enforcement**
  - **Validates: Requirements 1.1, 1.2, 1.6, 11.1, 11.2**

- [ ] 2. STEP 2 — SESSION PRODUCT STORE (READ-ONLY)
  - Create SessionProductStore for in-memory only storage
  - Store products array and lastFetch timestamp (diagnostic only)
  - Write only after API success, clear on logout/app restart
  - Never use for inventory validation, order eligibility, or payment logic
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [ ]* 2.1 Write property test for session store lifecycle management
  - **Property 2: Session Store Lifecycle Management**
  - **Validates: Requirements 2.4, 2.5, 5.5, 7.6**

- [ ]* 2.2 Write unit tests for session product store
  - Test store initialization and data structure
  - Test clearing behavior on logout/restart
  - Test non-persistence to AsyncStorage
  - _Requirements: 2.1, 2.6_

- [ ] 3. STEP 3 — MANUAL REFRESH OVERRIDE
  - Implement forceRefresh flag in coordinator
  - Pull-to-refresh bypasses session store and always hits API
  - Update session only on success, failure leaves session unchanged
  - _Requirements: 1.7, 4.10, 5.3, 7.3, 11.5_

- [ ]* 3.1 Write property test for manual refresh cache bypass
  - **Property 3: Manual Refresh Cache Bypass**
  - **Validates: Requirements 1.7, 4.10, 5.3, 7.3, 11.5**

- [ ] 4. STEP 4 — PRODUCT UI PROPAGATION AFTER API SUCCESS
  - Create UIUpdatePropagator for successful product API operations
  - After create/update/delete API success: update SessionProductStore and trigger UI re-render
  - No refetch products, no optimistic updates
  - API failure causes no UI changes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [ ]* 4.1 Write property test for successful API operation UI propagation
  - **Property 4: Successful API Operation UI Propagation**
  - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [ ]* 4.2 Write property test for API failure no-change guarantee
  - **Property 5: API Failure No-Change Guarantee**
  - **Validates: Requirements 3.5, 4.5**

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. STEP 5 — ORDER SUCCESS UI PROPAGATION (CRITICAL)
  - Implement mandatory execution order: Inventory validation API → Order creation API → API success → UI/session updates
  - Update UI-only: product stock display, orders list UI, analytics in-memory source, counters/summaries
  - Never create order session store, never skip APIs, never do optimistic stock updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 12.1, 12.2, 12.3_

- [ ]* 6.1 Write property test for order success dual API execution
  - **Property 6: Order Success Dual API Execution**
  - **Validates: Requirements 4.6, 4.7, 4.8**

- [ ]* 6.2 Write property test for order success UI propagation
  - **Property 7: Order Success UI Propagation**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ]* 6.3 Write property test for order session store prohibition
  - **Property 14: Order Session Store Prohibition**
  - **Validates: Requirements 12.1, 12.4, 12.5, 12.6**

- [ ] 7. STEP 6 — ANALYTICS COMPUTATION CACHE
  - Create in-memory ComputationCache for analytics
  - Reuse results if orders unchanged, recompute when orders change
  - Manual refresh clears cache, clear on logout/restart
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 7.1 Write property test for computation cache consistency
  - **Property 8: Computation Cache Consistency**
  - **Validates: Requirements 5.1, 5.2, 5.4**

- [ ] 8. STEP 7 — FEATURE FLAG CACHE
  - Implement cache for feature checks per render cycle
  - In-memory only, no cross-screen reuse, no persistence
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 8.1 Write property test for feature flag render cycle caching
  - **Property 9: Feature Flag Render Cycle Caching**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 9. STEP 8 — SERVICE STATUS SESSION CACHE
  - Create session-level cache for service status (e.g., WhatsApp)
  - First check stores in session, reuse across screens
  - Force recheck on manual refresh and setup/config screens
  - Clear on logout/restart
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [ ]* 9.1 Write property test for service status session caching
  - **Property 10: Service Status Session Caching**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. STEP 9 — OPTIONAL BACKGROUND READ FETCH
  - Implement periodic read-only fetch for products & orders (optional)
  - No UI updates if screen inactive, no writes or mutations
  - Manual refresh overrides background data
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7_

- [ ]* 11.1 Write property test for background fetch read-only behavior
  - **Property 16: Background Fetch Read-Only Behavior**
  - **Validates: Requirements 13.2, 13.3, 13.5, 13.7**

- [ ] 12. STEP 10 — ROLLBACK MECHANISM
  - Implement single config flag to disable all optimizations
  - Reverts to direct API reads, no backend changes, no data loss
  - No app restart required
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7_

- [ ]* 12.1 Write property test for rollback completeness
  - **Property 15: Rollback Completeness**
  - **Validates: Requirements 9.2, 9.3, 9.4, 9.7**

- [ ]* 12.2 Write unit tests for rollback mechanism
  - Test single flag disables all optimizations
  - Test no app restart required
  - Test identical behavior to pre-optimization
  - _Requirements: 9.1, 9.6, 9.7_

- [ ] 13. STEP 11 — MANDATORY VERIFICATION CHECKLIST
  - Implement comprehensive validation after every step
  - Verify: inventory API always executes, order creation API always executes
  - Verify: manual refresh bypasses cache, logout clears session memory
  - Verify: app restart refetches data, failed API causes no UI mutation
  - Verify: user behavior unchanged, network calls reduced but critical calls preserved
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9, 10.10_

- [ ]* 13.1 Write property test for API contract immutability
  - **Property 11: API Contract Immutability**
  - **Validates: Requirements 8.1, 8.2, 8.6, 8.7, 8.8**

- [ ]* 13.2 Write property test for critical API preservation
  - **Property 12: Critical API Preservation**
  - **Validates: Requirements 8.3, 8.4, 8.5, 4.8, 4.9**

- [ ]* 13.3 Write property test for session data non-persistence
  - **Property 13: Session Data Non-Persistence**
  - **Validates: Requirements 2.6, 8.10, 12.2**

- [ ]* 13.4 Write comprehensive integration tests
  - Test end-to-end user journeys with optimizations enabled
  - Test performance validation and API call reduction
  - Test cross-screen consistency and UI propagation
  - _Requirements: 10.5, 10.6_

- [ ] 14. Final Checkpoint - Complete validation and rollback testing
  - Run complete validation checklist from Step 11
  - Test rollback mechanism thoroughly
  - Verify all 16 correctness properties hold
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each step must be completed in sequence - do not skip or reorder
- Mandatory validation checkpoints ensure incremental safety
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples and edge cases
- All optimizations must be UI-layer only with complete rollback safety
- Backend services and API contracts must remain completely unchanged