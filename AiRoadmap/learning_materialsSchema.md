-- Get all columns with detailed information
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'learning_materials'
ORDER BY ordinal_position;
| column_name       | data_type                | is_nullable | column_default     | character_maximum_length | ordinal_position |
| ----------------- | ------------------------ | ----------- | ------------------ | ------------------------ | ---------------- |
| material_id       | uuid                     | NO          | uuid_generate_v4() | null                     | 1                |
| title             | text                     | NO          | null               | null                     | 2                |
| description       | text                     | YES         | null               | null                     | 3                |
| content_type      | text                     | NO          | null               | null                     | 4                |
| file_url          | text                     | YES         | null               | null                     | 5                |
| created_at        | timestamp with time zone | YES         | now()              | null                     | 9                |
| extracted_content | text                     | YES         | null               | null                     | 10               |
| word_count        | integer                  | YES         | 0                  | null                     | 11               |
| ai_quiz_generated | boolean                  | YES         | false              | null                     | 12               |
| user_id           | uuid                     | YES         | null               | null                     | 13               |
| is_public         | boolean                  | YES         | false              | null                     | 14               |
| category          | text                     | YES         | null               | null                     | 15               |
| ai_status         | text                     | NO          | 'pending'::text    | null                     | 17               |
| download_count    | integer                  | YES         | 0                  | null                     | 19               |
| storage_path      | text                     | YES         | null               | null                     | 20               |
| uploader_name     | text                     | YES         | null               | null                     | 21               |
| uploader_email    | text                     | YES         | null               | null                     | 22               |
| file_name         | text                     | YES         | null               | null                     | 23               |
| size              | bigint                   | YES         | null               | null                     | 24               |
| mime              | text                     | YES         | null               | null                     | 25               |
| updated_at        | timestamp with time zone | YES         | now()              | null                     | 26               |
| deleted_at        | timestamp with time zone | YES         | null               | null                     | 27               |
| likes_count       | integer                  | YES         | 0                  | null                     | 28               |
| tags_jsonb        | jsonb                    | YES         | null               | null                     | 30               |
| ai_toggle_enabled | boolean                  | YES         | false              | null                     | 31               |
| ai_limit_count    | integer                  | YES         | 0                  | null                     | 32               |
| ai_summary        | text                     | YES         | null               | null                     | 33               |
| ai_keypoints      | jsonb                    | YES         | null               | null                     | 34               |
| ai_quiz           | jsonb                    | YES         | null               | null                     | 35               |
| ai_flashcards     | jsonb                    | YES         | null               | null                     | 36               |
| ai_generated_at   | timestamp with time zone | YES         | null               | null                     | 37               |