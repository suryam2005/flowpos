// Advanced Analytics Service - Simplified version
// PDF generation is now handled by PDFReportsService

class AdvancedAnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Generate trend analysis data for revenue, orders, and products
   * @param {Array} orders - Array of order objects
   * @param {string} period - 'daily', 'weekly', 'monthly'
   * @returns {Object} Trend analysis data
   */
  generateTrendAnalysis(orders, period = 'daily') {
    const cacheKey = `trend_${period}_${orders.length}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const trends = {
      revenue: { current: 0, previous: 0, change: 0, changePercent: 0 },
      orders: { current: 0, previous: 0, change: 0, changePercent: 0 },
      avgOrderValue: { current: 0, previous: 0, change: 0, changePercent: 0 }
    };

    let currentPeriodStart, previousPeriodStart, previousPeriodEnd;

    switch (period) {
      case 'daily':
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek - 7);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek);
        break;
      case 'monthly':
        currentPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousPeriodEnd = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    // Filter orders for current and previous periods
    const currentOrders = orders.filter(order => {
      const orderDate = this.getOrderDate(order);
      return orderDate >= currentPeriodStart;
    });

    const previousOrders = orders.filter(order => {
      const orderDate = this.getOrderDate(order);
      return orderDate >= previousPeriodStart && orderDate < previousPeriodEnd;
    });

    // Calculate metrics
    trends.revenue.current = currentOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    trends.revenue.previous = previousOrders.reduce((sum, order) => sum + (order.total || 0), 0);
    trends.revenue.change = trends.revenue.current - trends.revenue.previous;
    trends.revenue.changePercent = trends.revenue.previous > 0 
      ? ((trends.revenue.change / trends.revenue.previous) * 100) 
      : trends.revenue.current > 0 ? 100 : 0;

    trends.orders.current = currentOrders.length;
    trends.orders.previous = previousOrders.length;
    trends.orders.change = trends.orders.current - trends.orders.previous;
    trends.orders.changePercent = trends.orders.previous > 0 
      ? ((trends.orders.change / trends.orders.previous) * 100) 
      : trends.orders.current > 0 ? 100 : 0;

    trends.avgOrderValue.current = trends.orders.current > 0 
      ? trends.revenue.current / trends.orders.current 
      : 0;
    trends.avgOrderValue.previous = trends.orders.previous > 0 
      ? trends.revenue.previous / trends.orders.previous 
      : 0;
    trends.avgOrderValue.change = trends.avgOrderValue.current - trends.avgOrderValue.previous;
    trends.avgOrderValue.changePercent = trends.avgOrderValue.previous > 0 
      ? ((trends.avgOrderValue.change / trends.avgOrderValue.previous) * 100) 
      : trends.avgOrderValue.current > 0 ? 100 : 0;

    this.setCachedData(cacheKey, trends);
    return trends;
  }

  /**
   * Generate customer behavior insights
   * @param {Array} orders - Array of order objects
   * @returns {Object} Customer behavior data
   */
  generateCustomerInsights(orders) {
    const cacheKey = `customer_insights_${orders.length}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const insights = {
      peakHours: [],
      peakDays: [],
      averageOrderValue: 0,
      totalCustomers: 0,
      repeatCustomers: 0,
      topProducts: [],
      orderFrequency: {}
    };

    // Peak hours analysis
    const hourlyData = {};
    orders.forEach(order => {
      const orderDate = this.getOrderDate(order);
      const hour = orderDate.getHours();
      hourlyData[hour] = (hourlyData[hour] || 0) + 1;
    });

    insights.peakHours = Object.entries(hourlyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        count,
        timeRange: `${hour}:00 - ${parseInt(hour) + 1}:00`
      }));

    // Peak days analysis
    const dailyData = {};
    orders.forEach(order => {
      const orderDate = this.getOrderDate(order);
      const dayName = orderDate.toLocaleDateString('en', { weekday: 'long' });
      dailyData[dayName] = (dailyData[dayName] || 0) + 1;
    });

    insights.peakDays = Object.entries(dailyData)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([day, count]) => ({ day, count }));

    // Average order value
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    insights.averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Top products analysis
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

    insights.topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    this.setCachedData(cacheKey, insights);
    return insights;
  }

  /**
   * Generate profit margin analysis
   * @param {Array} orders - Array of order objects
   * @param {Array} products - Array of product objects
   * @returns {Object} Profit analysis data
   */
  generateProfitAnalysis(orders, products) {
    const cacheKey = `profit_analysis_${orders.length}_${products.length}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const analysis = {
      totalRevenue: 0,
      totalCost: 0,
      grossProfit: 0,
      profitMargin: 0,
      productProfitability: [],
      monthlyProfitTrend: []
    };

    // Create product cost lookup
    const productCosts = {};
    products.forEach(product => {
      productCosts[product.name] = {
        cost: product.cost || product.price * 0.6, // Assume 40% margin if no cost
        price: product.price || 0
      };
    });

    // Calculate total revenue and cost
    orders.forEach(order => {
      analysis.totalRevenue += order.total || 0;
      
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const productInfo = productCosts[item.name];
          if (productInfo) {
            analysis.totalCost += productInfo.cost * (item.quantity || 1);
          }
        });
      }
    });

    analysis.grossProfit = analysis.totalRevenue - analysis.totalCost;
    analysis.profitMargin = analysis.totalRevenue > 0 
      ? (analysis.grossProfit / analysis.totalRevenue) * 100 
      : 0;

    // Product profitability analysis
    const productProfits = {};
    orders.forEach(order => {
      if (order.items && Array.isArray(order.items)) {
        order.items.forEach(item => {
          const key = item.name || 'Unknown Product';
          const productInfo = productCosts[key];
          
          if (!productProfits[key]) {
            productProfits[key] = {
              name: key,
              revenue: 0,
              cost: 0,
              quantity: 0,
              profit: 0,
              margin: 0
            };
          }
          
          const itemRevenue = (item.price || 0) * (item.quantity || 1);
          const itemCost = productInfo ? productInfo.cost * (item.quantity || 1) : itemRevenue * 0.6;
          
          productProfits[key].revenue += itemRevenue;
          productProfits[key].cost += itemCost;
          productProfits[key].quantity += item.quantity || 1;
        });
      }
    });

    // Calculate profit and margin for each product
    Object.values(productProfits).forEach(product => {
      product.profit = product.revenue - product.cost;
      product.margin = product.revenue > 0 ? (product.profit / product.revenue) * 100 : 0;
    });

    analysis.productProfitability = Object.values(productProfits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    // Monthly profit trend (last 6 months)
    const monthlyData = {};
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = month.toISOString().slice(0, 7); // YYYY-MM format
      monthlyData[monthKey] = { revenue: 0, cost: 0, profit: 0 };
    }

    orders.forEach(order => {
      const orderDate = this.getOrderDate(order);
      const monthKey = orderDate.toISOString().slice(0, 7);
      
      if (monthlyData[monthKey]) {
        monthlyData[monthKey].revenue += order.total || 0;
        
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const productInfo = productCosts[item.name];
            if (productInfo) {
              monthlyData[monthKey].cost += productInfo.cost * (item.quantity || 1);
            }
          });
        }
      }
    });

    // Calculate profit for each month
    Object.keys(monthlyData).forEach(month => {
      monthlyData[month].profit = monthlyData[month].revenue - monthlyData[month].cost;
    });

    analysis.monthlyProfitTrend = Object.entries(monthlyData)
      .map(([month, data]) => ({
        month,
        monthName: new Date(month + '-01').toLocaleDateString('en', { month: 'short', year: 'numeric' }),
        ...data
      }));

    this.setCachedData(cacheKey, analysis);
    return analysis;
  }

  /**
   * Generate forecasting data based on historical trends
   * @param {Array} orders - Array of order objects
   * @param {number} forecastDays - Number of days to forecast
   * @returns {Object} Forecast data
   */
  generateForecast(orders, forecastDays = 30) {
    const cacheKey = `forecast_${orders.length}_${forecastDays}`;
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    const forecast = {
      dailyRevenue: [],
      totalForecastRevenue: 0,
      confidence: 0,
      trend: 'stable' // 'growing', 'declining', 'stable'
    };

    if (orders.length < 7) {
      // Not enough data for meaningful forecast
      forecast.confidence = 0;
      this.setCachedData(cacheKey, forecast);
      return forecast;
    }

    // Get last 30 days of data for trend analysis
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentOrders = orders.filter(order => {
      const orderDate = this.getOrderDate(order);
      return orderDate >= thirtyDaysAgo;
    });

    // Calculate daily averages
    const dailyRevenue = {};
    recentOrders.forEach(order => {
      const dateKey = this.getOrderDate(order).toISOString().split('T')[0];
      dailyRevenue[dateKey] = (dailyRevenue[dateKey] || 0) + (order.total || 0);
    });

    const dailyValues = Object.values(dailyRevenue);
    const avgDailyRevenue = dailyValues.length > 0 
      ? dailyValues.reduce((sum, val) => sum + val, 0) / dailyValues.length 
      : 0;

    // Simple linear trend calculation
    const days = Object.keys(dailyRevenue).sort();
    let trendSlope = 0;
    
    if (days.length >= 7) {
      const firstWeekAvg = days.slice(0, 7).reduce((sum, day) => sum + dailyRevenue[day], 0) / 7;
      const lastWeekAvg = days.slice(-7).reduce((sum, day) => sum + dailyRevenue[day], 0) / 7;
      trendSlope = (lastWeekAvg - firstWeekAvg) / 7; // Daily change rate
    }

    // Generate forecast
    const today = new Date();
    for (let i = 1; i <= forecastDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      
      const forecastRevenue = Math.max(0, avgDailyRevenue + (trendSlope * i));
      
      forecast.dailyRevenue.push({
        date: forecastDate.toISOString().split('T')[0],
        revenue: Math.round(forecastRevenue * 100) / 100,
        dayName: forecastDate.toLocaleDateString('en', { weekday: 'short' })
      });
    }

    forecast.totalForecastRevenue = forecast.dailyRevenue.reduce((sum, day) => sum + day.revenue, 0);
    
    // Determine trend
    if (trendSlope > avgDailyRevenue * 0.02) { // Growing if slope > 2% of average
      forecast.trend = 'growing';
    } else if (trendSlope < -avgDailyRevenue * 0.02) { // Declining if slope < -2% of average
      forecast.trend = 'declining';
    } else {
      forecast.trend = 'stable';
    }

    // Calculate confidence based on data consistency
    const variance = dailyValues.length > 1 
      ? dailyValues.reduce((sum, val) => sum + Math.pow(val - avgDailyRevenue, 2), 0) / dailyValues.length
      : 0;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = avgDailyRevenue > 0 ? standardDeviation / avgDailyRevenue : 1;
    
    forecast.confidence = Math.max(0, Math.min(100, 100 - (coefficientOfVariation * 100)));

    this.setCachedData(cacheKey, forecast);
    return forecast;
  }

  /**
   * Get order date from various date fields
   * @param {Object} order - Order object
   * @returns {Date} Order date
   */
  getOrderDate(order) {
    if (order.timestamp) {
      return typeof order.timestamp === 'number' ? new Date(order.timestamp) : new Date(order.timestamp);
    } else if (order.createdAt) {
      return new Date(order.createdAt);
    } else if (order.created_at) {
      return new Date(order.created_at);
    }
    return new Date(); // Fallback to current date
  }

  /**
   * Cache management
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }


}

export default new AdvancedAnalyticsService();