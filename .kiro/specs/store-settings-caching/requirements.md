# Requirements Document

## Introduction

This feature implements proper Context-based caching for 20 store settings in FlowPOS. These settings are currently fetched on every screen load via `getStore()` API call, causing performance issues and unnecessary network requests. The goal is to implement the same caching pattern used in `AppSettingsContext` - fetch once on login, cache in Context + AsyncStorage, and provide instant access via hooks.

Reference: `md_files/NON_FREQUENT_DATA_CACHING_ANALYSIS.md` for complete field analysis.

## Glossary

- **Store_Settings**: The 20 settings that need proper caching (see Settings Schema below)
- **StoreSettingsContext**: New React Context for caching store settings
- **Settings_Cache**: In-memory cache of Store_Settings loaded from database
- **Write_Through_Update**: When a setting is changed, write to database first, then update cache only on success
- **Store_Table**: The existing `stores` database table where all settings are stored

## Settings Schema

### Store Profile (6 fields)
| Field | Type | DB Column |
|-------|------|-----------|
| `store_name` | string | `store_name` |
| `store_address` | string | `store_address` |
| `store_website` | string | `store_website` |
| `business_type` | string | `business_type` |
| `gst_number` | string | `gst_number` |
| `currency` | string | `currency` |

> **NOTE:** `store_phone` and `store_email` are EXCLUDED from StoreSettingsContext.
> They are user-auth bound fields managed by AuthContext, not store configuration.

### Payment Settings (4 fields)
| Field | Type | DB Column |
|-------|------|-----------|
| `upi_id` | string | `upi_id` |
| `upi_id_2` | string | `upi_id_2` |
| `upi_id_3` | string | `upi_id_3` |
| `payment_methods` | array | `payment_methods` JSONB |

### Tax Settings (3 fields)
| Field | Type | DB Column |
|-------|------|-----------|
| `enableGST` | boolean | `tax_settings.enableGST` JSONB |
| `gstRate` | number | `tax_settings.gstRate` JSONB |
| `includeTaxInPrice` | boolean | `tax_settings.includeTaxInPrice` JSONB |

### Business Settings (2 fields)
| Field | Type | DB Column |
|-------|------|-----------|
| `lowStockThreshold` | number | `business_settings.lowStockThreshold` JSONB |
| `enableNotifications` | boolean | `business_settings.enableNotifications` JSONB |

### Receipt Settings (3 fields)
| Field | Type | DB Column |
|-------|------|-----------|
| `showAddress` | boolean | `receipt_settings.showAddress` JSONB |
| `showEmail` | boolean | `receipt_settings.showEmail` JSONB |
| `showGST` | boolean | `receipt_settings.showGST` JSONB |

## Requirements

### Requirement 1: StoreSettingsContext Creation

**User Story:** As a developer, I want a centralized context for store settings, so that all screens can access settings without making API calls.

#### Acceptance Criteria

1. THE System SHALL create a new `StoreSettingsContext` following the pattern of `AppSettingsContext`
2. THE Context SHALL cache all 20 store settings in memory
3. THE Context SHALL persist cache to AsyncStorage for app restart scenarios
4. THE Context SHALL provide a `useStoreSettings()` hook for consuming components
5. THE Context SHALL provide getter functions for individual settings and setting groups

### Requirement 2: Login-Triggered Fetch

**User Story:** As a user, I want my store settings loaded automatically on login, so that they are available immediately when I use the app.

#### Acceptance Criteria

1. WHEN a user logs in, THE AuthContext SHALL trigger `triggerStoreSettingsFetchAfterLogin()`
2. THE StoreSettingsContext SHALL fetch all store data from `/store` API
3. THE Fetch SHALL be non-blocking (not delay navigation or UI)
4. THE System SHALL cache the fetched data in Context state + AsyncStorage
5. IF fetch fails, THE System SHALL use cached AsyncStorage data if available

### Requirement 3: Cache-First Read Strategy

**User Story:** As a user, I want instant access to my store settings, so that screens load quickly without waiting for API calls.

#### Acceptance Criteria

