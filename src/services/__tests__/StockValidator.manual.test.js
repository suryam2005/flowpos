/**
 * Manual Test for StockValidator
 * 
 * Run this file with: node flowpos/src/services/__tests__/StockValidator.manual.test.js
 * 
 * This is a simple verification script to ensure StockValidator works correctly
 * before integrating it into the application.
 */

// Mock the StockValidator class inline for testing
class StockValidator {
  validateQuantity(product, requestedQuantity, currentCartQuantity = 0) {
    if (!product.trackStock) {
      return {
        isValid: true,
        availableStock: Infinity,
        maxAddable: Infinity,
        message: 'Stock tracking disabled'
      };
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    const totalQuantity = currentCartQuantity + requestedQuantity;
    const maxAddable = Math.max(0, availableStock - currentCartQuantity);

    if (availableStock <= 0) {
      return {
        isValid: false,
        availableStock: 0,
        maxAddable: 0,
        message: `${product.name} is currently out of stock`
      };
    }

    if (totalQuantity > availableStock) {
      return {
        isValid: false,
        availableStock,
        maxAddable,
        message: `Cannot add ${requestedQuantity} items - Only ${maxAddable} available`
      };
    }

    return {
      isValid: true,
      availableStock,
      maxAddable,
      message: 'Quantity available'
    };
  }

  getMaxAddableQuantity(product, currentCartQuantity = 0) {
    if (!product.trackStock) {
      return 999999;
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    const maxAddable = Math.max(0, availableStock - currentCartQuantity);
    
    return maxAddable;
  }

  canAddItem(product, currentCartQuantity = 0) {
    const validation = this.validateQuantity(product, 1, currentCartQuantity);
    return validation.isValid;
  }

  validateAgainstCart(product, cartItems, quantityToAdd = 1) {
    const cartItem = cartItems.find(item => item.id === product.id);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;

    const validation = this.validateQuantity(product, quantityToAdd, currentCartQuantity);

    return {
      ...validation,
      currentCartQuantity,
      newCartQuantity: validation.isValid ? currentCartQuantity + quantityToAdd : currentCartQuantity
    };
  }

  shouldDisableIncrement(product, currentCartQuantity = 0) {
    if (!product.trackStock) {
      return false;
    }

    const availableStock = product.stock_quantity || product.stock || 0;
    return currentCartQuantity >= availableStock;
  }

  validateManualEntry(product, enteredQuantity) {
    const quantity = Math.max(0, Math.floor(enteredQuantity));

    if (quantity === 0) {
      return {
        isValid: false,
        adjustedQuantity: 0,
        message: 'Quantity must be greater than 0'
      };
    }

    if (!product.trackStock) {
      return {
        isValid: true,
        adjustedQuantity: quantity,
        message: 'Quantity accepted'
      };
    }

    const availableStock = product.stock_quantity || product.stock || 0;

    if (quantity > availableStock) {
      return {
        isValid: false,
        adjustedQuantity: availableStock,
        message: `Maximum allowed quantity is ${availableStock}`
      };
    }

    return {
      isValid: true,
      adjustedQuantity: quantity,
      message: 'Quantity accepted'
    };
  }
}

// Test suite
const validator = new StockValidator();
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`❌ FAIL: ${testName}`);
    testsFailed++;
  }
}

console.log('\n🧪 Running StockValidator Manual Tests\n');

// Test 1: Product with stock tracking enabled and sufficient stock
const product1 = { id: '1', name: 'Product A', trackStock: true, stock_quantity: 10 };
const result1 = validator.validateQuantity(product1, 5, 0);
assert(result1.isValid === true, 'Test 1: Should allow adding 5 items when 10 available');
assert(result1.maxAddable === 10, 'Test 1: Max addable should be 10');

