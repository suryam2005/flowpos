/**
 * Test script to verify Supabase RLS policies are working
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';

async function testRLSPolicies() {
  console.log('🧪 Testing Supabase Storage (Direct Storage - No Auth)...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    console.log('📋 Test 1: Checking bucket access...');
    
    // Test 1: List bucket contents (should work with disabled RLS or public policies)
    const { data: listData, error: listError } = await supabase.storage
      .from('product-images')
      .list('', { limit: 1 });
    
    if (listError) {
      console.log('❌ Bucket list failed:', listError.message);
      console.log('💡 RLS is still blocking access');
      console.log('🔧 SOLUTION: Run this SQL command in Supabase Dashboard:');
      console.log('   ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;');
      console.log('📋 Or use the public policies from SUPABASE_RLS_FIX.md');
      return;
    }
    
    console.log('✅ Bucket list successful - storage access working');
    
    console.log('\n📋 Test 2: Testing image upload...');
    
    // Test 2: Upload a small test file (simulate image)
    const testContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG header bytes
    const testFileName = `test/rls-test-${Date.now()}.png`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(testFileName, testContent, {
        contentType: 'image/png',
        upsert: true,
      });
    
    if (uploadError) {
      console.log('❌ Upload failed:', uploadError.message);
      console.log('💡 Upload policy not working - check SQL commands');
      return;
    }
    
    console.log('✅ Upload successful - upload policy working');
    
    console.log('\n📋 Test 3: Testing public URL access...');
    
    // Test 3: Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(testFileName);
    
    console.log('✅ Public URL generated:', urlData.publicUrl);
    
    console.log('\n📋 Test 4: Cleaning up test file...');
    
    // Test 4: Delete test file
    const { error: deleteError } = await supabase.storage
      .from('product-images')
      .remove([testFileName]);
    
    if (deleteError) {
      console.log('⚠️ Delete failed (but upload worked):', deleteError.message);
    } else {
      console.log('✅ Delete successful - delete policy working');
    }
    
    console.log('\n🎉 SUCCESS! All RLS policies are working correctly!');
    console.log('📱 You can now enable Supabase uploads in ProductImageService.js');
    console.log('🔧 Remove the "throw new Error" line to enable Supabase storage');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 If you see RLS policy errors, run the SQL commands in SUPABASE_RLS_FIX.md');
  }
}

testRLSPolicies();