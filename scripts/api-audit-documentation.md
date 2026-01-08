# API Call Patterns Audit Documentation

## Overview

This document provides a comprehensive analysis of API call patterns in the FlowPOS application, identifying lifecycle misuse, duplicate calls, and focus-based refetching issues that need to be addressed in Phase 1 optimization.

## Executive Summary

- **Total Files Analyzed**: 126
- **Files with API Calls**: 40
- **Total API Calls Found**: 397
- **Focus-based API Calls**: 2 (HIGH PRIORITY)
- **Duplicate API Calls**: 24 files affected (HIGH PRIORITY)
- **Context Bypasses**: 0 (GOOD)

## Critical Issues Identified

### 1. Focus-Based API Calls (2 instances)

These are the most problematic patterns where `useFocusEffect` triggers API calls unnecessarily:

#### POSScreen.js (Line 94)
```javascript
useFocusEffect(
  useCallback(() => {
    // Only refresh if not initial load
    if (initialLoadDone.current) {
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchRef.current;
      const isStale = timeSinceLastFetch > FOCUS_STALENESS_THRESHOLD_MS;
      
      if (isStale) {
        console.log('🏪 [POS] Screen focused - cache stale, refreshing products');
        refreshProducts(); // ← API CALL ON FOCUS
        lastFetchRef.current = now;
      }
    }
  }, [refreshProducts])
);
```

**Issue**: While this has staleness checking, it still triggers API calls on focus events.
**Fix**: Remove `useFocusEffect` and rely only on mount-based fetching + user-triggered refresh.

#### OrdersScreen.js (Line 171)
```javascript
useFocusEffect(
  useCallback(() => {
    // Check if WhatsApp status cache is stale before refreshing
    const lastFetch = whatsappStatusLastFetchRef.current;
    const isStale = !lastFetch || (Date.now() - lastFetch > WHATSAPP_STATUS_STALENESS_MS);
    
    if (isStale) {
      console.log('📱 [Orders] WhatsApp status cache is stale, refreshing...');
      checkWhatsAppStatus(); // ← API CALL ON FOCUS
    }
  }, [])
);
```

**Issue**: API call triggered on focus for WhatsApp status check.
**Fix**: Remove focus-based check, use only mount-based initialization.

### 2. Duplicate API Calls (24 files affected)

Files with multiple calls to the same service/endpoint:

#### High-Impact Duplicates:

1. **InventoryScreen.js**: Multiple `getProducts()` calls
2. **ManageScreen.js**: Multiple `getProducts()` calls  
3. **OrdersScreen.js**: Multiple WhatsApp service calls
4. **POSScreen.js**: Multiple `refreshProducts()` calls

#### Service-Level Duplicates:

- **featureService**: Called multiple times in AnalyticsScreen, SettingsScreen, SubscriptionScreen
- **WhatsAppService**: Multiple calls in OrdersScreen, CartScreen, SimpleInvoicePreview
- **productsService**: Multiple calls across Inventory, Manage, and Onboarding screens

## Lifecycle Trigger Analysis

### Current Lifecycle Patterns

1. **Mount-based fetching**: ✅ Good pattern (useEffect with empty deps)
2. **Focus-based refetching**: ❌ Problematic (useFocusEffect with API calls)
3. **User-triggered refresh**: ✅ Good pattern (pull-to-refresh, manual buttons)

### Problematic Lifecycle Combinations

Several screens use BOTH mount AND focus triggers:

```javascript
// PROBLEMATIC PATTERN
useEffect(() => {
  fetchData(); // Called on mount
}, []);

useFocusEffect(
  useCallback(() => {
    fetchData(); // Called on focus - DUPLICATE!
  }, [])
);
```

## Parent-Child API Call Relationships

### Identified Parent-Child Duplicates

1. **ManageScreen → InventoryScreen**: Both call `productsService.getProducts()`
2. **CartScreen → Child Components**: Multiple WhatsApp service calls
3. **AnalyticsScreen → Chart Components**: Potential duplicate data fetching

