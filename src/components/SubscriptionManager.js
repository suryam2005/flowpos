import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import featureService from '../services/FeatureService';
import ResponsiveText from './ResponsiveText';
import { getDeviceInfo } from '../utils/deviceUtils';
import { useSubscription } from '../hooks/useSubscription';

const SubscriptionManager = ({ visible, onClose }) => {
  const { 
    subscriptionPlan: currentPlan, 
    isLoading: planLoading, 
    refreshSubscription 
  } = useSubscription();
  const [usageStats, setUsageStats] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const { isTablet } = getDeviceInfo();

  useEffect(() => {
    if (visible) {
      console.log('📊 [Subscription] Modal opened - loading fresh usage data');
      loadUsageData();
    }
  }, [visible, currentPlan]);

  const loadUsageData = async () => {
    setIsLoading(true);
    try {
      // Initialize feature service with current plan
      await featureService.initialize();
      const stats = await featureService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading usage data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = (planType) => {
    Alert.alert(
      'Upgrade Plan',
      `Upgrade to ${featureService.PLAN_CONFIGS[planType].name} for ₹${featureService.PLAN_CONFIGS[planType].price}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            // For demo purposes, simulate upgrade
            featureService.upgradePlan(planType);
            // Refresh subscription data to update cache
            await refreshSubscription();
            onClose();
          }
        }
      ]
    );
  };

  const renderPlanCard = (planType, planConfig) => {
    const isCurrentPlan = currentPlan === planType;
    const isUpgrade = getPlanLevel(planType) > getPlanLevel(currentPlan);

    return (
      <View
        key={planType}
        style={[
          styles.planCard,
          isTablet && styles.tabletPlanCard,
          isCurrentPlan && styles.currentPlanCard
        ]}
      >
        <View style={styles.planHeader}>
          <ResponsiveText variant="subtitle" style={styles.planName}>
            {planConfig.name}
          </ResponsiveText>
          <View style={styles.priceContainer}>
            <ResponsiveText variant="title" style={styles.planPrice}>
              ₹{planConfig.price}
            </ResponsiveText>
            <ResponsiveText variant="caption" style={styles.priceUnit}>
              /month
            </ResponsiveText>
          </View>
        </View>

        {isCurrentPlan && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentBadgeText}>Current Plan</Text>
          </View>
        )}

        <View style={styles.featuresContainer}>
          <ResponsiveText variant="caption" style={styles.featuresTitle}>
            Features:
          </ResponsiveText>
          
          {/* Limits */}
          <View style={styles.limitsContainer}>
            <Text style={styles.limitItem}>
              📦 {planConfig.limits.products === -1 ? 'Unlimited' : planConfig.limits.products} Products
            </Text>
            <Text style={styles.limitItem}>
              📋 {planConfig.limits.orders_per_month === -1 ? 'Unlimited' : planConfig.limits.orders_per_month} Orders/month
            </Text>
            {planConfig.limits.storage_gb > 0 && (
              <Text style={styles.limitItem}>
                ☁️ {planConfig.limits.storage_gb}GB Cloud Storage
              </Text>
            )}
          </View>

          {/* Key Features */}
          <View style={styles.keyFeatures}>
            {planConfig.features.upi_payments && (
              <Text style={styles.featureItem}>✅ UPI/QR Payments</Text>
            )}
            {planConfig.features.sms_detection && (
              <Text style={styles.featureItem}>✅ SMS Payment Detection</Text>
            )}
            {planConfig.features.cloud_backup && (
              <Text style={styles.featureItem}>✅ Cloud Backup</Text>
            )}
            {planConfig.features.multi_device_sync && (
              <Text style={styles.featureItem}>✅ Multi-Device Sync</Text>
            )}
            {planConfig.features.advanced_analytics && (
              <Text style={styles.featureItem}>✅ Advanced Analytics</Text>
            )}
            {planConfig.features.custom_branding && (
              <Text style={styles.featureItem}>✅ Custom Branding</Text>
            )}
            {planConfig.features.priority_support && (
              <Text style={styles.featureItem}>✅ Priority Support</Text>
            )}
          </View>
        </View>

        {!isCurrentPlan && (
          <TouchableOpacity
            style={[
              styles.upgradeButton,
              isUpgrade ? styles.upgradeButtonPrimary : styles.upgradeButtonSecondary
            ]}
            onPress={() => handleUpgrade(planType)}
            activeOpacity={0.8}
          >
            <ResponsiveText variant="button" style={[
              styles.upgradeButtonText,
              isUpgrade ? styles.upgradeButtonTextPrimary : styles.upgradeButtonTextSecondary
            ]}>
              {isUpgrade ? 'Upgrade' : 'Downgrade'}
            </ResponsiveText>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderUsageStats = () => {
    return (
      <View style={styles.usageContainer}>
        <ResponsiveText variant="subtitle" style={styles.usageTitle}>
          Current Usage
        </ResponsiveText>
        
        {Object.entries(usageStats).map(([key, stat]) => {
          if (key === 'devices' || key === 'storage_gb') return null; // Skip for now
          
          const displayName = {
            products: 'Products',
            orders_per_month: 'Orders This Month'
          }[key] || key;

          return (
            <View key={key} style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <ResponsiveText variant="body" style={styles.usageName}>
                  {displayName}
                </ResponsiveText>
                <ResponsiveText variant="caption" style={styles.usageNumbers}>
                  {stat.current} / {stat.unlimited ? '∞' : stat.limit}
                </ResponsiveText>
              </View>
              
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { 
                      width: `${Math.min(stat.percentage, 100)}%`,
                      backgroundColor: stat.percentage > 80 ? '#ef4444' : 
                                     stat.percentage > 60 ? '#f59e0b' : '#10b981'
                    }
                  ]}
                />
              </View>
              
              {stat.percentage > 80 && !stat.unlimited && (
                <ResponsiveText variant="small" style={styles.warningText}>
                  ⚠️ Approaching limit
                </ResponsiveText>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  const getPlanLevel = (planType) => {
    const levels = { free: 0, starter: 1, business: 2, enterprise: 3 };
    return levels[planType] || 0;
  };

  if (!visible) return null;

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, isTablet && styles.tabletModalContainer]}>
          <View style={styles.modalHeader}>
            <ResponsiveText variant="title" style={styles.modalTitle}>
              Subscription Plans
            </ResponsiveText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Current Usage */}
            {renderUsageStats()}

            {/* Plans */}
            <View style={styles.plansContainer}>
              <ResponsiveText variant="subtitle" style={styles.plansTitle}>
                Available Plans
              </ResponsiveText>
              
              <View style={styles.plansGrid}>
                {Object.entries(featureService.PLAN_CONFIGS).map(([planType, planConfig]) =>
                  renderPlanCard(planType, planConfig)
                )}
              </View>
            </View>

            {/* Benefits */}
            <View style={styles.benefitsContainer}>
              <ResponsiveText variant="subtitle" style={styles.benefitsTitle}>
                Why Upgrade?
              </ResponsiveText>
              
              <View style={styles.benefitsList}>
                <Text style={styles.benefitItem}>
                  💰 Increase sales with digital payments
                </Text>
                <Text style={styles.benefitItem}>
                  ⚡ Faster checkout with SMS detection
                </Text>
                <Text style={styles.benefitItem}>
                  ☁️ Never lose data with cloud backup
                </Text>
                <Text style={styles.benefitItem}>
                  📊 Make better decisions with analytics
                </Text>
                <Text style={styles.benefitItem}>
                  🔄 Access from multiple devices
                </Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 400,
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
  },
  tabletModalContainer: {
    maxWidth: 800,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  usageContainer: {
    marginBottom: 24,
  },
  usageTitle: {
    color: '#1f2937',
    marginBottom: 16,
  },
  usageItem: {
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  usageName: {
    color: '#374151',
  },
  usageNumbers: {
    color: '#6b7280',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: {
    color: '#ef4444',
    marginTop: 4,
  },
  plansContainer: {
    marginBottom: 24,
  },
  plansTitle: {
    color: '#1f2937',
    marginBottom: 16,
  },
  plansGrid: {
    gap: 16,
  },
  planCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  tabletPlanCard: {
    padding: 24,
  },
  currentPlanCard: {
    borderColor: colors.primary.main,
    backgroundColor: '#f3f4f6',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    color: '#1f2937',
    marginBottom: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: '#059669',
    marginRight: 4,
  },
  priceUnit: {
    color: '#6b7280',
  },
  currentBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.primary.main,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: '#374151',
    marginBottom: 8,
  },
  limitsContainer: {
    marginBottom: 12,
  },
  limitItem: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  keyFeatures: {
    gap: 4,
  },
  featureItem: {
    fontSize: 14,
    color: '#059669',
  },
  upgradeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonPrimary: {
    backgroundColor: colors.primary.main,
  },
  upgradeButtonSecondary: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  upgradeButtonText: {
    fontWeight: '600',
  },
  upgradeButtonTextPrimary: {
    color: '#ffffff',
  },
  upgradeButtonTextSecondary: {
    color: '#6b7280',
  },
  benefitsContainer: {
    marginBottom: 20,
  },
  benefitsTitle: {
    color: '#1f2937',
    marginBottom: 16,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
});

export default SubscriptionManager;