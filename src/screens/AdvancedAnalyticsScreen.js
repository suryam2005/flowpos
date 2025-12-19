import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import ordersService from '../services/OrdersService';
import productsService from '../services/ProductsService';

import { colors } from '../styles/colors';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
import LoadingOverlay from '../components/LoadingOverlay';

const AdvancedAnalyticsScreen = ({ navigation }) => {
  const [selectedView, setSelectedView] = useState('daily'); // daily, weekly, monthly, yearly
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  


  
  // Filter states - Simplified
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1000);

  useEffect(() => {
    // TESTING MODE: Skip feature access check
    // checkFeatureAccess();
    loadData();
  }, []);



  // OPTIMIZED: Only refresh on manual pull-to-refresh, not on every focus
  // This prevents unnecessary API calls when navigating between tabs
  useFocusEffect(
    useCallback(() => {
      // Skip automatic refresh - user can manually refresh if needed
      // This is Phase 1 optimization to reduce API calls
      console.log('📈 [AdvancedAnalytics] Screen focused - using cached data (manual refresh available)');
    }, [])
  );

  useEffect(() => {
    applyFilters();
  }, [selectedView, orders, dateRange, categoryFilter, selectedProduct]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      console.log('📊 [AdvancedAnalytics] Loading data...');
      const [ordersData, productsData] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);
      
      console.log('📊 [AdvancedAnalytics] Loaded:', ordersData.length, 'orders,', productsData.length, 'products');
      
      if (ordersData.length > 0) {
        console.log('📊 [AdvancedAnalytics] Sample order structure:', {
          id: ordersData[0].id,
          timestamp: ordersData[0].timestamp,
          createdAt: ordersData[0].createdAt,
          created_at: ordersData[0].created_at,
          total: ordersData[0].total,
          items: ordersData[0].items ? `${ordersData[0].items.length} items` : 'No items',
          itemsStructure: ordersData[0].items?.[0] || 'No items'
        });
      } else {
        console.log('📊 [AdvancedAnalytics] No orders found - filters will show empty results');
      }
      
      setOrders(ordersData);
      setProducts(productsData);
      

      
      // Initialize filteredData with all orders if no filters are active
      const hasActiveFilters = dateRange.start || dateRange.end || categoryFilter !== 'all' || selectedProduct;
      if (!hasActiveFilters) {
        console.log('📊 [AdvancedAnalytics] No active filters, initializing with all orders');
        setFilteredData(ordersData);
      }
      
      // Explicitly apply filters after data is loaded
      console.log('📊 [AdvancedAnalytics] Data loaded, applying initial filters...');
      
      // Debug: Test filter functionality with real data
      if (ordersData.length > 0) {
        console.log('📊 [AdvancedAnalytics] Testing filters with real data...');
        
        // Test today filter
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);
        
        const todayOrders = ordersData.filter(order => {
          let orderDate;
          if (order.timestamp) {
            orderDate = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
          } else if (order.createdAt) {
            orderDate = new Date(order.createdAt);
          } else {
            return false;
          }
          return orderDate >= today && orderDate <= todayEnd;
        });
        
        console.log('📊 [AdvancedAnalytics] Today filter test:', todayOrders.length, 'out of', ordersData.length, 'orders');
        
        // Test category filter if categories exist
        const categories = new Set();
        ordersData.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              if (item.category) categories.add(item.category);
            });
          }
        });
        
        console.log('📊 [AdvancedAnalytics] Available categories:', Array.from(categories));
      }
      
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
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
    console.log('📊 [AdvancedAnalytics] generateDailyData called with', filteredData.length, 'filtered orders');
    
    const dailyMap = {};
    
    filteredData.forEach((order, index) => {
      // Handle multiple date field formats from backend
      let date;
      if (order.timestamp) {
        date = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        date = new Date(order.createdAt);
      } else if (order.created_at) {
        date = new Date(order.created_at);
      } else {
        console.warn('📊 [AdvancedAnalytics] Order', index, 'has no date field:', order.id);
        return; // Skip orders without date
      }
      
      if (isNaN(date.getTime())) {
        console.warn('📊 [AdvancedAnalytics] Order', index, 'has invalid date:', order.id, order.timestamp, order.createdAt);
        return; // Skip invalid dates
      }
      
      const dateKey = date.toISOString().split('T')[0];
      
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = {
          date: dateKey,
          revenue: 0,
          orders: 0,
          items: 0,
        };
      }
      
      dailyMap[dateKey].revenue += order.total || 0;
      dailyMap[dateKey].orders += 1;
      
      if (order.items && Array.isArray(order.items)) {
        dailyMap[dateKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    const result = Object.values(dailyMap).sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log('📊 [AdvancedAnalytics] generateDailyData result:', result.length, 'days');
    return result;
  };

  const generateWeeklyData = () => {
    const weeklyMap = {};
    
    filteredData.forEach(order => {
      // Handle multiple date field formats from backend
      let date;
      if (order.timestamp) {
        date = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        date = new Date(order.createdAt);
      } else if (order.created_at) {
        date = new Date(order.created_at);
      } else {
        return; // Skip orders without date
      }
      
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = {
          weekStart: weekKey,
          revenue: 0,
          orders: 0,
          items: 0,
        };
      }
      
      weeklyMap[weekKey].revenue += order.total || 0;
      weeklyMap[weekKey].orders += 1;
      
      if (order.items && Array.isArray(order.items)) {
        weeklyMap[weekKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    return Object.values(weeklyMap).sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
  };

  const generateMonthlyData = () => {
    const monthlyMap = {};
    
    filteredData.forEach(order => {
      // Handle multiple date field formats from backend
      let date;
      if (order.timestamp) {
        date = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        date = new Date(order.createdAt);
      } else if (order.created_at) {
        date = new Date(order.created_at);
      } else {
        return; // Skip orders without date
      }
      
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: monthKey,
          revenue: 0,
          orders: 0,
          items: 0,
        };
      }
      
      monthlyMap[monthKey].revenue += order.total || 0;
      monthlyMap[monthKey].orders += 1;
      
      if (order.items && Array.isArray(order.items)) {
        monthlyMap[monthKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    return Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));
  };

  const generateYearlyData = () => {
    const yearlyMap = {};
    
    filteredData.forEach(order => {
      // Handle multiple date field formats from backend
      let date;
      if (order.timestamp) {
        date = typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
      } else if (order.createdAt) {
        date = new Date(order.createdAt);
      } else if (order.created_at) {
        date = new Date(order.created_at);
      } else {
        return; // Skip orders without date
      }
      
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
      const yearKey = date.getFullYear().toString();
      
      if (!yearlyMap[yearKey]) {
        yearlyMap[yearKey] = {
          year: yearKey,
          revenue: 0,
          orders: 0,
          items: 0,
        };
      }
      
      yearlyMap[yearKey].revenue += order.total || 0;
      yearlyMap[yearKey].orders += 1;
      
      if (order.items && Array.isArray(order.items)) {
        yearlyMap[yearKey].items += order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      }
    });
    
    return Object.values(yearlyMap).sort((a, b) => b.year.localeCompare(a.year));
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



  const onRefresh = () => {
    loadData(true);
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
    
    // Payment method analysis
    const paymentMethods = {
      cash: filteredData.filter(o => (o.paymentMethod || '').toLowerCase().includes('cash')).length,
      upi: filteredData.filter(o => (o.paymentMethod || '').toLowerCase().includes('upi')).length
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
      period: selectedView,
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
    
    // Get store information
    const storeInfo = await getStoreInfo();
    
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

  const getStoreInfo = async () => {
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const storeData = await AsyncStorage.getItem('storeInfo');
      if (storeData) {
        const store = JSON.parse(storeData);
        return {
          name: store.store_name || store.name || 'FlowPOS Store',
          address: store.store_address || store.address || 'Store Address',
          phone: store.store_phone || store.phone || '+91 XXXXXXXXXX',
          email: store.store_email || store.email || '',
          gstNumber: store.gst_number || store.gstin || ''
        };
      }
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
    
    // Generate period analysis rows
    const periodRows = data.viewData[data.period].slice(0, 20).map(item => {
      let periodLabel = '';
      if (data.period === 'daily') {
        periodLabel = formatDate(item.date);
      } else if (data.period === 'weekly') {
        periodLabel = `Week of ${formatDate(item.weekStart)}`;
      } else if (data.period === 'monthly') {
        const [year, month] = item.month.split('-');
        periodLabel = new Date(year, parseInt(month) - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' });
      } else if (data.period === 'yearly') {
        periodLabel = item.year;
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

    // Generate top products rows
    const topProductsRows = data.topProducts.map((product, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${product.name}</td>
        <td>${product.quantity}</td>
        <td>${formatCurrency(product.revenue)}</td>
        <td>${((product.revenue / data.summary.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    // Generate category rows
    const categoryRows = data.categoryData.sort((a, b) => b.revenue - a.revenue).map(category => `
      <tr>
        <td>${category.name}</td>
        <td>${category.quantity}</td>
        <td>${formatCurrency(category.revenue)}</td>
        <td>${((category.revenue / data.summary.totalRevenue) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    // Generate peak hours rows
    const peakHoursRows = data.peakHours.map((hour, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${hour.timeRange}</td>
        <td>${hour.count}</td>
        <td>${((hour.count / data.summary.totalOrders) * 100).toFixed(1)}%</td>
      </tr>
    `).join('');

    // Generate peak days rows
    const peakDaysRows = data.peakDays.map((day, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${day.day}</td>
        <td>${day.count}</td>
        <td>${((day.count / data.summary.totalOrders) * 100).toFixed(1)}%</td>
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
          .filter-info {
            background: #fef3c7;
            border: 1px solid #fbbf24;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
          }
          .filter-title {
            font-weight: 600;
            color: #92400e;
            margin-bottom: 5px;
          }
          .filter-details {
            color: #b45309;
            font-size: 14px;
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
            Generated on: ${formatDate(data.generatedAt)}<br>
            Analysis Period: ${data.period.charAt(0).toUpperCase() + data.period.slice(1)}
          </div>
        </div>

        <!-- Filter Information -->
        <div class="section">
          <div class="section-title">Report Filters & Scope</div>
          <div class="filter-info">
            <div class="filter-title">Applied Filters</div>
            <div class="filter-details">
              <strong>Time Period:</strong> ${data.period.charAt(0).toUpperCase() + data.period.slice(1)} view<br>
              <strong>Date Range:</strong> ${data.dateRange.start ? formatDate(data.dateRange.start) : 'All time'} - ${data.dateRange.end ? formatDate(data.dateRange.end) : 'Present'}<br>
              <strong>Category:</strong> ${data.categoryFilter === 'all' ? 'All Categories' : data.categoryFilter}<br>
              <strong>Product:</strong> ${data.selectedProduct ? data.selectedProduct.name : 'All Products'}<br>
              <strong>Orders Analyzed:</strong> ${data.filteredOrdersCount} out of ${data.totalOrdersCount} total orders
            </div>
          </div>
        </div>

        <!-- Executive Summary -->
        <div class="section">
          <div class="section-title">Executive Summary</div>
          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-value">${formatCurrency(data.summary.totalRevenue)}</div>
              <div class="metric-label">Total Revenue</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.summary.totalOrders}</div>
              <div class="metric-label">Total Orders</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.summary.totalItems}</div>
              <div class="metric-label">Items Sold</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${formatCurrency(data.summary.avgOrderValue)}</div>
              <div class="metric-label">Avg Order Value</div>
            </div>
          </div>
        </div>

        <!-- Period Analysis -->
        <div class="section">
          <div class="section-title">${data.period.charAt(0).toUpperCase() + data.period.slice(1)} Analysis</div>
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
              <div class="metric-value">${data.paymentMethods.cash}</div>
              <div class="metric-label">Cash Payments</div>
            </div>
            <div class="metric-card">
              <div class="metric-value">${data.paymentMethods.upi}</div>
              <div class="metric-label">UPI Payments</div>
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
          <p>Generated on: ${new Date(data.generatedAt).toLocaleString('en-IN')}</p>
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

  const renderViewTabs = () => (
    <View style={styles.viewTabs}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.viewTabsContent}
      >
        {['daily', 'weekly', 'monthly', 'yearly'].map(view => (
          <TouchableOpacity
            key={view}
            style={[styles.viewTab, selectedView === view && styles.viewTabActive]}
            onPress={() => {
              setSelectedView(view);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
          >
            <Ionicons 
              name={getViewIcon(view)} 
              size={18} 
              color={selectedView === view ? colors.background.surface : colors.text.secondary} 
            />
            <Text style={[styles.viewTabText, selectedView === view && styles.viewTabTextActive]}>
              {getViewLabel(view)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

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
    let title, subtitle, revenue, orders, items;
    
    if (selectedView === 'daily') {
      title = new Date(item.date).toLocaleDateString('en', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
      });
      subtitle = item.date;
      revenue = item.revenue;
      orders = item.orders;
      items = item.items;
    } else if (selectedView === 'weekly') {
      const weekStart = new Date(item.weekStart);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      title = `Week of ${weekStart.toLocaleDateString('en', { month: 'short', day: 'numeric' })}`;
      subtitle = `${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`;
      revenue = item.revenue;
      orders = item.orders;
      items = item.items;
    } else if (selectedView === 'monthly') {
      const [year, month] = item.month.split('-');
      const date = new Date(year, parseInt(month) - 1);
      title = date.toLocaleDateString('en', { month: 'long', year: 'numeric' });
      subtitle = item.month;
      revenue = item.revenue;
      orders = item.orders;
      items = item.items;
    } else if (selectedView === 'yearly') {
      title = item.year;
      subtitle = `Full Year`;
      revenue = item.revenue;
      orders = item.orders;
      items = item.items;
    }

    return (
      <View key={index} style={styles.dataCard}>
        <View style={styles.dataCardHeader}>
          <View style={styles.dataCardTitleContainer}>
            <Text style={styles.dataCardTitle}>{title}</Text>
            <Text style={styles.dataCardSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.dataCardRevenue}>
            <Text style={styles.dataCardRevenueAmount}>₹{revenue.toFixed(2)}</Text>
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

  const renderSummaryCards = () => {
    // Get data based on selected view for dynamic summary cards
    let viewData = [];
    let periodLabel = '';
    
    switch (selectedView) {
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
        // Fallback to total filtered data
        const totalRevenue = filteredData.reduce((sum, order) => sum + (order.total || 0), 0);
        const totalOrders = filteredData.length;
        const totalItems = filteredData.reduce((sum, order) => {
          if (!order.items || !Array.isArray(order.items)) return sum;
          return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
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
          <View style={styles.summaryContainer}>
            {summaryData.map((item, index) => (
              <View key={index} style={styles.summaryCard}>
                <View style={[styles.summaryIconContainer, { backgroundColor: item.iconBg }]}>
                  <Ionicons name={item.icon} size={22} color={item.iconColor} />
                </View>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        );
    }
    
    // Calculate totals from view-specific data
    const totalRevenue = viewData.reduce((sum, item) => sum + (item.revenue || item.totalRevenue || 0), 0);
    const totalOrders = viewData.reduce((sum, item) => sum + (item.orders || item.orderCount || 0), 0);
    const totalItems = viewData.reduce((sum, item) => sum + (item.items || item.totalQuantity || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // Get current period data (most recent entry)
    const currentPeriodData = viewData.length > 0 ? viewData[0] : null;
    const currentRevenue = currentPeriodData ? (currentPeriodData.revenue || currentPeriodData.totalRevenue || 0) : 0;
    const currentOrders = currentPeriodData ? (currentPeriodData.orders || currentPeriodData.orderCount || 0) : 0;
    const currentItems = currentPeriodData ? (currentPeriodData.items || currentPeriodData.totalQuantity || 0) : 0;
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
      <View style={styles.summaryContainer}>
        {summaryData.map((item, index) => (
          <View key={index} style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <Text style={styles.summaryValue}>{item.value}</Text>
            <Text style={styles.summaryLabel}>{item.label}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderContent = () => {
    console.log('📊 [AdvancedAnalytics] renderContent called, selectedView:', selectedView, 'filteredData:', filteredData.length);
    
    let data = [];
    
    switch (selectedView) {
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
    }
    
    console.log('📊 [AdvancedAnalytics] Generated data for', selectedView, ':', data.length, 'items');

    if (data.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Ionicons name="bar-chart-outline" size={64} color={colors.primary.main} />
          </View>
          <Text style={styles.emptyTitle}>No Data Found</Text>
          <Text style={styles.emptySubtitle}>
            {filteredData.length === 0 
              ? 'Start making sales to see your analytics here'
              : 'No results match your filters. Try changing them.'}
          </Text>
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

    return (
      <ScrollView
        style={styles.dataList}
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
        {data.map((item, index) => renderDataCard(item, index))}
        <View style={{ height: 100 }} />
      </ScrollView>
    );
  };









  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading analytics..." />
      <LoadingOverlay visible={isExportingPDF} message="Generating PDF..." />
      
      <View style={[styles.content, contentStyle]}>
        {/* Header */}
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Advanced Analytics</Text>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              style={styles.pdfButton}
              onPress={handlePDFExport}
              disabled={isExportingPDF}
            >
              <Ionicons 
                name="document-text-outline" 
                size={18} 
                color={colors.background.surface} 
              />
              <Text style={styles.pdfButtonText}>
                PDF
              </Text>
            </TouchableOpacity>
            {renderFilterButton()}
          </View>
        </View>

        {/* View Tabs */}
        {renderViewTabs()}

        {/* Summary Cards */}
        {renderSummaryCards()}

        {/* Data Content */}
        {renderContent()}
      </View>

      {/* Filter Modal */}
      {renderFilterModal()}
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
  headerContainer: {
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingTop: 30,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.success.main,
    borderRadius: 8,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  pdfButtonDisabled: {
    backgroundColor: colors.text.secondary,
    opacity: 0.7,
  },
  pdfButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
    marginLeft: 6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary.main,
    borderRadius: 8,
    position: 'relative',
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
    marginLeft: 6,
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.error.main,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.background.surface,
  },
  filterBadgeText: {
    fontSize: 10,
    color: colors.background.surface,
    fontWeight: '700',
  },
  viewTabs: {
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    paddingVertical: 12,
  },
  viewTabsContent: {
    paddingHorizontal: 12,
    gap: 8,
  },
  viewTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 4,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  viewTabActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  viewTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  viewTabTextActive: {
    color: colors.background.surface,
    fontWeight: '700',
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    backgroundColor: colors.background.surface,
  },
  summaryCard: {
    width: '48%',
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 16,
    margin: '1%',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
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
  },
  dataList: {
    flex: 1,
    padding: 16,
  },
  dataCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
    shadowColor: colors.shadow.default,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  dataCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  dataCardTitleContainer: {
    flex: 1,
  },
  dataCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
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
    color: colors.primary.main,
  },
  dataCardStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  dataCardStat: {
    flex: 1,
    alignItems: 'center',
  },
  dataCardStatLabel: {
    fontSize: 11,
    color: colors.text.secondary,
    marginTop: 4,
  },
  dataCardStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary.main,
    borderRadius: 24,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.background.surface,
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
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    backgroundColor: colors.primary.background,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '400',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  filterLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  filterLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
  },
  filterDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  datePresetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePresetButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    color: colors.text.primary,
    fontWeight: '500',
  },
  datePresetTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  selectedDateRange: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.primary.light,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedDateRangeText: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '600',
  },
  categoryContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  categoryChipText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  categoryChipTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  // Amount range styles removed for simplicity
  productContainer: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  productChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: 8,
  },
  productChipActive: {
    backgroundColor: colors.primary.main,
    borderColor: colors.primary.main,
  },
  productChipText: {
    fontSize: 14,
    color: colors.text.primary,
  },
  productChipTextActive: {
    color: colors.background.surface,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    backgroundColor: colors.background.surface,
    gap: 12,
  },
  clearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.gray[100],
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
