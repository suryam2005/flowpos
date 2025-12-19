/**
 * Test script to check products table schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ywtllivhhicrkjbxteim.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3dGxsaXZoaGljcmtqYnh0ZWltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMTI4MzYsImV4cCI6MjA3NTg4ODgzNn0.01U4_Dm9dbMfqSE7JjRfajXOpPRiwHrwNgrvKwbmoKU';

async function checkProductsSchema() {
  console.log('🔍 Checking Products Table Schema...\n');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to insert a minimal product to see what columns are required/available
    const testProduct = {
      name: 'Schema Test Product',
      price: 100,
    };

    console.log('📦 Testing minimal product insert...');
    
    const { data, error } = await supabase
      .from('products')
      .insert([testProduct])
      .select();

    if (error) {
      console.log('❌ Insert error (this helps us understand the schema):', error);
      
      // Try to get existing products to see the structure
      console.log('\n🔍 Trying to fetch existing products to see schema...');
      const { data: existingProducts, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .limit(1);

      if (fetchError) {
        console.log('❌ Fetch error:', fetchError);
      } else if (existingProducts && existingProducts.length > 0) {
        console.log('✅ Found existing product structure:');
        console.log('📋 Available columns:', Object.keys(existingProducts[0]));
        console.log('📋 Sample product:', existingProducts[0]);
      } else {
        console.log('📋 No existing products found');
      }
    } else {
      console.log('✅ Product inserted successfully!');
      console.log('📋 Product structure:', data[0]);
      console.log('📋 Available columns:', Object.keys(data[0]));
      
      // Clean up test product
      await supabase
        .from('products')
        .delete()
        .eq('name', 'Schema Test Product');
      console.log('🧹 Test product cleaned up');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

checkProductsSchema();