import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import ordersService from '../services/OrdersService';
import productsService from '../services/ProductsService';
import featureService from '../services/FeatureService';
import useFeatureFlags from '../hooks/useFeatureFlags';
// TOUR TEMPORARILY DISABLED
// import tourProgressManager from '../services/TourProgressManager';
// Phase B Implementation: Add UIUpdatePropagator for receiving order updates
import uiUpdatePropagator from '../services/UIUpdatePropagator';
// Phase C Implementation: Add ComputationCache for analytics caching
import computationCache from '../services/ComputationCache';

import LoadingSpinner from '../components/LoadingSpinner';
// TOUR TEMPORARILY DISABLED
// import SimpleTourOverlay from '../components/SimpleTourOverlay';
// import useSimpleTour from '../hooks/useSimpleTour';
// import { getSimpleTourSteps } from '../config/simpleTourContent';
import { colors } from '../styles/colors';
import { getProductImageUrl } from '../utils/imageUtils';
import { analyticsStyles, spacing } from '../styles/analyticsStyles';

// Import rebuilt chart components
import { BarChart, LineChart, DonutChart, PieChart, ChartCard, NoDataChart } from '../components/ChartComponents';

// Helper functions for chart data generation
const generateDailyRevenueData = (orders) => {
  const last7Days = [];
  const today = new Date();

  // FIXED: Add safety checks for orders array
  if (!orders || !Array.isArray(orders)) {
    console.warn('📊 [Analytics] generateDailyRevenueData: Invalid orders data');
    // Return empty data for 7 days
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      last7Days.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: date.toISOString().split('T')[0],
        revenue: 0,
        orders: 0,
      });
    }
    return last7Days;
  }

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayOrders = orders.filter(order => {
      if (!order) return false;
      const timestamp = order.timestamp || order.createdAt;
      if (!timestamp) return false;

      try {
        const orderDateStr = typeof timestamp === 'string'
          ? timestamp.split('T')[0]
          : new Date(timestamp).toISOString().split('T')[0];
        return orderDateStr === dateStr;
      } catch (error) {
        console.warn('📊 [Analytics] Error processing order date:', error);
        return false;
      }
    });

    const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    last7Days.push({
      day: date.toLocaleDateString('en', { weekday: 'short' }),
      date: dateStr,
      revenue: dayRevenue,
      orders: dayOrders.length,
    });
  }

  return last7Days;
};

const generateWeeklyRevenueData = (orders) => {
  const last4Weeks = [];
  const today = new Date();

  // FIXED: Add safety checks for orders array
  if (!orders || !Array.isArray(orders)) {
    console.warn('📊 [Analytics] generateWeeklyRevenueData: Invalid orders data');
    // Return empty data for 4 weeks
    for (let i = 3; i >= 0; i--) {
      last4Weeks.push({
        week: `Week ${4 - i}`,
        startDate: new Date().toLocaleDateString(),
        revenue: 0,
        orders: 0,
      });
    }
    return last4Weeks;
  }

  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const weekOrders = orders.filter(order => {
      if (!order || !order.timestamp) return false;

      try {
        const orderDate = new Date(order.timestamp);
        return orderDate >= weekStart && orderDate <= weekEnd;
      } catch (error) {
        console.warn('📊 [Analytics] Error processing order timestamp:', error);
        return false;
      }
    });

    const weekRevenue = weekOrders.reduce((sum, order) => sum + (order.total || 0), 0);

    last4Weeks.push({
      week: `Week ${4 - i}`,
      startDate: weekStart.toLocaleDateString(),
      revenue: weekRevenue,
      orders: weekOrders.length,
    });
  }

  return last4Weeks;
};

const generateOrderTrendsData = (orders) => {
  const hourlyData = Array(24).fill(0);

  // FIXED: Add safety checks for orders array
  if (!orders || !Array.isArray(orders)) {
    console.warn('📊 [Analytics] generateOrderTrendsData: Invalid orders data');
    return hourlyData.map((count, hour) => ({
      hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
      orders: 0,
    }));
  }

  orders.forEach(order => {
    if (order && order.timestamp) {
      try {
        const hour = new Date(order.timestamp).getHours();
        if (hour >= 0 && hour < 24) {
          hourlyData[hour]++;
        }
      } catch (error) {
        console.warn('📊 [Analytics] Error processing order timestamp:', error);
      }
    }
  });

  return hourlyData.map((count, hour) => ({
    hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
    orders: count,
  }));
};

