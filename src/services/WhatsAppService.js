// WhatsApp Service for sending invoices via Twilio
import * as FileSystem from 'expo-file-system';
import { Alert } from 'react-native';

class WhatsAppService {
  constructor() {
    // These should be stored securely in environment variables or secure storage
    this.twilioAccountSid = null;
    this.twilioAuthToken = null;
    this.twilioWhatsAppNumber = null; // Format: whatsapp:+14155238886
    this.isConfigured = false;
  }

  // Initialize Twilio credentials
  async initialize(accountSid, authToken, whatsAppNumber) {
    this.twilioAccountSid = accountSid;
    this.twilioAuthToken = authToken;
    this.twilioWhatsAppNumber = whatsAppNumber;
    this.isConfigured = true;
  }

  // Check if WhatsApp service is properly configured
  isReady() {
    return this.isConfigured && 
           this.twilioAccountSid && 
           this.twilioAuthToken && 
           this.twilioWhatsAppNumber;
  }

  // Send invoice image via WhatsApp
  async sendInvoiceImage(customerPhone, invoiceImageUri, invoiceData) {
    if (!this.isReady()) {
      throw new Error('WhatsApp service not configured. Please set up Twilio credentials.');
    }

    try {
      // Format phone number for WhatsApp (must include country code)
      const formattedPhone = this.formatPhoneNumber(customerPhone);
      
      // Upload image to a temporary hosting service or convert to base64
      const imageData = await this.prepareImageForSending(invoiceImageUri);
      
      // Create message content
      const messageBody = this.createInvoiceMessage(invoiceData);
      
      // Send WhatsApp message with image via Twilio
      const response = await this.sendTwilioWhatsAppMessage(
        formattedPhone,
        messageBody,
        imageData
      );
      
      return {
        success: true,
        messageId: response.sid,
        status: response.status
      };
    } catch (error) {
      console.error('Error sending WhatsApp invoice:', error);
      throw error;
    }
  }

  // Format phone number for WhatsApp (must include country code)
  formatPhoneNumber(phone) {
    // Remove any non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Add India country code if not present
    if (cleanPhone.length === 10) {
      return `whatsapp:+91${cleanPhone}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      return `whatsapp:+${cleanPhone}`;
    } else if (cleanPhone.length === 13 && cleanPhone.startsWith('91')) {
      return `whatsapp:+${cleanPhone}`;
    }
    
    // If already formatted or different country code, use as is
    return `whatsapp:+${cleanPhone}`;
  }

  // Prepare image for sending (convert to base64 or upload to temporary storage)
  async prepareImageForSending(imageUri) {
    try {
      // Read the image file as base64
      const base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // For Twilio, we need to upload the image to a publicly accessible URL
      // This is a simplified version - in production, you'd upload to AWS S3, Cloudinary, etc.
      return {
        type: 'base64',
        data: base64Image,
        mimeType: 'image/png'
      };
    } catch (error) {
      console.error('Error preparing image:', error);
      throw new Error('Failed to prepare invoice image for sending');
    }
  }

  // Create personalized invoice message
  createInvoiceMessage(invoiceData) {
    const customerName = invoiceData.customerName || 'Customer';
    const storeName = invoiceData.storeName || 'FlowPOS Store';
    const invoiceNumber = invoiceData.invoiceNumber || 'INV-001';
    const total = invoiceData.grandTotal || invoiceData.total || 0;
    
    return `Hi ${customerName}! 👋

Thank you for shopping with ${storeName}! 🛍️

📄 Invoice: ${invoiceNumber}
💰 Total: ₹${total.toFixed(2)}
📅 Date: ${invoiceData.date}

Your invoice is attached as an image. Please save it for your records.

We appreciate your business! 🙏

Best regards,
${storeName} Team
Powered by FlowPOS`;
  }

  // Send WhatsApp message via Twilio API
  async sendTwilioWhatsAppMessage(toPhone, messageBody, imageData) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
    
    // Create form data for the request
    const formData = new FormData();
    formData.append('From', this.twilioWhatsAppNumber);
    formData.append('To', toPhone);
    formData.append('Body', messageBody);
    
    // If we have image data, we need to upload it first
    // This is a simplified version - in production, upload to cloud storage first
    if (imageData) {
      // For now, we'll send the message without the image and show instructions
      // In production, you'd upload the image to a public URL first
      formData.append('Body', messageBody + '\n\n📎 Invoice image will be sent separately.');
    }
    
    // Create authorization header
    const credentials = btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: this.formDataToUrlEncoded(formData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API Error: ${errorData.message || 'Unknown error'}`);
    }
    
    return await response.json();
  }

  // Convert FormData to URL encoded string (for React Native compatibility)
  formDataToUrlEncoded(formData) {
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      params.append(key, value);
    }
    return params.toString();
  }

  // Send invoice via alternative method (using device's WhatsApp app)
  async sendViaDeviceWhatsApp(customerPhone, invoiceImageUri, invoiceData) {
    try {
      const { Linking, Share } = require('react-native');
      
      // First, share the image to save it to device
      await Share.share({
        url: invoiceImageUri,
        message: this.createInvoiceMessage(invoiceData),
      });
      
      // Then open WhatsApp with the customer's number
      const message = this.createInvoiceMessage(invoiceData);
      const whatsappUrl = `whatsapp://send?phone=91${customerPhone}&text=${encodeURIComponent(message)}`;
      
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
        return {
          success: true,
          method: 'device_whatsapp',
          message: 'WhatsApp opened. Please send the message and attach the invoice image from your gallery.'
        };
      } else {
        throw new Error('WhatsApp not installed on device');
      }
    } catch (error) {
      console.error('Error sending via device WhatsApp:', error);
      throw error;
    }
  }

  // Test WhatsApp configuration
  async testConfiguration() {
    if (!this.isReady()) {
      return {
        success: false,
        error: 'WhatsApp service not configured'
      };
    }

    try {
      // Send a test message to verify configuration
      const testMessage = 'Test message from FlowPOS - WhatsApp integration is working! 🎉';
      
      // You would send this to your own number for testing
      const response = await this.sendTwilioWhatsAppMessage(
        this.twilioWhatsAppNumber, // Send to self for testing
        testMessage,
        null
      );
      
      return {
        success: true,
        messageId: response.sid,
        status: response.status
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send text message via WhatsApp (for auto-invoice sending)
  async sendTextMessage(customerPhone, messageText) {
    if (!this.isReady()) {
      throw new Error('WhatsApp service not configured. Please set up Twilio credentials.');
    }

    try {
      // Format phone number for WhatsApp
      const formattedPhone = this.formatPhoneNumber(customerPhone);
      
      // Send WhatsApp message via Twilio
      const response = await this.sendTwilioTextMessage(formattedPhone, messageText);
      
      return {
        success: true,
        messageId: response.sid,
        message: 'WhatsApp message sent successfully'
      };
    } catch (error) {
      console.error('Error sending WhatsApp text message:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Send text-only WhatsApp message via Twilio API
  async sendTwilioTextMessage(toPhone, messageBody) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.twilioAccountSid}/Messages.json`;
    
    // Create form data for the request
    const formData = new FormData();
    formData.append('From', this.twilioWhatsAppNumber);
    formData.append('To', toPhone);
    formData.append('Body', messageBody);
    
    // Create authorization header
    const credentials = btoa(`${this.twilioAccountSid}:${this.twilioAuthToken}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Twilio API Error: ${errorData.message || 'Unknown error'}`);
    }

    return await response.json();
  }
}

// Export singleton instance
export default new WhatsAppService();