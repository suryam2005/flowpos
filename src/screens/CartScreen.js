import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Icon from '../components/SVGIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGoBack, safeNavigate } from '../utils/navigationUtils';
import { getProductImageUrl } from '../utils/imageUtils';
import { getAppSettingFromCache } from '../context/AppSettingsContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { useAuth } from '../context/AuthContext';

import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { useOrders } from '../hooks/useOrders';

import CustomAlert from '../components/CustomAlert';
import DynamicQRGenerator from '../components/DynamicQRGenerator';
import LoadingSpinner from '../components/LoadingSpinner';
import { useQRPayment } from '../hooks/useQRPayment';
import featureService from '../services/FeatureService';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttonStyles';
import { typography } from '../styles/typographyStyles';
import { useTheme } from '../context/ThemeContext';
import { useBackPrevention } from '../hooks/useBackPrevention';
import WhatsAppService from '../services/WhatsAppService';

const CartScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const { createOrder, loading: orderLoading } = useOrders();
  
  // Use StoreSettingsContext for payment methods and tax settings (migrated from AsyncStorage)
  const { storeSettings, getPaymentSettings, getTaxSettings, getStoreProfile } = useStoreSettings();
  const { user } = useAuth();
  
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerNameError, setCustomerNameError] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(['Cash', 'QR Pay']);
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(true);

  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  
  // QR Payment hook
  const { isQRVisible, paymentData, generatePaymentQR, closeQR, handlePaymentComplete } = useQRPayment();
  
  // No animations needed

  // Load settings on mount and when screen comes into focus
  // useFocusEffect runs on mount too, so no need for separate useEffect
  useFocusEffect(
    useCallback(() => {
      loadCustomerDetailsRequirement();
      loadAvailablePaymentMethods();
    }, [])
  );

  // Auto-close cart when empty and navigate back to POS (but not during order completion)
  useEffect(() => {
    if (items.length === 0 && !completingOrder && !orderCompleted) {
      // Immediate navigation without delay to prevent flash
      safeGoBack(navigation, 'Main', { screen: 'POS' });
    }
  }, [items.length, navigation, completingOrder, orderCompleted]);

  // Reset order completed flag when component unmounts
  useEffect(() => {
    return () => {
      setOrderCompleted(false);
    };
  }, []);

  const loadCustomerDetailsRequirement = async () => {
    try {
      // Read requireCustomerDetails from AppSettingsContext cache first
      const cachedSetting = getAppSettingFromCache('requireCustomerDetails');
      
      if (cachedSetting !== undefined) {
        // Use cached value from AppSettingsContext
        setRequireCustomerDetails(cachedSetting);
        console.log('🛒 [CartScreen] requireCustomerDetails read from cache:', cachedSetting);
        return;
      }
      
      // Fallback to AsyncStorage if cache unavailable (backward compatibility)
      const setting = await AsyncStorage.getItem('requireCustomerDetails');
      if (setting !== null) {
        setRequireCustomerDetails(JSON.parse(setting));
        console.log('🛒 [CartScreen] requireCustomerDetails fallback to AsyncStorage:', JSON.parse(setting));
      } else {
        // Default to true if no setting exists (existing behavior)
        setRequireCustomerDetails(true);
        console.log('🛒 [CartScreen] requireCustomerDetails using default: true');
      }
    } catch (error) {
      console.error('Error loading customer details requirement:', error);
      // Keep default value (true) on error to maintain existing behavior
    }
  };

  // App tour guide
  const { showTour, completeTour } = useAppTour('Cart');
  
  // Tour refs for dynamic positioning
  const customerSectionRef = useRef(null);
  const itemsListRef = useRef(null);
  const paymentSectionRef = useRef(null);
  const completeButtonRef = useRef(null);

  // Prevent back navigation only during order completion, not during form filling
  useBackPrevention(completingOrder, {
    message: 'Order is being processed. Please wait for completion to avoid data loss.',
    title: 'Processing Order',
    hardBlock: true // No cancellation allowed during order processing
  });

  const loadAvailablePaymentMethods = async () => {
    try {
      // Initialize feature service
      await featureService.initialize();
      
      // Get payment methods based on subscription plan
      const planMethods = featureService.getAvailablePaymentMethods();
      
      // Get configured methods from StoreSettingsContext (migrated from AsyncStorage)
      const paymentSettings = getPaymentSettings();
      let configuredMethods = paymentSettings.payment_methods || ['Cash', 'QR Pay']; // Default (Card payment removed)
      
      console.log('🛒 [CartScreen] Payment methods from context:', configuredMethods);
      
      // Intersection of plan methods and configured methods
      const availableMethods = configuredMethods.filter(method => 
        planMethods.includes(method)
      );
      
      setAvailablePaymentMethods(availableMethods);
      // Set default payment method to first available
      setPaymentMethod(availableMethods[0] || 'Cash');
    } catch (error) {
      console.error('Error loading payment methods:', error);
      setAvailablePaymentMethods(['Cash']); // Fallback to cash only
      setPaymentMethod('Cash');
    }
  };

  const subtotal = getTotal();
  
  // Get GST settings from store setup
  const [gstSettings, setGstSettings] = useState({ 
    hasGST: false, 
    percentage: 0, 
    number: '',
    includeTaxInPrice: false 
  });
  
  useEffect(() => {
    const loadGSTSettings = () => {
      try {
        // Load tax settings from StoreSettingsContext (migrated from AsyncStorage)
        const taxSettings = getTaxSettings();
        const storeProfile = getStoreProfile();
        
        // Check if GST is enabled and GST number exists
        const hasGSTNumber = storeProfile.gst_number && storeProfile.gst_number.trim() !== '';
        const isGSTEnabled = taxSettings.enableGST && hasGSTNumber;
        const gstPercentage = taxSettings.gstRate || 18;
        const includeTaxInPrice = taxSettings.includeTaxInPrice || false;
        
        console.log('🛒 [CartScreen] GST Settings from context:', {
          hasGSTNumber,
          isGSTEnabled,
          gstPercentage,
          includeTaxInPrice,
          gstNumber: storeProfile.gst_number,
          taxSettings
        });
        
        setGstSettings({
          hasGST: isGSTEnabled,
          percentage: gstPercentage,
          number: storeProfile.gst_number || '',
          includeTaxInPrice: includeTaxInPrice
        });
      } catch (error) {
        console.error('Error loading GST settings:', error);
      }
    };
    loadGSTSettings();
  }, [storeSettings, getTaxSettings, getStoreProfile]); // Re-run when storeSettings changes
  
  // Calculate GST based on includeTaxInPrice setting
  let gst = 0;
  let displaySubtotal = subtotal;
  let total = subtotal;
  
  if (gstSettings.hasGST) {
    if (gstSettings.includeTaxInPrice) {
      // Tax is already included in price - extract it
      // Formula: basePrice = totalPrice / (1 + taxRate/100)
      const basePrice = subtotal / (1 + gstSettings.percentage / 100);
      gst = Math.round(subtotal - basePrice);
      displaySubtotal = Math.round(basePrice);
      total = subtotal; // Total stays the same (price already includes tax)
    } else {
      // Tax is added on top of price
      gst = Math.round(subtotal * (gstSettings.percentage / 100));
      displaySubtotal = subtotal;
      total = subtotal + gst;
    }
  }

  const generateOrderNumber = async () => {
    try {
      const lastOrderNumber = await AsyncStorage.getItem('lastOrderNumber');
      const nextNumber = lastOrderNumber ? parseInt(lastOrderNumber) + 1 : 1001;
      await AsyncStorage.setItem('lastOrderNumber', nextNumber.toString());
      
      // Generate a more unique order ID with date prefix
      const date = new Date();
      const datePrefix = date.getFullYear().toString().slice(-2) + 
                        (date.getMonth() + 1).toString().padStart(2, '0') + 
                        date.getDate().toString().padStart(2, '0');
      
      return `FP${datePrefix}${nextNumber.toString().padStart(4, '0')}`;
    } catch (error) {
      // Fallback to timestamp-based ID
      const timestamp = Date.now().toString().slice(-8);
      return `FP${timestamp}`;
    }
  };

  const validateCustomerName = (name) => {
    if (!name || name.trim().length === 0) {
      return 'Customer name is required';
    }
    if (name.trim().length < 2) {
      return 'Name must be at least 2 characters';
    }
    return '';
  };

  const validatePhoneNumber = (phone) => {
    if (!phone || phone.trim().length === 0) {
      return 'Phone number is required';
    }
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      return 'Enter a valid 10-digit number';
    }
    if (!/^[6-9]/.test(cleanPhone)) {
      return 'Number must start with 6, 7, 8, or 9';
    }
    return '';
  };

  const handleCustomerNameChange = (text) => {
    setCustomerName(text);
    setCustomerNameError(validateCustomerName(text));
  };

  const handlePhoneNumberChange = (text) => {
    // Only allow digits
    const cleanText = text.replace(/\D/g, '');
    setPhoneNumber(cleanText);
    setPhoneNumberError(validatePhoneNumber(cleanText));
  };

  const validateCustomerDetails = () => {
    // If customer details are not required, skip validation
    if (!requireCustomerDetails) {
      return null;
    }

    const nameError = validateCustomerName(customerName);
    const phoneError = validatePhoneNumber(phoneNumber);
    
    setCustomerNameError(nameError);
    setPhoneNumberError(phoneError);

    if (nameError) return nameError;
    if (phoneError) return phoneError;
    
    return null; // No validation errors
  };



  const handleQRPayment = async () => {
    // Check if UPI payments are allowed
    if (!featureService.canUseFeature('upi_payments')) {
      featureService.showUpgradePrompt('upi_payments');
      return false;
    }

    // Validate customer details first
    const validationError = validateCustomerDetails();
    if (validationError) {
      setAlertConfig({
        title: 'Customer Details Required',
        message: validationError,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return false;
    }

    // Generate QR code for payment
    const success = await generatePaymentQR({
      amount: total,
      customerName: customerName || 'Walk-in Customer',
      orderNote: `Order for ${customerName || 'Walk-in Customer'}`,
      orderId: await generateOrderNumber(),
    });

    if (!success) {
      setAlertConfig({
        title: 'QR Generation Failed',
        message: 'Please check your UPI ID in Store Settings and try again.',
        type: 'error',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Go to Settings', 
            onPress: () => navigation.navigate('Settings')
          }
        ],
      });
      setShowAlert(true);
      return false;
    }

    return true;
  };

  const handleQRPaymentComplete = async () => {
    // Save payment record
    const paymentRecord = await handlePaymentComplete();
    
    if (paymentRecord) {
      // Complete order and navigate to invoice (not home)
      await handleCompleteOrder({
        transactionId: paymentRecord.id,
        timestamp: paymentRecord.timestamp,
        method: 'QR Pay',
      });
    }
  };

  const handleCashPaymentConfirmation = () => {
    const paymentMethodName = 'cash';
    const paymentIcon = '💵';
    
    setAlertConfig({
      title: `${paymentIcon} ${paymentMethod} Payment`,
      message: `Have you received ₹${total} ${paymentMethodName} payment from the customer?`,
      type: 'info',
      buttons: [
        { 
          text: 'Not Yet', 
          style: 'cancel' 
        },
        {
          text: 'Payment Received',
          style: 'default',
          onPress: () => {
            // Complete the order with payment confirmation
            handleCompleteOrder({
              transactionId: `${paymentMethod.toUpperCase()}_${Date.now()}`,
              timestamp: new Date().toISOString(),
              method: paymentMethod,
            });
          }
        }
      ],
    });
    setShowAlert(true);
  };

  const sendAutoWhatsAppInvoice = async (orderData) => {
    try {
      // Check if WhatsApp service is configured and auto-send is appropriate
      const whatsappMethod = await AsyncStorage.getItem('whatsappMethod');
      const currentMethod = whatsappMethod || 'flowpos';
      
      // Only auto-send for FlowPOS method (backend), not device WhatsApp
      if (currentMethod !== 'flowpos') {
        console.log('Auto-send only works with FlowPOS WhatsApp method, skipping');
        return;
      }

      if (!WhatsAppService.isReady()) {
        console.log('WhatsApp service not configured, skipping auto-send');
        return;
      }

      // Load store information from context for proper invoice data
      const storeProfile = getStoreProfile();
      const actualStoreName = storeProfile.store_name || 'FlowPOS Store';
      // Phone and email come from AuthContext (user-bound)
      const storePhone = user?.phone || '';
      const storeEmail = user?.email || '';

      // Prepare complete invoice data for WhatsApp service
      const invoiceData = {
        invoiceNumber: orderData.orderNumber || orderData.id,
        orderNumber: orderData.orderNumber || orderData.id,
        storeName: actualStoreName,
        storeAddress: storeProfile.store_address || '',
        storePhone: storePhone,
        storeEmail: storeEmail,
        customerName: orderData.customerName || 'Walk-in Customer',
        phoneNumber: orderData.phoneNumber,
        date: new Date(orderData.timestamp).toLocaleDateString('en-IN'),
        time: new Date(orderData.timestamp).toLocaleTimeString('en-IN'),
        items: orderData.items || [],
        subtotal: orderData.subtotal || 0,
        tax: orderData.gst || 0,
        grandTotal: orderData.total || orderData.grandTotal || 0,
        paymentMethod: orderData.paymentMethod || 'Cash',
      };

      console.log('📱 [CartScreen] Auto-sending WhatsApp invoice with proper data:', {
        method: currentMethod,
        customerName: invoiceData.customerName,
        phoneNumber: invoiceData.phoneNumber,
        storeName: invoiceData.storeName,
        total: invoiceData.grandTotal
      });

      // Use the proper sendInvoiceMessage method instead of sendTextMessage
      const result = await WhatsAppService.sendInvoiceMessage(
        invoiceData.phoneNumber,
        invoiceData
      );

      if (result.success) {
        console.log('✅ Auto WhatsApp invoice sent successfully via FlowPOS backend');
        // Show success notification
        setAlertConfig({
          title: 'Invoice Sent! ✅',
          message: `Invoice has been automatically sent to ${invoiceData.customerName} via WhatsApp.`,
          type: 'success',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
        setShowAlert(true);
      } else {
        console.log('❌ Auto WhatsApp invoice failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Error sending auto WhatsApp invoice:', error);
      // Don't show error to user for auto-send, just log it
    }
  };

  const [completingOrder, setCompletingOrder] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  const handleCompleteOrder = async (paymentDetails = null) => {
    // Check order limits
    const canProcess = await featureService.canProcessOrder();
    if (!canProcess) {
      return; // Feature service will show upgrade prompt
    }

    if (items.length === 0) {
      setAlertConfig({
        title: 'Empty Cart',
        message: 'Please add items to your cart first.',
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return;
    }

    // Validate customer details
    const validationError = validateCustomerDetails();
    if (validationError) {
      setAlertConfig({
        title: 'Customer Details Required',
        message: validationError,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return;
    }

    // If QR Pay is selected and no payment details, wait for payment
    if (paymentMethod === 'QR Pay' && !paymentDetails) {
      // QR should already be visible, show message to wait for payment
      setAlertConfig({
        title: 'QR Payment in Progress',
        message: 'Please wait for the customer to scan the QR code and complete the payment. The system will automatically detect the payment.',
        type: 'info',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Manual Confirmation', 
            onPress: () => {
              // Allow manual confirmation if auto-detection fails
              setAlertConfig({
                title: 'Confirm Payment',
                message: `Have you received ₹${total} UPI payment from the customer?`,
                type: 'warning',
                buttons: [
                  { text: 'No', style: 'cancel' },
                  {
                    text: 'Yes, Received',
                    onPress: () => {
                      handleCompleteOrder({
                        transactionId: `MANUAL_UPI_${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        method: 'QR Pay',
                      });
                    }
                  }
                ],
              });
              setShowAlert(true);
            }
          }
        ],
      });
      setShowAlert(true);
      return;
    }

    // If Cash is selected, show payment confirmation dialog
    if (paymentMethod === 'Cash' && !paymentDetails) {
      handleCashPaymentConfirmation();
      return;
    }

    // Set loading state
    console.log('🔄 [CartScreen] Setting loading state...');
    setCompletingOrder(true);
    
    // Haptic feedback only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const orderId = await generateOrderNumber();
      
      console.log('🛒 [CartScreen] Customer details before order creation:', {
        customerName,
        phoneNumber,
        requireCustomerDetails,
        customerNameTrimmed: customerName?.trim(),
        hasCustomerName: !!(customerName && customerName.trim() !== '')
      });
      
      // Create order object for the new orders system
      const finalCustomerName = (customerName && customerName.trim() !== '') ? customerName.trim() : 'Walk-in Customer';
      const finalPhoneNumber = (phoneNumber && phoneNumber.trim() !== '') ? phoneNumber.trim() : '';
      
      console.log('🛒 [CartScreen] Final customer data for order:', {
        finalCustomerName,
        finalPhoneNumber
      });
      
      const orderData = {
        customerName: finalCustomerName,
        phoneNumber: finalPhoneNumber,
        email: '', // Not collected in cart
        items: items.map(item => ({
          name: item.name,
          sku: item.sku || '',
          category: item.category || '',
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
          discount: 0,
          tax: 0,
          notes: ''
        })),
        subtotal: displaySubtotal,
        tax: gst,
        discount: 0,
        total,
        taxIncludedInPrice: gstSettings.includeTaxInPrice,
        paymentMethod: paymentMethod || 'Cash',
        paymentStatus: 'completed',
        status: 'completed',
        notes: '',
        ...(paymentDetails && {
          paymentDetails: {
            transactionId: paymentDetails.transactionId,
            paymentTimestamp: paymentDetails.timestamp,
            paymentMethod: paymentDetails.method,
          }
        }),
      };
      
      console.log('🛒 [CartScreen] Creating order:', orderData);
      
      // Save order using the new orders system (works offline/online)
      console.log('💾 [CartScreen] Calling createOrder...');
      const savedOrder = await createOrder(orderData);
      
      console.log('✅ [CartScreen] Order saved successfully:', savedOrder);

      // Set order completed flag to prevent auto-close BEFORE clearing cart
      console.log('✅ [CartScreen] Setting order completed flag...');
      setOrderCompleted(true);
      
      // Clear cart immediately after order creation
      console.log('🧹 [CartScreen] Clearing cart...');
      clearCart();

      // Update revenue (keep existing functionality)
      const existingRevenue = await AsyncStorage.getItem('revenue');
      const revenue = existingRevenue ? JSON.parse(existingRevenue) : {
        today: 0,
        week: 0,
        total: 0,
        orders: 0,
      };

      revenue.today += total;
      revenue.week += total;
      revenue.total += total;
      revenue.orders += 1;

      await AsyncStorage.setItem('revenue', JSON.stringify(revenue));

      // Update product stock (keep existing functionality)
      const existingProducts = await AsyncStorage.getItem('products');
      if (existingProducts) {
        const products = JSON.parse(existingProducts);
        const updatedProducts = products.map(product => {
          const cartItem = items.find(item => item.id === product.id);
          if (cartItem) {
            return { ...product, stock: Math.max(0, product.stock - cartItem.quantity) };
          }
          return product;
        });
        await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      }

      // Navigate to SimpleInvoicePreview instead of direct Invoice screen
      // Load store info from context for complete invoice data
      const storeProfile = getStoreProfile();
      const actualStoreName = storeProfile.store_name || 'FlowPOS Store';
      // Phone and email come from AuthContext (user-bound)
      const storePhone = user?.phone || '';
      const storeEmail = user?.email || '';
      
      const invoiceOrderData = {
        id: savedOrder.id,
        invoiceNumber: savedOrder.orderNumber,
        orderNumber: savedOrder.orderNumber,
        customerName: finalCustomerName, // Use the final processed customer name
        phoneNumber: finalPhoneNumber, // Use the final processed phone number
        items: items,
        subtotal: displaySubtotal,
        gst,
        total: total,
        grandTotal: total,
        taxIncludedInPrice: gstSettings.includeTaxInPrice,
        paymentMethod,
        timestamp: savedOrder.timestamp,
        date: new Date(savedOrder.timestamp).toLocaleDateString(),
        time: new Date(savedOrder.timestamp).toLocaleTimeString(),
        status: 'completed',
        // FIXED: Include store information for invoice display (Issue 1 & 2)
        storeName: actualStoreName,
        storeAddress: storeProfile.store_address || '',
        storePhone: storePhone,
        storeEmail: storeEmail,
        gstNumber: storeProfile.gst_number || '',
        ...(paymentDetails && {
          paymentDetails: {
            transactionId: paymentDetails.transactionId,
            paymentTimestamp: paymentDetails.timestamp,
            paymentMethod: paymentDetails.method,
          }
        }),
      };
      
      console.log('Navigating to SimpleInvoicePreview with data:', invoiceOrderData);
      
      // Auto-send WhatsApp invoice if enabled and phone number is provided
      // Only for FlowPOS method to avoid interrupting user flow with device WhatsApp
      if (phoneNumber && phoneNumber.trim()) {
        const autoWhatsAppEnabled = await AsyncStorage.getItem('autoWhatsAppInvoice');
        const whatsappMethod = await AsyncStorage.getItem('whatsappMethod');
        const currentMethod = whatsappMethod || 'flowpos';
        
        if ((autoWhatsAppEnabled === null || JSON.parse(autoWhatsAppEnabled)) && currentMethod === 'flowpos') {
          await sendAutoWhatsAppInvoice(invoiceOrderData);
        } else if (currentMethod === 'device') {
          console.log('📱 [CartScreen] Skipping auto-send for device WhatsApp to avoid flow interruption');
        }
      }
      
      // Navigate to SimpleInvoicePreview for better user experience
      console.log('🚀 [CartScreen] Navigating to SimpleInvoicePreview...');
      
      // Immediate navigation without delay to prevent cart flash
      navigation.navigate('SimpleInvoicePreview', { 
        invoiceData: invoiceOrderData,
        fromOrderCompletion: true,
        showSkipOption: true // Enable skip countdown after order completion
      });
      
      // Loading state will be reset in finally block

    } catch (error) {
      console.error('❌ Error completing order:', error);
      setAlertConfig({
        title: 'Error',
        message: `Failed to complete order: ${error.message}. The order was saved locally and will sync when online.`,
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      
      // Even if there's an error, still navigate to invoice with local data
      const orderId = await generateOrderNumber();
      const finalCustomerName = (customerName && customerName.trim() !== '') ? customerName.trim() : 'Walk-in Customer';
      const finalPhoneNumber = (phoneNumber && phoneNumber.trim() !== '') ? phoneNumber.trim() : '';
      
      // Load store info from context for error case too
      const storeProfileError = getStoreProfile();
      const actualStoreNameError = storeProfileError.store_name || 'FlowPOS Store';
      // Phone and email come from AuthContext (user-bound)
      const storePhoneError = user?.phone || '';
      const storeEmailError = user?.email || '';
      
      const invoiceOrderData = {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customerName: finalCustomerName,
        phoneNumber: finalPhoneNumber,
        items: items,
        subtotal: displaySubtotal,
        gst,
        total,
        grandTotal: total,
        taxIncludedInPrice: gstSettings.includeTaxInPrice,
        paymentMethod,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        status: 'completed',
        // FIXED: Include store information for invoice display (Issue 1 & 2)
        storeName: actualStoreNameError,
        storeAddress: storeProfileError.store_address || '',
        storePhone: storePhoneError,
        storeEmail: storeEmailError,
        gstNumber: storeProfileError.gst_number || '',
      };
      
      clearCart();
      
      // Set order completed flag to prevent auto-close BEFORE navigation
      setOrderCompleted(true);
      
      console.log('🚀 [CartScreen] Error case - Navigating to SimpleInvoicePreview...');
      navigation.navigate('SimpleInvoicePreview', { 
        invoiceData: invoiceOrderData,
        fromOrderCompletion: true
      });
    } finally {
      setCompletingOrder(false);
    }
  };

  const renderCartItem = ({ item, index }) => {
    const handleQuantityChange = (newQuantity) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateQuantity(item.id, newQuantity);
    };

    const handleDeleteItem = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setAlertConfig({
        title: 'Remove Item',
        message: `Remove ${item.name} from cart?`,
        type: 'warning',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Remove', 
            style: 'destructive',
            onPress: () => removeItem(item.id)
          }
        ],
      });
      setShowAlert(true);
    };

    // Get image URL using utility function (same as POSScreen)
    const displayImageUrl = getProductImageUrl(item);

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemImage}>
          {displayImageUrl ? (
            <Image source={{ uri: displayImageUrl }} style={styles.itemImageStyle} />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Icon name="cube-outline" size={24} color={colors.text.secondary} />
            </View>
          )}
        </View>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemPrice}>₹{item.price} x {item.quantity}</Text>
        </View>
        <View style={styles.quantityControls}>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.quantity - 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.quantityButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.quantity}>{item.quantity}</Text>
          <TouchableOpacity
            style={styles.quantityButton}
            onPress={() => handleQuantityChange(item.quantity + 1)}
            activeOpacity={0.7}
          >
            <Text style={styles.quantityButtonText}>+</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.itemActions}>
          <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteItem}
            activeOpacity={0.7}
          >
            <Icon name="trash-outline" size={18} color={colors.error.main} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const handlePaymentMethodChange = async (method) => {
    setPaymentMethod(method);
    
    // If QR Pay is selected, automatically generate QR code
    if (method === 'QR Pay') {
      // Small delay to ensure state is updated
      setTimeout(async () => {
        await handleQRPayment();
      }, 100);
    } else {
      // If switching away from QR Pay, close the QR popup
      if (isQRVisible) {
        closeQR();
      }
    }
  };

  const renderPaymentMethod = (method, icon) => (
    <TouchableOpacity
      style={[
        styles.paymentMethod,
        paymentMethod === method && styles.paymentMethodActive
      ]}
      onPress={() => handlePaymentMethodChange(method)}
    >
      <Text style={styles.paymentIcon}>{icon}</Text>
      <Text style={[
        styles.paymentText,
        paymentMethod === method && styles.paymentTextActive
      ]}>
        {method}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeGoBack(navigation, 'Main', { screen: 'POS' })}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Customer Details Section */}
          {requireCustomerDetails && (
            <View style={styles.customerSection} ref={customerSectionRef}>
            <Text style={styles.sectionTitle}>Customer Information</Text>

            <Text style={styles.inputLabel}>Customer Name <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[
                styles.textInput, 
                styles.requiredInput,
                customerNameError ? styles.errorInput : null
              ]}
              placeholder="Enter customer name (required)"
              value={customerName}
              onChangeText={handleCustomerNameChange}
            />
            {customerNameError ? (
              <Text style={styles.errorText}>{customerNameError}</Text>
            ) : null}

            <Text style={styles.inputLabel}>Phone Number <Text style={styles.requiredAsterisk}>*</Text></Text>
            <TextInput
              style={[
                styles.textInput, 
                styles.requiredInput,
                phoneNumberError ? styles.errorInput : null
              ]}
              placeholder="Enter 10-digit mobile number (required)"
              value={phoneNumber}
              onChangeText={handlePhoneNumberChange}
              keyboardType="phone-pad"
              maxLength={10}
            />
            {phoneNumberError ? (
              <Text style={styles.errorText}>{phoneNumberError}</Text>
            ) : null}
          </View>
          )}

          {/* Cart Items Section */}
          <View style={styles.cartItemsSection} ref={itemsListRef}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            <FlatList
              data={items}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>

          {/* Payment Methods Section */}
          <View style={styles.paymentSection} ref={paymentSectionRef}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {availablePaymentMethods.map((method) => {
                const methodConfig = {
                  'Cash': { icon: '💵', label: 'Cash' },
                  'QR Pay': { icon: '📲', label: 'QR Pay' },
                };
                const config = methodConfig[method];
                return config ? (
                  <View key={method} style={styles.paymentMethodWrapper}>
                    {renderPaymentMethod(method, config.icon)}
                  </View>
                ) : null;
              })}
            </View>
          </View>

          {/* Order Summary Section */}
          <View style={styles.summarySection}>
            <Text style={styles.sectionTitle}>Order Summary</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {gstSettings.includeTaxInPrice ? 'Base Amount:' : 'Subtotal:'}
              </Text>
              <Text style={styles.summaryValue}>₹{displaySubtotal}</Text>
            </View>
            {gstSettings.hasGST && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>
                  GST ({gstSettings.percentage}%){gstSettings.includeTaxInPrice ? ' (included):' : ':'}
                </Text>
                <Text style={styles.summaryValue}>₹{gst}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>

          <View style={styles.completeButtonContainer}>
            <TouchableOpacity
              ref={completeButtonRef}
              style={[buttonStyles.success, (orderLoading || completingOrder) && buttonStyles.disabled]}
              onPress={handleCompleteOrder}
              disabled={orderLoading || completingOrder}
              activeOpacity={0.8}
            >
              <Text style={buttonStyles.successText}>
                {(orderLoading || completingOrder)
                  ? 'Processing...'
                  : paymentMethod === 'QR Pay' 
                    ? (isQRVisible ? 'Waiting for Payment...' : 'Generate QR Code')
                    : paymentMethod === 'Cash' 
                      ? 'Collect Cash Payment' 
                      : 'Complete Order'
                }
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      {/* Loading Overlay for Order Completion */}
      {completingOrder && <LoadingSpinner />}

      <DynamicQRGenerator
        amount={paymentData.amount}
        visible={isQRVisible}
        onClose={closeQR}
        customerName={paymentData.customerName}
        orderNote={paymentData.orderNote}
        onPaymentComplete={handleQRPaymentComplete}
      />

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setShowAlert(false)}
      />

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="Cart"
        onComplete={completeTour}
        navigation={navigation}
        tourRefs={{
          customerSection: customerSectionRef,
          itemsList: itemsListRef,
          paymentSection: paymentSectionRef,
          completeButton: completeButtonRef,
        }}
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
    paddingTop: 60,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  backButton: {
    padding: 8,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  placeholder: {
    width: 36,
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cartItemsSection: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  paymentSection: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
    minHeight: 80,
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  itemImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  itemImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  itemImagePlaceholderText: {
    ...typography.styles.lg,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    ...typography.styles.bodySemibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemPrice: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    ...typography.styles.lg,
    fontWeight: typography.fontWeights.semibold,
    color: colors.text.primary,
  },
  quantity: {
    ...typography.styles.bodySemibold,
    color: colors.text.primary,
    marginHorizontal: 12,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  itemTotal: {
    ...typography.styles.priceSmall,
    color: colors.text.primary,
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: colors.error.background,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  deleteButtonText: {
    ...typography.styles.body,
  },
  summarySection: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    ...typography.styles.body,
    color: colors.text.secondary,
  },
  summaryValue: {
    ...typography.styles.bodySemibold,
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  totalLabel: {
    ...typography.styles.price,
    color: colors.text.primary,
  },
  totalValue: {
    ...typography.styles.price,
    color: colors.primary.main,
  },
  customerSection: {
    backgroundColor: colors.background.surface,
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 10,
  },
  sectionTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputLabel: {
    ...typography.styles.label,
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    ...typography.styles.input,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: colors.background.surface,
  },
  requiredInput: {
    borderColor: colors.primary.main,
    borderWidth: 1.5,
  },
  requiredAsterisk: {
    color: colors.error.main,
    ...typography.styles.body,
    fontWeight: typography.fontWeights.semibold,
  },
  errorInput: {
    borderColor: colors.error.main,
    borderWidth: 1.5,
  },
  errorText: {
    ...typography.styles.caption,
    color: colors.error.main,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodWrapper: {
    flex: 1,
  },
  paymentMethod: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.medium,
    backgroundColor: colors.background.surface,
  },
  paymentMethodActive: {
    borderColor: colors.primary.main,
    backgroundColor: colors.primary.background,
  },
  paymentIcon: {
    ...typography.styles.h2,
    marginBottom: 4,
  },
  paymentText: {
    ...typography.styles.bodySmallMedium,
    color: colors.text.secondary,
  },
  paymentTextActive: {
    color: colors.primary.main,
  },
  completeButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  // Complete button styles removed - using standardized buttonStyles.success

});

export default CartScreen;