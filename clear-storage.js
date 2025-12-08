// Quick script to clear AsyncStorage and restart app
// Run this with: node clear-storage.js

const AsyncStorage = require('@react-native-async-storage/async-storage');

async function clearStorage() {
  try {
    console.log('🗑️ Clearing all AsyncStorage data...');
    
    // Clear all keys
    await AsyncStorage.clear();
    
    console.log('✅ AsyncStorage cleared successfully!');
    console.log('📱 Please restart your Expo app (shake device > Reload)');
    console.log('👋 You should now see the Welcome/Signup screen');
  } catch (error) {
    console.error('❌ Error clearing storage:', error);
  }
}

clearStorage();
