# Requirements Document

## Introduction

This feature implements safe, global caching for Subscription Plan & Status in FlowPOS. The goal is to reduce API calls by fetching subscription data once per session and making it accessible from all screens. This is a caching-only implementation with no plan-based feature restrictions enforced. The architecture is designed to be future-ready for payment gateway integration and feature gating.

## Glossary

- **Subscription_Cache_Owner**: The single centralized service/context responsible for fetching, storing, and providing subscription data to all screens
- **Subscription_Data**: The complete subscription information including plan, status, startedAt, expiresAt, limits, and features
- **Cache_Miss**: When requested subscription data is not available in the cache
- **Write_Through_Update**: Updating the cache immediately after a successful backend update without refetching
- **Session**: The period from user login to logout
- **Persistent_Storage**: AsyncStorage used to preserve subscription data across app restarts

## Requirements

### Requirement 1: Single Subscription Owner

**User Story:** As a developer, I want a single centralized subscription owner, so that subscription API calls are not duplicated across screens.

#### Acceptance Criteria

1. THE Subscription_Cache_Owner SHALL be the only component allowed to call subscription APIs
2. WHEN any screen needs subscription data, THE screen SHALL request it from the Subscription_Cache_Owner
3. THE Subscription_Cache_Owner SHALL prevent duplicate simultaneous API calls
4. WHEN multiple screens request subscription data simultaneously, THE Subscription_Cache_Owner SHALL return the same cached data to all requesters
5. IF a subscription fetch is already in progress, THEN subsequent requests SHALL await the same in-flight request instead of triggering a new API call

### Requirement 2: Cache Population After Login

**User Story:** As a user, I want my subscription data loaded once after login, so that the app responds quickly without repeated API calls.

#### Acceptance Criteria

1. WHEN a user successfully logs in, THE Subscription_Cache_Owner SHALL fetch subscription data from the backend
2. THE Subscription_Cache_Owner SHALL store the complete subscription response including plan, status, startedAt, expiresAt, limits, and features
3. THE Subscription_Cache_Owner SHALL store subscription data in both in-memory state and persistent storage
4. WHEN subscription data is fetched, THE Subscription_Cache_Owner SHALL store it within 100ms of receiving the response
5. THE Subscription_Cache_Owner SHALL NOT modify any existing UI behavior during cache population
6. Subscription cache population SHALL NOT delay navigation or block post-login UI

### Requirement 3: Cache-First Read Strategy

**User Story:** As a user, I want the app to use cached subscription data, so that screens load instantly without waiting for API responses.

#### Acceptance Criteria

1. WHEN a screen requests subscription data and cache exists, THE Subscription_Cache_Owner SHALL return cached data immediately
2. WHEN a screen requests subscription data and cache is missing, THE Subscription_Cache_Owner SHALL fetch from backend
3. WHEN a cache miss occurs and backend fetch succeeds, THE Subscription_Cache_Owner SHALL store the response in cache
4. WHEN a cache miss occurs and backend fetch fails, THE Subscription_Cache_Owner SHALL NOT break the UI
5. IF backend fetch fails, THEN THE Subscription_Cache_Owner SHALL return a safe default state where subscription status is UNKNOWN, no feature restrictions are applied, no limits are enforced, and UI continues to work normally

### Requirement 4: Global Subscription Access

**User Story:** As a developer, I want all screens to access subscription data from a single source, so that data is consistent across the app.

#### Acceptance Criteria

1. THE Subscription_Cache_Owner SHALL expose plan, status, expiresAt, limits, and features globally
2. WHEN any screen reads subscription data, THE screen SHALL receive the same data as all other screens
3. THE screens SHALL NOT store their own copy of subscription data
4. THE screens SHALL NOT call subscription APIs directly

### Requirement 5: No Plan-Based Enforcement

**User Story:** As a user, I want all features to remain accessible regardless of my subscription plan, so that I can use the full app during this phase.

#### Acceptance Criteria

