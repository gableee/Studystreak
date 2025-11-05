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
AND table_name = 'material_ai_embeddings'
ORDER BY ordinal_position;


| column_name   | data_type                | is_nullable | column_default    | character_maximum_length | ordinal_position |
| ------------- | ------------------------ | ----------- | ----------------- | ------------------------ | ---------------- |
| embedding_id  | uuid                     | NO          | gen_random_uuid() | null                     | 1                |
| ai_version_id | uuid                     | NO          | null              | null                     | 2                |
| vector        | USER-DEFINED             | YES         | null              | null                     | 3                |
| created_at    | timestamp with time zone | YES         | now()             | null                     | 4                |