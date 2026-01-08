import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from '../components/SVGIcons';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useOrders } from '../hooks/useOrders';
import * as Haptics from 'expo-haptics';
import { fadeIn } from '../utils/animations';
import LoadingSpinner from '../components/LoadingSpinner';
import InteractiveTourOverlay from '../components/InteractiveTourOverlay';
import useInteractiveTour from '../hooks/useInteractiveTour';
import tourProgressManager from '../services/TourProgressManager';
import { colors } from '../styles/colors';
import WhatsAppService from '../services/WhatsAppService';
import PDFReportsService from '../services/PDFReportsService';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAuth } from '../context/AuthContext';

const OrdersScreen = ({ navigation, route }) => {
  const { 
    orders, 
    loading, 
    error,
    authError,
    refreshOrders, 
    pendingCount, 
    isOnline,
    syncOrders 
  } = useOrders();
  const { getStoreProfile } = useStoreSettings();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState(null);

  // API operation loading state (for manual operations like sending invoice)
  const [isLoadingData, setIsLoadingData] = useState(false);
  
  // App tour guide - using interactive tour hook
  const {
    showTour,
    currentStep,
    stepIndex,
    totalSteps,
    showHint,
    showSkipStep,
    startTour,
    nextStep,
    skipScreen,
    skipAll,
    skipStep,
    completeTour,
    checkAutoStart,
    setOverlayRef,
    isInitialized,
  } = useInteractiveTour('Orders');
  
  // Tour overlay ref
  const overlayRef = useRef(null);
  
  // Tour refs for dynamic positioning
  const headerRef = useRef(null);
  const ordersListRef = useRef(null);

  // Track if initial load is done
  const initialLoadDone = useRef(false);
  
  // Track last fetch timestamp for staleness check (API optimization)
  const lastFetchRef = useRef(0);

  // Simple timestamp guard to prevent rapid refetches on remount (30 seconds)
  const REMOUNT_GUARD_MS = 30 * 1000;

  useEffect(() => {
    // Orders are loaded automatically by useOrders hook
    // The 'loading' state from useOrders() tracks the initial load
    initialLoadDone.current = true;
    
    // Simple guard: check if we fetched recently to prevent rapid remount refetches
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    
    if (timeSinceLastFetch > REMOUNT_GUARD_MS || lastFetchRef.current === 0) {
      // Check WhatsApp status on initial mount
      console.log('📱 [Orders] Initial mount - checking WhatsApp status');
      checkWhatsAppStatus();
      lastFetchRef.current = now; // Track fetch timestamp
    } else {
      console.log('📱 [Orders] Mount guard active - skipping API call (recently fetched)');
    }
  }, []);

  // Check if tour should auto-start when initialized
  useEffect(() => {
    if (isInitialized) {
      checkAutoStart();
    }
  }, [isInitialized, checkAutoStart]);

  // Handle tour trigger from route params
  useEffect(() => {
    if (route?.params?.startTour) {
      console.log('🎯 [OrdersScreen] Tour trigger received from route params');
      setTimeout(() => {
        startTour();
      }, 1500);
      navigation.setParams({ startTour: undefined });
    }
  }, [route?.params?.startTour, startTour, navigation]);

  // Handle tour continuation from Analytics screen
  useEffect(() => {
    if (route?.params?.continueTour && isInitialized) {
      console.log('🎯 [OrdersScreen] Tour continuation received from Analytics');
      // Small delay to let the screen render first
      setTimeout(() => {
        startTour();
      }, 1000);
      // Clear the param to prevent re-triggering
      navigation.setParams({ continueTour: undefined });
    }
  }, [route?.params?.continueTour, isInitialized, startTour, navigation]);

  // Handle tour completion - guide to Manage screen
  // Requirements: 5.3 - After Orders tour completes, show hint to tap Manage
  const handleTourComplete = useCallback(async () => {
    console.log('🎯 [OrdersScreen] Tour complete, guiding to Manage');
    
    // Set continuation to ManageProducts (first tab of Manage screen)
    await tourProgressManager.setContinueTourTo('ManageProducts');
    
    // Navigate to Manage screen with tour continuation flag
    navigation.navigate('Main', { 
      screen: 'Manage',
      params: { continueTour: true }
    });
  }, [navigation]);

  // Handle next step - check if we need to navigate to Manage
  const handleNextStep = useCallback(async () => {
    // Check if current step has nextScreen set to ManageProducts (last step)
    if (currentStep?.nextScreen === 'ManageProducts') {
      // This is the last step, navigate to Manage
      await handleTourComplete();
    } else {
      nextStep();
    }
  }, [currentStep, nextStep, handleTourComplete]);

  // Set overlay ref for animations
  useEffect(() => {
    if (overlayRef.current) {
      setOverlayRef(overlayRef.current);
    }
  }, [setOverlayRef]);

  const checkWhatsAppStatus = async () => {
    try {
      const status = await WhatsAppService.getStatus();
      setWhatsappStatus(status);
      console.log('📱 [Orders] WhatsApp status fetched on mount');
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
    }
  };

  // PHASE 1 OPTIMIZATION: Remove focus-based refetching
  // WhatsApp status is fetched only on mount and via user-triggered refresh
  // This eliminates unnecessary API calls when navigating between tabs

  const onRefresh = async () => {
    setRefreshing(true);
    setIsLoadingData(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Refresh both orders and WhatsApp status on user-triggered refresh
    await Promise.all([
      refreshOrders(),
      checkWhatsAppStatus()
    ]);
    
    // Update fetch timestamp after successful refresh (API optimization)
    lastFetchRef.current = Date.now();
    
    setRefreshing(false);
    setIsLoadingData(false);
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleViewInvoice = (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    console.log('📄 [OrdersScreen] Original order data received:', {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      phoneNumber: order.phoneNumber,
      hasCustomerName: !!order.customerName,
      hasPhoneNumber: !!order.phoneNumber
    });
    
    // Convert order data to invoice format with proper customer details
    const invoiceOrderData = {
      ...order,
      // Use existing orderNumber or create one from id
      orderNumber: order.orderNumber || `ORD-${order.id}`,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      gst: order.gst || order.tax || 0,
      total: order.total || 0,
      // Ensure customer details are properly passed
      customerName: order.customerName || 'Walk-in Customer',
      phoneNumber: order.phoneNumber || '',
      // Add timestamp for invoice date
      timestamp: order.timestamp || order.createdAt || Date.now(),
    };
    
    console.log('📄 [OrdersScreen] Processed invoice data:', {
      customerName: invoiceOrderData.customerName,
      phoneNumber: invoiceOrderData.phoneNumber,
      orderNumber: invoiceOrderData.orderNumber
    });
    
    navigation.navigate('Invoice', { 
      orderData: invoiceOrderData,
      sourceScreen: 'Orders' // Add source context
    });
  };

  const handleSendInvoice = async (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Check if WhatsApp is configured
    if (!WhatsAppService.isReady()) {
      Alert.alert(
        'WhatsApp Not Configured',
        'WhatsApp integration is not set up yet. Would you like to configure it now?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Invoice', 
            onPress: () => handleViewInvoice(order)
          },
          { 
            text: 'Setup WhatsApp', 
            onPress: () => navigation.navigate('WhatsAppSetup')
          }
        ]
      );
      return;
    }

    // Check if customer has phone number
    if (!order.phoneNumber || order.phoneNumber.trim() === '') {
      Alert.alert(
        'No Phone Number',
        'This order does not have a customer phone number. WhatsApp requires a phone number to send messages.',
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'View Invoice', 
            onPress: () => handleViewInvoice(order)
          }
        ]
      );
      return;
    }

    try {
      // Show loading state
      setIsLoadingData(true);
      
      // Load store information from context for WhatsApp message
      const storeProfile = getStoreProfile();
      const actualStoreName = storeProfile.store_name || 'FlowPOS Store';
      const storeAddress = storeProfile.store_address || '';
      // Phone and email come from AuthContext (user-bound)
      const storePhone = user?.phone || '';
      const storeEmail = user?.email || '';
      
      console.log('🏪 [OrdersScreen] Store info loaded for WhatsApp:', {
        storeProfile,
        actualStoreName,
        storeAddress,
        storePhone,
        storeEmail
      });

      // Generate invoice PDF/image
      // FIXED: Always pass the actual store info - let WhatsAppService handle the settings
      const invoiceData = {
        ...order,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        items: order.items || [],
        subtotal: order.subtotal || 0,
        tax: order.gst || order.tax || 0,
        grandTotal: order.total || order.grandTotal || 0, // Use grandTotal for WhatsApp service
        customerName: order.customerName || 'Walk-in Customer',
        phoneNumber: order.phoneNumber || '',
        date: new Date(order.timestamp).toLocaleDateString('en-IN'),
        storeName: actualStoreName, // Always pass actual store name - WhatsAppService will handle the setting
        storeAddress: storeAddress, // Pass store address - WhatsAppService will handle the setting
        storePhone: storePhone, // Pass store phone - WhatsAppService will handle the setting
        storeEmail: storeEmail, // Pass store email - WhatsAppService will handle the setting
        paymentMethod: order.paymentMethod || 'Cash'
      };

      // REMOVED: Hardcoded message template that bypassed WhatsAppService setting logic
      // The WhatsAppService.sendInvoiceMessage() will handle message creation with proper setting respect

      // Send WhatsApp message with proper invoice data - WhatsAppService will create the message and respect settings
      const result = await WhatsAppService.sendInvoiceMessage(order.phoneNumber, invoiceData);

      if (result.success) {
        Alert.alert(
          'Invoice Sent! ✅',
          `Invoice has been successfully sent to ${order.customerName} via WhatsApp.`,
          [{ text: 'Great!', style: 'default' }]
        );
      } else {
        throw new Error(result.error || 'Failed to send WhatsApp message');
      }

    } catch (error) {
      console.error('Error sending WhatsApp invoice:', error);
      
      Alert.alert(
        'Send Failed ❌',
        `Failed to send invoice via WhatsApp: ${error.message}\n\nWould you like to try an alternative method?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'View Invoice', 
            onPress: () => handleViewInvoice(order)
          },
          { 
            text: 'Try Device WhatsApp', 
            onPress: () => sendViaDeviceWhatsApp(order)
          }
        ]
      );
    } finally {
      setIsLoadingData(false);
    }
  };

  const sendViaDeviceWhatsApp = async (order) => {
    try {
      // Load store information from context
      const storeProfile = getStoreProfile();
      const actualStoreName = storeProfile.store_name || 'FlowPOS Store';
      
      console.log('🏪 [OrdersScreen] Store info loaded for device WhatsApp:', {
        storeProfile,
        actualStoreName
      });

      // FIXED: Always pass the actual store name - let WhatsAppService handle the setting
      const invoiceData = {
        ...order,
        orderNumber: order.orderNumber || `ORD-${order.id}`,
        items: order.items || [],
        subtotal: order.subtotal || 0,
        tax: order.gst || order.tax || 0,
        grandTotal: order.total || order.grandTotal || 0,
        customerName: order.customerName || 'Walk-in Customer',
        phoneNumber: order.phoneNumber || '',
        date: new Date(order.timestamp).toLocaleDateString('en-IN'),
        storeName: actualStoreName, // Always pass actual store name - WhatsAppService will handle the setting
        paymentMethod: order.paymentMethod || 'Cash'
      };

      const result = await WhatsAppService.sendViaDeviceWhatsApp(
        order.phoneNumber,
        null, // No image for now
        invoiceData
      );

      if (result.success) {
        Alert.alert(
          'WhatsApp Opened',
          result.message,
          [{ text: 'OK', style: 'default' }]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Could not open WhatsApp: ${error.message}`,
        [{ text: 'OK', style: 'default' }]
      );
    }
  };

  // Determine if send button should be shown based on WhatsApp settings
  const shouldShowSendButton = (order) => {
    // Don't show if no phone number
    if (!order.phoneNumber) return false;
    
    // Don't show if send invoice feature is disabled
    if (whatsappStatus && !whatsappStatus.sendInvoiceEnabled) return false;
    
    // FUTURE: When auto-send is enabled, hide button for FlowPOS method
    // TODO: Uncomment this when Twilio credentials are configured and auto-send is enabled
    /*
    if (whatsappStatus && whatsappStatus.currentMethod === 'flowpos' && whatsappStatus.flowposReady) {
      return false; // Hide button for auto-send
    }
    */
    
    // CURRENT: Show send button for both methods (FlowPOS and device) since auto-send is disabled
    return whatsappStatus && whatsappStatus.sendInvoiceEnabled;
  };

  const renderOrder = ({ item, index }) => {
    // Debug: Log order data to see what customer details are available
    if (index === 0) {
      console.log('📋 [OrdersScreen] Sample order data:', {
        id: item.id,
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        phoneNumber: item.phoneNumber,
        hasCustomerData: !!(item.customerName && item.customerName !== 'Walk-in Customer')
      });
    }
    
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      handleViewInvoice(item);
    };

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.orderNumber || item.id}</Text>
            <Text style={styles.orderDate}>
              {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
            </Text>
            {/* Customer Details */}
            {(item.customerName && item.customerName !== 'Walk-in Customer') && (
              <Text style={styles.customerName}>👤 {item.customerName}</Text>
            )}
            {item.phoneNumber && (
              <Text style={styles.customerPhone}>📱 {item.phoneNumber}</Text>
            )}
          </View>
        </View>

        <View style={styles.orderItems}>
          {item.items.slice(0, 2).map((orderItem, index) => (
            <Text key={index} style={styles.itemText} numberOfLines={1} ellipsizeMode="tail">
              {orderItem.quantity}x {orderItem.name}
            </Text>
          ))}
          {item.items.length > 2 && (
            <Text style={styles.moreItems}>
              +{item.items.length - 2} more items
            </Text>
          )}
        </View>

        <View style={styles.orderFooter}>
          <View style={styles.orderInfo}>
            <Text style={styles.paymentMethod}>Payment: {item.paymentMethod}</Text>
            <Text style={styles.orderTotal}>Total: ₹{item.total}</Text>
          </View>
          <View style={styles.invoiceActions}>
            <TouchableOpacity
              style={styles.invoiceButton}
              onPress={(e) => {
                e.stopPropagation();
                handleViewInvoice(item);
              }}
              activeOpacity={0.7}
            >
              <Icon name="document-text-outline" size={16} color={colors.primary.main} style={{ marginRight: 4 }} />
              <Text style={styles.invoiceButtonText}>Invoice</Text>
            </TouchableOpacity>
            {shouldShowSendButton(item) && (
              <TouchableOpacity
                style={styles.sendButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleSendInvoice(item);
                }}
                activeOpacity={0.7}
              >
                <Icon name="send-outline" size={16} color={colors.background.surface} style={{ marginRight: 4 }} />
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Icon name="receipt-outline" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptyText}>
        Orders will appear here once you complete your first sale.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {(loading || isLoadingData) && <LoadingSpinner />}

      <View style={styles.content}>
        <View style={styles.header} ref={headerRef}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'}
          </Text>
        </View>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={{ flex: 1, opacity: 1 }} ref={ordersListRef}>
          {orders.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={orders}
              renderItem={renderOrder}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.ordersList}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor={colors.primary.main}
                  colors={[colors.primary.main]}
                  progressBackgroundColor={colors.background.surface}
                  title="Pull to refresh orders..."
                  titleColor={colors.text.secondary}
                />
              }
            />
          )}
        </View>
      </View>

      {/* Interactive Tour Overlay */}
      <InteractiveTourOverlay
        ref={overlayRef}
        visible={showTour}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepIndex={stepIndex}
        onNext={handleNextStep}
        onSkip={skipScreen}
        onSkipAll={skipAll}
        onSkipStep={skipStep}
        onActionComplete={completeTour}
        showHint={showHint}
        showSkipStep={showSkipStep}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  content: {
    flex: 1,
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: colors.error.light,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.error.main,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 14,
    fontWeight: '500',
  },
  ordersList: {
    padding: 20,
    paddingBottom: 140, // Reduced spacing
  },
  orderCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.gray[100],
    overflow: 'hidden', // Prevent content overflow
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  customerName: {
    fontSize: 13,
    color: colors.primary.main,
    fontWeight: '500',
    marginTop: 2,
  },
  customerPhone: {
    fontSize: 13,
    color: colors.text.secondary,
    marginTop: 1,
  },

  orderItems: {
    marginBottom: 12,
  },
  itemText: {
    fontSize: 14,
    color: colors.text.primary,
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.gray[100],
  },
  orderInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invoiceButton: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  invoiceButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
    textAlign: 'center',
    lineHeight: 16,
  },
  sendButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background.surface,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OrdersScreen;