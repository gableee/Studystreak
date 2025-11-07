# Quiz History View Component

Complete React TypeScript component for displaying quiz attempt history with charts and detailed breakdowns.

## 📦 Installation

**Required Package:**
```bash
npm install recharts
```

## 📁 Files Created

1. **`src/components/QuizHistoryView.tsx`** - Main quiz history component
2. **`src/Features/LearningMaterials/StudyTools/QuizTabEnhanced.tsx`** - Enhanced QuizTab with history integration

## 🚀 Usage

### Option 1: Replace Existing QuizTab
Replace the current `QuizTab.tsx` with `QuizTabEnhanced.tsx`:

```bash
# Backup the original
mv src/Features/LearningMaterials/StudyTools/QuizTab.tsx src/Features/LearningMaterials/StudyTools/QuizTab.backup.tsx

# Use the enhanced version
mv src/Features/LearningMaterials/StudyTools/QuizTabEnhanced.tsx src/Features/LearningMaterials/StudyTools/QuizTab.tsx
```

### Option 2: Use as Standalone Component
Import and use directly:

```tsx
import { QuizHistoryView } from '@/components/QuizHistoryView';

function MyComponent() {
  return <QuizHistoryView materialId="your-material-id" />;
}
```

## 🎨 Features

### ✅ Core Functionality
- **Full Quiz History**: Display all quiz attempts with scores and dates
- **Performance Trend Chart**: Line chart showing score progression using Recharts
- **Detailed Breakdown**: Per-question analysis with correct/incorrect answers
- **Responsive Design**: Mobile-first, works on all screen sizes
- **iOS-Style UI**: Cards, shadows, rounded corners, smooth animations
- **Dark Mode Support**: Full dark mode compatibility

### 📊 Data Display
- Score percentage with color coding (Green ≥90%, Blue ≥70%, Yellow ≥50%, Red <50%)
- Time spent per attempt
- Correct vs total questions
- Average and best scores
- Question-by-question breakdown modal

### 🎭 UI States
- **Loading State**: Animated skeleton loaders
- **Empty State**: Friendly message when no attempts exist
- **Error State**: Error display with retry button
- **Success State**: Full history with all features

### 🔄 Interactions
- **Expand/Collapse**: Click "Show Details" to expand attempt cards
- **Modal View**: Click "View Question Breakdown" for detailed analysis
- **Smooth Animations**: Fade-in effects and transitions
- **Hover Effects**: Interactive elements with visual feedback

## 📡 API Integration

### Endpoint
```
GET /api/materials/{materialId}/quiz-attempts/history
```

### Expected Response Format
```typescript
{
  material_id: string;
  attempts: Array<{
    attempt_id: string;
    quiz_id: string;
    score: number;
    total_questions: number;
    correct_answers: number;
    percentage: number;
    time_spent: number; // in seconds
    completed_at: string; // ISO 8601 date
    responses: Array<{
      question_id: string;
      user_answer: any;
      is_correct: boolean;
      correct_answer: any;
      response_time_ms: number | null;
    }>;
  }>;
  total_attempts: number;
}
```

## 🎯 Component Props

### QuizHistoryView
```typescript
interface QuizHistoryViewProps {
  materialId: string; // Required: The ID of the learning material
}
```

## 🎨 Styling

### Color Scheme
- **Green**: Correct answers, high scores (≥90%)
- **Blue**: Good scores (≥70%)
- **Yellow**: Passing scores (≥50%)
- **Red**: Low scores (<50%), incorrect answers
- **Purple**: Primary accent color
- **Slate**: Neutral backgrounds and text

### Responsive Breakpoints
- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## 🧩 Component Structure

```
QuizHistoryView
├── LoadingSkeleton (shown during fetch)
├── EmptyState (when no attempts)
├── ErrorState (on fetch failure)
└── Main View
    ├── ProgressChart (Recharts line chart)
    └── Attempt Cards List
        └── AttemptCard
            ├── Header (score, date, time)
            ├── Expandable Details
            └── QuestionDetailModal
```

## 🔧 Customization

### Modify Colors
Edit the helper functions in `QuizHistoryView.tsx`:
```typescript
function getScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600 dark:text-green-400';
  // ... customize thresholds and colors
}
```

### Adjust Chart Settings
Modify the Recharts configuration:
```typescript
<LineChart
  data={chartData}
  margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
>
  {/* Customize chart appearance */}
</LineChart>
```

### Change Date Formatting
Update the `formatDate` helper:
```typescript
function formatDate(dateString: string): string {
  // Custom date formatting logic
}
```

## ♿ Accessibility

- **ARIA Labels**: All interactive elements have proper labels
- **Semantic HTML**: Proper heading hierarchy and landmarks
- **Keyboard Navigation**: Full keyboard support
- **Screen Reader Support**: Descriptive text for all states
- **Focus Indicators**: Visible focus states for all interactive elements

## 🔍 Error Handling

The component handles:
- Network errors during fetch
- Invalid API responses
- Missing or malformed data
- Auth token expiration (via apiClient)

All errors display a user-friendly message with retry option.

## 📱 Mobile Optimization

- Touch-friendly tap targets (min 44x44px)
- Swipe-friendly cards
- Optimized chart for small screens
- Responsive typography
- Bottom sheet style modals

## 🎭 Animation Classes

Required CSS animations (already present in `index.css`):
```css
.animate-fade-in {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## 🧪 Testing

### Manual Testing Checklist
- [ ] Load component with no history (empty state)
- [ ] Load component with history (displays correctly)
- [ ] Click expand/collapse on attempt cards
- [ ] Open question breakdown modal
- [ ] Close modal (click outside, click X, click Close button)
- [ ] Verify chart renders correctly
- [ ] Test on mobile viewport
- [ ] Test dark mode
- [ ] Test error state (disconnect network)
- [ ] Click retry button on error

## 🐛 Troubleshooting

### Chart Not Displaying
- Ensure Recharts is installed: `npm install recharts`
- Check browser console for errors
- Verify data format matches expected structure

### API Errors
- Verify backend endpoint exists and returns correct format
- Check auth token is valid
- Ensure materialId is correct

### Styling Issues
- Verify Tailwind CSS is configured
- Check dark mode classes are supported
- Ensure all required utility classes exist

## 📚 Dependencies

- **React** ^19.1.1
- **TypeScript** ^5.9.2
- **Recharts** (needs to be installed)
- **Lucide React** ^0.544.0 (icons)
- **Tailwind CSS** ^3.4.17
- **apiClient** (internal utility)

## 🔄 Integration with QuizTab

The enhanced QuizTab includes a mode switcher:
```tsx
<QuizMode>
  - Take Quiz (original functionality)
  - History (new QuizHistoryView)
</QuizMode>
```

Users can seamlessly switch between taking quizzes and viewing their history.

## 📝 License

Part of the StudyStreak project.

## 🤝 Contributing

When contributing:
1. Maintain TypeScript strict mode compliance
2. Follow existing code style and formatting
3. Ensure responsive design works on all breakpoints
4. Test both light and dark modes
5. Add appropriate ARIA labels for accessibility

---

**Created**: November 2025  
**Component Version**: 1.0.0  
**Author**: GitHub Copilot
