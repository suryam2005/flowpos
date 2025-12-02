// Network Status Component - Shows current network status and allows manual refresh
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import NetworkService from '../services/NetworkService';
import { colors } from '../styles/colors';

const NetworkStatus = ({ visible = true }) => {
  const [status, setStatus] = useState({
    connected: false,
    workingURL: null,
    error: null,
    lastChecked: null,
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (visible) {
      checkNetworkStatus();
    }
  }, [visible]);

  const checkNetworkStatus = async () => {
    try {
      const networkStatus = await NetworkService.getNetworkStatus();
      setStatus(networkStatus);
    } catch (error) {
      setStatus({
        connected: false,
        error: error.message,
        workingURL: null,
        lastChecked: Date.now(),
      });
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Force refresh the network detection
      const workingURL = await NetworkService.findWorkingURL(true);
      setStatus({
        connected: true,
        workingURL,
        error: null,
        lastChecked: Date.now(),
      });
      Alert.alert('Success', `Connected to: ${workingURL}`);
    } catch (error) {
      setStatus({
        connected: false,
        error: error.message,
        workingURL: null,
        lastChecked: Date.now(),
      });
      Alert.alert('Connection Failed', error.message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDirectTest = async () => {
    try {
      // Test the cloud backend URL directly
      const testUrl = 'https://flowposbackend-production.up.railway.app/api/store';
      console.log(`🧪 Direct test: ${testUrl}`);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });
      
      if (response.ok) {
        const data = await response.json();
        Alert.alert('Direct Test Success', `API is working! Store: ${data.store?.store_name || 'Unknown'}`);
      } else {
        Alert.alert('Direct Test Failed', `HTTP ${response.status}`);
      }
    } catch (error) {
      Alert.alert('Direct Test Error', error.message);
    }
  };

  if (!visible || !__DEV__) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Network Status</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleDirectTest}
          >
            <Text style={styles.testText}>🧪</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleRefresh}
            disabled={isRefreshing}
          >
            <Text style={styles.refreshText}>
              {isRefreshing ? '🔄' : '↻'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.statusRow}>
        <Text style={styles.label}>Status:</Text>
        <Text style={[
          styles.value,
          { color: status.connected ? colors.success.main : colors.error.main }
        ]}>
          {status.connected ? '✅ Connected' : '❌ Disconnected'}
        </Text>
      </View>

      {status.workingURL && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>URL:</Text>
          <Text style={styles.urlValue} numberOfLines={1}>
            {status.workingURL}
          </Text>
        </View>
      )}

      {status.error && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Error:</Text>
          <Text style={styles.errorValue} numberOfLines={2}>
            {status.error}
          </Text>
        </View>
      )}

      {status.lastChecked && (
        <View style={styles.statusRow}>
          <Text style={styles.label}>Last Check:</Text>
          <Text style={styles.value}>
            {new Date(status.lastChecked).toLocaleTimeString()}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff3cd',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ffeaa7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#856404',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  refreshButton: {
    padding: 4,
  },
  refreshText: {
    fontSize: 16,
    color: '#856404',
  },
  testButton: {
    padding: 4,
  },
  testText: {
    fontSize: 16,
    color: '#856404',
  },
  statusRow: {
    flexDirection: 'row',
    marginBottom: 4,
    alignItems: 'flex-start',
  },
  label: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
    minWidth: 60,
  },
  value: {
    fontSize: 12,
    color: '#856404',
    flex: 1,
  },
  urlValue: {
    fontSize: 10,
    color: '#856404',
    flex: 1,
    fontFamily: 'monospace',
  },
  errorValue: {
    fontSize: 11,
    color: '#dc3545',
    flex: 1,
  },
});

export default NetworkStatus;