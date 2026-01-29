import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Removed useFocusEffect import - Phase 1 optimization eliminates focus-based API calls
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCart } from '../context/CartContext';
import CustomAlert from '../components/CustomAlert';
import LoadingSpinner from '../components/LoadingSpinner';
import { webScrollFix, webContainerFix, webScrollableContainer } from '../styles/webStyles';
// Removed useRealtimeProducts - replaced with ProductFetchCoordinator for Phase A optimization
import productFetchCoordinator from '../services/ProductFetchCoordinator';
// Phase B Implementation: Add UIUpdatePropagator for receiving UI updates
import uiUpdatePropagator from '../services/UIUpdatePropagator';
import { useStoreSettings } from '../context/StoreSettingsContext';
import ResponsiveText from '../components/ResponsiveText';
import featureService from '../services/FeatureService';
// TOUR TEMPORARILY DISABLED
// import SimpleTourOverlay from '../components/SimpleTourOverlay';
// import useSimpleTour from '../hooks/useSimpleTour';
// import { getSimpleTourSteps } from '../config/simpleTourContent';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttonStyles';
import { typography } from '../styles/typographyStyles';
import { useTheme } from '../context/ThemeContext';
import { getProductImageUrl } from '../utils/imageUtils';



const POSScreen = ({ navigation, route }) => {
  // TOUR TEMPORARILY DISABLED
  const { theme: _ } = useTheme(); // Theme context available for future use
  const [selectedTag, setSelectedTag] = useState('All Items');
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  // TOUR TEMPORARILY DISABLED
  // const [showTourResumePrompt, setShowTourResumePrompt] = useState(true);
  const { items, addItem, removeItem, clearCart, getItemCount, getTotal } = useCart();

  // Track if initial load is done
  const initialLoadDone = useRef(false);

  // Track last fetch timestamp for staleness check (API optimization)
  const lastFetchRef = useRef(0);

  // TOUR TEMPORARILY DISABLED
  // Tour refs for dynamic positioning
  // const headerRef = useRef(null);
  // const productGridRef = useRef(null);
  // const cartBarRef = useRef(null);
  // const completeOrderButtonRef = useRef(null);
  // const tourOverlayRef = useRef(null);

  // Remove action detection refs - simple tour doesn't need them

  // Responsive layout - no fixed calculations, use flex instead

  // Phase A Implementation: Replace useRealtimeProducts with ProductFetchCoordinator
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh function using ProductFetchCoordinator
  const refreshProducts = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      console.log('🏪 [POS] Fetching products via ProductFetchCoordinator:', { forceRefresh });

      const fetchedProducts = await productFetchCoordinator.fetchProducts({
        forceRefresh,
        screenName: 'POSScreen',
        apiOptions: {} // Pass any needed API options
      });

      setProducts(fetchedProducts);
      console.log('🏪 [POS] Products updated:', fetchedProducts.length);

    } catch (error) {
      console.error('🏪 [POS] Error fetching products:', error);
      // Keep existing products on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get store settings from StoreSettingsContext (single source of truth)
  // Get store settings from StoreSettingsContext (single source of truth)
  const { getStoreProfile, getBusinessSettings } = useStoreSettings();
  const storeProfile = getStoreProfile();
  const businessSettings = getBusinessSettings();
  const lowStockLimit = businessSettings?.lowStockThreshold || 5;

  // Get store name - always display, independent of settings
  const storeName = storeProfile?.store_name || 'My Store';

  // Initialize feature service and trigger initial load
  // Simple timestamp guard to prevent rapid refetches on remount (30 seconds)
  const REMOUNT_GUARD_MS = 30 * 1000;

  useEffect(() => {
    // Phase A Optimization: Initialize ProductFetchCoordinator and fetch products
    console.log('🏪 [POS] Initializing ProductFetchCoordinator');
    productFetchCoordinator.initialize();

    // Phase B Implementation: Register with UIUpdatePropagator for product updates
    console.log('🏪 [POS] Registering with UIUpdatePropagator');

    // Register for UI updates with callback that handles different update types
    const handleUIUpdate = (updateType, updateData) => {
      console.log('🏪 [POS] Received UI update:', { updateType, hasData: !!updateData });

      if (updateType === 'ORDER_SUCCESS') {
        // Order was created successfully - refresh products to show updated stock
        console.log('🏪 [POS] Order success - refreshing products display');
        refreshProducts(false); // Use cache if available, don't force API call
      } else {
        // Other updates (product changes, etc.)
        refreshProducts(false);
      }
    };

    uiUpdatePropagator.registerScreen('POSScreen', handleUIUpdate);

    // Initialize feature service
    featureService.initialize();

    // Simple guard: check if we fetched recently to prevent rapid remount refetches
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;

    if (timeSinceLastFetch > REMOUNT_GUARD_MS || lastFetchRef.current === 0) {
      // Trigger initial products fetch - single API call per mount
      console.log('🏪 [POS] Initial mount - fetching products via ProductFetchCoordinator');
      refreshProducts(false); // Use cache if available
      lastFetchRef.current = now; // Track fetch timestamp
    } else {
      console.log('🏪 [POS] Mount guard active - skipping API call (recently fetched)');
    }

    initialLoadDone.current = true;

    // Phase B Implementation: Cleanup - unregister from UIUpdatePropagator
    return () => {
      console.log('🏪 [POS] Unregistering from UIUpdatePropagator');
      uiUpdatePropagator.unregisterScreen('POSScreen');
    };
  }, [refreshProducts]);

  // REMOVED: useFocusEffect API call - eliminated focus-based refetching
  // Focus-based refetching removed as per Phase 1 optimization requirements
  // Data will be fetched only on mount and user-triggered refresh

  // Interactive App Tour
  // Simple tour implementation
  // const tourSteps = getSimpleTourSteps('POS');
  // const {
  //   showTour,
  //   currentStep,
  //   stepIndex,
  //   totalSteps,
  //   nextStep,
  //   skipTour,
  //   completeTour,
  // } = useSimpleTour('POS', tourSteps);

  // Simple tour doesn't need overlay refs - removed setOverlayRef usage

  // Remove complex tour measurement and action detection code - simple tour doesn't need it

  // Detect cart changes for tour action detection
  // Simple Complete Order navigation
  const handleCompleteOrder = useCallback(() => {
    navigation.navigate('Cart');
  }, [navigation]);

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

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Phase A Implementation: Force refresh bypasses cache and hits API directly
      await refreshProducts(true); // forceRefresh = true for manual refresh
      lastFetchRef.current = Date.now(); // Update fetch timestamp on manual refresh
    } catch (error) {
      console.error('🏪 [POS] Manual refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
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
    // Only check stock if tracking is enabled
    // track_stock is the source of truth from backend
    const isTrackingEnabled = product.track_stock !== false;
    if (isTrackingEnabled && product.stock <= 0) {
      setAlertConfig({
        title: 'Out of Stock',
        message: `${product.name} is currently out of stock.`,
        type: 'warning',
        buttons: [{
          text: 'OK',
          style: 'default',
          onPress: () => { } // Close alert only
        }],
      });
      setShowAlert(true);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const success = addItem(product);

    // If adding failed due to stock limit
    if (!success) {
      const isTrackingEnabled = product.track_stock !== false;
      const maxLimit = isTrackingEnabled ? product.stock : 50;
      const limitType = isTrackingEnabled ? 'stock' : 'quantity';
      setAlertConfig({
        title: 'Limit Reached',
        message: `Cannot add more ${product.name}. Maximum ${limitType}: ${maxLimit}`,
        type: 'warning',
        buttons: [{
          text: 'OK',
          style: 'default',
          onPress: () => { } // Close alert only
        }],
      });
      setShowAlert(true);
    }
  };

  const getStockDisplay = (product) => {
    // Check if track_stock is explicitly false
    // track_stock is the source of truth from backend
    const isTrackingEnabled = product.track_stock !== false;

    if (!isTrackingEnabled) {
      return 'Available';
    }
    return `${product.stock || 0} available`;
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
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => { } // Close alert only
        },
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

    // Get image URL using utility function
    const displayImageUrl = getProductImageUrl(item);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleAddToCart(item)}
        onLongPress={() => handleLongPress(item)}
        activeOpacity={0.8}
      >
        {/* Image Section - 60% of card */}
        <View style={styles.productImage}>
          {displayImageUrl ? (
            <Image
              source={{ uri: displayImageUrl }}
              style={styles.productImageStyle}
              onError={(error) => {
                console.log('❌ [POSScreen] Image load error for', item.name, ':', error.nativeEvent.error);
                console.log('❌ [POSScreen] Failed URL:', displayImageUrl);
              }}
              onLoad={() => {
                console.log('✅ [POSScreen] Image loaded successfully for', item.name);
              }}
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color={colors.text.secondary} />
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
          <View style={styles.stockContainer}>
            <Text style={styles.productStock}>
              {getStockDisplay(item)}
            </Text>
          </View>
        </View>

        {/* Badges */}
        {(item.track_stock !== false) && item.stock <= lowStockLimit && (
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
      onPress={() => {
        setSelectedTag(item);
      }}
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
      <Ionicons name="cube-outline" size={64} color={colors.text.secondary} />
      <ResponsiveText variant="title" style={styles.emptyTitle}>
        No Products Yet
      </ResponsiveText>
      <ResponsiveText variant="body" style={styles.emptyText}>
        Start by adding your first products to begin selling
      </ResponsiveText>
      <TouchableOpacity
        style={styles.addProductButton}
        onPress={() => navigation.navigate('Main', {
          screen: 'Manage',
          params: {
            initialTab: 'Products',
            openAddModal: true
          }
        })}
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
      {/* Show loader during initial data fetch */}
      {isLoading && <LoadingSpinner />}

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
                <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
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
              onScrollBeginDrag={() => { }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
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
            <View style={styles.cartSummaryContent}>
              <View style={styles.cartInfo}>
                <ResponsiveText variant="caption" style={styles.cartItems}>
                  {getItemCount()} items
                </ResponsiveText>
                <ResponsiveText variant="price" style={styles.cartTotal}>
                  ₹{getTotal()}
                </ResponsiveText>
              </View>
              <View style={styles.cartSpacer} />
              <View style={styles.cartActions}>
                <TouchableOpacity
                  style={styles.clearCartButton}
                  onPress={handleClearCart}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={24} color={colors.error.main} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={buttonStyles.success}
                  onPress={handleCompleteOrder}
                  activeOpacity={0.8}
                >
                  <ResponsiveText variant="button" style={buttonStyles.successText}>
                    Complete Order
                  </ResponsiveText>
                </TouchableOpacity>
              </View>
            </View>
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

        {/* Simple App Tour */}
        {/* TOUR TEMPORARILY DISABLED */}
        {/* <SimpleTourOverlay
      //         visible={showTour}
      //         currentStep={currentStep}
      //         totalSteps={totalSteps}
      //         stepIndex={stepIndex}
      //         onNext={nextStep}
      //         onSkip={skipTour}
      //         onComplete={completeTour}
      //       /> */}
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
    ...typography.styles.h3,
    color: colors.text.primary,
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    ...typography.styles.h4,
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
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  searchButtonText: {
    ...typography.styles.body,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    ...typography.styles.bodySmall,
    flex: 1,
    height: 36,
    backgroundColor: colors.gray[100],
    borderRadius: 18,
    paddingHorizontal: 16,
    color: colors.text.primary,
  },
  searchCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  searchCloseText: {
    ...typography.styles.bodySmall,
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
    backgroundColor: colors.gray[100],
    minWidth: 80,
    alignItems: 'center',
  },
  categoryButtonActive: {
    backgroundColor: colors.primary.main,
  },
  categoryText: {
    ...typography.styles.bodySmallMedium,
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
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productImagePlaceholderText: {
    ...typography.styles.h1,
    fontSize: typography.fontSizes['3xl'] + 18, // Extra large for placeholder
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
    ...typography.styles.bodySmallMedium,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
    flexShrink: 1,
    width: '100%',
    fontWeight: typography.fontWeights.semibold,
  },
  productPrice: {
    ...typography.styles.priceSmall,
    color: colors.primary.main,
    marginBottom: 4,
    textAlign: 'center',
  },
  stockContainer: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
  },
  productStock: {
    ...typography.styles.captionMedium,
    color: colors.text.secondary,
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
    ...typography.styles.badge,
    fontSize: typography.fontSizes.xs - 2, // Extra small for low stock badge
    color: colors.warning.main,
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
    ...typography.styles.badge,
    color: colors.background.surface,
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
    backgroundColor: colors.gray[800],
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  cartInfo: {
    paddingRight: 12,
    // Remove any flex properties to prevent taking extra space
  },
  cartSpacer: {
    flex: 1,
  },
  cartItems: {
    color: colors.gray[400],
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
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.error.border,
  },
  clearCartText: {
    ...typography.styles.body,
  },
  // Cart button styles removed - using standardized buttonStyles.success
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: typography.fontSizes['3xl'] * 2.5, // Large empty state icon
    marginBottom: 24,
  },
  emptyTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.styles.body,
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
    ...typography.styles.button,
    color: colors.background.surface,
    textAlign: 'center',
  },
});

export default POSScreen;