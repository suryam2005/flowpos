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
import CloudStorageService from '../services/CloudStorageService';
import ResponsiveText from '../components/ResponsiveText';
import { getDeviceInfo } from '../utils/deviceUtils';
import { safeGoBack } from '../utils/navigationUtils';
import { colors } from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { useSubscriptionContext } from '../context/SubscriptionContext';
import { apiCallWithFallback } from '../config/apiConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoadingSpinner from '../components/LoadingSpinner';

const SubscriptionScreen = ({ navigation }) => {
  const { user, getUserSubscriptionPlan, updateUserData } = useAuth();
  const { updateSubscriptionCache, refreshSubscription } = useSubscriptionContext();
  const [currentPlan, setCurrentPlan] = useState('free');
  const [usageStats, setUsageStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState({});
  const [trialInfo, setTrialInfo] = useState({ daysRemaining: 0, isExpired: false });
  const { isTablet } = getDeviceInfo();

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Get current subscription plan from cached user data first
      // Only refresh from database if needed (e.g., user explicitly requested)
      const dbPlan = await getUserSubscriptionPlan(false); // Use cached data
      setCurrentPlan(dbPlan);
      
      // Calculate trial days remaining if on trial
      if (dbPlan === 'trial' && user?.subscription_started_at) {
        const startDate = new Date(user.subscription_started_at);
        const now = new Date();
        const trialEndDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const remainingMs = trialEndDate.getTime() - now.getTime();
        const daysRemaining = Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000)));
        setTrialInfo({
          daysRemaining,
          isExpired: daysRemaining <= 0
        });
      }
      
      // Initialize feature service with real plan
      await featureService.initialize();
      const stats = await featureService.getUsageStats();
      
      // Get cloud storage usage
      const storageUsage = await CloudStorageService.getStorageUsage();
      const quotaStatus = await CloudStorageService.checkQuotaStatus(dbPlan);
      
      // Add storage info to usage stats
      stats.cloud_storage = {
        current: quotaStatus.usedMB.toFixed(1),
        limit: quotaStatus.quotaMB.toFixed(1),
        unlimited: false,
        percentage: quotaStatus.usedPercentage.toFixed(1)
      };
      
      setUsageStats(stats);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      
      // Handle token expiration
      if (error.message.includes('Session expired') || 
          error.message.includes('Invalid or expired token') ||
          error.message.includes('Authentication expired')) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please login again.',
          [
            {
              text: 'Login',
              onPress: () => {
                // Navigate to login screen
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Welcome' }],
                });
              }
            }
          ]
        );
        return;
      }
      
      // Fallback to user data from context for other errors
      if (user?.subscription_plan) {
        setCurrentPlan(user.subscription_plan);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = (planType) => {
    // Don't allow downgrade to expired_trial
    if (planType === 'expired_trial') return;
    
    const planConfig = featureService.PLAN_CONFIGS[planType];
    if (!planConfig) return;

    Alert.alert(
      'Upgrade Plan',
      `Upgrade to ${planConfig.name} for ₹${planConfig.price}/month?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Upgrade Now',
          onPress: async () => {
            await performUpgrade(planType);
          }
        }
      ]
    );
  };

  const performUpgrade = async (planType) => {
    setIsUpgrading(true);
    try {
      const token = await AsyncStorage.getItem('accessToken');
      console.log('🔄 Upgrade attempt:', { planType, hasToken: !!token });
      
      if (!token) {
        Alert.alert('Error', 'Please login again to upgrade your plan.');
        setIsUpgrading(false);
        return;
      }

      // Call backend to upgrade subscription
      console.log('📡 Calling upgrade API...');
      const response = await apiCallWithFallback('/subscription/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: planType })
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📡 Response data:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to upgrade subscription');
      }

      // Update local caches
      // 1. Update SubscriptionContext cache
      if (data.subscription) {
        await updateSubscriptionCache(data.subscription);
      }

      // 2. Update user data in AuthContext
      const updatedUserData = {
        ...user,
        subscription_plan: planType,
        subscription_status: 'active'
      };
      await AsyncStorage.setItem('userData', JSON.stringify(updatedUserData));
      if (updateUserData) {
        updateUserData(updatedUserData);
      }

      // 3. Update FeatureService
      await featureService.upgradePlan(planType);

      // Update local state
      setCurrentPlan(planType);

      Alert.alert(
        'Success! 🎉',
        `You've been upgraded to ${featureService.PLAN_CONFIGS[planType].name}. Enjoy your new features!`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('❌ Upgrade error:', error);
      Alert.alert(
        'Upgrade Failed',
        error.message || 'Failed to upgrade subscription. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUpgrading(false);
    }
  };

  const getFeaturesToDisplay = (planType, planConfig) => {
    const allFeatures = [];
    
    // Always show UPI & Cash payments
    allFeatures.push('UPI & Cash payment support');
    allFeatures.push('Basic invoice');
    allFeatures.push('Basic daily analytics');
    allFeatures.push('Cloud backup');
    
    // Add cloud storage information based on plan
    if (planConfig.limits.storage_gb) {
      allFeatures.push(`${planConfig.limits.storage_gb} GB cloud storage`);
    } else if (planConfig.limits.storage_mb) {
      allFeatures.push(`${planConfig.limits.storage_mb} MB cloud storage`);
    }
    
    // SMS payment detection - Starter+
    if (planConfig.features.sms_detection) {
      allFeatures.push('SMS payment detection');
    }
    
    // Daily & weekly analytics - Starter+
    if (planConfig.features.daily_weekly_analytics) {
      allFeatures.push('Daily & weekly analytics');
    }
    
    // Customizable invoice - Growth+
    if (planConfig.features.customizable_invoice) {
      allFeatures.push('Customizable invoice');
    }
    
    // Advanced analytics - Growth+
    if (planConfig.features.advanced_analytics) {
      allFeatures.push('Advanced analytics');
    }
    
    // WhatsApp integration - Growth+
    if (planConfig.features.whatsapp_integration) {
      allFeatures.push('WhatsApp integration');
    }
    
    // Email delivery - Growth+
    if (planConfig.features.email_delivery) {
      allFeatures.push('Monthly email invoice delivery');
    }
    
    // Performance insights - Enterprise
    if (planConfig.features.performance_insights) {
      allFeatures.push('Performance insights with graphs & detailed analytics');
    }
    
    // PDF reports - Enterprise
    if (planConfig.features.pdf_reports) {
      allFeatures.push('Detailed PDF performance reports');
    }
    
    // Monthly reports - Enterprise
    if (planConfig.features.monthly_reports) {
      allFeatures.push('Monthly email invoices + analytics reports');
    }
    
    // CSV & PDF export - Enterprise
    if (planConfig.features.csv_pdf_export) {
      allFeatures.push('Data export in CSV & PDF format');
    }
    
    // Custom branding - Enterprise
    if (planConfig.features.custom_branding) {
      allFeatures.push('Custom branding');
    }
    

    
    return allFeatures;
  };

  const renderPlanCard = (planType, planConfig) => {
    const isCurrentPlan = currentPlan === planType;
    const isUpgrade = getPlanLevel(planType) > getPlanLevel(currentPlan);
    const allFeatures = getFeaturesToDisplay(planType, planConfig);
    const showAll = showAllFeatures[planType] || false;
    const maxFeaturesToShow = 6;
    const featuresToDisplay = showAll ? allFeatures : allFeatures.slice(0, maxFeaturesToShow);
    const hasMoreFeatures = allFeatures.length > maxFeaturesToShow;

    return (
      <View
        key={planType}
        style={[
          styles.planCard,
          isTablet && styles.tabletPlanCard,
          isCurrentPlan && styles.currentPlanCard,
          !isCurrentPlan && styles.inactivePlanCard
        ]}
      >
        <View style={styles.planHeader}>
          <View style={styles.planTitleRow}>
            <ResponsiveText variant="subtitle" style={[
              styles.planName,
              isCurrentPlan && styles.planNameActive
            ]}>
              {planConfig.name}
            </ResponsiveText>
            {isCurrentPlan && (
              <View style={styles.activeBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
                <Text style={styles.activeBadgeText}>ACTIVE</Text>
              </View>
            )}
          </View>
          <View style={styles.priceContainer}>
            <ResponsiveText variant="title" style={[
              styles.planPrice,
              isCurrentPlan && styles.planPriceActive
            ]}>
              ₹{planConfig.price}
            </ResponsiveText>
            <ResponsiveText variant="caption" style={styles.priceUnit}>
              {planConfig.price === 0 ? '' : '/month'}
            </ResponsiveText>
          </View>
        </View>

        <View style={styles.featuresContainer}>
          <ResponsiveText variant="caption" style={styles.featuresTitle}>
            Features:
          </ResponsiveText>
          
          {/* Limits */}
          <View style={styles.limitsContainer}>
            <View style={styles.limitItemRow}>
              <Ionicons name="cube-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                Add up to {planConfig.limits.products === -1 ? 'unlimited' : planConfig.limits.products} products
              </Text>
            </View>
            <View style={styles.limitItemRow}>
              <Ionicons name="receipt-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                Manage up to {planConfig.limits.orders_per_month === -1 ? 'unlimited' : planConfig.limits.orders_per_month} orders per month
              </Text>
            </View>
            <View style={styles.limitItemRow}>
              <Ionicons name="people-outline" size={16} color={colors.text.secondary} />
              <Text style={styles.limitItem}>
                {planConfig.limits.devices === 1 ? 'Single user access' : 
                 planConfig.limits.devices === 3 ? '3 user logins' :
                 planConfig.limits.devices === 10 ? 'Up to 10 user logins' : 
                 `${planConfig.limits.devices} user${planConfig.limits.devices !== 1 ? 's' : ''}`}
              </Text>
            </View>
            {(planConfig.limits.storage_gb > 0 || planConfig.limits.storage_mb > 0) && (
              <View style={styles.limitItemRow}>
                <Ionicons name="cloud-outline" size={16} color={colors.text.secondary} />
                <Text style={styles.limitItem}>
                  {planConfig.limits.storage_gb ? 
                    `${planConfig.limits.storage_gb} GB cloud backup` : 
                    `${planConfig.limits.storage_mb} MB cloud backup`}
                </Text>
              </View>
            )}
          </View>

          {/* Key Features */}
          <View style={styles.keyFeatures}>
            {featuresToDisplay.map((feature, index) => (
              <View key={index} style={styles.featureItemRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success.main} />
                <Text style={styles.featureItem}>{feature}</Text>
              </View>
            ))}
            
            {/* See more/less button for plans with many features */}
            {hasMoreFeatures && (
              <TouchableOpacity
                style={styles.seeMoreButton}
                onPress={() => {
                  setShowAllFeatures(prev => ({
                    ...prev,
                    [planType]: !showAll
                  }));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.seeMoreText}>
                  {showAll ? 'See less' : `See ${allFeatures.length - maxFeaturesToShow} more features`}
                </Text>
                <Ionicons 
                  name={showAll ? 'chevron-up' : 'chevron-down'} 
                  size={16} 
                  color={colors.primary.main} 
                />
              </TouchableOpacity>
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
          // Skip certain keys or show them with proper labels
          if (key === 'devices') return null; // Skip devices for now
          if (key === 'storage_gb' || key === 'storage_mb') return null; // Skip original storage keys, use cloud_storage instead
          
          const displayName = {
            products: 'Products Added',
            orders_per_month: 'Monthly Orders',
            cloud_storage: 'Cloud Storage',
            trial_days: 'Trial Period'
          }[key] || key;

          return (
            <View key={key} style={styles.usageItem}>
              <View style={styles.usageHeader}>
                <ResponsiveText variant="body" style={styles.usageName}>
                  {displayName}
                </ResponsiveText>
                <ResponsiveText variant="caption" style={styles.usageNumbers}>
                  {key === 'cloud_storage'
                    ? `${stat.current} / ${stat.unlimited ? '∞' : stat.limit} MB (${stat.percentage}%)`
                    : key === 'trial_days'
                    ? `${stat.current} / ${stat.unlimited ? '∞' : stat.limit} days`
                    : `${stat.current} / ${stat.unlimited ? '∞' : stat.limit}`
                  }
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
    const levels = { trial: 0, starter: 1, growth: 2, enterprise: 3 };
    return levels[planType] || 0;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Main', { screen: 'Manage' })}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription Plans</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Current Plan Info */}
        <View style={styles.currentPlanInfo}>
          <View style={styles.currentPlanHeader}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success.main} />
            <Text style={styles.currentPlanLabel}>Your Active Plan</Text>
          </View>
          <Text style={styles.currentPlanName}>
            {featureService.PLAN_CONFIGS[currentPlan]?.name || 'Trial Plan'}
          </Text>
          <Text style={styles.currentPlanPrice}>
            {currentPlan === 'trial' 
              ? 'Free for 7 days' 
              : `₹${featureService.PLAN_CONFIGS[currentPlan]?.price || 0}/month`
            }
          </Text>
          {currentPlan === 'trial' && (
            <View style={styles.trialInfoContainer}>
              {trialInfo.isExpired ? (
                <View style={styles.trialExpiredBadge}>
                  <Ionicons name="warning" size={16} color={colors.error.main} />
                  <Text style={styles.trialExpiredText}>Trial Expired - Upgrade to continue</Text>
                </View>
              ) : (
                <View style={styles.trialDaysBadge}>
                  <Ionicons name="time-outline" size={16} color={colors.warning.main} />
                  <Text style={styles.trialDaysText}>
                    {trialInfo.daysRemaining} day{trialInfo.daysRemaining !== 1 ? 's' : ''} remaining
                  </Text>
                </View>
              )}
              <Text style={styles.trialFeatureText}>
                🎉 All features unlocked during trial!
              </Text>
            </View>
          )}
        </View>

        {/* Current Usage */}
        {renderUsageStats()}

        {/* Plans */}
        <View style={styles.plansContainer}>
          <ResponsiveText variant="subtitle" style={styles.plansTitle}>
            Available Plans
          </ResponsiveText>
          
          <View style={styles.plansGrid}>
            {Object.entries(featureService.PLAN_CONFIGS)
              .filter(([planType]) => planType !== 'expired_trial') // Don't show expired_trial in list
              .map(([planType, planConfig]) =>
                renderPlanCard(planType, planConfig)
              )}
          </View>
        </View>

        {/* Upgrading Overlay */}
        {isUpgrading && (
          <View style={styles.upgradingOverlay}>
            <LoadingSpinner />
            <Text style={styles.upgradingText}>Upgrading your plan...</Text>
          </View>
        )}

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
    padding: 8,
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
    borderWidth: 2,
    borderColor: colors.success.border,
  },
  currentPlanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  currentPlanLabel: {
    fontSize: 14,
    color: colors.success.main,
    fontWeight: '600',
  },
  currentPlanName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentPlanPrice: {
    fontSize: 18,
    color: colors.success.main,
    fontWeight: '600',
  },
  trialExpiryText: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 4,
    textAlign: 'center',
  },
  trialInfoContainer: {
    marginTop: 12,
    alignItems: 'center',
    gap: 8,
  },
  trialDaysBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  trialDaysText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.warning.main,
  },
  trialExpiredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.error.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  trialExpiredText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.error.main,
  },
  trialFeatureText: {
    fontSize: 12,
    color: colors.success.main,
    fontWeight: '500',
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
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 4,
  },
  tabletPlanCard: {
    padding: 24,
  },
  currentPlanCard: {
    borderWidth: 3,
    borderColor: colors.primary.main,
    backgroundColor: colors.background.surface,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  inactivePlanCard: {
    backgroundColor: colors.background.surface,
    borderColor: colors.border.light,
  },
  planHeader: {
    marginBottom: 16,
  },
  planTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planName: {
    color: colors.text.primary,
    flex: 1,
    fontWeight: '600',
  },
  planNameActive: {
    color: colors.primary.main,
    fontWeight: '700',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.success.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success.main,
    letterSpacing: 0.5,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: colors.success.main,
    marginRight: 4,
    fontWeight: '700',
  },
  planPriceActive: {
    color: colors.primary.main,
    fontWeight: '800',
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
    color: colors.success.main,
  },
  upgradeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  upgradeButtonPrimary: {
    backgroundColor: colors.primary.main,
  },
  upgradeButtonSecondary: {
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  upgradeButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  upgradeButtonTextPrimary: {
    color: colors.background.surface,
  },
  upgradeButtonTextSecondary: {
    color: colors.primary.main,
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
  seeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    gap: 4,
  },
  seeMoreText: {
    fontSize: 14,
    color: colors.primary.main,
    fontWeight: '500',
  },
  upgradingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  upgradingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
});

export default SubscriptionScreen;