# StudyStreak Context Diagram Entities & Data Flow

## Entities
- **Users (Students):** Interact with the system to study, take quizzes, and view results.
- **Admins:** Manage study materials, quizzes, and view analytics.
- **Supabase (DB/Auth):** Stores user data, quiz results, and handles authentication.
- **AI Model Provider (Ollama):** Generates flashcards, summaries, and quiz questions.
- **Frontend (Web App):** User interface for students/admins.
- **PHP Backend (API Logic):** Handles business logic and API requests.

## Data Flow
- Users <-> StudyStreak: Quiz attempts, study material requests, results.
- Admins <-> StudyStreak: Content management, analytics.
- StudyStreak <-> Supabase: User data, quiz results, authentication.
- StudyStreak <-> AI Model Provider: Requests for AI-generated content, receives generated flashcards/questions.
- Frontend <-> StudyStreak: UI data exchange.
- PHP Backend <-> StudyStreak: API/business logic processing.

---

## Mermaid Diagram (for reference)
```mermaid
flowchart TD
    subgraph StudyStreak[StudyStreak System]
        Frontend
        PHPBackend
        AIService
    end
    User[Users (Students)]
    Admin[Admins]
    Supabase[Supabase (DB/Auth)]
    Ollama[AI Model Provider]

    User -->|Quiz Attempts, Requests| Frontend
    Admin -->|Content Mgmt, Analytics| Frontend
    Frontend -->|API Calls| PHPBackend
    PHPBackend -->|DB/API| Supabase
    PHPBackend -->|AI Requests| AIService
    AIService -->|AI Content| PHPBackend
    AIService -->|External API| Ollama
```

---

## Next Step
A PNG image of this diagram will be generated and saved in your workspace for submission.
