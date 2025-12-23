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
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import CustomAlert from '../../components/CustomAlert';
import TagInput from '../../components/TagInput';
import ProductImagePicker from '../../components/ProductImagePicker';
import { generateProductTags } from '../../utils/tagGenerator';
import { colors } from '../../styles/colors';
import LoadingSpinner from '../../components/LoadingSpinner';
import productsService from '../../services/ProductsService';
import NetworkService from '../../services/NetworkService';

// Enhanced product validation and security utilities
const ProductValidation = {
  // Sanitize input to prevent XSS and injection attacks
  sanitizeInput: (input) => {
    if (typeof input !== 'string') return '';
    return input
      .trim()
      .replace(/[<>\"'&]/g, '') // Remove potentially dangerous characters
      .substring(0, 200); // Limit length to prevent buffer overflow
  },

  // Product name validation
  validateProductName: (name) => {
    const sanitized = ProductValidation.sanitizeInput(name);
    if (!sanitized) return { isValid: false, error: 'Product name is required' };
    if (sanitized.length < 2) return { isValid: false, error: 'Product name must be at least 2 characters' };
    if (sanitized.length > 100) return { isValid: false, error: 'Product name is too long (max 100 characters)' };
    
    // Check for valid characters (letters, numbers, spaces, basic punctuation)
    const validNameRegex = /^[a-zA-Z0-9\s\-\.\&\'\,\(\)\/]+$/;
    if (!validNameRegex.test(sanitized)) {
      return { isValid: false, error: 'Product name contains invalid characters' };
    }
    
    return { isValid: true, sanitized };
  },

  // Price validation
  validatePrice: (price) => {
    if (!price || price.toString().trim() === '') {
      return { isValid: false, error: 'Price is required' };
    }
    
    const priceStr = price.toString().trim();
    const priceNum = parseFloat(priceStr);
    
    if (isNaN(priceNum)) {
      return { isValid: false, error: 'Please enter a valid price' };
    }
    
    if (priceNum <= 0) {
      return { isValid: false, error: 'Price must be greater than 0' };
    }
    
    if (priceNum > 999999) {
      return { isValid: false, error: 'Price is too high (max ₹999,999)' };
    }
    
    // Check for reasonable decimal places (max 2)
    if (priceStr.includes('.') && priceStr.split('.')[1].length > 2) {
      return { isValid: false, error: 'Price can have maximum 2 decimal places' };
    }
    
    return { isValid: true, sanitized: priceNum };
  },

  // Stock validation
  validateStock: (stock, trackStock) => {
    if (!trackStock) return { isValid: true, sanitized: 0 }; // Stock not tracked
    
    if (!stock || stock.toString().trim() === '') {
      return { isValid: false, error: 'Stock quantity is required when stock tracking is enabled' };
    }
    
    const stockStr = stock.toString().trim();
    const stockNum = parseInt(stockStr);
    
    if (isNaN(stockNum)) {
      return { isValid: false, error: 'Please enter a valid stock quantity' };
    }
    
    if (stockNum < 0) {
      return { isValid: false, error: 'Stock quantity cannot be negative' };
    }
    
    if (stockNum > 999999) {
      return { isValid: false, error: 'Stock quantity is too high (max 999,999)' };
    }
    
    // Check for decimal values (stock should be whole numbers)
    if (stockStr.includes('.')) {
      return { isValid: false, error: 'Stock quantity must be a whole number' };
    }
    
    return { isValid: true, sanitized: stockNum };
  },

  // Tags validation
  validateTags: (tags) => {
    if (!Array.isArray(tags)) return { isValid: true, sanitized: [] };
    
    const sanitizedTags = tags
      .map(tag => ProductValidation.sanitizeInput(tag))
      .filter(tag => tag.length > 0)
      .slice(0, 10); // Limit to 10 tags
    
    // Check each tag length
    for (const tag of sanitizedTags) {
      if (tag.length > 30) {
        return { isValid: false, error: 'Tag names must be 30 characters or less' };
      }
    }
    
    return { isValid: true, sanitized: sanitizedTags };
  },

  // Image URL validation
  validateImageUrl: (imageUrl) => {
    if (!imageUrl || !imageUrl.trim()) return { isValid: true, sanitized: '' }; // Optional field
    
    const sanitized = imageUrl.trim();
    if (sanitized.length > 500) return { isValid: false, error: 'Image URL is too long' };
    
    // Basic URL validation
    const urlRegex = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
    if (!urlRegex.test(sanitized)) {
      return { isValid: false, error: 'Please provide a valid image URL' };
    }
    
    return { isValid: true, sanitized };
  },

  // Complete product validation
  validateProduct: (productData) => {
    const errors = {};
    let isValid = true;

    // Validate name
    const nameValidation = ProductValidation.validateProductName(productData.name);
    if (!nameValidation.isValid) {
      errors.name = nameValidation.error;
      isValid = false;
    }

    // Validate price
    const priceValidation = ProductValidation.validatePrice(productData.price);
    if (!priceValidation.isValid) {
      errors.price = priceValidation.error;
      isValid = false;
    }

    // Validate stock
    const stockValidation = ProductValidation.validateStock(productData.stock, productData.trackStock);
    if (!stockValidation.isValid) {
      errors.stock = stockValidation.error;
      isValid = false;
    }

    // Validate tags
    const tagsValidation = ProductValidation.validateTags(productData.tags);
    if (!tagsValidation.isValid) {
      errors.tags = tagsValidation.error;
      isValid = false;
    }

    // Validate image
    const imageValidation = ProductValidation.validateImageUrl(productData.image);
    if (!imageValidation.isValid) {
      errors.image = imageValidation.error;
      isValid = false;
    }

    return {
      isValid,
      errors,
      sanitizedData: isValid ? {
        name: nameValidation.sanitized,
        price: priceValidation.sanitized,
        stock: stockValidation.sanitized,
        trackStock: productData.trackStock,
        tags: tagsValidation.sanitized,
        image: imageValidation.sanitized
      } : null
    };
  }
};

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
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingSamples, setIsAddingSamples] = useState(false);

  // Validation error states
  const [validationErrors, setValidationErrors] = useState({});

  // Clear validation error for specific field
  const clearValidationError = (field) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Sample products to help users get started quickly with high-quality images
  const sampleProducts = {
    'Restaurant/Cafe': [
      { 
        name: 'Coffee', 
        price: '80', 
        emoji: '☕', 
        category: 'Beverages', 
        tags: ['Beverages', 'Hot Drinks'],
        image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Sandwich', 
        price: '120', 
        emoji: '🥪', 
        category: 'Food', 
        tags: ['Food', 'Snacks'],
        image_url: 'https://images.unsplash.com/photo-1553909489-cd47e0ef937f?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Burger', 
        price: '150', 
        emoji: '🍔', 
        category: 'Food', 
        tags: ['Food', 'Main Course'],
        image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Tea', 
        price: '50', 
        emoji: '🍵', 
        category: 'Beverages', 
        tags: ['Beverages', 'Hot Drinks'],
        image_url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop&auto=format'
      },
    ],
    'Retail Store': [
      { 
        name: 'T-Shirt', 
        price: '500', 
        emoji: '👕', 
        category: 'Clothing', 
        tags: ['Clothing', 'Casual Wear'],
        image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Jeans', 
        price: '1200', 
        emoji: '👖', 
        category: 'Clothing', 
        tags: ['Clothing', 'Bottom Wear'],
        image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Shoes', 
        price: '2000', 
        emoji: '👟', 
        category: 'Footwear', 
        tags: ['Footwear', 'Sports'],
        image_url: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Cap', 
        price: '300', 
        emoji: '🧢', 
        category: 'Accessories', 
        tags: ['Accessories', 'Headwear'],
        image_url: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400&h=400&fit=crop&auto=format'
      },
    ],
    'Grocery Store': [
      { 
        name: 'Rice (1kg)', 
        price: '80', 
        emoji: '🍚', 
        category: 'Grains', 
        tags: ['Grains', 'Staples'],
        image_url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Milk (1L)', 
        price: '60', 
        emoji: '🥛', 
        category: 'Dairy', 
        tags: ['Dairy', 'Fresh'],
        image_url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Bread', 
        price: '40', 
        emoji: '🍞', 
        category: 'Bakery', 
        tags: ['Bakery', 'Fresh'],
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Eggs (12pc)', 
        price: '120', 
        emoji: '🥚', 
        category: 'Dairy', 
        tags: ['Dairy', 'Fresh'],
        image_url: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=400&h=400&fit=crop&auto=format'
      },
    ],
    'Fashion & Apparel': [
      { 
        name: 'Dress', 
        price: '800', 
        emoji: '👗', 
        category: 'Clothing', 
        tags: ['Clothing', 'Women'],
        image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Handbag', 
        price: '1500', 
        emoji: '👜', 
        category: 'Accessories', 
        tags: ['Accessories', 'Bags'],
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Sunglasses', 
        price: '600', 
        emoji: '🕶️', 
        category: 'Accessories', 
        tags: ['Accessories', 'Eyewear'],
        image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Watch', 
        price: '2500', 
        emoji: '⌚', 
        category: 'Accessories', 
        tags: ['Accessories', 'Jewelry'],
        image_url: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop&auto=format'
      },
    ],
    'Electronics': [
      { 
        name: 'Smartphone', 
        price: '15000', 
        emoji: '📱', 
        category: 'Mobile', 
        tags: ['Mobile', 'Electronics'],
        image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Headphones', 
        price: '2000', 
        emoji: '🎧', 
        category: 'Audio', 
        tags: ['Audio', 'Electronics'],
        image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Laptop', 
        price: '45000', 
        emoji: '💻', 
        category: 'Computers', 
        tags: ['Computers', 'Electronics'],
        image_url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Power Bank', 
        price: '1200', 
        emoji: '🔋', 
        category: 'Accessories', 
        tags: ['Accessories', 'Electronics'],
        image_url: 'https://images.unsplash.com/photo-1609592806787-3d9c1b8e5e8e?w=400&h=400&fit=crop&auto=format'
      },
    ],
    'default': [
      { 
        name: 'Product 1', 
        price: '100', 
        emoji: '📦', 
        category: 'General', 
        tags: ['General'],
        image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Product 2', 
        price: '200', 
        emoji: '📦', 
        category: 'General', 
        tags: ['General'],
        image_url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Product 3', 
        price: '150', 
        emoji: '📦', 
        category: 'General', 
        tags: ['General'],
        image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=400&h=400&fit=crop&auto=format'
      },
      { 
        name: 'Product 4', 
        price: '250', 
        emoji: '📦', 
        category: 'General', 
        tags: ['General'],
        image_url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=400&fit=crop&auto=format'
      },
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
        setBusinessType(store.business_type || store.businessType || 'Restaurant/Cafe');
      }
    } catch (error) {
      console.error('Error loading business type:', error);
    }
  };

  const getSampleProducts = () => {
    // Map business types to sample product keys
    const businessTypeMap = {
      'Restaurant': 'Restaurant/Cafe',
      'Cafe': 'Restaurant/Cafe',
      'Restaurant/Cafe': 'Restaurant/Cafe',
      'Retail Store': 'Retail Store',
      'Grocery Store': 'Grocery Store',
      'Fashion & Apparel': 'Fashion & Apparel',
      'Electronics': 'Electronics',
      'Beauty & Wellness': 'default',
      'Pharmacy': 'default',
      'Bookstore': 'default',
      'Professional Services': 'default',
      'Cafe & Bakery': 'Restaurant/Cafe',
      'Automotive': 'default',
      'Other': 'default'
    };
    
    const mappedType = businessTypeMap[businessType] || 'default';
    return sampleProducts[mappedType] || sampleProducts['default'];
  };

  const handleAddSampleProducts = async () => {
    if (isAddingSamples) {
      console.log('⚠️ Sample products already being added, ignoring duplicate request');
      return;
    }

    setIsAddingSamples(true);
    
    try {
      console.log('🚨 Adding sample products via backend API...');
      console.log('📊 Business Type:', businessType);
      
      // Call backend API to add sample products
      const response = await NetworkService.apiCall('/store/sample-products', {
        method: 'POST',
        body: JSON.stringify({
          business_type: businessType
        }),
      });

      // Check if response is a Response object and parse it
      let parsedResponse;
      if (response && typeof response.json === 'function') {
        parsedResponse = await response.json();
      } else {
        parsedResponse = response;
      }

      console.log('📡 API Response:', parsedResponse);

      if (parsedResponse && parsedResponse.success) {
        console.log(`✅ Sample products added via API: ${parsedResponse.created}/${parsedResponse.total}`);
        
        // Refresh products list from Supabase
        await refreshProductsList();

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        setAlertConfig({
          title: 'Sample Products Added! 🎉',
          message: `Added ${parsedResponse.created} sample products with images to get you started. You can edit or delete these later.`,
          type: 'success',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
        setShowAlert(true);
      } else {
        // If API fails, try fallback local sample products
        console.log('⚠️ API failed, trying local fallback...');
        await addLocalSampleProducts();
      }
      
    } catch (error) {
      console.error('❌ Error adding sample products:', error);
      
      // Enhanced error handling with specific error messages
      let errorMessage = 'Failed to add sample products. Please try again.';
      let showRetry = true;
      
      if (error.message.includes('Cannot connect to server') || 
          error.message.includes('Network request failed') ||
          error.message.includes('Cannot connect to backend server')) {
        errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
      } else if (error.message.includes('apiCall is not a function') || 
                 error.message.includes('NetworkService') ||
                 typeof NetworkService.apiCall !== 'function') {
        errorMessage = 'Network service not available. Please restart the app and try again.';
        showRetry = false;
      } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        errorMessage = 'Authentication expired. Please log out and log back in.';
        showRetry = false;
      } else if (error.message.includes('500') || error.message.includes('Internal Server Error')) {
        errorMessage = 'Server error. Please try again in a few moments.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const alertButtons = showRetry ? [
        { text: 'Retry', onPress: () => handleAddSampleProducts() },
        { 
          text: 'Add Locally', 
          onPress: async () => {
            setIsAddingSamples(true);
            try {
              await addLocalSampleProducts();
            } catch (localError) {
              Alert.alert('Error', 'Failed to add sample products. Please try adding products manually.');
            } finally {
              setIsAddingSamples(false);
            }
          }
        },
        { text: 'Cancel', style: 'cancel' }
      ] : [
        { text: 'OK', style: 'default' }
      ];
      
      Alert.alert('Error Adding Sample Products', errorMessage, alertButtons);
    } finally {
      setIsAddingSamples(false);
    }
  };

  const addLocalSampleProducts = async () => {
    try {
      console.log('🔄 Adding sample products locally as fallback...');
      const sampleProductsToAdd = getSampleProducts();
      
      let addedCount = 0;
      for (const sampleProduct of sampleProductsToAdd) {
        try {
          const productData = {
            name: sampleProduct.name,
            price: parseInt(sampleProduct.price),
            stock_quantity: 50, // Default stock
            track_stock: true,
            category: sampleProduct.category || 'General',
            tags: sampleProduct.tags || ['Sample'],
            description: `Sample ${sampleProduct.category || 'product'} for ${businessType}`,
            image_url: sampleProduct.image_url || '',
          };

          await productsService.createProduct(productData);
          addedCount++;
        } catch (productError) {
          console.error('❌ Failed to add sample product:', sampleProduct.name, productError);
        }
      }

      if (addedCount > 0) {
        await refreshProductsList();
        
        setAlertConfig({
          title: 'Sample Products Added! 🎉',
          message: `Added ${addedCount} sample products to get you started. You can edit or delete these later.`,
          type: 'success',
          buttons: [{ text: 'Great!', style: 'default' }],
        });
        setShowAlert(true);
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error('Failed to add any sample products');
      }
    } catch (error) {
      console.error('❌ Local sample products fallback failed:', error);
      throw error;
    }
  };

  const refreshProductsList = async () => {
    try {
      const updatedProducts = await productsService.getProducts();
      console.log(`✅ Refreshed products list: ${updatedProducts.length} products`);
      setProducts(updatedProducts);
      
      // Also save to AsyncStorage for onboarding completion tracking
      await AsyncStorage.setItem('products', JSON.stringify(updatedProducts));
      if (updatedProducts.length >= 4) {
        await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
        await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
        console.log('✅ Onboarding marked as completed');
      }
      
      return updatedProducts;
    } catch (refreshError) {
      console.error('❌ Failed to refresh products list:', refreshError);
      // Return existing products if refresh fails
      return products;
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
    // Comprehensive validation using ProductValidation utility
    const validation = ProductValidation.validateProduct(formData);
    
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      const firstError = Object.values(validation.errors)[0];
      Alert.alert('Validation Error', firstError);
      return;
    }

    // Clear any existing validation errors
    setValidationErrors({});

    setIsCreating(true);
    try {
      const sanitizedData = validation.sanitizedData;
      
      let finalTags = sanitizedData.tags;
      if (finalTags.length === 0) {
        finalTags = generateProductTags(sanitizedData.name, businessType);
      }

      const productData = {
        name: sanitizedData.name,
        price: sanitizedData.price,
        stock_quantity: sanitizedData.trackStock ? sanitizedData.stock : 0,
        track_stock: sanitizedData.trackStock,
        category: finalTags[0] || 'General',
        tags: finalTags,
        description: `Custom product created during onboarding`,
        image_url: sanitizedData.image || '',
      };

      console.log('🚨 Creating custom product in Supabase:', productData);
      await productsService.createProduct(productData);

      // Refresh products list
      await refreshProductsList();

      setModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error('❌ Error creating custom product:', error);
      
      // Enhanced error handling
      let errorMessage = 'Failed to create product. Please try again.';
      if (error.message.includes('Network')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message.includes('duplicate') || error.message.includes('already exists')) {
        errorMessage = 'A product with this name already exists. Please use a different name.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
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
      
      // Refresh products list
      await refreshProductsList();
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
    } catch (error) {
      console.error('❌ Error deleting product:', error);
      Alert.alert('Error', 'Failed to delete product. Please try again.');
    }
  };

  const handleContinue = async () => {
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

    try {
      // Mark onboarding as completed
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      console.log('✅ Onboarding marked as completed');
      
      // Navigate to POS screen with tour enabled
      navigation.replace('Main', { 
        screen: 'POS',
        params: { startTour: true }
      });
    } catch (error) {
      console.error('❌ Error during continue:', error);
      // Still navigate even if AsyncStorage fails
      navigation.replace('Main', { 
        screen: 'POS',
        params: { startTour: true }
      });
    }
  };

  const handleSkip = async () => {
    try {
      // Mark onboarding as completed even with fewer products
      // Skip does NOT add any sample products - user explicitly chose to skip
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('productsOnboardingCompleted', 'true');
      console.log('✅ Onboarding marked as completed (skipped without adding products)');
      
      // Navigate directly to POS screen without adding any products
      navigation.replace('Main', { 
        screen: 'POS',
        params: { startTour: true }
      });
    } catch (error) {
      console.error('❌ Error during skip:', error);
      // Still navigate even if AsyncStorage fails
      navigation.replace('Main', { 
        screen: 'POS',
        params: { startTour: true }
      });
    }
  };

  const renderProduct = ({ item, index }) => (
    <View style={styles.productCard} key={item.id}>
      <View style={styles.productInfo}>
        <Ionicons name="cube-outline" size={24} color="#6b7280" />
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
        <Ionicons name="trash-outline" size={18} color="#ef4444" />
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
            <Ionicons name="cube-outline" size={64} color="#6b7280" />
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
            style={[
              styles.sampleButton,
              isAddingSamples && styles.sampleButtonDisabled
            ]}
            onPress={handleAddSampleProducts}
            activeOpacity={0.8}
            disabled={isAddingSamples}
          >
            <Text style={[
              styles.sampleButtonText,
              isAddingSamples && styles.sampleButtonTextDisabled
            ]}>
              {isAddingSamples ? '⏳ Adding Products...' : '✨ Add Sample Products'}
            </Text>
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
        {products.length >= 4 ? (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Start POS Tour
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.8}
            >
              <Text style={styles.skipButtonText}>
                Skip for Now
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.continueButtonDisabled}
              onPress={handleContinue}
              disabled={true}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonTextDisabled}>
                Add {4 - products.length} More Products
              </Text>
            </TouchableOpacity>
          </View>
        )}
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

                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.textInput, validationErrors.name && styles.inputError]}
                    placeholder="Product Name"
                    value={formData.name}
                    onChangeText={(text) => {
                      setFormData({ ...formData, name: text });
                      clearValidationError('name');
                    }}
                    maxLength={100}
                    editable={!isCreating}
                  />
                  {validationErrors.name && (
                    <Text style={styles.errorText}>{validationErrors.name}</Text>
                  )}
                </View>

                <View style={styles.inputGroup}>
                  <TextInput
                    style={[styles.textInput, validationErrors.price && styles.inputError]}
                    placeholder="Price (₹)"
                    value={formData.price}
                    onChangeText={(text) => {
                      setFormData({ ...formData, price: text });
                      clearValidationError('price');
                    }}
                    keyboardType="numeric"
                    maxLength={10}
                    editable={!isCreating}
                  />
                  {validationErrors.price && (
                    <Text style={styles.errorText}>{validationErrors.price}</Text>
                  )}
                </View>

                {formData.trackStock && (
                  <View style={styles.inputGroup}>
                    <TextInput
                      style={[styles.textInput, validationErrors.stock && styles.inputError]}
                      placeholder="Stock Quantity"
                      value={formData.stock}
                      onChangeText={(text) => {
                        setFormData({ ...formData, stock: text });
                        clearValidationError('stock');
                      }}
                      keyboardType="numeric"
                      maxLength={8}
                      editable={!isCreating}
                    />
                    {validationErrors.stock && (
                      <Text style={styles.errorText}>{validationErrors.stock}</Text>
                    )}
                  </View>
                )}

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

      {/* Loading Overlay */}
      {(isCreating || isAddingSamples) && <LoadingSpinner />}
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
    backgroundColor: colors.gray[200],
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
  sampleButtonDisabled: {
    backgroundColor: colors.gray[400],
  },
  sampleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  sampleButtonTextDisabled: {
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
  footerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  continueButton: {
    backgroundColor: colors.success.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonDisabled: {
    flex: 1,
    backgroundColor: colors.gray[400],
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  continueButtonTextDisabled: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.background.surface,
  },
  skipButton: {
    flex: 1,
    backgroundColor: colors.background.surface,
    borderWidth: 2,
    borderColor: colors.primary.main,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary.main,
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
    backgroundColor: '#ffffff',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputError: {
    borderColor: '#EF4444',
    borderWidth: 1.5,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
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