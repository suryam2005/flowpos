# Store Settings Caching - Implementation Review Checklist

## 🔒 FINAL ARCHITECTURE (LOCKED)

| Layer | Role |
|-------|------|
| Database | Source of truth |
| Backend | Read / write / expose |
| StoreSettingsContext | Cached mirror |
| AsyncStorage | Persistence for cache |
| UI | Read-only consumer |

---

## ⚠️ CHECK 1: No Permanent Fallbacks

**Rule:** Fallback to direct API is TEMPORARY for migration only.

### Current State (Pre-Migration)
Files with direct `getStore()` calls that need migration:

| File | Line | Status |
|------|------|--------|
| `src/hooks/useRealtimeData.js` | 55 | ❌ Needs migration |
| `src/components/DynamicQRGenerator.js` | 133 | ❌ Needs migration |
| `src/screens/profile/StoreInformationScreen.js` | 51 | ❌ Needs migration |
| `src/hooks/useQRPayment.js` | 24 | ❌ Needs migration |
| `src/screens/ManageScreen.js` | 217, 283 | ❌ Needs migration |
| `src/screens/manage/StoreSettingsScreen.js` | 123 | ❌ Needs migration |

### Post-Migration Verification
After StoreSettingsContext is stable:
- [ ] All above files migrated to `useStoreSettings()` hook
- [ ] No remaining `getStore()` calls in UI screens
- [ ] Fallback code paths removed
- [ ] Deprecation warnings added to any remaining direct calls

### Code Review Flag
```javascript
// ❌ FLAG THIS - Direct API call after migration
const storeData = await getStore();

// ✅ CORRECT - Context-based read
const { storeSettings } = useStoreSettings();
```

---

## ⚠️ CHECK 2: Null vs False (Boolean Handling)

**Rule:** `undefined ≠ false`, `missing ≠ disabled`

### Current Implementation Analysis

**InvoiceService.js (Lines 143-149)** - ✅ CORRECT
```javascript
// Uses explicit undefined check - GOOD
showAddress: parsedReceiptSettings.showAddress !== undefined ? parsedReceiptSettings.showAddress : true,
showPhone: parsedReceiptSettings.showPhone !== undefined ? parsedReceiptSettings.showPhone : true,
showEmail: parsedReceiptSettings.showEmail !== undefined ? parsedReceiptSettings.showEmail : false,
showGST: parsedReceiptSettings.showGST !== undefined ? parsedReceiptSettings.showGST : true,
```

**SimpleInvoicePreview.js (Lines 52-57)** - ✅ CORRECT
```javascript
// Uses explicit undefined check - GOOD
showAddress: parsedReceiptSettings.showAddress !== undefined ? parsedReceiptSettings.showAddress : true,
showPhone: parsedReceiptSettings.showPhone !== undefined ? parsedReceiptSettings.showPhone : true,
showEmail: parsedReceiptSettings.showEmail !== undefined ? parsedReceiptSettings.showEmail : false,
showGST: parsedReceiptSettings.showGST !== undefined ? parsedReceiptSettings.showGST : true,
```

### Dangerous Patterns to Flag

```javascript
// ❌ BUG - Treats undefined as false
const showGST = settings.showGST || false;

// ❌ BUG - Treats undefined as false  
const enableGST = settings.enableGST || false;

// ❌ BUG - Treats falsy values as false
if (!settings.showEmail) { /* hides email */ }

// ✅ CORRECT - Explicit undefined check
const showGST = settings.showGST !== undefined ? settings.showGST : true;

// ✅ CORRECT - Explicit null/undefined check
const enableGST = settings.enableGST ?? true;
```

### StoreSettingsContext Implementation Rule
```javascript
// In StoreSettingsContext - MUST use this pattern:
const getReceiptSettings = () => ({
  showAddress: storeSettings?.receipt_settings?.showAddress !== undefined 
    ? storeSettings.receipt_settings.showAddress 
    : true,  // Default ONLY if truly undefined
  showPhone: storeSettings?.receipt_settings?.showPhone !== undefined 
    ? storeSettings.receipt_settings.showPhone 
    : true,
  showEmail: storeSettings?.receipt_settings?.showEmail !== undefined 
    ? storeSettings.receipt_settings.showEmail 
    : false,
  showGST: storeSettings?.receipt_settings?.showGST !== undefined 
    ? storeSettings.receipt_settings.showGST 
    : true,
});
```

---

## ⚠️ CHECK 3: Write-Through Order

**Rule:** Backend update → success → cache update (NEVER reverse)

### Current Implementation (StoreSettingsScreen.js)

