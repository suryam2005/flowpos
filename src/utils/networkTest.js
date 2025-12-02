import { apiCallWithFallback } from '../config/apiConfig';

export const testNetworkConnection = async () => {
  try {
    console.log('🔗 Testing network connection...');
    
    // Test basic server connectivity
    const response = await apiCallWithFallback('/', {
      method: 'GET',
    });
    
    const data = await response.json();
    console.log('✅ Server connection successful:', data.name);
    
    return {
      success: true,
      message: 'Network connection is working',
      serverInfo: data
    };
  } catch (error) {
    console.error('❌ Network connection failed:', error.message);
    
    return {
      success: false,
      message: error.message,
      suggestions: [
        'Check if backend server is running',
        'Verify IP address configuration',
        'Check network connectivity',
        'Ensure firewall is not blocking connection'
      ]
    };
  }
};

export const testStoreAPI = async (authToken) => {
  try {
    console.log('🏪 Testing store API...');
    
    const response = await apiCallWithFallback('/store', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('✅ Store API test successful');
    
    return {
      success: true,
      message: 'Store API is working',
      data: data
    };
  } catch (error) {
    console.error('❌ Store API test failed:', error.message);
    
    return {
      success: false,
      message: error.message,
      suggestions: [
        'Check authentication token',
        'Verify store routes are registered',
        'Check server logs for errors'
      ]
    };
  }
};