# CartContext Integration Tests

## Overview

This directory contains tests for the CartContext integration with StockValidator. The integration ensures that stock limits are enforced when adding items to the cart.

## Requirements Validated

- **Requirement 1.1**: Verify new quantity does not exceed available stock
- **Requirement 1.2**: Disable increment when selected quantity equals available stock
- **Requirement 1.3**: Reject manual entry that exceeds available stock
- **Requirement 1.4**: Synchronize selected quantity with current database stock level

## Test Files

### CartContext.manual.test.js

Manual verification tests that can be run with Node.js:

```bash
node src/context/__tests__/CartContext.manual.test.js
```

**Test Coverage:**
1. ✅ Add item within stock limit
2. ✅ Prevent adding beyond stock limit
3. ✅ Allow adding with stock tracking disabled
4. ✅ Reject out of stock product
5. ✅ Update quantity with stock validation
6. ✅ Update quantity within stock limit
7. ✅ canAddItem method validation
8. ✅ Incremental additions up to stock limit

### CartContext.test.js

Jest-based unit tests (requires Jest setup):

```bash
npm test CartContext.test.js
```

## Integration Details

### Modified CartContext Methods

#### `addItem(product, quantityToAdd = 1)`
- Now validates stock before adding
- Returns error in `lastError` state if validation fails
- Maintains backward compatibility with existing calls

#### `canAddItem(productId, product)`
- New method to check if at least 1 unit can be added
- Returns boolean based on stock availability

#### `getRemainingQuantity(productId, availableStock)`
- New method to get remaining addable quantity
- Useful for UI feedback

#### `clearError()`
- New method to clear the last error
- Called automatically on successful operations

### Cart Reducer Changes

#### ADD_ITEM Action
- Validates quantity against stock before adding
- Sets `lastError` if validation fails
- Prevents adding items that exceed stock limits

#### UPDATE_QUANTITY Action
- Caps quantity at available stock for tracked items
- Sets `lastError` if quantity is adjusted
- Allows unlimited quantity for non-tracked items

### Error Types

#### STOCK_LIMIT_EXCEEDED
Triggered when attempting to add more items than available stock.

**Error Object:**
```javascript
{
  type: 'STOCK_LIMIT_EXCEEDED',
  message: 'Cannot add X items - Only Y available',
  productId: '...',
  productName: '...',
  availableStock: Y,
  maxAddable: Y
}
```

#### QUANTITY_ADJUSTED
Triggered when UPDATE_QUANTITY caps the quantity at available stock.

**Error Object:**
```javascript
{
  type: 'QUANTITY_ADJUSTED',
  message: 'Quantity adjusted to X (available stock)',
  productId: '...'
}
```

## Usage Example

```javascript
import { useCart } from '../context/CartContext';

function ProductScreen() {
  const { addItem, canAddItem, getRemainingQuantity, lastError, clearError } = useCart();
  
  const product = {
    id: '1',
    name: 'Product Name',
    price: 10,
    trackStock: true,
    stock_quantity: 5
  };
  
  // Check if product can be added
  const canAdd = canAddItem(product.id, product);
  
  // Get remaining quantity
  const remaining = getRemainingQuantity(product.id, product.stock_quantity);
  
  // Add to cart
  addItem(product, 1);
  
  // Check for errors
  if (lastError) {
    console.log('Error:', lastError.message);
    clearError();
  }
}
```

## Backward Compatibility

The integration maintains backward compatibility with existing code:

- `addItem(product)` still works (defaults to quantity of 1)
- Existing screens will continue to function
- Stock validation is automatic and transparent

## Next Steps

The following screens need to be updated to handle stock validation errors:

1. **POSScreen.js** - Display stock limit alerts
2. **TabletPOSScreen.js** - Display stock limit alerts
3. **TabletCartScreen.js** - Handle increment button disabling
4. **TabletCartSidebar.js** - Handle increment button disabling

These updates will be handled in subsequent tasks.
