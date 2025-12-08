import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import featureService from '../services/FeatureService';
import ResponsiveText from '../components/ResponsiveText';
import { getDeviceInfo } from '../utils/deviceUtils';
import { safeGoBack } from '../utils/navigationUtils';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';

const SubscriptionScreen = ({ navigation }) => {
  const { user, refreshUserData, getUserSubscriptionPlan } = useAuth();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usageStats, setUsageStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const { isTablet } = getDeviceInfo();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Get fresh user data from database
      await refreshUserData();
      
      // Get current subscription plan from database
      const dbPlan = await getUserSubscriptionPlan();
      setCurrentPlan(dbPlan);
      
      // Initialize feature service with real plan
      await featureService.initialize();
      const stats = await featureService.getUsageStats();
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      // Fallback to user data from context
      if (user?.subscription_plan) {
        setCurrentPlan(user.subscription_plan);
      }
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
          onPress: () => {
            // For demo purposes, simulate upgrade
            featureService.upgradePlan(planType);
            setCurrentPlan(planType);
            loadSubscriptionData(); // Refresh data
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
            <View style={styles.limitItemRow}>
              <Ionicons name="cube-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                {planConfig.limits.products === -1 ? 'Unlimited' : planConfig.limits.products} Products
              </Text>
            </View>
            <View style={styles.limitItemRow}>
              <Ionicons name="receipt-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                {planConfig.limits.orders_per_month === -1 ? 'Unlimited' : planConfig.limits.orders_per_month} Orders/month
              </Text>
            </View>
            {planConfig.limits.storage_gb > 0 && (
              <View style={styles.limitItemRow}>
                <Ionicons name="cloud-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.limitItem}>
                  {planConfig.limits.storage_gb}GB Cloud Storage
                </Text>
              </View>
            )}
            <View style={styles.limitItemRow}>
              <Ionicons name="phone-portrait-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                {planConfig.limits.devices === -1 ? 'Unlimited' : planConfig.limits.devices} Device{planConfig.limits.devices !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Key Features */}
          <View style={styles.keyFeatures}>
            <View style={styles.featureItemRow}>
              <Ionicons name="checkmark-circle" size={16} color="#059669" />
              <Text style={styles.featureItem}>Cash Payments</Text>
            </View>
            {planConfig.features.card_payments && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Card Payments</Text>
              </View>
            )}
            {planConfig.features.upi_payments && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>UPI/QR Payments</Text>
              </View>
            )}
            {planConfig.features.sms_detection && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>SMS Payment Detection</Text>
              </View>
            )}
            {planConfig.features.cloud_backup && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Cloud Backup</Text>
              </View>
            )}
            {planConfig.features.multi_device_sync && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Multi-Device Sync</Text>
              </View>
            )}
            {planConfig.features.advanced_analytics && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Advanced Analytics</Text>
              </View>
            )}
            {planConfig.features.custom_branding && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Custom Branding</Text>
              </View>
            )}
            {planConfig.features.api_access && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>API Access</Text>
              </View>
            )}
            {planConfig.features.priority_support && (
              <View style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color="#059669" />
                <Text style={styles.featureItem}>Priority Support</Text>
              </View>
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
              {isUpgrade ? 'Upgrade' : 'Switch Plan'}
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
                      backgroundColor: stat.percentage > 80 ? colors.error.main : 
                                     stat.percentage > 60 ? colors.warning.main : colors.success.main
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

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeGoBack(navigation)}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Plans</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation)}
          activeOpacity={0.7}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Plan Info */}
        <View style={styles.currentPlanInfo}>
          <Text style={styles.currentPlanLabel}>Current Plan</Text>
          <Text style={styles.currentPlanName}>
            {featureService.PLAN_CONFIGS[currentPlan]?.name || 'Free Plan'}
          </Text>
          <Text style={styles.currentPlanPrice}>
            ₹{featureService.PLAN_CONFIGS[currentPlan]?.price || 0}/month
          </Text>
        </View>

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
            <View style={styles.benefitItemRow}>
              <Ionicons name="cash-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Increase sales with digital payments</Text>
            </View>
            <View style={styles.benefitItemRow}>
              <Ionicons name="flash-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Faster checkout with SMS detection</Text>
            </View>
            <View style={styles.benefitItemRow}>
              <Ionicons name="cloud-upload-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Never lose data with cloud backup</Text>
            </View>
            <View style={styles.benefitItemRow}>
              <Ionicons name="stats-chart-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Make better decisions with analytics</Text>
            </View>
            <View style={styles.benefitItemRow}>
              <Ionicons name="sync-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Access from multiple devices</Text>
            </View>
            <View style={styles.benefitItemRow}>
              <Ionicons name="color-palette-outline" size={16} color={colors.text.primary} />
              <Text style={styles.benefitItem}>Customize with your branding</Text>
            </View>
          </View>
        </View>

        {/* Contact Support */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our support team for assistance with plans and billing.
          </Text>
          <TouchableOpacity style={styles.supportButton} activeOpacity={0.8}>
            <Text style={styles.supportButtonText}>Contact Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: colors.text.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  currentPlanInfo: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 18,
    color: '#059669',
    fontWeight: '600',
  },
  usageContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  usageTitle: {
    color: colors.text.primary,
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
    color: colors.text.primary,
  },
  usageNumbers: {
    color: colors.text.secondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border.light,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  warningText: {
    color: colors.error.main,
    marginTop: 4,
  },
  plansContainer: {
    marginBottom: 24,
  },
  plansTitle: {
    color: colors.text.primary,
    marginBottom: 16,
  },
  plansGrid: {
    gap: 16,
  },
  planCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.border.light,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tabletPlanCard: {
    padding: 24,
  },
  currentPlanCard: {
    borderColor: colors.primary.main,
    backgroundColor: '#faf5ff',
  },
  planHeader: {
    marginBottom: 16,
  },
  planName: {
    color: colors.text.primary,
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
    color: colors.text.secondary,
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
    color: colors.background.surface,
    fontSize: 12,
    fontWeight: '600',
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    color: colors.text.primary,
    marginBottom: 8,
  },
  limitsContainer: {
    marginBottom: 12,
  },
  limitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  limitItem: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  keyFeatures: {
    gap: 4,
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  upgradeButtonText: {
    fontWeight: '600',
  },
  upgradeButtonTextPrimary: {
    color: colors.background.surface,
  },
  upgradeButtonTextSecondary: {
    color: colors.text.secondary,
  },
  benefitsContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitsTitle: {
    color: colors.text.primary,
    marginBottom: 16,
  },
  benefitsList: {
    gap: 8,
  },
  benefitItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  benefitItem: {
    fontSize: 14,
    color: colors.text.primary,
    lineHeight: 20,
    flex: 1,
  },
  supportContainer: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  supportButton: {
    backgroundColor: colors.gray[100],
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.medium,
  },
  supportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
});

export default SubscriptionScreen;