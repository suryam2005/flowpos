# POSScreen Stock Synchronization Implementation

## Overview

This document describes the implementation of database stock synchronization on screen focus for the POS screen. This feature ensures that when stock levels change in the database, the POS screen detects these changes and updates cart limits accordingly, notifying users of any stock changes that affect their cart.

**Requirement**: 1.5 - WHEN the available stock changes in the database THEN the POS Screen SHALL update the stock limit for products already in the cart

## Architecture

### Component Flow

```
Screen Focus → Refresh Products → Compare Stock Changes → Update Cart Limits → Notify User
     ↓              ↓                    ↓                      ↓                ↓
useFocusEffect  refreshProducts()  useEffect(products)  stockValidator  alertQueueManager
```

### Key Mechanisms

1. **Focus Detection**: `useFocusEffect` hook triggers product refresh when screen gains focus
2. **Stock Comparison**: `useEffect` compares current products with previous state
3. **Change Detection**: Identifies stock decreases for products in cart
4. **Validation**: Uses `stockValidator` to calculate new limits
5. **Notification**: Uses `alertQueueManager` to queue and display alerts

## Implementation Details

### 1. Previous State Tracking

```javascript
const previousProductsRef = useRef([]);
```

- Uses `useRef` to maintain previous product state across renders
- Enables comparison between current and previous stock levels
- Does not trigger re-renders when updated

### 2. Focus-Based Refresh

```javascript
useFocusEffect(
  useCallback(() => {
    if (initialLoadDone.current && products.length > 0) {
      console.log('🏪 [POS] Screen focused - refreshing products from backend');
      refreshProducts();
    }
  }, [refreshProducts, products.length])
);
```

- Triggers when screen comes into focus
- Skips initial mount to avoid duplicate fetches
- Fetches latest product data from backend

### 3. Stock Change Detection

```javascript
useEffect(() => {
  // Skip if initial load or no products/cart items
  if (!initialLoadDone.current || products.length === 0 || items.length === 0) {
    previousProductsRef.current = products;
    return;
  }

  const stockChanges = [];
  
  items.forEach(cartItem => {
    const currentProduct = products.find(p => p.id === cartItem.id);
    const previousProduct = previousProductsRef.current.find(p => p.id === cartItem.id);
    
    if (currentProduct && previousProduct && currentProduct.trackStock) {
      const currentStock = currentProduct.stock_quantity || currentProduct.stock || 0;
      const previousStock = previousProduct.stock_quantity || previousProduct.stock || 0;
      
      if (currentStock < previousStock) {
        // Stock decreased - record change
        const maxAddable = stockValidator.getMaxAddableQuantity(currentProduct, cartItem.quantity);
        
        stockChanges.push({
          productId: cartItem.id,
          productName: cartItem.name,
          previousStock,
          currentStock,
          cartQuantity: cartItem.quantity,
          maxAddable,
          outOfStock: currentStock === 0,
          exceedsStock: cartItem.quantity > currentStock
        });
      }
    }
  });

  previousProductsRef.current = products;
  
  // Display notifications...
}, [products, items]);
```

**Key Logic**:
- Only processes products in cart with stock tracking enabled
- Compares current stock with previous stock
- Detects stock decreases (ignores increases)
- Calculates new maximum addable quantity
- Identifies critical conditions (out of stock, exceeds stock)

### 4. Notification Strategy

Four types of notifications based on stock change severity:

#### Type 1: Out of Stock
```javascript
if (change.outOfStock) {
  alertQueueManager.enqueue({
    title: 'Stock Update',
    message: `${change.productName} is now out of stock. You have ${change.cartQuantity} in your cart.`,
    type: 'warning',
    buttons: [{ text: 'OK', style: 'default' }],
  });
}
```
**Condition**: Stock = 0  
**User Impact**: Cannot add more, existing cart items remain

#### Type 2: Cart Exceeds Stock
```javascript
else if (change.exceedsStock) {
  alertQueueManager.enqueue({
    title: 'Stock Limit Changed',
    message: `${change.productName} stock decreased to ${change.currentStock}. You have ${change.cartQuantity} in your cart. You cannot add more items.`,
    type: 'warning',
    buttons: [{ text: 'OK', style: 'default' }],
  });
}
```
**Condition**: Cart quantity > current stock  
**User Impact**: Cannot add more, cart quantity exceeds available stock

#### Type 3: Stock Limit Reached
```javascript
else if (change.maxAddable === 0) {
  alertQueueManager.enqueue({
    title: 'Stock Limit Reached',
    message: `${change.productName} stock decreased to ${change.currentStock}. You have ${change.cartQuantity} in your cart and cannot add more.`,
    type: 'warning',
    buttons: [{ text: 'OK', style: 'default' }],
  });
}
```
**Condition**: Cart quantity = current stock (maxAddable = 0)  
**User Impact**: Cannot add more, cart is at stock limit

#### Type 4: Stock Updated
```javascript
else {
  alertQueueManager.enqueue({
    title: 'Stock Updated',
    message: `${change.productName} stock decreased to ${change.currentStock}. You can add ${change.maxAddable} more.`,
    type: 'default',
    buttons: [{ text: 'OK', style: 'default' }],
  });
}
```
**Condition**: Stock decreased but can still add some  
**User Impact**: Can add limited additional quantity

