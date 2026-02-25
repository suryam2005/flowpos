import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/apiConfig';
import { getStoreSettingsFromCache, getReceiptSettingsFromCache, getStoreProfileFromCache } from '../context/StoreSettingsContext';
import { getAppSettingFromCache } from '../context/AppSettingsContext';

class WhatsAppService {
  constructor() {
    this.whatsappMethod = 'flowpos'; // 'flowpos' or 'device' - FlowPOS is default
    this.sendInvoiceEnabled = false; // New setting for send invoice feature - OFF by default for new users
    this.loadSettings();
  }

  async loadSettings() {
    try {
      // Read from AppSettingsContext cache first (single source of truth)
      const cachedMethod = getAppSettingFromCache('whatsappMethod');
      const cachedSendEnabled = getAppSettingFromCache('sendInvoiceEnabled');
      
      if (cachedMethod !== undefined) {
        this.whatsappMethod = cachedMethod;
        console.log('📱 [WhatsAppService] whatsappMethod read from cache:', cachedMethod);
      } else {
        // Fallback to AsyncStorage if cache unavailable
        const method = await AsyncStorage.getItem('whatsappMethod');
        this.whatsappMethod = method || 'flowpos';
        console.log('📱 [WhatsAppService] whatsappMethod fallback to AsyncStorage:', this.whatsappMethod);
      }
      
      if (cachedSendEnabled !== undefined) {
        this.sendInvoiceEnabled = cachedSendEnabled;
        console.log('📱 [WhatsAppService] sendInvoiceEnabled read from cache:', cachedSendEnabled);
      } else {
        // Fallback to AsyncStorage if cache unavailable
        const sendEnabled = await AsyncStorage.getItem('sendInvoiceEnabled');
        this.sendInvoiceEnabled = sendEnabled !== null ? JSON.parse(sendEnabled) : false; // Default OFF for new users
        console.log('📱 [WhatsAppService] sendInvoiceEnabled fallback to AsyncStorage:', this.sendInvoiceEnabled);
      }
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  }

  async setWhatsAppMethod(method) {
    this.whatsappMethod = method;
    // Also update AsyncStorage for backward compatibility
    await AsyncStorage.setItem('whatsappMethod', method);
  }

  async setSendInvoiceEnabled(enabled) {
    this.sendInvoiceEnabled = enabled;
    // Also update AsyncStorage for backward compatibility
    await AsyncStorage.setItem('sendInvoiceEnabled', JSON.stringify(enabled));
  }

  getSendInvoiceEnabled() {
    // Always read fresh from cache
    const cached = getAppSettingFromCache('sendInvoiceEnabled');
    if (cached !== undefined) {
      this.sendInvoiceEnabled = cached;
    }
    return this.sendInvoiceEnabled;
  }

  getWhatsAppMethod() {
    // Always read fresh from cache
    const cached = getAppSettingFromCache('whatsappMethod');
    if (cached !== undefined) {
      this.whatsappMethod = cached;
    }
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

  // Send invoice via FlowPOS backend (Twilio) - WITH FALLBACK TO DEVICE
  async sendViaFlowPOS(phoneNumber, invoiceData) {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        throw new Error('User not authenticated');
      }

      // Get user settings from context caches with AsyncStorage fallback
      // This ensures settings are read correctly even if context not fully initialized
      let showStoreNameOnInvoice = getAppSettingFromCache('showStoreNameOnInvoice');
      if (showStoreNameOnInvoice === undefined) {
        const storedValue = await AsyncStorage.getItem('showStoreNameOnInvoice');
        showStoreNameOnInvoice = storedValue !== null ? JSON.parse(storedValue) : true;
      }
      
      // Get receipt settings from context cache with fallback
      let receiptSettings = getReceiptSettingsFromCache();
      const storeSettingsFromCache = getStoreSettingsFromCache();
      if (!storeSettingsFromCache) {
        const storedReceiptSettings = await AsyncStorage.getItem('receiptSettings');
        if (storedReceiptSettings) {
          const parsed = JSON.parse(storedReceiptSettings);
          receiptSettings = {
            showAddress: parsed.showAddress !== undefined ? parsed.showAddress : true,
            showPhone: parsed.showPhone !== undefined ? parsed.showPhone : true,
            showEmail: parsed.showEmail !== undefined ? parsed.showEmail : false,
            showGST: parsed.showGST !== undefined ? parsed.showGST : true
          };
        }
      }
      
      const userSettings = {
        showStoreNameOnInvoice,
        receiptSettings
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
      // Check if invoice has already been sent (spam prevention)
      const invoiceKey = `whatsapp_sent_${invoiceData.invoiceNumber || invoiceData.orderNumber}`;
      const alreadySent = await AsyncStorage.getItem(invoiceKey);
      if (alreadySent) {
        throw new Error('Invoice has already been sent via WhatsApp. Use share option to send again.');
      }

      console.log('📱 [WhatsAppService] Opening device WhatsApp for invoice:', {
        invoiceNumber: invoiceData.invoiceNumber || invoiceData.orderNumber,
        phoneNumber: phoneNumber,
        spamPrevention: 'enabled'
      });

      const message = await this.createInvoiceMessage(invoiceData);
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      
      // Create WhatsApp URL
      const whatsappUrl = `whatsapp://send?phone=${formattedPhone}&text=${encodeURIComponent(message)}`;
      
      // Try to open WhatsApp
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        
        // Mark invoice as sent to prevent duplicate sends
        await AsyncStorage.setItem(invoiceKey, 'true');
        console.log('✅ [WhatsAppService] Invoice marked as sent:', invoiceKey);
        
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
    try {
      if (this.whatsappMethod === 'flowpos') {
        // Check if send invoice feature is enabled for FlowPOS method
        if (!this.sendInvoiceEnabled) {
          throw new Error('Invoice sending is disabled in settings');
        }
        
        // Try FlowPOS first
        try {
          return await this.sendViaFlowPOS(phoneNumber, invoiceData);
        } catch (error) {
          console.log('FlowPOS WhatsApp failed - no fallback to prevent unwanted device WhatsApp opening:', error.message);
          // COMMENTED OUT: Fallback to device WhatsApp to prevent unwanted redirection
          // when user has selected FlowPOS method but credentials are not configured
          // return await this.sendViaDeviceWhatsApp(phoneNumber, null, invoiceData);
          throw error; // Re-throw the error instead of falling back
        }
      } else {
        // FIXED: Device WhatsApp doesn't need sendInvoiceEnabled check
        // It requires manual user action, so the setting doesn't apply
        console.log('📱 [WhatsAppService] Using device WhatsApp (manual send, ignoring sendInvoiceEnabled setting)');
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
  // NOTE: Reads from context caches with AsyncStorage fallback for reliability
  // This ensures settings are read correctly even if context not fully initialized
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

    // Get settings from context caches (single source of truth)
    // showStoreNameOnInvoice from AppSettingsContext
    let showStoreNameSetting = getAppSettingFromCache('showStoreNameOnInvoice');
    
    // Fallback to AsyncStorage if cache returns undefined (context not initialized yet)
    if (showStoreNameSetting === undefined) {
      try {
        const storedValue = await AsyncStorage.getItem('showStoreNameOnInvoice');
        if (storedValue !== null) {
          showStoreNameSetting = JSON.parse(storedValue);
          console.log('📱 [WhatsAppService] showStoreNameOnInvoice fallback to AsyncStorage:', showStoreNameSetting);
        }
      } catch (e) {
        console.warn('📱 [WhatsAppService] Error reading showStoreNameOnInvoice from AsyncStorage:', e.message);
      }
    }
    const showStoreName = showStoreNameSetting !== undefined ? showStoreNameSetting : true;
    
    // Receipt settings from StoreSettingsContext with proper boolean handling
    let receiptSettings = getReceiptSettingsFromCache();
    
    // Fallback to AsyncStorage if cache returns all defaults (context not initialized yet)
    // Check if we got actual data or just defaults by checking if getSettings returns null
    const storeSettingsFromCache = getStoreSettingsFromCache();
    if (!storeSettingsFromCache) {
      try {
        const storedReceiptSettings = await AsyncStorage.getItem('receiptSettings');
        if (storedReceiptSettings) {
          const parsed = JSON.parse(storedReceiptSettings);
          receiptSettings = {
            showAddress: parsed.showAddress !== undefined ? parsed.showAddress : true,
            showPhone: parsed.showPhone !== undefined ? parsed.showPhone : true,
            showEmail: parsed.showEmail !== undefined ? parsed.showEmail : false,
            showGST: parsed.showGST !== undefined ? parsed.showGST : true
          };
          console.log('📱 [WhatsAppService] receiptSettings fallback to AsyncStorage:', receiptSettings);
        }
      } catch (e) {
        console.warn('📱 [WhatsAppService] Error reading receiptSettings from AsyncStorage:', e.message);
      }
    }
    
    // Store profile from StoreSettingsContext
    let storeProfile = getStoreProfileFromCache();
    
    // Fallback to AsyncStorage if cache returns empty values (context not initialized yet)
    if (!storeProfile.store_name && !storeSettingsFromCache) {
      try {
        const storedStoreInfo = await AsyncStorage.getItem('storeInfo');
        if (storedStoreInfo) {
          const parsed = JSON.parse(storedStoreInfo);
          storeProfile = {
            store_name: parsed.store_name || parsed.storeName || '',
            store_address: parsed.store_address || parsed.storeAddress || '',
            store_website: parsed.store_website || parsed.storeWebsite || '',
            business_type: parsed.business_type || parsed.businessType || '',
            gst_number: parsed.gst_number || parsed.gstNumber || '',
            currency: parsed.currency || 'INR'
          };
          console.log('📱 [WhatsAppService] storeProfile fallback to AsyncStorage:', storeProfile);
        }
      } catch (e) {
        console.warn('📱 [WhatsAppService] Error reading storeInfo from AsyncStorage:', e.message);
      }
    }
    
    console.log('🏪 [WhatsAppService] Settings debug:', {
      showStoreNameSetting,
      receiptSettings,
      storeProfile,
      inputStoreName: invoiceData.storeName,
      hasStoreName: !!(invoiceData.storeName && invoiceData.storeName.trim() !== ''),
      cacheAvailable: !!storeSettingsFromCache
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
    
    // Enhanced store name logic with context support
    let displayStoreName = 'FlowPOS Store';
    if (showStoreName) {
      if (storeName && storeName.trim() !== '') {
        displayStoreName = storeName.trim();
      } else if (storeProfile.store_name && storeProfile.store_name.trim() !== '') {
        displayStoreName = storeProfile.store_name.trim();
      }
    }
    
    // Enhanced store info with context support
    const finalStoreAddress = storeAddress || storeProfile.store_address || '';
    const finalStorePhone = storePhone || ''; // Auth-bound, not in StoreSettingsContext
    const finalStoreEmail = storeEmail || ''; // Auth-bound, not in StoreSettingsContext
    const finalGstNumber = gstNumber || storeProfile.gst_number || '';
    
    // Get receipt settings with proper boolean handling (already applied by getReceiptSettingsFromCache)
    const showAddress = receiptSettings.showAddress;
    const showPhone = receiptSettings.showPhone;
    const showEmail = receiptSettings.showEmail;
    const showGST = receiptSettings.showGST;
    
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
    
    // Enhanced WhatsApp message formatting with standardized contact info
    const createContactInfoSection = (contactFields) => {
      const visibleFields = contactFields.filter(field => 
        field.show && field.value && field.value.trim() !== ''
      );

      if (visibleFields.length === 0) return '';

      let contactInfo = '';
      visibleFields.forEach((field, index) => {
        contactInfo += `${field.emoji} ${field.prefix || ''}${field.value.trim()}`;
        if (index < visibleFields.length - 1) {
          contactInfo += '\n';
        }
      });

      return contactInfo + '\n\n';
    };

    // Add store contact information if enabled and available (using enhanced store info)
    const contactFields = [
      {
        show: showAddress,
        value: finalStoreAddress,
        emoji: '📍',
        prefix: ''
      },
      {
        show: showPhone,
        value: finalStorePhone,
        emoji: '📞',
        prefix: ''
      },
      {
        show: showEmail,
        value: finalStoreEmail,
        emoji: '📧',
        prefix: ''
      },
      {
        show: showGST,
        value: finalGstNumber,
        emoji: '📄',
        prefix: 'GST: '
      }
    ];

    const contactInfo = createContactInfoSection(contactFields);
    if (contactInfo) {
      message += contactInfo;
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
  async getStatus(options = {}) {
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

  // Get service status with caching (Phase D optimization)
  async getStatusWithCaching(options = {}) {
    const { forceRefresh = false, screenName = 'unknown' } = options;
    
    // Import ServiceStatusCoordinator dynamically to avoid circular dependencies
    const ServiceStatusCoordinator = (await import('./ServiceStatusCoordinator')).default;
    
    try {
      // Use coordinator for caching logic
      const cachedStatus = await ServiceStatusCoordinator.fetchWhatsAppStatus({
        forceRefresh,
        screenName
      });
      
      // If we got cached status, combine it with local settings
      if (cachedStatus && !forceRefresh) {
        // Always reload settings to ensure we have the latest values
        await this.loadSettings();
        
        return {
          ...cachedStatus,
          currentMethod: this.whatsappMethod,
          deviceReady: true,
          sendInvoiceEnabled: this.sendInvoiceEnabled
        };
      }
    } catch (error) {
      console.log('🔧 [WhatsAppService] Caching failed, falling back to direct status check:', error.message);
    }
    
    // Fallback to original getStatus method
    return await this.getStatus();
  }

  // Clear WhatsApp sending history (for Settings or troubleshooting)
  async clearSendingHistory() {
    try {
      // Get all AsyncStorage keys
      const allKeys = await AsyncStorage.getAllKeys();
      
      // Filter keys that start with 'whatsapp_sent_'
      const whatsappKeys = allKeys.filter(key => key.startsWith('whatsapp_sent_'));
      
      if (whatsappKeys.length > 0) {
        // Remove all WhatsApp sending history keys
        await AsyncStorage.multiRemove(whatsappKeys);
        console.log(`✅ [WhatsAppService] Cleared ${whatsappKeys.length} invoice sending records`);
        return {
          success: true,
          clearedCount: whatsappKeys.length,
          message: `Cleared ${whatsappKeys.length} invoice sending records`
        };
      } else {
        console.log('ℹ️ [WhatsAppService] No sending history to clear');
        return {
          success: true,
          clearedCount: 0,
          message: 'No sending history found'
        };
      }
    } catch (error) {
      console.error('❌ [WhatsAppService] Error clearing sending history:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to clear sending history'
      };
    }
  }

  // Check if a specific invoice has been sent
  async hasBeenSent(invoiceNumber) {
    try {
      const invoiceKey = `whatsapp_sent_${invoiceNumber}`;
      const alreadySent = await AsyncStorage.getItem(invoiceKey);
      return alreadySent === 'true';
    } catch (error) {
      console.error('❌ [WhatsAppService] Error checking send status:', error);
      return false;
    }
  }
}

export default new WhatsAppService();