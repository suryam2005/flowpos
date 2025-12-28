import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ordersService from '../services/OrdersService';
import productsService from '../services/ProductsService';
import { safeGoBack } from '../utils/navigationUtils';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAuth } from '../context/AuthContext';

import { colors } from '../styles/colors';
import { analyticsStyles, spacing } from '../styles/analyticsStyles';
import LoadingSpinner from '../components/LoadingSpinner';
import InteractiveTourOverlay from '../components/InteractiveTourOverlay';
import useInteractiveTour from '../hooks/useInteractiveTour';

// Import rebuilt chart components
import { BarChart, LineChart, HorizontalBarChart, DonutChart, PieChart, ProgressChart, ChartCard, NoDataChart } from '../components/ChartComponents';


const AdvancedAnalyticsScreen = ({ navigation, route }) => {
  // Get store settings from context
  const { getStoreProfile } = useStoreSettings();
  const { user } = useAuth();
  
  // Tab state for 4-tab structure
  const [activeTab, setActiveTab] = useState('revenue'); // revenue, orders, products, insights
  
  // Time period state
  const [selectedPeriod, setSelectedPeriod] = useState('daily'); // daily, weekly, monthly, yearly
  
  // Data states
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [analytics, setAnalytics] = useState({
    // Revenue analytics
    dailyRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    totalRevenue: 0,
    revenueGrowth: 0,
    
    // Order analytics
    dailyOrders: 0,
    weeklyOrders: 0,
    monthlyOrders: 0,
    yearlyOrders: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    orderGrowth: 0,
    
    // Product analytics
    totalProducts: 0,
    topProducts: [],
    categoryBreakdown: [],
    itemsSold: 0,
    inventoryTurnover: 0,
    
    // Advanced insights
    peakHours: [],
    customerSegments: [],
    seasonalTrends: [],
    performanceMetrics: [],
    
    // Period-specific analytics for current view
    periodRevenue: 0,
    periodOrders: 0,
    periodAvgOrderValue: 0,
    totalItems: 0,
  });
  
  // Chart data states
  const [chartData, setChartData] = useState({
    revenueTrends: [],
    orderTrends: [],
    productPerformance: [],
    comparisons: [],
    insights: []
  });
  
  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filteredData, setFilteredData] = useState([]);
  
  // UI states
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  // App tour guide - using interactive tour hook
  const {
    showTour,
    currentStep,
    stepIndex,
    totalSteps,
    showHint,
    showSkipStep,
    startTour,
    nextStep,
    skipScreen,
    skipAll,
    skipStep,
    completeTour,
    checkAutoStart,
    setOverlayRef,
    isInitialized,
  } = useInteractiveTour('AdvancedAnalytics');
  
  // Tour overlay ref
  const tourOverlayRef = useRef(null);
  
  // Tour refs for dynamic positioning
  const headerRef = useRef(null);
  const filterSectionRef = useRef(null);
  const summaryCardsRef = useRef(null);

  useEffect(() => {
    // Load analytics data when period changes
    loadAdvancedAnalytics();
  }, [selectedPeriod]);

  // Check if tour should auto-start when initialized
  useEffect(() => {
    if (isInitialized) {
      checkAutoStart();
    }
  }, [isInitialized, checkAutoStart]);

  // Handle tour trigger from route params
  useEffect(() => {
    if (route?.params?.startTour) {
      console.log('🎯 [AdvancedAnalyticsScreen] Tour trigger received from route params');
      setTimeout(() => {
        startTour();
      }, 1500);
      navigation.setParams({ startTour: undefined });
    }
  }, [route?.params?.startTour, startTour, navigation]);

  // Set overlay ref for animations
  useEffect(() => {
    if (tourOverlayRef.current) {
      setOverlayRef(tourOverlayRef.current);
    }
  }, [setOverlayRef]);

  useEffect(() => {
    if (orders.length > 0) {
      // Recalculate period-specific analytics when period changes
      const currentPeriodAnalytics = calculatePeriodAnalytics(orders, selectedPeriod);
      setAnalytics(prev => ({
        ...prev,
        periodRevenue: Number(currentPeriodAnalytics.revenue || 0),
        periodOrders: Number(currentPeriodAnalytics.orderCount || 0),
        periodAvgOrderValue: Number(currentPeriodAnalytics.avgOrderValue || 0),
        totalItems: Number(currentPeriodAnalytics.totalItems || 0),
      }));
    }
  }, [selectedPeriod, orders]);

  // Optimized focus effect - no automatic refresh
  useFocusEffect(
    useCallback(() => {
      console.log('📈 [AdvancedAnalytics] Screen focused - using cached data');
    }, [])
  );

  const loadAdvancedAnalytics = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      console.log('📈 [AdvancedAnalytics] Loading data...');
      
      // Fetch data from backend
      const [ordersData, productsData] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);

      console.log('📈 [AdvancedAnalytics] Loaded:', ordersData.length, 'orders,', productsData.length, 'products');
      
      // Store data in state
      setOrders(ordersData);
      setProducts(productsData);
      
      // Initialize filteredData with all orders if no filters are active
      const hasActiveFilters = dateRange.start || dateRange.end || categoryFilter !== 'all' || selectedProduct;
      if (!hasActiveFilters) {
        console.log('📈 [AdvancedAnalytics] No active filters, initializing with all orders');
        setFilteredData(ordersData);
      }
      
      // Calculate analytics for all periods
      const dailyAnalytics = calculatePeriodAnalytics(ordersData, 'daily');
      const weeklyAnalytics = calculatePeriodAnalytics(ordersData, 'weekly');
      const monthlyAnalytics = calculatePeriodAnalytics(ordersData, 'monthly');
      const yearlyAnalytics = calculatePeriodAnalytics(ordersData, 'yearly');
      const totalRevenue = ordersData.reduce((sum, o) => sum + (o.total || 0), 0);
      
      // Calculate advanced metrics
      const topProducts = calculateTopProducts(ordersData);
      const categoryBreakdown = calculateCategoryBreakdown(ordersData, productsData);
      const peakHours = calculatePeakHours(ordersData);
      const performanceMetrics = calculatePerformanceMetrics(ordersData, productsData);
      
      // Generate chart data
      const revenueTrends = generateRevenueTrends(ordersData, selectedPeriod);
      const orderTrends = generateOrderTrends(ordersData, selectedPeriod);
      const productPerformance = generateProductPerformance(ordersData, productsData);
      const comparisons = generateComparisons(ordersData, selectedPeriod);
      
      // Update analytics state
      setAnalytics({
        dailyRevenue: Number(dailyAnalytics.revenue || 0),
        weeklyRevenue: Number(weeklyAnalytics.revenue || 0),
        monthlyRevenue: Number(monthlyAnalytics.revenue || 0),
        yearlyRevenue: Number(yearlyAnalytics.revenue || 0),
        totalRevenue: Number(totalRevenue || 0),
        revenueGrowth: calculateGrowthRate(weeklyAnalytics.revenue, monthlyAnalytics.revenue),
        
        dailyOrders: Number(dailyAnalytics.orderCount || 0),
        weeklyOrders: Number(weeklyAnalytics.orderCount || 0),
        monthlyOrders: Number(monthlyAnalytics.orderCount || 0),
        yearlyOrders: Number(yearlyAnalytics.orderCount || 0),
        totalOrders: Number(ordersData.length || 0),
        avgOrderValue: ordersData.length > 0 ? Math.round(totalRevenue / ordersData.length) : 0,
        orderGrowth: calculateGrowthRate(weeklyAnalytics.orderCount, monthlyAnalytics.orderCount),
        
        totalProducts: Number(productsData.length || 0),
        topProducts: topProducts || [],
        categoryBreakdown: categoryBreakdown || [],
        itemsSold: calculateTotalItemsSold(ordersData),
        inventoryTurnover: calculateInventoryTurnover(ordersData, productsData),
        
        peakHours: peakHours || [],
        customerSegments: [],
        seasonalTrends: [],
        performanceMetrics: performanceMetrics || [],
        
        // Calculate period-specific analytics based on selectedPeriod
        periodRevenue: selectedPeriod === 'daily' ? Number(dailyAnalytics.revenue || 0) :
                      selectedPeriod === 'weekly' ? Number(weeklyAnalytics.revenue || 0) :
                      selectedPeriod === 'monthly' ? Number(monthlyAnalytics.revenue || 0) :
                      Number(yearlyAnalytics.revenue || 0),
        periodOrders: selectedPeriod === 'daily' ? Number(dailyAnalytics.orderCount || 0) :
                     selectedPeriod === 'weekly' ? Number(weeklyAnalytics.orderCount || 0) :
                     selectedPeriod === 'monthly' ? Number(monthlyAnalytics.orderCount || 0) :
                     Number(yearlyAnalytics.orderCount || 0),
        periodAvgOrderValue: selectedPeriod === 'daily' ? Number(dailyAnalytics.avgOrderValue || 0) :
                            selectedPeriod === 'weekly' ? Number(weeklyAnalytics.avgOrderValue || 0) :
                            selectedPeriod === 'monthly' ? Number(monthlyAnalytics.avgOrderValue || 0) :
                            Number(yearlyAnalytics.avgOrderValue || 0),
        totalItems: selectedPeriod === 'daily' ? Number(dailyAnalytics.totalItems || 0) :
                   selectedPeriod === 'weekly' ? Number(weeklyAnalytics.totalItems || 0) :
                   selectedPeriod === 'monthly' ? Number(monthlyAnalytics.totalItems || 0) :
                   Number(yearlyAnalytics.totalItems || 0),
      });
      
      // Update chart data
      setChartData({
        revenueTrends: revenueTrends || [],
        orderTrends: orderTrends || [],
        productPerformance: productPerformance || [],
        comparisons: comparisons || [],
        insights: []
      });

      if (!isRefresh) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading advanced analytics:', error);
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
    loadAdvancedAnalytics(true);
  };

  // Helper Functions for Advanced Analytics
  const calculatePeriodAnalytics = (orders, period) => {
    if (!orders || !Array.isArray(orders)) {
      return { revenue: 0, orderCount: 0, avgOrderValue: 0, totalItems: 0, orders: [] };
    }

    let startDate, endDate;
    const now = new Date();
    
    switch (period) {
      case 'daily':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'monthly':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'yearly':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now);
        endDate.setHours(23, 59, 59, 999);
        break;
      default:
        return { revenue: 0, orderCount: 0, avgOrderValue: 0, totalItems: 0, orders: [] };
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
      
      return orderDate >= startDate && orderDate <= endDate;
    });
    
    const revenue = periodOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const orderCount = periodOrders.length;
    const avgOrderValue = orderCount > 0 ? Math.round(revenue / orderCount) : 0;
    const totalItems = periodOrders.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    }, 0);
    
    return {
      revenue,
      orderCount,
      avgOrderValue,
      totalItems,
      orders: periodOrders
    };
  };

  const calculateTopProducts = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const productSales = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.name || 'Unknown Product';
          if (!productSales[key]) {
            productSales[key] = { name: key, quantity: 0, revenue: 0 };
          }
          productSales[key].quantity += item.quantity || 1;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
    
    return Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  };

  const calculateCategoryBreakdown = (orders, products) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const categoryData = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const category = item.category || 'Uncategorized';
          if (!categoryData[category]) {
            categoryData[category] = { name: category, revenue: 0, quantity: 0 };
          }
          categoryData[category].revenue += (item.price || 0) * (item.quantity || 1);
          categoryData[category].quantity += item.quantity || 1;
        });
      }
    });
    
    return Object.values(categoryData).sort((a, b) => b.revenue - a.revenue);
  };

  const calculatePeakHours = (orders) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const hourlyData = {};
    
    orders.forEach(order => {
      let orderDate;
      if (order.timestamp) {
        orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else {
        return;
      }
      
      const hour = orderDate.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });
    
    return Object.entries(hourlyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        timeRange: `${hour}:00-${parseInt(hour)+1}:00`
      }));
  };

  const calculatePerformanceMetrics = (orders, products) => {
    if (!orders || !Array.isArray(orders) || !products || !Array.isArray(products)) return [];
    
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = products.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    return [
      { metric: 'Total Revenue', value: totalRevenue, format: 'currency' },
      { metric: 'Total Orders', value: totalOrders, format: 'number' },
      { metric: 'Total Products', value: totalProducts, format: 'number' },
      { metric: 'Avg Order Value', value: avgOrderValue, format: 'currency' }
    ];
  };

  const generateRevenueTrends = (orders, period) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const trendData = {};
    const now = new Date();
    
    orders.forEach(order => {
      let orderDate;
      if (order.timestamp) {
        orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else {
        return;
      }
      
      let key;
      switch (period) {
        case 'daily':
          key = orderDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = orderDate.getFullYear().toString();
          break;
        default:
          key = orderDate.toISOString().split('T')[0];
      }
      
      if (!trendData[key]) {
        trendData[key] = { period: key, revenue: 0, orders: 0 };
      }
      trendData[key].revenue += order.total || 0;
      trendData[key].orders += 1;
    });
    
    return Object.values(trendData).sort((a, b) => b.period.localeCompare(a.period));
  };

  const generateOrderTrends = (orders, period) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const trendData = {};
    
    orders.forEach(order => {
      let orderDate;
      if (order.timestamp) {
        orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        orderDate = new Date(order.createdAt);
      } else if (order.created_at) {
        orderDate = new Date(order.created_at);
      } else {
        return;
      }
      
      let key;
      switch (period) {
        case 'daily':
          key = orderDate.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(orderDate);
          weekStart.setDate(orderDate.getDate() - orderDate.getDay());
          key = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          key = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
          break;
        case 'yearly':
          key = orderDate.getFullYear().toString();
          break;
        default:
          key = orderDate.toISOString().split('T')[0];
      }
      
      if (!trendData[key]) {
        trendData[key] = { period: key, orders: 0, items: 0 };
      }
      trendData[key].orders += 1;
      if (order.items && Array.isArray(order.items)) {
        trendData[key].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    return Object.values(trendData).sort((a, b) => b.period.localeCompare(a.period));
  };

  const generateProductPerformance = (orders, products) => {
    if (!orders || !Array.isArray(orders) || !products || !Array.isArray(products)) return [];
    
    const productPerformance = {};
    
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.name || 'Unknown Product';
          if (!productPerformance[key]) {
            productPerformance[key] = {
              name: key,
              totalSold: 0,
              totalRevenue: 0,
              orderCount: 0
            };
          }
          productPerformance[key].totalSold += item.quantity || 1;
          productPerformance[key].totalRevenue += (item.price || 0) * (item.quantity || 1);
          productPerformance[key].orderCount += 1;
        });
      }
    });
    
    return Object.values(productPerformance)
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 20);
  };

  const generateComparisons = (orders, period) => {
    if (!orders || !Array.isArray(orders)) return [];
    
    const now = new Date();
    const currentPeriodData = calculatePeriodAnalytics(orders, period);
    
    // Calculate previous period for comparison
    let previousStartDate, previousEndDate;
    switch (period) {
      case 'daily':
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 1);
        previousStartDate.setHours(0, 0, 0, 0);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 1);
        previousEndDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 14);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 7);
        break;
      case 'monthly':
        previousStartDate = new Date(now);
        previousStartDate.setDate(now.getDate() - 60);
        previousEndDate = new Date(now);
        previousEndDate.setDate(now.getDate() - 30);
        break;
      case 'yearly':
        previousStartDate = new Date(now);
        previousStartDate.setFullYear(now.getFullYear() - 2);
        previousEndDate = new Date(now);
        previousEndDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return [];
    }
    
    const previousOrders = orders.filter(order => {
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
      
      return orderDate >= previousStartDate && orderDate <= previousEndDate;
    });
    
    const previousRevenue = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    const previousOrderCount = previousOrders.length;
    
    return [
      {
        metric: 'Revenue',
        current: currentPeriodData.revenue,
        previous: previousRevenue,
        change: calculateGrowthRate(currentPeriodData.revenue, previousRevenue)
      },
      {
        metric: 'Orders',
        current: currentPeriodData.orderCount,
        previous: previousOrderCount,
        change: calculateGrowthRate(currentPeriodData.orderCount, previousOrderCount)
      }
    ];
  };

  const calculateGrowthRate = (current, previous) => {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const calculateTotalItemsSold = (orders) => {
    if (!orders || !Array.isArray(orders)) return 0;
    
    return orders.reduce((total, order) => {
      if (!order.items || !Array.isArray(order.items)) return total;
      return total + order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }, 0);
  };

  const calculateInventoryTurnover = (orders, products) => {
    if (!orders || !Array.isArray(orders) || !products || !Array.isArray(products)) return 0;
    
    const totalItemsSold = calculateTotalItemsSold(orders);
    const totalInventory = products.reduce((sum, product) => sum + (product.stock || 0), 0);
    
    return totalInventory > 0 ? Math.round((totalItemsSold / totalInventory) * 100) / 100 : 0;
  };

  const applyFilters = () => {
    // Safety check: ensure orders is populated
    if (!orders || orders.length === 0) {
      console.log('📊 [AdvancedAnalytics] No orders data available for filtering');
      setFilteredData([]);
      return;
    }
    
    console.log('📊 [AdvancedAnalytics] Applying filters to', orders.length, 'orders');
    console.log('📊 [AdvancedAnalytics] Active filters:', {
      dateRange: dateRange.start || dateRange.end ? `${dateRange.start || 'any'} to ${dateRange.end || 'any'}` : 'none',
      category: categoryFilter !== 'all' ? categoryFilter : 'all categories',
      product: selectedProduct?.name || 'all products'
    });
    
    let filtered = [...orders];
    
    // Check if any filters are actually active
    const hasActiveFilters = dateRange.start || dateRange.end || categoryFilter !== 'all' || selectedProduct;
    
    if (!hasActiveFilters) {
      console.log('📊 [AdvancedAnalytics] No active filters, showing all orders');
      setFilteredData(filtered);
      return;
    }
    
    console.log('📊 [AdvancedAnalytics] Active filters detected, applying...');
    
    // Date range filter - Start date (beginning of day)
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(order => {
        // Handle multiple date field formats from backend
        let orderDate;
        if (order.timestamp) {
          // If timestamp is a number (Unix timestamp)
          orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
        } else if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else if (order.created_at) {
          orderDate = new Date(order.created_at);
        } else {
          console.warn('📊 Order missing date field for date filter:', order.id);
          return false; // Skip orders without date when date filter is active
        }
        
        const isValid = !isNaN(orderDate.getTime());
        if (!isValid) {
          console.warn('📊 Invalid date in order:', order.id, order.timestamp, order.createdAt);
          return false;
        }
        
        return orderDate >= startDate;
      });
    }
    
    // Date range filter - End date (end of day)
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        // Handle multiple date field formats from backend
        let orderDate;
        if (order.timestamp) {
          orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
        } else if (order.createdAt) {
          orderDate = new Date(order.createdAt);
        } else if (order.created_at) {
          orderDate = new Date(order.created_at);
        } else {
          return false; // Skip orders without date
        }
        
        const isValid = !isNaN(orderDate.getTime());
        if (!isValid) {
          return false;
        }
        
        return orderDate <= endDate;
      });
    }
    
    // Amount range filter removed for simplicity
    
    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => item.category === categoryFilter);
      });
    }
    
    // Product-specific filter - Fixed to use product name instead of ID
    if (selectedProduct) {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => 
          item.name && selectedProduct.name && 
          item.name.toLowerCase().includes(selectedProduct.name.toLowerCase())
        );
      });
    }
    
    console.log('📊 [AdvancedAnalytics] Filtered results:', filtered.length, 'orders');
    
    // Debug: Show sample filtered order structure
    if (filtered.length > 0) {
      console.log('📊 [AdvancedAnalytics] Sample filtered order:', {
        id: filtered[0].id,
        total: filtered[0].total,
        createdAt: filtered[0].createdAt,
        timestamp: filtered[0].timestamp,
        itemsCount: filtered[0].items?.length || 0,
        firstItem: filtered[0].items?.[0] || null
      });
    } else {
      console.log('📊 [AdvancedAnalytics] No orders passed filters - checking why...');
      if (orders.length > 0) {
        console.log('📊 [AdvancedAnalytics] Sample original order for comparison:', {
          id: orders[0].id,
          total: orders[0].total,
          createdAt: orders[0].createdAt,
          timestamp: orders[0].timestamp,
          itemsCount: orders[0].items?.length || 0
        });
      }
    }
    
    setFilteredData(filtered);
  };

  const generateDailyData = () => {
    if (!orders || orders.length === 0) {
      // Return empty data when no orders exist - no dummy data
      const emptyData = [];
      const now = new Date();
      
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        const dayName = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
        
        emptyData.push({
          date: date.toISOString().split('T')[0],
          revenue: 0,
          orders: 0,
          items: 0,
          label: dayName
        });
      }
      
      return emptyData;
    }
    
    const dailyMap = {};
    const now = new Date();
    
    // Create last 7 days with meaningful labels
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en', { weekday: 'short', day: 'numeric' });
      
      dailyMap[dateKey] = {
        date: dateKey,
        revenue: 0,
        orders: 0,
        items: 0,
        label: dayName
      };
    }
    
    // Add order data
    orders.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.createdAt || order.created_at);
      if (isNaN(orderDate.getTime())) return;
      
      const dateKey = orderDate.toISOString().split('T')[0];
      if (dailyMap[dateKey]) {
        dailyMap[dateKey].revenue += order.total || 0;
        dailyMap[dateKey].orders += 1;
        if (order.items) {
          dailyMap[dateKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
      }
    });
    
    return Object.values(dailyMap);
  };

  const generateWeeklyData = () => {
    if (!orders || orders.length === 0) {
      // Return empty data when no orders exist - no dummy data
      const emptyData = [];
      
      for (let i = 7; i >= 0; i--) {
        const weekNum = 8 - i;
        
        emptyData.push({
          week: `W${weekNum}`,
          revenue: 0,
          orders: 0,
          items: 0,
          label: `Week ${weekNum}`
        });
      }
      
      return emptyData;
    }
    
    const weeklyMap = {};
    const now = new Date();
    
    // Create last 8 weeks with meaningful labels
    for (let i = 7; i >= 0; i--) {
      const weekNum = 8 - i;
      const weekKey = `W${weekNum}`;
      weeklyMap[weekKey] = {
        week: weekKey,
        revenue: 0,
        orders: 0,
        items: 0,
        label: `Week ${weekNum}`
      };
    }
    
    // Add order data
    orders.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.createdAt || order.created_at);
      if (isNaN(orderDate.getTime())) return;
      
      const weeksDiff = Math.floor((now - orderDate) / (7 * 24 * 60 * 60 * 1000));
      const weekKey = `W${Math.max(1, 8 - weeksDiff)}`;
      
      if (weeklyMap[weekKey]) {
        weeklyMap[weekKey].revenue += order.total || 0;
        weeklyMap[weekKey].orders += 1;
        if (order.items) {
          weeklyMap[weekKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
      }
    });
    
    return Object.values(weeklyMap);
  };

  const generateMonthlyData = () => {
    if (!orders || orders.length === 0) {
      // Return empty data when no orders exist - no dummy data
      const emptyData = [];
      const now = new Date();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = months[date.getMonth()];
        const year = date.getFullYear().toString().slice(-2);
        
        emptyData.push({
          month: monthName,
          revenue: 0,
          orders: 0,
          items: 0,
          label: `${monthName} '${year}`
        });
      }
      
      return emptyData;
    }
    
    const monthlyMap = {};
    const currentDate = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Create last 12 months with meaningful labels
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = months[date.getMonth()];
      const year = date.getFullYear().toString().slice(-2);
      
      monthlyMap[monthName] = {
        month: monthName,
        revenue: 0,
        orders: 0,
        items: 0,
        label: `${monthName} '${year}`
      };
    }
    
    // Add order data
    orders.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.createdAt || order.created_at);
      if (isNaN(orderDate.getTime())) return;
      
      const monthName = months[orderDate.getMonth()];
      if (monthlyMap[monthName]) {
        monthlyMap[monthName].revenue += order.total || 0;
        monthlyMap[monthName].orders += 1;
        if (order.items) {
          monthlyMap[monthName].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
      }
    });
    
    return Object.values(monthlyMap);
  };

  const generateYearlyData = () => {
    if (!orders || orders.length === 0) {
      // Return empty data when no orders exist - no dummy data
      const emptyData = [];
      const now = new Date();
      
      for (let i = 4; i >= 0; i--) {
        const year = (now.getFullYear() - i).toString();
        
        emptyData.push({
          year: year,
          revenue: 0,
          orders: 0,
          items: 0,
          label: year
        });
      }
      
      return emptyData;
    }
    
    const yearlyMap = {};
    const now = new Date();
    
    // Create last 5 years
    for (let i = 4; i >= 0; i--) {
      const year = (now.getFullYear() - i).toString();
      yearlyMap[year] = {
        year: year,
        revenue: 0,
        orders: 0,
        items: 0,
        label: year
      };
    }
    
    // Add order data
    orders.forEach((order) => {
      const orderDate = new Date(order.timestamp || order.createdAt || order.created_at);
      if (isNaN(orderDate.getTime())) return;
      
      const yearKey = orderDate.getFullYear().toString();
      if (yearlyMap[yearKey]) {
        yearlyMap[yearKey].revenue += order.total || 0;
        yearlyMap[yearKey].orders += 1;
        if (order.items) {
          yearlyMap[yearKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
        }
      }
    });
    
    return Object.values(yearlyMap);
  };



  const getCategories = () => {
    const categories = new Set();
    products.forEach(product => {
      if (product.category) {
        categories.add(product.category);
      }
    });
    return ['all', ...Array.from(categories)];
  };

  const clearFilters = () => {
    setDateRange({ start: null, end: null });
    setCategoryFilter('all');
    setSelectedProduct(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };



  const generateComprehensiveAnalytics = () => {
    console.log('📊 [AdvancedAnalytics] Generating comprehensive analytics data...');
    
    // Generate all analytics data based on current view and filters
    const viewData = {
      daily: generateDailyData(),
      weekly: generateWeeklyData(),
      monthly: generateMonthlyData(),
      yearly: generateYearlyData()
    };
    
    // Calculate overall metrics
    const totalRevenue = filteredData.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = filteredData.length;
    const totalItems = filteredData.reduce((sum, order) => {
      if (!order.items || !Array.isArray(order.items)) return sum;
      return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
    }, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Product analysis
    const productSales = {};
    filteredData.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.name || 'Unknown Product';
          if (!productSales[key]) {
            productSales[key] = { name: key, quantity: 0, revenue: 0 };
          }
          productSales[key].quantity += item.quantity || 1;
          productSales[key].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });
    
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Category analysis
    const categoryData = {};
    filteredData.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const category = item.category || 'Uncategorized';
          if (!categoryData[category]) {
            categoryData[category] = { revenue: 0, quantity: 0 };
          }
          categoryData[category].revenue += (item.price || 0) * (item.quantity || 1);
          categoryData[category].quantity += item.quantity || 1;
        });
      }
    });
    
    // Payment method analysis - Cash and UPI/QR only (Card payments removed)
    const paymentMethods = {
      cash: filteredData.filter(o => {
        const method = (o.paymentMethod || o.payment_method || '').toLowerCase();
        return method.includes('cash');
      }).length,
      upi: filteredData.filter(o => {
        const method = (o.paymentMethod || o.payment_method || '').toLowerCase();
        return method.includes('upi') || method.includes('qr') || method.includes('gpay') || 
               method.includes('phonepe') || method.includes('paytm') || method.includes('bhim') ||
               method.includes('google pay') || method.includes('phone pe');
      }).length
    };
    
    // Time-based analysis
    const hourlyData = {};
    const dailyData = {};
    filteredData.forEach(order => {
      const orderDate = new Date(order.timestamp || order.createdAt);
      const hour = orderDate.getHours();
      const dayName = orderDate.toLocaleDateString('en', { weekday: 'long' });
      
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      dailyData[dayName] = (dailyData[dayName] || 0) + 1;
    });
    
    const peakHours = Object.entries(hourlyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([hour, count]) => ({ hour: parseInt(hour), count, timeRange: `${hour}:00-${parseInt(hour)+1}:00` }));
    
    const peakDays = Object.entries(dailyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 7)
      .map(([day, count]) => ({ day, count }));
    
    return {
      period: selectedPeriod,
      dateRange: dateRange,
      categoryFilter: categoryFilter,
      selectedProduct: selectedProduct,
      viewData: viewData,
      summary: {
        totalRevenue,
        totalOrders,
        totalItems,
        avgOrderValue
      },
      topProducts,
      categoryData: Object.entries(categoryData).map(([name, data]) => ({ name, ...data })),
      paymentMethods,
      peakHours,
      peakDays,
      filteredOrdersCount: filteredData.length,
      totalOrdersCount: orders.length,
      generatedAt: new Date().toISOString()
    };
  };

  const handlePDFExport = async () => {
    if (orders.length === 0) {
      Alert.alert('No Data', 'No orders available to generate analytics report.');
      return;
    }

    setIsExportingPDF(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('📄 [AdvancedAnalytics] Generating detailed analytics PDF...');
      
      // Generate comprehensive analytics data
      const analyticsData = generateComprehensiveAnalytics();
      
      // Generate detailed PDF
      const result = await generateDetailedAnalyticsPDF(analyticsData);

      Alert.alert(
        'Analytics Report Generated!',
        `${result.filename} has been generated successfully!\n\nChoose how you'd like to save or share your report:`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Save to Device', 
            onPress: async () => {
              try {
                await saveAnalyticsPDFToDevice(result);
                Alert.alert(
                  'Report Saved!',
                  `${result.filename} has been saved to your device. You can find it in your Files app or Downloads folder.`
                );
              } catch (saveError) {
                console.error('Save error:', saveError);
                Alert.alert('Save Failed', 'Could not save the PDF report. Please try again.');
              }
            }
          },
          {
            text: 'Share Report',
            onPress: async () => {
              try {
                await shareAnalyticsPDF(result.uri, result.filename);
                Alert.alert(
                  'Report Shared!',
                  `${result.filename} has been shared successfully. You can save it to files or send via email/messaging apps.`
                );
              } catch (shareError) {
                console.error('Share error:', shareError);
                Alert.alert('Share Failed', 'Could not share the PDF report. Please try again.');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('PDF export error:', error);
      Alert.alert('Export Error', 'Failed to generate detailed analytics report');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const generateDetailedAnalyticsPDF = async (analyticsData) => {
    const { printToFileAsync } = await import('expo-print');
    
    // Get store information from context (synchronous now)
    const storeInfo = getStoreInfo();
    
    // Generate comprehensive HTML
    const htmlContent = generateDetailedAnalyticsHTML(storeInfo, analyticsData);
    
    // Generate PDF with custom filename
    const dateString = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const filename = `FlowPOS_Detailed_Analytics_${dateString}.pdf`;
    
    const { uri } = await printToFileAsync({
      html: htmlContent,
      base64: false,
      margins: {
        left: 40,
        top: 40,
        right: 40,
        bottom: 40,
      },
    });

    return { uri, filename };
  };

  const shareAnalyticsPDF = async (uri, filename) => {
    const { isAvailableAsync, shareAsync } = await import('expo-sharing');
    
    if (await isAvailableAsync()) {
      await shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Detailed Analytics Report',
        UTI: 'com.adobe.pdf'
      });
    }
  };

  const saveAnalyticsPDFToDevice = async (reportResult) => {
    try {
      console.log('💾 [AdvancedAnalytics] Saving report to device:', reportResult.filename);
      
      const { isAvailableAsync, shareAsync } = await import('expo-sharing');
      
      if (await isAvailableAsync()) {
        await shareAsync(reportResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${reportResult.filename}`,
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ [AdvancedAnalytics] Report saved to device successfully');
        return true;
      } else {
        throw new Error('Sharing/saving is not available on this device');
      }
    } catch (error) {
      console.error('❌ [AdvancedAnalytics] Error saving report to device:', error);
      throw error;
    }
  };

  const getStoreInfo = () => {
    try {
      // Get store info from context instead of AsyncStorage
      const storeProfile = getStoreProfile();
      // Phone and email come from AuthContext (user-bound)
      const storePhone = user?.phone || '';
      const storeEmail = user?.email || '';
      
      return {
        name: storeProfile.store_name || 'FlowPOS Store',
        address: storeProfile.store_address || 'Store Address',
        phone: storePhone || '+91 XXXXXXXXXX',
        email: storeEmail || '',
        gstNumber: storeProfile.gst_number || ''
      };
    } catch (error) {
      console.error('Error getting store info:', error);
    }
    
    return {
      name: 'FlowPOS Store',
      address: 'Store Address',
      phone: '+91 XXXXXXXXXX',
      email: '',
      gstNumber: ''
    };
  };

  const generateDetailedAnalyticsHTML = (storeInfo, data) => {
    const formatCurrency = (amount) => `₹${parseFloat(amount || 0).toFixed(2)}`;
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-IN');
    
    // FIXED: Generate period analysis rows with safety checks
    const viewDataForPeriod = data.viewData && data.viewData[data.period] ? data.viewData[data.period] : [];
    const periodRows = viewDataForPeriod.slice(0, 20).map(item => {
      let periodLabel = '';
      try {
        if (data.period === 'daily') {
          periodLabel = formatDate(item.date);
        } else if (data.period === 'weekly') {
          periodLabel = `Week of ${formatDate(item.weekStart)}`;
        } else if (data.period === 'monthly') {
          const [year, month] = (item.month || '2024-01').split('-');
          periodLabel = new Date(year, parseInt(month) - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
        } else if (data.period === 'yearly') {
          periodLabel = item.year || new Date().getFullYear();
        }
      } catch (error) {
        console.warn('Period label generation error:', error);
        periodLabel = `Period ${periodRows.length + 1}`;
      }
      
      return `
        <tr>
          <td>${periodLabel}</td>
          <td>${formatCurrency(item.revenue || item.totalRevenue || 0)}</td>
          <td>${item.orders || item.orderCount || 0}</td>
          <td>${item.items || item.totalQuantity || 0}</td>
          <td>${formatCurrency((item.orders || item.orderCount) > 0 ? (item.revenue || item.totalRevenue || 0) / (item.orders || item.orderCount) : 0)}</td>
        </tr>
      `;
    }).join('');

    // FIXED: Generate top products rows with safety checks
    const topProductsRows = (data.topProducts || []).map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${product.name || 'Unknown Product'}</td>
        <td>${product.quantity || 0}</td>
        <td>${formatCurrency(product.revenue || 0)}</td>
        <td>${data.summary && data.summary.totalRevenue > 0 ? (((product.revenue || 0) / data.summary.totalRevenue) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');

    // FIXED: Generate category rows with safety checks
    const categoryRows = (data.categoryData || []).sort((a, b) => (b.revenue || 0) - (a.revenue || 0)).map(category => `
      <tr>
        <td>${category.name || 'Unknown Category'}</td>
        <td>${category.quantity || 0}</td>
        <td>${formatCurrency(category.revenue || 0)}</td>
        <td>${data.summary && data.summary.totalRevenue > 0 ? (((category.revenue || 0) / data.summary.totalRevenue) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');

    // FIXED: Generate peak hours rows with safety checks
    const peakHoursRows = (data.peakHours || []).map((hour, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${hour.timeRange || 'Unknown Time'}</td>
        <td>${hour.count || 0}</td>
        <td>${data.summary && data.summary.totalOrders > 0 ? (((hour.count || 0) / data.summary.totalOrders) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');

    // FIXED: Generate peak days rows with safety checks
    const peakDaysRows = (data.peakDays || []).map((day, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${day.day || 'Unknown Day'}</td>
        <td>${day.count || 0}</td>
        <td>${data.summary && data.summary.totalOrders > 0 ? (((day.count || 0) / data.summary.totalOrders) * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>FlowPOS Detailed Analytics Report</title>
        <style>
          @page {
            margin: 60px 40px;
          }
          
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            color: #333;
            line-height: 1.6;
          }
          .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 40px;
            box-sizing: border-box;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .store-name {
            font-size: 28px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .store-details {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
          }
          .report-title {
            font-size: 24px;
            font-weight: bold;
            color: #1f2937;
            margin: 20px 0 10px 0;
          }
          .section {
            margin-bottom: 40px;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
            border-bottom: 2px solid #2563eb;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
          }
          .metric-card {
            background: #eff6ff;
            border: 1px solid #2563eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          .metric-label {
            font-size: 14px;
            color: #64748b;
            font-weight: 500;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .data-table th,
          .data-table td {
            border: 1px solid #e2e8f0;
            padding: 12px;
            text-align: left;
          }
          .data-table th {
            background-color: #2563eb;
            font-weight: 600;
            color: #ffffff;
          }
          .data-table tr:nth-child(even) {
            background-color: #eff6ff;
          }

          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            font-size: 12px;
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <!-- Header -->
          <div class="header">
          <div class="store-name">${storeInfo.name}</div>
          <div class="store-details">
            ${storeInfo.address}<br>
            ${storeInfo.phone}${storeInfo.email ? ' • ' + storeInfo.email : ''}
            ${storeInfo.gstNumber ? '<br>GST: ' + storeInfo.gstNumber : ''}
          </div>
          <div class="report-title">Detailed Analytics Report</div>
          <div style="font-size: 16px; color: #6b7280;">
            Generated on: ${formatDate(data.generatedAt || new Date().toISOString())}<br>
            Analysis Period: ${(data.period || 'daily').charAt(0).toUpperCase() + (data.period || 'daily').slice(1)}
          </div>
        </div>



        <!-- Executive Summary -->
        <div class="section">
          <div class="section-title">Executive Summary</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${formatCurrency((data.summary && data.summary.totalRevenue) || 0)}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${(data.summary && data.summary.totalOrders) || 0}</div>
              <div class="metric-label">Total Orders</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${(data.summary && data.summary.totalItems) || 0}</div>
              <div class="metric-label">Items Sold</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${formatCurrency((data.summary && data.summary.avgOrderValue) || 0)}</div>
              <div class="metric-label">Avg Order Value</div>
            </div>
          </div>
        </div>

        <!-- Period Analysis -->
        <div class="section">
          <div class="section-title">${(data.period || 'daily').charAt(0).toUpperCase() + (data.period || 'daily').slice(1)} Analysis</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Revenue</th>
                <th>Orders</th>
                <th>Items</th>
                <th>Avg Order</th>
              </tr>
            </thead>
            <tbody>
              ${periodRows}
            </tbody>
          </table>
        </div>

        <!-- Top Products -->
        <div class="section">
          <div class="section-title">Top Performing Products</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Product Name</th>
                <th>Quantity Sold</th>
                <th>Revenue</th>
                <th>% of Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${topProductsRows}
            </tbody>
          </table>
        </div>

        <!-- Category Analysis -->
        <div class="section">
          <div class="section-title">Category Performance</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Items Sold</th>
                <th>Revenue</th>
                <th>% of Total Revenue</th>
              </tr>
            </thead>
            <tbody>
              ${categoryRows}
            </tbody>
          </table>
        </div>

        <!-- Payment Methods -->
        <div class="section">
          <div class="section-title">Payment Methods Distribution</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${(data.paymentMethods && data.paymentMethods.cash) || 0}</div>
              <div class="metric-label">Cash Payments</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${(data.paymentMethods && data.paymentMethods.upi) || 0}</div>
              <div class="metric-label">UPI/QR Payments</div>
            </div>
          </div>
        </div>

        <!-- Peak Hours -->
        <div class="section">
          <div class="section-title">Peak Business Hours</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Time Range</th>
                <th>Orders</th>
                <th>% of Total Orders</th>
              </tr>
            </thead>
            <tbody>
              ${peakHoursRows}
            </tbody>
          </table>
        </div>

        <!-- Peak Days -->
        <div class="section">
          <div class="section-title">Peak Business Days</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Day</th>
                <th>Orders</th>
                <th>% of Total Orders</th>
              </tr>
            </thead>
            <tbody>
              ${peakDaysRows}
            </tbody>
          </table>
        </div>

        <!-- Footer -->
        <div class="footer">
          <p>This detailed report was generated by FlowPOS Advanced Analytics</p>
          <p>Report contains comprehensive business analytics and insights</p>
          <p>Generated on: ${new Date(data.generatedAt || new Date().toISOString()).toLocaleString('en-IN')}</p>
        </div>
        </div>
      </body>
      </html>
    `;
  };

  const getViewIcon = (view) => {
    const icons = {
      daily: 'calendar',
      weekly: 'calendar-outline',
      monthly: 'calendar-number',
      yearly: 'calendar-sharp'
    };
    return icons[view] || 'analytics';
  };

  const getViewLabel = (view) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly'
    };
    return labels[view] || view;
  };

  const renderFilterButton = () => {
    const hasActiveFilters = dateRange.start || dateRange.end || categoryFilter !== 'all' || selectedProduct;
    
    return (
      <TouchableOpacity
        style={styles.filterButton}
        onPress={() => {
          setShowFilterModal(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        <Ionicons name="funnel" size={18} color={colors.background.surface} />
        <Text style={styles.filterButtonText}>Filter</Text>
        {hasActiveFilters && (
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>●</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFilterModal = () => (
    <Modal
      visible={showFilterModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Filter Your Data</Text>
              <Text style={styles.modalSubtitle}>Customize what you want to see</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowFilterModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close-circle" size={28} color={colors.text.tertiary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Date Range Filter - Quick Presets */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelContainer}>
                <Ionicons name="calendar" size={20} color={colors.primary.main} />
                <Text style={styles.filterLabel}>Select Time Period</Text>
              </View>
              <Text style={styles.filterDescription}>Choose when you want to see data from</Text>
              <View style={styles.datePresetsContainer}>
                <TouchableOpacity
                  style={[styles.datePresetButton, !dateRange.start && !dateRange.end && styles.datePresetButtonActive]}
                  onPress={() => {
                    setDateRange({ start: null, end: null });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={[styles.datePresetText, !dateRange.start && !dateRange.end && styles.datePresetTextActive]}>
                    All Time
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    setDateRange({ start: today, end: new Date() });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.datePresetText}>Today</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const today = new Date();
                    const last7Days = new Date(today);
                    last7Days.setDate(last7Days.getDate() - 7);
                    setDateRange({ start: last7Days, end: today });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.datePresetText}>Last 7 Days</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const today = new Date();
                    const last30Days = new Date(today);
                    last30Days.setDate(last30Days.getDate() - 30);
                    setDateRange({ start: last30Days, end: today });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.datePresetText}>Last 30 Days</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const today = new Date();
                    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                    setDateRange({ start: firstDayOfMonth, end: today });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.datePresetText}>This Month</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.datePresetButton}
                  onPress={() => {
                    const today = new Date();
                    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
                    setDateRange({ start: firstDayOfYear, end: today });
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Text style={styles.datePresetText}>This Year</Text>
                </TouchableOpacity>
              </View>
              
              {(dateRange.start || dateRange.end) && (
                <View style={styles.selectedDateRange}>
                  <Text style={styles.selectedDateRangeText}>
                    {dateRange.start ? dateRange.start.toLocaleDateString() : 'Start'} - {dateRange.end ? dateRange.end.toLocaleDateString() : 'End'}
                  </Text>
                </View>
              )}
            </View>

            {/* Category Filter */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelContainer}>
                <Ionicons name="grid" size={20} color={colors.primary.main} />
                <Text style={styles.filterLabel}>Product Category</Text>
              </View>
              <Text style={styles.filterDescription}>Filter by type of products</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryContainer}>
                  {getCategories().map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryChip,
                        categoryFilter === category && styles.categoryChipActive
                      ]}
                      onPress={() => {
                        setCategoryFilter(category);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.categoryChipText,
                        categoryFilter === category && styles.categoryChipTextActive
                      ]}>
                        {category === 'all' ? 'All Categories' : category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Amount Range Filter removed for simplicity */}

            {/* Product Filter */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelContainer}>
                <Ionicons name="cube" size={20} color={colors.primary.main} />
                <Text style={styles.filterLabel}>Choose Specific Product</Text>
              </View>
              <Text style={styles.filterDescription}>See data for one product only</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.productContainer}>
                  <TouchableOpacity
                    style={[
                      styles.productChip,
                      !selectedProduct && styles.productChipActive
                    ]}
                    onPress={() => {
                      setSelectedProduct(null);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <Text style={[
                      styles.productChipText,
                      !selectedProduct && styles.productChipTextActive
                    ]}>
                      All Products
                    </Text>
                  </TouchableOpacity>
                  
                  {products.slice(0, 20).map(product => (
                    <TouchableOpacity
                      key={product.id}
                      style={[
                        styles.productChip,
                        selectedProduct?.id === product.id && styles.productChipActive
                      ]}
                      onPress={() => {
                        setSelectedProduct(product);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                    >
                      <Text style={[
                        styles.productChipText,
                        selectedProduct?.id === product.id && styles.productChipTextActive
                      ]}>
                        {product.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                clearFilters();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="refresh-circle" size={20} color={colors.text.secondary} />
              <Text style={styles.clearButtonText}>Reset All Filters</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                console.log('📊 [AdvancedAnalytics] Applying filters and closing modal');
                setShowFilterModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.background.surface} />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const renderDataCard = (item, index) => {
    // Simplified data card rendering
    let title, subtitle, revenue, orders, items;
    
    try {
      revenue = Number(item.revenue || 0);
      orders = Number(item.orders || 0);
      items = Number(item.items || 0);
      
      title = item.label || `Period ${index + 1}`;
      subtitle = selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1) + ' Data';
    } catch (error) {
      console.warn('📊 [AdvancedAnalytics] Error rendering data card:', error);
      title = `Period ${index + 1}`;
      subtitle = 'Data Period';
      revenue = 0;
      orders = 0;
      items = 0;
    }

    return (
      <View key={index} style={styles.dataCard}>
        <View style={styles.dataCardHeader}>
          <View style={styles.dataCardTitleContainer}>
            <Text style={styles.dataCardTitle}>{title}</Text>
            <Text style={styles.dataCardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.dataCardRevenue}>
            <Text style={styles.dataCardRevenueAmount}>₹{revenue.toFixed(0)}</Text>
          </View>
        </View>
        
        <View style={styles.dataCardStats}>
          <View style={styles.dataCardStat}>
            <Ionicons name="receipt-outline" size={16} color={colors.primary.main} />
            <Text style={styles.dataCardStatLabel}>Orders</Text>
            <Text style={styles.dataCardStatValue}>{orders}</Text>
          </View>
          
          <View style={styles.dataCardStat}>
            <Ionicons name="cube-outline" size={16} color={colors.success.main} />
            <Text style={styles.dataCardStatLabel}>Items</Text>
            <Text style={styles.dataCardStatValue}>{items}</Text>
          </View>
          
          <View style={styles.dataCardStat}>
            <Ionicons name="trending-up-outline" size={16} color={colors.warning.main} />
            <Text style={styles.dataCardStatLabel}>Avg</Text>
            <Text style={styles.dataCardStatValue}>
              ₹{orders > 0 ? (revenue / orders).toFixed(0) : 0}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const StatCard = ({ title, value, subtitle, color = colors.text.primary, index }) => (
    <View style={styles.statCard}>
      <Text style={styles.statTitle}>{title}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      {subtitle && <Text style={styles.statSubtitle}>{subtitle}</Text>}
    </View>
  );

  const renderSummaryCards = () => {
    // FIXED: Enhanced safety checks for view data calculation
    let viewData = [];
    let periodLabel = '';
    
    try {
      switch (selectedPeriod) {
        case 'daily':
          viewData = generateDailyData();
          periodLabel = 'Today';
          break;
        case 'weekly':
          viewData = generateWeeklyData();
          periodLabel = 'This Week';
          break;
        case 'monthly':
          viewData = generateMonthlyData();
          periodLabel = 'This Month';
          break;
        case 'yearly':
          viewData = generateYearlyData();
          periodLabel = 'This Year';
          break;
        default:
          // Fallback to total filtered data with enhanced safety
          const totalRevenue = filteredData.reduce((sum, order) => {
            return sum + Number(order.total || order.revenue || 0);
          }, 0);
          const totalOrders = filteredData.length;
          const totalItems = filteredData.reduce((sum, order) => {
            if (!order.items || !Array.isArray(order.items)) return sum;
            return sum + order.items.reduce((itemSum, item) => {
              return itemSum + Number(item.quantity || 0);
            }, 0);
          }, 0);
          const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          
          const summaryData = [
            {
              icon: 'cash',
              iconColor: colors.success.main,
              iconBg: colors.success.background,
              value: `₹${totalRevenue.toFixed(0)}`,
              label: 'Total Sales',
            },
            {
              icon: 'receipt',
              iconColor: colors.primary.main,
              iconBg: colors.primary.background,
              value: totalOrders.toString(),
              label: 'Orders',
            },
            {
              icon: 'cube',
              iconColor: colors.warning.main,
              iconBg: colors.warning.background,
              value: totalItems.toString(),
              label: 'Items Sold',
            },
            {
              icon: 'trending-up',
              iconColor: colors.info.main,
              iconBg: colors.info.background,
              value: `₹${avgOrderValue.toFixed(0)}`,
              label: 'Avg Order',
            },
          ];
          
          return (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.summaryContainer}
            >
              {summaryData.map((item, index) => (
                <View key={index} style={styles.summaryCard}>
                  <View style={[styles.summaryIconContainer, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </View>
              ))}
            </ScrollView>
          );
      }
    } catch (error) {
      console.error('📊 [AdvancedAnalytics] Error generating view data:', error);
      viewData = [];
      periodLabel = 'Period';
    }
    
    // FIXED: Enhanced safety checks for totals calculation
    const totalRevenue = viewData.reduce((sum, item) => {
      return sum + Number(item.revenue || item.totalRevenue || 0);
    }, 0);
    const totalOrders = viewData.reduce((sum, item) => {
      return sum + Number(item.orders || item.orderCount || 0);
    }, 0);
    const totalItems = viewData.reduce((sum, item) => {
      return sum + Number(item.items || item.totalQuantity || item.totalItems || 0);
    }, 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // FIXED: Enhanced safety checks for current period data
    const currentPeriodData = viewData.length > 0 ? viewData[0] : null;
    const currentRevenue = currentPeriodData ? Number(currentPeriodData.revenue || currentPeriodData.totalRevenue || 0) : 0;
    const currentOrders = currentPeriodData ? Number(currentPeriodData.orders || currentPeriodData.orderCount || 0) : 0;
    const currentItems = currentPeriodData ? Number(currentPeriodData.items || currentPeriodData.totalQuantity || currentPeriodData.totalItems || 0) : 0;
    const currentAvg = currentOrders > 0 ? currentRevenue / currentOrders : 0;

    const summaryData = [
      {
        icon: 'cash',
        iconColor: colors.success.main,
        iconBg: colors.success.background,
        value: `₹${currentRevenue.toFixed(0)}`,
        label: `${periodLabel} Sales`,
      },
      {
        icon: 'receipt',
        iconColor: colors.primary.main,
        iconBg: colors.primary.background,
        value: currentOrders.toString(),
        label: `${periodLabel} Orders`,
      },
      {
        icon: 'cube',
        iconColor: colors.warning.main,
        iconBg: colors.warning.background,
        value: currentItems.toString(),
        label: `${periodLabel} Items`,
      },
      {
        icon: 'trending-up',
        iconColor: colors.info.main,
        iconBg: colors.info.background,
        value: `₹${currentAvg.toFixed(0)}`,
        label: `${periodLabel} Avg`,
      },
    ];

    return (
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryContainer}
      >
        {summaryData.map((item, index) => (
          <View key={index} style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={18} color={item.iconColor} />
            </View>
            <Text style={styles.summaryValue}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </ScrollView>
    );
  };

  const renderContent = () => {
    console.log('📊 [AdvancedAnalytics] renderContent called, selectedPeriod:', selectedPeriod, 'filteredData:', filteredData.length);
    
    let data = [];
    
    try {
      switch (selectedPeriod) {
        case 'daily':
          data = generateDailyData();
          break;
        case 'weekly':
          data = generateWeeklyData();
          break;
        case 'monthly':
          data = generateMonthlyData();
          break;
        case 'yearly':
          data = generateYearlyData();
          break;
        default:
          data = [];
      }
    } catch (error) {
      console.error('📊 [AdvancedAnalytics] Error generating data:', error);
      data = [];
    }
    
    console.log('📊 [AdvancedAnalytics] Generated data for', selectedPeriod, ':', data.length, 'items');

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <NoDataChart 
            height={200} 
            message={filteredData.length === 0 
              ? 'Start making sales to see your analytics here'
              : 'No results match your filters. Try changing them.'
            } 
          />
          {filteredData.length > 0 && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => {
                clearFilters();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            >
              <Ionicons name="refresh" size={18} color={colors.background.surface} />
              <Text style={styles.emptyButtonText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Enhanced safety checks for all property access
    const chartData = data.map((item, index) => {
      const safeItem = {
        ...item,
        revenue: Number(item.revenue || 0),
        orders: Number(item.orders || 0),
        items: Number(item.items || 0),
        label: item.label || `Item ${index + 1}`,
        value: Number(item.revenue || 0)
      };
      return safeItem;
    });

    // Enhanced product sales data generation with safety checks
    const productSales = {};
    
    try {
      filteredData.forEach((order, orderIndex) => {
        if (order && order.items && Array.isArray(order.items)) {
          order.items.forEach((item, itemIndex) => {
            try {
              const key = item.name || `Unknown Product ${itemIndex + 1}`;
              if (!productSales[key]) {
                productSales[key] = { name: key, quantity: 0, revenue: 0 };
              }
              productSales[key].quantity += Number(item.quantity || 1);
              productSales[key].revenue += Number(item.price || 0) * Number(item.quantity || 1);
            } catch (itemError) {
              console.warn('📊 [AdvancedAnalytics] Error processing item:', itemError, 'Order:', orderIndex, 'Item:', itemIndex);
            }
          });
        }
      });
    } catch (productError) {
      console.error('📊 [AdvancedAnalytics] Error generating product sales data:', productError);
    }

    const sortedProducts = Object.values(productSales)
      .filter(product => product.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return (
      <View style={styles.chartsContainer}>
        {/* Orders Trend - Bar Chart showing ORDER COUNT */}
        <View style={styles.consistentChartCard}>
          <Text style={styles.chartTitle}>Orders Trend</Text>
          <Text style={styles.chartSubtitle}>Number of orders per period</Text>
          <BarChart 
            data={chartData.map(item => ({ 
              ...item, 
              value: item.orders, // Explicitly set value to orders count
            }))}
            height={200}
            color={colors.success.main}
            showValues={true}
            largeMode={true}
          />
        </View>

        {/* Items Sold - Bar Chart showing ITEM QUANTITY */}
        <View style={styles.consistentChartCard}>
          <Text style={styles.chartTitle}>Items Sold</Text>
          <Text style={styles.chartSubtitle}>Total quantity of items sold</Text>
          <BarChart 
            data={chartData.map(item => ({ 
              ...item, 
              value: item.items, // Explicitly set value to items count
            }))}
            height={200}
            color={colors.warning.main}
            showValues={true}
            largeMode={true}
          />
        </View>

        {/* Average Order Value - Horizontal Bar Chart */}
        <View style={styles.consistentChartCard}>
          <Text style={styles.chartTitle}>Avg Order Value</Text>
          <Text style={styles.chartSubtitle}>Average value per order</Text>
          <HorizontalBarChart 
            data={chartData.map(item => {
              const avgValue = item.orders > 0 ? Math.round(item.revenue / item.orders) : 0;
              return { 
                ...item, 
                value: avgValue, // Calculated average
              };
            })}
            height={180}
            color={colors.info.main}
            valuePrefix="₹"
            largeMode={true}
          />
        </View>

        {/* Top Products Distribution - Pie Chart */}
        {sortedProducts.length > 0 && (
          <View style={styles.consistentChartCard}>
            <Text style={styles.chartTitle}>Top Products Distribution</Text>
            <Text style={styles.chartSubtitle}>Best performing products by revenue</Text>
            <PieChart 
              data={sortedProducts.map(product => ({
                name: product.name,
                value: product.revenue,
                quantity: product.quantity
              }))}
              size={140}
              showLegend={true}
              centerText="Top 5"
            />
          </View>
        )}

        {/* Performance Comparison */}
        {data.length > 0 && (
          <View style={styles.consistentChartCard}>
            <Text style={styles.chartTitle}>Revenue Comparison</Text>
            <Text style={styles.chartSubtitle}>Last 4 periods revenue</Text>
            <ProgressChart 
              data={data.slice(-4).map((item, index) => {
                const maxRevenue = Math.max(...data.slice(-4).map(d => Number(d.revenue || 0)));
                let shortLabel = item.label || `P${index + 1}`;
                // Use short day labels only
                if (shortLabel.includes(' ')) {
                  shortLabel = shortLabel.split(' ')[0];
                }
                if (shortLabel.length > 5) shortLabel = shortLabel.substring(0, 4);
                
                return {
                  label: shortLabel,
                  value: `₹${Number(item.revenue || 0).toFixed(0)}`,
                  percentage: maxRevenue > 0 ? Math.min((Number(item.revenue || 0) / maxRevenue) * 100, 100) : 0,
                  color: [colors.primary.main, colors.success.main, colors.warning.main, colors.info.main][index % 4],
                };
              })}
              height={180}
              largeMode={true}
            />
          </View>
        )}

        {/* Detailed Breakdown */}
        <View style={styles.dataCardsContainer}>
          <Text style={styles.dataCardsTitle}>Detailed Breakdown</Text>
          <Text style={styles.dataCardsSubtitle}>
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)} performance breakdown
          </Text>
          {data.slice(0, 10).map((item, index) => renderDataCard(item, index))}
        </View>
      </View>
    );
  };









  return (
    <SafeAreaView style={styles.container}>
      {isLoading && <LoadingSpinner />}
      {isExportingPDF && <LoadingSpinner />}
      
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header} ref={headerRef}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => safeGoBack(navigation, 'Manage')}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.title}>Advanced Analytics</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.pdfButton}
              onPress={handlePDFExport}
              disabled={isExportingPDF}
            >
              <Ionicons 
                name="document-text-outline" 
                size={16} 
                color={colors.background.surface} 
              />
              <Text style={styles.pdfButtonText}>PDF</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector} ref={filterSectionRef}>
          {['daily', 'weekly', 'monthly', 'yearly'].map((view) => (
            <TouchableOpacity
              key={view}
              style={[
                styles.periodButton,
                selectedPeriod === view && styles.periodButtonActive
              ]}
              onPress={() => setSelectedPeriod(view)}
            >
              <Text style={[
                styles.periodButtonText,
                selectedPeriod === view && styles.periodButtonTextActive
              ]}>
                {view === 'daily' ? 'Today' : 
                 view === 'weekly' ? 'Week' : 
                 view === 'monthly' ? 'Month' : 'Year'}
              </Text>
            </TouchableOpacity>
          ))}
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

        {/* Stats Grid - 4 Cards in 2x2 Layout with consistent spacing */}
        <View style={styles.statsGrid} ref={summaryCardsRef}>
          <StatCard
            title={`${selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'Week' : selectedPeriod === 'monthly' ? 'Month' : 'Year'} Revenue`}
            value={`₹${analytics.periodRevenue || 0}`}
            subtitle={selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'Last 7 days' : selectedPeriod === 'monthly' ? 'Last 30 days' : 'This year'}
            color={colors.primary.main}
            index={0}
          />

          <StatCard
            title={`${selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'Week' : selectedPeriod === 'monthly' ? 'Month' : 'Year'} Orders`}
            value={analytics.periodOrders || 0}
            subtitle="Completed"
            color={colors.success.main}
            index={1}
          />

          <StatCard
            title="Avg Order Value"
            value={`₹${analytics.periodAvgOrderValue || 0}`}
            subtitle={selectedPeriod === 'daily' ? 'Today' : selectedPeriod === 'weekly' ? 'Last 7 days' : selectedPeriod === 'monthly' ? 'Last 30 days' : 'Last year'}
            color={colors.warning.main}
            index={2}
          />

          <StatCard
            title="Total Items"
            value={analytics.totalItems || 0}
            subtitle="Items sold"
            color={colors.info.main}
            index={3}
          />
        </View>

        {/* Advanced Analytics Content */}
        {renderContent()}
        
        <View style={{ height: 100 }} />
        </ScrollView>
      </View>
      </View>

      {/* Interactive Tour Overlay */}
      <InteractiveTourOverlay
        ref={tourOverlayRef}
        visible={showTour}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepIndex={stepIndex}
        onNext={nextStep}
        onSkip={skipScreen}
        onSkipAll={skipAll}
        onSkipStep={skipStep}
        onActionComplete={completeTour}
        showHint={showHint}
        showSkipStep={showSkipStep}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
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
  summarySection: {
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  summaryContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  summaryCard: {
    width: 120,
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: 4,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  scrollableContent: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 0, // Remove padding here, let children handle it
    paddingTop: 8,
    paddingBottom: 250,
  },
  chartsContainer: {
    paddingHorizontal: 20, // Same as statsGrid (20px)
    paddingVertical: 0,
    width: '100%',
  },
  
  // Consistent Chart Card Styles - Match 4-card container width
  consistentChartCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    marginBottom: 12, // Same gap as statsGrid
    marginHorizontal: 0,
    padding: 16, // Same as statCard
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  
  chartWrapper: {
    overflow: 'visible', // FIXED: Allow horizontal scroll for charts
    borderRadius: 8,
  },
  
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  
  chartSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 14,
  },
  // FIXED: Horizontal scrolling optimization styles
  horizontalChartContent: {
    paddingHorizontal: 10,
    minWidth: '100%',
  },
  // FIXED: Vertical scrolling optimization styles
  verticalChartContainer: {
    maxHeight: 400,
  },
  verticalChartContent: {
    paddingVertical: 8,
  },
  dataCardsContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  dataCardsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  dataCardsSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 12,
  },
  dataCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dataCardTitleContainer: {
    flex: 1,
  },
  dataCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  dataCardSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  dataCardRevenue: {
    alignItems: 'flex-end',
  },
  dataCardRevenueAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success.main,
  },
  dataCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dataCardStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dataCardStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: 4,
    marginRight: 4,
  },
  dataCardStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
    gap: 12, // Consistent gap between cards
  },
  statCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    width: '48%',
    minHeight: 100,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'center',
  },
  statTitle: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 8,
    fontWeight: '500',
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  pdfButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.surface,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.background.surface,
  },
  filterBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    fontSize: 6,
    color: colors.background.surface,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    flex: 1,
    paddingHorizontal: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginLeft: 8,
  },
  filterDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 20,
  },
  datePresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePresetButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  datePresetButtonActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  datePresetText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  datePresetTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  selectedDateRange: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary.main,
  },
  selectedDateRangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary.main,
    textAlign: 'center',
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  categoryChipTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  productContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  productChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  productChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  productChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text.primary,
  },
  productChipTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  clearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.primary.main,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.background.surface,
  },
});

export default AdvancedAnalyticsScreen;