// Test 2: Product with stock tracking enabled and insufficient stock
const result2 = validator.validateQuantity(product1, 15, 0);
assert(result2.isValid === false, 'Test 2: Should reject adding 15 items when only 10 available');
assert(result2.maxAddable === 10, 'Test 2: Max addable should be 10');

// Test 3: Product with stock tracking disabled
const product2 = { id: '2', name: 'Product B', trackStock: false, stock_quantity: 5 };
const result3 = validator.validateQuantity(product2, 100, 0);
assert(result3.isValid === true, 'Test 3: Should allow any quantity when stock tracking disabled');

// Test 4: Product out of stock
const product3 = { id: '3', name: 'Product C', trackStock: true, stock_quantity: 0 };
const result4 = validator.validateQuantity(product3, 1, 0);
assert(result4.isValid === false, 'Test 4: Should reject when product is out of stock');
assert(result4.maxAddable === 0, 'Test 4: Max addable should be 0');

// Test 5: Product with items already in cart
const result5 = validator.validateQuantity(product1, 3, 7);
assert(result5.isValid === true, 'Test 5: Should allow adding 3 more when 7 already in cart (total 10)');

const result6 = validator.validateQuantity(product1, 4, 7);
assert(result6.isValid === false, 'Test 6: Should reject adding 4 more when 7 already in cart (total 11 > 10)');
assert(result6.maxAddable === 3, 'Test 6: Max addable should be 3');

// Test 7: getMaxAddableQuantity
const maxAddable1 = validator.getMaxAddableQuantity(product1, 0);
assert(maxAddable1 === 10, 'Test 7: Max addable should be 10 when cart is empty');

const maxAddable2 = validator.getMaxAddableQuantity(product1, 8);
assert(maxAddable2 === 2, 'Test 7: Max addable should be 2 when 8 already in cart');

// Test 8: canAddItem
const canAdd1 = validator.canAddItem(product1, 9);
assert(canAdd1 === true, 'Test 8: Should be able to add 1 more when 9 in cart');

const canAdd2 = validator.canAddItem(product1, 10);
assert(canAdd2 === false, 'Test 8: Should not be able to add when cart equals stock');

// Test 9: validateAgainstCart
const cart = [
  { id: '1', quantity: 5 }
];
const result7 = validator.validateAgainstCart(product1, cart, 3);
assert(result7.isValid === true, 'Test 9: Should allow adding 3 when 5 in cart');
assert(result7.currentCartQuantity === 5, 'Test 9: Current cart quantity should be 5');
assert(result7.newCartQuantity === 8, 'Test 9: New cart quantity should be 8');

// Test 10: shouldDisableIncrement
const shouldDisable1 = validator.shouldDisableIncrement(product1, 10);
assert(shouldDisable1 === true, 'Test 10: Should disable increment when cart equals stock');

const shouldDisable2 = validator.shouldDisableIncrement(product1, 5);
assert(shouldDisable2 === false, 'Test 10: Should not disable increment when cart less than stock');

// Test 11: validateManualEntry
const manual1 = validator.validateManualEntry(product1, 8);
assert(manual1.isValid === true, 'Test 11: Should accept manual entry of 8 when stock is 10');

const manual2 = validator.validateManualEntry(product1, 15);
assert(manual2.isValid === false, 'Test 11: Should reject manual entry of 15 when stock is 10');
assert(manual2.adjustedQuantity === 10, 'Test 11: Adjusted quantity should be 10');

const manual3 = validator.validateManualEntry(product1, 0);
assert(manual3.isValid === false, 'Test 11: Should reject manual entry of 0');

// Test 12: Edge case - negative quantity
const manual4 = validator.validateManualEntry(product1, -5);
assert(manual4.isValid === false, 'Test 12: Should reject negative quantity');
assert(manual4.adjustedQuantity === 0, 'Test 12: Adjusted quantity should be 0');

console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Total: ${testsPassed + testsFailed}\n`);

if (testsFailed === 0) {
  console.log('🎉 All tests passed!\n');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
}
