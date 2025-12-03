import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Dimensions,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import CustomAlert, { alertQueueManager } from '../components/CustomAlert';
import { webScrollFix, webContainerFix, webScrollableContainer } from '../styles/webStyles';
import { useRealtimeProducts, useRealtimeStoreInfo } from '../hooks/useRealtimeData';
import ResponsiveText from '../components/ResponsiveText';
import featureService from '../services/FeatureService';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import stockValidator from '../services/StockValidator';



const POSScreen = ({ navigation, route }) => {
  const [selectedTag, setSelectedTag] = useState('All Items');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const { items, addItem, removeItem, clearCart, getItemCount, getTotal, lastError, clearError } = useCart();
  
  // Track if initial load is done
  const initialLoadDone = useRef(false);
  
  // Responsive layout - no fixed calculations, use flex instead
  
  // Real-time data hooks
  const { data: products, refresh: refreshProducts } = useRealtimeProducts();
  const { data: storeInfo } = useRealtimeStoreInfo();
  
  // Get store name
  const storeName = storeInfo?.name || 'FlowPOS Store';

  // Initialize feature service and trigger initial load
  useEffect(() => {
    featureService.initialize();
    
    // Trigger initial products fetch
    console.log('🏪 [POS] Initial mount - fetching products');
    refreshProducts();
    initialLoadDone.current = true;
  }, []);

  // Track previous products state for comparison
  const previousProductsRef = useRef([]);
  
  // Refresh products when screen comes into focus (but skip initial mount)
  useFocusEffect(
    useCallback(() => {
      // Skip the first call (initial mount) to avoid duplicate fetch
      if (initialLoadDone.current && products.length > 0) {
        console.log('🏪 [POS] Screen focused - refreshing products from backend');
        refreshProducts();
      }
    }, [refreshProducts, products.length])
  );

  // Sync stock changes and update cart limits when products change
  useEffect(() => {
    // Skip if this is the initial load or no products yet
    if (!initialLoadDone.current || products.length === 0 || items.length === 0) {
      previousProductsRef.current = products;
      return;
    }

    // Check for stock changes in products that are in the cart
    const stockChanges = [];
    
    items.forEach(cartItem => {
      const currentProduct = products.find(p => p.id === cartItem.id);
      const previousProduct = previousProductsRef.current.find(p => p.id === cartItem.id);
      
      if (currentProduct && previousProduct && currentProduct.trackStock) {
        const currentStock = currentProduct.stock_quantity || currentProduct.stock || 0;
        const previousStock = previousProduct.stock_quantity || previousProduct.stock || 0;
        
        // Check if stock decreased
        if (currentStock < previousStock) {
          const maxAddable = stockValidator.getMaxAddableQuantity(currentProduct, cartItem.quantity);
          
          stockChanges.push({
            productId: cartItem.id,
            productName: cartItem.name,
            previousStock,
            currentStock,
            cartQuantity: cartItem.quantity,
            maxAddable,
            outOfStock: currentStock === 0,
            exceedsStock: cartItem.quantity > currentStock
          });
        }
      }
    });

    // Update previous products reference
    previousProductsRef.current = products;

    // Display notifications for stock changes
    if (stockChanges.length > 0) {
      stockChanges.forEach(change => {
        if (change.outOfStock) {
          // Product went out of stock
          alertQueueManager.enqueue({
            title: 'Stock Update',
            message: `${change.productName} is now out of stock. You have ${change.cartQuantity} in your cart.`,
            type: 'warning',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        } else if (change.exceedsStock) {
          // Cart quantity exceeds new stock level
          alertQueueManager.enqueue({
            title: 'Stock Limit Changed',
            message: `${change.productName} stock decreased to ${change.currentStock}. You have ${change.cartQuantity} in your cart. You cannot add more items.`,
            type: 'warning',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        } else if (change.maxAddable === 0) {
          // Can't add more but current cart quantity is still valid
          alertQueueManager.enqueue({
            title: 'Stock Limit Reached',
            message: `${change.productName} stock decreased to ${change.currentStock}. You have ${change.cartQuantity} in your cart and cannot add more.`,
            type: 'warning',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        } else {
          // Stock decreased but can still add some
          alertQueueManager.enqueue({
            title: 'Stock Updated',
            message: `${change.productName} stock decreased to ${change.currentStock}. You can add ${change.maxAddable} more.`,
            type: 'default',
            buttons: [{ text: 'OK', style: 'default' }],
          });
        }
      });
    }
  }, [products, items]);

  // App tour guide
  const { showTour, completeTour, startTour } = useAppTour('POS');

  // Handle cart errors (e.g., stock limit exceeded)
  useEffect(() => {
    if (lastError) {
      alertQueueManager.enqueue({
        title: lastError.type === 'STOCK_LIMIT_EXCEEDED' ? 'Stock Limit Reached' : 'Notice',
        message: lastError.message,
        type: 'warning',
        buttons: [{ 
          text: 'OK', 
          style: 'default',
          onPress: () => clearError()
        }],
      });
    }
  }, [lastError, clearError]);

  // Handle tour trigger from route params
  useEffect(() => {
    if (route?.params?.startTour) {
      // Small delay to ensure screen is fully loaded
      setTimeout(() => {
        startTour();
      }, 1000);
      
      // Clear the param to prevent re-triggering
      navigation.setParams({ startTour: undefined });
    }
  }, [route?.params?.startTour, startTour, navigation]);

  // Generate available tags from products
  const availableTags = React.useMemo(() => {
    const allTags = new Set(['All Items']);
    products.forEach(product => {
      if (product.tags && Array.isArray(product.tags)) {
        product.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags).slice(0, 8); // Limit to 8 tags for UI
  }, [products]);

  // No animations or loading states needed

  const onRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    refreshProducts();
  };

  const filteredProducts = React.useMemo(() => {
    let filtered = selectedTag === 'All Items' 
      ? products 
      : products.filter(product => 
          product.tags && product.tags.includes(selectedTag)
        );
    
    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.tags && product.tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ))
      );
    }
    
    return filtered;
  }, [products, selectedTag, searchQuery]);

  const handleAddToCart = (product) => {
    // Get current cart quantity for this product
    const cartItem = items.find(item => item.id === product.id);
    const currentCartQuantity = cartItem ? cartItem.quantity : 0;
    
    // Validate using StockValidator
    const validation = stockValidator.validateAgainstCart(product, items, 1);
    
    // If validation fails, show appropriate error message using queue
    if (!validation.isValid) {
      alertQueueManager.enqueue({
        title: 'Stock Limit Reached',
        message: validation.message,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
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
    alertQueueManager.enqueue({
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
  };

  const getProductQuantity = (productId) => {
    const cartItem = items.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const renderProduct = ({ item }) => {
    const quantity = getProductQuantity(item.id);
    
    // Check if increment should be disabled (stock limit reached)
    const incrementDisabled = stockValidator.shouldDisableIncrement(item, quantity);
    
    // Get remaining addable quantity
    const maxAddable = stockValidator.getMaxAddableQuantity(item, quantity);
    
    // Determine if product can be added
    const canAdd = !incrementDisabled && maxAddable > 0;
    
    return (
      <TouchableOpacity
        style={[
          styles.productCard,
          incrementDisabled && styles.productCardDisabled
        ]}
        onPress={() => handleAddToCart(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={incrementDisabled ? 1 : 0.8}
        disabled={incrementDisabled}
      >
        {/* Image Section - 60% of card */}
        <View style={styles.productImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImageStyle} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.productImagePlaceholderText}>📦</Text>
            </View>
          )}
        </View>
        
        {/* Content Section - 40% of card */}
        <View style={styles.productContent}>
          <Text 
            style={styles.productName}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {item.name}
          </Text>
          <Text style={styles.productPrice}>
            ₹{item.price}
          </Text>
          {item.trackStock && (
            <View style={styles.stockContainer}>
              <Text style={styles.productStock}>
                {quantity > 0 ? `${maxAddable} more available` : `${item.stock} available`}
              </Text>
            </View>
          )}
        </View>
        
        {/* Badges */}
        {item.trackStock && item.stock <= 5 && item.stock > 0 && (
          <View style={styles.lowStockBadge}>
            <Text style={styles.lowStockText}>Low Stock</Text>
          </View>
        )}
        
        {/* Out of stock badge */}
        {item.trackStock && incrementDisabled && (
          <View style={styles.outOfStockBadge}>
            <Text style={styles.outOfStockText}>Stock Limit</Text>
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

  const renderTag = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.categoryButton,
        selectedTag === item && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedTag(item)}
    >
      <ResponsiveText 
        variant="caption" 
        style={[
          styles.categoryText,
          selectedTag === item && styles.categoryTextActive
        ]}
        numberOfLines={1}
      >
        {item.toUpperCase()}
      </ResponsiveText>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <ResponsiveText variant="title" style={styles.emptyTitle}>
        No Products Yet
      </ResponsiveText>
      <ResponsiveText variant="body" style={styles.emptyText}>
        Start by adding your first products to begin selling
      </ResponsiveText>
      <TouchableOpacity
        style={styles.addProductButton}
        onPress={() => navigation.navigate('Main', { screen: 'Manage' })}
        activeOpacity={0.8}
      >
        <ResponsiveText variant="button" style={styles.addProductButtonText}>
          Add Products
        </ResponsiveText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, webContainerFix]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <ResponsiveText variant="title" style={styles.title}>
            {storeName}
          </ResponsiveText>
        </View>

      <View style={styles.categorySection}>
        {showSearch ? (
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor={colors.text.tertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            <TouchableOpacity
              style={styles.searchCloseButton}
              onPress={() => {
                setShowSearch(false);
                setSearchQuery('');
              }}
            >
              <Text style={styles.searchCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.categoryRow}>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(true)}
            >
              <Text style={styles.searchButtonText}>🔍</Text>
            </TouchableOpacity>
            <FlatList
              data={availableTags}
              renderItem={renderTag}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryContainer}
              style={[webScrollFix, { flex: 1 }]}
            />
          </View>
        )}
      </View>

      <View style={[{ flex: 1 }, webScrollableContainer]}>
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
            style={[styles.productList, webScrollFix]}
            columnWrapperStyle={styles.productRow}
            refreshControl={
              <RefreshControl
                refreshing={false}
                onRefresh={onRefresh}
                tintColor={colors.primary.main}
                colors={[colors.primary.main]}
                progressBackgroundColor={colors.background.surface}
                title="Pull to refresh products..."
                titleColor={colors.text.secondary}
              />
            }
          />
        )}
      </View>

      {getItemCount() > 0 && (
        <View style={styles.cartSummary}>
          <TouchableOpacity
            style={styles.cartSummaryContent}
            onPress={() => navigation.navigate('Cart')}
            activeOpacity={0.9}
          >
            <View style={styles.cartInfo}>
              <ResponsiveText variant="caption" style={styles.cartItems}>
                {getItemCount()} items
              </ResponsiveText>
              <ResponsiveText variant="price" style={styles.cartTotal}>
                ₹{getTotal()}
              </ResponsiveText>
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
                <ResponsiveText variant="button" style={styles.cartButtonText}>
                  Complete Order
                </ResponsiveText>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Custom Alert - managed by AlertQueueManager */}
      <CustomAlert />

      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="POS"
        onComplete={completeTour}
      />
      </View>
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
    color: colors.text.primary,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 22,
    color: colors.text.secondary,
  },
  categorySection: {
    height: 68, // Fixed height
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingVertical: 16,
    height: 68,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray['100'],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchButtonText: {
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    flex: 1,
    height: 36,
    backgroundColor: colors.gray['100'],
    borderRadius: 18,
    paddingHorizontal: 16,
    fontSize: 14,
    color: colors.text.primary,
  },
  searchCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray['100'],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  searchCloseText: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  categoryContainer: {
    paddingRight: 20,
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
    backgroundColor: colors.gray['100'],
    minWidth: 80,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary.main,
  },
  categoryText: {
    color: colors.text.secondary,
    textAlign: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  categoryTextActive: {
    color: colors.background.surface,
  },
  productGrid: {
    padding: 16,
    paddingBottom: 180, // Extra padding for cart summary + nav bar + spacing
  },
  productRow: {
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  productCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginVertical: 4,
    alignItems: 'center',
    shadowColor: colors.shadow.md,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: colors.border.light,
    position: 'relative',
    minHeight: 200,
    justifyContent: 'flex-start',
    // Responsive 2-column layout
    flex: 1,
    maxWidth: '48%', // Ensures 2 columns with some gap
  },
  productImage: {
    width: '100%',
    height: 100, // Fixed height for consistency
    borderRadius: 8,
    marginBottom: 12,
    overflow: 'hidden',
    backgroundColor: colors.background.surface,
    shadowColor: colors.shadow.sm,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.5,
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover', // Crop image to fit space properly
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  productImagePlaceholderText: {
    fontSize: 48, // Larger icon for bigger image area
  },
  productContent: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 8,
  },
  productName: {
    fontSize: 14,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    flexShrink: 1,
    lineHeight: 18,
    fontWeight: '600',
    width: '100%',
  },
  productPrice: {
    fontSize: 16,
    color: colors.primary.main,
    marginBottom: 4,
    textAlign: 'center',
    fontWeight: '700',
  },
  stockContainer: {
    backgroundColor: colors.gray['100'],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  productStock: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
    textAlign: 'center',
  },
  lowStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.warning.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  lowStockText: {
    fontSize: 10,
    color: '#d97706',
    fontWeight: '500',
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: colors.error.background,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  outOfStockText: {
    fontSize: 10,
    color: colors.error.main,
    fontWeight: '600',
  },
  productCardDisabled: {
    opacity: 0.6,
  },
  quantityBadge: {
    position: 'absolute',
    top: 16, // More space from top
    right: 16, // More space from right edge
    backgroundColor: colors.error.main,
    width: 22,
    height: 22,
    borderRadius: 11,
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
    color: colors.background.surface,
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
    backgroundColor: colors.gray['800'],
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
    color: colors.gray['400'],
    marginBottom: 2,
  },
  cartTotal: {
    color: colors.background.surface,
  },
  cartActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearCartButton: {
    backgroundColor: colors.error.background,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  clearCartText: {
    fontSize: 16,
  },
  cartButton: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  cartButtonText: {
    color: colors.text.primary,
    textAlign: 'center',
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
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  addProductButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: colors.primary.main,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addProductButtonText: {
    color: colors.background.surface,
    textAlign: 'center',
  },
});

export default POSScreen;