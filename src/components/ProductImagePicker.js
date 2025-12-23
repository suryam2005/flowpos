import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import productImageService from '../services/ProductImageService';
import LoadingOverlay from './LoadingOverlay';
import { colors } from '../styles/colors';

const ProductImagePicker = ({ 
  image, 
  onImageChange, 
  productName = 'Product',
  productId = null,
  userId = null,
  mode = 'local' // 'local' or 'supabase'
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to add product images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    setIsLoading(true);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const selectedImageUri = result.assets[0].uri;
        
        // Always return the local URI first - upload will happen when product is saved
        onImageChange(selectedImageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take product photos.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        onImageChange(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete image from Supabase storage if it's a Supabase URL
  const handleDeleteImage = async () => {
    setIsLoading(true);
    try {
      // Check if image is a Supabase URL
      if (image && image.includes('supabase')) {
        console.log('🗑️ Deleting image from Supabase storage...');
        try {
          // Extract the path from the URL
          // URL format: https://xxx.supabase.co/storage/v1/object/public/product-images/userId/productId_timestamp.jpg
          const bucketName = 'product-images';
          if (image.includes(bucketName)) {
            const urlParts = image.split(`${bucketName}/`);
            if (urlParts.length > 1) {
              const imagePath = urlParts[1];
              console.log('🗑️ Extracted image path:', imagePath);
              await productImageService.deleteProductImage(imagePath);
              console.log('✅ Image deleted from Supabase storage');
            }
          }
        } catch (deleteError) {
          console.error('⚠️ Error deleting from Supabase:', deleteError);
          // Continue anyway - the image URL will be cleared from the product
        }
      }
      
      // Clear the image in the form (this will be saved when product is updated)
      onImageChange(null);
      console.log('✅ Image cleared from form');
      
    } catch (error) {
      console.error('Error deleting image:', error);
      Alert.alert('Error', 'Failed to delete image. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Product Image',
      'Choose how you want to add an image for your product',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
      ]
    );
  };

  const renderPlaceholder = () => (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderIcon}>📷</Text>
      <Text style={styles.placeholderText}>Add Photo</Text>
      <Text style={styles.placeholderSubtext}>Optional</Text>
    </View>
  );

  const renderImage = () => (
    <View style={styles.imageContainer}>
      <Image source={{ uri: image }} style={styles.image} />
      <View style={styles.imageOverlay}>
        <Text style={styles.changeText}>Tap to Change</Text>
      </View>
      {/* Delete button */}
      <TouchableOpacity
        style={styles.deleteImageButton}
        onPress={() => {
          Alert.alert(
            'Remove Image',
            'Are you sure you want to remove this product image?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Remove', 
                style: 'destructive',
                onPress: handleDeleteImage
              }
            ]
          );
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={16} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Product Image</Text>
      
      <TouchableOpacity
        style={[styles.imageButton, isLoading && styles.imageButtonDisabled]}
        onPress={showImageOptions}
        activeOpacity={0.7}
        disabled={isLoading}
      >
        {image ? renderImage() : renderPlaceholder()}
      </TouchableOpacity>

      <Text style={styles.helperText}>
        {image 
          ? 'Tap image to change, or tap 🗑️ to remove'
          : 'Add a photo to help customers identify your product'
        }
      </Text>

      {/* Loading Overlay */}
      <LoadingOverlay 
        visible={isLoading} 
        message="Processing image..." 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  imageButton: {
    width: 120,
    height: 120,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    marginBottom: 8,
  },
  imageButtonDisabled: {
    opacity: 0.6,
  },
  placeholder: {
    alignItems: 'center',
  },
  placeholderIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  placeholderSubtext: {
    fontSize: 12,
    color: '#9ca3af',
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    alignItems: 'center',
  },
  changeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  deleteImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default ProductImagePicker;