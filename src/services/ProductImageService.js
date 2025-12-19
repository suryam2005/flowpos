import { createClient } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

class ProductImageService {
  constructor() {
    this.bucketName = 'product-images';
    this.supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
    this.supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';
    
    // Initialize Supabase client for direct storage access
    this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
  }

  /**
   * Get user ID from AsyncStorage
   */
  async getUserId() {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        return user.id || user.user_id || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  }

  /**
   * Pick image from gallery or camera
   */
  async pickImage() {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access media library is required');
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Square aspect ratio for product images
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0];
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Check if bucket exists (bucket should be created manually in Supabase dashboard)
   */
  async checkBucketExists() {
    try {
      // Check if bucket exists by trying to list files
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('', { limit: 1 });
      
      if (error) {
        console.warn('⚠️ [Storage] Bucket not accessible:', error.message);
        console.log('📋 [Storage] Please create the "product-images" bucket manually in Supabase dashboard');
        console.log('📋 [Storage] Bucket settings: Public = true, File size limit = 5MB');
        return false;
      }

      console.log('✅ [Storage] Bucket is accessible');
      return true;
    } catch (error) {
      console.error('❌ [Storage] Error checking bucket:', error);
      return false;
    }
  }

  /**
   * Upload image directly to Supabase storage using Supabase client
   */
  async uploadProductImage(imageUri, productId, userId = null) {
    try {
      console.log('📸 [Storage] Uploading product image to Supabase...', { imageUri, productId, userId });

      // Check if bucket is ready
      const bucketReady = await this.checkBucketExists();
      if (!bucketReady) {
        console.warn('⚠️ [Storage] Bucket not ready, falling back to local storage');
        throw new Error('Bucket not available');
      }

      // Get user ID if not provided
      if (!userId) {
        userId = await this.getUserId();
        if (!userId) {
          throw new Error('User ID not found');
        }
      }

      // Get file extension
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      
      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${userId}/${productId}_${timestamp}.${fileExtension}`;

      // Use fetch to get the file as ArrayBuffer (more reliable for React Native)
      let fileData;
      try {
        console.log('📁 [Storage] Reading file from URI:', imageUri);
        
        // Validate URI format
        if (!imageUri || typeof imageUri !== 'string') {
          throw new Error('Invalid image URI provided');
        }
        
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        fileData = await response.arrayBuffer();
        
        // Validate file size
        if (fileData.byteLength === 0) {
          throw new Error('File is empty');
        }
        
        if (fileData.byteLength > 10 * 1024 * 1024) { // 10MB limit
          throw new Error('File is too large (max 10MB)');
        }
        
        console.log('✅ [Storage] File read successfully, size:', fileData.byteLength, 'bytes');
      } catch (fetchError) {
        console.error('❌ [Storage] Error reading file:', fetchError);
        throw new Error(`Failed to read image file: ${fetchError.message}`);
      }

      // Upload using Supabase client (direct storage, no auth required)
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(fileName, fileData, {
          contentType: `image/${fileExtension}`,
          upsert: true,
        });

      if (error) {
        console.error('❌ [Storage] Upload failed:', error);
        console.error('❌ [Storage] Error details:', {
          message: error.message,
          statusCode: error.statusCode,
          error: error.error
        });
        throw new Error(`Upload failed: ${error.message}`);
      }

      console.log('✅ [Storage] Upload successful:', data);

      // Get public URL
      const { data: publicUrlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(fileName);
      
      const publicUrl = publicUrlData.publicUrl;
      
      console.log('✅ [Storage] Image uploaded successfully:', publicUrl);
      
      return {
        path: fileName,
        url: publicUrl,
        success: true,
      };
    } catch (error) {
      console.error('❌ [Storage] Error uploading image:', error);
      
      // Fallback: return local URI for development
      console.log('📱 [Storage] Falling back to local URI for development');
      const timestamp = Date.now();
      const fileExtension = imageUri.split('.').pop() || 'jpg';
      const fallbackPath = `${userId || 'unknown'}/${productId}_${timestamp}.${fileExtension}`;
      
      return {
        path: fallbackPath,
        url: imageUri, // Return local URI as fallback
        success: true,
        fallback: true,
      };
    }
  }

  /**
   * Delete image from Supabase storage using Supabase client
   */
  async deleteProductImage(imagePath) {
    try {
      if (!imagePath) {
        return { success: true }; // Nothing to delete
      }

      console.log('🗑️ [Storage] Deleting product image:', imagePath);

      // Delete using Supabase client
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([imagePath]);

      if (error && error.message !== 'The resource was not found') {
        console.error('❌ [Storage] Delete failed:', error);
        // Don't throw error for delete failures, just log them
        console.warn('⚠️ [Storage] Could not delete image, continuing...');
      }

      console.log('✅ [Storage] Image delete completed');
      
      return { success: true };
    } catch (error) {
      console.error('❌ [Storage] Error deleting image:', error);
      // Don't throw error for delete failures
      return { success: true };
    }
  }

  /**
   * Update product image (delete old, upload new)
   */
  async updateProductImage(oldImageUrl, newImageUri, productId, userId = null) {
    try {
      console.log('🔄 [Storage] Updating product image...');

      // Get user ID if not provided
      if (!userId) {
        userId = await this.getUserId();
      }

      // Extract path from old URL if it exists
      let oldImagePath = null;
      if (oldImageUrl && oldImageUrl.includes(this.bucketName)) {
        const urlParts = oldImageUrl.split(`${this.bucketName}/`);
        if (urlParts.length > 1) {
          oldImagePath = urlParts[1];
        }
      }

      // Upload new image
      const uploadResult = await this.uploadProductImage(newImageUri, productId, userId);

      // Delete old image if it exists and upload was successful
      if (oldImagePath && uploadResult.success && !uploadResult.fallback) {
        try {
          await this.deleteProductImage(oldImagePath);
        } catch (deleteError) {
          console.warn('⚠️ [Storage] Could not delete old image:', deleteError);
          // Don't fail the update if old image deletion fails
        }
      }

      return uploadResult;
    } catch (error) {
      console.error('❌ [Storage] Error updating image:', error);
      throw error;
    }
  }

  /**
   * Get image URL from path (for existing images)
   */
  getImageUrl(imagePath) {
    if (!imagePath) return null;
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http')) {
      return imagePath;
    }
    
    // Use Supabase client to get public URL
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(imagePath);
    
    return data.publicUrl;
  }
}

// Create singleton instance
const productImageService = new ProductImageService();

export default productImageService;