import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import networkService from '../services/NetworkService';

const NetworkDebugger = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleForceReset = async () => {
    setLoading(true);
    try {
      console.log('🔄 User triggered network reset...');
      const newURL = await networkService.forceReset();
      Alert.alert('Network Reset Success', `Found working URL: ${newURL}`);
      await getNetworkStatus();
    } catch (error) {
      console.error('❌ Network reset failed:', error);
      Alert.alert('Network Reset Failed', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getNetworkStatus = async () => {
    setLoading(true);
    try {
      const networkStatus = await networkService.getDetailedNetworkStatus();
      setStatus(networkStatus);
    } catch (error) {
      console.error('❌ Failed to get network status:', error);
      Alert.alert('Error', 'Failed to get network status');
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async () => {
    try {
      networkService.clearCache();
      Alert.alert('Cache Cleared', 'Network cache has been cleared. Try using the app again.');
      await getNetworkStatus();
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🔧 Network Debugger</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.resetButton]} 
          onPress={handleForceReset}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🔄 Resetting...' : '🔄 Force Network Reset'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.statusButton]} 
          onPress={getNetworkStatus}
          disabled={loading}
        >
          <Text style={styles.buttonText}>📊 Check Status</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearCache}
          disabled={loading}
        >
          <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
        </TouchableOpacity>
      </View>

      {status && (
        <ScrollView style={styles.statusContainer}>
          <Text style={styles.statusTitle}>Network Status:</Text>
          <Text style={styles.statusText}>Current IP: {status.currentIP || 'None'}</Text>
          <Text style={styles.statusText}>Working URL: {status.workingURL || 'None'}</Text>
          <Text style={styles.statusText}>Last Checked: {status.lastChecked ? new Date(status.lastChecked).toLocaleTimeString() : 'Never'}</Text>
          
          <Text style={styles.statusTitle}>URL Test Results:</Text>
          {status.testResults.map((result, index) => (
            <View key={index} style={styles.testResult}>
              <Text style={[styles.testUrl, result.working ? styles.working : styles.notWorking]}>
                {result.working ? '✅' : '❌'} {result.url}
              </Text>
              {result.error && (
                <Text style={styles.errorText}>Error: {result.error}</Text>
              )}
              {result.responseTime && (
                <Text style={styles.responseTime}>Response: {result.responseTime}ms</Text>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#ff6b6b',
  },
  statusButton: {
    backgroundColor: '#4ecdc4',
  },
  clearButton: {
    backgroundColor: '#ffa726',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    maxHeight: 400,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  testResult: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 5,
  },
  testUrl: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  working: {
    color: '#28a745',
  },
  notWorking: {
    color: '#dc3545',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 2,
  },
  responseTime: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2,
  },
});

export default NetworkDebugger;