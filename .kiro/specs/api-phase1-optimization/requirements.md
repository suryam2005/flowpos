# Requirements Document

## Introduction

This specification defines Phase 1 API optimization requirements for the FlowPOS application. The goal is to stabilize API usage by removing unnecessary and duplicate API calls without changing business logic, backend behavior, or UI outcomes. This is a surgical optimization focused on eliminating API noise, not architectural changes.

## Glossary

- **API_Noise**: Unnecessary, duplicate, or redundant API calls that don't contribute to functionality
- **Lifecycle_Misuse**: API calls triggered inappropriately on mount, focus, or navigation events
- **Focus_Refetch**: API calls triggered when screens regain focus without strong justification
- **Duplicate_Trigger**: Multiple API calls to the same endpoint within the same user interaction
- **Cache_Bypass**: Direct API calls that ignore existing cached data in contexts
- **Background_Sync**: Automatic data refresh that happens without user action
- **User_Action**: Explicit user interactions like create, update, delete operations

## Requirements

### Requirement 1: Eliminate Duplicate API Calls Due to Lifecycle Misuse

**User Story:** As a developer, I want to prevent APIs from being called multiple times due to React lifecycle misuse, so that network behavior is predictable and minimal.

#### Acceptance Criteria

1. WHEN a screen mounts AND gains focus in the same interaction, THE System SHALL make only one API call
2. WHEN navigating back to a screen, THE System SHALL NOT automatically trigger API calls unless data is stale
3. WHEN a component calls an API on mount, THE System SHALL NOT call the same API again on focus
4. WHEN multiple lifecycle events fire simultaneously, THE System SHALL deduplicate to a single API call
5. THE System SHALL NOT change any API endpoint URLs or response formats

### Requirement 2: Remove Multiple Components Calling Same API

**User Story:** As a developer, I want to prevent multiple components from calling the same API independently, so that only one component owns each API call.

#### Acceptance Criteria

1. WHEN a parent screen fetches data, THE child components SHALL receive data via props or context
2. WHEN a child component needs data, THE System SHALL NOT make direct API calls if parent already fetches
3. WHEN multiple components need the same data, THE System SHALL designate one owner component
4. THE System SHALL remove redundant API calls from child components
5. THE System SHALL maintain existing data flow patterns without architectural changes

### Requirement 3: Eliminate Focus-Based Refetching Without Strong Reason

**User Story:** As a developer, I want to remove unnecessary API calls triggered by screen focus events, so that focus changes don't cause network noise.

#### Acceptance Criteria

1. WHEN a screen gains focus, THE System SHALL NOT automatically trigger API calls unless explicitly required
2. WHEN returning from navigation, THE System SHALL use existing cached data if available
3. WHEN focus events occur, THE System SHALL check data freshness before making API calls
4. THE System SHALL remove useFocusEffect API calls that don't have strong justification
5. THE System SHALL preserve focus-based calls only for critical real-time data

### Requirement 4: Prevent Direct API Calls for Already Cached Data

**User Story:** As a developer, I want screens to use existing context data instead of making direct API calls, so that cached data is respected.

#### Acceptance Criteria

1. WHEN store settings are needed, THE System SHALL use StoreSettingsContext instead of direct API calls
2. WHEN subscription data is needed, THE System SHALL use SubscriptionContext instead of direct API calls
3. WHEN app settings are needed, THE System SHALL use AppSettingsContext instead of direct API calls
4. THE System SHALL remove direct API calls that bypass existing contexts
5. THE System SHALL NOT create new caching layers or contexts

### Requirement 5: Enforce Single Trigger Per Lifecycle

**User Story:** As a developer, I want each screen to have only one data fetch trigger per lifecycle, so that API behavior is predictable.

#### Acceptance Criteria

1. WHEN a screen initializes, THE System SHALL use only initial mount for data fetching
2. WHEN a screen needs refresh, THE System SHALL use explicit user actions or pull-to-refresh
3. THE System SHALL remove automatic refetch on focus unless strictly required
4. THE System SHALL prefer initial mount over focus-based triggers
5. THE System SHALL maintain existing user-triggered refresh mechanisms

### Requirement 6: Add Minimal Guards for Repeat Fetches

**User Story:** As a developer, I want simple guards to prevent repeat API calls, so that remounting doesn't cause unnecessary fetches.

#### Acceptance Criteria

1. WHEN a component remounts quickly, THE System SHALL check if data was recently fetched
2. WHEN data was fetched within a reasonable timeframe, THE System SHALL skip the API call
3. THE System SHALL add simple "already fetched" guards without new state systems
4. THE System SHALL use existing timestamps or flags where available
5. THE System SHALL NOT introduce complex caching or state management

### Requirement 7: Preserve User-Triggered Actions

**User Story:** As a developer, I want user-triggered actions to always execute immediately, so that user interactions remain responsive.

#### Acceptance Criteria

1. WHEN a user creates data, THE System SHALL execute the API call immediately
2. WHEN a user updates data, THE System SHALL execute the API call immediately
3. WHEN a user deletes data, THE System SHALL execute the API call immediately
4. WHEN a user pulls to refresh, THE System SHALL execute the refresh immediately
5. THE System SHALL NOT add guards or delays to user-triggered actions

### Requirement 8: Maintain Existing Business Logic

**User Story:** As a developer, I want all business logic to remain unchanged, so that functionality is preserved.

#### Acceptance Criteria

1. THE System SHALL NOT modify any calculation logic
2. THE System SHALL NOT change any validation rules
3. THE System SHALL NOT alter any data transformation logic
4. THE System SHALL NOT modify any error handling behavior
5. THE System SHALL preserve all existing feature functionality

### Requirement 9: Preserve UI/UX Behavior

**User Story:** As a user, I want the app to behave exactly the same way, so that my experience is unchanged.

#### Acceptance Criteria

1. THE System SHALL NOT change any loading states or indicators
2. THE System SHALL NOT modify any error messages or handling
3. THE System SHALL NOT alter any navigation flows
4. THE System SHALL NOT change any visual feedback or animations
5. THE System SHALL maintain identical user experience
