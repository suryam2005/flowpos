// Enhanced NetworkService with better connection handling
import { API_BASE_URL, API_FALLBACK_URLS } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';

class NetworkService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.fallbackURLs = API_FALLBACK_URLS || [];
    this.currentURLIndex = 0;
    this.isConnected = false;
    this.lastSuccessfulURL = null;
  }

  async testConnection(url, timeout = 5000) {
    console.log(`🔍 [NetworkService] Testing server: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Test with health endpoint first (doesn't require auth)
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const healthData = await response.json();
        console.log(`✅ [NetworkService] Connected: ${url} (${healthData.status})`);
        this.baseURL = url;
        this.lastSuccessfulURL = url;
        this.isConnected = true;
        return true;
      } else {
        console.log(`❌ [NetworkService] Failed: ${url} - HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log(`❌ [NetworkService] Failed: ${url} - Connection timeout (${timeout}ms)`);
      } else {
        console.log(`❌ [NetworkService] Failed: ${url} - ${error.message}`);
      }
      return false;
    }
  }

  async findWorkingServer() {
    console.log('🔍 [NetworkService] Finding working server...');
    console.log('🔍 [NetworkService] Available URLs:', this.fallbackURLs);
    
    // Try last successful URL first
    if (this.lastSuccessfulURL) {
      console.log('🔍 [NetworkService] Testing priority server:', this.lastSuccessfulURL);
      if (await this.testConnection(this.lastSuccessfulURL)) {
        return this.lastSuccessfulURL;
      }
    }
    
    // Try all configured URLs
    for (const url of this.fallbackURLs) {
      console.log(`🔍 [NetworkService] Trying: ${url}`);
      if (await this.testConnection(url)) {
        return url;
      }
    }
    
    console.log('❌ [NetworkService] No working server found');
    console.log('❌ [NetworkService] Tried URLs:', this.fallbackURLs);
    console.log('💡 [NetworkService] Troubleshooting tips:');
    console.log('   1. Check if backend server is running');
    console.log('   2. Verify IP address matches current machine');
    console.log('   3. Check firewall settings');
    console.log('   4. Ensure devices are on same network');
    this.isConnected = false;
    return null;
  }

  async ensureConnection() {
    if (!this.isConnected || !this.lastSuccessfulURL) {
      const workingURL = await this.findWorkingServer();
      if (!workingURL) {
        throw new Error('Cannot connect to backend server');
      }
    }
    return this.baseURL;
  }

  // Main API call method (expected by ProductsService and OrdersService)
  async apiCall(endpoint, options = {}) {
    try {
      console.log(`🌐 [NetworkService] API Call: ${options.method || 'GET'} ${endpoint}`);
      
      await this.ensureConnection();
      
      // Get auth token if available (try multiple keys for compatibility)
      let token = await AsyncStorage.getItem('accessToken') || 
                  await AsyncStorage.getItem('access_token') || 
                  await AsyncStorage.getItem('authToken');
      
      console.log('🔧 [NetworkService] Token available:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔧 [NetworkService] Token preview:', token.substring(0, 20) + '...');
      }
      
      const url = `${this.baseURL}/api${endpoint}`;
      console.log('🌐 [NetworkService] Request URL:', url);
      
      let response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });
      
      console.log('🔧 [NetworkService] Response status:', response.status);
      
      // Handle different response statuses
      if (response.status === 401) {
        console.log('🔧 [NetworkService] 401 Unauthorized - clearing expired tokens');
        
        // Clear all possible token keys
        await Promise.all([
          AsyncStorage.removeItem('access_token'),
          AsyncStorage.removeItem('accessToken'),
          AsyncStorage.removeItem('authToken')
        ]);
        
        if (token) {
          console.log('🔧 [NetworkService] Token was expired, user needs to re-authenticate');
        } else {
          console.log('🔧 [NetworkService] No token provided for protected endpoint');
        }
      } else if (response.ok) {
        console.log('✅ [NetworkService] Request successful');
      } else {
        console.log(`⚠️ [NetworkService] Request failed with status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.log('❌ [NetworkService] API Call failed:', error.message);
      
      // Check if it's a network connectivity issue
      if (error.message.includes('Network request failed') || 
          error.message.includes('fetch') ||
          error.message.includes('ECONNREFUSED')) {
        
        console.log('🔄 [NetworkService] Network error detected, trying to reconnect...');
        this.isConnected = false;
        
        // Try to find working server and retry once
        const workingURL = await this.findWorkingServer();
        if (workingURL) {
          console.log('🔄 [NetworkService] Retrying with working server:', workingURL);
          
          const token = await AsyncStorage.getItem('accessToken') || 
                        await AsyncStorage.getItem('access_token') || 
                        await AsyncStorage.getItem('authToken');
          
          const url = `${this.baseURL}/api${endpoint}`;
          return fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
              ...options.headers,
            },
          });
        } else {
          console.log('❌ [NetworkService] No working server found for retry');
          throw new Error('Cannot connect to backend server. Please check your internet connection and ensure the backend is running.');
        }
      }
      
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async request(endpoint, options = {}) {
    return this.apiCall(endpoint, options);
  }

  getStatus() {
    return {
      isConnected: this.isConnected,
      currentURL: this.baseURL,
      lastSuccessfulURL: this.lastSuccessfulURL,
    };
  }
}

export default new NetworkService();