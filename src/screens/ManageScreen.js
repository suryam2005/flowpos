import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  RefreshControl,
  ScrollView,
  Image,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import InventoryScreen from './manage/InventoryScreen';
import productsService from '../services/ProductsService';
import StoreSettingsScreen from './manage/StoreSettingsScreen';
import LoadingSpinner from '../components/LoadingSpinner';

import featureService from '../services/FeatureService';
import TagInput from '../components/TagInput';
import ProductImagePicker from '../components/ProductImagePicker';
import { generateProductTags } from '../utils/tagGenerator';
import productImageService from '../services/ProductImageService';
import ImprovedTourGuide from '../components/ImprovedTourGuide';
import { useAppTour } from '../hooks/useAppTour';
import { colors } from '../styles/colors';
import { buttonStyles } from '../styles/buttonStyles';
import { typography } from '../styles/typographyStyles';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getProductImageUrl } from '../utils/imageUtils';
import { useDataSync } from '../context/DataSyncContext';


const ManageScreen = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { user, isAuthenticated, getStore } = useAuth();
  const { fetchFreshData, subscribe, products: syncedProducts } = useDataSync();
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storeSetupCompleted, setStoreSetupCompleted] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Page loading state
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('Products');
  
  // App tour guide
  const { showTour, completeTour } = useAppTour('Manage');

  // Note: Back prevention not needed for ManageScreen as modal handles its own navigation
  // The LoadingOverlay already prevents interaction during save operations
  
  // Refs for maintaining focus
  const lastFocusedInputRef = useRef(null);
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    trackStock: true,
    tags: [],
    image: null,
  });

  const [businessType, setBusinessType] = useState('restaurant');

  const tabs = ['Products', 'Inventory', 'Store Settings'];

  // No animations needed

  useEffect(() => {
    // Initial load with page loader
    loadProducts(false, true);
    
    // Focus listener for silent refresh (no loader)
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('📦 [ManageScreen] Focus - silent refresh');
      loadProducts(false, false); // Silent refresh
    });

    // FIXED: Subscribe to DataSyncContext for real-time updates from InventoryScreen
    const unsubscribeSync = subscribe((event) => {
      if (event.type === 'products') {
        console.log('📦 [ManageScreen] Received products update from DataSyncContext');
        const normalizedProducts = normalizeProducts(event.data);
        setProducts(normalizedProducts);
      }
    });

    // Initialize active tab
    if (!activeTab) {
      setActiveTab('Products'); // Set initial tab to Products
    }

    // No animations needed

    return () => {
      unsubscribe();
      unsubscribeSync();
    };
  }, [navigation]);

  // Handle route params for navigation from POS screen
  useEffect(() => {
    if (route?.params?.initialTab) {
      console.log('📦 [ManageScreen] Setting initial tab:', route.params.initialTab);
      setActiveTab(route.params.initialTab);
    }
    if (route?.params?.openAddModal) {
      console.log('📦 [ManageScreen] Opening add product modal');
      // Small delay to ensure tab is set and screen is ready
      setTimeout(() => {
        handleAddProduct();
      }, 200);
      // Clear the param to prevent re-triggering
      navigation.setParams({ openAddModal: undefined });
    }
  }, [route?.params, navigation, handleAddProduct]);

  // Trigger DataSync refresh when modal closes (product updated)
  useEffect(() => {
    if (!modalVisible) {
      // Delay slightly to ensure state is updated
      setTimeout(() => {
        console.log('🔄 Modal closed - triggering DataSync refresh');
        fetchFreshData(true); // Force refresh
      }, 200);
    }
  }, [modalVisible, fetchFreshData]);

  const normalizeProducts = (products) => {
    return products.map(product => {
      // track_stock is the source of truth from backend
      // Preserve the actual value from backend, don't convert it
      const trackStockValue = product.track_stock;
      const isTrackingEnabled = trackStockValue !== false;
      
      console.log('\n� A[MANAGE] Normalizing product:');
      console.log('  name:', product.name);
      console.log('  raw_track_stock:', trackStockValue);
      console.log('  raw_track_stock_type:', typeof trackStockValue);
      console.log('  raw_track_stock === false:', trackStockValue === false);
      console.log('  raw_track_stock === true:', trackStockValue === true);
      console.log('  isTrackingEnabled:', isTrackingEnabled);
      
      const normalized = {
        ...product,
        // Keep the actual track_stock value from backend
        track_stock: trackStockValue,
        // Also set trackStock for compatibility
        trackStock: isTrackingEnabled,
        // Ensure stock field is set
        stock: product.stock || product.stock_quantity || 0,
      };
      
      console.log('  After normalization:');
      console.log('    track_stock:', normalized.track_stock);
      console.log('    trackStock:', normalized.trackStock);
      
      return normalized;
    });
  };

  const loadProducts = async (isRefresh = false, isInitialLoad = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // No animation delays needed

      // Load products from Supabase using ProductsService
      console.log('\n📦 MANAGESCREEN: Loading products from Supabase...');
      
      const supabaseProducts = await productsService.getProducts();
      console.log('✅ Raw products from Supabase:', supabaseProducts.length);
      
      if (supabaseProducts.length > 0) {
        console.log('📦 First raw product:', {
          name: supabaseProducts[0].name,
          track_stock: supabaseProducts[0].track_stock,
          track_stock_type: typeof supabaseProducts[0].track_stock,
          track_stock_strict_false: supabaseProducts[0].track_stock === false
        });
      }
      
      const normalizedProducts = normalizeProducts(supabaseProducts);
      
      console.log('✅ MANAGESCREEN: Normalized products:', normalizedProducts.length);
      if (normalizedProducts.length > 0) {
        console.log('📦 First normalized product:', {
          name: normalizedProducts[0].name,
          track_stock: normalizedProducts[0].track_stock,
          trackStock: normalizedProducts[0].trackStock
        });
      }
      
      setProducts(normalizedProducts);
      
      // Also save to AsyncStorage for compatibility
      await AsyncStorage.setItem('products', JSON.stringify(normalizedProducts));
      
      // Check store setup via backend API
      const storeData = await getStore();
      if (storeData) {
        setStoreSetupCompleted(true);
        setStoreInfo(storeData);
        console.log('✅ Store setup completed, store data loaded:', storeData.store_name);
      } else {
        setStoreSetupCompleted(false);
        setStoreInfo(null);
        console.log('⚠️ Store setup not completed');
      }
      
      // Use real user data from AuthContext (which fetches from database)
      if (user && isAuthenticated) {
        setUserInfo(user);
      } else {
        // Fallback to AsyncStorage if not authenticated
        const userData = await AsyncStorage.getItem('userData');
        if (userData) {
          setUserInfo(JSON.parse(userData));
        }
      }
      
      // Only finish loading on initial load (not on focus refresh)
      if (isInitialLoad) {
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      if (isInitialLoad) {
        setIsLoading(false);
      }
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      }
    }
  };

  const onRefresh = () => {
    loadProducts(true);
  };

  const saveProducts = async (updatedProducts) => {
    try {
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      setProducts(updatedProducts);
      
      // Mark onboarding as complete when first product is added
      if (updatedProducts.length > 0) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      }
    } catch (error) {
      console.error('Error saving products:', error);
      Alert.alert('Error', 'Failed to save product changes.');
    }
  };

  const handleAddProduct = async () => {
    // Check feature limits first
    const canAdd = await featureService.canAddProduct();
    if (!canAdd) {
      return; // Feature service will show upgrade prompt
    }

    // Check if store setup is completed via backend
    try {
      const storeData = await getStore();
      
      if (!storeData) {
        Alert.alert(
          'Store Setup Required',
          'Please complete your store setup with business details before adding products. This helps create professional receipts and manage your business properly.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Complete Setup', 
              onPress: () => navigation.navigate('StoreSetup')
            }
          ]
        );
        return;
      }
    } catch (error) {
      console.error('Error checking store setup:', error);
      Alert.alert(
        'Setup Required',
        'Please complete your store setup before adding products.',
        [
          { text: 'OK', onPress: () => navigation.navigate('StoreSetup') }
        ]
      );
      return;
    }

    setEditingProduct(null);
    setFormData({
      name: '',
      price: '',
      stock: '',
      trackStock: true,
      tags: [],
      image: null,
    });
    setModalVisible(true);
  };

  const handleEditProduct = (product) => {
    // Get trackStock from track_stock field (primary source of truth from backend)
    // If track_stock is explicitly false, then tracking is OFF
    // Otherwise (true, null, undefined), tracking is ON
    const isTrackingEnabled = product.track_stock !== false;
    
    console.log('📝 [MANAGE] Editing product:', {
      name: product.name,
      track_stock: product.track_stock,
      track_stock_type: typeof product.track_stock,
      track_stock_strict_false: product.track_stock === false,
      trackStock: product.trackStock,
      isTrackingEnabled,
      stock: product.stock,
      stock_quantity: product.stock_quantity,
      all_product_keys: Object.keys(product)
    });
    
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: isTrackingEnabled ? (product.stock || product.stock_quantity || '').toString() : '',
      trackStock: isTrackingEnabled,
      tags: product.tags || [],
      image: product.image_url || product.image || null,
    });
    setModalVisible(true);
  };

  const handleDeleteProduct = (productId) => {
    Alert.alert(
      'Delete Product',
      'Are you sure you want to delete this product?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🚨 MANAGESCREEN: Deleting product from Supabase:', productId);
              await productsService.deleteProduct(productId);
              
              // Refresh products list from Supabase
              const updatedProducts = await productsService.getProducts();
              setProducts(updatedProducts);
              
              // Also update AsyncStorage for compatibility
              await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
              
              console.log('✅ MANAGESCREEN: Product deleted successfully');
            } catch (error) {
              console.error('❌ MANAGESCREEN: Error deleting product:', error);
              Alert.alert('Error', 'Failed to delete product. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleSaveProduct = async () => {
    console.log('=== handleSaveProduct CALLED ===');
    console.log('editingProduct:', editingProduct?.id);
    console.log('formData:', formData);
    
    setSaving(true);
    
    // Enhanced validation
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required.');
      return;
    }

    if (formData.name.trim().length < 2) {
      Alert.alert('Validation Error', 'Product name must be at least 2 characters long.');
      return;
    }

    if (!formData.price) {
      Alert.alert('Validation Error', 'Product price is required.');
      return;
    }

    const price = parseInt(formData.price);
    let stock = 0;

    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price (greater than 0).');
      return;
    }

    // Validate stock only if tracking is enabled
    if (formData.trackStock) {
      if (!formData.stock) {
        Alert.alert('Validation Error', 'Stock quantity is required when stock tracking is enabled.');
        return;
      }
      stock = parseInt(formData.stock);
      if (isNaN(stock) || stock < 0) {
        Alert.alert('Validation Error', 'Please enter a valid stock quantity (0 or greater).');
        return;
      }
    }

    // Generate tags if none provided
    let finalTags = formData.tags;
    if (finalTags.length === 0) {
      finalTags = generateProductTags(formData.name.trim(), businessType);
    }

    try {
      console.log('INSIDE TRY BLOCK - editingProduct:', editingProduct?.id);
      
      // Handle image upload to Supabase if a new image was selected
      let imageUrl = null;
      if (formData.image && formData.image.startsWith('file://')) {
        // This is a new local image that needs to be uploaded
        console.log('📸 [ManageScreen] Uploading new image to Supabase...');
        try {
          const userInfo = await AsyncStorage.getItem('userInfo');
          const userId = userInfo ? JSON.parse(userInfo)?.id || 'unknown' : 'unknown';
          const productId = editingProduct?.id || `temp_${Date.now()}`;
          
          const uploadResult = await productImageService.uploadProductImage(formData.image, productId, userId);
          if (uploadResult.success) {
            imageUrl = uploadResult.url;
            console.log('✅ [ManageScreen] Image uploaded successfully:', imageUrl);
          } else {
            console.warn('⚠️ [ManageScreen] Image upload failed, using local URI');
            imageUrl = formData.image;
          }
        } catch (uploadError) {
          console.error('❌ [ManageScreen] Image upload error:', uploadError);
          imageUrl = formData.image; // Fallback to local URI
        }
      } else if (formData.image) {
        // This is already a Supabase URL or existing image
        imageUrl = formData.image;
      }
      
      if (editingProduct) {
        // Update existing product using ProductsService
        console.log('🚨 MANAGESCREEN: Updating product in Supabase:', editingProduct.id);
        
        // Determine stock_quantity based on track_stock setting
        let stockQuantity;
        if (formData.trackStock) {
          // If tracking is ON, use the entered stock value
          stockQuantity = parseInt(stock) || 0;
        } else {
          // If tracking is OFF, keep the existing stock_quantity (don't set to 0)
          stockQuantity = editingProduct.stock_quantity || editingProduct.stock || 0;
        }
        
        const updateData = {
          name: formData.name.trim(),
          price,
          stock_quantity: stockQuantity,
          track_stock: formData.trackStock,
          category: finalTags[0] || 'General',
          tags: finalTags,
          // FIXED: Always include image_url - set to empty string if null (to clear the image)
          image_url: imageUrl || '',
        };
        
        console.log('\n🟡🟡🟡 === MANAGESCREEN SENDING UPDATE === 🟡🟡🟡');
        console.log('Product ID:', editingProduct.id);
        console.log('formData.trackStock:', formData.trackStock, 'Type:', typeof formData.trackStock);
        console.log('updateData.track_stock:', updateData.track_stock, 'Type:', typeof updateData.track_stock);
        console.log('updateData.image_url:', updateData.image_url);
        console.log('Full updateData:', JSON.stringify(updateData, null, 2));
        
        console.log('🟡 CALLING productsService.updateProduct...');
        await productsService.updateProduct(editingProduct.id, updateData);
        console.log('🟡 RETURNED FROM productsService.updateProduct');
      } else {
        // Create new product using ProductsService
        console.log('🚨 MANAGESCREEN: Creating new product in Supabase');
        const productData = {
          name: formData.name.trim(),
          price,
          stock_quantity: formData.trackStock ? parseInt(stock) : 0,
          track_stock: formData.trackStock,
          category: finalTags[0] || 'General',
          tags: finalTags,
          description: `New product created from ManageScreen`,
          image_url: imageUrl || '',
        };
        
        console.log('📦 Product data:', {
          trackStock: formData.trackStock,
          stock_quantity: productData.stock_quantity,
          track_stock: productData.track_stock
        });
        
        await productsService.createProduct(productData);
      }

      // Close modal first to give immediate feedback
      setModalVisible(false);
      
      // Force refresh products list from Supabase (bypass any cache)
      console.log('🔄 Forcing product refresh after update...');
      
      try {
        // Small delay to ensure database commit completes
        await new Promise(resolve => setTimeout(resolve, 100));
        const updatedProducts = await productsService.getProducts();
        const normalizedProducts = normalizeProducts(updatedProducts);
        
        console.log('✅ Products refreshed:', normalizedProducts.length);
        
        // Find the product we just updated/created (only if editing)
        if (editingProduct) {
          const updatedProduct = normalizedProducts.find(p => p.id === editingProduct.id);
          console.log('📦 Updated product from backend:', {
            name: updatedProduct?.name,
            track_stock: updatedProduct?.track_stock,
            track_stock_type: typeof updatedProduct?.track_stock,
            track_stock_strict_false: updatedProduct?.track_stock === false,
            trackStock: updatedProduct?.trackStock,
            stock_quantity: updatedProduct?.stock_quantity
          });
        } else {
          console.log('📦 New product created successfully');
        }
        
        setProducts(normalizedProducts);
        
        // Also save to AsyncStorage for compatibility
        await AsyncStorage.setItem('products', JSON.stringify(normalizedProducts));
        if (updatedProducts.length > 0) {
          await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        }
        
        // Show success message
        const isFirstProduct = products.length === 0;
        const message = editingProduct 
          ? 'Product updated successfully!' 
          : isFirstProduct 
            ? 'Welcome! Your first product has been added.' 
            : 'Product added successfully!';
        
        Alert.alert('Success', message);
        
      } catch (refreshError) {
        console.error('⚠️ Error refreshing products after save:', refreshError);
        // Product was saved successfully, just refresh failed
        // Show success anyway and let user manually refresh
        Alert.alert(
          'Product Saved', 
          'Product was saved successfully. Pull down to refresh the list.',
          [{ text: 'OK' }]
        );
      }
      
    } catch (error) {
      console.error('❌ MANAGESCREEN: Error saving product:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      
      // More specific error message
      const errorMessage = error.message || 'Failed to save product. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const renderProduct = ({ item }) => {
    // Get image URL using utility function
    const displayImageUrl = getProductImageUrl(item);

    return (
      <View style={styles.productCard}>
        <View style={styles.productImage}>
          {displayImageUrl ? (
            <Image 
              source={{ uri: displayImageUrl }} 
              style={styles.productImageStyle}
              onError={(error) => {
                console.log('❌ [ManageScreen] Image load error:', error.nativeEvent.error);
              }}
            />
          ) : (
            <View style={styles.productImagePlaceholder}>
              <Ionicons name="cube-outline" size={32} color="#6b7280" />
            </View>
          )}
        </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetails}>
          ₹{item.price}{(item.track_stock !== false) ? ` • Stock: ${item.stock || item.stock_quantity}` : ' • No stock tracking'}
        </Text>
        {item.tags && item.tags.length > 0 && (
          <View style={styles.productTags}>
            {item.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.productTag}>
                <Text style={styles.productTagText}>{tag}</Text>
              </View>
            ))}
            {item.tags.length > 3 && (
              <Text style={styles.moreTags}>+{item.tags.length - 3}</Text>
            )}
          </View>
        )}
      </View>
      <View style={styles.productActions}>
        <TouchableOpacity
          style={buttonStyles.iconSmall}
          onPress={() => handleEditProduct(item)}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={20} color={colors.primary.main} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[buttonStyles.iconSmall, { backgroundColor: colors.error.background }]}
          onPress={() => handleDeleteProduct(item.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={20} color={colors.error.main} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

  // Load business type from store info
  useEffect(() => {
    const loadBusinessType = async () => {
      try {
        const storeData = await AsyncStorage.getItem('storeInfo');
        if (storeData) {
          const store = JSON.parse(storeData);
          setBusinessType(store.businessType || 'restaurant');
        }
      } catch (error) {
        console.error('Error loading business type:', error);
      }
    };
    
    loadBusinessType();
  }, []);

  const handleDevClearData = () => {
    Alert.alert(
      'Developer Options',
      'Choose an option:',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Test Invoice',
          onPress: () => handleTestInvoice(),
        },
        {
          text: 'Clear All Data',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                'products',
                'orders',
                'revenue',
                'cart',
                'hasCompletedOnboarding',
                'lastOrderNumber',
              ]);
              Alert.alert('Success', 'All data cleared. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear data');
            }
          },
        },
      ]
    );
  };

  const handleTestInvoice = () => {
    // Create test order data
    const testOrderData = {
      orderNumber: 'TEST-001',
      items: [
        { name: 'Test Burger', quantity: 2, price: 150 },
        { name: 'Test Coffee', quantity: 1, price: 80 },
        { name: 'Test Fries', quantity: 1, price: 60 },
      ],
      customerName: 'Test Customer',
      phoneNumber: '9876543210',
      timestamp: new Date().toISOString(),
      subtotal: 380, // (2*150) + (1*80) + (1*60)
      gst: 68.4,     // 18% of 380
      total: 448.4,  // 380 + 68.4
      paymentMethod: 'Cash',
    };

    console.log('Testing invoice with data:', testOrderData);
    navigation.navigate('Invoice', { orderData: testOrderData, autoRedirect: false });
  };



  return (
    <SafeAreaView style={styles.container}>
      {(saving || isLoading) && <LoadingSpinner />}
      
      <View style={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.titleContainer}
            onLongPress={handleDevClearData}
            delayLongPress={3000}
          >
            <Text style={styles.title}>Manage</Text>
            {storeSetupCompleted && storeInfo && (
              <Text style={styles.storeSubtitle}>{storeInfo.store_name}</Text>
            )}
          </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Ionicons name="diamond-outline" size={20} color="#f59e0b" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            <Ionicons name="person-outline" size={20} color="#4b5563" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Ionicons name="settings-outline" size={20} color="#4b5563" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            {false ? (
              null
            ) : (
              <Text 
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive
                ]}
                numberOfLines={2}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.8}
              >
                {tab}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Products' && (
        <>
          <View style={styles.productsHeader}>
            <View style={styles.productsHeaderLeft}>
              <Text style={styles.productsTitle}>Products</Text>
              {!storeSetupCompleted && (
                <View style={styles.setupWarning}>
                  <Ionicons name="warning-outline" size={16} color="#f59e0b" />
                  <Text style={styles.setupWarningText}>Setup Required</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                buttonStyles.compact,
                !storeSetupCompleted && buttonStyles.disabled
              ]}
              onPress={handleAddProduct}
              activeOpacity={0.8}
            >
              <Text style={buttonStyles.compactText}>
                {!storeSetupCompleted ? 'Setup First' : 'Add Product'}
              </Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyProductsState}>
              {!storeSetupCompleted ? (
                <>
                  <Ionicons name="storefront-outline" size={64} color="#6b7280" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyProductsTitle}>Complete Store Setup</Text>
                  <Text style={styles.emptyProductsText}>
                    Before adding products, please complete your store setup with business details. This helps create professional receipts and manage your business properly.
                  </Text>
                  <TouchableOpacity
                    style={styles.setupButton}
                    onPress={() => navigation.navigate('StoreSetup')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.setupButtonText}>Complete Store Setup</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="cube-outline" size={64} color="#6b7280" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyProductsTitle}>
                    Welcome, {storeInfo?.store_name || 'Store Owner'}!
                  </Text>
                  <Text style={styles.emptyProductsText}>
                    Your store setup is complete. Now add your first product to start managing your inventory and making sales.
                  </Text>
                  <TouchableOpacity
                    style={styles.firstProductButton}
                    onPress={handleAddProduct}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.firstProductButtonText}>Add First Product</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <FlatList
              data={products}
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
                  progressBackgroundColor={colors.background.surface}
                  title="Pull to refresh products..."
                  titleColor={colors.text.secondary}
                />
              }
            />
          )}
        </>
      )}

      {activeTab === 'Inventory' && <InventoryScreen isActive={activeTab === 'Inventory'} />}

      {activeTab === 'Store Settings' && <StoreSettingsScreen navigation={navigation} />}

      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ScrollView 
              contentContainerStyle={styles.modalScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>
                    {editingProduct ? 'Edit Product' : 'Add Product'}
                  </Text>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.closeButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.textInput}
                  placeholder="Product Name"
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                />

                <TextInput
                  style={styles.textInput}
                  placeholder="Price (₹)"
                  value={formData.price}
                  onChangeText={(text) => setFormData({ ...formData, price: text })}
                  keyboardType="numeric"
                />

                {/* Stock Tracking Toggle */}
                <View style={styles.stockTrackingContainer}>
                  <View style={styles.stockTrackingHeader}>
                    <Text style={styles.inputLabel}>Track Stock Quantity</Text>
                    <Switch
                      value={formData.trackStock}
                      onValueChange={(value) => {
                        console.log('🔄 [MANAGE] Track Stock toggle changed:', {
                          newValue: value,
                          newValue_type: typeof value,
                          oldValue: formData.trackStock
                        });
                        
                        // When enabling track_stock, populate stock field with existing value
                        if (value && !formData.stock && editingProduct) {
                          const existingStock = editingProduct.stock_quantity || editingProduct.stock || 0;
                          setFormData({ ...formData, trackStock: value, stock: existingStock.toString() });
                        } else {
                          setFormData({ ...formData, trackStock: value });
                        }
                      }}
                      trackColor={{ false: colors.border.medium, true: '#93c5fd' }}
                      thumbColor={formData.trackStock ? colors.primary.main : colors.text.tertiary}
                    />
                  </View>
                  <TextInput
                    style={[styles.textInput, !formData.trackStock && styles.textInputDisabled]}
                    placeholder="Stock Quantity"
                    value={formData.stock}
                    onChangeText={(text) => formData.trackStock && setFormData({ ...formData, stock: text })}
                    keyboardType="numeric"
                    editable={formData.trackStock}
                  />
                </View>

                {/* Product Image */}
                <ProductImagePicker
                  image={formData.image}
                  onImageChange={(image) => setFormData({ ...formData, image })}
                  productName={formData.name}
                  productId={editingProduct?.id || 'new'}
                  userId={user?.id || userInfo?.id}
                  mode="supabase"
                />

                {/* Product Tags */}
                <TagInput
                  tags={formData.tags}
                  onTagsChange={(tags) => setFormData({ ...formData, tags })}
                  productName={formData.name}
                  businessType={businessType}
                />

                <TouchableOpacity
                  style={buttonStyles.success}
                  onPress={handleSaveProduct}
                  activeOpacity={0.8}
                >
                  <Text style={buttonStyles.successText}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>



      {/* App Tour Guide */}
      <ImprovedTourGuide
        visible={showTour}
        currentScreen="Manage"
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
  titleContainer: {
    flex: 1,
  },
  title: {
    ...typography.styles.h2,
    color: colors.text.primary,
  },
  storeSubtitle: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionButton: {
    padding: 8,
    backgroundColor: colors.warning.background,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  subscriptionIcon: {
    ...typography.styles.body,
  },
  profileButton: {
    padding: 8,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIcon: {
    ...typography.styles.h4,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    ...typography.styles.xl,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tabActive: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.primary.main,
  },
  tabText: {
    ...typography.styles.caption,
    fontSize: typography.fontSizes.xs - 1, // Extra small for tabs
    color: colors.text.secondary,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 14,
    numberOfLines: 2,
  },
  tabTextActive: {
    ...typography.styles.captionMedium,
    fontSize: typography.fontSizes.xs - 1, // Extra small for tabs
    color: colors.primary.main,
    fontWeight: typography.fontWeights.semibold,
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 14,
    numberOfLines: 2,
  },
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
  },
  productsHeaderLeft: {
    flex: 1,
  },
  productsTitle: {
    ...typography.styles.h4,
    color: colors.text.primary,
  },
  setupWarning: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  setupWarningText: {
    ...typography.styles.captionMedium,
    color: colors.warning.main,
  },
  // Add button styles removed - using standardized buttonStyles.compact
  productsList: {
    padding: 20,
    paddingBottom: 140, // Reduced spacing
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
    borderWidth: 1,
    borderColor: colors.gray[100],
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 16,
    overflow: 'hidden',
  },
  productImageStyle: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain', // Show full image without cropping
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
    ...typography.styles.xl,
  },
  productTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  productTag: {
    backgroundColor: colors.primary.background,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  productTagText: {
    fontSize: typography.fontSizes.xs - 2, // Extra small for tags
    color: '#1e40af',
    fontWeight: typography.fontWeights.medium,
  },
  moreTags: {
    fontSize: typography.fontSizes.xs - 2, // Extra small for tags
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  stockTrackingContainer: {
    marginBottom: 16,
    height: 108,
  },
  stockTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    height: 40,
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    ...typography.styles.bodySemibold,
    color: colors.text.primary,
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  productDetails: {
    ...typography.styles.bodySmall,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  productCategory: {
    ...typography.styles.caption,
    color: colors.text.tertiary,
  },
  productActions: {
    flexDirection: 'row',
  },
  // Action button styles removed - using standardized buttonStyles.iconSmall
  actionIcon: {
    ...typography.styles.lg,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '90%',
    justifyContent: 'center',
  },
  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.background.surface,
    borderRadius: 16,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    ...typography.styles.h3,
    color: colors.text.primary,
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: colors.text.secondary,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: colors.background.surface,
    height: 44,
  },
  textInputDisabled: {
    backgroundColor: colors.gray[100],
    color: colors.text.tertiary,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.primary,
    marginBottom: 8,
  },
  emojiSelector: {
    marginBottom: 16,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emojiOptionSelected: {
    backgroundColor: colors.primary.background,
    borderWidth: 2,
    borderColor: colors.primary.main,
  },
  emojiOptionText: {
    fontSize: 20,
  },
  categorySelector: {
    marginBottom: 20,
  },
  categoryScrollContainer: {
    maxHeight: 80,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  categoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    margin: 4,
    minWidth: 60,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary.main,
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  categoryOptionTextSelected: {
    color: colors.background.surface,
  },
  addCategoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: colors.primary.main,
    alignItems: 'center',
    margin: 4,
    minWidth: 60,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.background.surface,
  },
  // Save button styles removed - using standardized buttonStyles.success

  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
  },
  tabContentText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCategoryButton: {
    backgroundColor: colors.primary.main,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.background.surface,
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
  },
  emptyProductsState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyProductsIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyProductsTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyProductsText: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  firstProductButton: {
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
  firstProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  setupButton: {
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
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },

});

export default ManageScreen;