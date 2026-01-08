# Parent-Child API Call Relationship Mapping

## Overview

This document maps the parent-child relationships between components and screens that make duplicate API calls, identifying ownership patterns and recommended fixes for Phase 1 optimization.

## Identified Parent-Child Duplicates

### 1. ManageScreen → InventoryScreen (Products Data)

**Current Problem:**
```javascript
// ManageScreen.js
useEffect(() => {
  loadProducts(false, true); // Calls productsService.getProducts()
}, []);

// InventoryScreen.js (child tab)
useEffect(() => {
  loadProducts(); // Also calls productsService.getProducts()
}, []);
```

**Issue**: Both parent and child fetch the same products data independently.

**Recommended Fix:**
- ManageScreen owns the products data fetching
- Pass products data to InventoryScreen via props
- Remove API call from InventoryScreen

**Implementation:**
```javascript
// ManageScreen.js (Parent)
const ManageScreen = () => {
  const [products, setProducts] = useState([]);
  
  useEffect(() => {
    loadProducts(); // Single source of truth
  }, []);
  
  return (
    <InventoryScreen 
      products={products}
      onProductUpdate={handleProductUpdate}
      isActive={activeTab === 'Inventory'}
    />
  );
};

// InventoryScreen.js (Child)
const InventoryScreen = ({ products, onProductUpdate, isActive }) => {
  // Remove useEffect with loadProducts()
  // Use products from props
};
```

### 2. CartScreen → Child Components (WhatsApp Service)

**Current Problem:**
```javascript
// CartScreen.js
const checkWhatsAppStatus = async () => {
  const status = await WhatsAppService.getStatus(); // API call
};

// Child components also call WhatsAppService methods
const sendInvoice = async () => {
  await WhatsAppService.sendInvoiceMessage(); // Duplicate service usage
};
```

**Issue**: Multiple components in cart flow call WhatsApp service independently.

**Recommended Fix:**
- CartScreen owns all WhatsApp service interactions
- Pass WhatsApp status and handlers to children via props
- Centralize WhatsApp logic in parent

### 3. AnalyticsScreen → Chart Components (Data Fetching)

**Current Problem:**
```javascript
// AnalyticsScreen.js
useEffect(() => {
  loadAnalyticsData(); // Fetches data
}, []);

// Chart components may also fetch data
const ChartComponent = () => {
  useEffect(() => {
    fetchChartData(); // Potential duplicate
  }, []);
};
```

**Recommended Fix:**
- AnalyticsScreen owns all data fetching
- Pass processed data to chart components
- Remove data fetching from chart components

## Service-Level Ownership Patterns

### featureService Usage

**Current Scattered Usage:**
- AnalyticsScreen: `featureService.canUseFeature()`
- SettingsScreen: `featureService.canUseFeature()`, `featureService.showUpgradePrompt()`
- SubscriptionScreen: `featureService.initialize()`
- CSVExportService: `featureService.initialize()`

**Recommended Pattern:**
- Initialize featureService once at app level
- Use context or props to pass feature flags
- Avoid repeated initialization calls

### WhatsApp Service Coordination

**Current Multiple Callers:**
- OrdersScreen: `WhatsAppService.getStatus()`, `WhatsAppService.sendInvoiceMessage()`
- CartScreen: `WhatsAppService.sendInvoiceMessage()`
- SimpleInvoicePreview: `WhatsAppService.sendInvoiceMessage()`
- SettingsScreen: `WhatsAppService.setWhatsAppMethod()`

**Recommended Pattern:**
- Centralize WhatsApp status management
- Use context for WhatsApp configuration
- Avoid duplicate status checks

## Navigation-Based Duplicates

### Tab Switching Patterns

**ManageScreen Tab Navigation:**
```javascript
// Current: Each tab loads its own data
const handleTabChange = (tab) => {
  setActiveTab(tab);
  // Each tab component then calls its own API
};
```

**Recommended Pattern:**
```javascript
// Parent loads all necessary data
const ManageScreen = () => {
  const [products, setProducts] = useState([]);
  const [storeSettings, setStoreSettings] = useState({});
  
  useEffect(() => {
    // Load all data needed by tabs
    Promise.all([
      loadProducts(),
      loadStoreSettings()
    ]);
  }, []);
  
  const renderActiveTab = () => {
    switch (activeTab) {
      case 'Products':
        return <ProductsTab products={products} />;
      case 'Inventory':
        return <InventoryTab products={products} />;
      case 'Store Settings':
        return <StoreSettingsTab settings={storeSettings} />;
    }
  };
};
```

## Focus-Based Refresh Conflicts

### Current Problematic Pattern

```javascript
// Parent screen
useFocusEffect(() => {
  loadData(); // API call on focus
});

// Child component
useEffect(() => {
  loadData(); // Same API call on mount
}, []);
```

**Issue**: When navigating to parent screen, both parent focus and child mount trigger the same API.

**Fix**: Remove focus-based calls, use only mount-based calls.

## Recommended Ownership Rules

### 1. Screen-Level Ownership
- Each screen owns its primary data fetching
- Child components receive data via props
- No API calls in child components unless absolutely necessary

### 2. Service Initialization
- Initialize services once at app startup
- Use context to share service state
- Avoid repeated initialization calls

### 3. Tab-Based Components
- Parent tab container owns all data fetching
- Individual tabs receive data via props
- No API calls when switching between tabs

### 4. Modal Components
- Parent screen owns data for modals
- Modal components receive data via props
- Modal actions update parent state

## Implementation Priority

### High Priority (Phase 1)
1. **ManageScreen → InventoryScreen**: Remove duplicate products fetching
2. **POSScreen**: Remove focus-based refresh, keep only mount-based
3. **OrdersScreen**: Remove focus-based WhatsApp status check

### Medium Priority (Phase 2)
1. **CartScreen**: Centralize WhatsApp service calls
2. **AnalyticsScreen**: Consolidate data fetching
3. **Service initialization**: Reduce duplicate initialization calls

### Low Priority (Phase 3)
1. **Feature service**: Centralize feature flag management
2. **Settings screens**: Optimize context usage
3. **Hook optimization**: Reduce duplicate service calls in hooks

## Testing Checklist

For each parent-child fix:

### Functional Testing
- [ ] Parent data loads correctly
- [ ] Child receives data via props
- [ ] User interactions work identically
- [ ] Error handling preserved
- [ ] Loading states unchanged

### Performance Testing
- [ ] No duplicate API calls
- [ ] Faster screen transitions
- [ ] Reduced network requests
- [ ] Cached data usage

### Regression Testing
- [ ] All user flows work
- [ ] Navigation unchanged
- [ ] Business logic preserved
- [ ] UI behavior identical

## Success Metrics

### Before Fix
- Multiple API calls for same data
- Slow tab switching
- Network requests on every focus
- Duplicate service initialization

### After Fix
- Single API call per data requirement
- Instant tab switching (cached data)
- No network requests on focus
- One-time service initialization

---

*This mapping was generated from API audit analysis to guide Phase 1 optimization implementation*