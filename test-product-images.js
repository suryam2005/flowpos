/**
 * Test script to check product images in database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';

async function checkProductImages() {
  console.log('🔍 Checking Product Images in Database...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Fetch all products
    const { data: products, error } = await supabase
      .from('products')
      .select('*')
      .limit(10);

    if (error) {
      console.error('❌ Error fetching products:', error);
      return;
    }

    console.log(`📦 Found ${products.length} products\n`);

    products.forEach((product, index) => {
      console.log(`\n${index + 1}. ${product.name}`);
      console.log('   ID:', product.id);
      console.log('   image field:', product.image || '(empty)');
      console.log('   image_url field:', product.image_url || '(empty)');
      console.log('   Has image?:', !!(product.image || product.image_url));
      
      if (product.image_url) {
        console.log('   Full URL:', product.image_url.startsWith('http') 
          ? product.image_url 
          : `https://ywtllivhhicrkjbxteim.supabase.co/storage/v1/object/public/product-images/${product.image_url}`
        );
      }
    });

    const productsWithImages = products.filter(p => p.image || p.image_url);
    const productsWithoutImages = products.filter(p => !p.image && !p.image_url);

    console.log('\n\n📊 Summary:');
    console.log(`   Total products: ${products.length}`);
    console.log(`   With images: ${productsWithImages.length}`);
    console.log(`   Without images: ${productsWithoutImages.length}`);

    if (productsWithoutImages.length > 0) {
      console.log('\n⚠️ Products without images:');
      productsWithoutImages.forEach(p => {
        console.log(`   - ${p.name} (ID: ${p.id})`);
      });
    }

    if (productsWithImages.length > 0) {
      console.log('\n✅ Products with images:');
      productsWithImages.forEach(p => {
        console.log(`   - ${p.name}`);
        console.log(`     Image: ${p.image_url || p.image}`);
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkProductImages();