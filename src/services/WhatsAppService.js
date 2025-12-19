import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiConfig';

class WhatsAppService {
  constructor() {
    this.whatsappMethod = 'flowpos'; // 'flowpos' or 'device' - FlowPOS is default
    this.sendInvoiceEnabled = true; // New setting for send invoice feature
    this.loadSettings();
  }

  async loadSettings() {
    try {
      const [method, sendEnabled] = await Promise.all([
        AsyncStorage.getItem('whatsappMethod'),
        AsyncStorage.getItem('sendInvoiceEnabled')
      ]);
      
      this.whatsappMethod = method || 'flowpos'; // Default to FlowPOS
      this.sendInvoiceEnabled = sendEnabled !== null ? JSON.parse(sendEnabled) : true; // Default enabled
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  }

  async setWhatsAppMethod(method) {
    this.whatsappMethod = method;
    await AsyncStorage.setItem('whatsappMethod', method);
  }

  async setSendInvoiceEnabled(enabled) {
    this.sendInvoiceEnabled = enabled;
    await AsyncStorage.setItem('sendInvoiceEnabled', JSON.stringify(enabled));
  }

  getSendInvoiceEnabled() {
    return this.sendInvoiceEnabled;
  }

  getWhatsAppMethod() {
    return this.whatsappMethod;
  }

  // Check if FlowPOS backend service is ready
  async isFlowPOSReady() {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return false;

      const response = await fetch(`${API_BASE_URL}/whatsapp/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      return result.success && result.data.ready;
    } catch (error) {
      console.error('Error checking FlowPOS WhatsApp status:', error);
      return false;
    }
  }

  // Check if service is ready based on selected method
  async isReady() {
    if (this.whatsappMethod === 'flowpos') {
      return await this.isFlowPOSReady();
    }
    return true; // Device WhatsApp is always available
  }

  // Send invoice via FlowPOS backend (Twilio)
  async sendViaFlowPOS(phoneNumber, invoiceData) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Get user settings for backend to apply same logic as device WhatsApp
      const [showStoreNameSetting, receiptSettings] = await Promise.all([
        AsyncStorage.getItem('showStoreNameOnInvoice'),
        AsyncStorage.getItem('receiptSettings')
      ]);
      
      const parsedReceiptSettings = receiptSettings ? JSON.parse(receiptSettings) : {};
      
      const userSettings = {
        showStoreNameOnInvoice: showStoreNameSetting !== null ? JSON.parse(showStoreNameSetting) : true,
        receiptSettings: {
          showAddress: parsedReceiptSettings.showAddress !== undefined ? parsedReceiptSettings.showAddress : true,
          showPhone: parsedReceiptSettings.showPhone !== undefined ? parsedReceiptSettings.showPhone : true,
          showEmail: parsedReceiptSettings.showEmail !== undefined ? parsedReceiptSettings.showEmail : false,
          showGST: parsedReceiptSettings.showGST !== undefined ? parsedReceiptSettings.showGST : true
        }
      };

      console.log('📱 [WhatsAppService] Sending to FlowPOS backend with settings:', {
        phoneNumber,
        invoiceNumber: invoiceData.orderNumber || invoiceData.invoiceNumber,
        storeName: invoiceData.storeName,
        userSettings
      });

      const response = await fetch(`${API_BASE_URL}/whatsapp/send-invoice`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber,
          invoiceData,
          userSettings // Send user settings to backend
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }

      return {
        success: true,
        messageId: result.data.messageId,
        method: 'flowpos'
      };
    } catch (error) {
      console.error('Error sending via FlowPOS WhatsApp:', error);
      throw error;
    }
  }

  // Send invoice via device WhatsApp
  async sendViaDeviceWhatsApp(phoneNumber, imageUri, invoiceData) {
    try {
      // TESTING PHASE: Removed one-time sending restriction
      // TODO: Re-enable this restriction after testing phase
      // const invoiceKey = `whatsapp_sent_${invoiceData.invoiceNumber || invoiceData.orderNumber}`;
      // const alreadySent = await AsyncStorage.getItem(invoiceKey);
      // if (alreadySent) {
      //   throw new Error('Invoice has already been sent via WhatsApp. Use share option to send again.');
      // }

      console.log('📱 [WhatsAppService] Opening device WhatsApp for invoice:', {
        invoiceNumber: invoiceData.invoiceNumber || invoiceData.orderNumber,
        phoneNumber: phoneNumber,
        testingPhase: true
      });

      const message = await this.createInvoiceMessage(invoiceData);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      // Try to open WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        
        // TESTING PHASE: Commented out marking as sent
        // TODO: Re-enable this after testing phase
        // await AsyncStorage.setItem(invoiceKey, 'true');
        
        return {
          success: true,
          message: 'WhatsApp opened successfully. Please send the message.',
          method: 'device'
        };
      } else {
        throw new Error('WhatsApp is not installed on this device');
      }
    } catch (error) {
      console.error('Error opening device WhatsApp:', error);
      throw error;
    }
  }

  // Main send method - uses selected method with fallback
  async sendInvoiceMessage(phoneNumber, invoiceData) {
    // Check if send invoice feature is enabled
    if (!this.sendInvoiceEnabled) {
      throw new Error('Invoice sending is disabled in settings');
    }

    try {
      if (this.whatsappMethod === 'flowpos') {
        // Try FlowPOS first
        try {
          return await this.sendViaFlowPOS(phoneNumber, invoiceData);
        } catch (error) {
          console.log('FlowPOS WhatsApp failed, falling back to device:', error.message);
          // Fallback to device WhatsApp
          return await this.sendViaDeviceWhatsApp(phoneNumber, null, invoiceData);
        }
      } else {
        // Use device WhatsApp directly
        return await this.sendViaDeviceWhatsApp(phoneNumber, null, invoiceData);
      }
    } catch (error) {
      console.error('Error sending WhatsApp invoice:', error);
      throw error;
    }
  }

  // Legacy method for backward compatibility
  async sendInvoiceImage(phoneNumber, imageUri, invoiceData) {
    return await this.sendInvoiceMessage(phoneNumber, invoiceData);
  }

  // Legacy method for backward compatibility
  async sendTextMessage(phoneNumber, message) {
    const invoiceData = {
      storeName: 'FlowPOS Store',
      orderNumber: 'N/A',
      customerName: 'Customer',
      date: new Date().toLocaleDateString(),
      items: [],
      subtotal: 0,
      grandTotal: 0,
      paymentMethod: 'Cash'
    };
    
    return await this.sendInvoiceMessage(phoneNumber, invoiceData);
  }

  // Format phone number for WhatsApp
  formatPhoneNumber(phoneNumber) {
    // Remove any non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    // Add country code if not present
    if (cleaned.length === 10) {
      cleaned = '91' + cleaned; // India country code
    }
    
    return cleaned;
  }

  // Create invoice message with store name setting check and onboarding support
  async createInvoiceMessage(invoiceData) {
    console.log('📱 [WhatsAppService] Creating invoice message with data:', {
      storeName: invoiceData.storeName,
      storeAddress: invoiceData.storeAddress,
      storePhone: invoiceData.storePhone,
      storeEmail: invoiceData.storeEmail,
      gstNumber: invoiceData.gstNumber,
      grandTotal: invoiceData.grandTotal,
      total: invoiceData.total,
      customerName: invoiceData.customerName,
      itemsCount: invoiceData.items?.length || 0
    });

    // Get settings and store info for onboarding compatibility
    const [showStoreNameSetting, receiptSettings, storeInfo] = await Promise.all([
      AsyncStorage.getItem('showStoreNameOnInvoice'),
      AsyncStorage.getItem('receiptSettings'),
      AsyncStorage.getItem('storeInfo')
    ]);
    
    const parsedReceiptSettings = receiptSettings ? JSON.parse(receiptSettings) : {};
    const parsedStoreInfo = storeInfo ? JSON.parse(storeInfo) : {};
    
    console.log('🏪 [WhatsAppService] Settings debug:', {
      showStoreNameSetting,
      receiptSettings: parsedReceiptSettings,
      storeInfo: parsedStoreInfo,
      inputStoreName: invoiceData.storeName,
      hasStoreName: !!(invoiceData.storeName && invoiceData.storeName.trim() !== '')
    });

    const {
      storeName,
      storeAddress,
      storePhone,
      storeEmail,
      gstNumber,
      orderNumber,
      customerName,
      date,
      items,
      subtotal,
      tax,
      grandTotal,
      total, // Fallback field
      paymentMethod
    } = invoiceData;

    // Check if store name should be shown in WhatsApp message
    const showStoreName = showStoreNameSetting !== null ? JSON.parse(showStoreNameSetting) : true;
    
    // Enhanced store name logic with onboarding support
    let displayStoreName = 'FlowPOS Store';
    if (showStoreName) {
      if (storeName && storeName.trim() !== '') {
        displayStoreName = storeName.trim();
      } else if (parsedStoreInfo.store_name && parsedStoreInfo.store_name.trim() !== '') {
        displayStoreName = parsedStoreInfo.store_name.trim();
      } else if (parsedStoreInfo.name && parsedStoreInfo.name.trim() !== '') {
        displayStoreName = parsedStoreInfo.name.trim();
      }
    }
    
    // Enhanced store info with onboarding support
    const finalStoreAddress = storeAddress || parsedStoreInfo.store_address || parsedStoreInfo.address || '';
    const finalStorePhone = storePhone || parsedStoreInfo.store_phone || parsedStoreInfo.phone || '';
    const finalStoreEmail = storeEmail || parsedStoreInfo.store_email || parsedStoreInfo.email || '';
    const finalGstNumber = gstNumber || parsedStoreInfo.gst_number || parsedStoreInfo.gstin || '';
    
    // Get receipt settings with defaults
    const showAddress = parsedReceiptSettings.showAddress !== undefined ? parsedReceiptSettings.showAddress : true;
    const showPhone = parsedReceiptSettings.showPhone !== undefined ? parsedReceiptSettings.showPhone : true;
    const showEmail = parsedReceiptSettings.showEmail !== undefined ? parsedReceiptSettings.showEmail : false;
    const showGST = parsedReceiptSettings.showGST !== undefined ? parsedReceiptSettings.showGST : true;
    
    console.log('🏪 [WhatsAppService] Final display decisions:', {
      showStoreName,
      displayStoreName,
      showAddress,
      showPhone,
      showEmail,
      showGST,
      willShowCustomName: displayStoreName !== 'FlowPOS Store'
    });

    let message = `🧾 *Invoice from ${displayStoreName}*\n\n`;
    
    // Add store contact information if enabled and available (using enhanced store info)
    let contactInfo = '';
    if (showAddress && finalStoreAddress && finalStoreAddress.trim() !== '') {
      contactInfo += `📍 ${finalStoreAddress.trim()}\n`;
    }
    if (showPhone && finalStorePhone && finalStorePhone.trim() !== '') {
      contactInfo += `📞 ${finalStorePhone.trim()}\n`;
    }
    if (showEmail && finalStoreEmail && finalStoreEmail.trim() !== '') {
      contactInfo += `📧 ${finalStoreEmail.trim()}\n`;
    }
    if (showGST && finalGstNumber && finalGstNumber.trim() !== '') {
      contactInfo += `📄 GST: ${finalGstNumber.trim()}\n`;
    }
    
    if (contactInfo) {
      message += contactInfo + '\n';
    }
    
    message += `📋 *Order Details:*\n`;
    message += `Order #: ${orderNumber || 'N/A'}\n`;
    message += `Date: ${date || new Date().toLocaleDateString()}\n`;
    message += `Customer: ${customerName || 'Customer'}\n\n`;

    if (items && items.length > 0) {
      message += `🛍️ *Items:*\n`;
      items.forEach(item => {
        const quantity = Number(item.quantity) || 0;
        const price = Number(item.price) || 0;
        const itemTotal = quantity * price;
        message += `• ${quantity}x ${item.name} - ₹${itemTotal.toFixed(2)}\n`;
      });
      message += `\n`;
    }

    message += `💰 *Payment Summary:*\n`;
    const subtotalNum = Number(subtotal) || 0;
    if (subtotalNum > 0) {
      message += `Subtotal: ₹${subtotalNum.toFixed(2)}\n`;
    }
    
    const taxNum = Number(tax) || 0;
    if (taxNum > 0) {
      message += `Tax: ₹${taxNum.toFixed(2)}\n`;
    }
    
    const grandTotalNum = Number(grandTotal) || Number(total) || 0;
    message += `*Total: ₹${grandTotalNum.toFixed(2)}*\n`;
    message += `Payment: ${paymentMethod || 'Cash'}\n\n`;

    message += `Thank you for your business! 🙏\n\n`;
    message += `Best regards,\n`;
    message += `${displayStoreName} Team\n`;
    message += `_Powered by FlowPOS_`;

    return message;
  }

  // Get service status
  async getStatus() {
    // Always reload settings to ensure we have the latest values
    await this.loadSettings();
    
    const isFlowPOSReady = await this.isFlowPOSReady();
    
    return {
      currentMethod: this.whatsappMethod,
      flowposReady: isFlowPOSReady,
      deviceReady: true,
      ready: await this.isReady(),
      sendInvoiceEnabled: this.sendInvoiceEnabled
    };
  }
}

export default new WhatsAppService();