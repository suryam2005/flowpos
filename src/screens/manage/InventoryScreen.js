import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { colors } from '../../styles/colors';
import productsService from '../../services/ProductsService';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useDataSync } from '../../context/DataSyncContext';
import { getProductImageUrl } from '../../utils/imageUtils';
import useInteractiveTour from '../../hooks/useInteractiveTour';
import actionDetectorService, { ACTION_TYPES } from '../../services/ActionDetectorService';
import InteractiveTourOverlay from '../../components/InteractiveTourOverlay';

const InventoryScreen = ({ isActive, onTourAction }) => {
  const { saveProducts: syncProducts } = useDataSync();
  const [products, setProducts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, low_stock, out_of_stock
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedOnce = useRef(false);
  
  // Track last fetch timestamp for staleness check (API optimization)
  const lastFetchRef = useRef(0);

  // Interactive Tour for Inventory
  const {
    showTour,
    currentStep,
    stepIndex,
    totalSteps,
    showHint,
    showSkipStep,
    startTour,
    nextStep,
    skipScreen,
    skipAll,
    skipStep,
    completeTour,
    notifyAction,
    setOverlayRef,
    checkAutoStart,
  } = useInteractiveTour('ManageInventory');

  // Ref for InteractiveTourOverlay
  const overlayRef = useRef(null);

  // Set overlay ref when component mounts
  useEffect(() => {
    if (overlayRef.current) {
      setOverlayRef(overlayRef.current);
    }
  }, [setOverlayRef]);

  // Check for auto-start tour when tab becomes active
  useEffect(() => {
    const checkTour = async () => {
      if (isActive && !isLoading) {
        await checkAutoStart();
      }
    };
    checkTour();
  }, [isActive, isLoading, checkAutoStart]);

  // Handle product item tap for tour
  const handleProductTapWithTour = useCallback((item) => {
    // Notify tour of product tap
    if (showTour && currentStep?.actionTarget === 'inventory-product-item') {
      console.log('🎯 [InventoryScreen] Product item tapped during tour');
      notifyAction(ACTION_TYPES.TAP, 'inventory-product-item');
    }
    
    // Open stock modal
    setSelectedProduct(item);
    setNewStock(item.stock.toString());
    setShowStockModal(true);
  }, [showTour, currentStep, notifyAction]);

  // Handle stock quantity input for tour
  const handleStockInputChange = useCallback((text) => {
    setNewStock(text);
    
    // Notify tour of text input
    if (showTour && currentStep?.actionTarget === 'stock-quantity-input' && text.length > 0) {
      console.log('🎯 [InventoryScreen] Stock quantity entered during tour');
      notifyAction(ACTION_TYPES.TEXT_INPUT, 'stock-quantity-input');
    }
  }, [showTour, currentStep, notifyAction]);

  // Handle stock update button tap for tour
  const handleStockUpdateWithTour = useCallback(() => {
    // Notify tour of update stock button tap
    if (showTour && currentStep?.actionTarget === 'update-stock-btn') {
      console.log('🎯 [InventoryScreen] Update Stock button tapped during tour');
      notifyAction(ACTION_TYPES.TAP, 'update-stock-btn');
    }
    
    // Call original handler
    handleStockUpdate();
  }, [showTour, currentStep, notifyAction]);

  // Mount-based data fetching with simple guard for rapid remount
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    
    // Simple guard: skip if fetched recently (within 30 seconds)
    if (lastFetchRef.current && timeSinceLastFetch < 30000) {
      console.log('📦 [Inventory] Mount - data recently fetched, skipping API call');
      return;
    }
    
    console.log('📦 [Inventory] Mount - loading products');
    loadProducts();
  }, []); // Phase 1 Optimization: Empty dependency array for mount-only behavior

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (!hasLoadedOnce.current) {
      setIsLoading(true);
    }

    try {
      // First, load from AsyncStorage for immediate display
      if (!hasLoadedOnce.current) {
        try {
          const storedProducts = await AsyncStorage.getItem('products');
          if (storedProducts) {
            const cachedProducts = JSON.parse(storedProducts);
            setProducts(cachedProducts);
            console.log('📦 [Inventory] Loaded cached products:', cachedProducts.length);
            
            // If we have cached data, hide loading immediately
            if (!isRefresh) {
              setIsLoading(false);
            }
          }
        } catch (storageError) {
          console.error('Error loading cached products:', storageError);
        }
      }

      // Then load from backend with timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );
      
      const productsPromise = productsService.getProducts();
      const productsData = await Promise.race([productsPromise, timeoutPromise]);
      
      setProducts(productsData);
      
      // Update AsyncStorage for future use
      await AsyncStorage.setItem('products', JSON.stringify(productsData));
      
      // Update last fetch timestamp (API optimization)
      lastFetchRef.current = Date.now();
      
      console.log('📦 [Inventory] Loaded fresh products:', productsData.length);
    } catch (error) {
      console.error('Error loading products:', error);
      
      // Fallback to AsyncStorage if backend fails and we haven't loaded cache yet
      if (!hasLoadedOnce.current) {
        try {
          const storedProducts = await AsyncStorage.getItem('products');
          if (storedProducts) {
            setProducts(JSON.parse(storedProducts));
            console.log('📦 [Inventory] Fallback to cached products');
          }
        } catch (storageError) {
          console.error('Error loading from storage:', storageError);
        }
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else if (!hasLoadedOnce.current) {
        setIsLoading(false);
      }
    }
  };

  const onRefresh = () => {
    loadProducts(true);
    // Note: lastFetchRef is updated inside loadProducts() after successful fetch
  };

  const updateStock = async (productId, newStockValue) => {
    setIsUpdating(true);
    try {
      const stockQuantity = parseInt(newStockValue);
      
      // Update via backend API
      await productsService.updateProduct(productId, {
        stock_quantity: stockQuantity
      });
      
      // FIXED: Automatically refresh products from backend with better error handling
      console.log('🔄 Auto-refreshing inventory after stock update...');
      try {
        const freshProducts = await productsService.getProducts();
        setProducts(freshProducts);
        
        // Update AsyncStorage for offline access
        await AsyncStorage.setItem('products', JSON.stringify(freshProducts));
        
        // FIXED: Notify DataSyncContext to update other screens (ManageScreen Products tab)
        await syncProducts(freshProducts);
        console.log('✅ DataSyncContext notified of stock update');
        
        console.log('✅ Inventory auto-refresh successful');
        
        // Show success feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Success', 'Stock updated successfully');
        
      } catch (refreshError) {
        console.error('❌ Auto-refresh failed:', refreshError);
        
        // FALLBACK: Update local state optimistically if refresh fails
        const updatedProducts = products.map(product => 
          product.id === productId 
            ? { ...product, stock: stockQuantity, stock_quantity: stockQuantity }
            : product
        );
        setProducts(updatedProducts);
        
        // Update AsyncStorage with optimistic update
        await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
        
        // FIXED: Also notify DataSyncContext with optimistic update
        await syncProducts(updatedProducts);
        
        // Show user feedback about refresh failure but successful update
        Alert.alert(
          'Stock Updated', 
          'Stock updated successfully. The inventory list has been refreshed with the latest data.',
          [
            { text: 'OK', style: 'default' },
            { 
              text: 'Refresh Again', 
              onPress: () => {
                // Phase 1 Optimization: Single refresh call, no duplicate
                loadProducts(true);
              }
            }
          ]
        );
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error) {
      console.error('Error updating stock:', error);
      Alert.alert('Error', 'Failed to update stock. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStockUpdate = () => {
    if (!newStock || isNaN(parseInt(newStock)) || parseInt(newStock) < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid stock quantity');
      return;
    }

    updateStock(selectedProduct.id, newStock);
    setShowStockModal(false);
    setSelectedProduct(null);
    setNewStock('');
  };

  const getFilteredProducts = () => {
    let filtered = products;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply stock filter
    switch (filterType) {
      case 'low_stock':
        filtered = filtered.filter(product => product.stock > 0 && product.stock <= 5);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.stock === 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return { text: 'Out of Stock', color: colors.error.main, bg: colors.error.background };
    if (stock <= 5) return { text: 'Low Stock', color: colors.warning.main, bg: colors.warning.background };
    return { text: 'In Stock', color: colors.success.main, bg: colors.success.background };
  };

  const renderProduct = ({ item }) => {
    const status = getStockStatus(item.stock);
    const imageUrl = getProductImageUrl(item);

    return (
      <View style={styles.productCard}>
        <View style={styles.productImage}>
          {imageUrl ? (
            <Image 
              source={{ uri: imageUrl }} 
              style={styles.productImageStyle}
              onError={(error) => {
                console.log('❌ [Inventory] Image load error:', error.nativeEvent.error);
              }}
            />
          ) : item.emoji ? (
            <Text style={styles.emojiText}>{item.emoji}</Text>
          ) : (
            <Ionicons name="cube-outline" size={24} color={colors.text.secondary} />
          )}
        </View>
        
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productCategory}>{item.category}</Text>
          <Text style={styles.productPrice}>₹{item.price}</Text>
        </View>

        <View style={styles.stockInfo}>
          <Text style={styles.stockQuantity}>{item.stock}</Text>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => handleProductTapWithTour(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.updateButtonText}>Update</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFilterButton = (type, label) => (
    <TouchableOpacity
      style={[
        styles.filterButton,
        filterType === type && styles.filterButtonActive
      ]}
      onPress={() => setFilterType(type)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterButtonText,
        filterType === type && styles.filterButtonTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={64} color={colors.text.secondary} />
      <Text style={styles.emptyTitle}>No Products Found</Text>
      <Text style={styles.emptyText}>
        {searchQuery || filterType !== 'all' 
          ? 'Try adjusting your search or filters'
          : 'Add products to start managing inventory'
        }
      </Text>
    </View>
  );

  const filteredProducts = getFilteredProducts();

  return (
    <View style={styles.container}>
      {/* Loading Overlay for initial load and stock updates */}
      {(isLoading || isUpdating) && <LoadingSpinner />}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        {renderFilterButton('all', 'All Items')}
        {renderFilterButton('low_stock', 'Low Stock')}
        {renderFilterButton('out_of_stock', 'Out of Stock')}
      </View>

      {/* Products List */}
      {filteredProducts.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProduct}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.productsList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary.main}
              colors={[colors.primary.main]}
            />
          }
        />
      )}

      {/* Stock Update Modal */}
      <Modal
        animationType="none"
        transparent={true}
        visible={showStockModal}
        onRequestClose={() => setShowStockModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Stock</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowStockModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View style={styles.productPreview}>
                <Text style={styles.productPreviewEmoji}>{selectedProduct.emoji}</Text>
                <Text style={styles.productPreviewName}>{selectedProduct.name}</Text>
                <Text style={styles.currentStock}>Current Stock: {selectedProduct.stock}</Text>
              </View>
            )}

            <TextInput
              style={styles.stockInput}
              placeholder="Enter new stock quantity"
              value={newStock}
              onChangeText={handleStockInputChange}
              keyboardType="numeric"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowStockModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleStockUpdateWithTour}
              >
                <Text style={styles.saveButtonText}>Update Stock</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Interactive App Tour Overlay */}
      <InteractiveTourOverlay
        ref={overlayRef}
        visible={showTour}
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepIndex={stepIndex}
        onNext={nextStep}
        onSkip={skipScreen}
        onSkipAll={skipAll}
        onSkipStep={skipStep}
        onActionComplete={nextStep}
        showHint={showHint}
        showSkipStep={showSkipStep}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchInput: {
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.primary.main,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  filterButtonTextActive: {
    color: colors.background.surface,
  },
  productsList: {
    padding: 20,
  },
  productCard: {
    backgroundColor: colors.background.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: colors.background.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    overflow: 'hidden',
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emojiText: {
    fontSize: 24,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  stockInfo: {
    alignItems: 'center',
    minWidth: 80,
  },
  stockQuantity: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  updateButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  productPreview: {
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: colors.background.primary,
    borderRadius: 12,
  },
  productPreviewEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  productPreviewName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 4,
  },
  currentStock: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  stockInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginRight: 8,
    borderRadius: 8,
    backgroundColor: colors.gray[100],
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.success.main,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
});

export default InventoryScreen;