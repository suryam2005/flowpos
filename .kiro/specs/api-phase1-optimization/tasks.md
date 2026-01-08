# Implementation Plan: API Phase 1 Optimization

## Overview

This implementation plan converts the Phase 1 API optimization design into discrete coding tasks. Each task focuses on removing unnecessary API calls, fixing lifecycle misuse, and adding minimal guards without changing business logic, backend behavior, or UI outcomes. The approach is surgical and targeted.

## Tasks

- [x] 1. Audit current API call patterns
  - Create audit script to identify all API calls in screens and components
  - Document current lifecycle triggers (mount, focus, navigation)
  - Identify duplicate calls and focus-based refetching
  - Map parent-child API call relationships
  - Document direct API calls that bypass existing contexts
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Fix POSScreen lifecycle API calls
  - Remove duplicate `refreshProducts()` call from useFocusEffect
  - Keep only the useEffect mount trigger for initial data fetch
  - Add simple timestamp guard to prevent rapid refetches on remount
  - Preserve user-triggered refresh (pull-to-refresh) functionality
  - _Requirements: 1.1, 1.3, 5.1, 6.1, 7.4_

- [ ]* 2.1 Write property test for POSScreen lifecycle optimization
  - **Property 1: Lifecycle API Call Deduplication**
  - **Validates: Requirements 1.1, 1.3, 1.4**

- [x] 3. Fix OrdersScreen focus-based refetching
  - Remove `checkWhatsAppStatus()` call from useFocusEffect
  - Remove automatic order refresh on screen focus
  - Keep only mount-based data fetching
  - Preserve user-triggered refresh mechanisms
  - _Requirements: 3.1, 3.4, 5.1, 5.5_

- [x] 4. Fix InventoryScreen duplicate API calls
  - Remove duplicate product fetch from useFocusEffect
  - Consolidate to single mount-based fetch
  - Add simple guard for rapid remount scenarios
  - _Requirements: 1.1, 1.3, 6.1, 6.2_

- [x] 5. Fix ManageScreen tab switch API calls
  - Remove automatic API calls on tab switch events
  - Use cached data when switching between tabs
  - Keep only initial mount data fetching
  - _Requirements: 3.3, 5.1, 1.2_

- [ ]* 5.1 Write property test for focus event elimination
  - **Property 4: Focus Event API Elimination**
  - **Validates: Requirements 3.1, 3.4, 5.3**

- [x] 6. Fix SettingsScreen direct API calls
  - Replace direct `/api/store` calls with StoreSettingsContext usage
  - Replace direct subscription API calls with SubscriptionContext usage
  - Remove redundant API calls that bypass existing contexts
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 7. Fix ProfileScreen context bypass
  - Replace direct API calls with AppSettingsContext usage
  - Remove duplicate store info fetching
  - Use existing context data instead of fresh API calls
  - _Requirements: 4.1, 4.3, 4.4_

- [ ]* 7.1 Write property test for context-first access
  - **Property 5: Context-First Data Access**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 8. Fix parent-child duplicate API calls in cart flow
  - Remove API calls from CartScreen child components
  - Ensure parent CartScreen owns all data fetching
  - Pass data to children via props instead of independent API calls
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 9. Fix parent-child duplicate API calls in analytics flow
  - Remove redundant API calls from AnalyticsScreen child components
  - Consolidate data fetching to parent AnalyticsScreen
  - Use props to pass data to chart components
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [ ]* 9.1 Write property test for single component ownership
  - **Property 3: Single Component API Ownership**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

- [x] 10. Add simple guards for rapid remount scenarios
  - Add timestamp-based guards to prevent API calls within 30 seconds of last fetch
  - Use existing refs or state where available, don't create new state systems
  - Apply guards only to background/automatic fetches, not user actions
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 10.1 Write property test for simple guard implementation
  - **Property 7: Simple Guard Implementation**
  - **Validates: Requirements 6.1, 6.2, 6.3, 6.5**

- [x] 11. Checkpoint - Verify no user actions are affected
  - Test all user-triggered actions (create, update, delete, refresh)
  - Ensure immediate execution without delays or guards
  - Verify pull-to-refresh still works in all screens
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 11.1 Write property test for user action immediacy
  - **Property 8: User Action Immediacy**
  - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 12. Verify business logic preservation
  - Run existing test suite to ensure no business logic changes
  - Verify all calculations, validations, and transformations work identically
  - Check error handling behavior remains unchanged
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 12.1 Write property test for business logic preservation
  - **Property 9: Business Logic Preservation**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [x] 13. Verify UI/UX preservation
  - Test all user flows to ensure identical experience
  - Verify loading states, error messages, and navigation unchanged
  - Check visual feedback and animations remain the same
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 13.1 Write property test for user experience preservation
  - **Property 10: User Experience Preservation**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

- [x] 14. Create Phase 1 optimization summary report
  - Document all API calls removed or modified
  - Create before/after comparison for major flows (login, dashboard, products, orders)
  - List specific useFocusEffect calls removed
  - Document parent-child ownership changes
  - Document context usage improvements
  - Verify regression checklist (UI unchanged, data correct, no missing data, no broken flows)
  - _Requirements: All_

- [x] 15. Final checkpoint - Network behavior validation
  - Use network monitoring to verify calm, predictable API behavior
  - Ensure no API fires on screen focus unless required
  - Ensure no API fires twice for same screen visit
  - Ensure cached data is never fetched directly
  - _Requirements: All_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation and regression prevention
- Property tests validate universal correctness properties
- All changes preserve existing functionality and user experience
- No backend changes, no API contract changes, no architectural changes