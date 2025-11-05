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
AND table_name = 'quizzes'
ORDER BY ordinal_position;

| column_name   | data_type                | is_nullable | column_default     | character_maximum_length | ordinal_position |
| ------------- | ------------------------ | ----------- | ------------------ | ------------------------ | ---------------- |
| quiz_id       | uuid                     | NO          | uuid_generate_v4() | null                     | 1                |
| title         | text                     | NO          | null               | null                     | 2                |
| description   | text                     | YES         | null               | null                     | 3                |
| material_id   | uuid                     | YES         | null               | null                     | 4                |
| passing_score | double precision         | YES         | 70.0               | null                     | 5                |
| created_at    | timestamp with time zone | YES         | now()              | null                     | 7                |
| max_attempts  | integer                  | YES         | null               | null                     | 8                |