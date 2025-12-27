import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getStoreProfileFromCache, getStoreSettingsFromCache } from '../context/StoreSettingsContext';

class PDFReportsService {
  constructor() {
    this.supportedReports = [
      'business_summary',
      'sales_report',
      'products_report',
      'inventory_report'
    ];
  }

  // Generate date string for filenames
  getDateString(date = null) {
    const d = date || new Date();
    return d.toISOString().split('T')[0].replace(/-/g, '');
  }

  // Format currency
  formatCurrency(amount) {
    return `₹${parseFloat(amount || 0).toFixed(2)}`;
  }

  // Format date for display
  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Get store information with validation
  // NOTE: AsyncStorage fallback removed as part of Task 12 cleanup
  // StoreSettingsContext is now the ONLY read path for store settings
  async getStoreInfo() {
    try {
      console.log('📊 [PDF Reports] Getting store information from StoreSettingsContext...');
      
      // Read from StoreSettingsContext cache (single source of truth)
      const storeProfile = getStoreProfileFromCache();
      const storeSettings = getStoreSettingsFromCache();
      
      console.log('📊 [PDF Reports] Store data from context:', {
        hasName: !!storeProfile.store_name,
        hasAddress: !!storeProfile.store_address,
        hasGstNumber: !!storeProfile.gst_number
      });
      
      // Build store info from context cache
      // NOTE: store_phone and store_email are auth-bound, not in StoreSettingsContext
      const storeInfo = {
        name: storeProfile.store_name || null,
        address: storeProfile.store_address || null,
        phone: null, // Auth-bound, not available from StoreSettingsContext
        email: null, // Auth-bound, not available from StoreSettingsContext
        gstNumber: storeProfile.gst_number || ''
      };
      
      // Check if essential store data is missing
      if (!storeInfo.name || !storeInfo.address) {
        console.warn('📊 [PDF Reports] Incomplete store data detected');
        throw new Error('Store information is incomplete. Please complete your store setup in Settings.');
      }
      
      console.log('✅ [PDF Reports] Store information validated successfully');
      return storeInfo;
    } catch (error) {
      console.error('❌ [PDF Reports] Error getting store info:', error);
      
      // If it's a validation error, throw it up
      if (error.message.includes('incomplete') || error.message.includes('not found')) {
        throw error;
      }
      
      // For other errors, provide a generic message
      throw new Error('Unable to load store information. Please check your store settings and try again.');
    }
  }

  // Get business data for reports - FIXED: Fetch real store data
  async getBusinessData() {
    try {
      console.log('📊 [PDF Reports] Fetching REAL business data from services...');
      
      // Import services dynamically to avoid circular dependencies
      const productsService = (await import('./ProductsService')).default;
      const ordersService = (await import('./OrdersService')).default;
      
      // Fetch real data from services (which handle store filtering)
      const [products, orders] = await Promise.all([
        productsService.getProducts().catch(err => {
          console.warn('📊 [PDF Reports] Products service failed, trying AsyncStorage:', err.message);
          return AsyncStorage.getItem('products').then(data => data ? JSON.parse(data) : []);
        }),
        ordersService.getOrders().catch(err => {
          console.warn('📊 [PDF Reports] Orders service failed, trying AsyncStorage:', err.message);
          return AsyncStorage.getItem('orders').then(data => data ? JSON.parse(data) : []);
        })
      ]);

      console.log('📊 [PDF Reports] REAL business data loaded:', {
        products: products.length,
        orders: orders.length
      });

      // Validate that we have real store data
      if (products.length === 0 && orders.length === 0) {
        throw new Error('No business data available. Please add products and make some sales before generating reports.');
      }

      // Log sample data for verification
      if (products.length > 0) {
        console.log('📊 [PDF Reports] Sample product:', {
          name: products[0].name,
          price: products[0].price,
          stock: products[0].stock || products[0].stock_quantity,
          trackStock: products[0].trackStock || products[0].track_stock
        });
      }

      if (orders.length > 0) {
        console.log('📊 [PDF Reports] Sample order:', {
          id: orders[0].id,
          orderNumber: orders[0].orderNumber,
          total: orders[0].total,
          itemsCount: orders[0].items?.length || 0
        });
      }

      return { products, orders };
    } catch (error) {
      console.error('❌ [PDF Reports] Error fetching business data:', error);
      throw error; // Don't fall back to sample data - throw error instead
    }
  }

