import React, { useState, useEffect, useRef } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import { PageLoader } from '../components/LoadingSpinner';
import { usePageLoading } from '../hooks/usePageLoading';

import CustomAlert from '../components/CustomAlert';
import TabletLayout from '../components/TabletLayout';
import TabletCartSidebar from '../components/TabletCartSidebar';
import { getDeviceInfo, getGridColumns, getTabletLayoutConfig } from '../utils/deviceUtils';
import { webScrollFix, webContainerFix, webScrollableContainer } from '../styles/webStyles';

const TabletPOSScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [selectedTag, setSelectedTag] = useState('All Items');
  const [refreshing, setRefreshing] = useState(false);
  const [storeName, setStoreName] = useState('FlowPOS Store');
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const { items, addItem, removeItem, clearCart, getItemCount, getTotal } = useCart();
  
  const { isTablet } = getDeviceInfo();
  const layoutConfig = getTabletLayoutConfig();
  const gridColumns = getGridColumns();
  
  // Page loading hook - no animations
  const { isLoading, finishLoading, contentStyle } = usePageLoading();

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

  useEffect(() => {
    loadProducts();
    loadStoreName();
  }, []);

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
      if (isRefresh) {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      
      const storedProducts = await AsyncStorage.getItem('products');
      if (storedProducts) {
        const parsedProducts = JSON.parse(storedProducts);
        setProducts(parsedProducts);
      } else {
        setProducts([]);
      }
      
      if (!isRefresh) {
        finishLoading();
      }
      
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

  const handleCheckout = () => {
    navigation.navigate('Cart');
  };

  const getProductQuantity = (productId) => {
    const cartItem = items.find(item => item.id === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const renderProduct = ({ item }) => {
    const quantity = getProductQuantity(item.id);
    
    return (
      <TouchableOpacity
        style={[styles.productCard, isTablet && styles.tabletProductCard]}
        onPress={() => handleAddToCart(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        <View style={[styles.productImage, isTablet && styles.tabletProductImage]}>
          {item.image ? (
            <Image source={{ uri: item.image }} style={styles.productImageStyle} />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Text style={[styles.productImagePlaceholderText, isTablet && styles.tabletImagePlaceholderText]}>📦</Text>
            </View>
          )}
        </View>
        <Text style={[styles.productName, isTablet && styles.tabletProductName]}>{item.name}</Text>
        <Text style={[styles.productPrice, isTablet && styles.tabletProductPrice]}>₹{item.price}</Text>
        {item.trackStock && (
          <View style={styles.stockContainer}>
            <Text style={styles.productStock}>{item.stock} available</Text>
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
        isTablet && styles.tabletCategoryButton,
        selectedTag === item && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedTag(item)}
    >
      <Text style={[
        styles.categoryText,
        isTablet && styles.tabletCategoryText,
        selectedTag === item && styles.categoryTextActive
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={[styles.emptyTitle, isTablet && styles.tabletEmptyTitle]}>No Products Yet</Text>
      <Text style={[styles.emptyText, isTablet && styles.tabletEmptyText]}>
        Start by adding your first products to begin selling
      </Text>
      <TouchableOpacity
        style={[styles.addProductButton, isTablet && styles.tabletAddProductButton]}
        onPress={() => navigation.navigate('Main', { screen: 'Manage' })}
        activeOpacity={0.8}
      >
        <Text style={[styles.addProductButtonText, isTablet && styles.tabletAddProductButtonText]}>Add Products</Text>
      </TouchableOpacity>
    </View>
  );

  const renderMainContent = () => (
    <SafeAreaView style={[styles.container, webContainerFix]}>
      <PageLoader visible={isLoading} text="Loading products..." />
      
      <View style={[styles.content, contentStyle]}>
        <View style={[styles.header, isTablet && styles.tabletHeader]}>
          <Text style={[styles.title, isTablet && styles.tabletTitle]}>{storeName}</Text>
        </View>

        <View style={[styles.categorySection, isTablet && styles.tabletCategorySection]}>
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

        <View style={[{ flex: 1, opacity: 1 }, webScrollableContainer]}>
          {products.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={filteredProducts}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              numColumns={gridColumns}
              key={gridColumns} // Force re-render when columns change
              contentContainerStyle={[
                styles.productGrid,
                isTablet && styles.tabletProductGrid,
                !layoutConfig.showSidebar && styles.productGridWithBottomCart
              ]}
              showsVerticalScrollIndicator={false}
              style={[styles.productList, webScrollFix]}
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
        </View>

        {/* Show bottom cart only if not using sidebar layout */}
        {!layoutConfig.showSidebar && getItemCount() > 0 && (
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
              <View style={styles.cartButton}>
                <Text style={styles.cartButtonText}>Complete Order</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

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

  // Use tablet layout with sidebar if appropriate
  if (layoutConfig.showSidebar) {
    return (
      <TabletLayout
        sidebar={<TabletCartSidebar navigation={navigation} onCheckout={handleCheckout} />}
        showSidebar={true}
      >
        {renderMainContent()}
      </TabletLayout>
    );
  }

  return renderMainContent();
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  tabletTitle: {
    fontSize: 32,
  },
  categorySection: {
    height: 68,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tabletCategorySection: {
    height: 80,
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
  tabletCategoryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginRight: 12,
    borderRadius: 20,
    minWidth: 120,
  },
  categoryButtonActive: {
    backgroundColor: '#1f2937',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabletCategoryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#ffffff',
  },
  productGrid: {
    padding: 20,
    paddingBottom: 40,
  },
  tabletProductGrid: {
    padding: 32,
    paddingBottom: 60,
  },
  productGridWithBottomCart: {
    paddingBottom: 180,
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
  tabletProductCard: {
    borderRadius: 20,
    padding: 24,
    margin: 8,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 6,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  tabletProductImage: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginBottom: 16,
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
  tabletImagePlaceholderText: {
    fontSize: 36,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 4,
  },
  tabletProductName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  tabletProductPrice: {
    fontSize: 22,
    marginBottom: 8,
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
    bottom: 10,
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
  tabletEmptyTitle: {
    fontSize: 32,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  tabletEmptyText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 40,
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
  tabletAddProductButton: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 16,
  },
  addProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  tabletAddProductButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
});

export default TabletPOSScreen;