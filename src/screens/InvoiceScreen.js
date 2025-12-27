import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import InvoiceService from '../services/InvoiceService'; // CONSOLIDATED: Use unified service
import { colors } from '../styles/colors';

const InvoiceScreen = ({ route, navigation }) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { orderData, autoRedirect = false, autoRedirectToHome = false, sourceScreen } = route.params || {};

  useEffect(() => {
    console.log('📄 [InvoiceScreen] Received orderData:', orderData?.orderNumber || 'Unknown');
    if (orderData) {
      generateInvoiceData();
      
      // Remove automatic redirects - let user control navigation
      console.log('📄 [InvoiceScreen] Invoice generated, user can navigate manually');
    } else {
      console.error('❌ [InvoiceScreen] No orderData received');
    }
  }, [orderData]);

  // Allow normal back navigation - removed automatic POS redirect
  useEffect(() => {
    console.log('📄 [InvoiceScreen] Navigation setup - allowing normal back behavior');
  }, [navigation]);

  // Refresh WhatsApp status when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📄 [InvoiceScreen] Screen focused - triggering WhatsApp status refresh');
      setRefreshTrigger(prev => prev + 1);
    }, [])
  );

  const isRecentOrder = (timestamp) => {
    const orderTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now - orderTime) / (1000 * 60);
    return diffMinutes < 5; // Consider orders from last 5 minutes as "recent"
  };

  // CONSOLIDATED: Use InvoiceService for all invoice data generation
  const generateInvoiceData = async () => {
    try {
      console.log('📄 [InvoiceScreen] Generating invoice data using InvoiceService...');
      
      // CONSOLIDATED: Single method call replaces all the complex logic
      const invoice = await InvoiceService.generateInvoiceData(orderData);
      
      console.log('✅ [InvoiceScreen] Invoice data generated successfully:', {
        invoiceNumber: invoice.invoiceNumber,
        storeName: invoice.storeName,
        customerName: invoice.customerName,
        grandTotal: invoice.grandTotal
      });

      setInvoiceData(invoice);
    } catch (error) {
      console.error('❌ [InvoiceScreen] Error generating invoice data:', error);
      Alert.alert('Error', 'Failed to generate invoice data. Please try again.');
    }
  };

  const handleClose = () => {
    console.log('📄 [InvoiceScreen] handleClose called');
    console.log('📄 [InvoiceScreen] sourceScreen:', sourceScreen);
    
    // Check source screen parameter first
    if (sourceScreen === 'Orders') {
      console.log('📄 [InvoiceScreen] Navigating back to Orders tab');
      // Orders is inside Main Tab Navigator, so navigate to Main with Orders screen
      navigation.navigate('Main', { screen: 'Orders' });
      return;
    }
    
    // Try goBack first if possible
    if (navigation.canGoBack()) {
      console.log('📄 [InvoiceScreen] Using navigation.goBack()');
      navigation.goBack();
    } else {
      // Fallback to POS
      console.log('📄 [InvoiceScreen] Fallback to POS');
      navigation.navigate('Main', { screen: 'POS' });
    }
  };

  const handleSendWhatsApp = (pdfUri) => {
    // This will be implemented when WhatsApp integration is added
    Alert.alert(
      'Send Feature Coming Soon',
      'WhatsApp integration will be available in the next update. The PDF has been generated and can be shared manually.',
      [
        { text: 'OK', style: 'default' }
      ]
    );
  };

  if (!invoiceData) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Generating invoice...</Text>
        </View>
      </View>
    );
  }

  return (
    <SimpleInvoicePreview
      visible={true}
      invoiceData={invoiceData}
      onClose={handleClose}
      onSendWhatsApp={handleSendWhatsApp}
      refreshTrigger={refreshTrigger}
      showBackButton={true}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default InvoiceScreen;