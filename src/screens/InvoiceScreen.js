import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import { generateInvoiceNumber } from '../utils/invoiceGenerator';
import { colors } from '../styles/colors';

const InvoiceScreen = ({ route, navigation }) => {
  const [invoiceData, setInvoiceData] = useState(null);
  const { orderData, autoRedirect = false, autoRedirectToHome = false } = route.params || {};

  useEffect(() => {
    console.log('InvoiceScreen received orderData:', orderData);
    if (orderData) {
      generateInvoiceData();
      
      // Auto-redirect after 5 seconds only if explicitly requested (new orders)
      if (autoRedirect) {
        const timer = setTimeout(() => {
          navigation.navigate('Main', { screen: 'POS' });
        }, 5000);
        
        return () => clearTimeout(timer);
      } else if (autoRedirectToHome) {
        const timer = setTimeout(() => {
          navigation.navigate('TabletHome');
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    } else {
      console.error('No orderData received in InvoiceScreen');
    }
  }, [orderData]);

  // Prevent back navigation to customer details screen
  useEffect(() => {
    if (autoRedirect || autoRedirectToHome) {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        // Prevent default back behavior
        e.preventDefault();
        // Navigate to POS instead
        navigation.navigate('Main', { screen: 'POS' });
      });
      
      return unsubscribe;
    }
  }, [navigation, autoRedirect, autoRedirectToHome]);

  const isRecentOrder = (timestamp) => {
    const orderTime = new Date(timestamp);
    const now = new Date();
    const diffMinutes = (now - orderTime) / (1000 * 60);
    return diffMinutes < 5; // Consider orders from last 5 minutes as "recent"
  };

  const generateInvoiceData = async () => {
    try {
      console.log('Generating invoice data for order:', orderData);
      
      // Load store information
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      const parsedStoreInfo = storeInfo ? JSON.parse(storeInfo) : {};
      console.log('Store info loaded:', parsedStoreInfo);

      // Ensure orderData and items exist
      if (!orderData || !orderData.items || !Array.isArray(orderData.items)) {
        console.error('Invalid order data structure:', orderData);
        throw new Error('Invalid order data');
      }

      // Load GST settings to determine if tax should be applied
      const storeSetupData = await AsyncStorage.getItem('storeInfo');
      const storeSetup = storeSetupData ? JSON.parse(storeSetupData) : {};
      const hasGSTNumber = storeSetup.gstNumber && storeSetup.gstNumber.trim() !== '';
      
      // Use existing totals from order or calculate if not available
      const subtotal = orderData.subtotal || orderData.items.reduce((sum, item) => {
        const price = parseFloat(item.price) || 0;
        const quantity = parseInt(item.quantity) || 0;
        return sum + (price * quantity);
      }, 0);
      
      // Only include tax if GST is enabled and order has tax
      const tax = hasGSTNumber ? (orderData.gst || orderData.tax || 0) : 0;
      const gstPercentage = storeSetup.gstPercentage || 18;
      const grandTotal = orderData.total || orderData.grandTotal || (subtotal + tax);

      console.log('Tax calculation debug:', {
        hasGSTNumber,
        orderDataGst: orderData.gst,
        orderDataTax: orderData.tax,
        calculatedTax: tax,
        subtotal,
        grandTotal
      });

      const invoice = {
        // Store details with fallbacks
        storeName: parsedStoreInfo.name || 'FlowPOS Store',
        storeAddress: parsedStoreInfo.address || 'Store Address Not Set',
        storeContact: parsedStoreInfo.phone || '+91 XXXXXXXXXX',
        storeGSTIN: parsedStoreInfo.gstin || '',
        
        // Invoice details
        invoiceNumber: orderData.orderNumber || generateInvoiceNumber(),
        date: new Date().toLocaleDateString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        time: new Date().toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        }),
        customerName: orderData.customerName || 'Walk-in Customer',
        phoneNumber: orderData.phoneNumber || '',
        
        // Items and totals
        items: orderData.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          total: item.price * item.quantity
        })),
        subtotal,
        ...(tax > 0 && { tax, gst: tax, gstPercentage }), // Only include tax fields if tax > 0
        grandTotal,
      };

      setInvoiceData(invoice);
    } catch (error) {
      console.error('Error generating invoice data:', error);
      Alert.alert('Error', 'Failed to generate invoice data');
    }
  };

  const handleClose = () => {
    // Navigate back to POS screen after invoice is closed
    navigation.navigate('Main', { screen: 'POS' });
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