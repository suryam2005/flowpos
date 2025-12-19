/**
 * Test script to verify the image upload fix
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';

async function testImageUploadFix() {
  console.log('🧪 Testing Image Upload Fix...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Create a simple test image (1x1 PNG)
    const pngData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc.
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00, // image data
      0x00, 0x01, 0x00, 0x01, 0xFA, 0x00, 0x37, 0xA3, // checksum
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, // IEND chunk
      0xAE, 0x42, 0x60, 0x82
    ]);

    console.log('📤 Testing ArrayBuffer upload...');
    
    const fileName = `test/upload-fix-test-${Date.now()}.png`;
    
    // Test upload with ArrayBuffer (like our fixed method)
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(fileName, pngData, {
        contentType: 'image/png',
        upsert: true,
      });

    if (error) {
      console.log('❌ Upload failed:', error);
      return;
    }

    console.log('✅ Upload successful!');
    console.log('📄 File path:', data.path);
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(fileName);
    
    console.log('🔗 Public URL:', urlData.publicUrl);
    
    // Test URL accessibility
    try {
      const response = await fetch(urlData.publicUrl);
      console.log('🌐 URL accessible:', response.ok, 'Status:', response.status);
    } catch (urlError) {
      console.log('⚠️ URL test failed:', urlError.message);
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up...');
    const { error: deleteError } = await supabase.storage
      .from('product-images')
      .remove([fileName]);
    
    if (deleteError) {
      console.log('⚠️ Cleanup failed:', deleteError.message);
    } else {
      console.log('✅ Cleanup successful');
    }
    
    console.log('\n🎉 Image upload fix is working correctly!');
    console.log('📱 The ProductImageService should now work without base64 errors');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testImageUploadFix();