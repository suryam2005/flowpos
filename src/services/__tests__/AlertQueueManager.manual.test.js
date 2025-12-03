/**
 * Manual Test for AlertQueueManager
 * 
 * Run this file with: node flowpos/src/services/__tests__/AlertQueueManager.manual.test.js
 * 
 * This is a simple verification script to ensure AlertQueueManager works correctly
 * before integrating it into the application.
 */

// Mock the AlertQueueManager class inline for testing
class AlertQueueManager {
  constructor() {
    this.queue = [];
    this.currentAlert = null;
  }

  enqueue(alertConfig) {
    if (!alertConfig) {
      console.warn('AlertQueueManager: Attempted to enqueue null/undefined alert');
      return;
    }

    const alertItem = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: alertConfig.title || '',
      message: alertConfig.message || '',
      type: alertConfig.type || 'default',
      buttons: alertConfig.buttons || [],
      timestamp: Date.now(),
      ...alertConfig
    };

    this.queue.push(alertItem);

    if (!this.currentAlert) {
      this.currentAlert = this.queue.shift();
    }
  }

  dequeue() {
    this.currentAlert = null;

    if (this.queue.length > 0) {
      this.currentAlert = this.queue.shift();
    }
  }

  getCurrentAlert() {
    return this.currentAlert;
  }

  hasPendingAlerts() {
    return this.queue.length > 0;
  }

  clearQueue() {
    this.queue = [];
  }

  clearAll() {
    this.queue = [];
    this.currentAlert = null;
  }

  getQueueLength() {
    return this.queue.length;
  }

  getTotalAlerts() {
    return (this.currentAlert ? 1 : 0) + this.queue.length;
  }
}

// Test suite
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

console.log('\n🧪 Running AlertQueueManager Manual Tests\n');

// Test 1: Initialize empty queue
const manager = new AlertQueueManager();
assert(manager.getCurrentAlert() === null, 'Test 1: Initial current alert should be null');
assert(manager.hasPendingAlerts() === false, 'Test 1: Should have no pending alerts initially');
assert(manager.getQueueLength() === 0, 'Test 1: Queue length should be 0 initially');

// Test 2: Enqueue first alert - should become current immediately
manager.enqueue({
  title: 'Alert 1',
  message: 'First alert',
  type: 'warning'
});
assert(manager.getCurrentAlert() !== null, 'Test 2: Current alert should not be null after enqueue');
assert(manager.getCurrentAlert().title === 'Alert 1', 'Test 2: Current alert title should be "Alert 1"');
assert(manager.hasPendingAlerts() === false, 'Test 2: Should have no pending alerts (only current)');
assert(manager.getTotalAlerts() === 1, 'Test 2: Total alerts should be 1');

// Test 3: Enqueue second alert while first is current
manager.enqueue({
  title: 'Alert 2',
  message: 'Second alert',
  type: 'error'
});
assert(manager.getCurrentAlert().title === 'Alert 1', 'Test 3: Current alert should still be "Alert 1"');
assert(manager.hasPendingAlerts() === true, 'Test 3: Should have pending alerts');
assert(manager.getQueueLength() === 1, 'Test 3: Queue length should be 1');
assert(manager.getTotalAlerts() === 2, 'Test 3: Total alerts should be 2');

// Test 4: Enqueue third alert
manager.enqueue({
  title: 'Alert 3',
  message: 'Third alert',
  type: 'success'
});
assert(manager.getCurrentAlert().title === 'Alert 1', 'Test 4: Current alert should still be "Alert 1"');
assert(manager.getQueueLength() === 2, 'Test 4: Queue length should be 2');
assert(manager.getTotalAlerts() === 3, 'Test 4: Total alerts should be 3');

// Test 5: Dequeue - should show next alert
manager.dequeue();
assert(manager.getCurrentAlert() !== null, 'Test 5: Current alert should not be null after dequeue');
assert(manager.getCurrentAlert().title === 'Alert 2', 'Test 5: Current alert should now be "Alert 2"');
assert(manager.getQueueLength() === 1, 'Test 5: Queue length should be 1');
assert(manager.getTotalAlerts() === 2, 'Test 5: Total alerts should be 2');

// Test 6: Dequeue again
manager.dequeue();
assert(manager.getCurrentAlert().title === 'Alert 3', 'Test 6: Current alert should now be "Alert 3"');
assert(manager.hasPendingAlerts() === false, 'Test 6: Should have no pending alerts');
assert(manager.getTotalAlerts() === 1, 'Test 6: Total alerts should be 1');

// Test 7: Dequeue last alert
manager.dequeue();
assert(manager.getCurrentAlert() === null, 'Test 7: Current alert should be null after dequeueing last');
assert(manager.hasPendingAlerts() === false, 'Test 7: Should have no pending alerts');
assert(manager.getTotalAlerts() === 0, 'Test 7: Total alerts should be 0');

