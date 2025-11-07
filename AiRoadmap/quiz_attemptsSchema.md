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
AND table_name = 'quiz_attempts'
ORDER BY ordinal_position;

| column_name     | data_type                | is_nullable | column_default     | character_maximum_length | ordinal_position |
| --------------- | ------------------------ | ----------- | ------------------ | ------------------------ | ---------------- |
| attempt_id      | uuid                     | NO          | uuid_generate_v4() | null                     | 1                |
| user_id         | uuid                     | YES         | null               | null                     | 2                |
| quiz_id         | uuid                     | YES         | null               | null                     | 3                |
| score           | double precision         | YES         | 0                  | null                     | 4                |
| total_questions | integer                  | YES         | 0                  | null                     | 5                |
| correct_answers | integer                  | YES         | 0                  | null                     | 6                |
| time_spent      | integer                  | YES         | 0                  | null                     | 7                |
| completed_at    | timestamp with time zone | YES         | now()              | null                     | 8                |