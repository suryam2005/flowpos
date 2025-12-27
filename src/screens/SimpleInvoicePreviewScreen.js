import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, BackHandler } from 'react-native';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import InvoiceService from '../services/InvoiceService';
import { colors } from '../styles/colors';

const SimpleInvoicePreviewScreen = ({ route, navigation }) => {
  const { 
    invoiceData: rawInvoiceData, 
    fromOrderCompletion = true
  } = route.params;
  const [processedInvoiceData, setProcessedInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Navigate to POS screen (used for both auto-redirect and back button)
  const navigateToPOS = () => {
    // Reset navigation stack and go to POS
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main', params: { screen: 'POS' } }],
    });
  };

  // Handle back button - always go to POS after order completion
  useEffect(() => {
    if (fromOrderCompletion) {
      const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
        navigateToPOS();
        return true; // Prevent default back behavior
      });

      // Also disable gesture navigation
      navigation.setOptions({
        gestureEnabled: false,
      });

      return () => backHandler.remove();
    }
  }, [fromOrderCompletion, navigation]);

  // Process invoice data through InvoiceService for consistency with OrdersScreen flow
  useEffect(() => {
    const processInvoiceData = async () => {
      try {
        console.log('📄 [SimpleInvoicePreviewScreen] Processing invoice data through InvoiceService...');
        
        // Use InvoiceService to generate complete invoice data (same as InvoiceScreen)
        const processedData = await InvoiceService.generateInvoiceData(rawInvoiceData);
        
        console.log('✅ [SimpleInvoicePreviewScreen] Invoice data processed:', {
          invoiceNumber: processedData.invoiceNumber,
          date: processedData.date,
          time: processedData.time,
          storeName: processedData.storeName,
          customerName: processedData.customerName
        });
        
        setProcessedInvoiceData(processedData);
      } catch (error) {
        console.error('❌ [SimpleInvoicePreviewScreen] Error processing invoice data:', error);
        // Fallback to raw data if processing fails
        setProcessedInvoiceData(rawInvoiceData);
      } finally {
        setIsLoading(false);
      }
    };

    if (rawInvoiceData) {
      processInvoiceData();
    } else {
      setIsLoading(false);
    }
  }, [rawInvoiceData]);

  const handleClose = () => {
    // Always navigate to POS after order completion
    if (fromOrderCompletion) {
      navigateToPOS();
    } else if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.navigate('Main', { screen: 'POS' });
    }
  };

  // Show loading state while processing
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Generating invoice...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SimpleInvoicePreview
        visible={true}
        invoiceData={processedInvoiceData}
        onClose={handleClose}
        showSkipOption={fromOrderCompletion}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
  },
});

export default SimpleInvoicePreviewScreen;