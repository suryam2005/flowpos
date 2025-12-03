/**
 * AlertQueueManager
 * 
 * Manages sequential display of alerts to prevent overlapping.
 * Implements a FIFO queue to ensure alerts are displayed one at a time.
 * 
 * Requirements: 2.1, 2.2, 2.3
 */

class AlertQueueManager {
  constructor() {
    this.queue = [];
    this.currentAlert = null;
  }

  /**
   * Adds alert to queue
   * @param {Object} alertConfig - Alert configuration object
   * @param {string} alertConfig.title - Alert title
   * @param {string} alertConfig.message - Alert message
   * @param {string} alertConfig.type - Alert type ('default' | 'success' | 'warning' | 'error')
   * @param {Array} alertConfig.buttons - Alert buttons configuration
   */
  enqueue(alertConfig) {
    if (!alertConfig) {
      console.warn('AlertQueueManager: Attempted to enqueue null/undefined alert');
      return;
    }

    const alertItem = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: alertConfig.title || '',
      message: alertConfig.message || '',
      type: alertConfig.type || 'default',
      buttons: alertConfig.buttons || [],
      timestamp: Date.now(),
      ...alertConfig
    };

    this.queue.push(alertItem);

    // If no alert is currently displayed, show this one immediately
    if (!this.currentAlert) {
      this.currentAlert = this.queue.shift();
    }
  }

  /**
   * Removes current alert and shows next
   * Should be called when the current alert is dismissed
   */
  dequeue() {
    this.currentAlert = null;

    // Show next alert if queue has pending alerts
    if (this.queue.length > 0) {
      this.currentAlert = this.queue.shift();
    }
  }

  /**
   * Gets current alert to display
   * @returns {Object|null} Current alert config or null
   */
  getCurrentAlert() {
    return this.currentAlert;
  }

  /**
   * Checks if queue has pending alerts (not including current)
   * @returns {boolean}
   */
  hasPendingAlerts() {
    return this.queue.length > 0;
  }

  /**
   * Clears all pending alerts (not including current)
   */
  clearQueue() {
    this.queue = [];
  }

  /**
   * Clears all alerts including current
   */
  clearAll() {
    this.queue = [];
    this.currentAlert = null;
  }

  /**
   * Gets the number of pending alerts in queue
   * @returns {number}
   */
  getQueueLength() {
    return this.queue.length;
  }

  /**
   * Gets total number of alerts (current + queued)
   * @returns {number}
   */
  getTotalAlerts() {
    return (this.currentAlert ? 1 : 0) + this.queue.length;
  }
}

export default AlertQueueManager;
