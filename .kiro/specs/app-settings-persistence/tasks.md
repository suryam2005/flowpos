# Implementation Tasks

## Task 1: Run Database Migration

Status: completed

### Description
Run the migration to add `app_settings` JSONB column to the stores table.

### Acceptance Criteria
- [x] Migration SQL executed in Supabase SQL Editor
- [x] Column `app_settings` exists in stores table
- [x] Column defaults to NULL
- [x] Index created for JSONB queries

### Files
- `flowposbackend/migrations/add_app_settings_column.js` (reference for SQL)

### Requirements Reference
- Requirement 1: Database Storage for App Settings

---

## Task 2: Update Backend Store Service

Status: completed

### Description
Ensure storeService.js properly handles the `app_settings` JSONB column in all operations.

### Acceptance Criteria
- [x] `getStoreByUserId` returns `app_settings` field
- [x] `upsertStore` saves `app_settings` field
- [x] `updateStore` updates `app_settings` field
- [x] NULL values preserved (no defaults)

### Files
- `flowposbackend/services/storeService.js`

### Requirements Reference
- Requirement 2: Backend API Exposure

---

## Task 3: Update Backend Store Routes

Status: completed

### Description
Ensure store routes properly pass `app_settings` through to the service layer.

### Acceptance Criteria
- [x] GET /store returns `app_settings` in response
- [x] POST /store accepts and saves `app_settings`
- [x] PUT /store accepts and updates `app_settings`
- [x] No default values injected by routes

### Files
- `flowposbackend/routes/store.js`

### Requirements Reference
- Requirement 2: Backend API Exposure

---

## Task 4: Create AppSettingsContext

Status: completed

### Description
Create the frontend context for caching app settings, following the pattern from SubscriptionContext.

### Acceptance Criteria
- [x] Context created with provider component
- [x] In-memory cache for settings
- [x] AsyncStorage persistence
- [x] `refreshSettings` function to fetch from backend
- [x] `clearCache` function for logout
- [x] `getSetting` function for reading individual settings
- [x] `updateSetting` function for write-through updates

### Files
- `flowpos/src/context/AppSettingsContext.js` (new)

### Requirements Reference
- Requirement 3: Settings Cache Implementation
- Requirement 4: Cache-First Read Strategy

---

## Task 5: Implement Write-Through Updates

Status: completed

### Description
Implement write-through cache updates when settings are changed.

### Acceptance Criteria
- [x] `updateSetting` sends to backend first
- [x] Cache updated only on backend success
- [x] UI reverts on backend failure
- [x] No refetch loops after update

### Files
- `flowpos/src/context/AppSettingsContext.js`

### Requirements Reference
- Requirement 5: Write-Through Cache Updates

---

## Task 6: Implement One-Time Migration

Status: completed

### Description
Implement migration logic to move existing AsyncStorage values to database for existing users.

### Acceptance Criteria
- [x] Check if `app_settings` is NULL in DB on login
- [x] Read legacy AsyncStorage keys if DB is NULL
- [x] Persist legacy values to DB once
- [x] Clear legacy AsyncStorage keys after successful migration
- [x] Migration only runs once per user
- [x] Migration failure doesn't block app

### Files
- `flowpos/src/context/AppSettingsContext.js`

### Requirements Reference
- Requirement 6: One-Time Migration for Existing Users

---

## Task 7: Integrate AppSettingsContext in App

Status: completed

### Description
Add AppSettingsProvider to the app's context hierarchy.

### Acceptance Criteria
- [x] AppSettingsProvider added to App.js
- [x] Provider positioned correctly in context hierarchy
- [x] Settings loaded on app start

### Files
- `flowpos/App.js`

### Requirements Reference
- Requirement 3: Settings Cache Implementation

---

## Task 8: Update SettingsScreen to Use Cache

Status: completed

### Description
Update SettingsScreen to read from and write to AppSettingsContext instead of direct AsyncStorage.

### Acceptance Criteria
- [x] Settings loaded from context on mount
- [x] Toggle changes use `updateSetting` from context
- [x] No direct AsyncStorage reads for the 6 settings
- [x] UI updates immediately (optimistic)
- [x] Error handling for failed updates

### Files
- `flowpos/src/screens/SettingsScreen.js`

### Requirements Reference
- Requirement 4: Cache-First Read Strategy
- Requirement 5: Write-Through Cache Updates

---

## Task 9: Update InvoiceService to Use Cache

Status: completed

### Description
Update InvoiceService to read settings from AppSettingsContext instead of AsyncStorage.

### Acceptance Criteria
- [x] `showStoreNameOnInvoice` read from cache
- [x] `sendInvoiceEnabled` read from cache
- [x] `whatsappMethod` read from cache
- [x] Invoice generation behavior unchanged
- [x] Fallback to existing behavior if cache unavailable

### Files
- `flowpos/src/services/InvoiceService.js`

### Requirements Reference
- Requirement 4: Cache-First Read Strategy
- Requirement 9: Order and Invoice Logic Preservation

---

## Task 10: Update CartScreen to Use Cache

Status: completed

### Description
Update CartScreen to read `requireCustomerDetails` from cache.

### Acceptance Criteria
- [x] `requireCustomerDetails` read from cache
- [x] Checkout behavior unchanged
- [x] Fallback to existing behavior if cache unavailable

### Files
- `flowpos/src/screens/CartScreen.js`

### Requirements Reference
- Requirement 4: Cache-First Read Strategy
- Requirement 9: Order and Invoice Logic Preservation

---

## Task 11: Implement Logout Cache Clearing

Status: completed

### Description
Ensure app settings cache is cleared on logout but DB values preserved.

### Acceptance Criteria
- [x] Cache cleared from memory on logout
- [x] AsyncStorage cache cleared on logout
- [x] DB values NOT deleted on logout
- [x] Settings reload from DB on next login

### Files
- `flowpos/src/context/AppSettingsContext.js`
- `flowpos/src/context/AuthContext.js`

### Requirements Reference
- Requirement 7: Logout and Session Safety

---

## Task 12: Manual Integration Testing

Status: not started

### Description
Verify the complete implementation works correctly.

### Test Cases
1. **Fresh Install**: Settings should be NULL until user configures them
2. **Existing User Migration**: Legacy AsyncStorage values should migrate to DB
3. **Cross-Device**: Settings should sync when logging in on new device
4. **Logout/Login**: Settings should persist after logout and reload on login
5. **App Reinstall**: Settings should load from DB after reinstall
6. **Offline Mode**: Cached settings should work when offline
7. **Order/Invoice**: Order creation and invoice generation should work exactly as before

### Requirements Reference
- Requirement 9: Order and Invoice Logic Preservation
- Requirement 10: Backward Compatibility

---

## Notes

- Follow the caching pattern from `SubscriptionContext.js`
- Do NOT add default values for any settings
- Do NOT modify order or invoice creation logic
- Do NOT cache orders or invoices
- Settings are: autoPaymentDetection, requireCustomerDetails, showStoreNameOnInvoice, sendInvoiceEnabled, whatsappMethod, notifications
