import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';
// Removed dummy data dependency
import { fadeIn } from '../utils/animations';
import CustomAlert from '../components/CustomAlert';



const POSScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All Items');
  const [refreshing, setRefreshing] = useState(false);
  const [storeName, setStoreName] = useState('FlowPOS Store');
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { items, addItem, removeItem, clearCart, getItemCount, getTotal } = useCart();
  
  // Page loading state
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1000);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = ['All Items', 'Food', 'Beverages', 'Desserts'];

  useEffect(() => {
    loadProducts();
    loadStoreName();
    // Fade in animation on mount
    fadeIn(fadeAnim, 500).start();
    
    // Add focus listener to refresh products when returning to this screen
    const unsubscribe = navigation.addListener('focus', () => {
      loadProducts();
      loadStoreName();
    });
    
    return unsubscribe;
  }, [navigation]);

  const loadStoreName = async () => {
    try {
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      if (storeInfo) {
        const parsedStoreInfo = JSON.parse(storeInfo);
        if (parsedStoreInfo.name && parsedStoreInfo.name.trim()) {
          setStoreName(parsedStoreInfo.name);
        }
      }
    } catch (error) {
      console.error('Error loading store name:', error);
    }
  };

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    
    try {
      // Add slight delay for smooth refresh animation
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        const parsedProducts = JSON.parse(storedProducts);
        setProducts(parsedProducts);
      } else {
        // Start with empty products - no dummy data
        setProducts([]);
      }
      
      // Finish loading animation on initial load
      if (!isRefresh) {
        finishLoading();
      }
      
      // Sync cart with updated product data
      const cartData = await AsyncStorage.getItem('cart');
      if (cartData) {
        // Cart context will handle the sync automatically
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts([]);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadProducts(true);
  };

  const filteredProducts = selectedCategory === 'All Items' 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  const handleAddToCart = (product) => {
    if (product.stock <= 0) {
      setAlertConfig({
        title: 'Out of Stock',
        message: `${product.name} is currently out of stock.`,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return;
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    addItem(product);
  };

  const handleLongPress = (product) => {
    const cartItem = items.find(item => item.id === product.id);
    if (cartItem) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      removeItem(product.id);
    }
  };

  const handleClearCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setAlertConfig({
      title: 'Clear Cart',
      message: 'Are you sure you want to remove all items from the cart?',
      type: 'warning',
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: () => clearCart()
        }
      ],
    });
    setShowAlert(true);
  };

  const getProductQuantity = (productId) => {
    const cartItem = items.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const renderProduct = ({ item }) => {
    const quantity = getProductQuantity(item.id);
    
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleAddToCart(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <View style={styles.productEmoji}>
          <Text style={styles.emojiText}>{item.emoji}</Text>
        </View>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productPrice}>₹{item.price}</Text>
        <View style={styles.stockContainer}>
          <Text style={styles.productStock}>{item.stock} available</Text>
        </View>
        
        {item.stock <= 5 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
        
        {quantity > 0 && (
          <View style={styles.quantityBadge}>
            <Text style={styles.quantityText}>{quantity}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedCategory === item && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCategory(item)}
    >
      <Text style={[
        styles.categoryText,
        selectedCategory === item && styles.categoryTextActive
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyText}>
        Start by adding your first products to begin selling
      </Text>
      <TouchableOpacity
        style={styles.addProductButton}
        onPress={() => navigation.navigate('Main', { screen: 'Manage' })}
        activeOpacity={0.8}
      >
        <Text style={styles.addProductButtonText}>Add Products</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading products..." />
      
      <Animated.View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>{storeName}</Text>
        </View>

      <View style={styles.categorySection}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
        />
      </View>

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {products.length === 0 ? (
          renderEmptyState()
        ) : (
          <FlatList
            data={filteredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item.id}
            numColumns={2}
            contentContainerStyle={styles.productGrid}
            showsVerticalScrollIndicator={false}
            style={styles.productList}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#8b5cf6"
                colors={['#8b5cf6']}
                progressBackgroundColor="#ffffff"
                title="Pull to refresh products..."
                titleColor="#6b7280"
              />
            }
          />
        )}
      </Animated.View>

      {getItemCount() > 0 && (
        <View style={styles.cartSummary}>
          <TouchableOpacity
            style={styles.cartSummaryContent}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.9}
          >
            <View style={styles.cartInfo}>
              <Text style={styles.cartItems}>{getItemCount()} items</Text>
              <Text style={styles.cartTotal}>₹{getTotal()}</Text>
            </View>
            <View style={styles.cartActions}>
              <TouchableOpacity
                style={styles.clearCartButton}
                onPress={handleClearCart}
                activeOpacity={0.7}
              >
                <Text style={styles.clearCartText}>🗑️</Text>
              </TouchableOpacity>
              <View style={styles.cartButton}>
                <Text style={styles.cartButtonText}>Complete Order</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setShowAlert(false)}
      />
      </Animated.View>
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
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
    color: '#6b7280',
  },
  categorySection: {
    height: 68, // Fixed height
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  productList: {
    flex: 1,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    minWidth: 80,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: '#1f2937',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  productGrid: {
    padding: 20,
    paddingBottom: 180, // Extra padding for cart summary + nav bar + spacing
  },
  productCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    margin: 6,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    position: 'relative',
  },
  productEmoji: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emojiText: {
    fontSize: 32,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  stockContainer: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  productStock: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    textAlign: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '500',
  },
  quantityBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#ef4444',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  quantityText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '700',
  },
  cartSummary: {
    position: 'absolute',
    bottom: 10, // Stick directly to nav bar
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  cartSummaryContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  cartInfo: {
    flex: 1,
  },
  cartItems: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 2,
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearCartButton: {
    backgroundColor: '#fee2e2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearCartText: {
    fontSize: 16,
  },
  cartButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cartButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  addProductButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default POSScreen;