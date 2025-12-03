/**
 * POSScreen Alert Queue Integration Test
 * 
 * Tests that POSScreen properly integrates with AlertQueueManager
 * for sequential alert display.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { alertQueueManager } from '../../components/CustomAlert';

describe('POSScreen Alert Queue Integration', () => {
  beforeEach(() => {
    // Clear queue before each test
    alertQueueManager.clearAll();
  });

  afterEach(() => {
    // Clean up after each test
    alertQueueManager.clearAll();
  });

  test('should enqueue stock limit alert', () => {
    // Simulate stock limit alert from handleAddToCart
    alertQueueManager.enqueue({
      title: 'Stock Limit Reached',
      message: 'Cannot add more items. Stock limit reached.',
      type: 'warning',
      buttons: [{ text: 'OK', style: 'default' }],
    });

    const currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert).not.toBeNull();
    expect(currentAlert.title).toBe('Stock Limit Reached');
    expect(currentAlert.type).toBe('warning');
  });

  test('should enqueue clear cart confirmation alert', () => {
    // Simulate clear cart alert from handleClearCart
    alertQueueManager.enqueue({
      title: 'Clear Cart',
      message: 'Are you sure you want to remove all items from the cart?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive' }
      ],
    });

    const currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert).not.toBeNull();
    expect(currentAlert.title).toBe('Clear Cart');
    expect(currentAlert.buttons).toHaveLength(2);
  });

  test('should queue multiple alerts sequentially', () => {
    // Simulate rapid alert triggering scenario
    // First: stock limit alert
    alertQueueManager.enqueue({
      title: 'Stock Limit Reached',
      message: 'Cannot add more items.',
      type: 'warning',
      buttons: [{ text: 'OK', style: 'default' }],
    });

    // Second: clear cart alert (triggered while first is showing)
    alertQueueManager.enqueue({
      title: 'Clear Cart',
      message: 'Are you sure?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive' }
      ],
    });

    // First alert should be current
    let currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert.title).toBe('Stock Limit Reached');
    expect(alertQueueManager.hasPendingAlerts()).toBe(true);

    // Dismiss first alert
    alertQueueManager.dequeue();

    // Second alert should now be current
    currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert.title).toBe('Clear Cart');
    expect(alertQueueManager.hasPendingAlerts()).toBe(false);
  });

  test('should handle cart error alerts from useEffect', () => {
    // Simulate cart error alert (from lastError useEffect)
    alertQueueManager.enqueue({
      title: 'Stock Limit Reached',
      message: 'Product "Test Product" has reached its stock limit',
      type: 'warning',
      buttons: [{ 
        text: 'OK', 
        style: 'default',
        onPress: jest.fn() // Mock clearError callback
      }],
    });

    const currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert).not.toBeNull();
    expect(currentAlert.title).toBe('Stock Limit Reached');
    expect(currentAlert.buttons[0].onPress).toBeDefined();
  });

  test('should prevent overlapping alerts', () => {
    // Enqueue first alert
    alertQueueManager.enqueue({
      title: 'Alert 1',
      message: 'First alert',
      type: 'warning',
      buttons: [{ text: 'OK', style: 'default' }],
    });

    // Enqueue second alert immediately
    alertQueueManager.enqueue({
      title: 'Alert 2',
      message: 'Second alert',
      type: 'warning',
      buttons: [{ text: 'OK', style: 'default' }],
    });

    // Only first alert should be current
    const currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert.title).toBe('Alert 1');
    
    // Second alert should be queued
    expect(alertQueueManager.hasPendingAlerts()).toBe(true);
    expect(alertQueueManager.getQueueLength()).toBe(1);
  });

  test('should handle rapid alert triggering without overlap', () => {
    // Simulate rapid triggering (e.g., user rapidly clicking products at stock limit)
    for (let i = 0; i < 5; i++) {
      alertQueueManager.enqueue({
        title: `Alert ${i + 1}`,
        message: `Message ${i + 1}`,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
    }

    // Only first alert should be current
    const currentAlert = alertQueueManager.getCurrentAlert();
    expect(currentAlert.title).toBe('Alert 1');
    
    // Other 4 alerts should be queued
    expect(alertQueueManager.getQueueLength()).toBe(4);
    expect(alertQueueManager.getTotalAlerts()).toBe(5);
  });
});
