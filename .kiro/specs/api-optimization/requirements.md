# Requirements Document

## Introduction

This specification defines the API optimization requirements for the FlowPOS application. The goal is to reduce unnecessary API calls, implement proper deduplication, enforce cache-first access patterns, and add controlled retry logic - all without changing UI/UX behavior, API contracts, or database schemas.

## Glossary

- **API_Deduplicator**: A utility that ensures only one active API call per endpoint at a time
- **Cache_Manager**: The system responsible for storing and retrieving cached data from AsyncStorage
- **Staleness_Threshold**: The time period (24 hours) after which cached data is considered stale
- **Request_Tracker**: A component that tracks in-flight API requests to prevent duplicates
- **Retry_Controller**: A component that manages retry attempts with backoff for failed API calls
- **Network_Guard**: A component that checks network availability before API execution
- **Call_Counter**: A soft-limit tracker that logs warnings when API call thresholds are exceeded

## Requirements

### Requirement 1: API Deduplication

**User Story:** As a developer, I want to ensure only one active API call per endpoint at a time, so that parallel or repeated calls are prevented and in-flight results are reused.

#### Acceptance Criteria

1. WHEN multiple components request the same API endpoint simultaneously, THE API_Deduplicator SHALL return the same in-flight promise to all callers
2. WHEN an API call is in progress for Products endpoint, THE API_Deduplicator SHALL prevent additional calls until the first completes
3. WHEN an API call is in progress for Orders endpoint, THE API_Deduplicator SHALL prevent additional calls until the first completes
4. WHEN an API call is in progress for Store info endpoint, THE API_Deduplicator SHALL prevent additional calls until the first completes
5. WHEN an API call completes, THE API_Deduplicator SHALL clear the in-flight reference to allow future calls
6. THE API_Deduplicator SHALL NOT change any API endpoint URLs or response formats

### Requirement 2: Cached Data Access for Non-Frequent Data

**User Story:** As a developer, I want non-frequent data (store info, app settings, subscription) to be accessed cache-first, so that APIs are only called when cache is empty or stale.

#### Acceptance Criteria

1. WHEN a screen requests store settings, THE Cache_Manager SHALL return cached data if available and not stale
2. WHEN a screen requests app settings, THE Cache_Manager SHALL return cached data if available and not stale
3. WHEN a screen requests subscription data, THE Cache_Manager SHALL return cached data if available and not stale
4. WHEN cached data is older than the Staleness_Threshold (24 hours), THE Cache_Manager SHALL trigger a background refresh
5. WHEN cache is empty, THE Cache_Manager SHALL fetch from API and store the result
6. THE Cache_Manager SHALL NOT require screens to call APIs directly for non-frequent data

### Requirement 3: Screen Lifecycle API Call Prevention

**User Story:** As a developer, I want to prevent APIs from firing blindly on screen mount, focus, or tab switch, so that unnecessary network calls are eliminated.

#### Acceptance Criteria

1. WHEN a screen mounts, THE Screen_Controller SHALL check cache before calling any API
2. WHEN a screen gains focus, THE Screen_Controller SHALL check last-fetch timestamp before calling any API
3. WHEN a tab switches, THE Screen_Controller SHALL NOT automatically trigger API calls
4. IF cached data exists and is not stale, THEN THE Screen_Controller SHALL use cached data without API call
5. WHEN data is stale, THE Screen_Controller SHALL trigger a background refresh without blocking UI

### Requirement 4: Background vs User-Triggered Call Separation

**User Story:** As a developer, I want clear separation between background and user-triggered API calls, so that background calls respect cache/staleness while user actions execute immediately.

#### Acceptance Criteria

1. WHEN a user creates, updates, or deletes data, THE API_Controller SHALL execute the API call immediately
2. WHEN a background sync triggers, THE API_Controller SHALL check cache staleness before calling API
3. WHEN a background sync triggers and cache is fresh, THE API_Controller SHALL skip the API call
4. WHEN network is unavailable, THE API_Controller SHALL skip background sync calls
5. THE API_Controller SHALL NOT delay user-triggered actions for cache checks

### Requirement 5: Unused/Over-Fetched Data Handling

**User Story:** As a developer, I want the frontend to consume only required fields from API responses, so that unused data is ignored without backend changes.

#### Acceptance Criteria

1. THE Frontend_Consumer SHALL extract only required fields from API responses
2. THE Frontend_Consumer SHALL ignore unused fields in API responses
3. THE Frontend_Consumer SHALL NOT modify backend response shapes
4. THE Frontend_Consumer SHALL NOT request backend cleanup of unused fields

### Requirement 6: Error Retry Strategy

**User Story:** As a developer, I want controlled retry logic for failed API calls, so that transient failures are handled gracefully without duplicate writes.

#### Acceptance Criteria

1. WHEN an API call fails, THE Retry_Controller SHALL retry up to 3 attempts maximum
2. WHEN retrying, THE Retry_Controller SHALL include exponential backoff delay between attempts
3. WHEN max retries are exhausted, THE Retry_Controller SHALL return a clean error to the caller
4. THE Retry_Controller SHALL NOT retry write operations (POST, PUT, DELETE) to prevent duplicates
5. WHEN a retry succeeds, THE Retry_Controller SHALL return the successful response

### Requirement 7: Offline Handling

**User Story:** As a developer, I want offline requests to fail cleanly without queuing, so that the app remains responsive and data integrity is maintained.

#### Acceptance Criteria

1. WHEN device is offline, THE Network_Guard SHALL block API execution immediately
2. WHEN device is offline, THE Network_Guard SHALL return a clean failure response
3. THE Network_Guard SHALL NOT queue offline API calls
4. THE Network_Guard SHALL NOT write offline actions to cache
5. WHEN device comes online, THE Network_Guard SHALL allow API calls to proceed normally

### Requirement 8: Cache Priority

**User Story:** As a developer, I want cache to be the primary source of truth with API as fallback, so that app performance is optimized.

#### Acceptance Criteria

1. WHEN data is requested, THE Cache_Manager SHALL check cache first before API
2. WHEN cache contains valid data, THE Cache_Manager SHALL return it without API call
3. WHEN cache is missing, THE Cache_Manager SHALL fetch from API
4. WHEN cache is stale, THE Cache_Manager SHALL return cached data and trigger background refresh
5. THE Cache_Manager SHALL apply this pattern especially to non-frequent data (store info, app settings, subscription)

### Requirement 9: API Call Soft Limits

**User Story:** As a developer, I want soft limits on API calls with warning logs, so that excessive calls are detected without blocking functionality.

#### Acceptance Criteria

1. THE Call_Counter SHALL track API call counts per session
2. WHEN API call count exceeds threshold, THE Call_Counter SHALL log a warning
3. THE Call_Counter SHALL NOT block API calls when threshold is exceeded
4. THE Call_Counter SHALL reset counts on session start
5. THE Call_Counter SHALL track counts separately for each API endpoint