1. THE Subscription_Cache_Owner SHALL NOT block any features based on plan
2. THE Subscription_Cache_Owner SHALL NOT enforce any limits on products, transactions, devices, or storage
3. THE Subscription_Cache_Owner SHALL NOT hide any UI elements based on plan
4. THE Subscription_Cache_Owner SHALL treat subscription data as informational only
5. THE Subscription_Cache_Owner SHALL NOT call canUserPerformAction or any permission-checking logic
6. THE Subscription_Cache_Owner SHALL NOT redirect users based on plan
7. Subscription data SHALL be read-only and informational in this phase

### Requirement 6: Write-Through Cache Update

**User Story:** As a user, I want my subscription changes to reflect immediately in the app, so that I see my updated plan without reloading.

#### Acceptance Criteria

1. WHEN a subscription update API call succeeds, THE Subscription_Cache_Owner SHALL update the cache immediately with the response data
2. THE Subscription_Cache_Owner SHALL NOT refetch subscription data after a successful update
3. THE Subscription_Cache_Owner SHALL NOT require app reload after subscription update
4. WHEN cache is updated, THE UI SHALL reflect the new subscription data immediately

### Requirement 7: Logout and Session Safety

**User Story:** As a user, I want my subscription data cleared on logout, so that the next user does not see my subscription information.

#### Acceptance Criteria

1. WHEN a user logs out, THE Subscription_Cache_Owner SHALL clear subscription data from in-memory state
2. WHEN a user logs out, THE Subscription_Cache_Owner SHALL clear subscription data from persistent storage
3. WHEN a new user logs in, THE Subscription_Cache_Owner SHALL fetch fresh subscription data from backend
4. THE Subscription_Cache_Owner SHALL NOT retain any subscription data between different user sessions

### Requirement 8: Failsafe Behavior

**User Story:** As a user, I want the app to handle subscription errors gracefully, so that I can continue using the app even when subscription data is unavailable.

#### Acceptance Criteria

1. IF subscription cache is lost, THEN THE Subscription_Cache_Owner SHALL fetch from backend
2. IF backend fetch fails, THEN THE Subscription_Cache_Owner SHALL treat subscription state as UNKNOWN
3. IF subscription state is UNKNOWN, THEN THE Subscription_Cache_Owner SHALL NOT grant or restrict any features, SHALL NOT enforce any limits, and SHALL allow UI to continue working normally
4. THE Subscription_Cache_Owner SHALL log errors for debugging without exposing them to users
5. THE Subscription_Cache_Owner SHALL NOT crash the app due to subscription data errors
6. THE app SHALL never block or hide features when subscription state is UNKNOWN

### Requirement 9: API Contract Preservation

**User Story:** As a developer, I want the existing API contracts preserved, so that the backend remains unchanged and stable.

#### Acceptance Criteria

1. THE Subscription_Cache_Owner MAY use the following existing APIs: GET /api/subscription/status, GET /api/subscription/features (if available), POST /api/subscription/upgrade (for write-through updates only)
2. THE Subscription_Cache_Owner SHALL NOT modify API request payloads
3. THE Subscription_Cache_Owner SHALL NOT expect different API response formats
4. THE Subscription_Cache_Owner SHALL handle existing API response structure without changes

### Requirement 10: App Restart Recovery

**User Story:** As a user, I want my subscription data available immediately after app restart, so that I don't have to wait for API calls.

#### Acceptance Criteria

1. WHEN the app starts and persistent storage contains subscription data, THE Subscription_Cache_Owner SHALL load it into memory
2. WHEN the app starts with cached data, THE Subscription_Cache_Owner SHALL make subscription data available immediately
3. THE Subscription_Cache_Owner SHALL validate cached data freshness on app restart in a non-blocking manner
4. IF cached data is stale (older than session), THEN THE Subscription_Cache_Owner SHALL refresh from backend in background only
5. THE cache freshness validation SHALL NOT block UI, enforce subscription expiry, or hide or restrict any features
