# Technical Design Document

## Overview

This design implements database persistence and caching for 6 critical app settings in FlowPOS. The implementation follows the same caching pattern established in SubscriptionContext.js, ensuring consistency across the codebase.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React Native)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │ SettingsScreen  │───▶│      AppSettingsContext             │ │
│  │ InvoiceService  │    │  ┌─────────────────────────────┐    │ │
│  │ CartScreen      │    │  │  In-Memory Cache            │    │ │
│  │ OrdersScreen    │    │  │  (6 settings)               │    │ │
│  └─────────────────┘    │  └─────────────────────────────┘    │ │
│                         │              │                       │ │
│                         │              ▼                       │ │
│                         │  ┌─────────────────────────────┐    │ │
│                         │  │  AsyncStorage (Cache)       │    │ │
│                         │  │  @flowpos_app_settings      │    │ │
│                         │  └─────────────────────────────┘    │ │
│                         └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP API
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Backend (Node.js)                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐    ┌─────────────────────────────────────┐ │
│  │  store.js       │───▶│      storeService.js                │ │
│  │  (routes)       │    │  (handles app_settings JSONB)       │ │
│  └─────────────────┘    └─────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    │ SQL
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Database (Supabase/PostgreSQL)               │
├─────────────────────────────────────────────────────────────────┤
│  stores table                                                    │
│  ├── id                                                          │
│  ├── user_id                                                     │
│  ├── store_name                                                  │
│  ├── ... (existing columns)                                      │
│  └── app_settings (JSONB) ◀── NEW COLUMN                        │
│      {                                                           │
│        "autoPaymentDetection": true,                             │
│        "requireCustomerDetails": false,                          │
│        "showStoreNameOnInvoice": true,                           │
│        "sendInvoiceEnabled": true,                               │
│        "whatsappMethod": "flowpos",                              │
│        "notifications": true                                     │
│      }                                                           │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. App Start / Login Flow
```
App Start
    │
    ▼
Load from AsyncStorage (cache)
    │
    ├── Cache exists? ──▶ Use cached data immediately
    │                          │
    │                          ▼
    │                    Fetch from backend (background)
    │                          │
    │                          ▼
    │                    Update cache if newer
    │
    └── No cache? ──▶ Fetch from backend
                           │
                           ▼
                     Store in cache
```

### 2. Settings Update Flow (Write-Through)
```
User changes setting
    │
    ▼
Update UI optimistically
    │
    ▼
Send to backend API
    │
    ├── Success? ──▶ Update cache
    │
    └── Failure? ──▶ Revert UI, show error
```

### 3. One-Time Migration Flow
```
Login (existing user)
    │
    ▼
Check if app_settings is NULL in DB
    │
    ├── Has values? ──▶ Use DB values
    │
    └── NULL? ──▶ Check AsyncStorage for legacy values
                      │
                      ├── Has legacy values? ──▶ Persist to DB
                      │                              │
                      │                              ▼
                      │                         Clear legacy keys
                      │
                      └── No legacy values? ──▶ Leave as NULL
```

## Component Design

### AppSettingsContext (New)

Location: `flowpos/src/context/AppSettingsContext.js`

```javascript
// Storage keys
const STORAGE_KEYS = {
  APP_SETTINGS: '@flowpos_app_settings',
  APP_SETTINGS_TIMESTAMP: '@flowpos_app_settings_timestamp',
  MIGRATION_COMPLETE: '@flowpos_app_settings_migrated'
};

// Legacy AsyncStorage keys (for migration)
const LEGACY_KEYS = {
  autoPaymentDetection: 'autoPaymentDetection',
  requireCustomerDetails: 'requireCustomerDetails',
  showStoreNameOnInvoice: 'showStoreNameOnInvoice',
  sendInvoiceEnabled: 'sendInvoiceEnabled',
  whatsappMethod: 'whatsappMethod',
  notifications: 'notifications'
};

// Context value shape
interface AppSettingsContextValue {
  // Settings data (read-only from context)
  settings: AppSettings | null;
  isLoading: boolean;
  error: string | null;
  
  // Cache status
  isCached: boolean;
  lastFetchedAt: number | null;
  
  // Actions
  refreshSettings: () => Promise<void>;
  updateSetting: (key: string, value: any) => Promise<boolean>;
  updateSettings: (updates: Partial<AppSettings>) => Promise<boolean>;
  clearCache: () => Promise<void>;
  
  // Getters (for direct access)
  getSetting: (key: string) => any;
}
```

### Backend Changes

#### store.js Routes

The existing routes already support `app_settings` in POST. Need to ensure:
1. GET returns `app_settings` field
2. PUT updates `app_settings` field

#### storeService.js

Ensure the service handles `app_settings` JSONB column properly.

## Settings Schema

```typescript
interface AppSettings {
  autoPaymentDetection?: boolean;    // Auto-detect UPI payments from SMS
  requireCustomerDetails?: boolean;  // Require customer info at checkout
  showStoreNameOnInvoice?: boolean;  // Show store name on invoices
  sendInvoiceEnabled?: boolean;      // Enable WhatsApp invoice sending
  whatsappMethod?: 'flowpos' | 'device';  // WhatsApp sending method
  notifications?: boolean;           // Enable app notifications
}
```

## Migration Strategy

### Phase 1: Database Column
- Add `app_settings` JSONB column to stores table
- Default to NULL (not empty object)
- No constraints on individual fields

### Phase 2: Backend API
- Include `app_settings` in GET /store response
- Accept `app_settings` in POST/PUT /store requests
- Never infer or default values

### Phase 3: Frontend Cache
- Create AppSettingsContext
- Load from AsyncStorage on mount
- Fetch from backend on login
- Write-through updates

### Phase 4: Migration Logic
- On login, check if DB has app_settings
- If NULL, check legacy AsyncStorage keys
- Migrate values to DB once
- Clear legacy keys after successful migration

## Error Handling

### Network Errors
- Keep cached data if available
- Show error toast but don't block UI
- Retry on next app focus

### Parse Errors
- Log error internally
- Keep existing cached data
- Don't crash or block features

### Migration Errors
- Log error
- Retry on next login
- Don't block app usage

## Security Considerations

1. Settings are user-specific (tied to user_id via store)
2. No sensitive data in these settings
3. Backend validates user ownership before updates
4. Cache cleared on logout

## Performance Considerations

1. Single API call fetches all settings with store data
2. In-memory cache for instant reads
3. AsyncStorage for persistence across app restarts
4. No polling - only fetch on login and manual refresh
5. Write-through ensures consistency without refetch loops

## Backward Compatibility

1. If `app_settings` column doesn't exist, app continues working
2. If backend returns null for `app_settings`, use cached values
3. Existing AsyncStorage values migrated automatically
4. No breaking changes to API response shape
