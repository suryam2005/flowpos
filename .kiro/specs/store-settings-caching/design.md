# Store Settings Caching - Design Document

## Overview

This design implements a `StoreSettingsContext` for caching 20 store settings, following the proven pattern from `AppSettingsContext`. The context provides a single source of truth for store settings with write-through updates and proper cache management.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────┤
│  Layer              │  Role                                      │
├─────────────────────┼───────────────────────────────────────────┤
│  Database           │  Source of truth (stores table)           │
│  Backend API        │  Read / write / expose (/store endpoint)  │
│  StoreSettingsContext│  Cached mirror (in-memory + AsyncStorage)│
│  AsyncStorage       │  Persistence layer for cache              │
│  UI Screens         │  Read-only consumers via useStoreSettings │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Read Flow (Cache-First)
```
Screen Request → useStoreSettings() → Context State (instant)
                                           ↓
                              [If stale] Background refresh
                                           ↓
                              Backend API → Update Cache
```

### Write Flow (Write-Through)
```
User Edit → updateStoreSetting() → Backend API (FIRST)
                                        ↓
                              [On Success] Update Context + AsyncStorage
                              [On Failure] Show Error, NO cache update
```

## Component Design

### 1. StoreSettingsContext.js

```javascript
// File: src/context/StoreSettingsContext.js

// Storage keys
const STORAGE_KEYS = {
  STORE_SETTINGS: '@flowpos_store_settings',
  STORE_SETTINGS_TIMESTAMP: '@flowpos_store_settings_timestamp',
  MIGRATION_COMPLETE: '@flowpos_store_settings_migrated'
};

// Legacy keys for one-time migration
const LEGACY_KEYS = {
  storeInfo: 'storeInfo',
  taxSettings: 'taxSettings',
  receiptSettings: 'receiptSettings',
  businessSettings: 'businessSettings'
};

// Context state shape
// NOTE: store_phone and store_email are EXCLUDED - they come from AuthContext (user-bound)
interface StoreSettingsState {
  // Store Profile (6 fields - phone/email excluded)
  store_name: string;
  store_address: string;
  store_website: string;
  business_type: string;
  gst_number: string;
  currency: string;
  
  // Payment Settings (4 fields)
  upi_id: string;
  upi_id_2: string;
  upi_id_3: string;
  payment_methods: string[];
  
  // Tax Settings (3 fields - JSONB)
  tax_settings: {
    enableGST: boolean;
    gstRate: number;
    includeTaxInPrice: boolean;
  };
  
  // Business Settings (2 fields - JSONB)
  business_settings: {
    lowStockThreshold: number;
    enableNotifications: boolean;
  };
  
  // Receipt Settings (3 fields - JSONB)
  receipt_settings: {
    showAddress: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showGST: boolean;
  };
}
```

### 2. Context Provider API

```javascript
// Exported from StoreSettingsContext.js

// Hook for React components
export const useStoreSettings = () => {
  const context = useContext(StoreSettingsContext);
  if (!context) {
    throw new Error('useStoreSettings must be used within StoreSettingsProvider');
  }
  return context;
};

// Context value shape
interface StoreSettingsContextValue {
  // Data
  storeSettings: StoreSettingsState | null;
  isLoading: boolean;
  error: string | null;
  isCached: boolean;
  lastFetchedAt: number | null;
  
  // Read helpers (with proper null handling)
  getStoreProfile: () => StoreProfile;
  getPaymentSettings: () => PaymentSettings;
  getTaxSettings: () => TaxSettings;
  getBusinessSettings: () => BusinessSettings;
  getReceiptSettings: () => ReceiptSettings;
  
  // Write actions (write-through)
  updateStoreSettings: (updates: Partial<StoreSettingsState>) => Promise<boolean>;
  updateTaxSettings: (updates: Partial<TaxSettings>) => Promise<boolean>;
  updateReceiptSettings: (updates: Partial<ReceiptSettings>) => Promise<boolean>;
  updateBusinessSettings: (updates: Partial<BusinessSettings>) => Promise<boolean>;
  
  // Cache management
  refreshSettings: () => Promise<void>;
  clearCache: () => Promise<void>;
  isCacheStale: () => boolean;
}

// Global functions for AuthContext integration
export const triggerStoreSettingsFetchAfterLogin: () => void;
export const clearStoreSettingsCacheOnLogout: () => Promise<void>;

// Global functions for non-React code (services)
export const getStoreSettingFromCache: (key: string) => any;
export const getStoreSettingsFromCache: () => StoreSettingsState | null;
```

