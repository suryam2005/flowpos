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

const ProductImagePicker = ({ image, onImageChange, productName = 'Product' }) => {
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
        onImageChange(result.assets[0].uri);
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

  const showImageOptions = () => {
    Alert.alert(
      'Product Image',
      'Choose how you want to add an image for your product',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Gallery', onPress: pickImage },
        ...(image ? [{ text: 'Remove Image', onPress: () => onImageChange(null), style: 'destructive' }] : [])
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
        <Text style={styles.changeText}>Change</Text>
      </View>
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
          ? 'Tap to change or remove the product image'
          : 'Add a photo to help customers identify your product'
        }
      </Text>
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
  helperText: {
    fontSize: 12,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
});

export default ProductImagePicker;