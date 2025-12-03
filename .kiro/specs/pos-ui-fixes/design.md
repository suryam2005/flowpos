# Design Document

## Overview

This design addresses four critical UI and synchronization issues in the FlowPOS application. The fixes focus on enforcing stock limits during product selection, preventing popup alert overlaps, ensuring proper database synchronization for the track stock toggle, and standardizing the clear cart confirmation UI.

The solution involves modifications to the POS screen's cart logic, implementing an alert queue system, enhancing the inventory screen's database synchronization, and standardizing the clear cart popup component.

## Architecture

### Component Structure

```
POSScreen
├── Product Selection Logic (Modified)
│   ├── Stock Validation
│   └── Cart Quantity Limits
├── Alert Queue System (New)
│   └── Sequential Alert Display
└── Clear Cart Handler (Standardized)

InventoryScreen
├── Track Stock Toggle (Enhanced)
│   ├── Database Sync
│   └── Error Handling
└── Stock Update Logic (Enhanced)

CartContext
└── Stock-Aware Operations (Modified)

CustomAlert
└── Queue-Aware Display (Modified)
```

### Data Flow

1. **Stock Limit Enforcement**: POS Screen → Cart Context → Stock Validation → Database Check
2. **Alert Queue**: Alert Trigger → Queue Manager → Sequential Display → Dismiss Handler
3. **Track Stock Sync**: Toggle Change → Database Update → Verification → UI Update
4. **Clear Cart**: Button Click → Standard Popup → User Confirmation → Cart Clear

## Components and Interfaces

### 1. Stock Validation Service

**Purpose**: Validate product quantities against available stock before adding to cart

**Interface**:
```javascript
class StockValidator {
  /**
   * Validates if requested quantity is available
   * @param {string} productId - Product identifier
   * @param {number} requestedQuantity - Quantity user wants to add
   * @param {number} currentCartQuantity - Quantity already in cart
   * @returns {Object} { isValid: boolean, availableStock: number, message: string }
   */
  validateQuantity(productId, requestedQuantity, currentCartQuantity)
  
  /**
   * Gets maximum quantity that can be added to cart
   * @param {Object} product - Product object with stock info
   * @param {number} currentCartQuantity - Quantity already in cart
   * @returns {number} Maximum addable quantity
   */
  getMaxAddableQuantity(product, currentCartQuantity)
}
```

### 2. Alert Queue Manager

**Purpose**: Manage sequential display of alerts to prevent overlapping

**Interface**:
```javascript
class AlertQueueManager {
  /**
   * Adds alert to queue
   * @param {Object} alertConfig - Alert configuration object
   */
  enqueue(alertConfig)
  
  /**
   * Removes current alert and shows next
   */
  dequeue()
  
  /**
   * Gets current alert to display
   * @returns {Object|null} Current alert config or null
   */
  getCurrentAlert()
  
  /**
   * Checks if queue has pending alerts
   * @returns {boolean}
   */
  hasPendingAlerts()
  
  /**
   * Clears all pending alerts
   */
  clearQueue()
}
```

### 3. Database Sync Service

**Purpose**: Handle synchronization between local storage and Supabase database

**Interface**:
```javascript
class DatabaseSyncService {
  /**
   * Updates track stock setting in database
   * @param {string} productId - Product identifier
   * @param {boolean} trackStock - New track stock value
   * @returns {Promise<Object>} { success: boolean, error: string|null }
   */
  async updateTrackStock(productId, trackStock)
  
  /**
   * Updates stock quantity in database
   * @param {string} productId - Product identifier
   * @param {number} newStock - New stock quantity
   * @returns {Promise<Object>} { success: boolean, error: string|null }
   */
  async updateStockQuantity(productId, newStock)
  
  /**
   * Syncs local storage with database atomically
   * @param {string} productId - Product identifier
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} { success: boolean, error: string|null }
   */
  async syncProduct(productId, updates)
}
```

### 4. Modified Cart Context

**Purpose**: Enhanced cart operations with stock validation

**Modified Methods**:
```javascript
// Enhanced addItem with stock validation
addItem(product, stockValidator)

// New method to check if product can be added
canAddItem(productId)

// New method to get remaining addable quantity
getRemainingQuantity(productId, availableStock)
```

