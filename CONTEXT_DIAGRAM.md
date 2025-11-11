# StudyStreak Context Diagram

![StudyStreak Context Diagram](CONTEXT_DIAGRAM.png)

---

This file contains a plain-text (ASCII) context diagram for quick viewing in editors that don't render Mermaid or images.

## Text-based Context Diagram

```text
+------------------+                                                     +------------------+
|      Admins      |                                                     |  Users (Students)|
+------------------+                                                     +------------------+
         |                                                                        |
         | 6. Content Mgmt & Analytics                                            | 1. Quiz Attempts, Study Requests
         v                                                                        v
+--------------------------------------------------------------------------------------------------+
|                                        Frontend (Web App)                                        |
|                                     (studystreak / Vite)                                     |
+------------------------------------------------+-------------------------------------------------+
                                                 |
                                                 | 2. API Calls (Auth, Content, Submissions)
                                                 v
+--------------------------------------------------------------------------------------------------+
|                                        StudyStreak System                                        |
|                                   (PHP Backend + AI Service)                                   |
+------------------+-----------------------------+--------------------------+--------------------+
                   |                             |                          |                    |
                   | 3. DB Operations            | 4. AI Content Generation | 5. Orchestration   |
                   v                             v                          v                    v
        +------------------+          +------------------+        +------------------+      +---------+
        |  Supabase (Auth) |          |    AI Service    |        |      Docker      |      |Supabase |
        | (Verify Tokens)  |          |   (ai-service)   |        |   (Networking)   |      |  (DB)   |
        +------------------+          +--------+---------+        +------------------+      +---------+
                                               | 7. External API Call
                                               v
                                    +------------------+
                                    |      Ollama      |
                                    +------------------+

Notes on numbered data flows:
  (1) Users -> Frontend: Interact with the UI to take quizzes and request study materials.
  (2) Frontend -> System: Authenticated API calls to load page data and submit user-generated content.
  (3) System -> Supabase (Auth): Verify user JWTs to authorize requests.
  (4) System -> AI Service: Internal requests from the PHP backend to the AI service for content generation.
  (5) System <-> Docker: The entire system is orchestrated by Docker, which manages service networking.
  (6) Admins -> Frontend: Use the web interface to manage content (materials, quizzes) and view analytics.
  (7) AI Service -> Ollama: The AI service calls an external model provider (like Ollama) to fulfill generation requests.
  (8) System -> Supabase (DB): Persist data such as quiz results, user progress, and new content.

```

## Short explanation

- Main system: `StudyStreak` — consists of the PHP backend (business logic) and the AI service (ML features).
- External entities: `Users`, `Admins`, `Supabase` (DB/Auth), `Docker` (orchestration), and an internal `AI Service` which itself may call external providers (e.g., Ollama).
- The ASCII diagram shows directional data flows with numbered annotations that are explained below.

See `CONTEXT_DIAGRAM_EXPLANATION.md` for additional detail and the Mermaid diagram (if your editor supports it).
