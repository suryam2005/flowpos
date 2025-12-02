import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setItemAsync, getItemAsync, deleteItemAsync } from '../utils/secureStorage';

class AuthenticationService {
  // Check if biometric hardware is available
  async isBiometricAvailable() {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      return {
        available: hasHardware && isEnrolled,
        hasHardware,
        isEnrolled,
        types: supportedTypes,
      };
    } catch (error) {
      console.error('Error checking biometric availability:', error);
      return { available: false, hasHardware: false, isEnrolled: false, types: [] };
    }
  }

  // Get biometric type name
  async getBiometricType() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
        return 'Face ID';
      } else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
        return 'Fingerprint';
      } else if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
        return 'Iris';
      }
      
      return 'Biometric';
    } catch (error) {
      return 'Biometric';
    }
  }

  // Authenticate with biometrics
  async authenticateWithBiometric() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to access FlowPOS',
        fallbackLabel: 'Use PIN',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Enable biometric authentication
  async enableBiometric() {
    try {
      const { available } = await this.isBiometricAvailable();
      
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication is not available on this device',
        };
      }

      // Test authentication before enabling
      const authResult = await this.authenticateWithBiometric();
      
      if (authResult.success) {
        await setItemAsync('biometricEnabled', 'true');
        return { success: true };
      }

      return {
        success: false,
        error: 'Authentication failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Disable biometric authentication
  async disableBiometric() {
    try {
      await deleteItemAsync('biometricEnabled');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if biometric is enabled
  async isBiometricEnabled() {
    try {
      const enabled = await getItemAsync('biometricEnabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Set PIN
  async setPin(pin) {
    try {
      if (!pin || pin.length < 4) {
        return {
          success: false,
          error: 'PIN must be at least 4 digits',
        };
      }

      await setItemAsync('userPin', pin);
      await setItemAsync('pinEnabled', 'true');
      
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Verify PIN
  async verifyPin(pin) {
    try {
      const storedPin = await getItemAsync('userPin');
      
      if (!storedPin) {
        return {
          success: false,
          error: 'No PIN set',
        };
      }

      const isValid = pin === storedPin;
      
      return {
        success: isValid,
        error: isValid ? null : 'Incorrect PIN',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if PIN is enabled
  async isPinEnabled() {
    try {
      const enabled = await getItemAsync('pinEnabled');
      return enabled === 'true';
    } catch (error) {
      return false;
    }
  }

  // Disable PIN
  async disablePin() {
    try {
      await deleteItemAsync('userPin');
      await deleteItemAsync('pinEnabled');
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Change PIN
  async changePin(oldPin, newPin) {
    try {
      // Verify old PIN
      const verifyResult = await this.verifyPin(oldPin);
      
      if (!verifyResult.success) {
        return {
          success: false,
          error: 'Current PIN is incorrect',
        };
      }

      // Set new PIN
      return await this.setPin(newPin);
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // Check if any authentication is required
  async isAuthenticationRequired() {
    const pinEnabled = await this.isPinEnabled();
    const biometricEnabled = await this.isBiometricEnabled();
    
    return pinEnabled || biometricEnabled;
  }

  // Authenticate (try biometric first, then PIN)
  async authenticate() {
    try {
      const biometricEnabled = await this.isBiometricEnabled();
      const pinEnabled = await this.isPinEnabled();

      if (!biometricEnabled && !pinEnabled) {
        return { success: true, method: 'none' };
      }

      // Try biometric first if enabled
      if (biometricEnabled) {
        const { available } = await this.isBiometricAvailable();
        
        if (available) {
          const result = await this.authenticateWithBiometric();
          
          if (result.success) {
            return { success: true, method: 'biometric' };
          }
        }
      }

      // Fall back to PIN
      if (pinEnabled) {
        return { success: false, method: 'pin', requirePin: true };
      }

      return { success: false, method: 'none' };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default new AuthenticationService();