## Critical Implementation Rules

### Rule 1: Boolean Handling (undefined ≠ false)

```javascript
// ❌ WRONG - Treats undefined as false
const showGST = settings.showGST || false;

// ✅ CORRECT - Explicit undefined check with proper default
const getReceiptSettings = () => {
  const rs = storeSettings?.receipt_settings;
  return {
    showAddress: rs?.showAddress !== undefined ? rs.showAddress : true,
    showPhone: rs?.showPhone !== undefined ? rs.showPhone : true,
    showEmail: rs?.showEmail !== undefined ? rs.showEmail : false,
    showGST: rs?.showGST !== undefined ? rs.showGST : true,
  };
};
```

### Rule 2: Write-Through Order (Backend First) + NO OFFLINE WRITES

```javascript
// ✅ CORRECT - Backend first, cache second, NO OFFLINE FALLBACK
const updateStoreSettings = async (updates) => {
  try {
    // Step 0: Check network availability FIRST
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.error('[StoreSettingsContext] No network - blocking write');
      return { success: false, error: 'NO_NETWORK', message: 'Network required to save settings' };
    }
    
    // Step 1: Send to backend FIRST (no fallback for writes)
    const response = await fetch(`${API_BASE_URL}/store`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify(updates)
    });
    
    if (!response.ok) {
      // Backend failed - DO NOT update cache
      return { success: false, error: 'BACKEND_ERROR' };
    }
    
    // Step 2: Backend succeeded - NOW update cache
    const newSettings = { ...storeSettings, ...updates };
    await storeSettingsData(newSettings);
    return { success: true };
  } catch (error) {
    // Network/other error - DO NOT update cache, NO OFFLINE QUEUE
    console.error('[StoreSettingsContext] Write failed:', error);
    return { success: false, error: 'NETWORK_ERROR', message: error.message };
  }
};

// ❌ FORBIDDEN for settings:
// - Offline queue
// - Local-first write
// - Sync later pattern
// 
// ✅ ALLOWED for settings:
// - Hard fail on no network
// - Show error to user
// - Require retry when online
```

### Rule 3: Default Value Hierarchy

```javascript
// Priority: DB value > AsyncStorage cache > Defaults (ONLY if both missing)

const loadSettings = async () => {
  // 1. Try to load from AsyncStorage first (instant)
  const cached = await loadFromAsyncStorage();
  if (cached) {
    setStoreSettings(cached);
    setIsCached(true);
  }
  
  // 2. Fetch from backend (may update cache)
  const dbSettings = await fetchFromBackend();
  if (dbSettings) {
    // DB value takes precedence
    await storeSettingsData(dbSettings);
  } else if (!cached) {
    // ONLY use defaults for brand new stores
    // Do NOT apply defaults if we have cached data
    setStoreSettings(null); // Let consumers handle null
  }
};
```

### Rule 4: Error Handling (Non-Blocking ≠ Silent)

```javascript
// Required error handling patterns

const fetchFromBackend = async () => {
  try {
    const response = await apiCallWithFallback('/store', options);
    // ...
  } catch (error) {
    // ✅ REQUIRED: Log all errors
    console.error('[StoreSettingsContext] Fetch failed:', error);
    
    // ✅ REQUIRED: Track retry state
    setRetryCount(prev => prev + 1);
    
    if (retryCount >= MAX_RETRIES) {
      console.warn('[StoreSettingsContext] Max retries reached, using cache');
    }
    
    throw error;
  }
};

// ✅ REQUIRED: Health check for empty state
useEffect(() => {
  if (!isLoading && !storeSettings && timeSinceLogin > 10000) {
    console.error('[StoreSettingsContext] Settings still empty 10s after login');
    // Optionally trigger refetch or show warning
  }
}, [isLoading, storeSettings]);

// ✅ REQUIRED: Cache corruption detection
const loadFromAsyncStorage = async () => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.STORE_SETTINGS);
    return JSON.parse(cached);
  } catch (parseError) {
    console.error('[StoreSettingsContext] Cache corrupted, clearing');
    await AsyncStorage.removeItem(STORAGE_KEYS.STORE_SETTINGS);
    return null; // Triggers refetch
  }
};
```

