import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';

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

  // Get store information
  async getStoreInfo() {
    try {
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
  }

  // Get business data for reports
  async getBusinessData() {
    try {
      console.log('📊 [PDF Reports] Fetching business data...');
      
      const [productsData, ordersData] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('orders')
      ]);

      let products = productsData ? JSON.parse(productsData) : [];
      let orders = ordersData ? JSON.parse(ordersData) : [];

      // Create sample data if none exists
      if (products.length === 0) {
        console.log('📊 [PDF Reports] No products found, creating sample data');
        products = [
          {
            name: 'Sample Product 1',
            category: 'Electronics',
            price: 299,
            stock: 15,
            trackStock: true,
            createdAt: new Date().toISOString()
          },
          {
            name: 'Sample Product 2',
            category: 'Clothing',
            price: 49,
            stock: 25,
            trackStock: true,
            createdAt: new Date(Date.now() - 86400000).toISOString()
          },
          {
            name: 'Sample Product 3',
            category: 'Food & Beverages',
            price: 15,
            stock: 100,
            trackStock: true,
            createdAt: new Date(Date.now() - 172800000).toISOString()
          }
        ];
      }

      if (orders.length === 0) {
        console.log('📊 [PDF Reports] No orders found, creating sample data');
        orders = [
          {
            id: 'ORD001',
            orderNumber: 'FP241211001',
            customerName: 'John Doe',
            items: [{ name: 'Sample Product 1', quantity: 2, price: 299 }],
            subtotal: 598,
            tax: 107.64,
            total: 705.64,
            paymentMethod: 'Cash',
            timestamp: new Date().toISOString()
          },
          {
            id: 'ORD002',
            orderNumber: 'FP241211002',
            customerName: 'Jane Smith',
            items: [{ name: 'Sample Product 2', quantity: 1, price: 49 }],
            subtotal: 49,
            tax: 8.82,
            total: 57.82,
            paymentMethod: 'UPI',
            timestamp: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'ORD003',
            orderNumber: 'FP241211003',
            customerName: 'Walk-in Customer',
            items: [{ name: 'Sample Product 3', quantity: 5, price: 15 }],
            subtotal: 75,
            tax: 13.5,
            total: 88.5,
            paymentMethod: 'Card',
            timestamp: new Date(Date.now() - 7200000).toISOString()
          }
        ];
      }

      console.log('✅ [PDF Reports] Business data loaded:', {
        products: products.length,
        orders: orders.length
      });

      return { products, orders };
    } catch (error) {
      console.error('❌ [PDF Reports] Error fetching business data:', error);
      return { products: [], orders: [] };
    }
  }

  // Calculate business metrics
  calculateMetrics(products, orders) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = products.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Calculate by payment method
    const paymentMethods = {
      cash: orders.filter(o => (o.paymentMethod || '').toLowerCase().includes('cash')).length,
      card: orders.filter(o => (o.paymentMethod || '').toLowerCase().includes('card')).length,
      upi: orders.filter(o => (o.paymentMethod || '').toLowerCase().includes('upi')).length
    };

    // Calculate by category
    const categories = {};
    products.forEach(product => {
      const category = product.category || 'Uncategorized';
      categories[category] = (categories[category] || 0) + 1;
    });

    // Calculate inventory value
    const inventoryValue = products.reduce((sum, product) => {
      return sum + ((product.stock || 0) * (product.price || 0));
    }, 0);

    // Low stock products
    const lowStockProducts = products.filter(p => p.trackStock && (p.stock || 0) <= 5);

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
      
      const storeInfo = await this.getStoreInfo();
      const { products, orders } = await this.getBusinessData();
      const metrics = this.calculateMetrics(products, orders);

      const html = this.generateBusinessSummaryHTML(storeInfo, metrics);
      const filename = `FlowPOS_Business_Summary_${this.getDateString()}.pdf`;

      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612,
        height: 792,
      });

      console.log('✅ [PDF Reports] Business Summary Report generated:', filename);
      return { uri, filename, type: 'business_summary' };
    } catch (error) {
      console.error('❌ [PDF Reports] Error generating Business Summary Report:', error);
      throw error;
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
                <span class="payment-label">Card Payments:</span>
                <span class="payment-value">${metrics.paymentMethods.card} orders</span>
              </div>
              <div class="payment-item">
                <span class="payment-label">UPI Payments:</span>
                <span class="payment-value">${metrics.paymentMethods.upi} orders</span>
              </div>
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
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(product => `
                  <tr>
                    <td>${product.name}</td>
                    <td>${product.category || 'Uncategorized'}</td>
                    <td>${this.formatCurrency(product.price)}</td>
                    <td>${product.trackStock ? (product.stock || 0) : 'Not Tracked'}</td>
                    <td>${(product.stock || 0) <= 5 && product.trackStock ? 'Low Stock' : 'In Stock'}</td>
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

  generateInventoryReportHTML(storeInfo, products) {
    const trackedProducts = products.filter(p => p.trackStock);
    const totalValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0);
    const lowStockProducts = trackedProducts.filter(p => (p.stock || 0) <= 5);

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
                  <th>Unit Price</th>
                  <th>Stock Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${products.map(product => {
                  const stockValue = (product.stock || 0) * (product.price || 0);
                  const status = !product.trackStock ? 'Not Tracked' : 
                                (product.stock || 0) <= 5 ? 'Low Stock' : 'In Stock';
                  
                  return `
                    <tr>
                      <td>${product.name}</td>
                      <td>${product.category || 'Uncategorized'}</td>
                      <td>${product.trackStock ? (product.stock || 0) : 'N/A'}</td>
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
      body {
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        margin: 0;
        padding: 20px;
        background-color: #ffffff;
        color: #1f2937;
        line-height: 1.6;
      }
      
      .report-container {
        max-width: 800px;
        margin: 0 auto;
        background: white;
      }
      
      .report-header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }
      
      .store-info h1 {
        color: #2563eb;
        margin: 0 0 10px 0;
        font-size: 28px;
      }
      
      .store-info p {
        margin: 5px 0;
        color: #6b7280;
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
        color: #1f2937;
        border-bottom: 2px solid #e5e7eb;
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
        background: #f8fafc;
        border: 1px solid #e5e7eb;
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
        background: #f3f4f6;
        padding: 12px 8px;
        text-align: left;
        font-weight: 600;
        color: #374151;
        border-bottom: 2px solid #e5e7eb;
      }
      
      .data-table td {
        padding: 10px 8px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .data-table tr:nth-child(even) {
        background: #f9fafb;
      }
      
      .payment-methods, .inventory-summary {
        background: #f8fafc;
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