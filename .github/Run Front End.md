StudyStreak — Frontend: First‑Time Setup & Run (Windows)

Prerequisite
- Install Node.js (LTS) from https://nodejs.org — this also installs npm.
- Verify in PowerShell:
	node --version
	npm --version

Clone/Download
- Place the repository folder (StudyStreak) somewhere on your machine (e.g., Desktop).

Run the Frontend (Dev Server)
1. Go into the app folder and install dependencies:
	 cd studystreak
	 npm install
2. Start the dev server:
	 npm run dev
3. Open the URL printed in the terminal (for example):
	 http://localhost:5173/

Quick one‑liner (optional)
- From the StudyStreak folder:
	cd studystreak; npm install; npm run dev

Common Tips
- If you see "npm is not recognized", install Node.js from https://nodejs.org and restart PowerShell.
- If you see "Could not read package.json", make sure you are inside the studystreak folder (Not StudyStreak) before running commands.
- To stop the dev server, press Ctrl + C in the terminal.
