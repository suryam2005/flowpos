// Test Network Connectivity Fix
// This script tests the updated API configuration

console.log('🔧 Testing Network Connectivity Fix');
console.log('━'.repeat(50));

// Test URLs (updated with correct IP)
const TEST_URLS = [
  'http://localhost:3000',
  'http://192.168.1.8:3000',
  'http://127.0.0.1:3000'
];

console.log('📡 Testing API URLs:');
TEST_URLS.forEach((url, index) => {
  console.log(`${index + 1}. ${url}`);
});
console.log('');

async function testURL(url) {
  try {
    console.log(`🔍 Testing: ${url}`);
    
    // Test health endpoint
    const healthResponse = await fetch(`${url}/health`);
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log(`✅ Health: ${healthData.status} (Supabase: ${healthData.services.supabase})`);
    } else {
      console.log(`❌ Health: HTTP ${healthResponse.status}`);
      return false;
    }
    
    // Test API endpoint
    const apiResponse = await fetch(`${url}/api`);
    if (apiResponse.ok) {
      const apiData = await apiResponse.json();
      console.log(`✅ API: ${apiData.name} ${apiData.version}`);
      return true;
    } else {
      console.log(`❌ API: HTTP ${apiResponse.status}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return false;
  }
}

async function testConnectivity() {
  console.log('🔍 Testing all endpoints...');
  console.log('');
  
  let workingURLs = [];
  
  for (const url of TEST_URLS) {
    const isWorking = await testURL(url);
    if (isWorking) {
      workingURLs.push(url);
    }
    console.log('');
  }
  
  console.log('📊 Results:');
  console.log(`✅ Working URLs: ${workingURLs.length}/${TEST_URLS.length}`);
  
  if (workingURLs.length > 0) {
    console.log('🎉 Network connectivity test PASSED!');
    console.log('✅ Backend server is reachable');
    console.log('✅ API configuration is correct');
    console.log('Working URLs:', workingURLs);
  } else {
    console.log('❌ Network connectivity test FAILED!');
    console.log('');
    console.log('🔧 Troubleshooting steps:');
    console.log('1. Check if backend server is running: npm start in flowposbackend/');
    console.log('2. Verify IP address matches current machine');
    console.log('3. Check firewall settings');
    console.log('4. Ensure both devices are on same network');
  }
}

// Run the test
testConnectivity();