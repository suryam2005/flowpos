import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, Text, BackHandler } from 'react-native';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import InvoiceService from '../services/InvoiceService';
import { colors } from '../styles/colors';

const SimpleInvoicePreviewScreen = ({ route, navigation }) => {
  const { invoiceData: rawInvoiceData, fromOrderCompletion = true } = route.params;
  const [processedInvoiceData, setProcessedInvoiceData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Navigate to POS screen (used for both auto-redirect and back button)
  const navigateToPOS = () => {
    // Clear timers
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    
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

  // Auto-redirect to POS after 10 seconds (only for order completion flow)
  useEffect(() => {
    if (fromOrderCompletion && !isLoading) {
      // Start countdown
      countdownRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Auto-redirect after 10 seconds
      timerRef.current = setTimeout(() => {
        console.log('⏱️ [SimpleInvoicePreviewScreen] Auto-redirecting to POS after 10 seconds');
        navigateToPOS();
      }, 10000);

      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (countdownRef.current) clearInterval(countdownRef.current);
      };
    }
  }, [fromOrderCompletion, isLoading]);

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
      />
      
      {/* Auto-redirect countdown indicator */}
      {fromOrderCompletion && countdown > 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>
            Returning to POS in {countdown}s
          </Text>
        </View>
      )}
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
  countdownContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
  },
  countdownText: {
    backgroundColor: colors.primary.main,
    color: colors.background.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  ordersButton: {
    backgroundColor: colors.primary.main,
  },
  posButton: {
    backgroundColor: colors.success.main,
  },
  navButtonText: {
    color: colors.background.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SimpleInvoicePreviewScreen;