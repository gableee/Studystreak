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
AND table_name = 'quiz_attempt_responses'
ORDER BY ordinal_position;

| column_name      | data_type                | is_nullable | column_default    | character_maximum_length | ordinal_position |
| ---------------- | ------------------------ | ----------- | ----------------- | ------------------------ | ---------------- |
| id               | uuid                     | NO          | gen_random_uuid() | null                     | 1                |
| attempt_id       | uuid                     | NO          | null              | null                     | 2                |
| question_id      | uuid                     | YES         | null              | null                     | 3                |
| answer           | jsonb                    | NO          | null              | null                     | 4                |
| is_correct       | boolean                  | YES         | null              | null                     | 5                |
| response_time_ms | integer                  | YES         | null              | null                     | 6                |
| created_at       | timestamp with time zone | YES         | now()             | null                     | 7                |