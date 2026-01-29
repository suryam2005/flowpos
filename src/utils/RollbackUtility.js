/**
 * RollbackUtility - Simple utility for managing UI optimization rollback
 * 
 * This utility provides easy methods to enable/disable rollback mode
 * and check the current rollback status. It's designed to be used
 * by developers or support staff when issues arise.
 * 
 * Requirements: 9.1, 9.2, 9.3
 */

import uiOptimizationConfig from '../services/UIOptimizationConfig';

class RollbackUtility {
  /**
   * Enable rollback mode - disables all UI optimizations
   * @param {string} reason - Reason for rollback (optional)
   * @returns {Promise<Object>} Rollback operation result
   */
  static async enableRollback(reason = 'Manual rollback requested') {
    console.warn('🔄 [RollbackUtility] Enabling rollback mode:', reason);

    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      // Enable rollback mode
      const success = await uiOptimizationConfig.enableRollback(reason);

      if (success) {
        console.warn('🔄 [RollbackUtility] ROLLBACK ENABLED - All optimizations disabled');
        console.log('🔄 [RollbackUtility] System will now use direct API reads only');
        
        return {
          success: true,
          message: 'Rollback mode enabled successfully',
          reason,
          timestamp: Date.now(),
          optimizationStatus: uiOptimizationConfig.getOptimizationStatus()
        };
      } else {
        console.error('🔄 [RollbackUtility] Failed to enable rollback mode');
        return {
          success: false,
          message: 'Failed to enable rollback mode',
          error: 'Configuration update failed'
        };
      }

    } catch (error) {
      console.error('🔄 [RollbackUtility] Error enabling rollback:', error);
      return {
        success: false,
        message: 'Error enabling rollback mode',
        error: error.message
      };
    }
  }

  /**
   * Disable rollback mode - re-enables UI optimizations
   * @returns {Promise<Object>} Rollback operation result
   */
  static async disableRollback() {
    console.log('✅ [RollbackUtility] Disabling rollback mode');

    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      // Disable rollback mode
      const success = await uiOptimizationConfig.disableRollback();

      if (success) {
        console.log('✅ [RollbackUtility] ROLLBACK DISABLED - Optimizations re-enabled');
        
        return {
          success: true,
          message: 'Rollback mode disabled successfully',
          timestamp: Date.now(),
          optimizationStatus: uiOptimizationConfig.getOptimizationStatus()
        };
      } else {
        console.error('✅ [RollbackUtility] Failed to disable rollback mode');
        return {
          success: false,
          message: 'Failed to disable rollback mode',
          error: 'Configuration update failed'
        };
      }

    } catch (error) {
      console.error('✅ [RollbackUtility] Error disabling rollback:', error);
      return {
        success: false,
        message: 'Error disabling rollback mode',
        error: error.message
      };
    }
  }

  /**
   * Get current rollback status
   * @returns {Promise<Object>} Current rollback status and configuration
   */
  static async getRollbackStatus() {
    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      const rollbackInfo = uiOptimizationConfig.getRollbackInfo();
      const optimizationStatus = uiOptimizationConfig.getOptimizationStatus();
      const configuration = uiOptimizationConfig.getConfiguration();

      return {
        success: true,
        rollbackMode: rollbackInfo.isRollbackMode,
        rollbackReason: rollbackInfo.rollbackReason,
        rollbackTimestamp: rollbackInfo.rollbackTimestamp,
        rollbackAge: rollbackInfo.rollbackAge,
        optimizationStatus,
        configuration: {
          sessionCaching: configuration.sessionCachingEnabled,
          uiPropagation: configuration.uiPropagationEnabled,
          computationReuse: configuration.computationReuseEnabled,
          serviceStatusOptimization: configuration.serviceStatusOptimizationEnabled,
          debugMode: configuration.debugMode,
          configVersion: configuration.configVersion
        }
      };

    } catch (error) {
      console.error('📊 [RollbackUtility] Error getting rollback status:', error);
      return {
        success: false,
        message: 'Error getting rollback status',
        error: error.message
      };
    }
  }

  /**
   * Reset all configuration to defaults
   * @param {boolean} clearStorage - Whether to clear stored configuration
   * @returns {Promise<Object>} Reset operation result
   */
  static async resetToDefaults(clearStorage = false) {
    console.log('🔄 [RollbackUtility] Resetting configuration to defaults');

    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      await uiOptimizationConfig.resetToDefaults(clearStorage);

      console.log('🔄 [RollbackUtility] Configuration reset to defaults');
      
      return {
        success: true,
        message: 'Configuration reset to defaults successfully',
        timestamp: Date.now(),
        optimizationStatus: uiOptimizationConfig.getOptimizationStatus()
      };

    } catch (error) {
      console.error('🔄 [RollbackUtility] Error resetting configuration:', error);
      return {
        success: false,
        message: 'Error resetting configuration',
        error: error.message
      };
    }
  }

  /**
   * Toggle a specific optimization feature
   * @param {string} feature - Feature name ('sessionCaching', 'uiPropagation', 'computationReuse', 'serviceStatusOptimization')
   * @param {boolean} enabled - Whether to enable or disable
   * @returns {Promise<Object>} Toggle operation result
   */
  static async toggleFeature(feature, enabled) {
    console.log('⚙️ [RollbackUtility] Toggling feature:', { feature, enabled });

    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      const featureMap = {
        sessionCaching: 'sessionCachingEnabled',
        uiPropagation: 'uiPropagationEnabled',
        computationReuse: 'computationReuseEnabled',
        serviceStatusOptimization: 'serviceStatusOptimizationEnabled'
      };

      const configKey = featureMap[feature];
      if (!configKey) {
        return {
          success: false,
          message: `Invalid feature name: ${feature}`,
          validFeatures: Object.keys(featureMap)
        };
      }

      const success = await uiOptimizationConfig.toggleFeature(configKey, enabled);

      if (success) {
        console.log('⚙️ [RollbackUtility] Feature toggled successfully:', { feature, enabled });
        
        return {
          success: true,
          message: `Feature ${feature} ${enabled ? 'enabled' : 'disabled'} successfully`,
          feature,
          enabled,
          timestamp: Date.now(),
          optimizationStatus: uiOptimizationConfig.getOptimizationStatus()
        };
      } else {
        return {
          success: false,
          message: `Failed to toggle feature: ${feature}`
        };
      }

    } catch (error) {
      console.error('⚙️ [RollbackUtility] Error toggling feature:', error);
      return {
        success: false,
        message: 'Error toggling feature',
        error: error.message
      };
    }
  }

  /**
   * Enable debug mode for detailed logging
   * @param {boolean} enabled - Whether to enable debug mode
   * @returns {Promise<Object>} Debug mode operation result
   */
  static async setDebugMode(enabled) {
    console.log('🐛 [RollbackUtility] Setting debug mode:', enabled);

    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      await uiOptimizationConfig.setDebugMode(enabled);

      console.log('🐛 [RollbackUtility] Debug mode set:', enabled);
      
      return {
        success: true,
        message: `Debug mode ${enabled ? 'enabled' : 'disabled'} successfully`,
        debugMode: enabled,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('🐛 [RollbackUtility] Error setting debug mode:', error);
      return {
        success: false,
        message: 'Error setting debug mode',
        error: error.message
      };
    }
  }

  /**
   * Validate configuration integrity
   * @returns {Promise<Object>} Validation results
   */
  static async validateConfiguration() {
    try {
      // Initialize config if not already done
      if (!uiOptimizationConfig.isInitialized) {
        await uiOptimizationConfig.initialize();
      }

      const validation = uiOptimizationConfig.validateConfiguration();

      return {
        success: true,
        validation,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('🔍 [RollbackUtility] Error validating configuration:', error);
      return {
        success: false,
        message: 'Error validating configuration',
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive system status for debugging
   * @returns {Promise<Object>} Comprehensive system status
   */
  static async getSystemStatus() {
    try {
      const rollbackStatus = await this.getRollbackStatus();
      const validation = await this.validateConfiguration();

      return {
        success: true,
        timestamp: Date.now(),
        rollback: rollbackStatus.success ? {
          isRollbackMode: rollbackStatus.rollbackMode,
          reason: rollbackStatus.rollbackReason,
          age: rollbackStatus.rollbackAge
        } : { error: rollbackStatus.error },
        optimizations: rollbackStatus.success ? rollbackStatus.optimizationStatus : null,
        configuration: rollbackStatus.success ? rollbackStatus.configuration : null,
        validation: validation.success ? validation.validation : { error: validation.error }
      };

    } catch (error) {
      console.error('📊 [RollbackUtility] Error getting system status:', error);
      return {
        success: false,
        message: 'Error getting system status',
        error: error.message
      };
    }
  }
}

export default RollbackUtility;