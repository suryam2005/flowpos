// API Configuration for FlowPOS
// Auto-generated network configuration
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_CONFIGS = [
  // LOCAL DEVELOPMENT - Testing
  'http://192.168.1.4:3000',
  'http://10.0.2.2:3000', // Android emulator
  'http://localhost:3000',
  
  // Cloud backend (Railway production) - DISABLED FOR TESTING
  // 'https://flowposbackend-production.up.railway.app',
];

// Export the primary API base URL
export const API_BASE_URL = API_CONFIGS[0];

// Export all configs for fallback testing
export const API_FALLBACK_URLS = API_CONFIGS;

// API call with fallback functionality (expected by AuthContext)
export const apiCallWithFallback = async (endpoint, options = {}) => {
  console.log('🔄 API Call:', endpoint);
  
  // Get auth token if available
  const token = await AsyncStorage.getItem('access_token');
  
  // Try each URL until one works
  for (const baseURL of API_CONFIGS) {
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
  primary: API_BASE_URL,
  fallbacks: API_FALLBACK_URLS.length
});