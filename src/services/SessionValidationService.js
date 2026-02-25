// Session Validation Service - Periodically checks if session is still valid
// Automatically logs out user if session has been terminated remotely

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';

class SessionValidationService {
  constructor() {
    this.validationInterval = null;
    this.appStateSubscription = null;
    this.isValidating = false;
    this.validationFrequency = 30000; // Check every 30 seconds
    this.onSessionInvalidCallback = null;
  }

  /**
   * Start periodic session validation
   * @param {Function} onSessionInvalid - Callback when session is invalid
   */
  start(onSessionInvalid) {
    console.log('🔄 Starting session validation service');
    this.onSessionInvalidCallback = onSessionInvalid;

    // CRITICAL: Validate immediately on start (don't wait 30 seconds)
    console.log('⚡ Performing immediate session validation on start...');
    this.validateSession();

    // Set up periodic validation
    this.validationInterval = setInterval(() => {
      this.validateSession();
    }, this.validationFrequency);

    // Listen to app state changes
    this.appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('📱 App became active, validating session immediately');
        this.validateSession();
      }
    });

    console.log(`✅ Session validation started (checking every ${this.validationFrequency / 1000}s)`);
  }

  /**
   * Stop periodic session validation
   */
  stop() {
    console.log('🛑 Stopping session validation service');

    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    this.onSessionInvalidCallback = null;
  }

  /**
   * Validate current session with backend
   */
  async validateSession() {
    // Prevent concurrent validations
    if (this.isValidating) {
      return;
    }

    this.isValidating = true;

    try {
      const token = await AsyncStorage.getItem('accessToken');

      if (!token) {
        console.log('⚠️ No token found, skipping validation');
        this.isValidating = false;
        return;
      }

      // Make a lightweight API call to validate session
      const response = await fetch(`${API_BASE_URL}/api/devices/sessions/validate`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 second timeout
      });

      if (response.status === 401 || response.status === 403) {
        console.log('❌ Session is invalid (401/403), triggering logout');
        await this.handleInvalidSession('session_terminated');
      } else if (response.ok) {
        const data = await response.json();
        if (!data.valid) {
          console.log('❌ Session validation failed, triggering logout');
          await this.handleInvalidSession(data.reason || 'session_invalid');
        } else {
          console.log('✅ Session is valid');
        }
      } else {
        console.log(`⚠️ Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      // Network errors are expected when offline, don't logout
      if (error.message.includes('Network request failed') || 
          error.message.includes('timeout')) {
        console.log('⚠️ Network error during validation, skipping');
      } else {
        console.error('❌ Session validation error:', error);
      }
    } finally {
      this.isValidating = false;
    }
  }

  /**
   * Handle invalid session - trigger logout
   */
  async handleInvalidSession(reason) {
    console.log(`🚪 Handling invalid session: ${reason}`);

    // CRITICAL: Stop validation FIRST to prevent race conditions
    // This prevents the service from validating again while logout is in progress
    console.log('🛑 Stopping session validation service before logout...');
    
    // Clear the interval and subscription
    if (this.validationInterval) {
      clearInterval(this.validationInterval);
      this.validationInterval = null;
    }

    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }

    // Call the callback to trigger full logout in AuthContext
    // AuthContext.logout() will handle clearing all storage
    console.log('📞 Calling session invalid callback...');
    if (this.onSessionInvalidCallback) {
      try {
        await this.onSessionInvalidCallback(reason);
        console.log('✅ Session invalid callback completed');
      } catch (error) {
        console.error('❌ Session invalid callback error:', error);
      }
    } else {
      console.log('⚠️ No session invalid callback registered');
    }

    // Clear the callback reference
    this.onSessionInvalidCallback = null;
    console.log('✅ Session validation service fully stopped');
  }

  /**
   * Update validation frequency
   * @param {number} milliseconds - New frequency in milliseconds
   */
  setValidationFrequency(milliseconds) {
    this.validationFrequency = milliseconds;

    // Restart with new frequency if already running
    if (this.validationInterval) {
      const callback = this.onSessionInvalidCallback;
      this.stop();
      this.start(callback);
    }
  }
}

// Export singleton instance
export default new SessionValidationService();
