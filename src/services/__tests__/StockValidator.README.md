# StockValidator Service

## Overview
The StockValidator service provides comprehensive stock validation logic for the FlowPOS application. It ensures that products cannot be added to the cart in quantities that exceed available stock.

## Location
`flowpos/src/services/StockValidator.js`

## Features Implemented

### 1. validateQuantity(product, requestedQuantity, currentCartQuantity)
Validates if a requested quantity is available for a product.

**Returns:**
```javascript
{
  isValid: boolean,
  availableStock: number,
  maxAddable: number,
  message: string
}
```

### 2. getMaxAddableQuantity(product, currentCartQuantity)
Calculates the maximum quantity that can be added to the cart for a product.

**Returns:** `number` - Maximum addable quantity

### 3. canAddItem(product, currentCartQuantity)
Checks if at least 1 unit of a product can be added to the cart.

**Returns:** `boolean`

### 4. validateAgainstCart(product, cartItems, quantityToAdd)
Validates a product addition against the current cart state.

**Returns:**
```javascript
{
  isValid: boolean,
  availableStock: number,
  maxAddable: number,
  message: string,
  currentCartQuantity: number,
  newCartQuantity: number
}
```

### 5. shouldDisableIncrement(product, currentCartQuantity)
Determines if the increment button should be disabled for a product.

**Returns:** `boolean`

### 6. validateManualEntry(product, enteredQuantity)
Validates manually entered quantities.

**Returns:**
```javascript
{
  isValid: boolean,
  adjustedQuantity: number,
  message: string
}
```

## Key Behaviors

1. **Stock Tracking Disabled**: When `product.trackStock` is false, all validations pass and allow unlimited quantities.

2. **Out of Stock**: When `availableStock <= 0`, all additions are rejected with appropriate messaging.

3. **Cart Awareness**: All methods consider the current cart quantity to prevent exceeding stock limits.

4. **User-Friendly Messages**: Each validation returns clear, actionable messages for the user.

## Testing

Run the manual test suite:
```bash
node flowpos/src/services/__tests__/StockValidator.manual.test.js
```

**Test Coverage:**
- ✅ 25 test cases covering all methods
- ✅ Edge cases (zero stock, negative quantities, disabled tracking)
- ✅ Cart state integration
- ✅ Manual entry validation

## Requirements Satisfied

- **Requirement 1.1**: Validates quantity doesn't exceed available stock
- **Requirement 1.2**: Provides logic to disable increment button when stock limit reached
- **Requirement 1.3**: Validates manual quantity entry and shows maximum allowed

## Usage Example

```javascript
import stockValidator from '../services/StockValidator';

const product = {
  id: '123',
  name: 'Coffee Beans',
  trackStock: true,
  stock_quantity: 10
};

const cartItems = [{ id: '123', quantity: 7 }];

// Validate adding 5 more items
const result = stockValidator.validateAgainstCart(product, cartItems, 5);

if (!result.isValid) {
  console.log(result.message); // "Cannot add 5 items - Only 3 available"
}
```

## Next Steps

This service will be integrated into:
1. CartContext for stock-aware cart operations (Task 3)
2. POSScreen for UI validation and feedback (Task 4)
3. Real-time stock updates on screen focus (Task 11)