### Recommended Ownership Pattern

```javascript
// GOOD PATTERN
const ParentScreen = () => {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    fetchData().then(setData); // Parent owns the fetch
  }, []);
  
  return <ChildComponent data={data} />;
};

const ChildComponent = ({ data }) => {
  // No API call, receives data via props
};
```

## Context Usage Analysis

### Good News: No Context Bypasses Detected

The audit found 0 context bypasses, indicating that screens are properly using existing contexts:

- ✅ StoreSettingsContext usage
- ✅ SubscriptionContext usage  
- ✅ AppSettingsContext usage
- ✅ AuthContext usage

## Staleness Threshold Analysis

Several screens implement staleness checking:

```javascript
const FOCUS_STALENESS_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
```

**Current Implementation**: Good concept but still allows focus-based calls.
**Phase 1 Fix**: Remove focus triggers entirely, keep staleness for mount-based calls only.

## API Call Frequency Hotspots

### Most Called Services:
1. **productsService**: 15+ calls across multiple screens
2. **featureService**: 10+ calls for feature checking
3. **WhatsAppService**: 8+ calls for messaging functionality
4. **ordersService**: 6+ calls for order management

### Most Problematic Files:
1. **ManageScreen.js**: Complex lifecycle with multiple service calls
2. **InventoryScreen.js**: Focus-based refresh + duplicate calls
3. **OrdersScreen.js**: Focus-based WhatsApp status checks
4. **POSScreen.js**: Focus-based product refresh

## Recommended Fix Priority

### Phase 1 (Immediate - High Impact)

1. **Remove Focus-Based API Calls** (2 files)
   - POSScreen.js: Remove `useFocusEffect` with `refreshProducts()`
   - OrdersScreen.js: Remove `useFocusEffect` with `checkWhatsAppStatus()`

2. **Fix Parent-Child Duplicates** (5 files)
   - ManageScreen + InventoryScreen product fetching
   - CartScreen WhatsApp service calls
   - Analytics screen data fetching

3. **Add Simple Guards** (3 files)
   - POSScreen: Timestamp guard for rapid remount
   - InventoryScreen: Guard for tab switching
   - ManageScreen: Guard for navigation focus

### Phase 2 (Follow-up - Medium Impact)

1. **Consolidate Service Calls** (10 files)
   - featureService initialization
   - WhatsApp service status checks
   - Orders service calls

2. **Optimize Lifecycle Patterns** (8 files)
   - Remove redundant useEffect calls
   - Consolidate initialization logic
   - Improve dependency arrays

## Implementation Guidelines

### DO:
- Use mount-based fetching (useEffect with empty deps)
- Implement user-triggered refresh (pull-to-refresh)
- Add simple timestamp guards for rapid remount
- Use context data instead of direct API calls
- Designate single component ownership for each API

### DON'T:
- Use useFocusEffect for API calls
- Call same API from parent and child
- Add complex caching or state management
- Change API contracts or backend behavior
- Modify business logic or UI outcomes

## Testing Strategy

### Regression Prevention:
1. Verify all user flows work identically
2. Ensure loading states remain unchanged
3. Check error handling behavior
4. Validate navigation flows
5. Test pull-to-refresh functionality

### Performance Validation:
1. Monitor network requests during navigation
2. Verify no API calls on screen focus
3. Ensure no duplicate calls for same screen visit
4. Check cached data usage

## Success Metrics

### Before Phase 1:
- API calls on every screen focus
- Duplicate calls in 24 files
- 2 problematic focus-based patterns

### After Phase 1 (Target):
- 0 API calls on screen focus (except user-triggered)
- 0 duplicate calls within same user interaction
- Predictable, minimal API behavior
- Identical user experience
- No broken functionality

---

*This documentation was generated from the API Audit Script analysis on 2026-01-08*