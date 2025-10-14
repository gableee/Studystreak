# StudyStreak Inclusive iOS-Inspired UI Blueprint

## Design Intent
- Deliver a calm, premium iOS-style look that feels friendly for any discipline (STEM, arts, health sciences, business).
- Balance motivation and focus: a breathable layout with high-value calls-to-action and celebratory moments for achievements.
- Make inclusivity default: typography, spacing, color, and interactions must accommodate varied visual abilities, devices, and cultural contexts.

## Visual Language
- **Palette**: use soft neutrals (#F5F7FB, #0B1220) with desaturated jewel accents (blue, emerald, amber, orchid). Ensure 4.5:1 contrast for text; provide light + dark surfaces.
- **Depth**: apply subtle glassmorphism—translucent panels (`bg-white/70` light, `bg-white/5` dark) with 1px borders and soft shadows. Use gradient halos for key stats.
- **Typography**: adopt `font-sans` with 1.4–1.6 line-height. Headings large but airy (tracking-tight). Body minimum 16px; offer controls for scaling when hooked to user prefs.
- **Iconography**: rely on `lucide-react` symbols with 1.25rem baseline. Pair with text labels; avoid icon-only actions unless universally understood.

## Layout Patterns
- **Page Shells**: max-width 1120px, 24px padding mobile / 32px desktop, 24px vertical rhythm. Section titles set with supporting copy to contextualize data.
- **Cards**: use shared glass panel component with optional top badges. Maintain minimum touch target 44px.
- **Responsive**: leverage Tailwind container queries (`@md`, `@lg`) for multi-column stats; stack vertically on small screens.
- **Empty States**: friendly illustration placeholder, actionable CTA, highlight cross-discipline relevance ("Plan your clinical rotations" + "Schedule studio practice").

## Accessibility & Inclusion
- Respect prefers-reduced-motion; only use ambient gradients/opacity when allowed.
- All actionable items need clear focus outlines (use `ring-2 ring-blue-500/70`).
- Provide schedule and analytics descriptions readable by screen readers (ARIA labels summarizing chart values).
- Form inputs must accept diverse name formats, optional pronouns, flexible date/time (24h/12h).
- Offer quick toggle for dark/light/system once backend wiring is ready.

## Content Guidance
- Rotate exemplar data across disciplines (e.g., "Pathology Review", "Design Studio", "Structural Analysis").
- Encourage progress storytelling: highlight streaks, milestones, reflection prompts.
- Keep microcopy encouraging yet neutral—avoid jargon tied to a single major.

## Component Direction
- **Metric Tile**: gradient icon bubble, metric, delta tag, caption.
- **Planner Task Row**: left status dot/checkbox, center info block, right due date pill, optional tags.
- **Timeline/Calendar**: pill buttons for filters, heat-map legend visible, accessible tooltips.
- **Reward Badge**: circular gradient medallion with glow ring, text stack, progress bar for locked items.

## Motion & Feedback
- Use 200–250ms ease-out transitions for hover/focus. Page entrance uses existing `smoothAppear` animation; ensure transform distance ≤12px.
- Confetti or celebration banners only on major unlocks; degrade gracefully if reduced motion.

## Implementation Notes
- Centralize glass panel + badge classes in Tailwind components layer (`.glass-card`, `.stat-tile`).
- Update sample content constants so each feature shows multi-disciplinary examples.
- After redesigns, run `npm run lint` and manual keyboard walkthrough.
