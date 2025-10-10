import React, { useState, useEffect, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { fadeIn } from '../utils/animations';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Page loading state
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 800);
  
  // App tour guide
  const { showTour, completeTour } = useAppTour('Orders');

  useEffect(() => {
    loadOrders();
    const unsubscribe = navigation.addListener('focus', loadOrders);

    return unsubscribe;
  }, [navigation]);

  const loadOrders = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // Add slight delay for smooth refresh animation
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      const storedOrders = await AsyncStorage.getItem('orders');
      if (storedOrders) {
        setOrders(JSON.parse(storedOrders));
      }

      // Finish loading animation on initial load
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading orders:', error);
      if (!isRefresh) {
        finishLoading();
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadOrders(true);
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
    
    // Convert order data to invoice format
    const invoiceOrderData = {
      ...order,
      orderNumber: `ORD-${order.id}`,
      items: order.items || [],
      subtotal: order.subtotal || 0,
      gst: order.gst || order.tax || 0,
      total: order.total || 0,
      customerName: order.customerName || 'Walk-in Customer',
      phoneNumber: order.phoneNumber || '',
    };
    
    navigation.navigate('Invoice', { orderData: invoiceOrderData });
  };

  const handleSendInvoice = (order) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // For now, show coming soon message
    Alert.alert(
      'Send Invoice',
      'WhatsApp integration coming soon! You can view the invoice and share it manually.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'View Invoice', 
          onPress: () => handleViewInvoice(order)
        }
      ]
    );
  };

  const renderOrder = ({ item, index }) => {
    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigation.navigate('OrderDetails', { order: item });
    };

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order ID: {item.id}</Text>
            <Text style={styles.orderDate}>
              {formatDate(item.timestamp)} at {formatTime(item.timestamp)}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>completed</Text>
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
              <Text style={styles.invoiceButtonText}>📄 Invoice</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sendButton}
              onPress={(e) => {
                e.stopPropagation();
                handleSendInvoice(item);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.sendButtonText}>📱 Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>No Orders Yet</Text>
      <Text style={styles.emptyText}>
        Orders will appear here once you complete your first sale.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading orders..." />

      <View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
        </View>

        <View style={{ flex: 1, opacity: 1 }}>
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

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="Orders"
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
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
  statusBadge: {
    backgroundColor: colors.success.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#065f46',
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
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  invoiceButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.primary,
  },
  sendButton: {
    backgroundColor: colors.success.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background.surface,
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