// Calculate analytics for different time periods
const calculatePeriodAnalytics = (orders, period) => {
  let startDate, endDate;

  switch (period) {
    case 'today':
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      break;
    case 'month':
      endDate = new Date();
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date();
      endDate.setHours(23, 59, 59, 999);
  }

  console.log('📊 [Analytics] Period filter:', period, 'from', startDate.toISOString(), 'to', endDate.toISOString());

  const periodOrders = orders.filter(order => {
    // Handle multiple date field formats from backend
    let orderDate;
    if (order.timestamp) {
      // If timestamp is a number (Unix timestamp), convert to Date
      orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
    } else if (order.createdAt) {
      orderDate = new Date(order.createdAt);
    } else if (order.created_at) {
      orderDate = new Date(order.created_at);
    } else {
      return false; // Skip orders without date
    }

    // Validate date
    if (isNaN(orderDate.getTime())) {
      console.warn('📊 Invalid date in order:', order.id, order.timestamp, order.createdAt);
      return false;
    }

    const isInRange = orderDate >= startDate && orderDate <= endDate;
    return isInRange;
  });

  console.log('📊 [Analytics] Filtered', periodOrders.length, 'orders out of', orders.length, 'for period:', period);

  const revenue = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const orderCount = periodOrders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

  return {
    revenue,
    orderCount,
    avgOrderValue,
    orders: periodOrders
  };
};

