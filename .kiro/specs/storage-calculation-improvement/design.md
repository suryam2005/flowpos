# Design Document: Storage Calculation Improvement

## Overview

This design improves the accuracy of storage usage calculations by applying a configurable multiplier to database data sizes. The multiplier accounts for database overhead including indexes, row headers, metadata, and internal structures that are not captured by simple JSON serialization.

## Architecture

The change is localized to the backend storage calculation endpoint in `flowposbackend/routes/subscription.js`. No frontend changes are required as the API response format remains the same.

```
┌─────────────────────────────────────────────────────────────┐
│                    Storage Calculation Flow                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Fetch raw data from Supabase                            │
│     ├── Products                                            │
│     ├── Orders                                              │
│     ├── Order Items                                         │
│     └── Store                                               │
│                                                             │
│  2. Calculate raw sizes (JSON.stringify().length)           │
│                                                             │
│  3. Apply STORAGE_MULTIPLIER to database data               │
│     ├── productsSize * STORAGE_MULTIPLIER                   │
│     ├── ordersSize * STORAGE_MULTIPLIER                     │
│     ├── orderItemsSize * STORAGE_MULTIPLIER                 │
│     └── storeSize * STORAGE_MULTIPLIER                      │
│                                                             │
│  4. Keep image sizes unchanged (actual file sizes)          │
│                                                             │
│  5. Calculate totals and percentages                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Storage Multiplier Configuration

```javascript
// Configuration constant at top of file
const STORAGE_MULTIPLIER = 2.0; // Accounts for database overhead (indexes, metadata, row headers)
```

### Modified Size Calculations

```javascript
// Apply multiplier to database data sizes
const adjustedProductsSize = productsSize * STORAGE_MULTIPLIER;
const adjustedOrdersSize = ordersSize * STORAGE_MULTIPLIER;
const adjustedOrderItemsSize = orderItemsSize * STORAGE_MULTIPLIER;
const adjustedStoreSize = storeSize * STORAGE_MULTIPLIER;

// Images remain unchanged (actual file sizes)
// imagesSize stays as-is

// Calculate totals with adjusted sizes
const adjustedDatabaseSize = adjustedProductsSize + adjustedOrdersSize + adjustedOrderItemsSize + adjustedStoreSize;
const totalSize = adjustedDatabaseSize + imagesSize;
```

### Response Enhancement

```javascript
// Add note about overhead estimation
const storageData = {
  // ... existing fields ...
  note: 'Database sizes include estimated overhead for indexes and metadata',
  multiplierApplied: STORAGE_MULTIPLIER
};
```

## Data Models

No changes to data models. The calculation is purely computational.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Database Data Multiplier Application

*For any* database data type (products, orders, order_items, store), the calculated adjusted size SHALL equal the raw JSON size multiplied by STORAGE_MULTIPLIER.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Image Size Preservation

*For any* product image storage calculation, the image size SHALL remain unchanged (not multiplied).

**Validates: Requirements 2.1**

### Property 3: Over Limit Detection

*For any* storage calculation where total adjusted size exceeds quota, the isOverLimit flag SHALL be true.

**Validates: Requirements 3.3**

## Error Handling

- If STORAGE_MULTIPLIER is not defined, default to 2.0
- If any size calculation fails, use 0 for that component
- Existing error handling for Supabase queries remains unchanged

## Testing Strategy

### Unit Tests
- Test that multiplier is applied correctly to each data type
- Test that images are not multiplied
- Test isOverLimit flag when total exceeds quota
- Test default multiplier value

### Property-Based Tests
- Property 1: Generate random data sizes, verify adjusted = raw * multiplier
- Property 2: Generate random image sizes, verify they remain unchanged
- Property 3: Generate random totals and quotas, verify isOverLimit correctness

### Integration Tests
- Test full storage calculation endpoint with mock data
- Verify response format includes new fields (note, multiplierApplied)
