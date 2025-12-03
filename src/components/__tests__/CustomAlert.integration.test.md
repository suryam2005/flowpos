# CustomAlert Queue Integration - Manual Test Guide

## Purpose
Verify that the AlertQueueManager integration in CustomAlert works correctly for sequential alert display.

## Test Setup
The CustomAlert component now uses a singleton AlertQueueManager instance to manage alert display. This ensures only one alert is visible at a time and alerts are displayed sequentially.

## Manual Test Cases

### Test 1: Single Alert Display
**Steps:**
1. Trigger a single alert in the app
2. Observe the alert appears

**Expected Result:**
- Alert displays normally with animation
- Alert can be dismissed by clicking button

**Validates:** Basic functionality preserved

### Test 2: Multiple Rapid Alerts
**Steps:**
1. Trigger 3 alerts in rapid succession (e.g., click a button 3 times quickly)
2. Observe alert behavior

**Expected Result:**
- Only ONE alert visible at a time
- First alert displays immediately
- After dismissing first alert, second alert appears automatically
- After dismissing second alert, third alert appears automatically
- No overlapping alerts

**Validates:** Requirements 2.1, 2.2, 2.3

### Test 3: Alert Queue with Different Types
**Steps:**
1. Enqueue alerts of different types: warning, error, success
2. Dismiss each alert one by one

**Expected Result:**
- Each alert displays with correct icon and styling
- Alerts display in FIFO order
- No visual glitches during transitions

**Validates:** Queue maintains alert properties correctly

### Test 4: Stock Validation + Clear Cart Scenario
**Steps:**
1. In POS screen, try to add more items than available stock (triggers stock alert)
2. Immediately click "Clear Cart" button (triggers clear cart confirmation)
3. Observe alert behavior

**Expected Result:**
- Stock alert displays first
- After dismissing stock alert, clear cart confirmation appears
- No overlapping or missed alerts

**Validates:** Real-world scenario from Requirements 2.4

## Code Verification Points

### 1. Singleton Instance
```javascript
// In CustomAlert.js
const alertQueueManager = new AlertQueueManager();
export { alertQueueManager };
```
✅ Single instance shared across all CustomAlert components

### 2. Queue Polling
```javascript
// Polls every 100ms for queue updates
const interval = setInterval(updateAlert, 100);
```
✅ Ensures UI updates when queue changes

### 3. Dequeue on Dismiss
```javascript
const handleButtonPress = (button) => {
  if (button.onPress) button.onPress();
  alertQueueManager.dequeue(); // Show next alert
  if (onClose) onClose();
};
```
✅ Automatically shows next alert after dismissal

### 4. Backward Compatibility
```javascript
// External visible prop still works
React.useEffect(() => {
  if (visible && title) {
    alertQueueManager.enqueue({ title, message, type, buttons });
  }
}, [visible, title, message, type, buttons]);
```
✅ Existing code using CustomAlert continues to work

## Integration Points

### For Other Components
Components can now use the queue directly:
```javascript
import { alertQueueManager } from '../components/CustomAlert';

// Enqueue multiple alerts
alertQueueManager.enqueue({
  title: 'First Alert',
  message: 'This will show first',
  type: 'warning',
  buttons: [{ text: 'OK' }]
});

alertQueueManager.enqueue({
  title: 'Second Alert',
  message: 'This will show after first is dismissed',
  type: 'error',
  buttons: [{ text: 'OK' }]
});
```

## Known Limitations

1. **Polling Interval**: Uses 100ms polling instead of event-based updates
   - Trade-off: Simplicity vs. real-time responsiveness
   - Impact: Minimal (100ms is imperceptible to users)

2. **Queue Overflow**: No hard limit on queue size
   - Mitigation: AlertQueueManager could be enhanced to limit queue size
   - Current behavior: All alerts will eventually display

## Next Steps

Task 6 will update POSScreen to use the alert queue for:
- Stock validation errors
- Clear cart confirmations
- Other alert scenarios

This will complete the integration and demonstrate the queue working in production code.