1. WHEN a screen requests a setting value, THE System SHALL return the cached value immediately
2. THE System SHALL NOT make an API call for each setting read
3. THE StoreSettingsScreen SHALL read from context instead of calling `getStore()`
4. THE InvoiceService SHALL read store info from context cache
5. THE CartScreen SHALL read payment methods and tax settings from context cache
6. THE DynamicQRGenerator SHALL read UPI IDs from context cache

### Requirement 4: Write-Through Cache Updates (NO OFFLINE WRITES)

**User Story:** As a user, I want my setting changes saved immediately and reflected everywhere, so that I see consistent data.

#### Acceptance Criteria

1. WHEN a user changes a setting in StoreSettingsScreen, THE System SHALL send the update to backend first
2. WHEN the backend update succeeds, THE System SHALL update the local cache
3. IF the backend update fails, THE System SHALL NOT update the cache and show error
4. THE System SHALL NOT trigger a full refetch after a successful update
5. THE Cache update SHALL be atomic - all or nothing

#### ⚠️ CRITICAL: NO OFFLINE WRITES FOR SETTINGS

**Settings are compliance-critical data. Offline writes are FORBIDDEN.**

| Data Type | Offline Write | Reason |
|-----------|---------------|--------|
| Orders | ✅ Allowed | Business continuity |
| Cart | ✅ Allowed | Draft data |
| Tax Settings | ❌ FORBIDDEN | Compliance |
| Receipt Settings | ❌ FORBIDDEN | Compliance |
| UPI IDs | ❌ FORBIDDEN | Payment integrity |
| GST Number | ❌ FORBIDDEN | Legal compliance |

**Implementation Rule:**
```javascript
// Check network BEFORE attempting write
if (!netInfo.isConnected) {
  return { success: false, error: 'NO_NETWORK' };
  // DO NOT queue for later sync
  // DO NOT update cache
  // SHOW error to user
}
```

### Requirement 5: Receipt Settings Sync

**User Story:** As a user, I want my receipt display preferences synced to the database, so that they are consistent across devices.

#### Acceptance Criteria

1. THE Receipt settings (showAddress, showEmail, showGST) SHALL be stored in `receipt_settings` JSONB column
2. THE SettingsScreen SHALL update receipt settings via StoreSettingsContext
3. THE InvoiceService SHALL read receipt settings from context cache
4. THE WhatsAppService SHALL read receipt settings from context cache
5. THE SimpleInvoicePreview SHALL read receipt settings from context cache

#### ⚠️ ENFORCEMENT RULES - DEFAULT VALUE HIERARCHY

**Receipt settings defaults (showGST: true, showEmail: false, etc.) are DANGEROUS during migration.**

**Strict Priority Order:**
1. **DB value** (highest priority) - always use if present
2. **AsyncStorage cache** - use if DB unavailable
3. **Defaults** (lowest priority) - ONLY if both DB AND cache are missing

**Implementation Rules:**
- ❌ Defaults must NEVER override DB-stored values
- ❌ Defaults must NEVER override cached values
- ✅ Defaults apply ONLY for brand new stores with no data
- ✅ Migration must preserve existing user preferences from AsyncStorage

### Requirement 6: Logout Cache Clearing

**User Story:** As a user, I want my cached settings cleared on logout, so that the next user doesn't see my data.

#### Acceptance Criteria

1. WHEN a user logs out, THE System SHALL clear the store settings cache from memory
2. WHEN a user logs out, THE System SHALL clear the AsyncStorage cache
3. WHEN a user logs out, THE System SHALL NOT delete settings from the database
4. WHEN a user logs in again, THE System SHALL reload settings from the database

### Requirement 7: Backward Compatibility (TEMPORARY MIGRATION ONLY)

**User Story:** As a user, I want the app to work seamlessly during and after the update, so that there is no disruption.

#### Acceptance Criteria

1. THE System SHALL continue to work if context is not yet loaded (fallback to direct API) - **TEMPORARY ONLY**
2. THE System SHALL migrate existing AsyncStorage `storeInfo` data to context on first load
3. THE API response shape SHALL remain unchanged
4. THE System SHALL handle partial data gracefully
5. Existing screens SHALL work without modification until migrated to use context

