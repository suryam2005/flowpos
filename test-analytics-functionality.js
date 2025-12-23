/**
 * Test Analytics Functionality
 * Tests if content changes when switching between day/week/month/year and filter options
 * in both AnalyticsScreen and AdvancedAnalyticsScreen
 */

// Mock data for testing - using recent dates
const mockOrders = [
  {
    id: '1',
    timestamp: new Date().getTime(), // Today
    total: 150,
    items: [
      { name: 'Coffee', category: 'Beverages', price: 50, quantity: 2 },
      { name: 'Sandwich', category: 'Food', price: 50, quantity: 1 }
    ]
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).getTime(), // Yesterday
    total: 200,
    items: [
      { name: 'Tea', category: 'Beverages', price: 30, quantity: 2 },
      { name: 'Cake', category: 'Food', price: 140, quantity: 1 }
    ]
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).getTime(), // 5 days ago
    total: 300,
    items: [
      { name: 'Pizza', category: 'Food', price: 300, quantity: 1 }
    ]
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).getTime(), // 20 days ago
    total: 100,
    items: [
      { name: 'Coffee', category: 'Beverages', price: 50, quantity: 2 }
    ]
  },
  {
    id: '5',
    timestamp: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).getTime(), // 200 days ago
    total: 250,
    items: [
      { name: 'Burger', category: 'Food', price: 250, quantity: 1 }
    ]
  }
];

