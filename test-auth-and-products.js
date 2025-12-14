// Test authentication and products API
const fetch = require('node-fetch');

async function testAuthAndProducts() {
  try {
    console.log('🔍 Testing authentication and products...\n');
    
    const baseURL = 'http://localhost:3000';
    
    console.log('1. Testing mobile user login...');
    const loginResponse = await fetch(`${baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'mobile_user@flowpos.com',
        password: 'mobile123'
      })
    });
    
    console.log('Login response status:', loginResponse.status);
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json();
      console.log('✅ Login successful');
      console.log('Token received:', loginData.access_token ? 'YES' : 'NO');
      
      if (loginData.access_token) {
        console.log('\n2. Testing products with token...');
        const productsResponse = await fetch(`${baseURL}/api/products`, {
          headers: {
            'Authorization': `Bearer ${loginData.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Products response status:', productsResponse.status);
        
        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          console.log('✅ Products fetched successfully');
          console.log('Products count:', productsData.data?.length || 0);
          
          if (productsData.data && productsData.data.length > 0) {
            console.log('First product:', {
              name: productsData.data[0].name,
              tags: productsData.data[0].tags
            });
          }
        } else {
          const errorData = await productsResponse.json();
          console.log('❌ Products fetch failed:', errorData);
        }
      }
    } else {
      const errorData = await loginResponse.json();
      console.log('❌ Login failed:', errorData);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAuthAndProducts();