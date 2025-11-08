SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    ordinal_position
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

| column_name                 | data_type                | is_nullable | column_default | character_maximum_length | ordinal_position |
| --------------------------- | ------------------------ | ----------- | -------------- | ------------------------ | ---------------- |
| id                          | uuid                     | NO          | null           | null                     | 1                |
| username                    | text                     | NO          | null           | null                     | 2                |
| avatar_url                  | text                     | YES         | null           | null                     | 3                |
| created_at                  | timestamp with time zone | NO          | now()          | null                     | 4                |
| email                       | text                     | YES         | null           | null                     | 7                |
| updated_at                  | timestamp with time zone | NO          | now()          | null                     | 8                |
| first_name                  | text                     | NO          | null           | null                     | 9                |
| last_name                   | text                     | NO          | null           | null                     | 10               |
| age                         | integer                  | YES         | null           | null                     | 12               |
| birthday                    | timestamp with time zone | YES         | null           | null                     | 13               |
| streak_count                | integer                  | YES         | 0              | null                     | 14               |
| total_study_time            | integer                  | YES         | 0              | null                     | 15               |
| level                       | integer                  | YES         | 1              | null                     | 16               |
| experience_points           | integer                  | YES         | 0              | null                     | 17               |
| streak_longest              | integer                  | YES         | 0              | null                     | 18               |
| streak_last_active_at       | timestamp with time zone | YES         | null           | null                     | 19               |
| streak_timezone             | text                     | YES         | null           | null                     | 20               |
| streak_savers_available     | integer                  | YES         | 3              | null                     | 21               |
| streak_savers_used          | integer                  | YES         | 0              | null                     | 22               |
| streak_savers_last_reset    | timestamp with time zone | YES         | null           | null                     | 23               |
| streak_savers_max_per_month | integer                  | YES         | 3              | null                     | 24               |
| preferred_name              | text                     | YES         | null           | null                     | 25               |