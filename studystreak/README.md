# StudyStreak - Learning Management Application

StudyStreak is a modern learning management application that helps users track their educational progress across various platforms and courses.

## Project Overview

StudyStreak helps users:
- Track progress in online courses
- Access external learning platforms in one place
- Manage study tasks with a todo list
- Focus on learning with a Pomodoro timer
- View statistics on learning achievements

## Project Structure

```
studystreak/
├── src/
│   ├── Application/          # Core application structure
│   │   ├── components/       # Shared app-level components
│   │   ├── App.tsx           # Main application component and routing
│   │   ├── AppInterface.tsx  # Header and Sidebar components
│   │   └── main.tsx          # Application entry point
│   ├── Features/             # Feature-specific components
│   │   ├── Courses/          # External learning platforms integration
│   │   ├── Dashboard/        # Main dashboard and statistics
│   │   ├── Pomodoro/         # Pomodoro timer feature
│   │   ├── Profile/          # User profile management
│   │   ├── Settings/         # Application settings
│   │   └── Todo/             # Task management feature
│   └── components/           # Reusable UI components
│       └── ui/               # Design system components
```

## Key Components

### Application Layer

- **App.tsx**: The root component that sets up routing and the main application layout
- **AppInterface.tsx**: Contains the Header and Sidebar navigation components
- **PageTransition.tsx**: Provides smooth transitions between routes

### Feature Modules

Each feature module is independent and contains its specific functionality:

- **Dashboard**: Main landing page with course summaries and statistics
- **Courses**: Integration with external learning platforms
- **Pomodoro**: Focus timer with customizable work/break intervals
- **Todo**: Task management and tracking
- **Profile**: User information and preferences
- **Settings**: Application configuration

### UI Components

The application uses a custom UI component library located in `src/components/ui/`:

- **Button**: Customizable button component with variants
- **Card**: Container component for content sections
- **Progress**: Visual progress indicators

## Technology Stack

- **React**: UI library
- **TypeScript**: Type-safe JavaScript
- **React Router**: Navigation and routing
- **Tailwind CSS**: Utility-first styling
- **Shadcn UI**: Component design system foundation
- **Vite**: Build tool and development server

## Getting Started

To work on this project:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start the development server
4. Access the application at `http://localhost:5173`

## Documentation

Each major component and feature has its own documentation in the form of JSDoc comments. Look for the comments at the top of files to understand their purpose and functionality.
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
