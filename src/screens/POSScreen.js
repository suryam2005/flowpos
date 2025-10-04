import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import CustomAlert from '../components/CustomAlert';
import { webScrollFix, webContainerFix, webScrollableContainer } from '../styles/webStyles';
import { useRealtimeProducts, useRealtimeStoreInfo } from '../hooks/useRealtimeData';
import ResponsiveText from '../components/ResponsiveText';
import featureService from '../services/FeatureService';



const POSScreen = ({ navigation }) => {
  const [selectedTag, setSelectedTag] = useState('All Items');
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { items, addItem, removeItem, clearCart, getItemCount, getTotal } = useCart();
  
  // Real-time data hooks
  const { data: products, refresh: refreshProducts } = useRealtimeProducts();
  const { data: storeInfo } = useRealtimeStoreInfo();
  
  // Get store name
  const storeName = storeInfo?.name || 'FlowPOS Store';

  // Initialize feature service
  useEffect(() => {
    featureService.initialize();
  }, []);

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

  const filteredProducts = selectedTag === 'All Items' 
    ? products 
    : products.filter(product => 
        product.tags && product.tags.includes(selectedTag)
      );

  const handleAddToCart = (product) => {
    // Only check stock if tracking is enabled
    if (product.trackStock && product.stock <= 0) {
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
        <View style={styles.productImage}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImageStyle} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={styles.productImagePlaceholderText}>📦</Text>
            </View>
          )}
        </View>
        <ResponsiveText 
          variant="body" 
          style={styles.productName}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {item.name}
        </ResponsiveText>
        <ResponsiveText variant="price" style={styles.productPrice}>
          ₹{item.price}
        </ResponsiveText>
        {item.trackStock && (
          <View style={styles.stockContainer}>
            <ResponsiveText variant="small" style={styles.productStock}>
              {item.stock} available
            </ResponsiveText>
          </View>
        )}
        
        {item.trackStock && item.stock <= 5 && (
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
        {item}
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
        <FlatList
          data={availableTags}
          renderItem={renderTag}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryContainer}
          style={webScrollFix}
        />
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
            refreshControl={
              <RefreshControl
                refreshing={false}
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

      {/* Custom Alert */}
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setShowAlert(false)}
      />
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
    color: '#1f2937',
    flexShrink: 1,
    flexWrap: 'wrap',
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
    color: '#6b7280',
    textAlign: 'center',
    flexWrap: 'wrap',
    flexShrink: 1,
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  productImagePlaceholderText: {
    fontSize: 28,
  },
  productName: {
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
    minHeight: 44, // Ensure consistent height for 2 lines
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  productPrice: {
    color: '#1f2937',
    marginBottom: 4,
    textAlign: 'center',
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
    color: '#9ca3af',
    marginBottom: 2,
  },
  cartTotal: {
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
    color: '#1f2937',
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
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
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
    color: '#ffffff',
    textAlign: 'center',
  },
});

export default POSScreen;