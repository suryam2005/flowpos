import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const AuthTestComponent = () => {
  const { user, isAuthenticated, accessToken, createStore } = useAuth();
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testAuthentication = async () => {
    setIsLoading(true);
    setTestResult('Testing authentication...');
    
    try {
      console.log('🧪 Starting authentication test...');
      
      // Test 1: Check authentication state
      setTestResult('Step 1: Checking authentication state...');
      console.log('👤 User:', user);
      console.log('🔑 Authenticated:', isAuthenticated);
      console.log('🎫 Token available:', !!accessToken);
      console.log('🎫 Token preview:', accessToken ? accessToken.substring(0, 20) + '...' : 'None');
      
      if (!user) {
        setTestResult(prev => prev + '\n❌ No user information');
        throw new Error('No user information available');
      }
      
      if (!isAuthenticated) {
        setTestResult(prev => prev + '\n❌ Not authenticated');
        throw new Error('User is not authenticated');
      }
      
      if (!accessToken) {
        setTestResult(prev => prev + '\n❌ No access token');
        throw new Error('No access token available');
      }
      
      setTestResult(prev => prev + '\n✅ Authentication state: GOOD');
      
      // Test 2: Test store creation with minimal data
      setTestResult(prev => prev + '\nStep 2: Testing store API call...');
      
      const testStoreData = {
        store_name: 'Auth Test Store',
        store_description: 'Testing authentication',
        business_type: 'retail',
        accepts_cash: true,
        accepts_cards: true,
        accepts_upi: true,
        delivery_available: false,
        pickup_available: true,
        opening_hours: {}
      };
      
      try {
        const result = await createStore(testStoreData);
        console.log('✅ Store creation test passed:', result);
        setTestResult(prev => prev + '\n✅ Store API call: SUCCESS');
        setTestResult(prev => prev + '\n🎉 All tests passed!');
      } catch (storeError) {
        console.log('❌ Store creation test failed:', storeError.message);
        setTestResult(prev => prev + '\n❌ Store API call: FAILED');
        setTestResult(prev => prev + '\n❌ Error: ' + storeError.message);
        
        if (storeError.message.includes('Route not found')) {
          setTestResult(prev => prev + '\n🔍 This is the route not found error!');
          setTestResult(prev => prev + '\n💡 But backend tests show routes work...');
        }
      }
      
    } catch (error) {
      console.log('❌ Authentication test failed:', error.message);
      setTestResult(prev => prev + '\n❌ Test failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Authentication Test</Text>
      <View style={styles.info}>
        <Text style={styles.infoText}>User: {user ? user.email : 'None'}</Text>
        <Text style={styles.infoText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
        <Text style={styles.infoText}>Token: {accessToken ? 'Available' : 'None'}</Text>
      </View>
      <TouchableOpacity 
        style={styles.button} 
        onPress={testAuthentication}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Authentication & Store API'}
        </Text>
      </TouchableOpacity>
      {testResult ? (
        <Text style={styles.result}>{testResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff3cd',
    margin: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#856404',
  },
  info: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 4,
  },
  infoText: {
    fontSize: 12,
    color: '#495057',
    marginBottom: 2,
  },
  button: {
    backgroundColor: '#ffc107',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: '#212529',
    fontWeight: 'bold',
  },
  result: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#212529',
    color: '#28a745',
    padding: 10,
    borderRadius: 4,
  },
});

export default AuthTestComponent;