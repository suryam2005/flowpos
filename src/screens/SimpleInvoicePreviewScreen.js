import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import SimpleInvoicePreview from '../components/SimpleInvoicePreview';
import { colors } from '../styles/colors';

const SimpleInvoicePreviewScreen = ({ route, navigation }) => {
  const { invoiceData } = route.params;
  const [countdown, setCountdown] = useState(5);
  const [autoRedirectEnabled, setAutoRedirectEnabled] = useState(true);

  const handleClose = () => {
    // Navigate back to POS screen
    navigation.navigate('Main', { screen: 'POS' });
  };

  // Auto-redirect countdown
  useEffect(() => {
    console.log('🎯 [SimpleInvoicePreview] Component mounted, starting countdown...');
    
    if (!autoRedirectEnabled) {
      console.log('⏸️ [SimpleInvoicePreview] Auto-redirect disabled');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        console.log(`⏰ [SimpleInvoicePreview] Countdown: ${prev} seconds`);
        if (prev <= 1) {
          // Redirect to POS screen
          console.log('🏠 [SimpleInvoicePreview] Redirecting to POS screen...');
          navigation.navigate('Main', { screen: 'POS' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup timer if component unmounts
    return () => {
      console.log('🧹 [SimpleInvoicePreview] Cleaning up timer...');
      clearInterval(timer);
    };
  }, [navigation, autoRedirectEnabled]);

  const cancelAutoRedirect = () => {
    setAutoRedirectEnabled(false);
    setCountdown(0);
  };

  return (
    <View style={styles.container}>
      <SimpleInvoicePreview
        visible={true}
        invoiceData={invoiceData}
        onClose={handleClose}
      />
      
      {/* Auto-redirect countdown */}
      {autoRedirectEnabled && countdown > 0 && (
        <View style={styles.countdownContainer}>
          <Text style={styles.countdownText}>
            Returning to POS in {countdown} seconds...
          </Text>
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={cancelAutoRedirect}
          >
            <Text style={styles.cancelButtonText}>Stay Here</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  countdownContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: colors.primary.main,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  countdownText: {
    color: colors.background.surface,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  cancelButton: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: colors.primary.main,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default SimpleInvoicePreviewScreen;