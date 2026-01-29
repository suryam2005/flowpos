// Token Expiration Monitor Service - Token expiration detection and handling
// Requirements: 10.4 - Token expiration detection and handling

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

class TokenExpirationMonitor {
  constructor() {
    this.checkInterval = null;
    this.warningInterval = null;
    this.currentToken = null;
    this.tokenExpiry = null;
    this.listeners = new Set();
    this.isMonitoring = false;
    this.warningThresholds = [
      { minutes: 15, warned: false }, // 15 minutes warning
      { minutes: 5, warned: false },  // 5 minutes warning
      { minutes: 1, warned: false }   // 1 minute warning
    ];
    
    this.setupAppStateListener();
    console.log('🔐 Token Expiration Monitor initialized');
  }

  /**
   * Add listener for token expiration events
   */
  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of token expiration events
   */
  notifyListeners(eventType, data) {
    this.listeners.forEach(callback => {
      try {
        callback(eventType, data);
      } catch (error) {
        console.error('❌ Error notifying token monitor listener:', error);
      }
    });
  }

  /**
   * Setup app state listener to handle background/foreground transitions
   */
  setupAppStateListener() {
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && this.isMonitoring) {
        // App came to foreground - check token immediately
        this.checkTokenExpiration();
      }
    });
  }

  /**
   * Start monitoring token expiration
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('🔐 Token monitoring already active');
      return;
    }

    console.log('🔐 Starting token expiration monitoring');
    
    try {
      await this.loadCurrentToken();
      
      if (!this.currentToken) {
        console.log('🔐 No token to monitor');
        return;
      }

      this.isMonitoring = true;
      
      // Check immediately
      this.checkTokenExpiration();
      
      // Set up periodic checks every 30 seconds
      this.checkInterval = setInterval(() => {
        this.checkTokenExpiration();
      }, 30000);
      
      this.notifyListeners('monitoring_started', {
        tokenExpiry: this.tokenExpiry,
        timeUntilExpiry: this.getTimeUntilExpiry()
      });
      
    } catch (error) {
      console.error('❌ Error starting token monitoring:', error);
    }
  }

  /**
   * Stop monitoring token expiration
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      return;
    }

    console.log('🔐 Stopping token expiration monitoring');
    
    this.isMonitoring = false;
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.warningInterval) {
      clearInterval(this.warningInterval);
      this.warningInterval = null;
    }
    
    // Reset warning flags
    this.warningThresholds.forEach(threshold => {
      threshold.warned = false;
    });
    
    this.notifyListeners('monitoring_stopped', {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Load current token from storage
   */
  async loadCurrentToken() {
    try {
      const token = await AsyncStorage.getItem('accessToken');
      
      if (token && token !== this.currentToken) {
        this.currentToken = token;
        this.tokenExpiry = this.parseTokenExpiry(token);
        
        // Reset warning flags for new token
        this.warningThresholds.forEach(threshold => {
          threshold.warned = false;
        });
        
        console.log('🔐 Token loaded, expires:', this.tokenExpiry ? new Date(this.tokenExpiry).toLocaleString() : 'Unknown');
        
        this.notifyListeners('token_loaded', {
          tokenExpiry: this.tokenExpiry,
          timeUntilExpiry: this.getTimeUntilExpiry()
        });
      }
      
      return this.currentToken;
    } catch (error) {
      console.error('❌ Error loading token:', error);
      return null;
    }
  }

  /**
   * Parse token expiration time from JWT
   */
  parseTokenExpiry(token) {
    try {
      if (!token) return null;
      
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    } catch (error) {
      console.error('❌ Error parsing token expiry:', error);
      return null;
    }
  }

  /**
   * Get time until token expiry in milliseconds
   */
  getTimeUntilExpiry() {
    if (!this.tokenExpiry) return null;
    return Math.max(0, this.tokenExpiry - Date.now());
  }

  /**
   * Get time until token expiry in minutes
   */
  getTimeUntilExpiryMinutes() {
    const timeMs = this.getTimeUntilExpiry();
    return timeMs ? Math.floor(timeMs / 60000) : null;
  }

  /**
   * Check if token is expired or will expire soon
   */
  isTokenExpired(bufferMinutes = 0) {
    if (!this.tokenExpiry) return true;
    
    const bufferMs = bufferMinutes * 60000;
    return Date.now() + bufferMs >= this.tokenExpiry;
  }

  /**
   * Main token expiration check
   */
  async checkTokenExpiration() {
    try {
      // Reload token in case it was updated
      await this.loadCurrentToken();
      
      if (!this.currentToken || !this.tokenExpiry) {
        console.log('🔐 No valid token to check');
        this.stopMonitoring();
        return;
      }

      const timeUntilExpiryMs = this.getTimeUntilExpiry();
      const timeUntilExpiryMinutes = Math.floor(timeUntilExpiryMs / 60000);
      
      console.log(`🔐 Token expires in ${timeUntilExpiryMinutes} minutes`);
      
      // Check if token is already expired
      if (timeUntilExpiryMs <= 0) {
        console.log('🔐 Token has expired');
        this.handleTokenExpired();
        return;
      }
      
      // Check warning thresholds
      this.warningThresholds.forEach(threshold => {
        if (!threshold.warned && timeUntilExpiryMinutes <= threshold.minutes) {
          threshold.warned = true;
          this.handleTokenExpiryWarning(threshold.minutes, timeUntilExpiryMinutes);
        }
      });
      
      // Notify listeners of current status
      this.notifyListeners('token_status_checked', {
        timeUntilExpiry: timeUntilExpiryMs,
        timeUntilExpiryMinutes: timeUntilExpiryMinutes,
        isExpired: false,
        tokenExpiry: this.tokenExpiry
      });
      
    } catch (error) {
      console.error('❌ Error checking token expiration:', error);
      
      this.notifyListeners('token_check_error', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Handle token expiry warning
   */
  handleTokenExpiryWarning(thresholdMinutes, actualMinutes) {
    console.log(`⚠️ Token expiry warning: ${actualMinutes} minutes remaining (threshold: ${thresholdMinutes})`);
    
    this.notifyListeners('token_expiry_warning', {
      thresholdMinutes: thresholdMinutes,
      actualMinutes: actualMinutes,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      severity: this.getWarningSeverity(actualMinutes)
    });
  }

  /**
   * Handle token expired
   */
  handleTokenExpired() {
    console.log('🔐 Token has expired - stopping monitoring');
    
    this.notifyListeners('token_expired', {
      tokenExpiry: this.tokenExpiry,
      expiredAt: new Date().toISOString()
    });
    
    this.stopMonitoring();
  }

  /**
   * Get warning severity based on time remaining
   */
  getWarningSeverity(minutesRemaining) {
    if (minutesRemaining <= 1) return 'critical';
    if (minutesRemaining <= 5) return 'high';
    if (minutesRemaining <= 15) return 'medium';
    return 'low';
  }

  /**
   * Manually trigger token refresh attempt
   */
  async attemptTokenRefresh() {
    try {
      console.log('🔄 Attempting token refresh...');
      
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Import here to avoid circular dependency
      const { apiCallWithFallback } = require('../config/apiConfig');
      
      const response = await apiCallWithFallback('/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Token refresh failed');
      }
      
      const data = await response.json();
      
      if (data.access_token) {
        // Store new tokens
        await AsyncStorage.setItem('accessToken', data.access_token);
        if (data.refresh_token) {
          await AsyncStorage.setItem('refreshToken', data.refresh_token);
        }
        
        // Update monitoring with new token
        await this.loadCurrentToken();
        
        console.log('✅ Token refreshed successfully');
        
        this.notifyListeners('token_refreshed', {
          newTokenExpiry: this.tokenExpiry,
          timeUntilExpiry: this.getTimeUntilExpiry()
        });
        
        return true;
      }
      
      throw new Error('Invalid refresh response');
      
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      
      this.notifyListeners('token_refresh_failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  }

  /**
   * Update token (called when new token is received)
   */
  async updateToken(newToken) {
    console.log('🔐 Updating monitored token');
    
    this.currentToken = newToken;
    this.tokenExpiry = this.parseTokenExpiry(newToken);
    
    // Reset warning flags
    this.warningThresholds.forEach(threshold => {
      threshold.warned = false;
    });
    
    this.notifyListeners('token_updated', {
      tokenExpiry: this.tokenExpiry,
      timeUntilExpiry: this.getTimeUntilExpiry()
    });
    
    // Start monitoring if not already active
    if (!this.isMonitoring && newToken) {
      this.startMonitoring();
    }
  }

  /**
   * Get current monitoring status
   */
  getStatus() {
    return {
      isMonitoring: this.isMonitoring,
      hasToken: !!this.currentToken,
      tokenExpiry: this.tokenExpiry,
      timeUntilExpiry: this.getTimeUntilExpiry(),
      timeUntilExpiryMinutes: this.getTimeUntilExpiryMinutes(),
      isExpired: this.isTokenExpired(),
      warningThresholds: this.warningThresholds.map(t => ({
        minutes: t.minutes,
        warned: t.warned
      }))
    };
  }

  /**
   * Force immediate token check
   */
  async forceCheck() {
    console.log('🔐 Forcing immediate token check');
    await this.checkTokenExpiration();
  }

  /**
   * Clear current token (for logout)
   */
  clearToken() {
    console.log('🔐 Clearing monitored token');
    
    this.currentToken = null;
    this.tokenExpiry = null;
    
    // Reset warning flags
    this.warningThresholds.forEach(threshold => {
      threshold.warned = false;
    });
    
    this.stopMonitoring();
    
    this.notifyListeners('token_cleared', {
      timestamp: new Date().toISOString()
    });
  }
}

// Create singleton instance
const tokenExpirationMonitor = new TokenExpirationMonitor();

export default tokenExpirationMonitor;