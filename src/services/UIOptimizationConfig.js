/**
 * UIOptimizationConfig - Configuration service for UI performance optimizations
 * 
 * Core Principles:
 * - Provides ability to disable session reuse and return to direct API reads
 * - Ensures clean rollback without data loss
 * - Maintains simple rollback process
 * - Keeps all services untouched during rollback
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

class UIOptimizationConfig {
  constructor() {
    this.isInitialized = false;
    this.config = {
      // Core optimization toggles
      sessionCachingEnabled: true,
      uiPropagationEnabled: true,
      computationReuseEnabled: true,
      serviceStatusOptimizationEnabled: true,
      
      // Rollback safety
      rollbackMode: false,
      rollbackReason: null,
      rollbackTimestamp: null,
      
      // Debug and monitoring
      debugMode: false,
      performanceMonitoring: true,
      
      // Version tracking
      configVersion: '1.0.0',
      lastUpdated: null
    };
    
    console.log('⚙️ [UIOptimizationConfig] Initialized with default configuration');
  }

  /**
   * Initialize the configuration service
   * Loads configuration from AsyncStorage if available
   */
  async initialize() {
    if (this.isInitialized) {
      console.log('⚙️ [UIOptimizationConfig] Already initialized');
      return;
    }

    try {
      // Load configuration from AsyncStorage
      const storedConfig = await AsyncStorage.getItem('ui_optimization_config');
      
      if (storedConfig) {
        const parsedConfig = JSON.parse(storedConfig);
        
        // Merge with defaults to ensure all properties exist
        this.config = {
          ...this.config,
          ...parsedConfig,
          lastUpdated: Date.now()
        };
        
        console.log('⚙️ [UIOptimizationConfig] Loaded configuration from storage:', {
          sessionCaching: this.config.sessionCachingEnabled,
          uiPropagation: this.config.uiPropagationEnabled,
          computationReuse: this.config.computationReuseEnabled,
          rollbackMode: this.config.rollbackMode
        });
      } else {
        console.log('⚙️ [UIOptimizationConfig] No stored configuration found, using defaults');
        await this.saveConfiguration();
      }

      this.isInitialized = true;
      
      // Log rollback status if active
      if (this.config.rollbackMode) {
        console.warn('🔄 [UIOptimizationConfig] ROLLBACK MODE ACTIVE:', {
          reason: this.config.rollbackReason,
          timestamp: new Date(this.config.rollbackTimestamp).toISOString()
        });
      }

    } catch (error) {
      console.error('⚙️ [UIOptimizationConfig] Error initializing configuration:', error);
      // Use defaults on error
      this.isInitialized = true;
    }
  }

  /**
   * Save current configuration to AsyncStorage
   */
  async saveConfiguration() {
    try {
      this.config.lastUpdated = Date.now();
      await AsyncStorage.setItem('ui_optimization_config', JSON.stringify(this.config));
      
      console.log('⚙️ [UIOptimizationConfig] Configuration saved to storage');
    } catch (error) {
      console.error('⚙️ [UIOptimizationConfig] Error saving configuration:', error);
    }
  }

  /**
   * Check if session caching is enabled
   * @returns {boolean} True if session caching should be used
   */
  isSessionCachingEnabled() {
    return this.config.sessionCachingEnabled && !this.config.rollbackMode;
  }

  /**
   * Check if UI propagation is enabled
   * @returns {boolean} True if UI propagation should be used
   */
  isUIPropagationEnabled() {
    return this.config.uiPropagationEnabled && !this.config.rollbackMode;
  }

  /**
   * Check if computation reuse is enabled
   * @returns {boolean} True if computation reuse should be used
   */
  isComputationReuseEnabled() {
    return this.config.computationReuseEnabled && !this.config.rollbackMode;
  }

  /**
   * Check if service status optimization is enabled
   * @returns {boolean} True if service status optimization should be used
   */
  isServiceStatusOptimizationEnabled() {
    return this.config.serviceStatusOptimizationEnabled && !this.config.rollbackMode;
  }

  /**
   * Check if rollback mode is active
   * @returns {boolean} True if in rollback mode
   */
  isRollbackMode() {
    return this.config.rollbackMode;
  }

  /**
   * Enable rollback mode - disables all optimizations and returns to direct API reads
   * @param {string} reason - Reason for rollback
   * @returns {Promise<boolean>} True if rollback was successful
   */
  async enableRollback(reason = 'Manual rollback requested') {
    console.warn('🔄 [UIOptimizationConfig] ENABLING ROLLBACK MODE:', reason);

    try {
      // Update configuration
      this.config.rollbackMode = true;
      this.config.rollbackReason = reason;
      this.config.rollbackTimestamp = Date.now();
      
      // Save configuration
      await this.saveConfiguration();
      
      // Clear all optimization caches to ensure clean state
      await this.clearOptimizationCaches();
      
      console.warn('🔄 [UIOptimizationConfig] ROLLBACK MODE ENABLED - All optimizations disabled');
      console.log('🔄 [UIOptimizationConfig] System will now use direct API reads only');
      
      return true;
      
    } catch (error) {
      console.error('🔄 [UIOptimizationConfig] Error enabling rollback mode:', error);
      return false;
    }
  }

  /**
   * Disable rollback mode - re-enables optimizations
   * @returns {Promise<boolean>} True if rollback was disabled successfully
   */
  async disableRollback() {
    console.log('✅ [UIOptimizationConfig] DISABLING ROLLBACK MODE');

    try {
      // Update configuration
      this.config.rollbackMode = false;
      this.config.rollbackReason = null;
      this.config.rollbackTimestamp = null;
      
      // Save configuration
      await this.saveConfiguration();
      
      console.log('✅ [UIOptimizationConfig] ROLLBACK MODE DISABLED - Optimizations re-enabled');
      
      return true;
      
    } catch (error) {
      console.error('✅ [UIOptimizationConfig] Error disabling rollback mode:', error);
      return false;
    }
  }

  /**
   * Clear all optimization caches to ensure clean state
   * Called during rollback to prevent stale data
   */
  async clearOptimizationCaches() {
    console.log('🧹 [UIOptimizationConfig] Clearing optimization caches');

    try {
      // Import services dynamically to avoid circular dependencies
      const sessionProductStore = (await import('./SessionProductStore')).default;
      const uiUpdatePropagator = (await import('./UIUpdatePropagator')).default;
      
      // Clear session product store
      if (sessionProductStore && typeof sessionProductStore.clear === 'function') {
        sessionProductStore.clear();
        console.log('🧹 [UIOptimizationConfig] SessionProductStore cleared');
      }
      
      // Clear UI update propagator registrations
      if (uiUpdatePropagator && typeof uiUpdatePropagator.clearSession === 'function') {
        uiUpdatePropagator.clearSession();
        console.log('🧹 [UIOptimizationConfig] UIUpdatePropagator cleared');
      }
      
      // Clear computation cache if it exists
      try {
        const computationCache = (await import('./ComputationCache')).default;
        if (computationCache && typeof computationCache.clearAll === 'function') {
          computationCache.clearAll();
          console.log('🧹 [UIOptimizationConfig] ComputationCache cleared');
        }
      } catch (error) {
        // ComputationCache might not exist yet, ignore
        console.log('🧹 [UIOptimizationConfig] ComputationCache not found, skipping');
      }
      
      // Clear service status cache if it exists
      try {
        const serviceStatusCache = (await import('./ServiceStatusCache')).default;
        if (serviceStatusCache && typeof serviceStatusCache.clear === 'function') {
          serviceStatusCache.clear();
          console.log('🧹 [UIOptimizationConfig] ServiceStatusCache cleared');
        }
      } catch (error) {
        // ServiceStatusCache might not exist yet, ignore
        console.log('🧹 [UIOptimizationConfig] ServiceStatusCache not found, skipping');
      }
      
      console.log('🧹 [UIOptimizationConfig] All optimization caches cleared');
      
    } catch (error) {
      console.error('🧹 [UIOptimizationConfig] Error clearing optimization caches:', error);
    }
  }

  /**
   * Toggle a specific optimization feature
   * @param {string} feature - Feature name to toggle
   * @param {boolean} enabled - Whether to enable or disable
   */
  async toggleFeature(feature, enabled) {
    const validFeatures = [
      'sessionCachingEnabled',
      'uiPropagationEnabled', 
      'computationReuseEnabled',
      'serviceStatusOptimizationEnabled'
    ];

    if (!validFeatures.includes(feature)) {
      console.error('⚙️ [UIOptimizationConfig] Invalid feature name:', feature);
      return false;
    }

    console.log('⚙️ [UIOptimizationConfig] Toggling feature:', { feature, enabled });

    this.config[feature] = enabled;
    await this.saveConfiguration();

    return true;
  }

  /**
   * Get current configuration
   * @returns {Object} Current configuration object
   */
  getConfiguration() {
    return {
      ...this.config,
      isInitialized: this.isInitialized
    };
  }

  /**
   * Get rollback information
   * @returns {Object} Rollback status and details
   */
  getRollbackInfo() {
    return {
      isRollbackMode: this.config.rollbackMode,
      rollbackReason: this.config.rollbackReason,
      rollbackTimestamp: this.config.rollbackTimestamp,
      rollbackAge: this.config.rollbackTimestamp ? 
        Date.now() - this.config.rollbackTimestamp : null
    };
  }

  /**
   * Reset configuration to defaults
   * @param {boolean} clearStorage - Whether to clear stored configuration
   */
  async resetToDefaults(clearStorage = false) {
    console.log('🔄 [UIOptimizationConfig] Resetting configuration to defaults');

    // Reset to default configuration
    this.config = {
      sessionCachingEnabled: true,
      uiPropagationEnabled: true,
      computationReuseEnabled: true,
      serviceStatusOptimizationEnabled: true,
      rollbackMode: false,
      rollbackReason: null,
      rollbackTimestamp: null,
      debugMode: false,
      performanceMonitoring: true,
      configVersion: '1.0.0',
      lastUpdated: Date.now()
    };

    if (clearStorage) {
      try {
        await AsyncStorage.removeItem('ui_optimization_config');
        console.log('🔄 [UIOptimizationConfig] Stored configuration cleared');
      } catch (error) {
        console.error('🔄 [UIOptimizationConfig] Error clearing stored configuration:', error);
      }
    } else {
      await this.saveConfiguration();
    }

    console.log('🔄 [UIOptimizationConfig] Configuration reset to defaults');
  }

  /**
   * Enable debug mode for detailed logging
   * @param {boolean} enabled - Whether to enable debug mode
   */
  async setDebugMode(enabled) {
    console.log('🐛 [UIOptimizationConfig] Setting debug mode:', enabled);
    
    this.config.debugMode = enabled;
    await this.saveConfiguration();
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} True if debug mode is enabled
   */
  isDebugMode() {
    return this.config.debugMode;
  }

  /**
   * Get optimization status summary
   * @returns {Object} Summary of all optimization statuses
   */
  getOptimizationStatus() {
    return {
      sessionCaching: this.isSessionCachingEnabled(),
      uiPropagation: this.isUIPropagationEnabled(),
      computationReuse: this.isComputationReuseEnabled(),
      serviceStatusOptimization: this.isServiceStatusOptimizationEnabled(),
      rollbackMode: this.isRollbackMode(),
      allOptimizationsActive: !this.isRollbackMode() && 
        this.config.sessionCachingEnabled &&
        this.config.uiPropagationEnabled &&
        this.config.computationReuseEnabled &&
        this.config.serviceStatusOptimizationEnabled
    };
  }

  /**
   * Validate configuration integrity
   * @returns {Object} Validation results
   */
  validateConfiguration() {
    const issues = [];
    const warnings = [];

    // Check for configuration consistency
    if (this.config.rollbackMode && 
        (this.config.sessionCachingEnabled || 
         this.config.uiPropagationEnabled || 
         this.config.computationReuseEnabled)) {
      warnings.push('Rollback mode is active but some optimizations are still enabled');
    }

    // Check for missing required properties
    const requiredProperties = [
      'sessionCachingEnabled', 'uiPropagationEnabled', 
      'computationReuseEnabled', 'rollbackMode'
    ];

    for (const prop of requiredProperties) {
      if (this.config[prop] === undefined) {
        issues.push(`Missing required property: ${prop}`);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      warnings,
      configVersion: this.config.configVersion
    };
  }
}

// Create singleton instance
const uiOptimizationConfig = new UIOptimizationConfig();

export default uiOptimizationConfig;