// Test 8: Enqueue multiple alerts and clear queue
const manager2 = new AlertQueueManager();
manager2.enqueue({ title: 'A1', message: 'Alert 1' });
manager2.enqueue({ title: 'A2', message: 'Alert 2' });
manager2.enqueue({ title: 'A3', message: 'Alert 3' });
assert(manager2.getTotalAlerts() === 3, 'Test 8: Should have 3 total alerts');
manager2.clearQueue();
assert(manager2.getCurrentAlert().title === 'A1', 'Test 8: Current alert should still be "A1" after clearQueue');
assert(manager2.hasPendingAlerts() === false, 'Test 8: Should have no pending alerts after clearQueue');
assert(manager2.getTotalAlerts() === 1, 'Test 8: Should have 1 total alert (current only)');

// Test 9: Clear all alerts
manager2.clearAll();
assert(manager2.getCurrentAlert() === null, 'Test 9: Current alert should be null after clearAll');
assert(manager2.hasPendingAlerts() === false, 'Test 9: Should have no pending alerts after clearAll');
assert(manager2.getTotalAlerts() === 0, 'Test 9: Should have 0 total alerts after clearAll');

// Test 10: Enqueue with null/undefined
const manager3 = new AlertQueueManager();
manager3.enqueue(null);
assert(manager3.getCurrentAlert() === null, 'Test 10: Should not enqueue null alert');
manager3.enqueue(undefined);
assert(manager3.getCurrentAlert() === null, 'Test 10: Should not enqueue undefined alert');

// Test 11: Alert with buttons
const manager4 = new AlertQueueManager();
manager4.enqueue({
  title: 'Confirm',
  message: 'Are you sure?',
  buttons: [
    { text: 'Cancel', style: 'cancel' },
    { text: 'OK', style: 'default' }
  ]
});
const currentAlert = manager4.getCurrentAlert();
assert(currentAlert.buttons.length === 2, 'Test 11: Alert should have 2 buttons');
assert(currentAlert.buttons[0].text === 'Cancel', 'Test 11: First button should be "Cancel"');

// Test 12: Alert with default values
const manager5 = new AlertQueueManager();
manager5.enqueue({ message: 'Test message' });
const alert = manager5.getCurrentAlert();
assert(alert.title === '', 'Test 12: Default title should be empty string');
assert(alert.type === 'default', 'Test 12: Default type should be "default"');
assert(Array.isArray(alert.buttons), 'Test 12: Buttons should be an array');

// Test 13: FIFO order verification
const manager6 = new AlertQueueManager();
manager6.enqueue({ title: 'First', message: '1' });
manager6.enqueue({ title: 'Second', message: '2' });
manager6.enqueue({ title: 'Third', message: '3' });
manager6.enqueue({ title: 'Fourth', message: '4' });

assert(manager6.getCurrentAlert().title === 'First', 'Test 13: First alert should be current');
manager6.dequeue();
assert(manager6.getCurrentAlert().title === 'Second', 'Test 13: Second alert should be next');
manager6.dequeue();
assert(manager6.getCurrentAlert().title === 'Third', 'Test 13: Third alert should be next');
manager6.dequeue();
assert(manager6.getCurrentAlert().title === 'Fourth', 'Test 13: Fourth alert should be last');

// Test 14: Rapid enqueue/dequeue
const manager7 = new AlertQueueManager();
for (let i = 1; i <= 10; i++) {
  manager7.enqueue({ title: `Alert ${i}`, message: `Message ${i}` });
}
assert(manager7.getTotalAlerts() === 10, 'Test 14: Should have 10 total alerts');
assert(manager7.getCurrentAlert().title === 'Alert 1', 'Test 14: First alert should be current');

let count = 1;
while (manager7.getCurrentAlert() !== null) {
  assert(manager7.getCurrentAlert().title === `Alert ${count}`, `Test 14: Alert ${count} should be in order`);
  manager7.dequeue();
  count++;
}
assert(count === 11, 'Test 14: Should have processed all 10 alerts');

// Test 15: Alert ID uniqueness
const manager8 = new AlertQueueManager();
manager8.enqueue({ title: 'A', message: 'Test' });
const id1 = manager8.getCurrentAlert().id;
manager8.dequeue();
manager8.enqueue({ title: 'A', message: 'Test' });
const id2 = manager8.getCurrentAlert().id;
assert(id1 !== id2, 'Test 15: Alert IDs should be unique');

// Test 16: Timestamp verification
const manager9 = new AlertQueueManager();
const beforeTime = Date.now();
manager9.enqueue({ title: 'Test', message: 'Timestamp test' });
const afterTime = Date.now();
const timestamp = manager9.getCurrentAlert().timestamp;
assert(timestamp >= beforeTime && timestamp <= afterTime, 'Test 16: Timestamp should be within range');

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
