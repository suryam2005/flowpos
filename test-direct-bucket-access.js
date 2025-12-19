/**
 * Test direct bucket access without listing buckets
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';
const bucketName = 'product-images';

async function testDirectAccess() {
  console.log('🧪 Testing Direct Bucket Access...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('✅ Supabase client initialized');

    // Try to access the bucket directly
    console.log(`\n📂 Attempting to access "${bucketName}" bucket directly...`);
    
    const { data: files, error } = await supabase.storage
      .from(bucketName)
      .list('', { limit: 1 });

    if (error) {
      console.error('❌ Error accessing bucket:', error);
      console.log('\n📋 Possible issues:');
      console.log('1. Bucket name might be incorrect (check spelling)');
      console.log('2. Bucket might not be created yet');
      console.log('3. Bucket policies might need adjustment');
      console.log('\n💡 Please verify in Supabase Dashboard:');
      console.log('   - Go to Storage → Buckets');
      console.log('   - Check if "product-images" bucket exists');
      console.log('   - Verify it is marked as "Public"');
      return;
    }

    console.log('✅ Bucket is accessible!');
    console.log(`📁 Files in bucket: ${files.length}`);
    
    if (files.length > 0) {
      console.log('📄 Sample files:');
      files.slice(0, 5).forEach(file => {
        console.log(`   - ${file.name}`);
      });
    }

    // Try upload test
    console.log('\n📤 Testing upload capability...');
    const testContent = 'Hello from FlowPOS!';
    const testFileName = `test_${Date.now()}.txt`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(testFileName, testContent, {
        contentType: 'text/plain',
      });

    if (uploadError) {
      console.error('❌ Upload failed:', uploadError);
      console.log('\n📋 Upload failed. Possible reasons:');
      console.log('1. Bucket policies might restrict uploads');
      console.log('2. File size limits might be too restrictive');
      console.log('3. MIME type restrictions might be too strict');
      return;
    }

    console.log('✅ Upload successful!');
    console.log('📄 Uploaded file:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(testFileName);

    console.log('🔗 Public URL:', urlData.publicUrl);

    // Clean up
    console.log('\n🧹 Cleaning up...');
    await supabase.storage.from(bucketName).remove([testFileName]);
    console.log('✅ Cleanup complete');

    console.log('\n🎉 SUCCESS! Everything is working!');
    console.log('\n✅ Your Supabase bucket is ready for product images!');

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testDirectAccess();