const AnalyticsScreen = ({ navigation, route }) => {
  // Phase C Implementation: Use feature flag caching
  const featureFlags = useFeatureFlags();

  // Tab state for 3-tab structure
  const [activeTab, setActiveTab] = useState('revenue'); // revenue, orders, products

  // Data states
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState({
    // Revenue metrics
    todayRevenue: 0,
    weekRevenue: 0,
    monthRevenue: 0,
    totalRevenue: 0,

    // Order metrics
    todayOrders: 0,
    weekOrders: 0,
    monthOrders: 0,
    totalOrders: 0,
    avgOrderValue: 0,

    // Product metrics
    totalProducts: 0,
    popularProducts: [],
    topCategories: [],
  });

  // Chart data states
  const [chartData, setChartData] = useState({
    revenueChart: [],
    orderTrends: [],
    topProducts: [],
  });

  // UI states
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Phase C Implementation: Cache feature flag evaluation results
  const [canUseAdvancedAnalytics, setCanUseAdvancedAnalytics] = useState(false);

  // TOUR TEMPORARILY DISABLED
  // Simple tour implementation
  // const tourSteps = getSimpleTourSteps('Analytics');
  // const {
  //   showTour,
  //   currentStep,
  //   stepIndex,
  //   totalSteps,
  //   nextStep,
  //   skipTour,
  //   completeTour,
  // } = useSimpleTour('Analytics', tourSteps);

  // Remove complex tour refs - simple tour doesn't need them

  // No animations needed

  useEffect(() => {
    // Initialize feature service and load analytics
    const init = async () => {
      await featureService.initialize();
      loadAnalytics();
    };
    init();

    // Phase B Implementation: Register with UIUpdatePropagator for order updates
    console.log('📊 [AnalyticsScreen] Registering with UIUpdatePropagator');

    // Register for UI updates with callback that handles different update types
    const handleUIUpdate = (updateType, updateData) => {
      console.log('📊 [AnalyticsScreen] Received UI update:', { updateType, hasData: !!updateData });

      if (updateType === 'ORDER_SUCCESS') {
        // Order was created successfully - refresh analytics to show updated data
        // This will generate a new orders hash and trigger cache miss, ensuring fresh computation
        console.log('📊 [AnalyticsScreen] Order success - refreshing analytics');
        loadAnalytics(); // Refresh analytics data (cache will miss due to changed orders)
      }
    };

    uiUpdatePropagator.registerScreen('AnalyticsScreen', handleUIUpdate);

    // Cleanup: Unregister from UIUpdatePropagator
    return () => {
      console.log('📊 [AnalyticsScreen] Unregistering from UIUpdatePropagator');
      uiUpdatePropagator.unregisterScreen('AnalyticsScreen');

      // Phase C Implementation: Clear analytics cache on component unmount
      // This ensures cache is cleared when user navigates away or logs out
      console.log('📊 [AnalyticsScreen] Clearing analytics cache on unmount');
      computationCache.clearAnalytics();
    };
  }, []);

  // Use FocusEffect to ensure feature flags are re-evaluated when screen is focused
  useFocusEffect(
    useCallback(() => {
      // Phase C Implementation: Evaluate feature flags once per render cycle
      const evaluateFeatureFlags = async () => {
        try {
          // Force check against service to ensure we get latest plan update
          const canUseAdvanced = featureService.canUseFeature('advanced_analytics');
          setCanUseAdvancedAnalytics(canUseAdvanced);
        } catch (error) {
          console.error('📊 [AnalyticsScreen] Error evaluating feature flags:', error);
          setCanUseAdvancedAnalytics(false);
        }
      };
      evaluateFeatureFlags();
    }, [])
  );

  // Simple tour doesn't need auto-start functionality - removed checkAutoStart

  // TOUR TEMPORARILY DISABLED
  // Handle tour trigger from route params (startTour or continueTour)
  // useEffect(() => {
  //   if (route?.params?.startTour) {
  //     console.log('🎯 [AnalyticsScreen] Tour trigger received from route params (startTour)');
  //     setTimeout(() => {
  //       startTour();
  //     }, 1500);
  //     navigation.setParams({ startTour: undefined });
  //   }
  // }, [route?.params?.startTour, startTour, navigation]);

  // Handle tour continuation from Invoice Preview screen
  // useEffect(() => {
  //   if (route?.params?.continueTour && isInitialized) {
  //     console.log('🎯 [AnalyticsScreen] Tour continuation received from Invoice Preview');
  //     // Small delay to let the screen render first
  //     setTimeout(() => {
  //       startTour();
  //     }, 1000);
  //     // Clear the param to prevent re-triggering
  //     navigation.setParams({ continueTour: undefined });
  //   }
  // }, [route?.params?.continueTour, isInitialized, startTour, navigation]);

  // TOUR TEMPORARILY DISABLED
  // Handle tour completion - guide to Orders screen
  // const handleTourComplete = useCallback(async () => {
  //   console.log('🎯 [AnalyticsScreen] Tour complete, guiding to Orders');
  //   
  //   // Set continuation to Orders
  //   await tourProgressManager.setContinueTourTo('Orders');
  //   
  //   // Navigate to Orders screen with tour continuation flag
  //   navigation.navigate('Main', { 
  //     screen: 'Orders',
  //     params: { continueTour: true }
  //   });
  // }, [navigation]);

  // TOUR TEMPORARILY DISABLED
  // Handle next step - check if we need to navigate to Orders
  // const handleNextStep = useCallback(async () => {
  //   // Check if current step has nextScreen set to Orders (last step)
  //   if (currentStep?.nextScreen === 'Orders') {
  //     // This is the last step, navigate to Orders
  //     await handleTourComplete();
  //   } else {
  //     nextStep();
  //   }
  // }, [currentStep, nextStep, handleTourComplete]);

  // Set overlay ref for animations
  // Simple tour doesn't need overlay refs - removed setOverlayRef usage

  // Optimized focus effect - no automatic refresh
  useFocusEffect(
    useCallback(() => {
      console.log('📊 [Analytics] Screen focused - using cached data');
    }, [])
  );

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      console.log('📊 [Analytics] Loading data...');

      // Fetch data from backend
      const [ordersData, productsData] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);

      console.log('📊 [Analytics] Loaded:', ordersData.length, 'orders,', productsData.length, 'products');

      // Store data in state
      setOrders(ordersData);
      setProducts(productsData);

      // Phase C Implementation: Use ComputationCache for analytics
      const ordersHash = computationCache.generateOrdersHash(ordersData);
      console.log('📊 [Analytics] Orders hash:', ordersHash);

      let analyticsResult;
      let chartDataResult;

      // Check if we have cached analytics and this is not a manual refresh
      if (!isRefresh && computationCache.hasAnalytics(ordersHash)) {
        console.log('📊 [Analytics] Using cached analytics computation');
        const cachedData = computationCache.getAnalytics(ordersHash);
        analyticsResult = cachedData.analytics;
        chartDataResult = cachedData.chartData;
      } else {
        console.log('📊 [Analytics] Computing analytics (cache miss or manual refresh)');

        // Calculate analytics for different periods
        const todayAnalytics = calculatePeriodAnalytics(ordersData, 'today');
        const weekAnalytics = calculatePeriodAnalytics(ordersData, 'week');
        const monthAnalytics = calculatePeriodAnalytics(ordersData, 'month');
        const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total || 0), 0);

        // Calculate popular products
        const popularProducts = calculatePopularProducts(ordersData);

        // Generate chart data
        const revenueChart = generateRevenueChartData(ordersData);
        const orderTrends = generateOrderTrendsData(ordersData);
        const topProducts = popularProducts.slice(0, 5);

        // Prepare analytics result
        analyticsResult = {
          todayRevenue: Number(todayAnalytics.revenue || 0),
          weekRevenue: Number(weekAnalytics.revenue || 0),
          monthRevenue: Number(monthAnalytics.revenue || 0),
          totalRevenue: Number(totalRevenue || 0),

          todayOrders: Number(todayAnalytics.orderCount || 0),
          weekOrders: Number(weekAnalytics.orderCount || 0),
          monthOrders: Number(monthAnalytics.orderCount || 0),
          totalOrders: Number(ordersData.length || 0),
          avgOrderValue: ordersData.length > 0 ? Math.round(totalRevenue / ordersData.length) : 0,

          totalProducts: Number(productsData.length || 0),
          popularProducts: popularProducts || [],
          topCategories: calculateTopCategories(popularProducts),
        };

        // Prepare chart data result
        chartDataResult = {
          revenueChart: revenueChart || [],
          orderTrends: orderTrends || [],
          topProducts: topProducts || [],
        };

        // Cache the computed results
        computationCache.setAnalytics(ordersHash, {
          analytics: analyticsResult,
          chartData: chartDataResult
        });

        console.log('📊 [Analytics] Analytics computed and cached');
      }

      // Update state with results (either cached or computed)
      setAnalytics(analyticsResult);
      setChartData(chartDataResult);

      if (!isRefresh) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
      if (!isRefresh) {
        setIsLoading(false);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadAnalytics(true);
  };

  // Helper function to calculate analytics for different periods
  const calculatePeriodAnalytics = (orders, period) => {
    let startDate, endDate;

    switch (period) {
      case 'today':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      default:
        return { revenue: 0, orderCount: 0, avgOrderValue: 0, orders: [] };
    }

    const periodOrders = orders.filter(order => {
      let orderDate;
      if (order.timestamp) {
        orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else {
        return false;
      }

      if (isNaN(orderDate.getTime())) {
        return false;
      }

      return orderDate >= startDate && orderDate <= endDate;
    });

    const revenue = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const orderCount = periodOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;

    return { revenue, orderCount, avgOrderValue, orders: periodOrders };
  };

  // Helper function to calculate popular products
  const calculatePopularProducts = (orders) => {
    const productSales = {};

    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity || 0;
          } else {
            productSales[item.id] = {
              ...item,
              quantity: item.quantity || 0,
            };
          }
        });
      }
    });

    return Object.values(productSales)
      .sort((a, b) => (b.quantity || 0) - (a.quantity || 0))
      .slice(0, 10);
  };

  // Helper function to calculate top categories
  const calculateTopCategories = (popularProducts) => {
    const categoryCount = {};

    popularProducts.forEach(product => {
      const category = product.category || 'General';
      categoryCount[category] = (categoryCount[category] || 0) + (product.quantity || 0);
    });

    return Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  // Helper function to generate revenue chart data (last 7 days)
  const generateRevenueChartData = (orders) => {
    const last7Days = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const dayOrders = orders.filter(order => {
        if (!order) return false;
        const timestamp = order.timestamp || order.createdAt;
        if (!timestamp) return false;

        try {
          const orderDateStr = typeof timestamp === 'string'
            ? timestamp.split('T')[0]
            : new Date(timestamp).toISOString().split('T')[0];
          return orderDateStr === dateStr;
        } catch (error) {
          return false;
        }
      });

      const dayRevenue = dayOrders.reduce((sum, order) => sum + (order.total || 0), 0);

      last7Days.push({
        day: date.toLocaleDateString('en', { weekday: 'short' }),
        date: dateStr,
        revenue: dayRevenue,
        orders: dayOrders.length,
        value: dayRevenue, // For chart compatibility - revenue chart shows revenue
      });
    }

    return last7Days;
  };

  // Helper function to generate order trends data (24 hours)
  const generateOrderTrendsData = (orders) => {
    const hourlyData = Array(24).fill(0);

    orders.forEach(order => {
      if (order && order.timestamp) {
        try {
          const hour = new Date(order.timestamp).getHours();
          if (hour >= 0 && hour < 24) {
            hourlyData[hour]++;
          }
        } catch (error) {
          console.warn('Error processing order timestamp:', error);
        }
      }
    });

    return hourlyData.map((count, hour) => ({
      hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
      orders: count,
      value: count, // For chart compatibility
    }));
  };

  // Component for stat cards
  const StatCard = ({ title, value, subtitle, color = colors.text.primary }) => (
    <View style={analyticsStyles.statCard}>
      <Text style={analyticsStyles.statTitle}>{title}</Text>
      <Text style={[analyticsStyles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={analyticsStyles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  // Component for popular product items
  const PopularProductItem = ({ product, index }) => (
    <View style={analyticsStyles.productItem}>
      <View style={analyticsStyles.productRank}>
        <Text style={analyticsStyles.rankText}>{index + 1}</Text>
      </View>
      <View style={analyticsStyles.productImage}>
        {(() => {
          const displayImageUrl = getProductImageUrl(product);

          return displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
              onError={(error) => {
                console.log('❌ [AnalyticsScreen] Image load error:', error.nativeEvent.error);
              }}
            />
          ) : (
            <View style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.gray[100],
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 8
            }}>
              <Ionicons name="cube-outline" size={24} color="#6b7280" />
            </View>
          );
        })()}
      </View>
      <View style={analyticsStyles.productInfo}>
        <Text style={analyticsStyles.productName} numberOfLines={1} ellipsizeMode="tail">
          {product.name}
        </Text>
        <Text style={analyticsStyles.productCategory} numberOfLines={1}>
          {product.category || 'General'}
        </Text>
      </View>
      <View style={analyticsStyles.productStats}>
        <Text style={analyticsStyles.productPrice}>₹{product.price}</Text>
        <Text style={analyticsStyles.productSold}>{product.quantity} sold</Text>
      </View>
    </View>
  );

  // Tab content renderers
  const renderRevenueTab = () => (
    <ScrollView
      contentContainerStyle={analyticsStyles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.main}
          colors={[colors.primary.main]}
        />
      }
    >
      {/* Revenue Stats Grid */}
      <View style={analyticsStyles.statsGrid}>
        <StatCard
          title="Today Revenue"
          value={`₹${analytics.todayRevenue || 0}`}
          subtitle="Today's sales"
          color={colors.primary.main}
        />
        <StatCard
          title="Week Revenue"
          value={`₹${analytics.weekRevenue || 0}`}
          subtitle="Last 7 days"
          color={colors.success.main}
        />
        <StatCard
          title="Month Revenue"
          value={`₹${analytics.monthRevenue || 0}`}
          subtitle="Last 30 days"
          color={colors.warning.main}
        />
        <StatCard
          title="Total Revenue"
          value={`₹${analytics.totalRevenue || 0}`}
          subtitle="All time"
          color={colors.info.main}
        />
      </View>

      {/* Revenue Trend Chart */}
      <View style={analyticsStyles.section}>
        <ChartCard title="Revenue Trend (Last 7 Days)">
          {chartData.revenueChart.length > 0 ? (
            <BarChart
              data={chartData.revenueChart}
              color={colors.primary.main}
              height={220}
            />
          ) : (
            <NoDataChart height={220} message="Start making sales to see revenue trends" />
          )}
        </ChartCard>
      </View>
    </ScrollView>
  );

  const renderOrdersTab = () => (
    <ScrollView
      contentContainerStyle={analyticsStyles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.main}
          colors={[colors.primary.main]}
        />
      }
    >
      {/* Order Stats Grid */}
      <View style={analyticsStyles.statsGrid}>
        <StatCard
          title="Today Orders"
          value={analytics.todayOrders || 0}
          subtitle="Orders today"
          color={colors.success.main}
        />
        <StatCard
          title="Week Orders"
          value={analytics.weekOrders || 0}
          subtitle="Last 7 days"
          color={colors.primary.main}
        />
        <StatCard
          title="Avg Order Value"
          value={`₹${analytics.avgOrderValue || 0}`}
          subtitle="Per order"
          color={colors.warning.main}
        />
        <StatCard
          title="Total Orders"
          value={analytics.totalOrders || 0}
          subtitle="All time"
          color={colors.info.main}
        />
      </View>

      {/* Order Trends Chart */}
      <View style={analyticsStyles.section}>
        <ChartCard title="Order Trends by Hour (Today)">
          {chartData.orderTrends.some(item => item.orders > 0) ? (
            <BarChart
              data={chartData.orderTrends.filter(item => item.orders > 0)}
              color={colors.warning.main}
              height={220}
            />
          ) : (
            <NoDataChart height={220} message="No orders today to show trends" />
          )}
        </ChartCard>
      </View>
    </ScrollView>
  );

  const renderProductsTab = () => (
    <ScrollView
      contentContainerStyle={analyticsStyles.scrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary.main}
          colors={[colors.primary.main]}
        />
      }
    >
      {/* Product Stats */}
      <View style={analyticsStyles.statsGrid}>
        <StatCard
          title="Total Products"
          value={analytics.totalProducts || 0}
          subtitle="In inventory"
          color={colors.info.main}
        />
        <StatCard
          title="Top Selling"
          value={analytics.popularProducts.length > 0 ? analytics.popularProducts[0]?.name || 'None' : 'None'}
          subtitle="Best performer"
          color={colors.success.main}
        />
      </View>

      {/* Top Products Distribution */}
      {analytics.popularProducts.length > 0 && (
        <View style={analyticsStyles.section}>
          <ChartCard title="Top Products Distribution">
            <PieChart
              data={chartData.topProducts}
              size={120}
              showLegend={true}
              centerText="Top Products"
            />
          </ChartCard>
        </View>
      )}

      {/* Popular Products List */}
      {analytics.popularProducts.length > 0 && (
        <View style={analyticsStyles.section}>
          <Text style={analyticsStyles.sectionTitle}>Popular Products</Text>
          {analytics.popularProducts.slice(0, 5).map((product, index) => (
            <PopularProductItem
              key={product.id}
              product={product}
              index={index}
            />
          ))}
        </View>
      )}

      {/* Empty State */}
      {analytics.popularProducts.length === 0 && (
        <View style={analyticsStyles.emptyState}>
          <Text style={analyticsStyles.emptyStateIcon}>📦</Text>
          <Text style={analyticsStyles.emptyStateTitle}>No Product Sales Yet</Text>
          <Text style={analyticsStyles.emptyStateSubtitle}>
            Start selling products to see analytics and insights here
          </Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <SafeAreaView style={analyticsStyles.container}>
      {isLoading && <LoadingSpinner />}

      <View style={analyticsStyles.content}>
        {/* Header */}
        <View style={analyticsStyles.header}>
          <Text style={analyticsStyles.title}>Analytics</Text>
          <TouchableOpacity
            style={[
              analyticsStyles.button,
              !canUseAdvancedAnalytics && {
                backgroundColor: colors.gray[100],
                borderColor: colors.border.medium,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (!canUseAdvancedAnalytics) {
                featureFlags.showUpgradePrompt('advanced_analytics');
              } else {
                // Pass already-fetched data to avoid duplicate API calls
                navigation.navigate('AdvancedAnalytics', {
                  ordersData: orders,
                  productsData: products,
                  analyticsData: analytics,
                  chartData: chartData
                });
              }
            }}
          >
            {!canUseAdvancedAnalytics && (
              <Ionicons name="lock-closed" size={14} color={colors.warning.main} style={{ marginRight: 4 }} />
            )}
            <Text style={[
              analyticsStyles.buttonText,
              !canUseAdvancedAnalytics && { color: colors.text.tertiary }
            ]}>Advanced</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={analyticsStyles.tabContainer}>
          <TouchableOpacity
            style={[
              analyticsStyles.tab,
              activeTab === 'revenue' && analyticsStyles.tabActive
            ]}
            onPress={() => {
              setActiveTab('revenue');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              analyticsStyles.tabText,
              activeTab === 'revenue' && analyticsStyles.tabTextActive
            ]}>
              Revenue
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              analyticsStyles.tab,
              activeTab === 'orders' && analyticsStyles.tabActive
            ]}
            onPress={() => {
              setActiveTab('orders');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              analyticsStyles.tabText,
              activeTab === 'orders' && analyticsStyles.tabTextActive
            ]}>
              Orders
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              analyticsStyles.tab,
              activeTab === 'products' && analyticsStyles.tabActive
            ]}
            onPress={() => {
              setActiveTab('products');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Text style={[
              analyticsStyles.tabText,
              activeTab === 'products' && analyticsStyles.tabTextActive
            ]}>
              Products
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <View style={{ flex: 1 }}>
          {activeTab === 'revenue' && renderRevenueTab()}
          {activeTab === 'orders' && renderOrdersTab()}
          {activeTab === 'products' && renderProductsTab()}
        </View>
      </View>

      {/* TOUR TEMPORARILY DISABLED */}
      {/* Simple Tour Overlay */}
      {/* <SimpleTourOverlay
        visible={showTour}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepIndex={stepIndex}
        onNext={nextStep}
        onSkip={skipTour}
        onComplete={completeTour}
      /> */}
    </SafeAreaView>
  );
};

export default AnalyticsScreen;