## Edge Cases Handled

### 1. Initial Screen Load
- **Scenario**: First time loading POS screen
- **Handling**: `initialLoadDone.current` flag prevents notifications on initial load
- **Reason**: No previous state to compare against

### 2. Empty Cart
- **Scenario**: No items in cart
- **Handling**: Early return if `items.length === 0`
- **Reason**: No cart items to validate against

### 3. No Products
- **Scenario**: Products not yet loaded
- **Handling**: Early return if `products.length === 0`
- **Reason**: Cannot compare without product data

### 4. Non-Tracked Products
- **Scenario**: Product has `trackStock=false`
- **Handling**: Skip validation with `if (currentProduct.trackStock)`
- **Reason**: Stock limits don't apply to non-tracked products

### 5. Stock Increases
- **Scenario**: Stock increases instead of decreases
- **Handling**: Only process `if (currentStock < previousStock)`
- **Reason**: Stock increases don't require user notification

### 6. Multiple Stock Changes
- **Scenario**: Multiple products have stock changes
- **Handling**: All changes collected in array, then queued
- **Reason**: Alert queue ensures sequential display

### 7. Product Not Found
- **Scenario**: Product in cart but not in current products list
- **Handling**: Check `if (currentProduct && previousProduct)`
- **Reason**: Prevents errors from missing products

## Integration Points

### StockValidator Service
```javascript
const maxAddable = stockValidator.getMaxAddableQuantity(currentProduct, cartItem.quantity);
```
- Calculates maximum quantity that can be added
- Considers current cart quantity
- Returns 0 if stock limit reached

### AlertQueueManager
```javascript
alertQueueManager.enqueue({
  title: 'Stock Update',
  message: '...',
  type: 'warning',
  buttons: [{ text: 'OK', style: 'default' }],
});
```
- Queues notifications to prevent overlapping
- Displays alerts sequentially
- Maintains proper z-index layering

### useRealtimeProducts Hook
```javascript
const { data: products, refresh: refreshProducts } = useRealtimeProducts();
```
- Provides current product data
- Exposes refresh function for manual updates
- Integrates with DataSyncContext

## Performance Considerations

### 1. Efficient Comparison
- Only compares products that are in cart
- Uses `Array.find()` for O(n) lookups
- Processes only on product changes (not every render)

### 2. Ref-Based State
- Uses `useRef` instead of `useState` for previous products
- Avoids unnecessary re-renders
- Maintains stable reference across renders

### 3. Early Returns
- Multiple early return conditions
- Skips processing when not needed
- Reduces unnecessary computations

### 4. Dependency Array
- `useEffect` depends on `[products, items]`
- Only runs when products or cart items change
- Prevents excessive executions

## Testing Strategy

### Manual Testing
See `POSScreen.stocksync.manual.test.md` for comprehensive manual test scenarios

### Key Test Cases
1. Stock decrease detection
2. Out of stock notification
3. Cart exceeds stock notification
4. Stock limit reached notification
5. Multiple product changes
6. No changes (silent operation)
7. Non-tracked products
8. Empty cart
9. Initial load
10. Increment button disabled state

## Future Enhancements

### Potential Improvements
1. **Batch Notifications**: Combine multiple stock changes into single notification
2. **Stock Increase Alerts**: Optionally notify when stock increases
3. **Auto-Adjust Cart**: Automatically reduce cart quantity when stock decreases below cart quantity
4. **Persistent Warnings**: Show persistent badge on products with stock issues
5. **Undo Capability**: Allow users to undo cart changes caused by stock updates

### Performance Optimizations
1. **Debouncing**: Debounce stock change detection for rapid updates
2. **Memoization**: Memoize stock comparison logic
3. **Virtual Scrolling**: Optimize for large product lists
4. **Background Sync**: Sync stock in background without blocking UI

## Troubleshooting

### Issue: Notifications Not Appearing
**Possible Causes**:
- Alert queue is full or blocked
- Products not refreshing on focus
- Stock tracking disabled on products

**Solutions**:
- Check `alertQueueManager` state
- Verify `refreshProducts()` is called
- Confirm `trackStock=true` on products

### Issue: Duplicate Notifications
**Possible Causes**:
- Multiple focus events
- Products updating multiple times
- Previous state not updating

**Solutions**:
- Check `initialLoadDone` flag
- Verify `previousProductsRef` is updating
- Add logging to track execution flow

### Issue: Incorrect Stock Values
**Possible Causes**:
- Database not syncing
- Cache issues
- Field name mismatch (`stock` vs `stock_quantity`)

**Solutions**:
- Verify database updates
- Clear AsyncStorage cache
- Check product object structure

## Conclusion

This implementation provides robust stock synchronization that:
- ✅ Detects stock changes when screen gains focus
- ✅ Updates cart limits based on new stock levels
- ✅ Notifies users of stock changes affecting their cart
- ✅ Handles edge cases gracefully
- ✅ Integrates seamlessly with existing systems
- ✅ Maintains good performance
- ✅ Provides clear user feedback

The feature ensures users are always aware of stock availability and prevents orders that exceed inventory levels.
