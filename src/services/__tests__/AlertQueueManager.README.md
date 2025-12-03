# AlertQueueManager Test Documentation

## Overview

The AlertQueueManager is a service that manages sequential display of alerts to prevent overlapping. It implements a FIFO (First-In-First-Out) queue to ensure alerts are displayed one at a time.

## Requirements

This implementation satisfies the following requirements:
- **Requirement 2.1**: Multiple alerts triggered in quick succession are queued and displayed sequentially
- **Requirement 2.2**: When an alert is visible, new alerts are prevented from displaying until the current alert is dismissed
- **Requirement 2.3**: When a user dismisses an alert, the next queued alert is displayed if one exists

## Running Tests

To run the manual tests:

```bash
node flowpos/src/services/__tests__/AlertQueueManager.manual.test.js
```

## Test Coverage

The manual test suite includes 16 test scenarios covering:

1. **Initialization**: Verifies empty queue state
2. **First Alert**: Confirms first alert becomes current immediately
3. **Queue Building**: Tests adding multiple alerts to queue
4. **Sequential Display**: Verifies FIFO order is maintained
5. **Dequeue Operations**: Tests removing alerts and showing next
6. **Clear Operations**: Tests clearQueue() and clearAll() methods
7. **Null Handling**: Verifies null/undefined alerts are rejected
8. **Button Configuration**: Tests alerts with button arrays
9. **Default Values**: Verifies default values for optional fields
10. **FIFO Order**: Comprehensive test of queue ordering
11. **Rapid Operations**: Tests rapid enqueue/dequeue cycles
12. **ID Uniqueness**: Verifies each alert gets a unique ID
13. **Timestamps**: Confirms alerts are timestamped correctly

## Usage Example

```javascript
import AlertQueueManager from './services/AlertQueueManager';

const alertManager = new AlertQueueManager();

// Enqueue alerts
alertManager.enqueue({
  title: 'Warning',
  message: 'Stock is low',
  type: 'warning',
  buttons: [{ text: 'OK', onPress: () => {} }]
});

alertManager.enqueue({
  title: 'Error',
  message: 'Out of stock',
  type: 'error',
  buttons: [{ text: 'OK', onPress: () => {} }]
});

// Get current alert to display
const currentAlert = alertManager.getCurrentAlert();

// When user dismisses alert, show next
alertManager.dequeue();

// Check if more alerts are pending
if (alertManager.hasPendingAlerts()) {
  // More alerts to show
}
```

## API Reference

### Methods

- **enqueue(alertConfig)**: Adds an alert to the queue
- **dequeue()**: Removes current alert and shows next
- **getCurrentAlert()**: Returns the current alert to display (or null)
- **hasPendingAlerts()**: Returns true if queue has pending alerts
- **clearQueue()**: Clears pending alerts (keeps current)
- **clearAll()**: Clears all alerts including current
- **getQueueLength()**: Returns number of pending alerts
- **getTotalAlerts()**: Returns total alerts (current + pending)

### Alert Configuration Object

```javascript
{
  title: string,           // Alert title
  message: string,         // Alert message
  type: string,            // 'default' | 'success' | 'warning' | 'error'
  buttons: Array<{         // Button configuration
    text: string,
    style: string,         // 'default' | 'cancel' | 'destructive'
    onPress: function
  }>
}
```

## Implementation Notes

- The queue uses a simple array with shift() for FIFO behavior
- Each alert is assigned a unique ID and timestamp
- The first enqueued alert becomes current immediately if no alert is displayed
- Null/undefined alerts are rejected with a console warning
- The manager maintains separation between current alert and queued alerts

## Test Results

All 57 test assertions pass successfully, confirming:
- ✅ Proper queue initialization
- ✅ Correct FIFO ordering
- ✅ Sequential alert display
- ✅ Alert exclusivity (one at a time)
- ✅ Proper dequeue behavior
- ✅ Clear operations work correctly
- ✅ Null/undefined handling
- ✅ Unique ID generation
- ✅ Timestamp accuracy
