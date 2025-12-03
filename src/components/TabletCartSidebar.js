import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { webScrollFix } from '../styles/webStyles';
import { useQRPayment } from '../hooks/useQRPayment';
import DynamicQRGenerator from './DynamicQRGenerator';

const TabletCartSidebar = ({ navigation, onCheckout }) => {
  const { items, addItem, removeItem, clearCart, getTotal, getItemCount } = useCart();
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
    if (onCheckout) {
      onCheckout();
    } else {
      navigation.navigate('Cart');
    }
  };

  const handleQRPayment = async () => {
    const success = await generatePaymentQR({
      amount: getTotal(),
      customerName: 'Walk-in Customer',
      orderNote: 'Quick Payment',
      orderId: Date.now().toString(),
    });

    if (!success) {
      // Handle error - could show a toast or alert
      console.log('QR generation failed');
    }
  };

  const handleQRPaymentComplete = async () => {
    const paymentRecord = await handlePaymentComplete();
    
    if (paymentRecord && onCheckout) {
      // Pass payment details to parent with auto-redirect flag
      onCheckout({
        paymentMethod: 'QR Pay',
        paymentDetails: paymentRecord,
        autoRedirectToHome: true,
      });
    }
  };

  const renderCartItem = ({ item }) => (
    <View style={styles.cartItem}>
      <View style={styles.itemInfo}>
        <Text style={styles.itemEmoji}>{item.emoji}</Text>
        <View style={styles.itemDetails}>
          <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
          <Text style={styles.itemPrice}>₹{item.price}</Text>
        </View>
      </View>
      
      <View style={styles.quantityControls}>
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleDecrement(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.quantityButtonText}>−</Text>
        </TouchableOpacity>
        
        <Text style={styles.quantity}>{item.quantity}</Text>
        
        <TouchableOpacity
          style={styles.quantityButton}
          onPress={() => handleIncrement(item)}
          activeOpacity={0.7}
        >
          <Text style={styles.quantityButtonText}>+</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.itemTotal}>₹{(item.price * item.quantity).toFixed(2)}</Text>
    </View>
  );

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.emptyCart}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items to get started</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Cart ({getItemCount()})</Text>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={clearCart}
          activeOpacity={0.7}
        >
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={items}
        renderItem={renderCartItem}
        keyExtractor={(item) => item.id}
        style={[styles.cartList, webScrollFix]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.cartListContent}
      />
      
      <View style={styles.footer}>
        <View style={styles.totalSection}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalAmount}>₹{getTotal()}</Text>
        </View>
        
        <View style={styles.checkoutButtons}>
          <TouchableOpacity
            style={styles.qrPayButton}
            onPress={handleQRPayment}
            activeOpacity={0.9}
          >
            <Text style={styles.qrPayButtonText}>📲</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleCheckout}
            activeOpacity={0.9}
          >
            <Text style={styles.checkoutButtonText}>Complete Order</Text>
          </TouchableOpacity>
        </View>
      </View>
      
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
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
  cartList: {
    flex: 1,
  },
  cartListContent: {
    paddingVertical: 8,
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  itemDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  itemPrice: {
    fontSize: 12,
    color: '#6b7280',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  quantity: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginHorizontal: 12,
    minWidth: 20,
    textAlign: 'center',
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
    minWidth: 60,
    textAlign: 'right',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
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
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  checkoutButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  qrPayButton: {
    backgroundColor: colors.primary.main,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  qrPayButtonText: {
    fontSize: 20,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

export default TabletCartSidebar;