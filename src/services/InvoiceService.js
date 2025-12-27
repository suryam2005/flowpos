/**
 * Unified Invoice Service
 * Consolidates all invoice generation, formatting, and sharing logic
 * Single source of truth for invoice operations across the app
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import GSTService from './GSTService';
import { getAppSettingFromCache } from '../context/AppSettingsContext';
import { getStoreSettingsFromCache, getReceiptSettingsFromCache } from '../context/StoreSettingsContext';

class InvoiceService {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = 30 * 1000; // 30 seconds - reduced to ensure fresh settings
    this.initializeGST();
  }

  async initializeGST() {
    try {
      await GSTService.initialize();
    } catch (error) {
      console.error('❌ [InvoiceService] Error initializing GST service:', error);
    }
  }

  /**
   * Generate complete invoice data from order data
   * Consolidates all invoice data processing logic
   */
  async generateInvoiceData(orderData) {
    try {
      console.log('📄 [InvoiceService] Generating invoice data from order:', orderData?.orderNumber || 'Unknown');

      // Validate input
      if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
        throw new Error('Invalid order data: missing items array');
      }

      // Load store information (consolidated)
      const storeInfo = await this.getStoreInformation();
      
      // Load receipt settings (consolidated)
      const receiptSettings = await this.getReceiptSettings();

      // Generate invoice number (consolidated)
      const invoiceNumber = orderData.orderNumber || this.generateInvoiceNumber();

      // Calculate totals (consolidated)
      const totals = this.calculateTotals(orderData, storeInfo);

      // Process customer information (consolidated)
      const customerInfo = this.processCustomerInfo(orderData);

      // Apply store name display setting (consolidated)
      const displayStoreName = this.getDisplayStoreName(storeInfo, receiptSettings);

      // Build complete invoice data structure
      const invoiceData = {
        // Store details
        storeName: displayStoreName,
        storeAddress: storeInfo.store_address || storeInfo.address || '',
        storePhone: storeInfo.store_phone || storeInfo.phone || '',
        storeEmail: storeInfo.store_email || storeInfo.email || '',
        storeContact: storeInfo.store_phone || storeInfo.phone || '+91 XXXXXXXXXX',
        storeGSTIN: storeInfo.gst_number || storeInfo.gstin || '',
        gstNumber: storeInfo.gst_number || storeInfo.gstin || '', // For SimpleInvoicePreview compatibility
        
        // Invoice details
        invoiceNumber,
        date: this.formatOrderDate(orderData),
        time: this.formatOrderTime(orderData),
        
        // Customer information
        customerName: customerInfo.name,
        phoneNumber: customerInfo.phone,
        
        // Items and totals
        items: orderData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal: totals.subtotal,
        ...(totals.tax > 0 && { 
          tax: totals.tax, 
          gst: totals.tax, 
          gstPercentage: totals.gstPercentage 
        }),
        grandTotal: totals.grandTotal,
        total: totals.grandTotal, // For compatibility
        paymentMethod: orderData.paymentMethod || 'Cash',
        
        // Receipt settings for display
        receiptSettings
      };

      console.log('📄 [InvoiceService] Invoice data generated successfully:', {
        invoiceNumber,
        storeName: displayStoreName,
        customerName: customerInfo.name,
        itemCount: orderData.items.length,
        grandTotal: totals.grandTotal
      });

      return invoiceData;
    } catch (error) {
      console.error('❌ [InvoiceService] Error generating invoice data:', error);
      throw new Error(`Failed to generate invoice data: ${error.message}`);
    }
  }

  /**
   * Load store information
   * Reads from StoreSettingsContext cache (single source of truth)
   * 
   * NOTE: Internal caching removed - context already handles caching
   * This ensures settings changes are reflected immediately
   */
  async getStoreInformation() {
    try {
      // Read from StoreSettingsContext cache (single source of truth)
      const cachedStoreSettings = getStoreSettingsFromCache();
      
      // Build store info from context cache
      // Returns empty values if context not yet initialized (will be populated after login)
      const storeInfo = {
        store_name: cachedStoreSettings?.store_name || '',
        store_address: cachedStoreSettings?.store_address || '',
        store_phone: '', // Auth-bound, not in StoreSettingsContext
        store_email: '', // Auth-bound, not in StoreSettingsContext
        gst_number: cachedStoreSettings?.gst_number || '',
        currency: cachedStoreSettings?.currency || 'INR',
        upi_id: cachedStoreSettings?.upi_id || '',
        upi_id_2: cachedStoreSettings?.upi_id_2 || '',
        upi_id_3: cachedStoreSettings?.upi_id_3 || ''
      };
      
      console.log('📄 [InvoiceService] Store info read from StoreSettingsContext cache');
      return storeInfo;
    } catch (error) {
      console.error('❌ [InvoiceService] Error loading store info:', error);
      return {};
    }
  }

  /**
   * Load and cache receipt settings
   * Uses getReceiptSettingsFromCache() for receipt display settings with proper boolean handling,
   * and AppSettingsContext cache for showStoreNameOnInvoice
   * 
   * NOTE: Internal caching removed for settings - context already handles caching
   * This ensures settings changes are reflected immediately
   */
  async getReceiptSettings() {
    try {
      // Use getReceiptSettingsFromCache() which applies proper boolean handling
      // CRITICAL: This function uses !== undefined checks for booleans (undefined !== false)
      // Returns defaults with proper boolean handling even if context not registered yet
      const receiptDisplaySettings = getReceiptSettingsFromCache();
      console.log('📄 [InvoiceService] Receipt settings read using getReceiptSettingsFromCache()');

      // Read showStoreNameOnInvoice from AppSettingsContext cache first
      // Falls back to AsyncStorage if cache is unavailable (backward compatibility)
      let showStoreName;
      const cachedShowStoreName = getAppSettingFromCache('showStoreNameOnInvoice');
      
      if (cachedShowStoreName !== undefined) {
        // Use cached value from AppSettingsContext
        showStoreName = cachedShowStoreName;
        console.log('📄 [InvoiceService] showStoreNameOnInvoice read from cache:', showStoreName);
      } else {
        // Fallback to AsyncStorage if cache unavailable
        const showStoreNameSetting = await AsyncStorage.getItem('showStoreNameOnInvoice');
        showStoreName = showStoreNameSetting !== null ? JSON.parse(showStoreNameSetting) : true;
        console.log('📄 [InvoiceService] showStoreNameOnInvoice fallback to AsyncStorage:', showStoreName);
      }

      const settings = {
        ...receiptDisplaySettings,
        showStoreName
      };

      return settings;
    } catch (error) {
      console.error('❌ [InvoiceService] Error loading receipt settings:', error);
      return {
        showAddress: true,
        showPhone: true,
        showEmail: false,
        showGST: true,
        showStoreName: true
      };
    }
  }

  /**
   * Check if invoice sending is enabled
   * Reads sendInvoiceEnabled from AppSettingsContext cache first,
   * with fallback to AsyncStorage for backward compatibility
   * 
   * @returns {Promise<boolean>} Whether invoice sending is enabled
   */
  async isSendInvoiceEnabled() {
    try {
      // Read sendInvoiceEnabled from AppSettingsContext cache first
      const cachedSendInvoiceEnabled = getAppSettingFromCache('sendInvoiceEnabled');
      
      if (cachedSendInvoiceEnabled !== undefined) {
        // Use cached value from AppSettingsContext
        console.log('📄 [InvoiceService] sendInvoiceEnabled read from cache:', cachedSendInvoiceEnabled);
        return cachedSendInvoiceEnabled;
      }
      
      // Fallback to AsyncStorage if cache unavailable (backward compatibility)
      const sendInvoiceEnabledSetting = await AsyncStorage.getItem('sendInvoiceEnabled');
      const sendInvoiceEnabled = sendInvoiceEnabledSetting !== null ? JSON.parse(sendInvoiceEnabledSetting) : true;
      console.log('📄 [InvoiceService] sendInvoiceEnabled fallback to AsyncStorage:', sendInvoiceEnabled);
      return sendInvoiceEnabled;
    } catch (error) {
      console.error('❌ [InvoiceService] Error reading sendInvoiceEnabled:', error);
      // Return true as default to maintain existing behavior if setting unavailable
      return true;
    }
  }

  /**
   * Get the WhatsApp method setting
   * Reads whatsappMethod from AppSettingsContext cache first,
   * with fallback to AsyncStorage for backward compatibility
   * 
   * @returns {Promise<string>} The WhatsApp method ('flowpos' or 'device')
   */
  async getWhatsAppMethod() {
    try {
      // Read whatsappMethod from AppSettingsContext cache first
      const cachedWhatsappMethod = getAppSettingFromCache('whatsappMethod');
      
      if (cachedWhatsappMethod !== undefined) {
        // Use cached value from AppSettingsContext
        console.log('📄 [InvoiceService] whatsappMethod read from cache:', cachedWhatsappMethod);
        return cachedWhatsappMethod;
      }
      
      // Fallback to AsyncStorage if cache unavailable (backward compatibility)
      const whatsappMethodSetting = await AsyncStorage.getItem('whatsappMethod');
      const whatsappMethod = whatsappMethodSetting !== null ? whatsappMethodSetting : 'flowpos';
      console.log('📄 [InvoiceService] whatsappMethod fallback to AsyncStorage:', whatsappMethod);
      return whatsappMethod;
    } catch (error) {
      console.error('❌ [InvoiceService] Error reading whatsappMethod:', error);
      // Return 'flowpos' as default to maintain existing behavior if setting unavailable
      return 'flowpos';
    }
  }

  /**
   * Calculate invoice totals with proper GST handling
   */
  calculateTotals(orderData, storeInfo) {
    try {
      // Initialize GST service with current settings
      const items = orderData.items || [];
      
      // Use GST service for proper calculation
      const gstCalculation = GSTService.calculateOrderTotals(items);
      
      console.log('📄 [InvoiceService] GST calculation result:', gstCalculation);

      // Handle legacy order data that might have pre-calculated totals
      const legacySubtotal = orderData.subtotal || 0;
      const legacyTax = orderData.gst || orderData.tax || 0;
      const legacyGrandTotal = orderData.total || orderData.grandTotal || 0;

      // Use GST service calculation if available, otherwise fall back to legacy
      const subtotal = gstCalculation.gstEnabled ? gstCalculation.subtotal : legacySubtotal;
      const tax = gstCalculation.gstEnabled ? gstCalculation.gstAmount : legacyTax;
      const grandTotal = gstCalculation.gstEnabled ? gstCalculation.grandTotal : legacyGrandTotal;
      const gstPercentage = gstCalculation.gstRate;

      console.log('📄 [InvoiceService] Final totals:', {
        subtotal,
        tax,
        gstPercentage,
        grandTotal,
        gstEnabled: gstCalculation.gstEnabled
      });

      return {
        subtotal,
        tax,
        gstPercentage,
        grandTotal,
        gstEnabled: gstCalculation.gstEnabled
      };
    } catch (error) {
      console.error('❌ [InvoiceService] Error calculating totals:', error);
      throw new Error('Failed to calculate invoice totals');
    }
  }

  /**
   * Process customer information with fallbacks
   */
  processCustomerInfo(orderData) {
    const customerName = orderData.customerName && orderData.customerName.trim() !== '' 
      ? orderData.customerName 
      : 'Walk-in Customer';
    
    const phoneNumber = orderData.phoneNumber && orderData.phoneNumber.trim() !== '' 
      ? orderData.phoneNumber 
      : '';

    console.log('📄 [InvoiceService] Customer info processed:', {
      originalName: orderData.customerName,
      processedName: customerName,
      originalPhone: orderData.phoneNumber,
      processedPhone: phoneNumber,
      isWalkIn: customerName === 'Walk-in Customer'
    });

    return {
      name: customerName,
      phone: phoneNumber
    };
  }

  /**
   * Get display store name based on settings
   */
  getDisplayStoreName(storeInfo, receiptSettings) {
    const actualStoreName = storeInfo.store_name || storeInfo.name;
    const showStoreName = receiptSettings.showStoreName;
    
    const displayStoreName = showStoreName && actualStoreName ? actualStoreName : 'FlowPOS Store';
    
    console.log('📄 [InvoiceService] Store name processing:', {
      showStoreName,
      actualStoreName,
      displayStoreName,
      willShowCustomName: displayStoreName !== 'FlowPOS Store'
    });

    return displayStoreName;
  }

  /**
   * Generate unique invoice number
   */
  generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const time = Date.now().toString().slice(-4);
    
    const invoiceNumber = `INV-${year}${month}${day}-${time}`;
    console.log('📄 [InvoiceService] Generated invoice number:', invoiceNumber);
    
    return invoiceNumber;
  }

  /**
   * Format order date from various date field formats - FIXED: Handle all backend date formats
   */
  formatOrderDate(orderData) {
    try {
      let orderDate;
      
      // Handle multiple date field formats from backend with priority order
      if (orderData.timestamp) {
        // Handle both Unix timestamp (number) and ISO string
        if (typeof orderData.timestamp === 'number') {
          orderDate = new Date(orderData.timestamp);
        } else if (typeof orderData.timestamp === 'string') {
          orderDate = new Date(orderData.timestamp);
        }
      } else if (orderData.createdAt) {
        orderDate = new Date(orderData.createdAt);
      } else if (orderData.created_at) {
        orderDate = new Date(orderData.created_at);
      } else if (orderData.date) {
        orderDate = new Date(orderData.date);
      } else {
        // Fallback to current date if no date field found
        console.warn('📄 [InvoiceService] No date field found in order data, using current date');
        orderDate = new Date();
      }
      
      // Validate date
      if (isNaN(orderDate.getTime())) {
        console.warn('📄 [InvoiceService] Invalid date in order data, using current date');
        orderDate = new Date();
      }
      
      const formattedDate = orderDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      console.log('📄 [InvoiceService] Date formatting:', {
        originalTimestamp: orderData.timestamp,
        originalCreatedAt: orderData.createdAt,
        originalCreated_at: orderData.created_at,
        parsedDate: orderDate.toISOString(),
        formattedDate
      });
      
      return formattedDate;
    } catch (error) {
      console.error('📄 [InvoiceService] Error formatting order date:', error);
      return new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  /**
   * Format order time from various date field formats
   */
  formatOrderTime(orderData) {
    try {
      let orderDate;
      
      // Handle multiple date field formats from backend
      if (orderData.timestamp) {
        orderDate = typeof orderData.timestamp === 'number' 
          ? new Date(orderData.timestamp) 
          : new Date(orderData.timestamp);
      } else if (orderData.createdAt) {
        orderDate = new Date(orderData.createdAt);
      } else if (orderData.created_at) {
        orderDate = new Date(orderData.created_at);
      } else if (orderData.date) {
        orderDate = new Date(orderData.date);
      } else {
        // Fallback to current time if no date field found
        orderDate = new Date();
      }
      
      // Validate date
      if (isNaN(orderDate.getTime())) {
        orderDate = new Date();
      }
      
      return orderDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error('📄 [InvoiceService] Error formatting order time:', error);
      return new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }
  }

  /**
   * Generate HTML template for invoice PDF
   */
  generateInvoiceHTML(invoiceData) {
    try {
      if (!invoiceData) {
        throw new Error('Invoice data is required');
      }

      const {
        storeName = 'FlowPOS Store',
        storeAddress = '',
        storeContact = '+91 XXXXXXXXXX',
        storeGSTIN = '',
        invoiceNumber = 'INV-001',
        date = new Date().toLocaleDateString('en-IN'),
        time = new Date().toLocaleTimeString('en-IN'),
        customerName = 'Walk-in Customer',
        phoneNumber = '',
        items = [],
        subtotal = 0,
        tax = 0,
        grandTotal = 0,
      } = invoiceData;

      if (!Array.isArray(items)) {
        throw new Error('Items must be an array');
      }

      const itemsHTML = items.map(item => `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${item.price}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">₹${(item.quantity * item.price).toFixed(2)}</td>
        </tr>
      `).join('');

      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Invoice ${invoiceNumber}</title>
          <style>
            @page { margin: 60px 40px; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              margin: 0; padding: 0; background-color: #ffffff; color: #1f2937; line-height: 1.5;
            }
            .invoice-container {
              max-width: 700px; margin: 0 auto; padding: 40px; background: white;
              border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-sizing: border-box;
            }
            .header {
              background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
              color: white; padding: 30px; text-align: center;
            }
            .store-name { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
            .store-details { font-size: 14px; opacity: 0.9; }
            .invoice-info {
              padding: 20px 30px; background: #f8fafc; border-bottom: 1px solid #e5e7eb;
            }
            .invoice-row {
              display: flex; justify-content: space-between; margin-bottom: 8px;
            }
            .invoice-label { font-weight: 600; color: #374151; }
            .invoice-value { color: #1f2937; }
            .items-section { padding: 30px; }
            .section-title {
              font-size: 18px; font-weight: 600; margin-bottom: 20px; color: #1f2937;
              border-bottom: 2px solid #2563eb; padding-bottom: 8px;
            }
            .items-table {
              width: 100%; border-collapse: collapse; margin-bottom: 30px;
            }
            .items-table th {
              background: #f3f4f6; padding: 12px 8px; text-align: left; font-weight: 600;
              color: #374151; border-bottom: 2px solid #e5e7eb;
            }
            .items-table th:nth-child(2), .items-table th:nth-child(3), .items-table th:nth-child(4) {
              text-align: right;
            }
            .totals-section {
              background: #f8fafc; padding: 20px 30px; border-top: 1px solid #e5e7eb;
            }
            .total-row {
              display: flex; justify-content: space-between; margin-bottom: 8px; padding: 4px 0;
            }
            .total-label { font-weight: 500; color: #374151; }
            .total-value { font-weight: 600; color: #1f2937; }
            .grand-total {
              border-top: 2px solid #2563eb; padding-top: 12px; margin-top: 12px;
            }
            .grand-total .total-label, .grand-total .total-value {
              font-size: 18px; font-weight: bold; color: #2563eb;
            }
            .footer {
              padding: 30px; text-align: center; background: #f8fafc; border-top: 1px solid #e5e7eb;
            }
            .thank-you {
              font-size: 16px; color: #2563eb; font-weight: 600; margin-bottom: 10px;
            }
            .footer-note { font-size: 14px; color: #6b7280; }
            @media print {
              body { margin: 0; padding: 0; }
              .invoice-container { border: none; border-radius: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="store-name">${storeName}</div>
              <div class="store-details">
                ${storeAddress ? `${storeAddress}<br>` : ''}
                Contact: ${storeContact}
                ${storeGSTIN ? `<br>GSTIN: ${storeGSTIN}` : ''}
              </div>
            </div>

            <div class="invoice-info">
              <div class="invoice-row">
                <span class="invoice-label">Invoice Number:</span>
                <span class="invoice-value">${invoiceNumber}</span>
              </div>
              <div class="invoice-row">
                <span class="invoice-label">Date:</span>
                <span class="invoice-value">${date}</span>
              </div>
              <div class="invoice-row">
                <span class="invoice-label">Time:</span>
                <span class="invoice-value">${time}</span>
              </div>
              <div class="invoice-row">
                <span class="invoice-label">Customer:</span>
                <span class="invoice-value">${customerName}</span>
              </div>
              ${phoneNumber && phoneNumber.trim() ? `
              <div class="invoice-row">
                <span class="invoice-label">Phone:</span>
                <span class="invoice-value">+91 ${phoneNumber}</span>
              </div>
              ` : ''}
            </div>

            <div class="items-section">
              <div class="section-title">Items Purchased</div>
              <table class="items-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Quantity</th>
                    <th>Unit Price</th>
                    <th>Total Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>

            <div class="totals-section">
              <div class="total-row">
                <span class="total-label">Subtotal:</span>
                <span class="total-value">₹${subtotal.toFixed(2)}</span>
              </div>
              ${tax > 0 ? `
              <div class="total-row">
                <span class="total-label">Tax (GST):</span>
                <span class="total-value">₹${tax.toFixed(2)}</span>
              </div>
              ` : ''}
              <div class="total-row grand-total">
                <span class="total-label">Grand Total Payable:</span>
                <span class="total-value">₹${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div class="footer">
              <div class="thank-you">Thank you for your business!</div>
              <div class="footer-note">Generated by FlowPOS • Visit again soon!</div>
            </div>
          </div>
        </body>
        </html>
      `;
    } catch (error) {
      console.error('❌ [InvoiceService] Error generating HTML:', error);
      throw new Error(`Failed to generate invoice HTML: ${error.message}`);
    }
  }

  /**
   * Generate PDF from invoice data
   */
  async generateInvoicePDF(invoiceData) {
    try {
      console.log('📄 [InvoiceService] Generating PDF for invoice:', invoiceData.invoiceNumber);

      const html = this.generateInvoiceHTML(invoiceData);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false,
        width: 612, // A4 width in points
        height: 792, // A4 height in points
        margins: {
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
        },
      });

      if (!uri) {
        throw new Error('Failed to generate PDF file');
      }

      console.log('✅ [InvoiceService] PDF generated successfully:', uri);
      return uri;
    } catch (error) {
      console.error('❌ [InvoiceService] Error generating PDF:', error);
      throw new Error(`PDF generation failed: ${error.message}`);
    }
  }

  /**
   * Share invoice PDF
   */
  async shareInvoicePDF(pdfUri, invoiceNumber) {
    try {
      console.log('📄 [InvoiceService] Sharing PDF:', invoiceNumber);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: 'application/pdf',
          dialogTitle: `Share Invoice ${invoiceNumber}`,
          UTI: 'com.adobe.pdf',
        });
        console.log('✅ [InvoiceService] PDF shared successfully');
      } else {
        throw new Error('Sharing is not available on this device');
      }
    } catch (error) {
      console.error('❌ [InvoiceService] Error sharing PDF:', error);
      throw error;
    }
  }

  /**
   * Save PDF to device
   */
  async saveInvoicePDF(pdfUri, invoiceNumber) {
    try {
      console.log('📄 [InvoiceService] Saving PDF to device:', invoiceNumber);

      const fileName = `Invoice_${invoiceNumber}_${Date.now()}.pdf`;
      const downloadDir = FileSystem.documentDirectory + 'invoices/';
      
      // Create invoices directory if it doesn't exist
      const dirInfo = await FileSystem.getInfoAsync(downloadDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(downloadDir, { intermediates: true });
      }
      
      const newPath = downloadDir + fileName;
      await FileSystem.copyAsync({
        from: pdfUri,
        to: newPath,
      });
      
      console.log('✅ [InvoiceService] PDF saved to:', newPath);
      return newPath;
    } catch (error) {
      console.error('❌ [InvoiceService] Error saving PDF:', error);
      throw error;
    }
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
    console.log('📄 [InvoiceService] Cache cleared');
  }
}

export default new InvoiceService();