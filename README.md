# StudyStreak

StudyStreak 🎯
Your All‑in‑One Learning Productivity Platform

Live demo: https://studystreak-peach.vercel.app

---

## Platform Overview
StudyStreak is a focused, integrated learning platform that combines AI-powered study tools with productivity features and gamification elements. Our current mission is to make studying smarter and more efficient by turning your course materials into meaningful practice.

Note: Current implementation focuses on file upload and AI-generated multiple-choice quizzes. Flashcards and additional study modes are planned for the roadmap.

---

## Hero
StudyStreak 🎯
Your All‑in‑One Learning Productivity Platform

Turn course materials into personalized multiple-choice quizzes, summarized highlights, and focused study sessions — powered by AI and designed to help you build lasting learning habits.

---

## What is StudyStreak?
StudyStreak goes beyond simple quiz generation. It provides a streamlined workflow that helps learners extract knowledge from documents, practice with targeted multiple-choice quizzes, and build consistent study routines. The platform is designed to scale from individual learners to classrooms and teams.

---

## Core Features

AI-Powered Learning Tools
- Smart Material Processing: Upload study materials (PDF, PPT, DOC/DOCX) and let our AI extract text, headings, and key concepts.
- Intelligent Multiple-Choice Quiz Generation: Automatically generate multiple-choice quizzes from your uploaded content. Questions include plausible distractors and explanations to help reinforce learning.
- Summaries & Key Points: Generate concise summaries and highlight the most important takeaways from each document.
- Learning Analytics (basic): Track quiz attempts and accuracy over time to identify weak areas.

Focus & Productivity
- Universal Pomodoro Timer: Start focus sessions that persist across app pages to help you maintain concentration.
- Session Tracking: Monitor productive study time and see streaks of consistent effort.

Gamification & Motivation
- Streak System: Maintain daily streaks to build habits.
- Achievements & Badges (planned): Reward consistent study behavior and milestones.
- Progress Visualization: Visual summaries of time spent, quiz performance, and streaks.

Learning Management
- Personalized Study Plans (planned): Structured learning paths based on your uploaded materials and goals.
- Progress Dashboard: Overview of quizzes taken, scores, and suggested next steps.
- Export & Save: Save and export generated quizzes and summaries for offline review.

Privacy & Security
- Secure Processing: Files are processed securely. Configure storage and retention settings for your needs.

Supported File Types
- .pdf
- .ppt, .pptx
- .doc, .docx
- Plain text / copy-paste content

---

## How It Works (simple flow)
1. Upload your document (PDF / PPT / DOC).
2. The system extracts text and identifies important sections.
3. An AI model generates multiple-choice questions and concise summaries from the content.
4. Take the quizzes, review explanations, and track your progress on the dashboard.

Note: At this time StudyStreak generates multiple-choice quizzes only. Flashcards and additional question types are on the roadmap.

---

## Examples of Generated Content
- Multiple-choice question with 4 options and one correct answer plus an explanation.
- Section-level summaries and bullet-point takeaways for quick review.

Example:
Q: What is the primary purpose of StudyStreak?
A) Social networking for students
B) An all-in-one learning productivity platform that converts materials into quizzes (Correct)
C) A file storage service
D) A code collaboration tool

Explanation: StudyStreak focuses on converting study materials into AI-generated quizzes and productivity features to support learning.

---

## Tech Stack
- Frontend: React + Tailwind CSS
- Backend: PHP (existing components) and supporting scripts
- Utilities: TypeScript, Python scripts, Dockerfile for containerization

This repo is primarily TypeScript with backend pieces in PHP and utilities in Python.

---

## Roadmap
- Flashcards (spaced repetition compatible)
- Advanced To-Do integration with study sessions
- Detailed analytics and topic-level insights
- Achievements & badge collection
- Browser extension/focus extension for distraction blocking
- Social features: study groups, shared quizzes, leaderboards
- Mobile-native experience and offline study packs

---

## Who Benefits
- Students preparing for exams with targeted practice
- Professionals learning new skills with limited time
- Lifelong learners building consistent study habits
- Educators creating and sharing practice materials

---

## Contributing
Contributions are welcome. You can help by:
- Filing issues and feature requests
- Submitting pull requests for bug fixes and new features
- Improving AI prompt patterns and quiz generation
- Adding tests and CI enhancements

Please follow repository conventions and include tests where appropriate.

---

## Privacy & Security
- Do not commit secrets or API keys. Configure AI provider keys and storage backends via environment variables.
- Add a privacy policy and storage retention rules before production deployment.

---

## Contact
Repository: https://github.com/gableee/Studystreak
Live demo: https://studystreak-peach.vercel.app

For support or questions, open an issue or submit a pull request.

---

## License
Add a LICENSE file (e.g., MIT) to specify the project license.

Experience StudyStreak — where AI-generated quizzes meet focus and habit-building to create a practical study ecosystem.