/**
 * Check products in AsyncStorage (local storage)
 * This simulates what the app sees
 */

const AsyncStorage = require('@react-native-async-storage/async-storage').default;

async function checkLocalProducts() {
  console.log('🔍 Checking Local Products (AsyncStorage)...\n');

  try {
    // This won't work in Node.js, but shows the concept
    console.log('⚠️ This script needs to run in React Native environment');
    console.log('📱 To check local products:');
    console.log('   1. Open React Native Debugger');
    console.log('   2. Run: AsyncStorage.getItem("products")');
    console.log('   3. Check the console output\n');
    
    console.log('💡 Alternative: Add this to your POSScreen useEffect:');
    console.log(`
    useEffect(() => {
      const checkProducts = async () => {
        const products = await AsyncStorage.getItem('products');
        console.log('📦 Local products:', JSON.parse(products));
      };
      checkProducts();
    }, []);
    `);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLocalProducts();