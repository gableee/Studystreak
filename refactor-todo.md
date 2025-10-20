# Learning Materials Refactor Checklist

## Completed
- [x] Move shared API error parsing into `studystreak/src/lib/apiError.ts` and adopt it in upload/list flows.
- [x] Update learning materials list to delegate filter/query params to the backend and surface preview actions in the UI.
- [x] Extract Supabase storage responsibilities into `App\Services\StorageService` for cleaner controller logic.
- [x] Add an in-app preview modal that renders PDF/PPTX resources without leaving the dashboard.

## In Progress / Upcoming
- [ ] Introduce a lightweight repository class around Supabase REST helpers to finish separating persistence from the controller.
- [ ] Add PHPUnit coverage for `StorageService` plus an automated smoke test that injects a short-lived Supabase JWT.
- [ ] Refresh signed URLs proactively (or regenerate on demand) so long-running sessions keep private materials accessible.
- [ ] Explore pagination / infinite scroll for large material libraries once backend filtering is fully server-side.
