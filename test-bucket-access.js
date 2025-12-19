/**
 * Simple test to check if the manually created bucket is accessible
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';
const bucketName = 'product-images';

async function testBucketAccess() {
  console.log('🧪 Testing Bucket Access...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Test 1: List buckets
    console.log('\n📋 Listing all buckets...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return;
    }

    console.log('✅ Buckets found:', buckets.map(b => `${b.name} (public: ${b.public})`));
    
    const bucket = buckets.find(b => b.name === bucketName);
    if (bucket) {
      console.log(`✅ ${bucketName} bucket found! Public: ${bucket.public}`);
    } else {
      console.log(`❌ ${bucketName} bucket not found`);
      return;
    }

    // Test 2: Try to list files in the bucket
    console.log('\n📂 Testing bucket access...');
    const { data: files, error: accessError } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });

    if (accessError) {
      console.error('❌ Cannot access bucket:', accessError.message);
      return;
    }

    console.log('✅ Bucket is accessible!');
    console.log(`📁 Current files in bucket: ${files.length}`);

    // Test 3: Try a simple upload
    console.log('\n📤 Testing upload...');
    const testContent = `Test upload at ${new Date().toISOString()}`;
    const testFileName = `test/access_test_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError.message);
      return;
    }

    console.log('✅ Upload successful!');

    // Test 4: Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testFileName);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    // Test 5: Clean up
    console.log('\n🧹 Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from(bucketName)
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️ Could not delete test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    console.log('\n🎉 SUCCESS! Bucket is fully functional!');
    console.log('\n📋 What this means:');
    console.log('- ✅ Product images can now be uploaded to Supabase');
    console.log('- ✅ Images will be accessible via public URLs');
    console.log('- ✅ The app will use cloud storage instead of local storage');
    console.log('- ✅ Images will sync across all user devices');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testBucketAccess();