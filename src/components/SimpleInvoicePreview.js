import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Ionicons } from '@expo/vector-icons';
import Icon from './SVGIcons';
import { captureRef } from 'react-native-view-shot';
import { colors } from '../styles/colors';
import LoadingOverlay from './LoadingOverlay';
import WhatsAppService from '../services/WhatsAppService';

const SimpleInvoicePreview = ({ 
  visible, 
  invoiceData, 
  onClose,
  refreshTrigger // Add prop to trigger refresh from parent
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [showSendButton, setShowSendButton] = useState(true);
  const [receiptSettings, setReceiptSettings] = useState({
    showAddress: true,
    showPhone: true,
    showEmail: false,
    showGST: true
  });
  const invoiceRef = useRef();

  const generateInvoiceImage = async () => {
    try {
      setIsGenerating(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Capture the invoice as an image
      const uri = await captureRef(invoiceRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });
      
      return uri;
    } catch (error) {
      console.error('Error generating invoice image:', error);
      Alert.alert('Error', 'Failed to generate invoice image');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareInvoice = async () => {
    const imageUri = await generateInvoiceImage();
    if (imageUri) {
      try {
        const totalAmount = Number(invoiceData.grandTotal) || Number(invoiceData.total) || 0;
        await Share.share({
          url: imageUri,
          message: `Invoice from ${invoiceData.storeName}\nInvoice #${invoiceData.invoiceNumber}\nTotal: ₹${totalAmount.toFixed(2)}`,
        });
      } catch (error) {
        console.error('Error sharing invoice:', error);
      }
    }
  };

  // Load receipt settings
  const loadReceiptSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('receiptSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings);
        setReceiptSettings({
          showAddress: parsedSettings.showAddress !== undefined ? parsedSettings.showAddress : true,
          showPhone: parsedSettings.showPhone !== undefined ? parsedSettings.showPhone : true,
          showEmail: parsedSettings.showEmail !== undefined ? parsedSettings.showEmail : false,
          showGST: parsedSettings.showGST !== undefined ? parsedSettings.showGST : true
        });
        console.log('🧾 [SimpleInvoicePreview] Receipt settings loaded:', parsedSettings);
      }
    } catch (error) {
      console.error('Error loading receipt settings:', error);
    }
  };

  // Check WhatsApp status on component mount and when visibility changes
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      try {
        const status = await WhatsAppService.getStatus();
        setWhatsappStatus(status);
        
        console.log('📱 [SimpleInvoicePreview] WhatsApp status check:', {
          sendInvoiceEnabled: status.sendInvoiceEnabled,
          currentMethod: status.currentMethod,
          flowposReady: status.flowposReady,
          hasPhoneNumber: !!invoiceData?.phoneNumber
        });
        
        // Check if send invoice feature is enabled
        if (!status.sendInvoiceEnabled) {
          console.log('📱 [SimpleInvoicePreview] Send invoice disabled - hiding send button');
          setShowSendButton(false);
          return;
        }
        
        // FIXED: Only auto-send if FlowPOS is ready AND selected as the current method
        if (status.currentMethod === 'flowpos' && status.flowposReady) {
          console.log('📱 [SimpleInvoicePreview] FlowPOS selected and ready - hiding send button and auto-sending');
          setShowSendButton(false);
          // Auto-send if phone number is available
          if (invoiceData?.phoneNumber) {
            handleAutoSendWhatsApp();
          }
        } else if (status.currentMethod === 'device') {
          // Show send button only for device WhatsApp when send invoice is enabled
          console.log('📱 [SimpleInvoicePreview] Device WhatsApp selected - showing send button');
          setShowSendButton(true);
        } else {
          console.log('📱 [SimpleInvoicePreview] No valid method or FlowPOS not ready - hiding send button');
          setShowSendButton(false);
        }
      } catch (error) {
        console.error('Error checking WhatsApp status:', error);
        setShowSendButton(false);
      }
    };

    if (visible && invoiceData) {
      loadReceiptSettings();
      checkWhatsAppStatus();
    }
  }, [visible, invoiceData, refreshTrigger]);

  const handleAutoSendWhatsApp = async () => {
    try {
      console.log('📱 Auto-sending via FlowPOS WhatsApp...');
      
      const result = await WhatsAppService.sendInvoiceMessage(
        invoiceData.phoneNumber,
        {
          ...invoiceData,
          orderNumber: invoiceData.invoiceNumber,
          items: invoiceData.items || []
        }
      );

      if (result.success) {
        Alert.alert(
          'Invoice Sent Automatically! ✅',
          `Invoice has been sent to ${invoiceData.customerName} via FlowPOS WhatsApp successfully.`,
          [{ text: 'Great!', style: 'default' }]
        );
      }
    } catch (error) {
      console.error('❌ Error auto-sending WhatsApp invoice:', error);
      // If auto-send fails, show the send button
      setShowSendButton(true);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!invoiceData.phoneNumber || !invoiceData.phoneNumber.trim()) {
      Alert.alert(
        'No Phone Number',
        'Customer phone number is required to send invoice via WhatsApp.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setIsGenerating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log('📱 Starting WhatsApp send process...');
      
      // Try to send via selected method
      const result = await WhatsAppService.sendInvoiceMessage(
        invoiceData.phoneNumber,
        {
          ...invoiceData,
          orderNumber: invoiceData.invoiceNumber,
          items: invoiceData.items || []
        }
      );

      if (result.success) {
        const methodText = result.method === 'flowpos' ? 'FlowPOS WhatsApp' : 'Device WhatsApp';
        Alert.alert(
          'Invoice Sent! ✅',
          `Invoice has been sent to ${invoiceData.customerName} via ${methodText} successfully.`,
          [{ text: 'Great!', style: 'default' }]
        );
        
        // Hide send button after successful send for device WhatsApp
        if (result.method === 'device') {
          setShowSendButton(false);
        }
      } else {
        throw new Error('Failed to send WhatsApp message');
      }
    } catch (error) {
      console.error('❌ Error sending WhatsApp invoice:', error);
      
      // Show detailed error message
      let errorMessage = 'Failed to send invoice via WhatsApp.';
      if (error.message.includes('WhatsApp is not installed')) {
        errorMessage = 'WhatsApp is not installed on this device.';
      } else if (error.message.includes('not configured')) {
        errorMessage = 'WhatsApp service is not configured properly.';
      }
      
      Alert.alert(
        'Send Failed ❌',
        errorMessage + ' Would you like to share manually instead?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Manually', onPress: () => handleShareInvoice() }
        ]
      );
    } finally {
      setIsGenerating(false);
    }
  };



  if (!visible || !invoiceData) return null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>E-Bill</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View ref={invoiceRef} style={styles.invoiceCard}>
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIcon}>
              <Icon name="checkmark" size={48} color="#ffffff" />
            </View>
          </View>

          {/* Thank You Message */}
          <View style={styles.thankYouSection}>
            <Text style={styles.thankYouTitle}>Thank you for your order!</Text>
          </View>

          {/* Store Name */}
          {invoiceData.storeName && (
            <View style={styles.storeNameSection}>
              <Text style={styles.storeName}>
                {invoiceData.storeName}
              </Text>
            </View>
          )}

          {/* Store Contact Information */}
          {(receiptSettings.showAddress && invoiceData.storeAddress) ||
           (receiptSettings.showPhone && invoiceData.storePhone) ||
           (receiptSettings.showEmail && invoiceData.storeEmail) ||
           (receiptSettings.showGST && invoiceData.gstNumber) ? (
            <View style={styles.storeContactSection}>
              {receiptSettings.showAddress && invoiceData.storeAddress && (
                <View style={styles.contactRow}>
                  <Icon name="location-outline" size={20} color="#6b7280" />
                  <Text style={styles.contactText}>{invoiceData.storeAddress}</Text>
                </View>
              )}
              {receiptSettings.showPhone && invoiceData.storePhone && (
                <View style={styles.contactRow}>
                  <Icon name="call-outline" size={20} color="#6b7280" />
                  <Text style={styles.contactText}>{invoiceData.storePhone}</Text>
                </View>
              )}
              {receiptSettings.showEmail && invoiceData.storeEmail && (
                <View style={styles.contactRow}>
                  <Icon name="mail-outline" size={20} color="#6b7280" />
                  <Text style={styles.contactText}>{invoiceData.storeEmail}</Text>
                </View>
              )}
              {receiptSettings.showGST && invoiceData.gstNumber && (
                <View style={styles.contactRow}>
                  <Icon name="document-text-outline" size={20} color="#6b7280" />
                  <Text style={styles.contactText}>GST: {invoiceData.gstNumber}</Text>
                </View>
              )}
            </View>
          ) : null}

          {/* Customer Info Section */}
          <View style={styles.billedToSection}>
            <Text style={styles.billedToLabel}>Billed to</Text>
            <View style={styles.customerInfo}>
              <View style={styles.customerIcon}>
                <Icon name="person-outline" size={24} color="#6b7280" />
              </View>
              <View style={styles.customerDetails}>
                <Text style={styles.customerName}>
                  {invoiceData.customerName}
                </Text>
                {invoiceData.phoneNumber && (
                  <Text style={styles.customerPhone}>+91 {invoiceData.phoneNumber}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Order Summary Section */}
          <View style={styles.orderSummarySection}>
            <Text style={styles.orderSummaryTitle}>Order Summary</Text>

            {/* Items List */}
            {invoiceData.items && invoiceData.items.length > 0 ? (
              invoiceData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Icon name="cube-outline" size={20} color="#6b7280" />
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>
                      {item.name}
                    </Text>
                    <Text style={styles.itemDetails}>Qty: {item.quantity}</Text>
                  </View>
                  <View style={styles.itemPriceContainer}>
                    <Text style={styles.itemPrice}>₹{(item.quantity * item.price).toFixed(2)}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noItems}>No items found</Text>
            )}
          </View>

          {/* Total Paid Section */}
          <View style={styles.totalPaidSection}>
            <Text style={styles.totalPaidLabel}>TOTAL PAID:</Text>
            <Text style={styles.totalPaidAmount}>₹{(invoiceData.grandTotal || invoiceData.total || 0).toFixed(2)}</Text>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentMethodSection}>
            <View style={styles.paymentIcon}>
              <Icon 
                name={
                  invoiceData.paymentMethod === 'Cash' ? 'cash-outline' : 
                  invoiceData.paymentMethod === 'Card' ? 'card-outline' : 
                  invoiceData.paymentMethod === 'QR Pay' ? 'qr-code-outline' : 'cash-outline'
                } 
                size={20} 
                color="#6b7280" 
              />
            </View>
            <Text style={styles.paymentMethodText}>Paid with {invoiceData.paymentMethod || 'Cash'}</Text>
          </View>

          {/* Receipt Details */}
          <View style={styles.receiptDetailsSection}>
            <Text style={styles.receiptId}>Receipt #: {invoiceData.invoiceNumber}</Text>
            <Text style={styles.receiptDate}>Date: {invoiceData.date}</Text>
          </View>

          {/* Footer Message */}
          <View style={styles.footerSection}>
            <Text style={styles.footerMessage}>Thank you for shopping with us!</Text>
          </View>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShareInvoice}
          activeOpacity={0.8}
          disabled={isGenerating}
        >
          <Ionicons name="share-outline" size={18} color={colors.text.primary} style={{ marginRight: 8 }} />
          <Text style={styles.shareButtonText}>
            Share Invoice
          </Text>
        </TouchableOpacity>
        
        {invoiceData.phoneNumber && showSendButton && (
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleSendWhatsApp}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <Ionicons name="logo-whatsapp" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.whatsappButtonText}>
              Send via App
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading Overlay */}
      <LoadingOverlay 
        visible={isGenerating} 
        message="Generating invoice..." 
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  headerRight: {
    width: 36,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  invoiceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    margin: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  successIconContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thankYouSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeNameSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  storeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    lineHeight: 22,
  },
  storeContactSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    justifyContent: 'center',
  },
  contactText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
    textAlign: 'center',
    lineHeight: 18,
  },
  thankYouTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'center',
    lineHeight: 28,
  },
  billedToSection: {
    marginBottom: 20,
  },
  billedToLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 10,
    fontWeight: '500',
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderSummarySection: {
    marginBottom: 20,
  },
  orderSummaryTitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
    fontWeight: '500',
  },
  customerIcon: {
    marginRight: 12,
  },
  customerDetails: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    minHeight: 48,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  itemPrice: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  noItems: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  totalPaidSection: {
    marginTop: 20,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalPaidLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  totalPaidAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  paymentMethodSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#6b7280',
  },
  receiptDetailsSection: {
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  receiptId: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 13,
    color: '#9ca3af',
  },
  footerSection: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerMessage: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    gap: 12,
  },
  shareButton: {
    flex: 1,
    backgroundColor: colors.background.surface,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 52,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 20,
  },
  whatsappButton: {
    flex: 1,
    backgroundColor: '#25d366',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SimpleInvoicePreview;