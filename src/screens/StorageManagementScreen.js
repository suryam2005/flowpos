import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import CloudStorageService from '../services/CloudStorageService';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/SVGIcons';
import { colors } from '../styles/colors';

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
      const summary = await CloudStorageService.getStorageSummary(currentPlan || 'trial');
      setStorageSummary(summary);
    } catch (error) {
      console.error('Error loading storage data:', error);
      Alert.alert('Error', 'Failed to load storage information');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await CloudStorageService.calculateStorageUsage(); // Force recalculation
    await loadStorageData();
    setRefreshing(false);
  };

  const handleCleanup = async (type) => {
    Alert.alert(
      'Confirm Cleanup',
      `Are you sure you want to clean up old ${type}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Up',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await CloudStorageService.cleanupOldData(type, 30);
              if (result.success) {
                Alert.alert(
                  'Cleanup Complete',
                  `Freed up ${result.freedMB} MB of storage space.`
                );
                await loadStorageData(); // Refresh data
              } else {
                Alert.alert('Error', 'Failed to clean up data');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to clean up data');
            }
          }
        }
      ]
    );
  };

  const getStatusColor = () => {
    if (!storageSummary) return '#4CAF50';
    if (storageSummary.status.isOverLimit) return '#F44336';
    if (storageSummary.status.isNearLimit) return '#FF9800';
    return '#4CAF50';
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
    const items = [
      { key: 'products', label: 'Products', icon: 'cube-outline' },
      { key: 'orders', label: 'Orders', icon: 'receipt-outline' },
      { key: 'storeInfo', label: 'Store Info', icon: 'storefront-outline' },
      { key: 'invoices', label: 'Invoices', icon: 'document-text-outline' },
      { key: 'reports', label: 'Reports', icon: 'analytics-outline' },
      { key: 'exports', label: 'Exports', icon: 'download-outline' }
    ];

    return (
      <View style={styles.breakdownContainer}>
        <Text style={styles.sectionTitle}>Storage Breakdown</Text>
        {items.map(item => {
          const data = breakdown[item.key];
          if (!data) return null;

          return (
            <View key={item.key} style={styles.breakdownItem}>
              <View style={styles.breakdownLeft}>
                <Icon name={item.icon} size={20} color={colors.text.secondary} />
                <Text style={styles.breakdownLabel}>{item.label}</Text>
              </View>
              <View style={styles.breakdownRight}>
                <Text style={styles.breakdownSize}>
                  {CloudStorageService.formatBytes(data.size)}
                </Text>
                {data.count && (
                  <Text style={styles.breakdownCount}>
                    {data.count} items
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
    if (!storageSummary?.suggestions?.length) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.sectionTitle}>Optimization Suggestions</Text>
        {storageSummary.suggestions.map((suggestion, index) => (
          <View key={index} style={styles.suggestionItem}>
            <View style={styles.suggestionContent}>
              <Ionicons name="bulb-outline" size={20} color="#FF9800" />
              <View style={styles.suggestionText}>
                <Text style={styles.suggestionMessage}>{suggestion.message}</Text>
                <Text style={styles.suggestionSavings}>
                  Potential savings: {suggestion.potentialSavings}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.cleanupButton}
              onPress={() => handleCleanup(suggestion.type)}
            >
              <Text style={styles.cleanupButtonText}>Clean Up</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Storage Management</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text>Loading storage information...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Storage Management</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Ionicons name="refresh" size={24} color={colors.primary.main} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
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
              onPress={() => navigation.navigate('Subscription')}
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    backgroundColor: '#e0e0e0',
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
    borderTopColor: '#e0e0e0',
  },
  planText: {
    fontSize: 14,
    color: '#666',
  },
  upgradeButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  upgradeButtonText: {
    color: '#fff',
    fontSize: 12,
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
    borderBottomColor: '#f0f0f0',
  },
  breakdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#333',
    marginLeft: 12,
  },
  breakdownRight: {
    alignItems: 'flex-end',
  },
  breakdownSize: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  breakdownCount: {
    fontSize: 12,
    color: '#666',
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
    borderBottomColor: '#f0f0f0',
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
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  cleanupButtonText: {
    color: '#fff',
    fontSize: 12,
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