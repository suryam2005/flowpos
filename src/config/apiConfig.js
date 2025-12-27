// API Configuration for FlowPOS
// Auto-generated network configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

// Environment-based API configuration
const ENVIRONMENT = 'development'; // Change to 'production' for Railway deployment

const API_CONFIGS = {
  development: [
    // LOCAL DEVELOPMENT - Testing (Multiple IPs for fallback)
    'http://192.168.1.4:3000',      // Primary - Your current LAN IP for mobile
    'http://localhost:3000',        // Fallback - localhost for same machine
    'http://127.0.0.1:3000',        // Loopback
    'http://10.0.2.2:3000',         // Android emulator
  ],
  production: [
    // PRODUCTION - Railway or other hosting
    'https://flowposbackend-production.up.railway.app',  // Replace with your Railway URL
    'http://localhost:3000',        // Fallback to localhost for testing
  ]
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
  const token = await AsyncStorage.getItem('access_token');
  
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

console.log('📡 API Config loaded:', {
  environment: ENVIRONMENT,
  primary: API_BASE_URL,
  fallbacks: API_FALLBACK_URLS.length,
  urls: API_FALLBACK_URLS
});