```javascript
// Lines 260-290 - VERIFY ORDER:

// Step 1: Attempt backend save FIRST
result = await updateStore(backendData);  // ✅ Backend first

// Step 2: Only on success, update local cache
await Promise.all([
  AsyncStorage.setItem('storeInfo', JSON.stringify(storeInfoWithCompat)),
  AsyncStorage.setItem('taxSettings', JSON.stringify(taxSettings)),
  // ...
]);  // ✅ Cache update after backend success
```

### Verification Checklist
- [x] Backend `updateStore()` called BEFORE AsyncStorage writes
- [x] AsyncStorage only updated after backend success
- [x] On backend failure, cache NOT updated (error thrown)
- [ ] **ISSUE:** Offline fallback saves to cache even on backend failure

### Offline Fallback Concern
```javascript
// Lines 275-285 - POTENTIAL ISSUE
} catch (backendError) {
  if (backendError.message.includes('Network')) {
    result = { success: true, offline: true };  // ⚠️ Allows cache update
  }
}
```

**Decision Required:** Is offline-first acceptable for store settings?
- If YES: Document this as intentional behavior
- If NO: Remove offline fallback, require network for saves

---

## ⚠️ CHECK 4: Default Value Hierarchy

**Rule:** DB value > AsyncStorage cache > Defaults (ONLY if both missing)

### Priority Order (MUST enforce)
1. **Database value** (highest priority) - always use if present
2. **AsyncStorage cache** - use if DB unavailable
3. **Defaults** (lowest priority) - ONLY for brand new stores

### Implementation Pattern
```javascript
// In StoreSettingsContext:
const loadSettings = async () => {
  // 1. Try database first
  const dbSettings = await fetchFromBackend();
  if (dbSettings) {
    setSettings(dbSettings);
    await AsyncStorage.setItem('storeSettings', JSON.stringify(dbSettings));
    return;
  }
  
  // 2. Fall back to cache
  const cachedSettings = await AsyncStorage.getItem('storeSettings');
  if (cachedSettings) {
    setSettings(JSON.parse(cachedSettings));
    return;
  }
  
  // 3. ONLY use defaults for new stores
  setSettings(DEFAULT_SETTINGS);
};
```

### Anti-Pattern to Flag
```javascript
// ❌ WRONG - Defaults override DB values
const settings = {
  ...DEFAULT_SETTINGS,  // Defaults applied first
  ...dbSettings,        // DB values may be incomplete
};

// ✅ CORRECT - DB values take full precedence
const settings = dbSettings || cachedSettings || DEFAULT_SETTINGS;
```

---

## ⚠️ CHECK 5: Non-Blocking ≠ Silent Failure

**Rule:** Errors must be logged, cache corruption triggers refetch

### Required Error Handling
```javascript
// In StoreSettingsContext:

// 1. Log all fetch errors
const fetchSettings = async () => {
  try {
    const data = await api.getStore();
    // ...
  } catch (error) {
    console.error('[StoreSettingsContext] Fetch failed:', error);  // ✅ REQUIRED
    // ...
  }
};

// 2. Track retry attempts
if (retryCount >= MAX_RETRIES) {
  console.warn('[StoreSettingsContext] Max retries reached');  // ✅ REQUIRED
}

// 3. Detect empty state after login
useEffect(() => {
  const timer = setTimeout(() => {
    if (!settings && !isLoading) {
      console.error('[StoreSettingsContext] Settings still empty after login');  // ✅ REQUIRED
    }
  }, 10000);
  return () => clearTimeout(timer);
}, [settings, isLoading]);

// 4. Cache corruption detection
const loadFromCache = async () => {
  try {
    const cached = await AsyncStorage.getItem('storeSettings');
    return JSON.parse(cached);
  } catch (parseError) {
    console.error('[StoreSettingsContext] Cache corrupted, clearing');  // ✅ REQUIRED
    await AsyncStorage.removeItem('storeSettings');
    return null;  // Triggers refetch
  }
};
```

---

## Summary: Implementation Tasks

### Before Migration
1. [ ] Create `StoreSettingsContext.js` with proper patterns
2. [ ] Implement write-through with correct order
3. [ ] Add proper boolean handling (no `|| false`)
4. [ ] Add error logging and health checks

### During Migration
5. [ ] Migrate each screen one at a time
6. [ ] Keep fallback code temporarily
7. [ ] Test each migration thoroughly

### After Migration (CLEANUP REQUIRED)
8. [ ] Remove all direct `getStore()` calls from screens
9. [ ] Remove fallback code paths
10. [ ] Add deprecation warnings to any remaining direct calls
11. [ ] Final audit: grep for `getStore()` - should only be in Context
