/**
 * Test PDF Reports Generation
 * Debug script to test PDF generation functionality
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Test store information
const testStoreInfo = {
  store_name: 'Test FlowPOS Store',
  store_address: '123 Test Street, Test City, Test State 12345',
  store_phone: '+91 9876543210',
  store_email: 'test@flowpos.com',
  gst_number: 'TEST123456789'
};

// Test products data
const testProducts = [
  {
    id: 'prod1',
    name: 'Test Product 1',
    category: 'Electronics',
    price: 299,
    stock: 15,
    trackStock: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'prod2',
    name: 'Test Product 2',
    category: 'Clothing',
    price: 49,
    stock: 25,
    trackStock: true,
    createdAt: new Date(Date.now() - 86400000).toISOString()
  }
];

// Test orders data
const testOrders = [
  {
    id: 'ord1',
    orderNumber: 'FP241211001',
    customerName: 'John Doe',
    items: [{ name: 'Test Product 1', quantity: 2, price: 299 }],
    subtotal: 598,
    tax: 107.64,
    total: 705.64,
    paymentMethod: 'Cash',
    timestamp: new Date().toISOString()
  },
  {
    id: 'ord2',
    orderNumber: 'FP241211002',
    customerName: 'Jane Smith',
    items: [{ name: 'Test Product 2', quantity: 1, price: 49 }],
    subtotal: 49,
    tax: 8.82,
    total: 57.82,
    paymentMethod: 'UPI',
    timestamp: new Date(Date.now() - 3600000).toISOString()
  }
];

async function setupTestData() {
  try {
    console.log('🧪 Setting up test data for PDF reports...');
    
    // Set store info
    await AsyncStorage.setItem('storeInfo', JSON.stringify(testStoreInfo));
    console.log('✅ Store info set');
    
    // Set products
    await AsyncStorage.setItem('products', JSON.stringify(testProducts));
    console.log('✅ Products set');
    
    // Set orders
    await AsyncStorage.setItem('orders', JSON.stringify(testOrders));
    console.log('✅ Orders set');
    
    console.log('🎉 Test data setup complete!');
    console.log('📋 You can now try generating PDF reports');
    
  } catch (error) {
    console.error('❌ Error setting up test data:', error);
  }
}

async function checkCurrentData() {
  try {
    console.log('🔍 Checking current data in storage...');
    
    const storeInfo = await AsyncStorage.getItem('storeInfo');
    const products = await AsyncStorage.getItem('products');
    const orders = await AsyncStorage.getItem('orders');
    
    console.log('📊 Current data status:');
    console.log('- Store Info:', storeInfo ? 'EXISTS' : 'MISSING');
    console.log('- Products:', products ? `${JSON.parse(products).length} items` : 'MISSING');
    console.log('- Orders:', orders ? `${JSON.parse(orders).length} items` : 'MISSING');
    
    if (storeInfo) {
      const store = JSON.parse(storeInfo);
      console.log('🏪 Store Details:');
      console.log('- Name:', store.store_name || store.name || 'NOT SET');
      console.log('- Address:', store.store_address || store.address || 'NOT SET');
      console.log('- Phone:', store.store_phone || store.phone || 'NOT SET');
    }
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  }
}

async function testPDFGeneration() {
  try {
    console.log('🧪 Testing PDF generation...');
    
    // Import PDFReportsService
    const pdfReportsService = require('./src/services/PDFReportsService').default;
    
    // Test business summary report
    console.log('📄 Generating business summary report...');
    const result = await pdfReportsService.generateBusinessSummaryReport();
    
    console.log('✅ PDF generated successfully!');
    console.log('📁 File:', result.filename);
    console.log('🔗 URI:', result.uri);
    
  } catch (error) {
    console.error('❌ PDF generation failed:', error.message);
    console.error('📋 Full error:', error);
  }
}

// Export functions for manual testing
export {
  setupTestData,
  checkCurrentData,
  testPDFGeneration
};

// Auto-run check when imported
console.log('🧪 PDF Reports Debug Script Loaded');
console.log('📋 Available functions:');
console.log('- setupTestData() - Set up test store/products/orders data');
console.log('- checkCurrentData() - Check what data exists in storage');
console.log('- testPDFGeneration() - Test PDF generation with current data');
console.log('');
console.log('💡 Run setupTestData() first if you have no data, then try PDF generation in the app');