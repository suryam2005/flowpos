# InventoryScreen Database Sync Flow Diagram

## Stock Update Flow

```
User Action: Click "Update" Button
         ↓
    Open Modal
         ↓
User Enters New Stock Value
         ↓
User Clicks "Update Stock"
         ↓
    setSyncingProducts(add productId)
         ↓
    Show Loading Indicator
         ↓
DatabaseSyncService.syncProduct()
         ↓
    ┌─────────────────────┐
    │  Update Local       │
    │  AsyncStorage       │
    └─────────┬───────────┘
              ↓
    ┌─────────────────────┐
    │  Update Database    │
    │  with Retry Logic   │
    └─────────┬───────────┘
              ↓
         Success?
         ↙     ↘
      YES       NO
       ↓         ↓
   Update UI   Rollback Local
       ↓         ↓
   Success     Store Retry Op
    Alert        ↓
       ↓      Show Error Alert
   Haptic      with Retry Button
  Feedback        ↓
       ↓      User Choice?
       ↓      ↙         ↘
       ↓   Retry      Cancel
       ↓     ↓           ↓
       ↓  handleRetry() Clear Op
       ↓     ↓           ↓
       └─────┴───────────┘
              ↓
    setSyncingProducts(remove productId)
              ↓
         Hide Loading
```

## Track Stock Toggle Flow

```
User Action: Toggle Switch
         ↓
    setSyncingProducts(add productId)
         ↓
    Show Loading Spinner
         ↓
DatabaseSyncService.updateTrackStock()
         ↓
    ┌─────────────────────┐
    │  Update Database    │
    │  with Retry Logic   │
    └─────────┬───────────┘
              ↓
         Success?
         ↙     ↘
      YES       NO
       ↓         ↓
   Update Local  Store Retry Op
    State & AS     ↓
       ↓      Show Error Alert
   Update UI   with Retry Button
       ↓           ↓
   Haptic      User Choice?
  Feedback     ↙         ↘
       ↓    Retry      Cancel
       ↓      ↓           ↓
       ↓  handleRetry() Clear Op
       ↓      ↓           ↓
       └──────┴───────────┘
              ↓
    setSyncingProducts(remove productId)
              ↓
         Hide Loading
```

## DatabaseSyncService Retry Logic

```
updateWithRetry(productId, payload)
         ↓
    Attempt 1
         ↓
    API Call
         ↓
    Success?
      ↙   ↘
    YES    NO
     ↓      ↓
  Return  Wait 1s
  Success   ↓
     ↓   Attempt 2
     ↓      ↓
     ↓   API Call
     ↓      ↓
     ↓   Success?
     ↓    ↙   ↘
     ↓  YES    NO
     ↓   ↓      ↓
     ↓ Return  Wait 2s
     ↓ Success   ↓
     ↓   ↓   Attempt 3
     ↓   ↓      ↓
     ↓   ↓   API Call
     ↓   ↓      ↓
     ↓   ↓   Success?
     ↓   ↓    ↙   ↘
     ↓   ↓  YES    NO
     ↓   ↓   ↓      ↓
     ↓   ↓ Return  Wait 4s
     ↓   ↓ Success   ↓
     ↓   ↓   ↓   Attempt 4
     ↓   ↓   ↓      ↓
     ↓   ↓   ↓   API Call
     ↓   ↓   ↓      ↓
     ↓   ↓   ↓   Success?
     ↓   ↓   ↓    ↙   ↘
     ↓   ↓   ↓  YES    NO
     ↓   ↓   ↓   ↓      ↓
     ↓   ↓   ↓ Return Return
     ↓   ↓   ↓ Success Failure
     ↓   ↓   ↓   ↓      ↓
     └───┴───┴───┴──────┘
              ↓
    Return to Caller
```

## Atomic Update Pattern (syncProduct)

```
syncProduct(productId, updates)
         ↓
    Get Local Products
         ↓
    Find Product
         ↓
    Store Original (for rollback)
         ↓
    ┌─────────────────────┐
    │  Step 1:            │
    │  Update Local       │
    │  AsyncStorage       │
    └─────────┬───────────┘
              ↓
         Success?
         ↙     ↘
      YES       NO
       ↓         ↓
    ┌─────────────────────┐
    │  Step 2:            │  Return
    │  Update Database    │  Failure
    │  with Retry         │
    └─────────┬───────────┘
              ↓
         Success?
         ↙     ↘
      YES       NO
       ↓         ↓
   Return    ┌─────────────────────┐
   Success   │  Rollback:          │
       ↓     │  Restore Original   │
       ↓     │  to AsyncStorage    │
       ↓     └─────────┬───────────┘
       ↓               ↓
       ↓          Return Failure
       ↓               ↓
       └───────────────┘
```

## Component State Management

```
InventoryScreen State:
├── products: Array<Product>
├── syncingProducts: Set<productId>
├── retryOperation: {
│   type: 'updateStock' | 'toggleTrackStock',
│   productId: string,
│   value: any
│ }
└── ... other UI state

Product Card Rendering:
├── Check if product.id in syncingProducts
│   ├── YES: Show loading indicator
│   │   ├── Disable update button
│   │   ├── Show spinner for track stock
│   │   └── Display "Syncing..." text
│   └── NO: Show normal UI
│       ├── Enable update button
│       ├── Show track stock switch
│       └── Display stock quantity
```

## Error Handling Flow

```
Sync Operation Fails
         ↓
    Store Operation Details
    in retryOperation state
         ↓
    Show Alert Dialog
    ┌─────────────────────┐
    │  Title: "Sync Failed"│
    │  Message: error.msg  │
    │  Buttons:            │
    │  - Cancel            │
    │  - Retry             │
    └─────────┬───────────┘
              ↓
         User Choice
         ↙         ↘
     Cancel       Retry
       ↓            ↓
   Clear Op    handleRetry()
       ↓            ↓
    Done      Re-execute Operation
                    ↓
              (Back to sync flow)
```

## Loading State Lifecycle

```
Operation Starts
         ↓
setSyncingProducts(prev => new Set(prev).add(productId))
         ↓
    UI Updates:
    - Show ActivityIndicator
    - Disable controls
    - Show "Syncing..." text
         ↓
    Perform Sync Operation
         ↓
    Operation Completes
    (success or failure)
         ↓
setSyncingProducts(prev => {
  const newSet = new Set(prev);
  newSet.delete(productId);
  return newSet;
})
         ↓
    UI Updates:
    - Hide ActivityIndicator
    - Enable controls
    - Hide "Syncing..." text
```

## Key Integration Points

1. **DatabaseSyncService Import**
   ```javascript
   import databaseSyncService from '../../services/DatabaseSyncService';
   ```

2. **Stock Update Integration**
   ```javascript
   const result = await databaseSyncService.syncProduct(productId, {
     stock: stockValue,
     stock_quantity: stockValue
   });
   ```

3. **Track Stock Integration**
   ```javascript
   const result = await databaseSyncService.updateTrackStock(productId, newValue);
   ```

4. **Loading State Management**
   ```javascript
   const isSyncing = syncingProducts.has(item.id);
   ```

5. **Retry Mechanism**
   ```javascript
   setRetryOperation({ type, productId, value });
   // ... later ...
   handleRetry() // Re-executes the operation
   ```
