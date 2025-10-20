# Learning Materials ↔ Profiles Embed Log

**Last updated:** 2025-10-20

## Issue Snapshot

- **Error:** `Could not embed because more than one relationship was found for 'learning_materials' and 'profiles'`
- **Context:** `/api/learning-materials` GET in `LearningMaterialsController::index`
- **Root Cause:** `learning_materials` has two FK columns (`user_id`, `created_by`) pointing to `profiles.id`. PostgREST needs an explicit relationship selector when embedding profile data.

## Schema Notes

| Column | References | Constraint |
| --- | --- | --- |
| `learning_materials.user_id` | `profiles.id` | `learning_materials_user_id_fkey`
| `learning_materials.created_by` | `profiles.id` | `learning_materials_created_by_fkey`

Multiple foreign keys between the same tables trigger the PostgREST ambiguity warning unless the desired relationship is disambiguated in the `select` clause.

## Implemented Fix History

1. **Option 1 – Explicit embed (2025-10-20 AM)**
  - Added `profiles!learning_materials_user_id_fkey` to the select list.
  - Result: PostgREST still returned `Could not embed...` on production; rolled back.

2. **Option 2 – Disable embed + fallback (2025-10-20 PM)**
    - Removed profile embed from the select list and relied on controller’s secondary `/profiles` fetch.
    - Extended fallback to consider both `user_id` and `created_by` owner ids.
    - Upload response now guards against missing `profiles` data to avoid warnings.

3. **Option 1b – Explicit alias embed (2025-10-20 PM)**
    - Restored embedding with `owner:profiles!learning_materials_user_id_fkey(username)` to disambiguate competing FKs.
    - Retained manual `/profiles` fallback if Supabase still omits usernames.

4. **Option 1c – Renamed FK + embed (2025-10-20 PM)**
    - Dropped both legacy constraints and recreated a single FK (`fk_learning_materials_owner`) on `user_id` → `profiles.id`.
    - Updated controller select to `owner:profiles!fk_learning_materials_owner(username)` so PostgREST has an unambiguous path.

## Alternatives Considered

1. **Manual lookup only (Option 3)** – drop the embed and always issue a second REST call. Works but costs an extra round-trip.
2. **Schema cleanup (Option 4)** – rename or remove redundant FKs. Requires DB migration coordination.

## Verification Checklist

- [ ] Deploy backend to Render.
- [ ] Hit `/api/learning-materials` via curl or frontend and confirm 200 response.
- [ ] Verify response objects include `user_name` (from fallback lookup) and no PostgREST embed warnings.
- [ ] Monitor logs for lingering PostgREST warnings.

_Please append new findings or changes below to maintain history._




The error "Could not embed because more than one relationship was found for 'learning_materials' and 'profiles'" occurs because your Supabase database has multiple foreign key relationships between the learning_materials table and the profiles table.

The Problem
In your LearningMaterialsController.php, when you make the API call to fetch learning materials, Supabase's PostgREST is trying to automatically embed the related profile data but finds multiple possible relationships:

learning_materials.user_id → profiles.id

learning_materials.created_by → profiles.id (or some other relationship)

Solutions
Option 1: Fix the Database Query (Recommended)
Modify the buildListQuery method in LearningMaterialsController.php to be more explicit about the relationship:

php
private function buildListQuery(array $params, string $userId): array
{
    $filter = (string)($params['filter'] ?? 'all');
    $query = [
        // Be explicit about which relationship to use and only select needed fields
        'select' => 'material_id,title,description,content_type,file_url,estimated_duration,created_at,extracted_content,word_count,ai_quiz_generated,user_id,created_by,is_public,category,tags,like_count,download_count,ai_status,profiles!learning_materials_user_id_fkey(username)',
        'order' => 'created_at.desc',
    ];

    // ... rest of your existing filter logic

    return $query;
}
Option 2: Remove Automatic Embedding
Change the select statement to avoid any automatic embedding:

php
private function buildListQuery(array $params, string $userId): array
{
    $filter = (string)($params['filter'] ?? 'all');
    $query = [
        // Explicitly exclude any profile relationships
        'select' => 'material_id,title,description,content_type,file_url,estimated_duration,created_at,extracted_content,word_count,ai_quiz_generated,user_id,created_by,is_public,category,tags,like_count,download_count,ai_status',
        'order' => 'created_at.desc',
    ];

    // ... rest of your existing filter logic

    return $query;
}
Option 3: Use Your Existing Fallback Approach
Your current code already has a fallback that manually fetches profile data. You can force this path by ensuring the initial query doesn't attempt embedding:

php
private function buildListQuery(array $params, string $userId): array
{
    $filter = (string)($params['filter'] ?? 'all');
    $query = [
        // Completely avoid any profile relationships in the initial query
        'select' => 'material_id,title,description,content_type,file_url,estimated_duration,created_at,extracted_content,word_count,ai_quiz_generated,user_id,created_by,is_public,category,tags,like_count,download_count,ai_status',
        'order' => 'created_at.desc',
    ];

    switch ($filter) {
        case 'my':
            $query['user_id'] = 'eq.' . $userId;
            break;

        case 'community':
            $query['is_public'] = 'eq.true';
            break;

        case 'official':
            $query['is_public'] = 'eq.true';
            $query['category'] = 'not.is.null';
            break;

        default:
            $query['or'] = sprintf('(user_id.eq.%s,is_public.eq.true)', $userId);
            break;
    }

    $category = trim((string)($params['category'] ?? ''));
    if ($category !== '' && strcasecmp($category, 'all') !== 0) {
        $query['category'] = 'eq.' . $category;
    }

    return $query;
}
Option 4: Database Schema Fix
If you have control over the database schema, you might want to:

Check what foreign key constraints exist:

sql
SELECT
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE 
    tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'learning_materials'
    AND ccu.table_name = 'profiles';
Consider removing or renaming one of the relationships if it's not needed.

Recommended Immediate Fix
Use Option 2 or Option 3 as they're the quickest to implement. Modify your buildListQuery method to use the explicit select without any profile relationships:

