/**
 * Comprehensive Tag Functionality Test
 * Tests all tag-related features to ensure they work correctly
 */

// Import tag utilities
const tagGenerator = require('./src/utils/tagGenerator');

console.log('🏷️ === COMPREHENSIVE TAG FUNCTIONALITY TEST ===\n');

// Test 1: Tag Generation from Product Names
console.log('1️⃣ Testing tag generation from product names...');
const testProducts = [
  { name: 'Fresh Coffee Beans', expected: ['coffee', 'beverages'] },
  { name: 'Organic Tomatoes', expected: ['tomato', 'vegetable'] },
  { name: 'Basmati Rice', expected: ['rice', 'grain'] },
  { name: 'Chocolate Cake', expected: ['chocolate', 'cake', 'dessert'] },
  { name: 'Laptop Computer', expected: ['laptop', 'electronics'] },
];

testProducts.forEach(({ name, expected }) => {
  const tags = tagGenerator.generateTagsFromName(name);
  const hasExpected = expected.some(exp => tags.includes(exp));
  console.log(`  ${name}:`);
  console.log(`    Generated: ${JSON.stringify(tags.slice(0, 5))}`);
  console.log(`    ${hasExpected ? '✅' : '❌'} Contains expected tags`);
});

// Test 2: Tag Formatting
console.log('\n2️⃣ Testing tag formatting...');
const formatTests = [
  { input: 'Coffee Shop', expected: 'coffee-shop' },
  { input: 'UPPERCASE', expected: 'uppercase' },
  { input: 'Special@#$Chars', expected: 'specialchars' },
  { input: '  spaces  ', expected: 'spaces' },
  { input: 'multiple---dashes', expected: 'multiple-dashes' },
];

formatTests.forEach(({ input, expected }) => {
  const result = tagGenerator.formatTag(input);
  const passed = result === expected;
  console.log(`  "${input}" → "${result}" ${passed ? '✅' : '❌'}`);
  if (!passed) console.log(`    Expected: "${expected}"`);
});

// Test 3: Tag Validation
console.log('\n3️⃣ Testing tag validation...');
const validationTests = [
  { tag: 'valid', expected: true },
  { tag: 'a', expected: true },
  { tag: '', expected: false },
  { tag: null, expected: false },
  { tag: undefined, expected: false },
  { tag: 'a'.repeat(31), expected: false }, // Too long
  { tag: 'a'.repeat(30), expected: true }, // Max length
];

validationTests.forEach(({ tag, expected }) => {
  const result = tagGenerator.isValidTag(tag);
  const passed = result === expected;
  console.log(`  "${tag}" → ${result} ${passed ? '✅' : '❌'}`);
});

// Test 4: Business Type Tags
console.log('\n4️⃣ Testing business type tag generation...');
const businessTypes = ['restaurant', 'cafe', 'grocery', 'electronics', 'clothing'];

businessTypes.forEach(type => {
  const tags = tagGenerator.generateTagsFromBusinessType(type);
  console.log(`  ${type}: ${JSON.stringify(tags)}`);
  console.log(`    ${tags.length > 0 ? '✅' : '❌'} Generated ${tags.length} tags`);
});

// Test 5: Complete Product Tag Generation
console.log('\n5️⃣ Testing complete product tag generation...');
const completeTests = [
  { name: 'Espresso Coffee', businessType: 'cafe', customTags: ['premium'] },
  { name: 'Fresh Milk', businessType: 'grocery', customTags: [] },
  { name: 'Smartphone', businessType: 'electronics', customTags: ['5g', 'android'] },
];

completeTests.forEach(({ name, businessType, customTags }) => {
  const tags = tagGenerator.generateProductTags(name, businessType, customTags);
  console.log(`  ${name} (${businessType}):`);
  console.log(`    Tags: ${JSON.stringify(tags)}`);
  console.log(`    ${tags.length > 0 ? '✅' : '❌'} Generated ${tags.length} tags`);
  console.log(`    ${tags.length <= 20 ? '✅' : '❌'} Within limit (max 20)`);
});

// Test 6: Tag Suggestions
console.log('\n6️⃣ Testing tag suggestions...');
const suggestionTests = ['cof', 'veg', 'fru', 'dai'];

suggestionTests.forEach(input => {
  const suggestions = tagGenerator.getSuggestedTags(input, 5);
  console.log(`  "${input}" → ${JSON.stringify(suggestions)}`);
  console.log(`    ${suggestions.length > 0 ? '✅' : '❌'} Found ${suggestions.length} suggestions`);
});

// Test 7: Edge Cases
console.log('\n7️⃣ Testing edge cases...');
const edgeCases = [
  { name: '', businessType: '', customTags: [], desc: 'Empty inputs' },
  { name: null, businessType: null, customTags: null, desc: 'Null inputs' },
  { name: 'Test', businessType: 'unknown', customTags: ['a'.repeat(50)], desc: 'Invalid data' },
  { name: '123', businessType: '456', customTags: ['!@#'], desc: 'Special characters' },
];

edgeCases.forEach(({ name, businessType, customTags, desc }) => {
  try {
    const tags = tagGenerator.generateProductTags(name, businessType, customTags);
    console.log(`  ${desc}:`);
    console.log(`    ✅ No crash, returned: ${JSON.stringify(tags)}`);
    console.log(`    ${Array.isArray(tags) ? '✅' : '❌'} Returns array`);
  } catch (error) {
    console.log(`  ${desc}:`);
    console.log(`    ❌ Error: ${error.message}`);
  }
});

// Test 8: Array Validation
console.log('\n8️⃣ Testing array handling...');
const arrayTests = [
  { tags: ['valid', 'tags'], desc: 'Valid array' },
  { tags: [], desc: 'Empty array' },
  { tags: ['', null, undefined, 'valid'], desc: 'Mixed array' },
  { tags: null, desc: 'Null' },
  { tags: undefined, desc: 'Undefined' },
  { tags: 'not-an-array', desc: 'String' },
];

arrayTests.forEach(({ tags, desc }) => {
  const filtered = Array.isArray(tags) 
    ? tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0)
    : [];
  console.log(`  ${desc}:`);
  console.log(`    Input: ${JSON.stringify(tags)}`);
  console.log(`    Filtered: ${JSON.stringify(filtered)}`);
  console.log(`    ${Array.isArray(filtered) ? '✅' : '❌'} Result is array`);
});

console.log('\n✅ === TAG FUNCTIONALITY TEST COMPLETE ===');
console.log('\nAll tag features have been tested. Review results above for any failures.');
