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

## Implemented Fix (Option 1)

- Updated `buildListQuery()` in `src/Controllers/LearningMaterialsController.php`
  ```php
  'select' => '...,profiles!learning_materials_user_id_fkey(username)',
  ```
- Keeps the embedded profile scoped to the `user_id` foreign key and still allows the existing fallback lookup to populate usernames if Supabase omits them.

## Alternatives Considered

1. **Manual lookup only (Option 3)** – drop the embed and always issue a second REST call. Works but costs an extra round-trip.
2. **Schema cleanup (Option 4)** – rename or remove redundant FKs. Requires DB migration coordination.

## Verification Checklist

- [ ] Deploy backend to Render.
- [ ] Hit `/api/learning-materials` via curl or frontend and confirm 200 response.
- [ ] Spot-check response objects for `user_name` filled from embed or fallback.
- [ ] Monitor logs for lingering PostgREST warnings.

_Please append new findings or changes below to maintain history._
