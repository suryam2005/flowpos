# POSScreen Stock Synchronization Manual Test

## Feature: Database Stock Synchronization on Screen Focus

**Requirement**: 1.5 - WHEN the available stock changes in the database THEN the POS Screen SHALL update the stock limit for products already in the cart

## Test Scenarios

### Scenario 1: Stock Decrease Detection
**Given**: A product with stock tracking enabled is in the cart
**When**: The product's stock decreases in the database and the screen regains focus
**Then**: The system should detect the stock change and display a notification

**Steps**:
1. Add a product with trackStock=true to the cart (e.g., 2 units of a product with 10 in stock)
2. Navigate away from POS screen
3. Manually decrease the product's stock in the database (e.g., to 5)
4. Navigate back to POS screen
5. Verify notification appears: "Stock Updated - [Product] stock decreased to 5. You can add 3 more."

**Expected Result**: ✅ Notification displays with correct stock information

---

### Scenario 2: Product Goes Out of Stock
**Given**: A product is in the cart with available stock
**When**: The product's stock becomes 0 in the database
**Then**: The system should notify that the product is out of stock

**Steps**:
1. Add a product to cart (e.g., 2 units)
2. Navigate away from POS screen
3. Set product stock to 0 in database
4. Navigate back to POS screen
5. Verify notification: "Stock Update - [Product] is now out of stock. You have 2 in your cart."

**Expected Result**: ✅ Out of stock notification displays

---

### Scenario 3: Cart Quantity Exceeds New Stock
**Given**: A product in cart with quantity that will exceed new stock level
**When**: Stock decreases below cart quantity
**Then**: System notifies that cart quantity exceeds available stock

**Steps**:
1. Add 5 units of a product to cart (stock = 10)
2. Navigate away from POS screen
3. Decrease product stock to 3 in database
4. Navigate back to POS screen
5. Verify notification: "Stock Limit Changed - [Product] stock decreased to 3. You have 5 in your cart. You cannot add more items."

**Expected Result**: ✅ Stock limit notification displays

---

### Scenario 4: Stock Limit Reached (No More Can Be Added)
**Given**: Cart quantity equals new stock level
**When**: Stock decreases to match cart quantity
**Then**: System notifies that stock limit is reached

**Steps**:
1. Add 5 units of a product to cart (stock = 10)
2. Navigate away from POS screen
3. Decrease product stock to 5 in database
4. Navigate back to POS screen
5. Verify notification: "Stock Limit Reached - [Product] stock decreased to 5. You have 5 in your cart and cannot add more."

**Expected Result**: ✅ Stock limit reached notification displays

---

### Scenario 5: Multiple Products with Stock Changes
**Given**: Multiple products in cart with stock tracking
**When**: Multiple products have stock changes
**Then**: System queues notifications for all affected products

**Steps**:
1. Add 3 different products to cart
2. Navigate away from POS screen
3. Decrease stock for all 3 products in database
4. Navigate back to POS screen
5. Verify multiple notifications appear sequentially (queued)

**Expected Result**: ✅ All notifications display one at a time

---

### Scenario 6: No Stock Changes
**Given**: Products in cart with no stock changes
**When**: Screen regains focus
**Then**: No notifications should appear

**Steps**:
1. Add products to cart
2. Navigate away from POS screen
3. Do not change any stock values
4. Navigate back to POS screen
5. Verify no stock notifications appear

**Expected Result**: ✅ No notifications (silent operation)

---

### Scenario 7: Product Without Stock Tracking
**Given**: Product in cart with trackStock=false
**When**: Screen regains focus
**Then**: No stock validation or notifications

**Steps**:
1. Add product with trackStock=false to cart
2. Navigate away from POS screen
3. Navigate back to POS screen
4. Verify no stock notifications appear

**Expected Result**: ✅ No notifications for non-tracked products

---

### Scenario 8: Empty Cart
**Given**: Cart is empty
**When**: Screen regains focus with stock changes
**Then**: No notifications should appear

**Steps**:
1. Ensure cart is empty
2. Navigate away from POS screen
3. Change product stocks in database
4. Navigate back to POS screen
5. Verify no notifications appear

**Expected Result**: ✅ No notifications when cart is empty

---

### Scenario 9: Initial Screen Load
**Given**: First time loading POS screen
**When**: Screen loads with products
**Then**: No stock change notifications should appear

**Steps**:
1. Fresh app start or first navigation to POS screen
2. Verify no stock notifications appear on initial load

**Expected Result**: ✅ No notifications on initial load

---

### Scenario 10: Increment Button Disabled After Stock Decrease
**Given**: Product in cart with stock that decreases
**When**: Stock decreases to match cart quantity
**Then**: Increment button should be disabled

**Steps**:
1. Add 3 units of product to cart (stock = 10)
2. Navigate away and decrease stock to 3
3. Navigate back to POS screen
4. Try to add more of the product
5. Verify increment is disabled and shows "Stock Limit" badge

**Expected Result**: ✅ Cannot add more items, UI reflects stock limit

---

## Implementation Details

### Key Components
- **useFocusEffect**: Triggers product refresh when screen gains focus
- **useEffect**: Monitors product changes and compares with previous state
- **stockValidator**: Validates stock limits and calculates max addable quantity
- **alertQueueManager**: Queues and displays stock change notifications

### Stock Change Detection Logic
```javascript
// Compare current products with previous products
items.forEach(cartItem => {
  const currentProduct = products.find(p => p.id === cartItem.id);
  const previousProduct = previousProductsRef.current.find(p => p.id === cartItem.id);
  
  if (currentProduct && previousProduct && currentProduct.trackStock) {
    const currentStock = currentProduct.stock_quantity || currentProduct.stock || 0;
    const previousStock = previousProduct.stock_quantity || previousProduct.stock || 0;
    
    if (currentStock < previousStock) {
      // Stock decreased - notify user
    }
  }
});
```

### Notification Types
1. **Out of Stock**: Stock = 0
2. **Exceeds Stock**: Cart quantity > new stock
3. **Stock Limit Reached**: Cart quantity = new stock
4. **Stock Updated**: Stock decreased but can still add some

## Testing Notes

- All notifications use the alert queue system to prevent overlapping
- Stock changes are only detected for products with `trackStock=true`
- Initial screen load does not trigger stock change notifications
- Empty cart does not trigger stock change notifications
- Previous product state is tracked using `useRef` to enable comparison

## Validation Checklist

- [ ] Stock decrease detected correctly
- [ ] Out of stock notification displays
- [ ] Cart quantity exceeds stock notification displays
- [ ] Stock limit reached notification displays
- [ ] Multiple notifications queue properly
- [ ] No notifications when no changes
- [ ] Non-tracked products ignored
- [ ] Empty cart ignored
- [ ] Initial load ignored
- [ ] Increment button disabled when stock limit reached
