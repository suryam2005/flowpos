# Store Settings Caching - Implementation Tasks

## 🔒 LOCKED RULES (Apply to ALL Tasks)

| Rule | Status |
|------|--------|
| DB = source of truth | ✅ LOCKED |
| Cache = mirror only | ✅ LOCKED |
| No offline writes for settings | ✅ LOCKED |
| Auth data (phone/email) NOT in this context | ✅ LOCKED |
| Boolean: undefined !== false | ✅ LOCKED |
| Write-through: backend first, cache second | ✅ LOCKED |

---

## Task 1: Complete StoreSettingsContext Core

### Description
Complete the StoreSettingsContext.js file with write-through updates, getter functions, and global exports.

### Acceptance Criteria
- [x] Write-through `updateStoreSettings()` with NO offline fallback
- [x] Network check BEFORE any write attempt
- [x] Getter functions with proper boolean handling
- [x] Global functions for non-React code
- [x] One-time migration from legacy keys
- [x] Cache clear on logout

### Files
- `src/context/StoreSettingsContext.js` (continue implementation)

---

## Task 2: Implement Write-Through with Network Guard

### Description
Implement write operations that HARD FAIL when offline - no queuing, no local-first.

### Acceptance Criteria
- [x] `NetInfo.fetch()` called before write
- [x] If `!isConnected`: return `{ success: false, error: 'NO_NETWORK' }`
- [x] NO cache update on failure
- [x] NO offline queue
- [x] Error message returned to UI

### Code Pattern
```javascript
const updateStoreSettings = async (updates) => {
  // STEP 0: Network guard
  const netInfo = await NetInfo.fetch();
  if (!netInfo.isConnected) {
    return { success: false, error: 'NO_NETWORK', message: 'Network required' };
  }
  // ... rest of write-through logic
};
```

---

## Task 3: Implement Getter Functions (Boolean Safe)

### Description
Create getter functions that handle undefined vs false correctly.

### Acceptance Criteria
- [x] `getStoreProfile()` - 6 fields (excludes phone/email)
- [x] `getPaymentSettings()` - UPI IDs, payment methods
- [x] `getTaxSettings()` - with `!== undefined` checks
- [x] `getReceiptSettings()` - with `!== undefined` checks
- [x] `getBusinessSettings()` - with `!== undefined` checks

### Code Pattern
```javascript
// ✅ CORRECT
showGST: rs?.showGST !== undefined ? rs.showGST : true

// ❌ FORBIDDEN
showGST: rs?.showGST || true  // BUG: treats false as undefined
```

---

## Task 4: Implement One-Time Migration

### Description
Migrate legacy AsyncStorage keys to new context format.

### Acceptance Criteria
- [x] Check `MIGRATION_COMPLETE` flag first
- [x] Read legacy keys: storeInfo, taxSettings, receiptSettings, businessSettings
- [x] Merge into new format (exclude phone/email)
- [x] Persist to backend
- [x] Set migration flag
- [x] Clear legacy keys after success

---

## Task 5: Add Global Exports for Services

### Description
Export functions for non-React code (InvoiceService, WhatsAppService).

### Acceptance Criteria
- [x] `triggerStoreSettingsFetchAfterLogin()` exported
- [x] `clearStoreSettingsCacheOnLogout()` exported
- [x] `getStoreSettingFromCache(key)` exported
- [x] `getStoreSettingsFromCache()` exported
- [x] `registerStoreSettingsActions()` internal
- [x] `unregisterStoreSettingsActions()` internal

---

## Task 6: Integrate with AuthContext

### Description
Add login/logout triggers to AuthContext.

### Acceptance Criteria
- [x] Import trigger functions in AuthContext
- [x] Call `triggerStoreSettingsFetchAfterLogin()` after login (non-blocking)
- [x] Call `clearStoreSettingsCacheOnLogout()` on logout
- [x] Set `loginTimestampRef` for health check

### Files
- `src/context/AuthContext.js`

---

## Task 7: Add Provider to App.js

### Description
Add StoreSettingsProvider to provider hierarchy.

### Acceptance Criteria
- [x] Import `StoreSettingsProvider`
- [x] Add inside `AuthProvider`, wrap `SubscriptionProvider`
- [x] Verify provider order is correct

### Files
- `App.js`

---

## Task 8: Migrate StoreSettingsScreen

### Description
Migrate primary settings editor to use context.

### Acceptance Criteria
- [x] Replace `getStore()` with `useStoreSettings()`
- [x] Replace save logic with `updateStoreSettings()`
- [x] Handle `NO_NETWORK` error in UI
- [x] Preserve all validation
- [x] Remove phone/email from local state (read from Auth)

### Files
- `src/screens/manage/StoreSettingsScreen.js`

---

## Task 9: Migrate InvoiceService

### Description
Migrate service to use global cache functions.

### Acceptance Criteria
- [x] Replace AsyncStorage reads with `getStoreSettingsFromCache()`
- [x] Use `getReceiptSettings()` pattern for boolean fields
- [x] Temporary fallback to AsyncStorage (mark for removal)

