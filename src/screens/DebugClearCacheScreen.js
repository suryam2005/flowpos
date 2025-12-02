/**
 * TEMPORARY DEBUG SCREEN
 * Add this to your navigation to help users clear cache
 * 
 * To use:
 * 1. Add to your navigation stack
 * 2. Navigate to it from Settings
 * 3. User can see what's cached and clear it
 * 4. Remove this screen after fixing the issue
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../styles/colors';

const DebugClearCacheScreen = ({ navigation }) => {
  const [cacheData, setCacheData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCacheData();
  }, []);

  const loadCacheData = async () => {
    try {
      setLoading(true);
      const keys = await AsyncStorage.getAllKeys();
      const data = [];

      for (const key of keys) {
        const value = await AsyncStorage.getItem(key);
        let displayValue = value;
        let itemCount = 0;

        try {
          const parsed = JSON.parse(value);
          if (Array.isArray(parsed)) {
            itemCount = parsed.length;
            displayValue = `Array with ${itemCount} items`;
          } else if (typeof parsed === 'object') {
            displayValue = `Object with ${Object.keys(parsed).length} keys`;
          }
        } catch {
          displayValue = value?.substring(0, 50) + (value?.length > 50 ? '...' : '');
        }

        data.push({ key, value: displayValue, itemCount });
      }

      setCacheData(data);
    } catch (error) {
      console.error('Error loading cache data:', error);
      Alert.alert('Error', 'Failed to load cache data');
    } finally {
      setLoading(false);
    }
  };

  const clearAllCache = () => {
    Alert.alert(
      'Clear All Cache?',
      'This will delete ALL app data including:\n\n• Login session\n• Products\n• Orders\n• Settings\n\nYou will need to login again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Everything',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.clear();
              Alert.alert(
                'Success!',
                'All cache cleared. Please close the app completely and restart it, then login again.',
                [
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Login')
                  }
                ]
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache: ' + error.message);
            }
          }
        }
      ]
    );
  };

  const clearSpecificKey = (key) => {
    Alert.alert(
      'Clear This Item?',
      `Delete: ${key}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.removeItem(key);
              Alert.alert('Success', `Deleted: ${key}`);
              loadCacheData(); // Reload
            } catch (error) {
              Alert.alert('Error', 'Failed to delete: ' + error.message);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary.main} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Debug: Clear Cache</Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ Debug Tool</Text>
        <Text style={styles.warningText}>
          This screen helps diagnose cache issues. If you're seeing other users' data, clear all cache below.
        </Text>
      </View>

      <View style={styles.statsBox}>
        <Text style={styles.statsText}>Total Cached Items: {cacheData.length}</Text>
      </View>

      <ScrollView style={styles.list}>
        {cacheData.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.cacheItem}
            onPress={() => clearSpecificKey(item.key)}
          >
            <View style={styles.cacheItemContent}>
              <Text style={styles.cacheKey}>{item.key}</Text>
              <Text style={styles.cacheValue}>{item.value}</Text>
              {item.itemCount > 0 && (
                <Text style={styles.cacheCount}>({item.itemCount} items)</Text>
              )}
            </View>
            <Text style={styles.deleteIcon}>🗑️</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.clearAllButton}
          onPress={clearAllCache}
        >
          <Text style={styles.clearAllButtonText}>🧹 Clear All Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadCacheData}
        >
          <Text style={styles.refreshButtonText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary.main,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  warningBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#92400E',
    lineHeight: 20,
  },
  statsBox: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cacheItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.background.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cacheItemContent: {
    flex: 1,
  },
  cacheKey: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  cacheValue: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  cacheCount: {
    fontSize: 12,
    color: colors.primary.main,
    marginTop: 4,
  },
  deleteIcon: {
    fontSize: 20,
    marginLeft: 12,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  clearAllButton: {
    backgroundColor: '#DC2626',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  clearAllButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: colors.primary.main,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DebugClearCacheScreen;
