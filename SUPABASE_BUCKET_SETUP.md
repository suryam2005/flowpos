# Supabase Bucket Setup Guide

## Creating the Product Images Bucket

Since the bucket creation requires admin privileges, you need to create it manually in the Supabase dashboard.

### Steps:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Login to your account
   - Select your project: `ywtllivhhicrkjbxteim`

2. **Navigate to Storage**
   - Click on "Storage" in the left sidebar
   - Click on "Buckets" tab

3. **Create New Bucket**
   - Click "New bucket" button
   - **Bucket name**: `product-images`
   - **Public bucket**: ✅ **Enable this** (very important!)
   - **File size limit**: `5242880` (5MB)
   - **Allowed MIME types**: 
     - `image/jpeg`
     - `image/jpg` 
     - `image/png`
     - `image/webp`

4. **Configure Bucket Policies (REQUIRED)**
   
   **Step 4a: Disable RLS for Storage (Simplest Option)**
   - Go to "Authentication" → "Policies" in Supabase dashboard
   - Find "storage" schema policies
   - Temporarily disable RLS for storage.objects table
   
   **OR Step 4b: Create Custom RLS Policies (Advanced)**
   - Create policy for SELECT: Allow public read access
   - Create policy for INSERT: Allow authenticated users to upload
   - Create policy for DELETE: Allow users to delete their own files
   
   **Recommended: Use Step 4a for development, Step 4b for production**

### Verification

After creating the bucket, you can test it by running:

```bash
cd flowpos
node test-supabase-bucket.js
```

### Expected Folder Structure

Once working, images will be organized as:

```
product-images/
├── user123/
│   ├── product456_1703123456789.jpg
│   └── product789_1703123567890.png
└── user456/
    └── product101_1703123678901.webp
```

### Troubleshooting

**If you get "Bucket not accessible" errors:**
1. Make sure the bucket is marked as "Public"
2. Check that the bucket name is exactly `product-images`
3. Verify your Supabase project URL and API key are correct

**If uploads fail with "row-level security policy" error:**
1. **Go to Supabase Dashboard → Authentication → Policies**
2. **Find "storage" schema → "objects" table**
3. **Temporarily disable RLS** OR **create proper policies**
4. **For development: Disable RLS on storage.objects table**
5. **For production: Create policies for SELECT (public), INSERT/DELETE (authenticated)**

**If uploads fail for other reasons:**
1. Check file size (must be under 5MB)
2. Verify file type is supported (jpg, png, webp)
3. Make sure you have proper internet connection

### Security Notes

- The bucket is public for reading (so product images can be displayed)
- Users can only upload to their own folder (userId/)
- File names include timestamps to prevent conflicts
- Old images are automatically deleted when products are updated