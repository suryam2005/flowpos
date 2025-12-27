import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';
import LoadingSpinner from '../components/LoadingSpinner';
import { safeGoBack, safeNavigate } from '../utils/navigationUtils';
import networkService from '../services/NetworkService';

const { width } = Dimensions.get('window');

const StorageManagementScreen = ({ navigation }) => {
  const [storageSummary, setStorageSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  // Get current plan from user data or default to trial
  const currentPlan = user?.subscription_plan || 'trial';

  useEffect(() => {
    loadStorageData();
  }, []);

  const loadStorageData = async () => {
    try {
      setLoading(true);
      console.log('📊 Fetching storage data from API...');

      const response = await networkService.apiCall('/subscription/storage', {
        method: 'GET',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          console.log('✅ Storage data received:', result.data);

          // Transform API data to match expected format
          const apiData = result.data;
          setStorageSummary({
            usage: {
              used: apiData.totalStorage,
              quota: apiData.quotaStorage,
              remaining: apiData.remainingStorage,
              percentage: apiData.usedPercentage?.toFixed(1) || '0',
            },
            status: {
              withinQuota: !apiData.isOverLimit,
              isNearLimit: apiData.isNearLimit,
              isOverLimit: apiData.isOverLimit,
            },
            breakdown: apiData.breakdown,
            planName: apiData.subscription?.planName || 'Free Trial',
            lastCalculated: apiData.lastCalculated,
          });
        }
      } else {
        console.log('⚠️ Failed to fetch storage from API');
        Alert.alert('Error', 'Failed to load storage information');
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadStorageData();
    setRefreshing(false);
  };

  const handleCleanup = async (type) => {
    Alert.alert(
      'Clear Cache',
      'This will clear locally cached data. Your cloud data will not be affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear local AsyncStorage cache
              const AsyncStorage =
                require('@react-native-async-storage/async-storage').default;
              await AsyncStorage.removeItem('products_cache');
              await AsyncStorage.removeItem('orders_cache');
              Alert.alert('Success', 'Local cache cleared successfully');
              await loadStorageData();
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = () => {
    if (!storageSummary) return colors.success.main;
    if (storageSummary.status.isOverLimit) return colors.error.main;
    if (storageSummary.status.isNearLimit) return colors.warning.main;
    return colors.success.main;
  };

  const getStatusText = () => {
    if (!storageSummary) return 'Loading...';
    if (storageSummary.status.isOverLimit) return 'Over Limit';
    if (storageSummary.status.isNearLimit) return 'Near Limit';
    return 'Good';
  };

  const renderProgressBar = () => {
    if (!storageSummary) return null;

    const percentage = Math.min(parseFloat(storageSummary.usage.percentage), 100);
    const color = getStatusColor();

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>{percentage}% used</Text>
      </View>
    );
  };

  const renderStorageBreakdown = () => {
    if (!storageSummary?.breakdown) return null;

    const breakdown = storageSummary.breakdown;

    // Format bytes helper
    const formatBytes = (bytes) => {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Simplified breakdown - Products (includes images), Orders, Store
    const items = [
      {
        key: 'products',
        label: 'Products',
        sublabel: 'Includes product images',
        icon: 'cube-outline',
        color: colors.primary.main,
      },
      {
        key: 'orders',
        label: 'Orders',
        sublabel: 'Order history & items',
        icon: 'receipt-outline',
        color: colors.success.main,
      },
      {
        key: 'store',
        label: 'Store Info',
        sublabel: 'Store settings & config',
        icon: 'storefront-outline',
        color: colors.text.secondary,
      },
    ];

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Storage Breakdown</Text>
        {items.map((item) => {
          const data = breakdown[item.key];
          if (!data) return null;

          return (
            <View key={item.key} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <View
                  style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}
                >
                  <Ionicons name={item.icon} size={18} color={item.color} />
                </View>
                <View style={styles.breakdownLabelContainer}>
                  <Text style={styles.breakdownLabel}>{item.label}</Text>
                  <Text style={styles.breakdownSublabel}>{item.sublabel}</Text>
                </View>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.breakdownSize}>
                  {data.size || formatBytes(data.sizeBytes)}
                </Text>
                {data.count !== undefined && (
                  <Text style={styles.breakdownCount}>{data.count} items</Text>
                )}
                {data.percentage > 0 && (
                  <Text style={styles.breakdownPercentageRight}>
                    {data.percentage}%
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderOptimizationSuggestions = () => {
    // Show suggestions based on storage status
    if (!storageSummary) return null;

    const suggestions = [];

    if (storageSummary.status.isNearLimit) {
      suggestions.push({
        message: 'You are approaching your storage limit',
        action: 'Consider upgrading your plan for more storage',
        type: 'warning',
      });
    }

    if (storageSummary.status.isOverLimit) {
      suggestions.push({
        message: 'You have exceeded your storage limit',
        action: 'Upgrade your plan or remove some data',
        type: 'error',
      });
    }

    if (suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.sectionTitle}>Recommendations</Text>
        {suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <View style={styles.suggestionContent}>
              <Ionicons
                name={suggestion.type === 'error' ? 'warning' : 'bulb-outline'}
                size={20}
                color={
                  suggestion.type === 'error'
                    ? colors.error.main
                    : colors.warning.main
                }
              />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMessage}>{suggestion.message}</Text>
                <Text style={styles.suggestionSavings}>{suggestion.action}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.upgradeSmallButton}
              onPress={() => safeNavigate(navigation, 'Subscription')}
            >
              <Text style={styles.upgradeSmallButtonText}>Upgrade</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Settings')}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Storage Management</Text>
        <TouchableOpacity
          style={styles.refreshHeaderButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Ionicons
            name="refresh-outline"
            size={24}
            color={refreshing ? colors.text.tertiary : colors.primary.main}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
      >
        {/* Storage Overview */}
        <View style={styles.overviewCard}>
          <View style={styles.overviewHeader}>
            <Text style={styles.overviewTitle}>Cloud Storage Usage</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getStatusText()}</Text>
            </View>
          </View>

          <View style={styles.usageInfo}>
            <Text style={styles.usageText}>
              {storageSummary?.usage.used} of {storageSummary?.usage.quota} used
            </Text>
            <Text style={styles.remainingText}>
              {storageSummary?.usage.remaining} remaining
            </Text>
          </View>

          {renderProgressBar()}

          <View style={styles.planInfo}>
            <Text style={styles.planText}>
              Current Plan: {storageSummary?.planName}
            </Text>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => safeNavigate(navigation, 'Subscription')}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Plan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Storage Breakdown */}
        {renderStorageBreakdown()}

        {/* Optimization Suggestions */}
        {renderOptimizationSuggestions()}

        {/* Last Updated */}
        {storageSummary?.lastCalculated && (
          <View style={styles.lastUpdated}>
            <Text style={styles.lastUpdatedText}>
              Last updated: {new Date(storageSummary.lastCalculated).toLocaleString()}
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  refreshHeaderButton: {
    padding: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  content: {
    flex: 1,
    padding: 20,
  },

  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  overviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  overviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  usageInfo: {
    marginBottom: 15,
  },
  usageText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginBottom: 4,
  },
  remainingText: {
    fontSize: 14,
    color: '#666',
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.gray[200],
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  planInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },
  planText: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: colors.background.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  breakdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownLabelContainer: {
    marginLeft: 12,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  breakdownSublabel: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  breakdownPercentage: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownSize: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  breakdownCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  breakdownPercentageRight: {
    fontSize: 11,
    color: colors.primary.main,
    marginTop: 2,
  },
  suggestionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionText: {
    marginLeft: 12,
    flex: 1,
  },
  suggestionMessage: {
    fontSize: 14,
    color: '#333',
    marginBottom: 2,
  },
  suggestionSavings: {
    fontSize: 12,
    color: '#666',
  },
  cleanupButton: {
    backgroundColor: colors.warning.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cleanupButtonText: {
    color: colors.background.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  upgradeSmallButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upgradeSmallButtonText: {
    color: colors.background.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  lastUpdated: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#999',
  },
});

export default StorageManagementScreen;