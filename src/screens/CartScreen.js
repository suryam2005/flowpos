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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeGoBack, safeNavigate } from '../utils/navigationUtils';

import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';

import CustomAlert from '../components/CustomAlert';
import DynamicQRGenerator from '../components/DynamicQRGenerator';
import { useQRPayment } from '../hooks/useQRPayment';
import featureService from '../services/FeatureService';

const CartScreen = ({ navigation }) => {
  const { items, updateQuantity, removeItem, clearCart, getTotal } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [customerNameError, setCustomerNameError] = useState('');
  const [availablePaymentMethods, setAvailablePaymentMethods] = useState(['Cash', 'Card', 'QR Pay']);
  const [phoneNumberError, setPhoneNumberError] = useState('');

  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  
  // QR Payment hook
  const { isQRVisible, paymentData, generatePaymentQR, closeQR, handlePaymentComplete } = useQRPayment();
  
  // No animations needed

  useEffect(() => {
    loadAvailablePaymentMethods();
  }, []);

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
  const gst = Math.round(subtotal * 0.18);
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
      return;
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
      return;
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
    }
  };

  const handleQRPaymentComplete = async () => {
    // Save payment record
    const paymentRecord = await handlePaymentComplete();
    
    if (paymentRecord) {
      // Complete the order with QR payment details
      setPaymentMethod('QR Pay');
      
      // Complete order and navigate to home
      await handleCompleteOrder({
        transactionId: paymentRecord.id,
        timestamp: paymentRecord.timestamp,
        method: 'QR Pay',
      });
      
      // Navigate to home (POS screen) after successful payment
      navigation.navigate('Main', { screen: 'POS' });
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

    // Haptic feedback only
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const orderId = await generateOrderNumber();
      const orderData = {
        id: orderId,
        items: items,
        subtotal,
        gst,
        total,
        customerName: customerName || 'Walk-in Customer',
        phoneNumber,
        paymentMethod,
        timestamp: new Date().toISOString(),
        status: 'completed',
        ...(paymentDetails && {
          paymentDetails: {
            transactionId: paymentDetails.transactionId,
            paymentTimestamp: paymentDetails.timestamp,
            paymentMethod: paymentDetails.method,
          }
        }),
      };

      // Save order
      const existingOrders = await AsyncStorage.getItem('orders');
      const orders = existingOrders ? JSON.parse(existingOrders) : [];
      orders.unshift(orderData);
      await AsyncStorage.setItem('orders', JSON.stringify(orders));

      // Update revenue
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

      // Update product stock
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

      // Navigate to invoice screen with order data
      const invoiceOrderData = {
        ...orderData,
        orderNumber: `ORD-${orderId}`
      };
      
      console.log('Navigating to Invoice with data:', invoiceOrderData);
      navigation.navigate('Invoice', { orderData: invoiceOrderData });
    } catch (error) {
      console.error('Error completing order:', error);
      setAlertConfig({
        title: 'Error',
        message: 'Failed to complete order. Please try again.',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
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
        <View style={styles.itemEmoji}>
          <Text style={styles.emojiText}>{item.emoji}</Text>
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

  const renderPaymentMethod = (method, icon) => (
    <TouchableOpacity
      style={[
        styles.paymentMethod,
        paymentMethod === method && styles.paymentMethodActive
      ]}
      onPress={() => {
        setPaymentMethod(method);
        if (method === 'QR Pay') {
          handleQRPayment();
        }
      }}
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
          <View style={styles.cartItemsSection}>
            <FlatList
              data={items}
              renderItem={renderCartItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>₹{subtotal}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (18%):</Text>
              <Text style={styles.summaryValue}>₹{gst}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>₹{total}</Text>
            </View>
          </View>

          <View style={styles.customerSection}>
            <Text style={styles.sectionTitle}>Customer Details</Text>

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

            <Text style={styles.inputLabel}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {availablePaymentMethods.map((method) => {
                const methodConfig = {
                  'Cash': { icon: '💵', label: 'Cash' },
                  'Card': { icon: '💳', label: 'Card' },
                  'QR Pay': { icon: '📲', label: 'QR Pay' },
                };
                const config = methodConfig[method];
                return config ? (
                  <View key={method}>
                    {renderPaymentMethod(method, config.icon)}
                  </View>
                ) : null;
              })}
            </View>
          </View>

          <TouchableOpacity
            style={styles.completeButton}
            onPress={handleCompleteOrder}
          >
            <Text style={styles.completeButtonText}>Complete Order</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    paddingTop: 60, // Proper space for status bar like YouTube app
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 20,
    color: '#1f2937',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },

  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cartItemsSection: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minHeight: 80,
  },
  itemEmoji: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  emojiText: {
    fontSize: 20,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
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
    color: '#1f2937',
    marginBottom: 8,
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    fontSize: 16,
  },
  summarySection: {
    backgroundColor: '#ffffff',
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
    color: '#6b7280',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2563eb',
  },
  customerSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  requiredInput: {
    borderColor: '#2563eb',
    borderWidth: 1.5,
  },
  requiredAsterisk: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  errorInput: {
    borderColor: '#ef4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  paymentMethods: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    marginHorizontal: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  paymentMethodActive: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  paymentIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  paymentText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  paymentTextActive: {
    color: '#2563eb',
  },
  completeButton: {
    backgroundColor: '#10b981',
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
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

});

export default CartScreen;