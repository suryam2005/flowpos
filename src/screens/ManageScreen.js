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
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import InventoryScreen from './manage/InventoryScreen';
import StoreSettingsScreen from './manage/StoreSettingsScreen';
import MaterialsScreen from './manage/MaterialsScreen';
import { PageLoader, InlineLoader } from '../components/LoadingSpinner';
import { usePageLoading, useTabLoading } from '../hooks/usePageLoading';
import featureService from '../services/FeatureService';
import TagInput from '../components/TagInput';
import ProductImagePicker from '../components/ProductImagePicker';
import { generateProductTags } from '../utils/tagGenerator';


const ManageScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [storeSetupCompleted, setStoreSetupCompleted] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  
  // Page and tab loading states
  const { isLoading, finishLoading, contentStyle } = usePageLoading(true, 1000);
  const { activeTab, loadingTab, switchTab, isTabLoading } = useTabLoading();
  
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

  const tabs = ['Products', 'Inventory', 'Store Settings', 'Materials'];

  // No animations needed

  useEffect(() => {
    loadProducts();
    const unsubscribe = navigation.addListener('focus', loadProducts);

    // Initialize active tab
    if (!activeTab) {
      switchTab('Products', 0); // No loading for initial tab
    }

    // No animations needed

    return unsubscribe;
  }, [navigation]);

  const loadProducts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    try {
      // No animation delays needed

      // Load products and store setup status
      const [storedProducts, setupCompleted, storeData] = await Promise.all([
        AsyncStorage.getItem('products'),
        AsyncStorage.getItem('storeSetupCompleted'),
        AsyncStorage.getItem('storeInfo')
      ]);

      if (storedProducts) {
        setProducts(JSON.parse(storedProducts));
      }
      
      setStoreSetupCompleted(!!setupCompleted);
      if (storeData) {
        setStoreInfo(JSON.parse(storeData));
      }
      
      // Finish loading on initial load
      if (!isRefresh) {
        finishLoading();
      }
    } catch (error) {
      console.error('Error loading products:', error);
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

    // Check if store setup is completed
    try {
      const storeSetupCompleted = await AsyncStorage.getItem('storeSetupCompleted');
      const storeInfo = await AsyncStorage.getItem('storeInfo');
      
      if (!storeSetupCompleted || !storeInfo) {
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
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      stock: product.trackStock ? product.stock.toString() : '',
      trackStock: product.trackStock !== false, // Default to true if not specified
      tags: product.tags || [],
      image: product.image || null,
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
          onPress: () => {
            const updatedProducts = products.filter(p => p.id !== productId);
            saveProducts(updatedProducts);
          },
        },
      ]
    );
  };

  const handleSaveProduct = () => {
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

    if (!formData.stock) {
      Alert.alert('Validation Error', 'Stock quantity is required.');
      return;
    }

    const price = parseInt(formData.price);
    const stock = parseInt(formData.stock);

    if (isNaN(price) || price <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price (greater than 0).');
      return;
    }

    // Validate stock only if tracking is enabled
    if (formData.trackStock && (isNaN(stock) || stock < 0)) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity (0 or greater).');
      return;
    }

    // Generate tags if none provided
    let finalTags = formData.tags;
    if (finalTags.length === 0) {
      finalTags = generateProductTags(formData.name.trim(), businessType);
    }

    let updatedProducts;

    if (editingProduct) {
      // Update existing product
      updatedProducts = products.map(p =>
        p.id === editingProduct.id
          ? {
            ...p,
            name: formData.name.trim(),
            price,
            stock: formData.trackStock ? stock : null,
            trackStock: formData.trackStock,
            tags: finalTags,
            image: formData.image,
          }
          : p
      );
    } else {
      // Add new product
      const newProduct = {
        id: Date.now().toString(),
        name: formData.name.trim(),
        price,
        stock: formData.trackStock ? stock : null,
        trackStock: formData.trackStock,
        tags: finalTags,
        image: formData.image,
      };
      updatedProducts = [...products, newProduct];
    }

    saveProducts(updatedProducts);
    setModalVisible(false);
    
    // Show success message
    const isFirstProduct = products.length === 0;
    const message = editingProduct 
      ? 'Product updated successfully!' 
      : isFirstProduct 
        ? 'Welcome! Your first product has been added.' 
        : 'Product added successfully!';
    
    Alert.alert('Success', message);
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productCard}>
      <View style={styles.productImage}>
        {item.image ? (
          <Image source={{ uri: item.image }} style={styles.productImageStyle} />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Text style={styles.productImagePlaceholderText}>📦</Text>
          </View>
        )}
      </View>
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetails}>
          ₹{item.price}{item.trackStock ? ` • Stock: ${item.stock}` : ' • No stock tracking'}
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
          style={styles.actionButton}
          onPress={() => handleEditProduct(item)}
        >
          <Text style={styles.actionIcon}>✏️</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteProduct(item.id)}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
        { name: 'Test Burger', quantity: 2, price: 150, emoji: '🍔' },
        { name: 'Test Coffee', quantity: 1, price: 80, emoji: '☕' },
        { name: 'Test Fries', quantity: 1, price: 60, emoji: '🍟' },
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
    navigation.navigate('Invoice', { orderData: testOrderData });
  };



  return (
    <SafeAreaView style={styles.container}>
      <PageLoader visible={isLoading} text="Loading manage..." />
      
      <View style={[styles.content, contentStyle]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.titleContainer}
            onLongPress={handleDevClearData}
            delayLongPress={3000}
          >
            <Text style={styles.title}>Manage</Text>
            {storeSetupCompleted && storeInfo && (
              <Text style={styles.storeSubtitle}>{storeInfo.name}</Text>
            )}
          </TouchableOpacity>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.subscriptionButton}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.subscriptionIcon}>👑</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => switchTab(tab)}
            disabled={isTabLoading(tab)}
          >
            {isTabLoading(tab) ? (
              <InlineLoader visible={true} size="small" color="#2563eb" />
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
                  <Text style={styles.setupWarningText}>⚠️ Setup Required</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.addButton,
                !storeSetupCompleted && styles.addButtonDisabled
              ]}
              onPress={handleAddProduct}
            >
              <Text style={[
                styles.addButtonText,
                !storeSetupCompleted && styles.addButtonTextDisabled
              ]}>
                {!storeSetupCompleted ? 'Setup First' : 'Add Product'}
              </Text>
            </TouchableOpacity>
          </View>

          {products.length === 0 ? (
            <View style={styles.emptyProductsState}>
              {!storeSetupCompleted ? (
                <>
                  <Text style={styles.emptyProductsIcon}>🏪</Text>
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
                  <Text style={styles.emptyProductsIcon}>📦</Text>
                  <Text style={styles.emptyProductsTitle}>
                    Welcome, {storeInfo?.name || 'Store Owner'}!
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
                  tintColor="#8b5cf6"
                  colors={['#8b5cf6']}
                  progressBackgroundColor="#ffffff"
                  title="Pull to refresh products..."
                  titleColor="#6b7280"
                />
              }
            />
          )}
        </>
      )}

      {activeTab === 'Inventory' && <InventoryScreen />}

      {activeTab === 'Store Settings' && <StoreSettingsScreen />}

      {activeTab === 'Materials' && <MaterialsScreen />}

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
                      onValueChange={(value) => setFormData({ ...formData, trackStock: value })}
                      trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
                      thumbColor={formData.trackStock ? '#2563eb' : '#9ca3af'}
                    />
                  </View>
                  {formData.trackStock && (
                    <TextInput
                      style={styles.textInput}
                      placeholder="Stock Quantity"
                      value={formData.stock}
                      onChangeText={(text) => setFormData({ ...formData, stock: text })}
                      keyboardType="numeric"
                    />
                  )}
                </View>

                {/* Product Image */}
                <ProductImagePicker
                  image={formData.image}
                  onImageChange={(image) => setFormData({ ...formData, image })}
                  productName={formData.name}
                />

                {/* Product Tags */}
                <TagInput
                  tags={formData.tags}
                  onTagsChange={(tags) => setFormData({ ...formData, tags })}
                  productName={formData.name}
                  businessType={businessType}
                />

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.saveButtonText}>
                    {editingProduct ? 'Update Product' : 'Add Product'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>




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
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  storeSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subscriptionButton: {
    padding: 8,
    backgroundColor: '#fef3c7',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  subscriptionIcon: {
    fontSize: 16,
  },
  settingsButton: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 20,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
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
    borderBottomColor: '#2563eb',
  },
  tabText: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    flexWrap: 'wrap',
    lineHeight: 14,
    numberOfLines: 2,
  },
  tabTextActive: {
    fontSize: 11,
    color: '#2563eb',
    fontWeight: '600',
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
    backgroundColor: '#ffffff',
  },
  productsHeaderLeft: {
    flex: 1,
  },
  productsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  setupWarning: {
    marginTop: 4,
  },
  setupWarningText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  addButtonTextDisabled: {
    color: '#ffffff',
  },
  productsList: {
    padding: 20,
    paddingBottom: 140, // Reduced spacing
  },
  productCard: {
    backgroundColor: '#ffffff',
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
    borderColor: '#f3f4f6',
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
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  productImagePlaceholderText: {
    fontSize: 20,
  },
  productTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  productTag: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  productTagText: {
    fontSize: 10,
    color: '#1e40af',
    fontWeight: '500',
  },
  moreTags: {
    fontSize: 10,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  stockTrackingContainer: {
    marginBottom: 16,
  },
  stockTrackingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    paddingRight: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  productDetails: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    color: '#9ca3af',
  },
  productActions: {
    flexDirection: 'row',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  actionIcon: {
    fontSize: 18,
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
    paddingVertical: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
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
    color: '#1f2937',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#ffffff',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
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
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
  },
  emojiOptionSelected: {
    backgroundColor: '#dbeafe',
    borderWidth: 2,
    borderColor: '#2563eb',
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
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    margin: 4,
    minWidth: 60,
  },
  categoryOptionSelected: {
    backgroundColor: '#2563eb',
  },
  categoryOptionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  categoryOptionTextSelected: {
    color: '#ffffff',
  },
  addCategoryOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    margin: 4,
    minWidth: 60,
  },
  addCategoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  tabContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  tabContentTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  tabContentText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  newCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  addCategoryButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addCategoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },

  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
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
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyProductsText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  firstProductButton: {
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
  firstProductButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  setupButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  setupButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
});

export default ManageScreen;