import React, { useState, useRef, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGoBack, safeNavigate } from '../utils/navigationUtils';

import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { useOrders } from '../hooks/useOrders';

import CustomAlert from '../components/CustomAlert';
import DynamicQRGenerator from '../components/DynamicQRGenerator';
import { useQRPayment } from '../hooks/useQRPayment';
import featureService from '../services/FeatureService';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import WhatsAppService from '../services/WhatsAppService';

const CartScreen = ({ navigation }) => {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const { createOrder, loading: orderLoading } = useOrders();
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerNameError, setCustomerNameError] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(['Cash', 'Card', 'QR Pay']);
  const [phoneNumberError, setPhoneNumberError] = useState('');
  const [requireCustomerDetails, setRequireCustomerDetails] = useState(true);

  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  
  // QR Payment hook
  const { isQRVisible, paymentData, generatePaymentQR, closeQR, handlePaymentComplete } = useQRPayment();
  
  // No animations needed

  useEffect(() => {
    loadAvailablePaymentMethods();
    loadCustomerDetailsRequirement();
  }, []);

  const loadCustomerDetailsRequirement = async () => {
    try {
      const setting = await AsyncStorage.getItem('requireCustomerDetails');
      if (setting !== null) {
        setRequireCustomerDetails(JSON.parse(setting));
      }
    } catch (error) {
      console.error('Error loading customer details requirement:', error);
    }
  };

  // App tour guide
  const { showTour, completeTour } = useAppTour('Cart');

  const loadAvailablePaymentMethods = async () => {
    try {
      // Initialize feature service
      await featureService.initialize();
      
      // Get payment methods based on subscription plan
      const planMethods = featureService.getAvailablePaymentMethods();
      
      // Get configured methods from store settings
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      let configuredMethods = ['Cash', 'Card', 'QR Pay']; // Default
      
      if (storeInfo) {
        const parsedStore = JSON.parse(storeInfo);
        if (parsedStore.paymentMethods && parsedStore.paymentMethods.length > 0) {
          configuredMethods = parsedStore.paymentMethods;
        }
      }
      
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
  const [gstSettings, setGstSettings] = useState({ hasGST: false, percentage: 0, number: '' });
  
  useEffect(() => {
    const loadGSTSettings = async () => {
      try {
        const storeData = await AsyncStorage.getItem('storeInfo');
        if (storeData) {
          const store = JSON.parse(storeData);
          const hasGSTNumber = store.gstNumber && store.gstNumber.trim() !== '';
          const gstPercentage = store.gstPercentage || 18;
          console.log('CartScreen GST Settings:', {
            hasGSTNumber,
            gstPercentage,
            gstNumber: store.gstNumber,
            storeData: store
          });
          setGstSettings({
            hasGST: hasGSTNumber,
            percentage: gstPercentage,
            number: store.gstNumber || ''
          });
        }
      } catch (error) {
        console.error('Error loading GST settings:', error);
      }
    };
    loadGSTSettings();
  }, []);
  
  const gst = gstSettings.hasGST ? Math.round(subtotal * (gstSettings.percentage / 100)) : 0;
  const total = subtotal + gst;

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

  const handleCashCardPaymentConfirmation = () => {
    const paymentMethodName = paymentMethod === 'Cash' ? 'cash' : 'card';
    const paymentIcon = paymentMethod === 'Cash' ? '💵' : '💳';
    
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
          text: '✅ Payment Received',
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
      // Check if WhatsApp service is configured
      if (!WhatsAppService.isReady()) {
        console.log('WhatsApp service not configured, skipping auto-send');
        return;
      }

      // Prepare invoice data for WhatsApp
      const invoiceData = {
        invoiceNumber: orderData.orderNumber || orderData.id,
        storeName: 'FlowPOS Store', // You can get this from store settings
        customerName: orderData.customerName,
        phoneNumber: orderData.phoneNumber,
        date: new Date(orderData.timestamp).toLocaleDateString(),
        time: new Date(orderData.timestamp).toLocaleTimeString(),
        items: orderData.items,
        subtotal: orderData.subtotal,
        tax: orderData.gst,
        grandTotal: orderData.total,
        paymentMethod: orderData.paymentMethod,
      };

      // Send WhatsApp message with invoice details (text-based for auto-send)
      const message = `🧾 *Invoice from ${invoiceData.storeName}*

📄 Invoice: ${invoiceData.invoiceNumber}
👤 Customer: ${invoiceData.customerName}
📅 Date: ${invoiceData.date} ${invoiceData.time}

📦 *Items:*
${invoiceData.items.map(item => 
  `• ${item.name} x${item.quantity} - ₹${(item.price * item.quantity).toFixed(2)}`
).join('\n')}

💰 *Total: ₹${invoiceData.grandTotal}*
💳 Payment: ${invoiceData.paymentMethod}

Thank you for your business! 🙏

_Powered by FlowPOS_`;

      // Send via WhatsApp
      const result = await WhatsAppService.sendTextMessage(
        invoiceData.phoneNumber,
        message
      );

      if (result.success) {
        console.log('Auto WhatsApp invoice sent successfully');
        // Show success notification
        setAlertConfig({
          title: '📱 Invoice Sent!',
          message: `Invoice has been automatically sent to ${invoiceData.customerName} via WhatsApp.`,
          type: 'success',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
        setShowAlert(true);
      }
    } catch (error) {
      console.error('Error sending auto WhatsApp invoice:', error);
      // Don't show error to user for auto-send, just log it
    }
  };

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
        title: '📲 QR Payment in Progress',
        message: 'Please wait for the customer to scan the QR code and complete the payment. The system will automatically detect the payment.',
        type: 'info',
        buttons: [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Manual Confirmation', 
            onPress: () => {
              // Allow manual confirmation if auto-detection fails
              setAlertConfig({
                title: '✅ Confirm Payment',
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

    // If Cash or Card is selected, show payment confirmation dialog
    if ((paymentMethod === 'Cash' || paymentMethod === 'Card') && !paymentDetails) {
      handleCashCardPaymentConfirmation();
      return;
    }

    // Haptic feedback only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const orderId = await generateOrderNumber();
      
      // Create order object for the new orders system
      const orderData = {
        customerName: customerName || 'Walk-in Customer',
        phoneNumber: phoneNumber || '',
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
        subtotal,
        tax: gst,
        discount: 0,
        total,
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
      
      console.log('🛒 Creating order:', orderData);
      
      // Save order using the new orders system (works offline/online)
      const savedOrder = await createOrder(orderData);
      
      console.log('✅ Order saved:', savedOrder);

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

      clearCart();

      // Navigate to invoice screen with order data (backward compatibility)
      const invoiceOrderData = {
        id: savedOrder.id,
        orderNumber: savedOrder.orderNumber,
        customerName: savedOrder.customerName,
        phoneNumber: savedOrder.phoneNumber,
        items: items,
        subtotal,
        gst,
        total,
        paymentMethod,
        timestamp: savedOrder.timestamp,
        status: 'completed',
        ...(paymentDetails && {
          paymentDetails: {
            transactionId: paymentDetails.transactionId,
            paymentTimestamp: paymentDetails.timestamp,
            paymentMethod: paymentDetails.method,
          }
        }),
      };
      
      console.log('Navigating to Invoice with data:', invoiceOrderData);
      
      // Auto-send WhatsApp invoice if enabled and phone number is provided
      if (phoneNumber && phoneNumber.trim()) {
        const autoWhatsAppEnabled = await AsyncStorage.getItem('autoWhatsAppInvoice');
        if (autoWhatsAppEnabled === null || JSON.parse(autoWhatsAppEnabled)) {
          await sendAutoWhatsAppInvoice(invoiceOrderData);
        }
      }
      
      navigation.navigate('Invoice', { orderData: invoiceOrderData, autoRedirect: true });
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
      const invoiceOrderData = {
        id: orderId,
        orderNumber: `ORD-${orderId}`,
        customerName: customerName || 'Walk-in Customer',
        phoneNumber,
        items: items,
        subtotal,
        gst,
        total,
        paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'completed'
      };
      
      clearCart();
      navigation.navigate('Invoice', { orderData: invoiceOrderData, autoRedirect: true });
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

    return (
      <View style={styles.cartItem}>
        <View style={styles.itemImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.itemImageStyle} />
          ) : (
            <View style={styles.itemImagePlaceholder}>
              <Text style={styles.itemImagePlaceholderText}>📦</Text>
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
            <Text style={styles.deleteButtonText}>🗑️</Text>
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
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order Details</Text>
      </View>

      <View style={{ flex: 1 }}>
        <ScrollView 
          style={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Customer Details Section */}
          {requireCustomerDetails && (
            <View style={styles.customerSection}>
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
          <View style={styles.cartItemsSection}>
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
          <View style={styles.paymentSection}>
            <Text style={styles.sectionTitle}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {availablePaymentMethods.map((method) => {
                const methodConfig = {
                  'Cash': { icon: '💵', label: 'Cash' },
                  'Card': { icon: '💳', label: 'Card' },
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
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₹{subtotal}</Text>
            </View>
            {gstSettings.hasGST && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>GST ({gstSettings.percentage}%):</Text>
                <Text style={styles.summaryValue}>₹{gst}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.completeButton, (orderLoading) && { opacity: 0.6 }]}
            onPress={handleCompleteOrder}
            disabled={orderLoading}
          >
            <Text style={styles.completeButtonText}>
              {orderLoading 
                ? 'Processing...'
                : paymentMethod === 'QR Pay' 
                  ? (isQRVisible ? 'Waiting for Payment...' : 'Generate QR Code')
                  : paymentMethod === 'Cash' 
                    ? 'Collect Cash Payment' 
                    : paymentMethod === 'Card'
                      ? 'Process Card Payment'
                      : 'Complete Order'
              }
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>



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
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: colors.text.primary,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
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
    fontSize: 20,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginHorizontal: 12,
  },
  itemActions: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minHeight: 50,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
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
    fontSize: 16,
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
    fontSize: 16,
    color: colors.text.secondary,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border.light,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: colors.background.surface,
  },
  requiredInput: {
    borderColor: colors.primary.main,
    borderWidth: 1.5,
  },
  requiredAsterisk: {
    color: colors.error.main,
    fontSize: 16,
    fontWeight: '600',
  },
  errorInput: {
    borderColor: colors.error.main,
    borderWidth: 1.5,
  },
  errorText: {
    color: colors.error.main,
    fontSize: 12,
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
    fontSize: 24,
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  paymentTextActive: {
    color: colors.primary.main,
  },
  completeButton: {
    backgroundColor: colors.success.main,
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

});

export default CartScreen;