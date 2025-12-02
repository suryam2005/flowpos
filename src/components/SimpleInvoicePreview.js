import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import { captureRef } from 'react-native-view-shot';
import { colors } from '../styles/colors';
import WhatsAppService from '../services/WhatsAppService';

const SimpleInvoicePreview = ({ 
  visible, 
  invoiceData, 
  onClose, 
  onSendWhatsApp 
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
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
        await Share.share({
          url: imageUri,
          message: `Invoice from ${invoiceData.storeName}\nInvoice #${invoiceData.invoiceNumber}\nTotal: ₹${invoiceData.grandTotal}`,
        });
      } catch (error) {
        console.error('Error sharing invoice:', error);
      }
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
      // Generate invoice image
      const imageUri = await generateInvoiceImage();
      if (!imageUri) {
        throw new Error('Failed to generate invoice image');
      }

      // Check if WhatsApp service is configured
      if (WhatsAppService.isReady()) {
        // Use Twilio WhatsApp API
        try {
          const result = await WhatsAppService.sendInvoiceImage(
            invoiceData.phoneNumber,
            imageUri,
            invoiceData
          );

          if (result.success) {
            Alert.alert(
              'Invoice Sent! ✅',
              `Invoice has been sent to ${invoiceData.customerName} via WhatsApp successfully.`,
              [{ text: 'Great!', style: 'default' }]
            );
          } else {
            throw new Error('Failed to send via Twilio');
          }
        } catch (twilioError) {
          console.log('Twilio failed, falling back to device WhatsApp:', twilioError);
          // Fallback to device WhatsApp
          await this.sendViaDeviceWhatsApp(imageUri);
        }
      } else {
        // Use device WhatsApp as fallback
        await this.sendViaDeviceWhatsApp(imageUri);
      }
    } catch (error) {
      console.error('Error sending WhatsApp invoice:', error);
      Alert.alert(
        'Send Failed ❌',
        'Failed to send invoice via WhatsApp. Please try sharing manually or check your WhatsApp configuration.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Share Manually', onPress: () => handleShareInvoice() }
        ]
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const sendViaDeviceWhatsApp = async (imageUri) => {
    try {
      const result = await WhatsAppService.sendViaDeviceWhatsApp(
        invoiceData.phoneNumber,
        imageUri,
        invoiceData
      );

      if (result.success) {
        Alert.alert(
          'WhatsApp Opened 📱',
          result.message,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      throw error;
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
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invoice</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View ref={invoiceRef} style={styles.invoiceCard}>
          {/* Professional Header */}
          <View style={styles.invoiceHeader}>
            <Text style={styles.storeName}>
              {invoiceData.storeName}
            </Text>
            <Text style={styles.thankYouMessage}>Thank you for your order!</Text>
          </View>

          {/* Receipt Section */}
          <View style={styles.receiptSection}>
            <Text style={styles.receiptTitle}>RECEIPT</Text>
            <View style={styles.receiptDetails}>
              <Text style={styles.receiptText}>Receipt #: {invoiceData.invoiceNumber}</Text>
              <Text style={styles.receiptText}>Date: {invoiceData.date}</Text>
            </View>
          </View>

          {/* Customer Info */}
          <View style={styles.customerSection}>
            <View style={styles.customerIcon}>
              <Text style={styles.customerIconText}>👤</Text>
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

          {/* Items List */}
          <View style={styles.itemsList}>
            {invoiceData.items && invoiceData.items.length > 0 ? (
              invoiceData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemIcon}>
                    <Text style={styles.itemIconText}>📦</Text>
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

          {/* Totals */}
          <View style={styles.totalsSection}>
            {(invoiceData.tax || invoiceData.gst) ? (
              <>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal</Text>
                  <Text style={styles.totalValue}>₹{(invoiceData.subtotal || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>GST ({invoiceData.gstPercentage || 18}%)</Text>
                  <Text style={styles.totalValue}>₹{(invoiceData.tax || invoiceData.gst || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.totalDivider} />
              </>
            ) : null}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>TOTAL PAID:</Text>
              <Text style={styles.grandTotalValue}>₹{(invoiceData.grandTotal || invoiceData.total || 0).toFixed(2)}</Text>
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.paymentSection}>
            <View style={styles.paymentIcon}>
              <Text style={styles.paymentIconText}>
                {invoiceData.paymentMethod === 'Cash' ? '💵' : 
                 invoiceData.paymentMethod === 'Card' ? '💳' : 
                 invoiceData.paymentMethod === 'QR Pay' ? '📱' : '💵'}
              </Text>
            </View>
            <Text style={styles.paymentMethod}>{invoiceData.paymentMethod || 'Cash'}</Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerMessage}>Thank you for shopping with us!</Text>
            <Text style={styles.footerBrand}>Powered by FlowPOS</Text>
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
          <Text style={styles.shareButtonText}>
            {isGenerating ? '⏳ Generating...' : '📤 Share Invoice'}
          </Text>
        </TouchableOpacity>
        
        {invoiceData.phoneNumber && (
          <TouchableOpacity
            style={styles.whatsappButton}
            onPress={handleSendWhatsApp}
            activeOpacity={0.8}
            disabled={isGenerating}
          >
            <Text style={styles.whatsappButtonText}>
              📱 Send via WhatsApp
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  backIcon: {
    fontSize: 20,
    color: colors.text.primary,
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
    borderRadius: 0,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  storeName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 8,
  },
  thankYouMessage: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  receiptSection: {
    marginBottom: 24,
  },
  receiptTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
  },
  receiptDetails: {
    marginBottom: 8,
  },
  receiptText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  customerIcon: {
    marginRight: 12,
  },
  customerIconText: {
    fontSize: 20,
  },
  customerDetails: {
    flex: 1,
    justifyContent: 'center',
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    lineHeight: 20,
  },
  customerPhone: {
    fontSize: 14,
    color: '#6b7280',
  },
  itemsList: {
    marginBottom: 24,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    minHeight: 50,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemIconText: {
    fontSize: 16,
  },
  itemInfo: {
    flex: 1,
    marginRight: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
    lineHeight: 18,
    flexWrap: 'wrap',
  },
  itemDetails: {
    fontSize: 12,
    color: '#6b7280',
  },
  itemPriceContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
  },
  noItems: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    padding: 20,
  },
  totalsSection: {
    marginBottom: 24,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  totalValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'right',
    flexShrink: 0,
  },
  totalDivider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 12,
  },
  grandTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    textAlign: 'right',
    flexShrink: 0,
  },
  paymentSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentIconText: {
    fontSize: 16,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    flexWrap: 'wrap',
  },
  footer: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerMessage: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  footerBrand: {
    fontSize: 13,
    color: '#6b7280',
    textAlign: 'center',
    fontWeight: '500',
    marginTop: 4,
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
    backgroundColor: colors.gray[100],
    paddingVertical: 16,
    borderRadius: 12,
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
    backgroundColor: colors.success.main,
    paddingVertical: 16,
    borderRadius: 12,
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