### Files
- `src/services/InvoiceService.js`

---

## Task 10: Migrate SimpleInvoicePreview

### Description
Migrate component to use context hook.

### Acceptance Criteria
- [x] Replace AsyncStorage reads with `useStoreSettings()`
- [x] Use `getReceiptSettings()` for display logic
- [x] Remove redundant state for receipt settings

### Files
- `src/components/SimpleInvoicePreview.js`

---

## Task 11: Migrate Remaining Consumers

### Description
Migrate all remaining files with direct getStore() calls.

### Files to Migrate
| File | Data Needed | Priority |
|------|-------------|----------|
| `DynamicQRGenerator.js` | UPI IDs | High |
| `CartScreen.js` | Payment methods, tax | High |
| `ManageScreen.js` | Store setup check | Medium |
| `useQRPayment.js` | UPI IDs | Medium |
| `useRealtimeData.js` | Remove getStore() | Low |
| `StoreInformationScreen.js` | Store profile | Low |

### Acceptance Criteria
- [x] All files migrated
- [x] No direct `getStore()` in screens/components/hooks
- [x] Behavior preserved

---

## Task 12: Remove Fallbacks (Post-Migration Cleanup)

### Description
Remove temporary fallback code after all migrations complete.

### Acceptance Criteria
- [x] Remove AsyncStorage fallbacks in InvoiceService
- [x] Remove AsyncStorage fallbacks in other services
- [x] Grep verification: no `getStore()` in UI code
- [x] Context is ONLY read path for UI code

### Verification Command
```powershell
Select-String -Path "src/screens/**/*.js","src/components/**/*.js","src/hooks/**/*.js" -Pattern "getStore\(\)" -Recurse
# Expected: NO RESULTS
```

### Verification Results (2024-12-25)

**getStore() API calls:** ✅ REMOVED from UI code (only comments remain)

**AsyncStorage.getItem('storeInfo') direct reads:** ✅ REMOVED from UI code

**Final Status:**
| Category | Status | Notes |
|----------|--------|-------|
| Screens | ✅ Complete | All screens migrated to StoreSettingsContext |
| Components | ✅ Complete | All components migrated to StoreSettingsContext |
| Hooks | ✅ Complete | All hooks migrated to StoreSettingsContext |
| Services | ✅ Complete | InvoiceService migrated, CloudStorageService intentionally uses AsyncStorage for backup |
| Utils | ⚠️ Kept | storeUtils.js kept for backward compatibility |
| Contexts | ⚠️ Kept | DataSyncContext.js intentionally uses AsyncStorage for sync |

**Files intentionally NOT migrated (by design):**
- `storeUtils.js` - Utility functions for backward compatibility
- `CloudStorageService.js` - Backup/sync requires raw AsyncStorage access
- `DataSyncContext.js` - Sync context requires raw AsyncStorage access

**Conclusion:** Context is the ONLY read path for UI code. Backup/sync services intentionally use AsyncStorage directly.

---


## Task 13: Add Health Check

### Description
Implement monitoring for empty settings state.

### Acceptance Criteria
- [x] Health check 10s after login
- [x] Log error if settings still empty
- [x] Track retry count
- [x] Log warning at max retries

---

## Task Dependencies

```
Task 1-5 (Core Context) → Task 6-7 (Integration) → Task 8-11 (Migrations) → Task 12-13 (Cleanup)
```

## Progress Tracker

| Task | Status | Notes |
|------|--------|-------|
| Task 1 | ✅ Complete | Core structure created, cache clear on logout integrated |
| Task 2 | ✅ Complete | Network guard with NetInfo.fetch() before all writes |
| Task 3 | ✅ Complete | Getter functions with proper boolean handling implemented |
| Task 4 | ✅ Complete | One-time migration from legacy keys implemented |
| Task 5 | ✅ Complete | Global exports implemented and used in AuthContext |
| Task 6 | ✅ Complete | AuthContext integration with login/logout triggers |
| Task 7 | ✅ Complete | StoreSettingsProvider added to App.js provider hierarchy |
| Task 8 | ✅ Complete | Migrated to useStoreSettings(), write-through updates, NO_NETWORK handling |
| Task 9 | ✅ Complete | Migrated to getStoreSettingsFromCache(), proper boolean handling, temporary fallback marked for Task 12 |
| Task 10 | ✅ Complete | Migrated to useStoreSettings(), getReceiptSettings() for proper boolean handling, removed redundant state |
| Task 11 | ✅ Complete | All 6 files migrated: DynamicQRGenerator, CartScreen, ManageScreen, useQRPayment, useRealtimeData, StoreInformationScreen |
| Task 12 | ✅ Complete | All UI code migrated. Backup/sync services intentionally use AsyncStorage. |
| Task 13 | ✅ Complete | Health check implemented: 10s timeout after login, error logging for empty settings, retry count tracking, max retries warning |
