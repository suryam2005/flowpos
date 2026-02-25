// API Configuration for FlowPOS
// Auto-generated network configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

// Environment-based API configuration
const ENVIRONMENT = 'development'; // Change to 'production' for Render deployment

const API_CONFIGS = {
  development: [
    // LOCAL DEVELOPMENT - Testing (Multiple IPs for fallback)
    'http://192.168.1.9:3000',     // Primary - Your machine's actual IP (from ipconfig - Feb 25, 2026)
    'http://192.168.1.3:3000',     // Previous IP (fallback)
    'http://192.168.1.2:3000',     // Backend detected IP (fallback)
    'http://localhost:3000',        // localhost for same machine
    'http://127.0.0.1:3000',        // Loopback
    'http://10.0.2.2:3000',         // Android emulator
    'http://192.168.1.5:3000',     // Previous IP (fallback)
    'http://192.168.1.7:3000',     // Previous IP (fallback)
    'http://192.168.1.4:3000',     // Previous IP (fallback)
  ],
  production: [
    // PRODUCTION - Render hosting
    'https://flowposbackend-2.onrender.com',  // Primary production server
  ],
};

// Get URLs based on environment
const CURRENT_API_CONFIGS = API_CONFIGS[ENVIRONMENT] || API_CONFIGS.development;

// Export the primary API base URL
export const API_BASE_URL = CURRENT_API_CONFIGS[0];

// Export all configs for fallback testing
export const API_FALLBACK_URLS = CURRENT_API_CONFIGS;

// API call with fallback functionality (expected by AuthContext)
export const apiCallWithFallback = async (endpoint, options = {}) => {
  console.log('🔄 API Call:', endpoint);
  
  // Get auth token if available
  const token = await AsyncStorage.getItem('accessToken');
  
  // Try each URL until one works
  for (const baseURL of CURRENT_API_CONFIGS) {
    try {
      const url = `${baseURL}/api${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });
      
      // If we get a response (even error), the server is reachable
      console.log(`✅ API Success: ${baseURL}${endpoint}`);
      return response;
    } catch (error) {
      console.log(`❌ API Call Error: ${error.message}, ${error.toString()}`);
      continue; // Try next URL
    }
  }
  
  throw new Error('All API endpoints failed');
};

// Default configuration
const apiConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000,
  fallbackURLs: API_FALLBACK_URLS,
};

export default apiConfig;

console.log('🔍 DEBUG: Current API Configuration');
console.log('Environment:', ENVIRONMENT);
console.log('Primary URL:', API_BASE_URL);
console.log('All URLs:', API_FALLBACK_URLS);
console.log('📡 API Config loaded:', {
  environment: ENVIRONMENT,
  primary: API_BASE_URL,
  fallbacks: API_FALLBACK_URLS.length,
  urls: API_FALLBACK_URLS
});