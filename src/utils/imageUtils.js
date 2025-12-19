/**
 * Utility functions for handling product images
 */

const SUPABASE_STORAGE_URL = 'https://ywtllivhhicrkjbxteim.supabase.co/storage/v1/object/public/product-images';

/**
 * Get the display URL for a product image
 * Handles both Supabase URLs and local image paths
 * 
 * @param {Object} product - Product object with image or image_url field
 * @returns {string|null} - Display URL or null if no image
 */
export const getProductImageUrl = (product) => {
  if (!product) {
    console.log('🖼️ [ImageUtils] No product provided');
    return null;
  }
  
  // Get image URL from either image_url field or image field
  const imageUrl = product.image_url || product.image;
  
  // Only log for products that should have images (reduce noise)
  if (imageUrl || product.name?.includes('test') || product.name?.includes('Test')) {
    console.log('🖼️ [ImageUtils] Product image check:', {
      productName: product.name,
      image_url: product.image_url,
      image: product.image,
      finalImageUrl: imageUrl,
      productKeys: Object.keys(product)
    });
  }
  
  if (!imageUrl) {
    // Only log missing images for first few products to avoid spam
    if (Math.random() < 0.1) { // 10% chance to log
      console.log('🖼️ [ImageUtils] No image URL found for product:', product.name);
    }
    return null;
  }
  
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http')) {
    console.log('🖼️ [ImageUtils] Using full URL:', imageUrl);
    return imageUrl;
  }
  
  // Otherwise, construct the Supabase URL
  const fullUrl = `${SUPABASE_STORAGE_URL}/${imageUrl}`;
  console.log('🖼️ [ImageUtils] Constructed Supabase URL:', fullUrl);
  return fullUrl;
};

/**
 * Get image URL from a path string
 * 
 * @param {string} imagePath - Image path or URL
 * @returns {string|null} - Display URL or null if no path
 */
export const getImageUrlFromPath = (imagePath) => {
  if (!imagePath) return null;
  
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http')) {
    return imagePath;
  }
  
  // Otherwise, construct the Supabase URL
  return `${SUPABASE_STORAGE_URL}/${imagePath}`;
};

/**
 * Check if an image URL is valid
 * 
 * @param {string} imageUrl - Image URL to validate
 * @returns {boolean} - True if URL appears valid
 */
export const isValidImageUrl = (imageUrl) => {
  if (!imageUrl || typeof imageUrl !== 'string') return false;
  
  // Check if it's a valid URL format
  try {
    new URL(imageUrl);
    return true;
  } catch {
    return false;
  }
};

/**
 * Extract the file path from a Supabase storage URL
 * 
 * @param {string} supabaseUrl - Full Supabase storage URL
 * @returns {string|null} - File path or null if not a Supabase URL
 */
export const extractPathFromSupabaseUrl = (supabaseUrl) => {
  if (!supabaseUrl || !supabaseUrl.includes('product-images')) return null;
  
  const parts = supabaseUrl.split('product-images/');
  return parts.length > 1 ? parts[1] : null;
};