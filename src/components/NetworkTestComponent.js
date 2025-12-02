import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';

const NetworkTestComponent = () => {
  const { apiCall, user, isAuthenticated, accessToken } = useAuth();
  const [testResult, setTestResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const testNetworkConnection = async () => {
    setIsLoading(true);
    setTestResult('Testing network connection...');
    
    try {
      console.log('🧪 Starting network test...');
      console.log('👤 User:', user ? { id: user.id, email: user.email } : 'No user');
      console.log('🔑 Authenticated:', isAuthenticated);
      console.log('🎫 Token available:', !!accessToken);
      
      // Test 1: Basic API connectivity
      setTestResult('Step 1: Testing basic API connectivity...');
      
      try {
        // This should work without authentication
        const healthResult = await fetch('https://flowposbackend-production.up.railway.app/health');
        const healthData = await healthResult.json();
        console.log('✅ Health check passed:', healthData);
        setTestResult(prev => prev + '\n✅ Health check: PASSED');
      } catch (healthError) {
        console.log('❌ Health check failed:', healthError.message);
        setTestResult(prev => prev + '\n❌ Health check: FAILED - ' + healthError.message);
        throw new Error('Basic connectivity failed');
      }
      
      // Test 2: Store API call (should require auth)
      setTestResult(prev => prev + '\nStep 2: Testing store API...');
      
      try {
        const storeResult = await apiCall('/store', {
          method: 'GET'
        });
        console.log('✅ Store API call passed:', storeResult);
        setTestResult(prev => prev + '\n✅ Store API: PASSED');
      } catch (storeError) {
        console.log('❌ Store API call failed:', storeError.message);
        setTestResult(prev => prev + '\n❌ Store API: FAILED - ' + storeError.message);
        
        if (storeError.message.includes('Route not found')) {
          setTestResult(prev => prev + '\n🔍 This is the route not found error!');
        }
      }
      
      setTestResult(prev => prev + '\n\n🎯 Test completed. Check console for details.');
      
    } catch (error) {
      console.log('❌ Network test failed:', error.message);
      setTestResult(prev => prev + '\n❌ Test failed: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <TouchableOpacity 
        style={styles.button} 
        onPress={testNetworkConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Network Connection'}
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
    backgroundColor: '#f5f5f5',
    margin: 10,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  result: {
    fontSize: 12,
    fontFamily: 'monospace',
    backgroundColor: '#000',
    color: '#0f0',
    padding: 10,
    borderRadius: 4,
  },
});

export default NetworkTestComponent;