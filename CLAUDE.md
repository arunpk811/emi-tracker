# CLAUDE.md

## Project Overview

EMI Tracker is a personal finance web app for tracking Equated Monthly Installments (EMIs), income, and investments. It provides real-time budget insights with Firebase-backed cloud storage and authentication.

## Tech Stack

- **Frontend**: React 19, React Router DOM 7 (HashRouter for GitHub Pages compatibility)
- **Build**: Vite 7
- **Backend**: Firebase (Auth + Firestore)
- **Data Processing**: XLSX library for Excel/CSV parsing
- **Styling**: Vanilla CSS with glassmorphism design pattern
- **Deployment**: GitHub Pages via `gh-pages`

## Commands

- `npm run dev` — Start development server with HMR
- `npm run build` — Production build
- `npm run lint` — ESLint with zero warnings allowed (`--max-warnings 0`)
- `npm run preview` — Preview production build locally
- `npm run deploy` — Deploy to GitHub Pages (runs build first via predeploy)

## Project Structure

```
src/
├── components/
│   ├── Dashboard.jsx          # Main landing page with budget summary
│   ├── Login.jsx              # Firebase authentication
│   ├── Settings.jsx           # Firebase config and data management
│   ├── EMITracker.jsx         # EMI records list by month/year
│   ├── LoanSchedule.jsx      # Individual loan detail view
│   ├── UploadEMI.jsx         # Excel/CSV upload for EMI schedules
│   ├── Income.jsx            # Monthly income tracking
│   ├── Investments.jsx       # Investment planning with ROI calculations
│   └── ScheduledPayments.jsx # Manual EMI schedule creation
├── App.jsx                    # Router with protected routes
├── main.jsx                   # React entry point
├── firebase.js                # Firebase init with localStorage config
└── index.css                  # Global styles
```

## Code Conventions

- **Components**: PascalCase, functional with React Hooks (useState, useEffect)
- **CSS classes**: kebab-case (e.g., `glass-card`, `fade-in`)
- **CSS variables**: `--kebab-case` (e.g., `--primary`, `--accent-green`)
- **JS variables/functions**: camelCase
- **Currency formatting**: `toLocaleString('en-IN', { style: 'currency', currency: 'INR' })`
- **Date handling**: Native Date objects, ISO string storage in Firestore
- **Routing**: HashRouter for GitHub Pages compatibility
- **Forms**: Controlled components with onChange handlers

## Firebase Patterns

- Dynamic config stored in browser localStorage (configured via Settings page)
- All collections scoped by `auth.currentUser.uid`
- Collections: `emis`, `income`, `investments`
- Real-time data via `onSnapshot` listeners with cleanup on unmount
- Batch writes for bulk operations (max 500 per batch)

## Lint Rules

- ESLint v9 flat config
- React Hooks plugin (recommended rules)
- React Refresh plugin for Vite HMR
- `no-unused-vars` ignores variables matching `^[A-Z_]`
- Strict mode: `--report-unused-disable-directives --max-warnings 0`

## Design

- Mobile-first, max-width 480px container
- Glassmorphism: semi-transparent backgrounds with `backdrop-filter: blur()`
- Fixed bottom navigation for mobile
- CSS Grid and Flexbox for layouts
- Responsive sizing via `clamp()`
