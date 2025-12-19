/**
 * Test script to add a product with image to database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';

async function addTestProductWithImage() {
  console.log('🧪 Adding Test Product with Image...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test product data
    const testProduct = {
      name: 'Test Coffee with Image',
      price: 150,
      stock: 25,
      track_stock: true,
      tags: ['beverages', 'coffee', 'hot'],
      image_url: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop', // Sample coffee image
      user_id: 'test-user-123',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📦 Adding product:', testProduct.name);
    
    // Insert product
    const { data, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select();

    if (error) {
      console.error('❌ Error adding product:', error);
      return;
    }

    console.log('✅ Product added successfully!');
    console.log('📋 Product details:', data[0]);
    
    // Verify the product was added
    const { data: allProducts, error: fetchError } = await supabase
      .from('products')
      .select('*');

    if (fetchError) {
      console.error('❌ Error fetching products:', fetchError);
      return;
    }

    console.log(`\n📊 Total products in database: ${allProducts.length}`);
    allProducts.forEach((product, index) => {
      console.log(`${index + 1}. ${product.name}`);
      console.log(`   Image URL: ${product.image_url || '(no image)'}`);
      console.log(`   Price: ₹${product.price}`);
      console.log(`   Stock: ${product.stock}`);
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

addTestProductWithImage();