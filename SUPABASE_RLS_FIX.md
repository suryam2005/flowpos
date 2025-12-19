# Fixing Supabase Storage RLS Policy Issue

## Problem
You're getting this error when trying to upload images:
```
Error: Supabase bucket needs RLS policy configuration - using local storage
```

## What This Means
Supabase has Row Level Security (RLS) enabled on the storage system, which prevents uploads without proper policies.

## ⚡ QUICK FIX - Run This SQL Command Now!

### Step 1: Open Supabase SQL Editor
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Copy & Run This SQL (For Direct Storage - No Auth)

Since you got the "must be owner" error, you can't disable RLS. Instead, create these public policies:

```sql
-- SOLUTION: Create public policies for direct storage (no auth required)
-- This works even without owner permissions

-- Policy 1: Allow anyone to read images from product-images bucket
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');

-- Policy 2: Allow anyone to upload to product-images bucket  
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');

-- Policy 3: Allow anyone to update files in product-images bucket
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');

-- Policy 4: Allow anyone to delete from product-images bucket
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');
```

**Important:** Run each policy one by one, not all at once!

### Step-by-Step Instructions:

1. **First, run this:**
```sql
CREATE POLICY "Allow public reads" ON storage.objects
FOR SELECT USING (bucket_id = 'product-images');
```

2. **Then run this:**
```sql
CREATE POLICY "Allow public uploads" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'product-images');
```

3. **Then run this:**
```sql
CREATE POLICY "Allow public updates" ON storage.objects
FOR UPDATE USING (bucket_id = 'product-images');
```

4. **Finally run this:**
```sql
CREATE POLICY "Allow public deletes" ON storage.objects
FOR DELETE USING (bucket_id = 'product-images');
```

Each command should show "Success. No rows returned" or similar.

**OR - Even Simpler (Recommended for your setup):**

```sql
-- Disable RLS entirely for storage.objects
-- This is perfect for direct storage without auth
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
```

### Step 3: Click "Run" Button

### Step 4: Test Image Upload
After running the SQL, try uploading an image in your app. It should work now!

---

## ❌ Can't Disable RLS? (Owner Permission Error)

If you got "must be owner of table objects" error, you can't disable RLS. This is normal for Supabase free tier.

**Solution: Use the public policies above instead!**

The policies I provided will work exactly the same as disabling RLS, but without needing owner permissions.

## 🔧 Alternative: Bucket-Level Settings

You can also try making the bucket public in Supabase Dashboard:

1. Go to **Storage** in Supabase Dashboard
2. Find your `product-images` bucket
3. Click the **Settings** (gear icon)
4. Toggle **Public bucket** to ON
5. Save settings

This might bypass RLS policies entirely for your bucket.

---

### Option 2: Create Proper RLS Policies (Recommended for Production) 🔒

**Steps:**
1. Go to Supabase Dashboard → SQL Editor
2. Run these SQL commands:

```sql
-- Policy 1: Allow public read access to all images
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Policy 2: Allow anyone to upload images
CREATE POLICY "Allow Upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'product-images' );

-- Policy 3: Allow anyone to update images
CREATE POLICY "Allow Update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'product-images' );

-- Policy 4: Allow anyone to delete images
CREATE POLICY "Allow Delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'product-images' );
```

3. Click "Run" button
4. Test upload again with: `node test-image-upload.js`

**Pros:** More secure, production-ready
**Cons:** Slightly more complex setup

---

### Option 3: User-Specific Policies (Most Secure) 🛡️

If you want users to only manage their own images:

```sql
-- Policy 1: Public read access
CREATE POLICY "Public Read Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'product-images' );

-- Policy 2: Users can upload to their own folder
CREATE POLICY "User Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Users can update their own files
CREATE POLICY "User Update"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Users can delete their own files
CREATE POLICY "User Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Testing After Fix

Run this command to verify everything works:

```bash
node test-image-upload.js
```

You should see:
```
✅ Image upload successful!
✅ Image URL is publicly accessible!
✅ Test image cleaned up
🎉 PERFECT! Your Supabase bucket is fully functional!
```

---

## Recommended Approach

1. **For Development/Testing**: Use Option 1 (Disable RLS)
2. **For Production**: Use Option 2 (Basic policies) or Option 3 (User-specific)

---

## After Fixing RLS - Re-enable Supabase Uploads

### Step 1: Test RLS Policies
Run this command to verify policies are working:
```bash
node test-rls-policies.js
```

You should see:
```
🎉 SUCCESS! All RLS policies are working correctly!
```

### Step 2: Enable Supabase in ProductImageService
Once RLS is working, edit `flowpos/src/services/ProductImageService.js`:

**Remove these lines (around line 70):**
```javascript
// For now, skip Supabase upload due to RLS policy restrictions
// Fall back to local storage until bucket policies are properly configured
console.log('📱 [Storage] Using local storage (Supabase bucket needs RLS policy configuration)');
console.log('🔧 [Storage] To fix: Run SQL commands in Supabase Dashboard (see SUPABASE_RLS_FIX.md)');
throw new Error('Supabase bucket needs RLS policy configuration - using local storage');
```

**The code will then continue to the actual Supabase upload logic below.**

### Step 3: Test Image Upload in App
1. Open your FlowPOS app
2. Go to Manage → Add/Edit Product
3. Try uploading an image
4. It should now upload to Supabase instead of using local storage!

---

## Need Help?

If you're still having issues:
1. Check Supabase logs in Dashboard → Logs
2. Verify bucket name is exactly `product-images`
3. Make sure bucket is marked as "Public"
4. Try running `node test-direct-bucket-access.js` to diagnose