## Migration Strategy

### Phase 1: Create Context (No Breaking Changes)
1. Create `StoreSettingsContext.js`
2. Add `StoreSettingsProvider` to App.js
3. Implement one-time migration from legacy AsyncStorage keys
4. Context loads data but screens still use old methods

### Phase 2: Migrate Consumers (One at a Time)
Files to migrate (in order):
1. `StoreSettingsScreen.js` - Primary editor
2. `InvoiceService.js` - Read store info
3. `SimpleInvoicePreview.js` - Read receipt settings
4. `WhatsAppService.js` - Read receipt settings
5. `DynamicQRGenerator.js` - Read UPI IDs
6. `CartScreen.js` - Read payment methods, tax settings
7. `ManageScreen.js` - Check store setup status
8. `useQRPayment.js` - Read UPI IDs
9. `useRealtimeData.js` - Remove getStore() call

### Phase 3: Cleanup (Remove Fallbacks)
1. Remove all direct `getStore()` calls from screens
2. Remove fallback code paths
3. Add deprecation warnings to remaining direct calls
4. Final audit: grep for `getStore()` - should only be in Context

## File Structure

```
src/
├── context/
│   ├── StoreSettingsContext.js    # NEW: Main context file
│   └── AuthContext.js             # MODIFY: Add trigger calls
├── hooks/
│   └── useStoreSettings.js        # NEW: Convenience hook (optional)
└── services/
    └── InvoiceService.js          # MODIFY: Use getStoreSettingFromCache
```

## Integration Points

### AuthContext Integration

```javascript
// In AuthContext.js - login function
import { triggerStoreSettingsFetchAfterLogin } from './StoreSettingsContext';

const login = async (credentials) => {
  // ... existing login logic ...
  
  // Trigger non-blocking fetch after login
  triggerStoreSettingsFetchAfterLogin();
};

// In AuthContext.js - logout function
import { clearStoreSettingsCacheOnLogout } from './StoreSettingsContext';

const logout = async () => {
  // Clear store settings cache
  await clearStoreSettingsCacheOnLogout();
  
  // ... existing logout logic ...
};
```

### App.js Provider Setup

```javascript
// In App.js
import { StoreSettingsProvider } from './src/context/StoreSettingsContext';

function App() {
  return (
    <AuthProvider>
      <AppSettingsProvider>
        <StoreSettingsProvider>  {/* NEW */}
          <SubscriptionProvider>
            {/* ... rest of app ... */}
          </SubscriptionProvider>
        </StoreSettingsProvider>
      </AppSettingsProvider>
    </AuthProvider>
  );
}
```

## Testing Checklist

### Unit Tests
- [ ] Context loads cached data on mount
- [ ] Context fetches from backend when cache is stale
- [ ] Write-through updates backend before cache
- [ ] Boolean settings handle undefined correctly
- [ ] Cache clears on logout
- [ ] Migration runs once for legacy data

### Integration Tests
- [ ] Login triggers settings fetch
- [ ] Settings available immediately after login (from cache)
- [ ] Settings update reflects across all consumers
- [ ] Logout clears cache but not DB data
- [ ] New login reloads settings from DB

### Manual Tests
- [ ] Change receipt setting → verify in invoice preview
- [ ] Change UPI ID → verify in QR generator
- [ ] Change tax settings → verify in cart calculations
- [ ] Logout/login → verify settings persist
- [ ] Clear app data → verify settings reload from DB

## Success Metrics

1. **API Reduction**: `getStore()` calls reduced by 80%+
2. **Load Time**: Screen load time improved (no API wait)
3. **Consistency**: Settings consistent across all screens
4. **Reliability**: No silent failures, all errors logged
