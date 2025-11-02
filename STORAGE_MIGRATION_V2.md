# Storage Migration to learning-materials-v2

## Overview
We have migrated from the old `learning-materials` bucket to a new `learning-materials-v2` bucket with improved Row-Level Security (RLS) policies that support private-by-default access with flexible public/private toggling.

## Architecture: Option A (Private-by-Default with Metadata Toggle)

### Key Features
- **Single private bucket**: `learning-materials-v2` (not publicly accessible)
- **Owner-based folder structure**: Files stored under `{userId}/YYYY/MM/DD/{uuid}-{filename}`
- **Metadata-driven visibility**: Files have `metadata.is_public` flag
- **Flexible sharing**: Support for `metadata.allowed_users` array

### RLS Policies Applied

#### Service Role (Full Access)
- Role: `service_role`
- Permissions: ALL operations
- Use: Server-side admin operations, fallback uploads

#### Authenticated Users - Insert
- Users can upload files only to their own folder (first path segment = `auth.uid()`)
- Bucket: `learning-materials-v2`

#### Authenticated Users - Update/Delete
- Users can update or delete only files in their own folder
- Constraint: `(storage.foldername(name))[1]::text = auth.uid()::text`

#### Authenticated Users - Read (Owner)
- Users can always read files in their own folder

#### Authenticated Users - Read (Authorized)
- Users can read a file if any of:
  1. They own it (folder matches `auth.uid()`)
  2. `metadata.is_public = true`
  3. Their `auth.uid()` is in `metadata.allowed_users` JSON array

#### Anonymous - Read (Public or Signed URLs)
- Anonymous users can read files when:
  1. File is in the `public/` top-level folder, OR
  2. `metadata.is_public = true`
- Signed URLs bypass RLS and work for any file regardless of policies

### Backend Changes

#### Configuration
- **File**: `php-backend/.env`
  - `SUPABASE_STORAGE_BUCKET=learning-materials-v2`
  
- **File**: `php-backend/src/Config/SupabaseConfig.php`
  - Default bucket updated to `learning-materials-v2`

#### Upload Flow
1. User uploads file via `POST /api/learning-materials`
2. Backend canonicalizes path: `{userId}/YYYY/MM/DD/{uuid}-{filename}`
3. File uploaded to `learning-materials-v2` with `x-metadata` header:
   ```json
   {"is_public": true/false}
   ```
4. DB record created with `storage_path` and `is_public` flag

#### Toggle Visibility (Update Flow)
1. User sends `PATCH /api/learning-materials/{id}` with `is_public: true/false`
2. Backend updates:
   - DB `learning_materials.is_public` field
   - Storage object metadata via `updateObjectMetadata()` method
3. RLS policies immediately reflect new visibility

### Testing Checklist

#### Private File Upload
- [ ] Upload file with `is_public=false`
- [ ] Verify owner can access via signed URL
- [ ] Verify other authenticated users cannot access (403)
- [ ] Verify anonymous users cannot access (403)

#### Public File Upload
- [ ] Upload file with `is_public=true`
- [ ] Verify owner can access
- [ ] Verify other authenticated users can access
- [ ] Verify anonymous users can access (if not using signed URLs)

#### Toggle Private → Public
- [ ] Upload private file
- [ ] Update with `is_public=true`
- [ ] Verify file becomes accessible to public

#### Toggle Public → Private
- [ ] Upload public file
- [ ] Update with `is_public=false`
- [ ] Verify file becomes restricted to owner only

#### Signed URLs (Always Work)
- [ ] Request signed URL for private file
- [ ] Verify signed URL works for anonymous access
- [ ] Request signed URL for public file
- [ ] Verify signed URL works

### SQL Applied
See: `php-backend/fix_storage_policies.sql`

All policies have been successfully applied to the Supabase project.

### Migration Notes
- Old bucket `learning-materials` is no longer used (can be deleted or kept as archive)
- No existing files were migrated (fresh start with v2)
- All new uploads will go to `learning-materials-v2`

### Troubleshooting

#### Upload fails with 403
- Check that RLS policies are applied in Supabase
- Verify user token is valid and matches the folder path
- Check `[UPLOAD DEBUG]` logs in PHP error log

#### Toggle doesn't work
- Verify `updateObjectMetadata()` is being called on update
- Check `[METADATA UPDATE]` logs
- Ensure service role key is configured in `.env`

#### Anonymous access blocked for public files
- Verify `metadata.is_public = true` is set on the Storage object
- Check that `anon_read_public_or_is_public` policy exists
- Test with signed URL as fallback

## Next Steps
1. Test private and public uploads
2. Test visibility toggling
3. Monitor PHP error logs for `[UPLOAD DEBUG]` and `[METADATA UPDATE]` entries
4. Once stable, delete old `learning-materials` bucket (optional)

---
**Date**: November 2, 2025  
**Bucket**: `learning-materials-v2` (private)  
**Policy Model**: Option A (Private-by-Default with Metadata)