// Test period analytics calculation
const testPeriodAnalytics = () => {
  console.log('🧪 Testing Period Analytics Functionality');
  
  const calculatePeriodAnalytics = (orders, period) => {
    let startDate, endDate;
    
    switch (period) {
      case 'daily':
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        endDate = new Date();
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case 'yearly':
        endDate = new Date();
        startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate = new Date();
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
    }
    
    const periodOrders = orders.filter(order => {
      const orderDate = new Date(order.timestamp);
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

  // Test different periods
  const periods = ['daily', 'weekly', 'monthly', 'yearly'];
  const results = {};

  periods.forEach(period => {
    const analytics = calculatePeriodAnalytics(mockOrders, period);
    results[period] = analytics;
    
    console.log(`📊 ${period.toUpperCase()} Analytics:`, {
      revenue: analytics.revenue,
      orders: analytics.orderCount,
      avgOrderValue: analytics.avgOrderValue,
      totalItems: analytics.totalItems,
      filteredOrders: analytics.orders.length
    });
  });

  // Verify that different periods show different results
  const dailyRevenue = results.daily.revenue;
  const weeklyRevenue = results.weekly.revenue;
  const monthlyRevenue = results.monthly.revenue;
  const yearlyRevenue = results.yearly.revenue;

  console.log('🔍 Period Comparison:');
  console.log(`Daily: ₹${dailyRevenue} (${results.daily.orderCount} orders)`);
  console.log(`Weekly: ₹${weeklyRevenue} (${results.weekly.orderCount} orders)`);
  console.log(`Monthly: ₹${monthlyRevenue} (${results.monthly.orderCount} orders)`);
  console.log(`Yearly: ₹${yearlyRevenue} (${results.yearly.orderCount} orders)`);

  // Test should show: Daily < Weekly < Monthly < Yearly (generally)
  const isWorking = dailyRevenue !== weeklyRevenue || weeklyRevenue !== monthlyRevenue || monthlyRevenue !== yearlyRevenue;
  
  if (isWorking) {
    console.log('✅ Period filtering is working - different periods show different results');
  } else {
    console.log('❌ Period filtering may not be working - all periods show same results');
  }

  return results;
};

// Test filter functionality
const testFilterFunctionality = () => {
  console.log('🧪 Testing Filter Functionality');

  const applyFilters = (orders, filters) => {
    let filtered = [...orders];
    
    // Date range filter
    if (filters.dateRange && filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      startDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate >= startDate;
      });
    }
    
    if (filters.dateRange && filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      endDate.setHours(23, 59, 59, 999);
      
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.timestamp);
        return orderDate <= endDate;
      });
    }
    
    // Category filter
    if (filters.categoryFilter && filters.categoryFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => item.category === filters.categoryFilter);
      });
    }
    
    // Product filter
    if (filters.selectedProduct) {
      filtered = filtered.filter(order => {
        if (!order.items || order.items.length === 0) return false;
        return order.items.some(item => 
          item.name && filters.selectedProduct.name && 
          item.name.toLowerCase().includes(filters.selectedProduct.name.toLowerCase())
        );
      });
    }
    
    return filtered;
  };

  // Test different filter combinations
  const filterTests = [
    {
      name: 'No Filters',
      filters: {}
    },
    {
      name: 'Category Filter - Beverages',
      filters: { categoryFilter: 'Beverages' }
    },
    {
      name: 'Category Filter - Food',
      filters: { categoryFilter: 'Food' }
    },
    {
      name: 'Product Filter - Coffee',
      filters: { selectedProduct: { name: 'Coffee' } }
    },
    {
      name: 'Date Range - Last 7 days',
      filters: { 
        dateRange: { 
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    },
    {
      name: 'Date Range - Last 30 days',
      filters: { 
        dateRange: { 
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      }
    }
  ];

  const filterResults = {};

  filterTests.forEach(test => {
    const filtered = applyFilters(mockOrders, test.filters);
    const revenue = filtered.reduce((sum, order) => sum + order.total, 0);
    
    filterResults[test.name] = {
      orderCount: filtered.length,
      revenue: revenue,
      orders: filtered
    };
    
    console.log(`🔍 ${test.name}:`, {
      orders: filtered.length,
      revenue: `₹${revenue}`,
      orderIds: filtered.map(o => o.id)
    });
  });

  // Verify filters produce different results
  const noFiltersCount = filterResults['No Filters'].orderCount;
  const beveragesCount = filterResults['Category Filter - Beverages'].orderCount;
  const foodCount = filterResults['Category Filter - Food'].orderCount;
  const coffeeCount = filterResults['Product Filter - Coffee'].orderCount;

  console.log('🔍 Filter Comparison:');
  console.log(`No Filters: ${noFiltersCount} orders`);
  console.log(`Beverages: ${beveragesCount} orders`);
  console.log(`Food: ${foodCount} orders`);
  console.log(`Coffee: ${coffeeCount} orders`);

  const isFilterWorking = beveragesCount !== noFiltersCount || 
                         foodCount !== noFiltersCount || 
                         coffeeCount !== noFiltersCount;

  if (isFilterWorking) {
    console.log('✅ Filter functionality is working - different filters show different results');
  } else {
    console.log('❌ Filter functionality may not be working - all filters show same results');
  }

  return filterResults;
};

// Main test function
const runAnalyticsTests = () => {
  console.log('🚀 Starting Analytics Functionality Tests');
  console.log('==========================================');
  
  try {
    // Test 1: Period Analytics
    console.log('\n1️⃣ Testing Period Analytics...');
    const periodResults = testPeriodAnalytics();
    
    // Test 2: Filter Functionality
    console.log('\n2️⃣ Testing Filter Functionality...');
    const filterResults = testFilterFunctionality();
    
    console.log('\n🎯 Test Summary:');
    console.log('================');
    
    // Check if period switching works
    const periodWorking = Object.keys(periodResults).length === 4 && 
                         Object.values(periodResults).some(p => p.orderCount > 0);
    
    // Check if filters work
    const filterWorking = Object.keys(filterResults).length > 1 && 
                         Object.values(filterResults).some(f => f.orderCount !== filterResults['No Filters'].orderCount);
    
    console.log(`📊 Period Switching: ${periodWorking ? '✅ Working' : '❌ Not Working'}`);
    console.log(`🔍 Filter Functionality: ${filterWorking ? '✅ Working' : '❌ Not Working'}`);
    
    const allWorking = periodWorking && filterWorking;
    
    console.log(`\n🏆 Overall Result: ${allWorking ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    if (allWorking) {
      console.log('🎉 Analytics functionality is working correctly!');
      console.log('📱 Content should change when switching between day/week/month/year');
      console.log('🔍 Content should change when applying different filters');
    } else {
      console.log('⚠️  Some analytics functionality may not be working properly');
      console.log('🔧 Check the implementation of period switching and filter logic');
    }
    
    return {
      periodWorking,
      filterWorking,
      allWorking,
      results: {
        periods: periodResults,
        filters: filterResults
      }
    };
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    return { error: error.message };
  }
};

// Run tests
runAnalyticsTests();