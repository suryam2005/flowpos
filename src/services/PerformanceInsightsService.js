/**
 * Performance Insights Service
 * Provides basic business intelligence for Enterprise users
 */

import ordersService from './OrdersService';
import productsService from './ProductsService';

class PerformanceInsightsService {
  
  /**
   * Calculate simple business health score (0-100)
   */
  async getBusinessHealthScore() {
    try {
      console.log('📊 [PerformanceInsights] Calculating business health score...');
      
      const orders = await ordersService.getOrders();
      
      if (!orders || orders.length === 0) {
        return {
          score: 50,
          status: 'neutral',
          message: 'Not enough data to calculate health score'
        };
      }

      // Get current month and previous month data
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= currentMonthStart;
      });

      const previousMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= previousMonthStart && orderDate <= previousMonthEnd;
      });

      // Calculate health factors
      let score = 0;

      // Factor 1: Revenue Growth (40 points)
      const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const previousRevenue = previousMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      if (previousRevenue > 0) {
        const growthRate = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
        if (growthRate > 10) score += 40;
        else if (growthRate > 0) score += 30;
        else if (growthRate > -10) score += 20;
        else score += 10;
      } else {
        score += currentRevenue > 0 ? 30 : 10;
      }

      // Factor 2: Order Consistency (30 points)
      const currentOrderCount = currentMonthOrders.length;
      const previousOrderCount = previousMonthOrders.length;
      
      if (previousOrderCount > 0) {
        const orderGrowth = ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100;
        if (orderGrowth > 5) score += 30;
        else if (orderGrowth > -5) score += 25;
        else score += 15;
      } else {
        score += currentOrderCount > 0 ? 25 : 10;
      }

      // Factor 3: Recent Activity (30 points)
      const last7Days = new Date();
      last7Days.setDate(last7Days.getDate() - 7);
      
      const recentOrders = orders.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= last7Days;
      });

      if (recentOrders.length > 10) score += 30;
      else if (recentOrders.length > 5) score += 25;
      else if (recentOrders.length > 0) score += 15;
      else score += 5;

      // Determine status and message
      let status, message;
      if (score >= 80) {
        status = 'excellent';
        message = 'Excellent performance! Your business is thriving.';
      } else if (score >= 60) {
        status = 'good';
        message = 'Good performance with room for improvement.';
      } else if (score >= 40) {
        status = 'fair';
        message = 'Fair performance. Consider focusing on growth strategies.';
      } else {
        status = 'poor';
        message = 'Performance needs attention. Focus on increasing sales.';
      }

      console.log('📊 [PerformanceInsights] Health score calculated:', score);
      
      return {
        score: Math.round(score),
        status,
        message
      };

    } catch (error) {
      console.error('Error calculating business health score:', error);
      return {
        score: 50,
        status: 'neutral',
        message: 'Unable to calculate health score'
      };
    }
  }

  /**
   * Compare current month vs previous month
   */
  async getMonthlyComparison() {
    try {
      console.log('📊 [PerformanceInsights] Getting monthly comparison...');
      
      const orders = await ordersService.getOrders();
      
      if (!orders || orders.length === 0) {
        return {
          currentMonth: { revenue: 0, orders: 0, items: 0 },
          previousMonth: { revenue: 0, orders: 0, items: 0 },
          changes: { revenue: 0, orders: 0, items: 0 }
        };
      }

      // Get current month and previous month data
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= currentMonthStart;
      });

      const previousMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        return orderDate >= previousMonthStart && orderDate <= previousMonthEnd;
      });

      // Calculate current month metrics
      const currentRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const currentOrderCount = currentMonthOrders.length;
      const currentItems = currentMonthOrders.reduce((sum, order) => {
        if (!order.items || !Array.isArray(order.items)) return sum;
        return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
      }, 0);

      // Calculate previous month metrics
      const previousRevenue = previousMonthOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      const previousOrderCount = previousMonthOrders.length;
      const previousItems = previousMonthOrders.reduce((sum, order) => {
        if (!order.items || !Array.isArray(order.items)) return sum;
        return sum + order.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0);
      }, 0);

      // Calculate percentage changes
      const revenueChange = previousRevenue > 0 ? 
        ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 
        (currentRevenue > 0 ? 100 : 0);

      const ordersChange = previousOrderCount > 0 ? 
        ((currentOrderCount - previousOrderCount) / previousOrderCount) * 100 : 
        (currentOrderCount > 0 ? 100 : 0);

      const itemsChange = previousItems > 0 ? 
        ((currentItems - previousItems) / previousItems) * 100 : 
        (currentItems > 0 ? 100 : 0);

      console.log('📊 [PerformanceInsights] Monthly comparison calculated');
      
      return {
        currentMonth: {
          revenue: currentRevenue,
          orders: currentOrderCount,
          items: currentItems
        },
        previousMonth: {
          revenue: previousRevenue,
          orders: previousOrderCount,
          items: previousItems
        },
        changes: {
          revenue: Math.round(revenueChange * 10) / 10,
          orders: Math.round(ordersChange * 10) / 10,
          items: Math.round(itemsChange * 10) / 10
        }
      };

    } catch (error) {
      console.error('Error getting monthly comparison:', error);
      return {
        currentMonth: { revenue: 0, orders: 0, items: 0 },
        previousMonth: { revenue: 0, orders: 0, items: 0 },
        changes: { revenue: 0, orders: 0, items: 0 }
      };
    }
  }

  /**
   * Generate simple business insights
   */
  async getSimpleInsights() {
    try {
      console.log('📊 [PerformanceInsights] Generating simple insights...');
      
      const [orders, products] = await Promise.all([
        ordersService.getOrders(),
        productsService.getProducts()
      ]);

      const insights = [];

      if (!orders || orders.length === 0) {
        insights.push({
          type: 'info',
          icon: 'analytics-outline',
          message: 'Start making sales to see business insights'
        });
        return insights;
      }

      // Insight 1: Top performing category
      const categoryPerformance = {};
      orders.forEach(order => {
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!categoryPerformance[category]) {
              categoryPerformance[category] = { revenue: 0, quantity: 0 };
            }
            categoryPerformance[category].revenue += (item.price || 0) * (item.quantity || 1);
            categoryPerformance[category].quantity += item.quantity || 1;
          });
        }
      });

      const topCategory = Object.entries(categoryPerformance)
        .sort(([,a], [,b]) => b.revenue - a.revenue)[0];

      if (topCategory) {
        insights.push({
          type: 'success',
          icon: 'target-outline',
          message: `${topCategory[0]} is your top performing category`
        });
      }

      // Insight 2: Peak business hours
      const hourlyData = {};
      orders.forEach(order => {
        const orderDate = new Date(order.timestamp || order.createdAt);
        const hour = orderDate.getHours();
        hourlyData[hour] = (hourlyData[hour] || 0) + 1;
      });

      const peakHour = Object.entries(hourlyData)
        .sort(([,a], [,b]) => b - a)[0];

      if (peakHour) {
        const hour = parseInt(peakHour[0]);
        const timeRange = `${hour}:00-${hour + 1}:00`;
        insights.push({
          type: 'info',
          icon: 'calendar-outline',
          message: `Peak business hours: ${timeRange}`
        });
      }

      // Insight 3: Low stock alert (if products have stock tracking)
      const lowStockProducts = products.filter(product => 
        product.track_stock && product.stock_quantity !== undefined && product.stock_quantity < 5
      );

      if (lowStockProducts.length > 0) {
        insights.push({
          type: 'warning',
          icon: 'cube-outline',
          message: `${lowStockProducts.length} products need restocking`
        });
      } else if (products.length > 0) {
        insights.push({
          type: 'success',
          icon: 'checkmark',
          message: 'All products are well stocked'
        });
      }

      // If we don't have enough insights, add a general one
      if (insights.length < 3) {
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
        insights.push({
          type: 'info',
          icon: 'currency-outline',
          message: `Total business revenue: ₹${totalRevenue.toFixed(0)}`
        });
      }

      console.log('📊 [PerformanceInsights] Generated', insights.length, 'insights');
      
      return insights.slice(0, 3); // Return max 3 insights

    } catch (error) {
      console.error('Error generating simple insights:', error);
      return [{
        type: 'error',
        icon: 'information-circle-outline',
        message: 'Unable to generate insights at this time'
      }];
    }
  }

  /**
   * Get all performance insights data
   */
  async getAllInsights() {
    try {
      console.log('📊 [PerformanceInsights] Getting all insights...');
      
      const [healthScore, monthlyComparison, simpleInsights] = await Promise.all([
        this.getBusinessHealthScore(),
        this.getMonthlyComparison(),
        this.getSimpleInsights()
      ]);

      return {
        healthScore,
        monthlyComparison,
        insights: simpleInsights,
        generatedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error getting all insights:', error);
      throw error;
    }
  }
}

export default new PerformanceInsightsService();