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

const OrdersScreen = ({ navigation }) => {
  const [orders, setOrders] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Page loading state
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 800);

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
                  tintColor="#8b5cf6"
                  colors={['#8b5cf6']}
                  progressBackgroundColor="#ffffff"
                  title="Pull to refresh orders..."
                  titleColor="#6b7280"
                />
              }
            />
          )}
        </View>
      </View>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  ordersList: {
    padding: 20,
    paddingBottom: 140, // Reduced spacing
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
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
    color: '#1f2937',
    marginBottom: 2,
  },
  orderDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  statusBadge: {
    backgroundColor: '#d1fae5',
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
    color: '#374151',
    marginBottom: 2,
  },
  moreItems: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  orderInfo: {
    flex: 1,
  },
  paymentMethod: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  invoiceActions: {
    flexDirection: 'row',
    gap: 8,
  },
  invoiceButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  invoiceButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  sendButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  sendButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
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
    color: '#1f2937',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default OrdersScreen;