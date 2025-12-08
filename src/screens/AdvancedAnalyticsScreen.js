import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Platform,
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

const AdvancedAnalyticsScreen = ({ navigation }) => {
  const [selectedView, setSelectedView] = useState('daily'); // daily, weekly, monthly, yearly, product
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filter states
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: null, end: null });
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1000);

  useEffect(() => {
    loadData();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    applyFilters();
  }, [selectedView, orders, dateRange, categoryFilter, minAmount, maxAmount, selectedProduct]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    try {
      const [ordersData, productsData] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);
      
      setOrders(ordersData);
      setProducts(productsData);
      
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
    let filtered = [...orders];
    
    // Date range filter - Start date (beginning of day)
    if (dateRange.start) {
      const startDate = new Date(dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= startDate;
      });
    }
    
    // Date range filter - End date (end of day)
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate <= endDate;
      });
    }
    
    // Amount range filter - Minimum amount
    if (minAmount && minAmount.trim() !== '') {
      const minValue = parseFloat(minAmount);
      if (!isNaN(minValue)) {
        filtered = filtered.filter(order => (order.total || 0) >= minValue);
      }
    }
    
    // Amount range filter - Maximum amount
    if (maxAmount && maxAmount.trim() !== '') {
      const maxValue = parseFloat(maxAmount);
      if (!isNaN(maxValue)) {
        filtered = filtered.filter(order => (order.total || 0) <= maxValue);
      }
    }
    
    // Category filter
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => item.category === categoryFilter);
      });
    }
    
    // Product-specific filter
    if (selectedProduct) {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => item.id === selectedProduct.id);
      });
    }
    
    setFilteredData(filtered);
  };

  const generateDailyData = () => {
    const dailyMap = {};
    
    filteredData.forEach(order => {
      if (!order.timestamp && !order.createdAt) return;
      
      const date = new Date(order.timestamp || order.createdAt);
      if (isNaN(date.getTime())) return; // Skip invalid dates
      
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
    
    return Object.values(dailyMap).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const generateWeeklyData = () => {
    const weeklyMap = {};
    
    filteredData.forEach(order => {
      if (!order.timestamp && !order.createdAt) return;
      
      const date = new Date(order.timestamp || order.createdAt);
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
      if (!order.timestamp && !order.createdAt) return;
      
      const date = new Date(order.timestamp || order.createdAt);
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
      if (!order.timestamp && !order.createdAt) return;
      
      const date = new Date(order.timestamp || order.createdAt);
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

  const generateProductSalesData = () => {
    const productMap = {};
    
    filteredData.forEach(order => {
      if (!order.items || !Array.isArray(order.items)) return;
      
      order.items.forEach(item => {
        if (!item || !item.id) return;
        
        if (!productMap[item.id]) {
          productMap[item.id] = {
            id: item.id,
            name: item.name || 'Unknown Product',
            price: item.price || 0,
            category: item.category || 'General',
            image: item.image || null,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        
        const quantity = item.quantity || 0;
        const price = item.price || 0;
        
        productMap[item.id].totalQuantity += quantity;
        productMap[item.id].totalRevenue += (price * quantity);
        productMap[item.id].orderCount += 1;
      });
    });
    
    return Object.values(productMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
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
    setMinAmount('');
    setMaxAmount('');
    setSelectedProduct(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const onRefresh = () => {
    loadData(true);
  };

  const getViewIcon = (view) => {
    const icons = {
      daily: 'calendar',
      weekly: 'calendar-outline',
      monthly: 'calendar-number',
      yearly: 'calendar-sharp',
      product: 'cube'
    };
    return icons[view] || 'analytics';
  };

  const getViewLabel = (view) => {
    const labels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
      product: 'By Product'
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
        {['daily', 'weekly', 'monthly', 'yearly', 'product'].map(view => (
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
    const hasActiveFilters = dateRange.start || dateRange.end || categoryFilter !== 'all' || minAmount || maxAmount || selectedProduct;
    
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

            {/* Amount Range Filter */}
            <View style={styles.filterSection}>
              <View style={styles.filterLabelContainer}>
                <Ionicons name="cash" size={20} color={colors.primary.main} />
                <Text style={styles.filterLabel}>Order Amount Range</Text>
              </View>
              <Text style={styles.filterDescription}>Show orders within this price range</Text>
              <View style={styles.amountRangeContainer}>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountLabel}>Min</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="0"
                    keyboardType="numeric"
                    value={minAmount}
                    onChangeText={setMinAmount}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
                
                <Text style={styles.amountRangeSeparator}>-</Text>
                
                <View style={styles.amountInputContainer}>
                  <Text style={styles.amountLabel}>Max</Text>
                  <TextInput
                    style={styles.amountInput}
                    placeholder="∞"
                    keyboardType="numeric"
                    value={maxAmount}
                    onChangeText={setMaxAmount}
                    placeholderTextColor={colors.text.tertiary}
                  />
                </View>
              </View>
            </View>

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
              <Text style={styles.clearButtonText}>Reset All</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setShowFilterModal(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <Ionicons name="checkmark-circle" size={20} color={colors.background.surface} />
              <Text style={styles.applyButtonText}>Show Results</Text>
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
    } else if (selectedView === 'product') {
      title = item.name;
      subtitle = item.category || 'General';
      revenue = item.totalRevenue;
      orders = item.orderCount;
      items = item.totalQuantity;
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
    const totalRevenue = filteredData.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = filteredData.length;
    const totalItems = filteredData.reduce((sum, order) => 
      sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
    );
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
  };

  const renderContent = () => {
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
      case 'product':
        data = generateProductSalesData();
        break;
    }

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
      
      <View style={[styles.content, contentStyle]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Advanced Analytics</Text>
          {renderFilterButton()}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginLeft: 12,
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
  amountRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountInputContainer: {
    flex: 1,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginBottom: 6,
  },
  amountInput: {
    backgroundColor: colors.background.primary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  amountRangeSeparator: {
    fontSize: 18,
    color: colors.text.secondary,
    marginHorizontal: 12,
    marginTop: 18,
  },
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
    backgroundColor: colors.success.main,
    borderColor: colors.success.main,
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
    gap: 12,
    backgroundColor: colors.background.surface,
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