## Data Models

### Alert Queue Item
```javascript
{
  id: string,              // Unique identifier for queued alert
  title: string,           // Alert title
  message: string,         // Alert message
  type: string,            // 'default' | 'success' | 'warning' | 'error'
  buttons: Array<{         // Alert buttons
    text: string,
    style: string,         // 'default' | 'cancel' | 'destructive'
    onPress: function
  }>,
  timestamp: number        // When alert was queued
}
```

### Stock Validation Result
```javascript
{
  isValid: boolean,        // Whether quantity is valid
  availableStock: number,  // Current available stock
  maxAddable: number,      // Maximum quantity that can be added
  message: string          // User-friendly message
}
```

### Database Sync Result
```javascript
{
  success: boolean,        // Whether operation succeeded
  error: string|null,      // Error message if failed
  retryCount: number,      // Number of retry attempts made
  data: Object|null        // Updated data if successful
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*


### Property Reflection

After analyzing all acceptance criteria, several properties can be consolidated:

**Redundancies Identified**:
- Properties 1.1, 1.2, and 1.3 all test stock limit enforcement and can be combined into a comprehensive "stock limit enforcement" property
- Properties 3.1 and 3.2 (enable/disable track stock) can be combined into a single "track stock toggle synchronization" property
- Properties 4.1, 4.2, and 4.3 all test UI consistency and can be combined into a single "clear cart popup consistency" property
- Property 2.4 is redundant with 2.2 (general non-overlapping behavior)

**Final Property Set**: After consolidation, we have 13 unique properties that provide comprehensive validation coverage.

### Stock Limit Enforcement Properties

**Property 1: Stock limit enforcement**
*For any* product with stock tracking enabled and any requested quantity, adding items to the cart should be rejected if the total cart quantity would exceed available stock, and accepted otherwise
**Validates: Requirements 1.1, 1.2, 1.3**

**Property 2: Cart quantity synchronization**
*For any* product added to the cart, the cart quantity should never exceed the current database stock level at the time of addition
**Validates: Requirements 1.4**

**Property 3: Stock limit reactivity**
*For any* product in the cart, when the database stock level decreases, the maximum addable quantity should update to reflect the new limit
**Validates: Requirements 1.5**

### Alert Queue Properties

**Property 4: Alert sequential display**
*For any* sequence of alert triggers, all alerts should be displayed one at a time in the order they were triggered
**Validates: Requirements 2.1**

**Property 5: Alert exclusivity**
*For any* alert currently visible, no other alert should be displayed until the current alert is dismissed
**Validates: Requirements 2.2**

**Property 6: Alert queue progression**
*For any* non-empty alert queue, dismissing the current alert should immediately display the next queued alert
**Validates: Requirements 2.3**

### Track Stock Synchronization Properties

**Property 7: Track stock toggle synchronization**
*For any* product, toggling the track stock setting should immediately update the trackStock field in the database to match the new state
**Validates: Requirements 3.1, 3.2**

**Property 8: Track stock sync error handling**
*For any* track stock toggle operation, if database synchronization fails, an error message should be displayed to the user
**Validates: Requirements 3.3**

**Property 9: Stock quantity synchronization**
*For any* product with track stock enabled, updating the stock quantity should synchronize the new value to the database
**Validates: Requirements 3.4**

**Property 10: Track stock load consistency**
*For any* product in the database, loading the inventory screen should display the trackStock status that matches the database value
**Validates: Requirements 3.5**

**Property 11: Atomic stock updates**
*For any* stock quantity modification, both local storage and the database should be updated together, or neither should be updated
**Validates: Requirements 3.6**

**Property 12: Stock sync retry behavior**
*For any* stock synchronization operation that encounters a network error, the system should retry the operation and notify the user if all retries fail
**Validates: Requirements 3.7**

### Clear Cart UI Properties

**Property 13: Clear cart popup consistency**
*For any* invocation of the clear cart action, the popup should display with identical styling, message text, and button configuration
**Validates: Requirements 4.1, 4.2, 4.3**

**Property 14: Clear cart confirmation behavior**
*For any* cart state, confirming the clear cart action should result in an empty cart
**Validates: Requirements 4.4**

**Property 15: Clear cart cancellation behavior**
*For any* cart state, canceling the clear cart action should preserve all cart items unchanged
**Validates: Requirements 4.5**

## Error Handling

### Stock Validation Errors

1. **Out of Stock**: When a product has zero stock and tracking is enabled
   - Display: "Out of Stock - [Product Name] is currently out of stock"
   - Action: Prevent addition to cart
   - User Feedback: Warning alert with "OK" button

2. **Exceeds Available Stock**: When requested quantity exceeds available stock
   - Display: "Cannot add [quantity] items - Only [available] available"
   - Action: Reject the addition, show maximum available
   - User Feedback: Warning alert with current stock information

3. **Stock Changed**: When stock decreases while product is in cart
   - Display: "Stock updated - Maximum quantity adjusted to [new_max]"
   - Action: Update cart limits, don't remove items already added
   - User Feedback: Info alert (non-blocking)

### Alert Queue Errors

1. **Queue Overflow**: When too many alerts are queued (>10)
   - Action: Drop oldest non-critical alerts
   - Logging: Log dropped alerts for debugging
   - User Feedback: None (silent handling)

2. **Alert Rendering Error**: When alert component fails to render
   - Fallback: Use native Alert.alert()
   - Logging: Log error details
   - User Feedback: Display alert using fallback method

### Database Sync Errors

1. **Network Timeout**: When database request times out
   - Retry: Attempt up to 3 times with exponential backoff
   - Display: "Connection issue - Retrying..."
   - Final Failure: "Failed to sync - Please check your connection"
   - Action: Keep local changes, mark as pending sync

2. **Database Write Failure**: When database update fails
   - Retry: Attempt up to 3 times
   - Display: "Failed to save changes"
   - Action: Revert local changes to match database
   - User Feedback: Error alert with "Retry" and "Cancel" options

3. **Atomic Update Failure**: When local or database update fails mid-transaction
   - Action: Rollback both updates
   - Display: "Update failed - Changes reverted"
   - Logging: Log which part of transaction failed
   - User Feedback: Error alert with details

4. **Sync Conflict**: When local and database values differ on load
   - Resolution: Database value takes precedence
   - Display: "Data synchronized from server"
   - Logging: Log conflict details
   - User Feedback: Info notification (dismissible)

## Testing Strategy

### Unit Testing Approach

Unit tests will verify specific behaviors and edge cases:

1. **Stock Validation Tests**
   - Test stock validation with zero stock
   - Test stock validation with exact stock match
   - Test stock validation with stock changes
   - Test validation for products without stock tracking

2. **Alert Queue Tests**
   - Test queue initialization
   - Test single alert display
   - Test queue overflow handling
   - Test alert dismissal

3. **Database Sync Tests**
   - Test successful sync operations
   - Test retry logic with mocked failures
   - Test atomic update rollback
   - Test conflict resolution

4. **Clear Cart Tests**
   - Test popup configuration
   - Test confirm action
   - Test cancel action
   - Test popup dismissal

### Property-Based Testing Approach

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property testing library):

**Configuration**: Each property test will run a minimum of 100 iterations to ensure thorough coverage.

**Test Tagging**: Each property-based test will be tagged with a comment in this format:
```javascript
// **Feature: pos-ui-fixes, Property 1: Stock limit enforcement**
```

**Property Test Coverage**:

1. **Property 1 - Stock Limit Enforcement**
   - Generator: Random products with random stock levels (0-100)
   - Generator: Random requested quantities (1-150)
   - Generator: Random current cart quantities (0-50)
   - Assertion: Validate that additions exceeding stock are rejected

2. **Property 2 - Cart Quantity Synchronization**
   - Generator: Random products with stock tracking
   - Generator: Random quantities within stock limits
   - Assertion: Cart quantity never exceeds database stock after addition

3. **Property 3 - Stock Limit Reactivity**
   - Generator: Random products in cart
   - Generator: Random stock decreases
   - Assertion: Max addable quantity updates correctly

4. **Property 4 - Alert Sequential Display**
   - Generator: Random sequences of alerts (1-10 alerts)
   - Assertion: Alerts display in FIFO order

5. **Property 5 - Alert Exclusivity**
   - Generator: Random alert configurations
   - Generator: Random additional alert triggers
   - Assertion: Only one alert visible at a time

6. **Property 6 - Alert Queue Progression**
   - Generator: Random alert queues with 2-5 alerts
   - Assertion: Dismissing shows next alert

7. **Property 7 - Track Stock Toggle Synchronization**
   - Generator: Random products
   - Generator: Random toggle states (true/false)
   - Assertion: Database trackStock matches toggle state

8. **Property 8 - Track Stock Sync Error Handling**
   - Generator: Random products
   - Generator: Simulated database failures
   - Assertion: Error message displayed on failure

9. **Property 9 - Stock Quantity Synchronization**
   - Generator: Random products with trackStock=true
   - Generator: Random stock quantities (0-1000)
   - Assertion: Database stock matches updated quantity

10. **Property 10 - Track Stock Load Consistency**
    - Generator: Random database states
    - Assertion: Loaded UI matches database values

11. **Property 11 - Atomic Stock Updates**
    - Generator: Random stock modifications
    - Generator: Random failure points (local/database)
    - Assertion: Both updated or both unchanged

12. **Property 12 - Stock Sync Retry Behavior**
    - Generator: Random network errors
    - Assertion: Retries occur and user notified on final failure

13. **Property 13 - Clear Cart Popup Consistency**
    - Generator: Random cart states
    - Assertion: Popup config identical across invocations

14. **Property 14 - Clear Cart Confirmation**
    - Generator: Random cart states (1-20 items)
    - Assertion: Cart empty after confirmation

15. **Property 15 - Clear Cart Cancellation**
    - Generator: Random cart states
    - Assertion: Cart unchanged after cancellation

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **Complete Stock Limit Flow**
   - Add products to cart up to stock limit
   - Verify increment button disabled
   - Verify manual entry rejected
   - Verify database sync

2. **Complete Alert Queue Flow**
   - Trigger multiple alerts rapidly
   - Verify sequential display
   - Verify queue clears properly

3. **Complete Track Stock Flow**
   - Toggle track stock on/off
   - Update stock quantities
   - Verify database synchronization
   - Test error scenarios

4. **Complete Clear Cart Flow**
   - Add items to cart
   - Trigger clear cart
   - Verify popup consistency
   - Test confirm and cancel paths

## Implementation Notes

### Performance Considerations

1. **Stock Validation**: Cache product stock values to minimize database queries
2. **Alert Queue**: Use efficient queue data structure (linked list or array with shift)
3. **Database Sync**: Debounce rapid toggle changes to prevent excessive API calls
4. **UI Updates**: Use React.memo and useMemo to prevent unnecessary re-renders

### Accessibility

1. **Alerts**: Ensure screen readers announce alert content
2. **Buttons**: Provide clear labels for disabled increment buttons
3. **Error Messages**: Use semantic HTML/components for error states
4. **Focus Management**: Return focus appropriately after alert dismissal

### Browser/Platform Compatibility

1. **React Native**: Ensure Modal component works on iOS and Android
2. **Web**: Test alert z-index across different browsers
3. **AsyncStorage**: Handle storage quota limits gracefully
4. **Network**: Handle offline scenarios with appropriate messaging

## Dependencies

- **React Native**: Core framework
- **AsyncStorage**: Local data persistence
- **Supabase Client**: Database operations
- **fast-check**: Property-based testing library
- **Jest**: Unit testing framework
- **React Native Testing Library**: Component testing utilities

## Migration Strategy

Since these are fixes to existing functionality:

1. **Phase 1**: Implement stock validation without breaking existing cart behavior
2. **Phase 2**: Add alert queue system while maintaining backward compatibility
3. **Phase 3**: Enhance database sync with retry logic
4. **Phase 4**: Standardize clear cart popup
5. **Phase 5**: Deploy all changes together after thorough testing

No data migration required as these are behavioral fixes, not schema changes.
