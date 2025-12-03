# DatabaseSyncService Test Documentation

## Overview

The DatabaseSyncService handles synchronization between local storage and the Supabase database for product data. It implements retry logic with exponential backoff for network failures and ensures atomic updates across local storage and database.

## Features

1. **Track Stock Updates**: Updates the `trackStock` boolean field for products
2. **Stock Quantity Updates**: Updates the `stock_quantity` field for products
3. **Atomic Sync**: Ensures both local storage and database are updated together, or neither is updated
4. **Retry Logic**: Implements exponential backoff retry (up to 3 retries) for network failures
5. **Error Handling**: Comprehensive error handling with user-friendly error messages
6. **Rollback Support**: Automatically rolls back local changes if database update fails

## API Methods

### `updateTrackStock(productId, trackStock)`

Updates the track stock setting for a product.

**Parameters:**
- `productId` (string): Product identifier
- `trackStock` (boolean): New track stock value

**Returns:**
```javascript
{
  success: boolean,
  error: string|null,
  data: Object|null
}
```

**Example:**
```javascript
const result = await databaseSyncService.updateTrackStock('product-123', true);
if (result.success) {
  console.log('Track stock updated:', result.data);
} else {
  console.error('Update failed:', result.error);
}
```

### `updateStockQuantity(productId, newStock)`

Updates the stock quantity for a product.

**Parameters:**
- `productId` (string): Product identifier
- `newStock` (number): New stock quantity (must be non-negative)

**Returns:**
```javascript
{
  success: boolean,
  error: string|null,
  data: Object|null
}
```

**Example:**
```javascript
const result = await databaseSyncService.updateStockQuantity('product-123', 50);
if (result.success) {
  console.log('Stock quantity updated:', result.data);
} else {
  console.error('Update failed:', result.error);
}
```

### `syncProduct(productId, updates)`

Syncs product data atomically between local storage and database.

**Parameters:**
- `productId` (string): Product identifier
- `updates` (Object): Fields to update

**Returns:**
```javascript
{
  success: boolean,
  error: string|null,
  data: Object|null
}
```

**Example:**
```javascript
const result = await databaseSyncService.syncProduct('product-123', {
  trackStock: true,
  stock_quantity: 100
});
if (result.success) {
  console.log('Product synced:', result.data);
} else {
  console.error('Sync failed:', result.error);
}
```

### `isSyncing()`

Checks if a sync operation is currently in progress.

**Returns:** `boolean`

**Example:**
```javascript
if (databaseSyncService.isSyncing()) {
  console.log('Sync in progress...');
}
```

## Retry Logic

The service implements exponential backoff retry logic:

- **Max Retries**: 3 attempts (4 total including initial attempt)
- **Base Delay**: 1000ms (1 second)
- **Backoff Formula**: `delay = BASE_DELAY * 2^attempt`
  - Attempt 1: 1000ms delay
  - Attempt 2: 2000ms delay
  - Attempt 3: 4000ms delay

## Error Handling

### Common Errors

1. **Validation Errors**
   - Empty product ID
   - Invalid trackStock type (not boolean)
   - Negative stock quantity
   - Invalid updates object

2. **Network Errors**
   - Connection timeout
   - Server unavailable
   - HTTP errors (4xx, 5xx)

3. **Storage Errors**
   - Local storage write failure
   - Product not found in local storage

4. **Sync Errors**
   - Database update failure
   - Atomic transaction failure

### Error Response Format

All methods return a consistent error format:

```javascript
{
  success: false,
  error: "Error message describing what went wrong",
  data: null
}
```

## Atomic Updates

The `syncProduct` method ensures atomic updates:

1. **Read** current local product data
2. **Update** local storage first
3. **Update** database with retry logic
4. **Rollback** local storage if database update fails

This ensures data consistency between local storage and database.

## Testing

### Manual Test

Run the manual test to verify the service:

```bash
node flowpos/src/services/__tests__/DatabaseSyncService.manual.test.js
```

### Test Coverage

The manual test covers:

- ✅ Valid track stock updates
- ✅ Valid stock quantity updates
- ✅ Input validation (empty IDs, invalid types, negative values)
- ✅ Atomic sync with rollback
- ✅ Retry logic with eventual success
- ✅ Retry logic with all failures
- ✅ Non-existent product handling
- ✅ Sync status checking

## Integration

### Import

```javascript
import databaseSyncService from './services/DatabaseSyncService';
```

### Usage in Components

```javascript
// In InventoryScreen.js
const handleTrackStockToggle = async (productId, newValue) => {
  setLoading(true);
  
  const result = await databaseSyncService.updateTrackStock(productId, newValue);
  
  if (result.success) {
    // Update UI
    Alert.alert('Success', 'Track stock setting updated');
  } else {
    // Show error
    Alert.alert('Error', result.error);
  }
  
  setLoading(false);
};

const handleStockUpdate = async (productId, newStock) => {
  setLoading(true);
  
  const result = await databaseSyncService.updateStockQuantity(productId, newStock);
  
  if (result.success) {
    Alert.alert('Success', 'Stock quantity updated');
  } else {
    Alert.alert('Error', result.error);
  }
  
  setLoading(false);
};
```

## Requirements Validation

This service validates the following requirements:

- **Requirement 3.1**: Updates trackStock field in database immediately when enabled
- **Requirement 3.2**: Updates trackStock field in database immediately when disabled
- **Requirement 3.3**: Verifies update success and displays error if synchronization fails
- **Requirement 3.4**: Synchronizes stock quantity to database for products with track stock enabled
- **Requirement 3.6**: Updates both local storage and database atomically
- **Requirement 3.7**: Retries operations on network errors and notifies user if all retries fail

## Performance Considerations

- **Debouncing**: Consider debouncing rapid toggle changes in the UI layer
- **Caching**: Service reads from local storage for atomic operations
- **Network**: Uses exponential backoff to avoid overwhelming the server
- **Concurrency**: Tracks sync status to prevent concurrent operations

## Future Enhancements

Potential improvements:

1. Queue multiple sync operations
2. Batch updates for multiple products
3. Offline queue with background sync
4. Conflict resolution for concurrent updates
5. Progress callbacks for long operations
