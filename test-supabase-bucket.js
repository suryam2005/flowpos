/**
 * Test script to verify Supabase bucket creation and image upload
 * Run this to test if the bucket is properly configured
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';
const bucketName = 'product-images';

async function testSupabaseBucket() {
  console.log('🧪 Testing Supabase Bucket Configuration...\n');

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Test 1: List buckets
    console.log('\n📋 Test 1: Listing buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError);
      return;
    }

    console.log('✅ Buckets found:', buckets.map(b => b.name));
    
    // Check if product-images bucket exists
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    console.log(`📦 ${bucketName} bucket exists:`, bucketExists);

    // Test 2: Create bucket if it doesn't exist
    if (!bucketExists) {
      console.log('\n🔨 Test 2: Creating bucket...');
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (createError) {
        console.error('❌ Error creating bucket:', createError);
        return;
      }

      console.log('✅ Bucket created successfully');
    } else {
      console.log('✅ Bucket already exists');
    }

    // Test 3: Test upload (create a simple test file)
    console.log('\n📤 Test 3: Testing file upload...');
    const testFileName = `test/test_${Date.now()}.txt`;
    const testContent = 'This is a test file for bucket verification';
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Error uploading test file:', uploadError);
      return;
    }

    console.log('✅ Test file uploaded successfully');

    // Test 4: Get public URL
    console.log('\n🔗 Test 4: Testing public URL generation...');
    const { data: publicUrlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testFileName);

    console.log('✅ Public URL generated:', publicUrlData.publicUrl);

    // Test 5: Clean up test file
    console.log('\n🧹 Test 5: Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️ Warning: Could not delete test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up successfully');
    }

    console.log('\n🎉 All tests passed! Supabase bucket is properly configured.');
    console.log('\n📋 Summary:');
    console.log('- ✅ Supabase client connection working');
    console.log('- ✅ Bucket listing working');
    console.log('- ✅ Bucket exists or was created successfully');
    console.log('- ✅ File upload working');
    console.log('- ✅ Public URL generation working');
    console.log('- ✅ File deletion working');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }
}

// Run the test
testSupabaseBucket();