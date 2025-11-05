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
AND table_name = 'material_ai_versions'
ORDER BY ordinal_position;

| column_name     | data_type                | is_nullable | column_default    | character_maximum_length | ordinal_position |
| --------------- | ------------------------ | ----------- | ----------------- | ------------------------ | ---------------- |
| ai_version_id   | uuid                     | NO          | gen_random_uuid() | null                     | 1                |
| material_id     | uuid                     | NO          | null              | null                     | 2                |
| type            | text                     | NO          | null              | null                     | 3                |
| content         | jsonb                    | NO          | null              | null                     | 4                |
| model_name      | text                     | YES         | null              | null                     | 5                |
| model_params    | jsonb                    | YES         | null              | null                     | 6                |
| generated_by    | text                     | YES         | null              | null                     | 7                |
| created_at      | timestamp with time zone | YES         | now()             | null                     | 8                |
| created_by      | uuid                     | YES         | null              | null                     | 9                |
| run_id          | uuid                     | YES         | null              | null                     | 10               |
| content_preview | text                     | YES         | null              | null                     | 11               |
| language        | text                     | YES         | null              | null                     | 12               |
| confidence      | numeric                  | YES         | null              | null                     | 13               |
| content_hash    | text                     | YES         | null              | null                     | 14               |