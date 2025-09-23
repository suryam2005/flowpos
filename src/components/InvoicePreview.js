import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
// import { WebView } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { 
  generateInvoiceHTML, 
  generateInvoicePDF, 
  shareInvoicePDF,
  saveInvoicePDF 
} from '../utils/invoiceGenerator';

// const { width: screenWidth } = Dimensions.get('window');

const InvoicePreview = ({ 
  visible, 
  invoiceData, 
  onClose, 
  onSendWhatsApp 
}) => {
  // const [htmlContent, setHtmlContent] = useState('');
  const [pdfUri, setPdfUri] = useState(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible && invoiceData) {
      generatePreview();
    }
  }, [visible, invoiceData]);

  const generatePreview = async () => {
    try {
      setIsLoading(true);
      
      if (!invoiceData) {
        throw new Error('No invoice data provided');
      }
      
      // const html = generateInvoiceHTML(invoiceData);
      // setHtmlContent(html);
      
      // Generate PDF in background
      setIsGeneratingPDF(true);
      const uri = await generateInvoicePDF(invoiceData);
      setPdfUri(uri);
      setIsGeneratingPDF(false);
    } catch (error) {
      console.error('Error generating preview:', error);
      Alert.alert('Error', 'Failed to generate invoice preview: ' + error.message);
      setIsGeneratingPDF(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (onSendWhatsApp) {
      onSendWhatsApp(pdfUri);
    } else {
      Alert.alert(
        'Coming Soon!', 
        'WhatsApp integration will be available in the next update. For now, you can download and share the invoice manually.',
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  const handleDownload = async () => {
    if (!pdfUri) {
      Alert.alert('Error', 'PDF is still being generated. Please wait.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await shareInvoicePDF(pdfUri, invoiceData.invoiceNumber);
    } catch (error) {
      console.error('Error sharing PDF:', error);
      Alert.alert('Error', 'Failed to share invoice');
    }
  };

  const handleSave = async () => {
    if (!pdfUri) {
      Alert.alert('Error', 'PDF is still being generated. Please wait.');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const savedPath = await saveInvoicePDF(pdfUri, invoiceData.invoiceNumber);
      Alert.alert(
        'Success', 
        `Invoice saved successfully!\nLocation: ${savedPath}`,
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error saving PDF:', error);
      Alert.alert('Error', 'Failed to save invoice');
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Invoice Preview</Text>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.previewContainer}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Generating invoice...</Text>
          </View>
        ) : (
          <ScrollView style={styles.previewScroll} contentContainerStyle={styles.previewContent}>
            <View style={styles.invoicePreview}>
              <Text style={styles.previewTitle}>📄 Invoice Preview</Text>
              
              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Store Information</Text>
                <Text style={styles.previewText}>🏪 {invoiceData?.storeName || 'FlowPOS Store'}</Text>
                <Text style={styles.previewText}>📍 {invoiceData?.storeAddress || 'Store Address'}</Text>
                <Text style={styles.previewText}>📞 {invoiceData?.storeContact || '+91 XXXXXXXXXX'}</Text>
                {invoiceData?.storeGSTIN && (
                  <Text style={styles.previewText}>🏛️ GSTIN: {invoiceData.storeGSTIN}</Text>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Invoice Details</Text>
                <Text style={styles.previewText}>📋 Invoice: {invoiceData?.invoiceNumber || 'INV-001'}</Text>
                <Text style={styles.previewText}>📅 Date: {invoiceData?.date || new Date().toLocaleDateString()}</Text>
                <Text style={styles.previewText}>⏰ Time: {invoiceData?.time || new Date().toLocaleTimeString()}</Text>
                <Text style={styles.previewText}>👤 Customer: {invoiceData?.customerName || 'Walk-in Customer'}</Text>
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Items Purchased</Text>
                {invoiceData?.items?.length > 0 ? (
                  invoiceData.items.map((item, index) => (
                    <View key={index} style={styles.itemRow}>
                      <Text style={styles.itemName}>{item.name || 'Unknown Item'}</Text>
                      <Text style={styles.itemDetails}>
                        {item.quantity || 0} × ₹{item.price || 0} = ₹{((item.quantity || 0) * (item.price || 0)).toFixed(2)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.previewText}>No items found</Text>
                )}
              </View>

              <View style={styles.previewSection}>
                <Text style={styles.sectionTitle}>Payment Summary</Text>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalValue}>₹{invoiceData?.subtotal?.toFixed(2) || '0.00'}</Text>
                </View>
                {invoiceData?.tax > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Tax (GST):</Text>
                    <Text style={styles.totalValue}>₹{invoiceData?.tax?.toFixed(2) || '0.00'}</Text>
                  </View>
                )}
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                  <Text style={styles.grandTotalValue}>₹{invoiceData?.grandTotal?.toFixed(2) || '0.00'}</Text>
                </View>
              </View>

              <View style={styles.thankYouSection}>
                <Text style={styles.thankYouText}>🙏 Thank you for your business!</Text>
                <Text style={styles.footerText}>Generated by FlowPOS</Text>
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      <View style={styles.actionsContainer}>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, styles.downloadButton]}
            onPress={handleDownload}
            activeOpacity={0.8}
            disabled={!pdfUri}
          >
            <Text style={styles.actionButtonText}>
              📄 {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.saveButton]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!pdfUri}
          >
            <Text style={styles.actionButtonText}>
              💾 Save
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.whatsappButton, !pdfUri && styles.whatsappButtonDisabled]}
          onPress={handleSendWhatsApp}
          activeOpacity={0.8}
          disabled={!pdfUri}
        >
          <Text style={styles.whatsappButtonText}>
            📱 Send Invoice via WhatsApp
          </Text>
          {isGeneratingPDF && (
            <ActivityIndicator 
              size="small" 
              color="#ffffff" 
              style={styles.buttonLoader} 
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  previewContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  previewScroll: {
    flex: 1,
  },
  previewContent: {
    padding: 20,
  },
  invoicePreview: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563eb',
    textAlign: 'center',
    marginBottom: 24,
  },
  previewSection: {
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  previewText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f9fafb',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    flex: 1,
  },
  itemDetails: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#374151',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  grandTotalRow: {
    borderTopWidth: 2,
    borderTopColor: '#2563eb',
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2563eb',
  },
  grandTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  thankYouSection: {
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  thankYouText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
    marginBottom: 8,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },

  actionsContainer: {
    padding: 20,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  downloadButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  saveButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  whatsappButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  whatsappButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowOpacity: 0,
    elevation: 0,
  },
  whatsappButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  buttonLoader: {
    marginLeft: 8,
  },
});

export default InvoicePreview;