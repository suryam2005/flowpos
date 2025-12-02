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
    console.log(`🔍 Testing server: ${url}`);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // Test with a simple endpoint that doesn't require auth
      const response = await fetch(`${url}/api/products`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      clearTimeout(timeoutId);
      
      // Even if we get 401 (unauthorized), it means the server is responding
      if (response.status === 401 || response.ok) {
        console.log(`✅ Connected: ${url}`);
        this.baseURL = url;
        this.lastSuccessfulURL = url;
        this.isConnected = true;
        return true;
      } else {
        console.log(`❌ Failed: ${url} - HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      console.log(`❌ Failed: ${url} - ${error.message}`);
      return false;
    }
  }

  async findWorkingServer() {
    console.log('🔍 Finding working server...');
    
    // Try last successful URL first
    if (this.lastSuccessfulURL) {
      console.log('🔍 Testing priority server:', this.lastSuccessfulURL);
      if (await this.testConnection(this.lastSuccessfulURL)) {
        return this.lastSuccessfulURL;
      }
    }
    
    // Try all configured URLs
    for (const url of this.fallbackURLs) {
      if (await this.testConnection(url)) {
        return url;
      }
    }
    
    console.log('❌ No working server found');
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
      await this.ensureConnection();
      
      // Get auth token if available (try both keys for compatibility)
      let token = await AsyncStorage.getItem('accessToken') || await AsyncStorage.getItem('access_token') || await AsyncStorage.getItem('authToken');
      console.log('🔧 [NETWORK] Token available:', token ? 'YES' : 'NO');
      if (token) {
        console.log('🔧 [NETWORK] Token preview:', token.substring(0, 20) + '...');
      }
      
      const url = `${this.baseURL}/api${endpoint}`;
      let response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
          ...options.headers,
        },
      });
      
      console.log('🔧 [NETWORK] Response status:', response.status);
      
      // If 401 and we have credentials, try to get a new token
      if (response.status === 401 && !token) {
        console.log('🔧 [NETWORK] No token, attempting mobile user auto-login...');
        
        try {
          const loginResponse = await fetch(`${this.baseURL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'mobile_user@flowpos.com',
              password: 'mobile123'
            })
          });
          
          if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            token = loginData.access_token;
            await AsyncStorage.setItem('access_token', token);
            await AsyncStorage.setItem('user_email', 'mobile_user@flowpos.com');
            console.log('🔧 [NETWORK] Mobile user auto-login successful, retrying request...');
            
            // Retry original request with new token
            response = await fetch(url, {
              ...options,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                ...options.headers,
              },
            });
            
            console.log('🔧 [NETWORK] Retry response status:', response.status);
          } else {
            console.log('🔧 [NETWORK] Auto-login failed:', loginResponse.status);
          }
        } catch (loginError) {
          console.log('🔧 [NETWORK] Auto-login error:', loginError.message);
        }
      }
      
      return response;
    } catch (error) {
      console.log('❌ API Call failed, trying to reconnect...');
      this.isConnected = false;
      
      // Try to find working server and retry once
      const workingURL = await this.findWorkingServer();
      if (workingURL) {
        const token = await AsyncStorage.getItem('access_token');
        const url = `${this.baseURL}/api${endpoint}`;
        return fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers,
          },
        });
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