  // Calculate business metrics
  calculateMetrics(products, orders) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = products.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate by payment method - Cash and UPI/QR only (Card removed)
    const paymentMethods = {
      cash: orders.filter(o => {
        const method = (o.paymentMethod || '').toLowerCase();
        return method.includes('cash');
      }).length,
      upi: orders.filter(o => {
        const method = (o.paymentMethod || '').toLowerCase();
        return method.includes('upi') || method.includes('qr');
      }).length,
      other: orders.filter(o => {
        const method = (o.paymentMethod || '').toLowerCase();
        return !method.includes('cash') && !method.includes('upi') && !method.includes('qr') && method !== '';
      }).length
    };

    // Calculate by category
    const categories = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    // Calculate inventory value - FIXED: Use correct stock field
    const inventoryValue = products.reduce((sum, product) => {
      const stock = product.stock || product.stock_quantity || 0;
      return sum + (stock * (product.price || 0));
    }, 0);

    // Low stock products - FIXED: Use track_stock (backend field)
    const lowStockProducts = products.filter(p => {
      const isTracking = p.track_stock !== false;
      const stock = p.stock || p.stock_quantity || 0;
      return isTracking && stock <= 5;
    });

    return {
      totalRevenue,
      totalOrders,
      totalProducts,
      avgOrderValue,
      paymentMethods,
      categories,
      inventoryValue,
      lowStockProducts: lowStockProducts.length,
      topProducts: this.getTopProducts(products, orders)
    };
  }

  // Get top selling products
  getTopProducts(products, orders) {
    const productSales = {};
    
    orders.forEach(order => {
      (order.items || []).forEach(item => {
        const productName = item.name;
        if (!productSales[productName]) {
          productSales[productName] = { quantity: 0, revenue: 0 };
        }
        productSales[productName].quantity += item.quantity || 0;
        productSales[productName].revenue += (item.quantity || 0) * (item.price || 0);
      });
    });

    return Object.entries(productSales)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  // Generate Business Summary Report
  async generateBusinessSummaryReport() {
    try {
      console.log('📊 [PDF Reports] Generating Business Summary Report...');
      
      // Validate store information first
      const storeInfo = await this.getStoreInfo();
      const { products, orders } = await this.getBusinessData();
      
      // Validate business data
      if (products.length === 0 && orders.length === 0) {
        throw new Error('No business data available. Please add products and make some sales before generating reports.');
      }
      
      const metrics = this.calculateMetrics(products, orders);

      const html = this.generateBusinessSummaryHTML(storeInfo, metrics);
      const filename = `FlowPOS_Business_Summary_${this.getDateString()}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      console.log('✅ [PDF Reports] Business Summary Report generated:', filename);
      return { uri, filename, type: 'business_summary' };
    } catch (error) {
      console.error('❌ [PDF Reports] Error generating Business Summary Report:', error);
      
      // Provide specific error messages for common issues
      if (error.message.includes('incomplete') || error.message.includes('not found')) {
        throw new Error(`Store Setup Required: ${error.message}`);
      } else if (error.message.includes('No business data')) {
        throw error; // Pass through business data error as-is
      } else {
        throw new Error(`Report Generation Failed: ${error.message}`);
      }
    }
  }

  // Generate Sales Report
  async generateSalesReport(period = 'all') {
    try {
      console.log('📊 [PDF Reports] Generating Sales Report...');
      
      const storeInfo = await this.getStoreInfo();
      const { products, orders } = await this.getBusinessData();
      
      // Filter orders by period if needed
      let filteredOrders = orders;
      if (period !== 'all') {
        const now = new Date();
        const periodStart = new Date();
        
        switch (period) {
          case 'today':
            periodStart.setHours(0, 0, 0, 0);
            break;
          case 'week':
            periodStart.setDate(now.getDate() - 7);
            break;
          case 'month':
            periodStart.setMonth(now.getMonth() - 1);
            break;
        }
        
        filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.timestamp || order.createdAt);
          return orderDate >= periodStart;
        });
      }

      const metrics = this.calculateMetrics(products, filteredOrders);
      const html = this.generateSalesReportHTML(storeInfo, filteredOrders, metrics, period);
      const filename = `FlowPOS_Sales_Report_${period}_${this.getDateString()}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      console.log('✅ [PDF Reports] Sales Report generated:', filename);
      return { uri, filename, type: 'sales_report' };
    } catch (error) {
      console.error('❌ [PDF Reports] Error generating Sales Report:', error);
      throw error;
    }
  }

  // Generate Products Report
  async generateProductsReport() {
    try {
      console.log('📊 [PDF Reports] Generating Products Report...');
      
      const storeInfo = await this.getStoreInfo();
      const { products } = await this.getBusinessData();

      const html = this.generateProductsReportHTML(storeInfo, products);
      const filename = `FlowPOS_Products_Report_${this.getDateString()}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      console.log('✅ [PDF Reports] Products Report generated:', filename);
      return { uri, filename, type: 'products_report' };
    } catch (error) {
      console.error('❌ [PDF Reports] Error generating Products Report:', error);
      throw error;
    }
  }

  // Generate Inventory Report
  async generateInventoryReport() {
    try {
      console.log('📊 [PDF Reports] Generating Inventory Report...');
      
      const storeInfo = await this.getStoreInfo();
      const { products } = await this.getBusinessData();

      const html = this.generateInventoryReportHTML(storeInfo, products);
      const filename = `FlowPOS_Inventory_Report_${this.getDateString()}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      console.log('✅ [PDF Reports] Inventory Report generated:', filename);
      return { uri, filename, type: 'inventory_report' };
    } catch (error) {
      console.error('❌ [PDF Reports] Error generating Inventory Report:', error);
      throw error;
    }
  }

  // Share PDF report
  async shareReport(reportResult) {
    try {
      console.log('📤 [PDF Reports] Sharing report:', reportResult.filename);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(reportResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${reportResult.filename}`,
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ [PDF Reports] Report shared successfully');
        return true;
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('❌ [PDF Reports] Error sharing report:', error);
      throw error;
    }
  }

  // Save PDF report to device
  async saveReportToDevice(reportResult) {
    try {
      console.log('💾 [PDF Reports] Saving report to device:', reportResult.filename);
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(reportResult.uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Save ${reportResult.filename}`,
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ [PDF Reports] Report saved to device successfully');
        return true;
      } else {
        throw new Error('Sharing/saving is not available on this device');
      }
    } catch (error) {
      console.error('❌ [PDF Reports] Error saving report to device:', error);
      throw error;
    }
  }

  // Get available report types
  getAvailableReportTypes() {
    return [
      {
        id: 'business_summary',
        name: 'Business Summary Report',
        description: 'Complete overview of your business performance',
        icon: 'analytics-outline'
      },
      {
        id: 'sales_report',
        name: 'Sales Report',
        description: 'Detailed sales analysis and trends',
        icon: 'trending-up-outline'
      },
      {
        id: 'products_report',
        name: 'Products Report',
        description: 'Complete product catalog and performance',
        icon: 'cube-outline'
      },
      {
        id: 'inventory_report',
        name: 'Inventory Report',
        description: 'Stock levels and inventory analysis',
        icon: 'archive-outline'
      }
    ];
  }

  // Generate report based on type
  async generateReport(reportType, options = {}) {
    switch (reportType) {
      case 'business_summary':
        return await this.generateBusinessSummaryReport();
      case 'sales_report':
        return await this.generateSalesReport(options.period || 'all');
      case 'products_report':
        return await this.generateProductsReport();
      case 'inventory_report':
        return await this.generateInventoryReport();
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  // HTML Templates will be added in the next part...
  generateBusinessSummaryHTML(storeInfo, metrics) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Business Summary Report</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          ${this.generateReportHeader(storeInfo, 'Business Summary Report')}
          
          <div class="content-section">
            <h2>Executive Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${this.formatCurrency(metrics.totalRevenue)}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${metrics.totalOrders}</div>
                <div class="metric-label">Total Orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${metrics.totalProducts}</div>
                <div class="metric-label">Total Products</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${this.formatCurrency(metrics.avgOrderValue)}</div>
                <div class="metric-label">Avg Order Value</div>
              </div>
            </div>

            <h2>Payment Methods Distribution</h2>
            <div class="payment-methods">
              <div class="payment-item">
                <span class="payment-label">Cash Payments:</span>
                <span class="payment-value">${metrics.paymentMethods.cash} orders</span>
              </div>
              <div class="payment-item">
                <span class="payment-label">UPI/QR Payments:</span>
                <span class="payment-value">${metrics.paymentMethods.upi} orders</span>
              </div>
              ${metrics.paymentMethods.other > 0 ? `
              <div class="payment-item">
                <span class="payment-label">Other Payments:</span>
                <span class="payment-value">${metrics.paymentMethods.other} orders</span>
              </div>
              ` : ''}
            </div>

            <h2>Top Selling Products</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                ${metrics.topProducts.map(product => `
                  <tr>
                    <td>${product.name}</td>
                    <td>${product.quantity}</td>
                    <td>${this.formatCurrency(product.revenue)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <h2>Inventory Overview</h2>
            <div class="inventory-summary">
              <div class="inventory-item">
                <span class="inventory-label">Total Inventory Value:</span>
                <span class="inventory-value">${this.formatCurrency(metrics.inventoryValue)}</span>
              </div>
              <div class="inventory-item">
                <span class="inventory-label">Low Stock Products:</span>
                <span class="inventory-value">${metrics.lowStockProducts} items</span>
              </div>
            </div>
          </div>

          ${this.generateReportFooter()}
        </div>
      </body>
      </html>
    `;
  }

  // Additional HTML generation methods will be added...
  generateSalesReportHTML(storeInfo, orders, metrics, period) {
    const periodTitle = period.charAt(0).toUpperCase() + period.slice(1);
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Sales Report - ${periodTitle}</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          ${this.generateReportHeader(storeInfo, `Sales Report - ${periodTitle}`)}
          
          <div class="content-section">
            <h2>Sales Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${this.formatCurrency(metrics.totalRevenue)}</div>
                <div class="metric-label">Total Revenue</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${metrics.totalOrders}</div>
                <div class="metric-label">Total Orders</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${this.formatCurrency(metrics.avgOrderValue)}</div>
                <div class="metric-label">Average Order Value</div>
              </div>
            </div>

            <h2>Recent Orders</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Payment Method</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${orders.slice(0, 10).map(order => `
                  <tr>
                    <td>${order.orderNumber || order.id}</td>
                    <td>${order.customerName || 'Walk-in Customer'}</td>
                    <td>${this.formatDate(order.timestamp || order.createdAt)}</td>
                    <td>${order.paymentMethod || 'Cash'}</td>
                    <td>${this.formatCurrency(order.total)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          ${this.generateReportFooter()}
        </div>
      </body>
      </html>
    `;
  }

  generateProductsReportHTML(storeInfo, products) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Products Report</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          ${this.generateReportHeader(storeInfo, 'Products Report')}
          
          <div class="content-section">
            <h2>Product Catalog</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Track Stock</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(product => {
                  const isTracking = product.track_stock !== false;
                  const stock = product.stock || product.stock_quantity || 0;
                  const status = !isTracking ? 'Not Tracked' : stock <= 5 ? 'Low Stock' : 'In Stock';
                  return `
                  <tr>
                    <td>${product.name}</td>
                    <td>${product.category || 'Uncategorized'}</td>
                    <td>${this.formatCurrency(product.price)}</td>
                    <td>${isTracking ? stock : 'N/A'}</td>
                    <td>${isTracking ? 'Yes' : 'No'}</td>
                    <td class="${status === 'Low Stock' ? 'low-stock' : ''}">${status}</td>
                  </tr>
                `}).join('')}
              </tbody>
            </table>
          </div>

          ${this.generateReportFooter()}
        </div>
      </body>
      </html>
    `;
  }

  generateInventoryReportHTML(storeInfo, products) {
    const trackedProducts = products.filter(p => p.track_stock !== false);
    const totalValue = products.reduce((sum, p) => {
      const stock = p.stock || p.stock_quantity || 0;
      return sum + (stock * (p.price || 0));
    }, 0);
    const lowStockProducts = trackedProducts.filter(p => (p.stock || p.stock_quantity || 0) <= 5);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Inventory Report</title>
        <style>
          ${this.getReportStyles()}
        </style>
      </head>
      <body>
        <div class="report-container">
          ${this.generateReportHeader(storeInfo, 'Inventory Report')}
          
          <div class="content-section">
            <h2>Inventory Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${products.length}</div>
                <div class="metric-label">Total Products</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${trackedProducts.length}</div>
                <div class="metric-label">Tracked Products</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${this.formatCurrency(totalValue)}</div>
                <div class="metric-label">Total Value</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${lowStockProducts.length}</div>
                <div class="metric-label">Low Stock Items</div>
              </div>
            </div>

            <h2>Stock Details</h2>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Current Stock</th>
                  <th>Track Stock</th>
                  <th>Unit Price</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(product => {
                  const isTracking = product.track_stock !== false;
                  const stock = product.stock || product.stock_quantity || 0;
                  const stockValue = stock * (product.price || 0);
                  const status = !isTracking ? 'Not Tracked' : 
                                stock <= 5 ? 'Low Stock' : 'In Stock';
                  
                  return `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.category || 'Uncategorized'}</td>
                      <td>${isTracking ? stock : 'N/A'}</td>
                      <td>${isTracking ? 'Yes' : 'No'}</td>
                      <td>${this.formatCurrency(product.price)}</td>
                      <td>${this.formatCurrency(stockValue)}</td>
                      <td class="${status === 'Low Stock' ? 'low-stock' : ''}">${status}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          ${this.generateReportFooter()}
        </div>
      </body>
      </html>
    `;
  }

  generateReportHeader(storeInfo, reportTitle) {
    return `
      <div class="report-header">
        <div class="store-info">
          <h1>${storeInfo.name}</h1>
          <p>${storeInfo.address}</p>
          <p>Phone: ${storeInfo.phone} ${storeInfo.email ? `| Email: ${storeInfo.email}` : ''}</p>
          ${storeInfo.gstNumber ? `<p>GSTIN: ${storeInfo.gstNumber}</p>` : ''}
        </div>
        <div class="report-title">
          <h2>${reportTitle}</h2>
          <p>Generated on: ${this.formatDate(new Date().toISOString())}</p>
        </div>
      </div>
    `;
  }

  generateReportFooter() {
    return `
      <div class="report-footer">
        <div class="footer-content">
          <p>This report was generated by FlowPOS - Point of Sale System</p>
          <p>Generated on: ${new Date().toLocaleString('en-IN')}</p>
        </div>
      </div>
    `;
  }



  getReportStyles() {
    return `
      @page {
        margin: 60px 40px;
      }
      
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 0;
        background-color: #ffffff;
        color: #1f2937;
        line-height: 1.6;
      }
      
      .report-container {
        max-width: 700px;
        margin: 0 auto;
        padding: 40px;
        background: white;
        box-sizing: border-box;
      }
      
      .report-header {
        text-align: center;
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .store-info h1 {
        color: #2563eb;
        margin: 0 0 10px 0;
        font-size: 28px;
        text-align: center;
      }
      
      .store-info p {
        margin: 5px 0;
        color: #6b7280;
        text-align: center;
      }
      
      .report-title {
        margin-top: 20px;
      }
      
      .report-title h2 {
        color: #1f2937;
        margin: 0 0 5px 0;
        font-size: 24px;
      }
      
      .report-title p {
        color: #6b7280;
        margin: 0;
      }
      
      .content-section {
        margin-bottom: 30px;
      }
      
      .content-section h2 {
        color: #2563eb;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 8px;
        margin: 30px 0 20px 0;
      }
      
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
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
        color: #6b7280;
        font-weight: 500;
      }
      
      .data-table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 30px;
        background: white;
      }
      
      .data-table th {
        background: #2563eb;
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        color: #ffffff;
        border-bottom: 2px solid #2563eb;
      }
      
      .data-table td {
        padding: 10px 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .data-table tr:nth-child(even) {
        background: #eff6ff;
      }
      
      .payment-methods, .inventory-summary {
        background: #eff6ff;
        border: 1px solid #2563eb;
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      }
      
      .payment-item, .inventory-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 10px;
        padding: 5px 0;
      }
      
      .payment-label, .inventory-label {
        font-weight: 500;
        color: #374151;
      }
      
      .payment-value, .inventory-value {
        font-weight: 600;
        color: #1f2937;
      }
      
      .low-stock {
        color: #dc2626;
        font-weight: 600;
      }
      
      .report-footer {
        border-top: 2px solid #e5e7eb;
        padding-top: 20px;
        margin-top: 40px;
        text-align: center;
      }
      
      .footer-content p {
        margin: 5px 0;
        color: #6b7280;
        font-size: 14px;
      }
      
      @media print {
        body { margin: 0; padding: 0; }
        .report-container { max-width: none; }
      }
    `;
  }
}

// Create singleton instance
const pdfReportsService = new PDFReportsService();

export default pdfReportsService;