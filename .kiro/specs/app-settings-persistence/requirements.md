# Requirements Document

## Introduction

This feature implements database persistence and caching for 6 critical store/invoice settings in FlowPOS. These settings are currently stored only in AsyncStorage (local device storage) and are lost when users reinstall the app or switch devices. The goal is to persist these settings to the database while maintaining a local cache for performance, ensuring settings are consistent across devices and survive app reinstalls.

This is a production billing app where orders and invoices are already live. The implementation must NOT change any existing order or invoice logic - only the settings storage mechanism.

## Glossary

- **App_Settings**: The 6 critical settings that need database persistence: autoPaymentDetection, requireCustomerDetails, showStoreNameOnInvoice, sendInvoiceEnabled, whatsappMethod, notifications
- **Settings_Cache**: In-memory cache of App_Settings loaded from database, used for fast reads
- **Write_Through_Update**: When a setting is changed, write to database first, then update cache only on success
- **One_Time_Migration**: Process to migrate existing AsyncStorage values to database for existing users
- **Store_Table**: The existing `stores` database table where App_Settings will be stored as a JSONB column

## Requirements

### Requirement 1: Database Storage for App Settings

**User Story:** As a user, I want my app settings stored in the database, so that they persist across devices and app reinstalls.

#### Acceptance Criteria

1. THE Store_Table SHALL have an `app_settings` JSONB column to store the 6 settings
2. THE app_settings column SHALL store: autoPaymentDetection, requireCustomerDetails, showStoreNameOnInvoice, sendInvoiceEnabled, whatsappMethod, notifications
3. THE app_settings column SHALL default to NULL (not an empty object or default values)
4. WHEN a setting value is not set, THE System SHALL NOT assume or compute a default value
5. THE System SHALL NOT create a new table for these settings

### Requirement 2: Backend API Exposure

**User Story:** As a developer, I want the app settings exposed through the existing store API, so that the frontend can read and write settings without new endpoints.

#### Acceptance Criteria

1. WHEN the store API returns store data, THE Response SHALL include the app_settings field
2. WHEN the store API receives an update with app_settings, THE Backend SHALL persist it to the database
3. THE Backend SHALL NOT infer, override, or compute default values for missing settings
4. THE API response shape SHALL remain backward compatible with existing clients
5. THE Backend SHALL return app_settings as NULL if no settings have been saved

### Requirement 3: Settings Cache Implementation

**User Story:** As a user, I want fast access to my settings, so that the app responds quickly without waiting for API calls.

#### Acceptance Criteria

1. WHEN the app starts or user logs in, THE System SHALL fetch store data including app_settings from the backend
2. THE System SHALL cache app_settings in memory for fast reads
3. WHEN a screen needs a setting value, THE Screen SHALL read from the cache
4. IF the cache is empty and backend fetch fails, THEN THE System SHALL NOT use default values
5. THE Cache SHALL mirror the backend data exactly without modification

### Requirement 4: Cache-First Read Strategy

**User Story:** As a developer, I want screens to read settings from cache, so that there are no unnecessary API calls.

#### Acceptance Criteria

1. WHEN a screen requests a setting value, THE System SHALL return the cached value immediately
2. THE System SHALL NOT make an API call for each setting read
3. IF cache is empty, THEN THE System SHALL attempt to fetch from backend
4. THE Order creation logic SHALL read settings from cache
5. THE Invoice generation logic SHALL read settings from cache
6. THE System SHALL NOT change any order or invoice behavior - only the source of settings values

### Requirement 5: Write-Through Cache Updates

**User Story:** As a user, I want my setting changes saved immediately, so that they are not lost.

#### Acceptance Criteria

1. WHEN a user changes a setting, THE System SHALL send the update to the backend first
2. WHEN the backend update succeeds, THE System SHALL update the local cache
3. IF the backend update fails, THEN THE System SHALL NOT update the cache
4. THE System SHALL NOT trigger a full refetch after a successful update
5. THE Cache update SHALL be atomic - all or nothing

### Requirement 6: One-Time Migration for Existing Users

**User Story:** As an existing user, I want my current settings migrated to the database, so that I don't lose my preferences.

#### Acceptance Criteria

1. WHEN an existing user logs in and app_settings is NULL in database, THE System SHALL check AsyncStorage for existing values
2. IF AsyncStorage has values, THEN THE System SHALL persist them to the database once
3. AFTER successful migration, THE System SHALL clear the migrated AsyncStorage keys
4. THE Migration SHALL only run once per user
5. IF migration fails, THE System SHALL retry on next login
6. THE Migration SHALL NOT overwrite existing database values

### Requirement 7: Logout and Session Safety

**User Story:** As a user, I want my settings preserved when I logout, so that they are available when I login again.

#### Acceptance Criteria

1. WHEN a user logs out, THE System SHALL clear the settings cache from memory
2. WHEN a user logs out, THE System SHALL NOT delete settings from the database
3. WHEN a user logs in on a new device, THE System SHALL load settings from the database
4. THE System SHALL NOT retain any cached settings between different user sessions

### Requirement 8: No Default Values Policy

**User Story:** As a developer, I want explicit setting values only, so that there are no unexpected behaviors from assumed defaults.

#### Acceptance Criteria

1. THE System SHALL NOT define default values for any of the 6 settings
2. IF a setting is NULL or undefined, THE System SHALL treat it as "not configured"
3. THE System SHALL NOT compute or infer setting values
4. THE Frontend SHALL handle NULL/undefined settings gracefully without assuming values
5. THE System SHALL preserve existing behavior for screens that already handle missing settings

### Requirement 9: Order and Invoice Logic Preservation

**User Story:** As a business owner, I want my orders and invoices to work exactly as before, so that my business operations are not disrupted.

#### Acceptance Criteria

1. THE System SHALL NOT modify order creation logic
2. THE System SHALL NOT modify invoice generation logic
3. THE System SHALL NOT cache orders or invoices
4. THE System SHALL only change where settings are read from (cache instead of AsyncStorage)
5. THE Order and Invoice screens SHALL receive the same setting values as before
6. IF settings are unavailable, THE System SHALL behave exactly as it did before this change

### Requirement 10: Backward Compatibility

**User Story:** As a user, I want the app to work seamlessly during and after the update, so that there is no disruption to my workflow.

#### Acceptance Criteria

1. THE System SHALL continue to work if the database column doesn't exist yet
2. THE System SHALL fall back to AsyncStorage if database fetch fails
3. THE API response SHALL include app_settings without breaking existing clients
4. THE System SHALL handle partial migrations gracefully
5. THE System SHALL NOT require users to reconfigure settings after the update

