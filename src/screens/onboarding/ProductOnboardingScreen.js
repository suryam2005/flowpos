import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';
import TagInput from '../../components/TagInput';
import ProductImagePicker from '../../components/ProductImagePicker';
import { generateProductTags } from '../../utils/tagGenerator';
import { colors } from '../../styles/colors';
import productsService from '../../services/ProductsService';

const ProductOnboardingScreen = ({ navigation }) => {
  const [products, setProducts] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [alertConfig, setAlertConfig] = useState({});
  const [businessType, setBusinessType] = useState('restaurant');
  
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    stock: '',
    trackStock: true,
    tags: [],
    image: null,
  });

  // Sample products to help users get started quickly
  const sampleProducts = {
    'Restaurant/Cafe': [
      { name: 'Coffee', price: '80', emoji: '☕', category: 'Beverages' },
      { name: 'Sandwich', price: '120', emoji: '🥪', category: 'Food' },
      { name: 'Burger', price: '150', emoji: '🍔', category: 'Food' },
      { name: 'Tea', price: '50', emoji: '🍵', category: 'Beverages' },
    ],
    'Retail Store': [
      { name: 'T-Shirt', price: '500', emoji: '👕', category: 'Clothing' },
      { name: 'Jeans', price: '1200', emoji: '👖', category: 'Clothing' },
      { name: 'Shoes', price: '2000', emoji: '👟', category: 'Footwear' },
      { name: 'Cap', price: '300', emoji: '🧢', category: 'Accessories' },
    ],
    'Grocery Store': [
      { name: 'Rice (1kg)', price: '80', emoji: '🍚', category: 'Grains' },
      { name: 'Milk (1L)', price: '60', emoji: '🥛', category: 'Dairy' },
      { name: 'Bread', price: '40', emoji: '🍞', category: 'Bakery' },
      { name: 'Eggs (12pc)', price: '120', emoji: '🥚', category: 'Dairy' },
    ],
    'default': [
      { name: 'Product 1', price: '100', emoji: '📦', category: 'General' },
      { name: 'Product 2', price: '200', emoji: '📦', category: 'General' },
      { name: 'Product 3', price: '150', emoji: '📦', category: 'General' },
      { name: 'Product 4', price: '250', emoji: '📦', category: 'General' },
    ]
  };

  useEffect(() => {
    loadBusinessType();
    loadExistingProducts();
  }, []);

  const loadExistingProducts = async () => {
    try {
      console.log('🚨 Loading existing products from Supabase...');
      const existingProducts = await productsService.getProducts();
      setProducts(existingProducts);
      console.log('✅ Loaded products from Supabase:', existingProducts.length);
    } catch (error) {
      console.error('❌ Error loading products from Supabase:', error);
      // Fallback to AsyncStorage if Supabase fails
      try {
        const localProducts = await AsyncStorage.getItem('products');
        if (localProducts) {
          setProducts(JSON.parse(localProducts));
        }
      } catch (localError) {
        console.error('❌ Error loading local products:', localError);
      }
    }
  };

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

  const getSampleProducts = () => {
    return sampleProducts[businessType] || sampleProducts['default'];
  };

  const handleAddSampleProducts = async () => {
    try {
      const samples = getSampleProducts();
      
      // Create products in Supabase using ProductsService
      for (const sample of samples) {
        const productData = {
          name: sample.name,
          price: parseInt(sample.price),
          stock_quantity: 50,
          category: sample.category,
          description: `Sample ${sample.category.toLowerCase()} product`,
        };
        
        console.log('🚨 Creating sample product in Supabase:', productData);
        await productsService.createProduct(productData);
      }

      // Refresh products list from Supabase
      const updatedProducts = await productsService.getProducts();
      setProducts(updatedProducts);
      
      // Also save to AsyncStorage for onboarding completion tracking
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      if (updatedProducts.length >= 4) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setAlertConfig({
        title: 'Sample Products Added! 🎉',
        message: `Added ${samples.length} sample products to get you started. You can edit or delete these later.`,
        type: 'success',
        buttons: [{ text: 'Great!', style: 'default' }],
      });
      setShowAlert(true);
      
    } catch (error) {
      console.error('❌ Error adding sample products:', error);
      Alert.alert('Error', 'Failed to add sample products. Please try again.');
    }
  };

  const handleAddCustomProduct = () => {
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

  const handleSaveProduct = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Product name is required.');
      return;
    }

    if (!formData.price || isNaN(formData.price) || parseInt(formData.price) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid price.');
      return;
    }

    if (formData.trackStock && (!formData.stock || isNaN(formData.stock) || parseInt(formData.stock) < 0)) {
      Alert.alert('Validation Error', 'Please enter a valid stock quantity.');
      return;
    }

    try {
      let finalTags = formData.tags;
      if (finalTags.length === 0) {
        finalTags = generateProductTags(formData.name.trim(), businessType);
      }

      const productData = {
        name: formData.name.trim(),
        price: parseInt(formData.price),
        stock_quantity: formData.trackStock ? parseInt(formData.stock) : 0,
        category: finalTags[0] || 'General',
        description: `Custom product created during onboarding`,
        image_url: formData.image || '',
      };

      console.log('🚨 Creating custom product in Supabase:', productData);
      await productsService.createProduct(productData);

      // Refresh products list from Supabase
      const updatedProducts = await productsService.getProducts();
      setProducts(updatedProducts);
      
      // Also save to AsyncStorage for onboarding completion tracking
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      if (updatedProducts.length >= 4) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      }

      setModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('❌ Error creating custom product:', error);
      Alert.alert('Error', 'Failed to create product. Please try again.');
    }
  };

  const saveProducts = async (updatedProducts) => {
    try {
      // Keep AsyncStorage for onboarding completion tracking only
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      
      // Mark onboarding as complete when we have at least 4 products
      if (updatedProducts.length >= 4) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      }
    } catch (error) {
      console.error('Error saving products to AsyncStorage:', error);
    }
  };

  const handleDeleteProduct = async (productId) => {
    try {
      console.log('🚨 Deleting product from Supabase:', productId);
      await productsService.deleteProduct(productId);
      
      // Refresh products list from Supabase
      const updatedProducts = await productsService.getProducts();
      setProducts(updatedProducts);
      
      // Update AsyncStorage for onboarding tracking
      await saveProducts(updatedProducts);
      
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      Alert.alert('Error', 'Failed to delete product. Please try again.');
    }
  };

  const handleContinue = () => {
    if (products.length < 4) {
      setAlertConfig({
        title: 'Add More Products',
        message: `You need at least 4 products to continue. You currently have ${products.length}. Add ${4 - products.length} more products to proceed.`,
        type: 'warning',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      setShowAlert(true);
      return;
    }

    // Navigate to POS screen with tour enabled
    navigation.replace('Main', { 
      screen: 'POS',
      params: { startTour: true }
    });
  };

  const renderProduct = ({ item, index }) => (
    <View style={styles.productCard} key={item.id}>
      <View style={styles.productInfo}>
        <Text style={styles.productEmoji}>{item.emoji || '📦'}</Text>
        <View style={styles.productDetails}>
          <Text style={styles.productName}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price}</Text>
          {item.trackStock && (
            <Text style={styles.productStock}>Stock: {item.stock}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => handleDeleteProduct(item.id)}
        activeOpacity={0.7}
      >
        <Text style={styles.deleteButtonText}>🗑️</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Your Products</Text>
        <Text style={styles.subtitle}>
          Add at least 4 products to start using FlowPOS. You can always add more later.
        </Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.min((products.length / 4) * 100, 100)}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {products.length} of 4 products added
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No Products Yet</Text>
            <Text style={styles.emptyText}>
              Add products to get started with your POS system
            </Text>
          </View>
        ) : (
          <View style={styles.productsList}>
            {products.map((item, index) => renderProduct({ item, index }))}
          </View>
        )}

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.sampleButton}
            onPress={handleAddSampleProducts}
            activeOpacity={0.8}
          >
            <Text style={styles.sampleButtonText}>✨ Add Sample Products</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customButton}
            onPress={handleAddCustomProduct}
            activeOpacity={0.8}
          >
            <Text style={styles.customButtonText}>➕ Add Custom Product</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            products.length < 4 && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={products.length < 4}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            products.length < 4 && styles.continueButtonTextDisabled
          ]}>
            {products.length >= 4 ? 'Start POS Tour' : `Add ${4 - products.length} More Products`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Add Product Modal */}
      <Modal
        animationType="slide"
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
                  <Text style={styles.modalTitle}>Add Product</Text>
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

                <TextInput
                  style={styles.textInput}
                  placeholder="Stock Quantity"
                  value={formData.stock}
                  onChangeText={(text) => setFormData({ ...formData, stock: text })}
                  keyboardType="numeric"
                />

                <ProductImagePicker
                  image={formData.image}
                  onImageChange={(image) => setFormData({ ...formData, image })}
                  productName={formData.name}
                />

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
                  <Text style={styles.saveButtonText}>Add Product</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        buttons={alertConfig.buttons}
        onClose={() => setShowAlert(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    backgroundColor: colors.background.surface,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  progressContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: colors.background.surface,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.gray['200'],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.success.main,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    fontWeight: '500',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  productsList: {
    marginBottom: 24,
  },
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f3f4f6',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  productDetails: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 2,
  },
  productStock: {
    fontSize: 12,
    color: '#6b7280',
  },
  deleteButton: {
    padding: 8,
  },
  deleteButtonText: {
    fontSize: 18,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 24,
  },
  sampleButton: {
    backgroundColor: colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sampleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  customButton: {
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  customButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
  },
  footer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  continueButton: {
    backgroundColor: colors.success.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: colors.gray['400'],
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  continueButtonTextDisabled: {
    color: colors.background.surface,
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
});

export default ProductOnboardingScreen;