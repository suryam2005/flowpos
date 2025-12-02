import AsyncStorage from '@react-native-async-storage/async-storage';

class TokenManager {
  constructor() {
    this.cachedToken = null;
    this.tokenExpiry = null;
    this.refreshPromise = null;
  }

  // Decode JWT token to get expiry time
  decodeToken(token) {
    try {
      if (!token || typeof token !== 'string') {
        return null;
      }
      
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }
      
      const payload = parts[1];
      // Add padding if needed for base64 decoding
      const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
      
      const decoded = JSON.parse(atob(paddedPayload));
      return decoded;
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  // Check if token is expired or will expire soon (within 5 minutes)
  isTokenExpired(token) {
    if (!token) return true;
    
    const decoded = this.decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    const now = Math.floor(Date.now() / 1000);
    const expiryBuffer = 5 * 60; // 5 minutes buffer
    
    return decoded.exp <= (now + expiryBuffer);
  }

  // Get cached token or fetch from storage
  async getCachedToken() {
    // Return cached token if valid
    if (this.cachedToken && !this.isTokenExpired(this.cachedToken)) {
      console.log('🔑 Using cached token');
      return this.cachedToken;
    }

    // Get token from storage
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      
      if (storedToken && !this.isTokenExpired(storedToken)) {
        console.log('🔑 Token loaded from storage');
        this.cachedToken = storedToken;
        return storedToken;
      }

      if (storedToken && this.isTokenExpired(storedToken)) {
        console.log('⚠️ Stored token is expired');
        await this.clearToken();
        return null;
      }

      console.log('⚠️ No valid token available');
      return null;
      
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  // Store token in cache and storage
  async storeToken(token) {
    if (!token) return;

    try {
      // Store in AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      
      // Cache in memory
      this.cachedToken = token;
      
      // Set expiry time
      const decoded = this.decodeToken(token);
      if (decoded && decoded.exp) {
        this.tokenExpiry = decoded.exp * 1000; // Convert to milliseconds
        console.log('🔑 Token cached, expires:', new Date(this.tokenExpiry).toLocaleString());
      }
      
    } catch (error) {
      console.error('Error storing token:', error);
    }
  }

  // Clear token from cache and storage
  async clearToken() {
    try {
      await AsyncStorage.removeItem('authToken');
      this.cachedToken = null;
      this.tokenExpiry = null;
      console.log('🗑️ Token cleared from cache and storage');
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  // Refresh token (disabled - backend endpoint not available)
  async refreshToken() {
    console.log('🔄 Token refresh not available - backend endpoint not implemented');
    console.log('🔒 User will need to re-login for fresh token');
    await this.clearToken();
    return null;
  }

  // Get valid token with automatic refresh
  async getValidToken() {
    let token = await this.getCachedToken();
    
    // If no token or expired, try to refresh
    if (!token || this.isTokenExpired(token)) {
      console.log('🔄 Token expired or missing, attempting refresh...');
      token = await this.refreshToken();
    }
    
    return token;
  }

  // Check if user is authenticated
  async isAuthenticated() {
    const token = await this.getCachedToken();
    return !!token;
  }

  // Get token info for debugging
  async getTokenInfo() {
    const token = await this.getCachedToken();
    if (!token) return null;

    const decoded = this.decodeToken(token);
    if (!decoded) return null;

    return {
      userId: decoded.userId || decoded.sub,
      email: decoded.email,
      exp: decoded.exp,
      expiresAt: new Date(decoded.exp * 1000).toLocaleString(),
      isExpired: this.isTokenExpired(token),
      timeUntilExpiry: decoded.exp ? Math.max(0, decoded.exp - Math.floor(Date.now() / 1000)) : 0
    };
  }
}

// Export singleton instance
export default new TokenManager();