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
AND table_name = 'quiz_questions'
ORDER BY ordinal_position;

| column_name    | data_type                | is_nullable | column_default          | character_maximum_length | ordinal_position |
| -------------- | ------------------------ | ----------- | ----------------------- | ------------------------ | ---------------- |
| question_id    | uuid                     | NO          | uuid_generate_v4()      | null                     | 1                |
| quiz_id        | uuid                     | YES         | null                    | null                     | 2                |
| material_id    | uuid                     | YES         | null                    | null                     | 3                |
| question_text  | text                     | NO          | null                    | null                     | 4                |
| question_type  | text                     | YES         | 'multiple_choice'::text | null                     | 5                |
| options        | jsonb                    | NO          | null                    | null                     | 6                |
| correct_answer | text                     | NO          | null                    | null                     | 7                |
| explanation    | text                     | YES         | null                    | null                     | 8                |
| difficulty     | text                     | YES         | 'medium'::text          | null                     | 9                |
| points         | integer                  | YES         | 1                       | null                     | 10               |
| created_at     | timestamp with time zone | YES         | now()                   | null                     | 11               |