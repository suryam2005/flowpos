import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Image,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import ordersService from '../services/OrdersService';
import productsService from '../services/ProductsService';
import featureService from '../services/FeatureService';

import { typography, createTextStyle, spacing, screenDimensions } from '../utils/typography';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import { getProductImageUrl } from '../utils/imageUtils';

// Helper functions for chart data generation
const generateDailyRevenueData = (orders) => {
  const last7Days = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayOrders = orders.filter(order => {
      const timestamp = order.timestamp || order.createdAt;
      if (!timestamp) return false;
      const orderDateStr = typeof timestamp === 'string' 
        ? timestamp.split('T')[0] 
        : new Date(timestamp).toISOString().split('T')[0];
      return orderDateStr === dateStr;
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
  
  for (let i = 3; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const weekOrders = orders.filter(order => {
      if (!order.timestamp) return false;
      const orderDate = new Date(order.timestamp);
      return orderDate >= weekStart && orderDate <= weekEnd;
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
  
  orders.forEach(order => {
    if (order.timestamp) {
      const hour = new Date(order.timestamp).getHours();
      hourlyData[hour]++;
    }
  });
  
  return hourlyData.map((count, hour) => ({
    hour: hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`,
    orders: count,
  }));
};

// Chart Components
const BarChart = ({ data, height = 200, color = colors.primary.main }) => {
  const maxValue = Math.max(...data.map(item => item.revenue || item.orders || 0));
  const screenWidth = Dimensions.get('window').width - 40;
  const barWidth = Math.max((screenWidth - 60) / data.length, 30); // Minimum 30px per bar
  const spacing = Math.max(barWidth * 0.2, 4); // 20% spacing, minimum 4px
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
      >
        <View style={[styles.chartBars, { width: Math.max(screenWidth - 60, data.length * (barWidth + spacing)) }]}>
          {data.map((item, index) => {
            const barHeight = maxValue > 0 ? ((item.revenue || item.orders || 0) / maxValue) * (height - 60) : 0;
            return (
              <View key={index} style={[styles.barContainer, { width: barWidth, marginHorizontal: spacing / 2 }]}>
                <View style={styles.barWrapper}>
                  <View 
                    style={[
                      styles.bar, 
                      { 
                        height: Math.max(barHeight, 4), // Minimum 4px height
                        backgroundColor: color,
                        width: barWidth - spacing,
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.barLabel, { width: barWidth }]} numberOfLines={1}>
                  {item.day || item.week || item.hour || `Item ${index + 1}`}
                </Text>
                <Text style={[styles.barValue, { width: barWidth }]}>
                  {item.revenue ? `₹${item.revenue}` : item.orders || 0}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const LineChart = ({ data, height = 200, color = colors.success.main }) => {
  const maxValue = Math.max(...data.map(item => item.revenue || item.orders || 0));
  const screenWidth = Dimensions.get('window').width - 40;
  const pointWidth = (screenWidth - 60) / (data.length - 1);
  
  return (
    <View style={[styles.chartContainer, { height }]}>
      <View style={styles.lineChartContainer}>
        {data.map((item, index) => {
          const pointHeight = maxValue > 0 ? ((item.revenue || item.orders || 0) / maxValue) * (height - 80) : 0;
          const yPosition = height - 80 - pointHeight;
          
          return (
            <View key={index} style={styles.linePointContainer}>
              <View 
                style={[
                  styles.linePoint, 
                  { 
                    backgroundColor: color,
                    top: yPosition,
                  }
                ]} 
              />
              {index < data.length - 1 && (
                <View 
                  style={[
                    styles.lineSegment,
                    {
                      backgroundColor: color,
                      top: yPosition + 4,
                      width: pointWidth,
                    }
                  ]}
                />
              )}
            </View>
          );
        })}
      </View>
      <View style={styles.lineLabels}>
        {data.map((item, index) => (
          <View key={index} style={styles.lineLabelContainer}>
            <Text style={styles.lineLabel} numberOfLines={1}>
              {item.day || item.week || `${index + 1}`}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const DonutChart = ({ data, size = 150 }) => {
  const total = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
  let currentAngle = 0;
  
  return (
    <View style={[styles.donutContainer, { width: size, height: size }]}>
      <View style={styles.donutChart}>
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.quantity / total) * 100 : 0;
          const angle = (percentage / 100) * 360;
          const color = [
            colors.primary.main,
            colors.success.main,
            colors.warning.main,
            colors.error.main,
            colors.info.main,
          ][index % 5];
          
          const segment = (
            <View
              key={index}
              style={[
                styles.donutSegment,
                {
                  backgroundColor: color,
                  transform: [{ rotate: `${currentAngle}deg` }],
                  width: size,
                  height: size,
                }
              ]}
            />
          );
          
          currentAngle += angle;
          return segment;
        })}
      </View>
      <View style={styles.donutCenter}>
        <Text style={styles.donutCenterText}>Top</Text>
        <Text style={styles.donutCenterText}>Products</Text>
      </View>
    </View>
  );
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

const AnalyticsScreen = ({ navigation }) => {
  const [analytics, setAnalytics] = useState({
    periodRevenue: 0,
    periodOrders: 0,
    periodAvgOrderValue: 0,
    totalRevenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    totalProducts: 0,
    popularProducts: [],
  });
  const [chartData, setChartData] = useState({
    dailyRevenue: [],
    weeklyRevenue: [],
    topProducts: [],
    orderTrends: [],
  });
  const [selectedChart, setSelectedChart] = useState('daily');
  const [selectedPeriod, setSelectedPeriod] = useState('today'); // today, week, month
  const [refreshing, setRefreshing] = useState(false);
  const [availablePeriods, setAvailablePeriods] = useState(['today']);
  
  // Page loading state
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1200);
  
  // App tour guide
  const { showTour, completeTour } = useAppTour('Analytics');
  
  // No animations needed

  useEffect(() => {
    initializeFeatures();
    loadAnalytics();
  }, [selectedPeriod]);

  const initializeFeatures = async () => {
    try {
      await featureService.initialize();
      
      // TESTING MODE: All periods available during development
      // TODO: Enable plan restrictions in production
      const periods = ['today', 'week', 'month']; // All available for testing
      
      // PRODUCTION CODE (commented out for testing):
      // const periods = ['today']; // Always available
      // 
      // // Daily & weekly analytics for Starter+ plans
      // if (featureService.canUseFeature('daily_weekly_analytics')) {
      //   periods.push('week');
      // }
      // 
      // // Monthly analytics for Growth+ plans (advanced analytics)
      // if (featureService.canUseFeature('advanced_analytics')) {
      //   periods.push('month');
      // }
      
      setAvailablePeriods(periods);
      
      // Reset to 'today' if current selection is not available
      if (!periods.includes(selectedPeriod)) {
        setSelectedPeriod('today');
      }
    } catch (error) {
      console.error('Error initializing features:', error);
      // Fallback to all analytics for testing
      setAvailablePeriods(['today', 'week', 'month']);
      setSelectedPeriod('today');
    }
  };

  // OPTIMIZED: Only refresh on manual pull-to-refresh, not on every focus
  // This prevents unnecessary API calls when navigating between tabs
  useFocusEffect(
    useCallback(() => {
      // Skip automatic refresh - user can manually refresh if needed
      // This is Phase 1 optimization to reduce API calls
      console.log('📊 [Analytics] Screen focused - using cached data (manual refresh available)');
    }, [])
  );

  const loadAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      console.log('📊 [Analytics] Fetching data from backend...');
      
      // Fetch real data from backend
      const [orders, products] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);

      console.log('📊 [Analytics] Fetched:', orders.length, 'orders,', products.length, 'products');

      // Calculate revenue for different periods first
      const periodAnalytics = calculatePeriodAnalytics(orders, selectedPeriod);
      
      // Calculate popular products for the selected period
      const productSales = {};
      periodAnalytics.orders.forEach(order => {
        order.items.forEach(item => {
          if (productSales[item.id]) {
            productSales[item.id].quantity += item.quantity;
          } else {
            productSales[item.id] = {
              ...item,
              quantity: item.quantity,
            };
          }
        });
      });

      const popularProducts = Object.values(productSales)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);

      // Generate chart data based on selected period - use filtered orders for all periods
      const chartOrders = periodAnalytics.orders;
      const dailyRevenue = generateDailyRevenueData(chartOrders);
      const weeklyRevenue = generateWeeklyRevenueData(chartOrders);
      const topProducts = popularProducts.slice(0, 5);
      const orderTrends = generateOrderTrendsData(chartOrders);

      const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);

      console.log('📊 [Analytics] Period analytics for', selectedPeriod, ':', {
        revenue: periodAnalytics.revenue,
        orders: periodAnalytics.orderCount,
        avgOrderValue: periodAnalytics.avgOrderValue
      });

      setAnalytics({
        periodRevenue: periodAnalytics.revenue,
        periodOrders: periodAnalytics.orderCount,
        periodAvgOrderValue: periodAnalytics.avgOrderValue,
        totalRevenue,
        totalOrders: orders.length,
        avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
        totalProducts: products.length,
        popularProducts,
      });

      setChartData({
        dailyRevenue,
        weeklyRevenue,
        topProducts,
        orderTrends,
      });

      // Finish loading animation on initial load
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadAnalytics(true);
  };

  const StatCard = ({ title, value, subtitle, color = colors.text.primary, index }) => (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const PopularProductItem = ({ product, index }) => (
    <View style={styles.popularProductItem}>
      <View style={styles.productRank}>
        <Text style={styles.rankText}>{index + 1}</Text>
      </View>
      <View style={styles.productImage}>
        {(() => {
          // Get image URL using utility function
          const displayImageUrl = getProductImageUrl(product);
          
          return displayImageUrl ? (
            <Image 
              source={{ uri: displayImageUrl }} 
              style={styles.productImageStyle}
              onError={(error) => {
                console.log('❌ [AnalyticsScreen] Image load error:', error.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={24} color="#6b7280" />
            </View>
          );
        })()}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1} ellipsizeMode="tail">
          {product.name}
        </Text>
        <Text style={styles.productCategory} numberOfLines={1}>
          {product.category || 'General'}
        </Text>
      </View>
      <View style={styles.productStats}>
        <Text style={styles.productPrice}>₹{product.price}</Text>
        <Text style={styles.productSold}>{product.quantity} sold</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading analytics..." />
      
      <View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Analytics</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.advancedButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate('AdvancedAnalytics');
                
                // TESTING MODE: Always allow access
                // TODO: Enable plan restrictions in production
                // if (featureService.canUseFeature('advanced_analytics')) {
                //   navigation.navigate('AdvancedAnalytics');
                // } else {
                //   featureService.showUpgradePrompt('advanced_analytics');
                // }
              }}
            >
              <Text style={styles.advancedButtonText}>
                Advanced
              </Text>
              {/* TESTING MODE: Lock icon disabled */}
              {/* TODO: Enable in production
              {!featureService.canUseFeature('advanced_analytics') && (
                <Ionicons name="lock-closed" size={14} color={colors.text.tertiary} style={{ marginLeft: 4 }} />
              )}
              */}
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {availablePeriods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                selectedPeriod === period && styles.periodButtonActive
              ]}
              onPress={() => {
                setSelectedPeriod(period);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                loadAnalytics(); // Reload analytics with new period
              }}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === period && styles.periodButtonTextActive
              ]}>
                {period === 'today' ? 'Today' : period === 'week' ? 'This Week' : 'This Month'}
              </Text>
            </TouchableOpacity>
          ))}
          
          {/* TESTING MODE: Upgrade prompts disabled */}
          {/* TODO: Enable in production
          {!availablePeriods.includes('week') && (
            <TouchableOpacity
              style={[styles.periodButton, styles.periodButtonLocked]}
              onPress={() => {
                featureService.showUpgradePrompt('daily_weekly_analytics');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.lockedPeriodContent}>
                <Ionicons name="lock-closed" size={12} color={colors.text.tertiary} />
                <Text style={styles.periodButtonTextLocked}>This Week</Text>
              </View>
            </TouchableOpacity>
          )}
          
          {!availablePeriods.includes('month') && availablePeriods.includes('week') && (
            <TouchableOpacity
              style={[styles.periodButton, styles.periodButtonLocked]}
              onPress={() => {
                featureService.showUpgradePrompt('advanced_analytics');
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <View style={styles.lockedPeriodContent}>
                <Ionicons name="lock-closed" size={12} color={colors.text.tertiary} />
                <Text style={styles.periodButtonTextLocked}>This Month</Text>
              </View>
            </TouchableOpacity>
          )}
          */}
        </View>

        <View style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
              progressBackgroundColor={colors.background.surface}
              title="Pull to refresh analytics..."
              titleColor={colors.text.secondary}
            />
          }
        >
        {/* TESTING MODE: Upgrade prompt disabled */}
        {/* TODO: Enable in production
        {!featureService.canUseFeature('daily_weekly_analytics') && (
          <View style={styles.upgradePrompt}>
            <View style={styles.upgradePromptContent}>
              <Ionicons name="trending-up" size={24} color={colors.primary.main} />
              <View style={styles.upgradePromptText}>
                <Text style={styles.upgradePromptTitle}>Get More Insights</Text>
                <Text style={styles.upgradePromptSubtitle}>
                  Upgrade to Starter plan for weekly analytics and better business insights
                </Text>
              </View>
              <TouchableOpacity
                style={styles.upgradePromptButton}
                onPress={() => {
                  featureService.showUpgradePrompt('daily_weekly_analytics');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              >
                <Text style={styles.upgradePromptButtonText}>Upgrade</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        */}

        <View style={styles.statsGrid}>
          <StatCard
            title={`${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'} Revenue`}
            value={`₹${analytics.periodRevenue || 0}`}
            subtitle={selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'Last 7 days' : 'Last 30 days'}
            color={colors.primary.main}
            index={0}
          />

          <StatCard
            title={`${selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This Week' : 'This Month'} Orders`}
            value={analytics.periodOrders || 0}
            subtitle="Completed"
            color={colors.success.main}
            index={1}
          />

          <StatCard
            title="Avg Order Value"
            value={`₹${analytics.periodAvgOrderValue || 0}`}
            subtitle={selectedPeriod === 'today' ? 'Today' : selectedPeriod === 'week' ? 'This week' : 'This month'}
            color={colors.warning.main}
            index={2}
          />

          <StatCard
            title="Avg Order"
            value={`₹${analytics.avgOrderValue || 0}`}
            subtitle="Per order"
            color={colors.primary.main}
            index={3}
          />
        </View>

        <View style={styles.revenueSection}>
          <Text style={styles.sectionTitle}>Revenue Overview</Text>
          <View style={styles.revenueCards}>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>Today</Text>
                <Text style={styles.revenueValue}>₹{analytics.todayRevenue}</Text>
              </View>
            </View>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>This Week</Text>
                <Text style={styles.revenueValue}>₹{analytics.weekRevenue}</Text>
              </View>
            </View>
            <View style={styles.revenueCard}>
              <View style={styles.revenueCardContent}>
                <Text style={styles.revenueLabel}>All Time</Text>
                <Text style={styles.revenueValue}>₹{analytics.totalRevenue}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.sectionTitle}>
              {selectedPeriod === 'today' ? 'Today Revenue' : 
               selectedPeriod === 'week' ? 'Week Revenue' : 
               'Month Revenue'}
            </Text>
            <View style={styles.chartTabs}>
              <TouchableOpacity
                style={[styles.chartTab, selectedChart === 'daily' && styles.chartTabActive]}
                onPress={() => setSelectedChart('daily')}
              >
                <Text style={[styles.chartTabText, selectedChart === 'daily' && styles.chartTabTextActive]}>
                  Daily
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chartTab, selectedChart === 'weekly' && styles.chartTabActive]}
                onPress={() => setSelectedChart('weekly')}
              >
                <Text style={[styles.chartTabText, selectedChart === 'weekly' && styles.chartTabTextActive]}>
                  Weekly
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.chartCard}>
            {selectedChart === 'daily' && chartData.dailyRevenue.length > 0 && (
              <BarChart 
                data={chartData.dailyRevenue} 
                color={colors.primary.main}
                height={220}
              />
            )}
            {selectedChart === 'weekly' && chartData.weeklyRevenue.length > 0 && (
              <LineChart 
                data={chartData.weeklyRevenue} 
                color={colors.success.main}
                height={220}
              />
            )}
            {(chartData.dailyRevenue.length === 0 && chartData.weeklyRevenue.length === 0) && (
              <View style={styles.noDataContainer}>
                <Ionicons name="stats-chart-outline" size={48} color="#9ca3af" />
                <Text style={styles.noDataTitle}>No Data Available</Text>
                <Text style={styles.noDataSubtitle}>Start making sales to see revenue trends</Text>
              </View>
            )}
          </View>
        </View>

        {/* Order Trends Chart */}
        {chartData.orderTrends.some(item => item.orders > 0) && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Order Trends by Hour</Text>
            <View style={styles.chartCard}>
              <BarChart 
                data={chartData.orderTrends.filter(item => item.orders > 0)} 
                color={colors.warning.main}
                height={200}
              />
            </View>
          </View>
        )}

        {/* Top Products Donut Chart */}
        {analytics.popularProducts.length > 0 && (
          <View style={styles.chartsSection}>
            <Text style={styles.sectionTitle}>Top Products Distribution</Text>
            <View style={styles.chartCard}>
              <View style={styles.donutChartContainer}>
                <DonutChart data={analytics.popularProducts.slice(0, 5)} size={120} />
                <View style={styles.donutLegend}>
                  {analytics.popularProducts.slice(0, 5).map((product, index) => (
                    <View key={product.id} style={styles.legendItem}>
                      <View 
                        style={[
                          styles.legendColor, 
                          { 
                            backgroundColor: [
                              colors.primary.main,
                              colors.success.main,
                              colors.warning.main,
                              colors.error.main,
                              colors.info.main,
                            ][index % 5]
                          }
                        ]} 
                      />
                      <Text style={styles.legendText} numberOfLines={1}>
                        {product.name} ({product.quantity})
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {analytics.popularProducts.length > 0 && (
          <View style={styles.popularSection}>
            <Text style={styles.sectionTitle}>Popular Products</Text>
            {analytics.popularProducts.map((product, index) => (
              <PopularProductItem
                key={product.id}
                product={product}
                index={index}
              />
            ))}
          </View>
        )}
        </ScrollView>
      </View>
      </View>

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="Analytics"
        onComplete={completeTour}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
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
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  advancedButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  advancedButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  advancedButtonLocked: {
    backgroundColor: colors.gray[300],
    borderWidth: 1,
    borderColor: colors.gray[400],
  },
  advancedButtonTextLocked: {
    color: colors.text.tertiary,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  periodSelector: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: colors.primary.main,
  },
  periodButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  periodButtonTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  periodButtonLocked: {
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
    borderStyle: 'dashed',
  },
  lockedPeriodContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  periodButtonTextLocked: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  upgradePrompt: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: colors.primary.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.primary.light,
  },
  upgradePromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  upgradePromptText: {
    flex: 1,
  },
  upgradePromptTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  upgradePromptSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  upgradePromptButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
  },
  upgradePromptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 140,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  statTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statSubtitle: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  revenueSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
    flex: 1,
    marginRight: 12,
  },
  revenueCards: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  revenueCard: {
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  revenueCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    minHeight: 50,
  },
  revenueLabel: {
    ...createTextStyle('body1', colors.text.secondary),
  },
  revenueValue: {
    ...createTextStyle('price', colors.text.primary),
  },
  popularSection: {
    marginBottom: 24,
  },
  popularProductItem: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  productRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  productImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productImagePlaceholderText: {
    fontSize: 16,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
    color: colors.text.secondary,
    textTransform: 'capitalize',
  },
  productStats: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  productPrice: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  productSold: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'right',
  },
  // Chart Styles
  chartsSection: {
    marginBottom: 24,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTabs: {
    flexDirection: 'row',
    backgroundColor: colors.gray[100],
    borderRadius: 8,
    padding: 2,
  },
  chartTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  chartTabActive: {
    backgroundColor: colors.background.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  chartTabText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  chartTabTextActive: {
    color: colors.primary.main,
    fontWeight: '600',
  },
  chartCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  chartContainer: {
    width: '100%',
    paddingVertical: 10,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    height: '100%',
    paddingBottom: 40,
  },
  barContainer: {
    alignItems: 'center',
  },
  barWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  bar: {
    borderRadius: 4,
    minHeight: 4,
  },
  barLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  barValue: {
    fontSize: 9,
    color: colors.text.tertiary,
    marginTop: 2,
    textAlign: 'center',
  },
  lineChartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: '100%',
    paddingBottom: 40,
    position: 'relative',
  },
  linePointContainer: {
    position: 'relative',
    flex: 1,
  },
  linePoint: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: '50%',
    marginLeft: -4,
  },
  lineSegment: {
    height: 2,
    position: 'absolute',
    left: '50%',
  },
  lineLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  lineLabelContainer: {
    flex: 1,
    alignItems: 'center',
  },
  lineLabel: {
    fontSize: 10,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  donutChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  donutContainer: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutChart: {
    position: 'relative',
    borderRadius: 1000,
    overflow: 'hidden',
  },
  donutSegment: {
    position: 'absolute',
    borderRadius: 1000,
  },
  donutCenter: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  donutCenterText: {
    fontSize: 10,
    color: colors.text.secondary,
    fontWeight: '600',
    textAlign: 'center',
  },
  donutLegend: {
    flex: 1,
    paddingLeft: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
    flex: 1,
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  noDataText: {
    fontSize: 48,
    marginBottom: 16,
  },
  noDataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  noDataSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default AnalyticsScreen;