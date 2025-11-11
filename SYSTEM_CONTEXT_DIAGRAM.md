# StudyStreak System Context Diagram

This diagram provides a high-level overview of the StudyStreak system, its main components, and how they interact with each other and external actors.

## Context Diagram

```mermaid
graph TD
    User[End User (Browser)]
    Frontend[Frontend (studystreak)]
    PHPBackend[PHP Backend (php-backend)]
    AIService[AI Service (ai-service)]
    Supabase[Supabase (DB/Auth)]
    Ollama[Ollama (AI Model Provider)]
    Docker[Docker Compose/Orchestration]

    User -->|HTTP| Frontend
    Frontend -->|API Calls| PHPBackend
    Frontend -->|API Calls| AIService
    PHPBackend -->|DB/API| Supabase
    PHPBackend -->|API Calls| AIService
    AIService -->|External API| Ollama
    Docker --> Frontend
    Docker --> PHPBackend
    Docker --> AIService
```

## Explanation
- **End User** interacts with the system via the browser (Frontend).
- **Frontend** communicates with both the PHP backend and AI service through API calls.
- **PHP Backend** handles business logic, interacts with Supabase for data/auth, and can call the AI service for ML tasks.
- **AI Service** provides ML/AI capabilities and may call external APIs (e.g., Ollama).
- **Docker** orchestrates all services for local and production environments.

This diagram helps clarify system boundaries and major data flows for onboarding, development, and architecture discussions.
