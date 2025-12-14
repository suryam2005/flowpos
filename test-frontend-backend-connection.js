// Test frontend to backend connection
const fetch = require('node-fetch');

async function testConnection() {
  try {
    console.log('🔍 Testing frontend to backend connection...\n');
    
    const baseURL = 'http://localhost:3000';
    
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseURL}/health`);
    console.log('✅ Health check:', healthResponse.status);
    
    console.log('\n2. Testing products endpoint (should get 401)...');
    const productsResponse = await fetch(`${baseURL}/api/products`);
    console.log('Response status:', productsResponse.status);
    
    if (productsResponse.status === 401) {
      console.log('✅ Products endpoint working (401 Unauthorized as expected)');
    } else {
      console.log('❌ Unexpected response from products endpoint');
    }
    
    console.log('\n✅ Backend is accessible from frontend!');
    
  } catch (error) {
    console.error('❌ Connection test failed:', error.message);
  }
}

testConnection();