#### ⚠️ ENFORCEMENT RULES - MUST BE TEMPORARY

**This backward compatibility is for ROLLOUT/MIGRATION ONLY. It MUST NOT become permanent dual-read logic.**

Once StoreSettingsContext is stable:
- ❌ NO MORE direct `getStore()` calls from screens
- ✅ Context is the ONLY read path
- ❌ Permanent fallbacks are NOT allowed

**Migration Deadline Enforcement:**
1. After all screens are migrated, remove fallback code paths
2. Add deprecation warnings to any remaining `getStore()` direct calls
3. Final cleanup task must remove all dual-read logic
4. Code review must flag any new direct API calls for cached settings

### Requirement 8: Performance Optimization

**User Story:** As a user, I want the app to be fast and responsive, so that I can serve customers quickly.

#### Acceptance Criteria

1. THE System SHALL eliminate redundant `getStore()` calls on screen focus
2. THE System SHALL make only ONE API call on login to fetch all store settings
3. THE System SHALL NOT poll or refetch settings automatically
4. THE Cache SHALL be available synchronously via hooks (no async for reads)
5. THE System SHALL reduce API calls by at least 80% for store settings

### Requirement 9: Consumer Migration

**User Story:** As a developer, I want clear guidance on migrating screens to use the new context.

#### Acceptance Criteria

1. THE StoreSettingsScreen SHALL be migrated to use `useStoreSettings()` hook
2. THE SettingsScreen SHALL be migrated for receipt settings
3. THE InvoiceService SHALL be migrated to read from context cache
4. THE WhatsAppService SHALL be migrated to read from context cache
5. THE CartScreen SHALL be migrated for payment methods and tax settings
6. THE DynamicQRGenerator SHALL be migrated for UPI IDs
7. All migrations SHALL preserve existing behavior

### Requirement 10: Error Handling

**User Story:** As a user, I want the app to handle errors gracefully, so that I can continue working.

#### Acceptance Criteria

1. IF backend fetch fails, THE System SHALL use cached data if available
2. IF backend update fails, THE System SHALL show error message and revert UI
3. IF cache is corrupted, THE System SHALL clear and refetch from backend
4. THE System SHALL NOT crash or block UI on errors
5. THE System SHALL log errors for debugging

#### ⚠️ ENFORCEMENT RULES - NON-BLOCKING ≠ SILENT FAILURE

**"Non-blocking fetch" (Requirement 2) does NOT mean "silent failure".**

**Mandatory Error Handling:**
1. ✅ All fetch errors MUST be logged with context (endpoint, error type, timestamp)
2. ✅ Cache corruption MUST trigger automatic refetch
3. ✅ UI must NOT silently run with empty/default settings forever
4. ✅ After N failed retries, show user-visible warning
5. ✅ Implement health check: if settings are empty after login + 10 seconds, alert

**Error Logging Requirements:**
```javascript
// REQUIRED: Log all errors
console.error('[StoreSettingsContext] Fetch failed:', error);

// REQUIRED: Track retry attempts
if (retryCount >= MAX_RETRIES) {
  console.warn('[StoreSettingsContext] Max retries reached, using cache');
}

// REQUIRED: Detect empty state
if (!settings && !isLoading && timeSinceLogin > 10000) {
  console.error('[StoreSettingsContext] Settings still empty after login');
}
```

## Out of Scope

1. Caching of frequent data (products, orders, cart) - already handled by dedicated services
2. Caching of app settings (6 fields) - already handled by AppSettingsContext
3. Caching of user profile (3 fields) - already handled by AuthContext
4. Caching of subscription data (4 fields) - already handled by SubscriptionContext
5. Local-only settings (notifications, privacy, account) - device-specific, no sync needed

## Dependencies

- Existing `AppSettingsContext` implementation (reference pattern)
- Existing `/store` API endpoint (already supports all fields)
- Existing `storeService.js` backend service
- Existing AsyncStorage infrastructure

## Success Metrics

1. API calls for store settings reduced by 80%+
2. Screen load time improved (no waiting for getStore())
3. Settings consistent across all screens
4. Receipt settings synced across devices
5. No regression in existing functionality
