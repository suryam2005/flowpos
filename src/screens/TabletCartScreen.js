import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { getDeviceInfo } from '../utils/deviceUtils';
import DynamicQRGenerator from '../components/DynamicQRGenerator';
import { useQRPayment } from '../hooks/useQRPayment';

const TabletCartScreen = ({ navigation }) => {
  const { items, addItem, removeItem, clearCart, getTotal, getItemCount } = useCart();
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');
  const { isTablet } = getDeviceInfo();
  
  // QR Payment hook
  const { isQRVisible, paymentData, generatePaymentQR, closeQR, handlePaymentComplete } = useQRPayment();

  const handleIncrement = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    addItem(item);
  };

  const handleDecrement = (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    removeItem(item.id);
  };

  const handleCheckout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    const orderData = {
      items,
      total: getTotal(),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    };
    
    navigation.navigate('Invoice', { orderData });
  };

  const handleQRPayment = async () => {
    const success = await generatePaymentQR({
      amount: getTotal(),
      customerName: customerName.trim() || 'Walk-in Customer',
      orderNote: notes.trim() || `Payment for ${customerName.trim() || 'Walk-in Customer'}`,
      orderId: Date.now().toString(),
    });

    if (!success) {
      Alert.alert(
        'QR Generation Failed',
        'Please check your UPI ID in Store Settings and try again.'
      );
    }
  };

  const handleQRPaymentComplete = async () => {
    const paymentRecord = await handlePaymentComplete();
    
    if (paymentRecord) {
      // Create order data
      const orderData = {
        items,
        total: getTotal(),
        customerName: customerName.trim() || 'Walk-in Customer',
        customerPhone: customerPhone.trim(),
        notes: notes.trim(),
        timestamp: new Date().toISOString(),
        paymentMethod: 'QR Pay',
        paymentDetails: paymentRecord,
      };
      
      // Navigate to invoice first, then auto-redirect to home
      navigation.navigate('Invoice', { 
        orderData,
        autoRedirectToHome: true // Flag to auto-redirect after showing invoice
      });
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={[styles.cartItem, isTablet && styles.tabletCartItem]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemEmoji, isTablet && styles.tabletItemEmoji]}>{item.emoji}</Text>
        <View style={styles.itemDetails}>
          <Text style={[styles.itemName, isTablet && styles.tabletItemName]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={[styles.itemPrice, isTablet && styles.tabletItemPrice]}>
            ₹{item.price} each
          </Text>
        </View>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={[styles.quantityButton, isTablet && styles.tabletQuantityButton]}
          onPress={() => handleDecrement(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.quantityButtonText, isTablet && styles.tabletQuantityButtonText]}>−</Text>
        </TouchableOpacity>
        
        <Text style={[styles.quantity, isTablet && styles.tabletQuantity]}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={[styles.quantityButton, isTablet && styles.tabletQuantityButton]}
          onPress={() => handleIncrement(item)}
          activeOpacity={0.7}
        >
          <Text style={[styles.quantityButtonText, isTablet && styles.tabletQuantityButtonText]}>+</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={[styles.itemTotal, isTablet && styles.tabletItemTotal]}>
        ₹{(item.price * item.quantity).toFixed(2)}
      </Text>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, isTablet && styles.tabletHeader]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={[styles.title, isTablet && styles.tabletTitle]}>Cart</Text>
          <View style={styles.placeholder} />
        </View>
        
        <View style={styles.emptyCart}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={[styles.emptyText, isTablet && styles.tabletEmptyText]}>Your cart is empty</Text>
          <Text style={[styles.emptySubtext, isTablet && styles.tabletEmptySubtext]}>
            Add some items to get started
          </Text>
          <TouchableOpacity
            style={[styles.continueShoppingButton, isTablet && styles.tabletContinueShoppingButton]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Text style={[styles.continueShoppingText, isTablet && styles.tabletContinueShoppingText]}>
              Continue Shopping
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, isTablet && styles.tabletHeader]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={isTablet ? 28 : 24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={[styles.title, isTablet && styles.tabletTitle]}>
            Cart ({getItemCount()})
          </Text>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearCart}
            activeOpacity={0.7}
          >
            <Text style={[styles.clearButtonText, isTablet && styles.tabletClearButtonText]}>Clear</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <FlatList
            data={items}
            renderItem={renderCartItem}
            keyExtractor={(item) => item.id}
            style={styles.cartList}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.cartListContent, isTablet && styles.tabletCartListContent]}
          />
          
          <View style={[styles.customerSection, isTablet && styles.tabletCustomerSection]}>
            <Text style={[styles.sectionTitle, isTablet && styles.tabletSectionTitle]}>
              Customer Information (Optional)
            </Text>
            
            <View style={styles.inputRow}>
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isTablet && styles.tabletInputLabel]}>Name</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Customer name"
                  placeholderTextColor="#9ca3af"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, isTablet && styles.tabletInputLabel]}>Phone</Text>
                <TextInput
                  style={[styles.input, isTablet && styles.tabletInput]}
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  placeholder="Phone number"
                  placeholderTextColor="#9ca3af"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
            
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, isTablet && styles.tabletInputLabel]}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput, isTablet && styles.tabletInput, isTablet && styles.tabletNotesInput]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Order notes or special instructions"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>
        
        <View style={[styles.footer, isTablet && styles.tabletFooter]}>
          <View style={styles.totalSection}>
            <Text style={[styles.totalLabel, isTablet && styles.tabletTotalLabel]}>Total</Text>
            <Text style={[styles.totalAmount, isTablet && styles.tabletTotalAmount]}>₹{getTotal()}</Text>
          </View>
          
          <View style={styles.checkoutButtons}>
            <TouchableOpacity
              style={[styles.qrPayButton, isTablet && styles.tabletQrPayButton]}
              onPress={handleQRPayment}
              activeOpacity={0.9}
            >
              <Text style={[styles.qrPayButtonText, isTablet && styles.tabletQrPayButtonText]}>
                📲 QR Pay
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.checkoutButton, isTablet && styles.tabletCheckoutButton]}
              onPress={handleCheckout}
              activeOpacity={0.9}
            >
              <Text style={[styles.checkoutButtonText, isTablet && styles.tabletCheckoutButtonText]}>
                Complete Order
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <DynamicQRGenerator
        amount={paymentData.amount}
        visible={isQRVisible}
        onClose={closeQR}
        customerName={paymentData.customerName}
        orderNote={paymentData.orderNote}
        onPaymentComplete={handleQRPaymentComplete}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  },
  tabletHeader: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    paddingTop: 80,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  tabletTitle: {
    fontSize: 28,
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  tabletClearButtonText: {
    fontSize: 16,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  cartList: {
    flex: 1,
  },
  cartListContent: {
    paddingVertical: 8,
  },
  tabletCartListContent: {
    paddingVertical: 16,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabletCartItem: {
    paddingHorizontal: 32,
    paddingVertical: 24,
    marginHorizontal: 32,
    marginVertical: 8,
    borderRadius: 16,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 32,
    marginRight: 16,
  },
  tabletItemEmoji: {
    fontSize: 40,
    marginRight: 24,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  tabletItemName: {
    fontSize: 20,
    marginBottom: 6,
  },
  itemPrice: {
    fontSize: 14,
    color: '#6b7280',
  },
  tabletItemPrice: {
    fontSize: 16,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabletQuantityButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  quantityButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  tabletQuantityButtonText: {
    fontSize: 22,
  },
  quantity: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 16,
    minWidth: 24,
    textAlign: 'center',
  },
  tabletQuantity: {
    fontSize: 22,
    marginHorizontal: 20,
    minWidth: 30,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    minWidth: 80,
    textAlign: 'right',
  },
  tabletItemTotal: {
    fontSize: 20,
    minWidth: 100,
  },
  customerSection: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginVertical: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabletCustomerSection: {
    marginHorizontal: 32,
    marginVertical: 24,
    padding: 32,
    borderRadius: 16,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  tabletSectionTitle: {
    fontSize: 20,
    marginBottom: 24,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 16,
  },
  inputContainer: {
    flex: 1,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  tabletInputLabel: {
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#ffffff',
  },
  tabletInput: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
  },
  notesInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  tabletNotesInput: {
    height: 100,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  tabletFooter: {
    paddingHorizontal: 32,
    paddingVertical: 32,
    paddingBottom: 50,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  tabletTotalLabel: {
    fontSize: 24,
  },
  totalAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1f2937',
  },
  tabletTotalAmount: {
    fontSize: 36,
  },
  checkoutButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  tabletCheckoutButton: {
    paddingVertical: 20,
    borderRadius: 16,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  checkoutButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabletCheckoutButtonText: {
    fontSize: 22,
  },
  checkoutButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  qrPayButton: {
    flex: 1,
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  tabletQrPayButton: {
    paddingVertical: 20,
    borderRadius: 16,
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  qrPayButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  tabletQrPayButtonText: {
    fontSize: 22,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  tabletEmptyText: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  tabletEmptySubtext: {
    fontSize: 18,
    marginBottom: 40,
  },
  continueShoppingButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  tabletContinueShoppingButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
  },
  continueShoppingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tabletContinueShoppingText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default TabletCartScreen;