# Pickleball League Tournament Manager - React Version

A modern React implementation of the Pickleball League Tournament Manager, migrated from the original HTML/JavaScript application.

## Features

All features from the original HTML version are preserved:
- Player management with DUPR ratings
- 4-court tournament system
- Multiple scoring systems (Simple, Court Weighted, Smart Points)
- Multiple seeding methods (Fair Seed, Gradual Start, Classic Seed)
- CSV import functionality
- Match history and statistics
- Export/Import tournament data
- Offline-first with localStorage persistence

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Navigate to the pickleball-react directory:
```bash
cd pickleball-react
```

2. Install dependencies:
```bash
npm install
```

### Development

Run the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Production Build

Build for production:
```bash
npm run build
```

The built files will be in the `dist` directory. You can preview the production build with:
```bash
npm run preview
```

## Project Structure

```
pickleball-react/
├── src/
│   ├── components/       # React components
│   │   ├── Header.jsx
│   │   ├── PlayerManagement.jsx
│   │   ├── PlayerList.jsx
│   │   ├── Courts.jsx
│   │   ├── Leaderboard.jsx
│   │   ├── Summary.jsx
│   │   ├── MatchHistory.jsx
│   │   ├── Help.jsx
│   │   └── LegalDisclaimer.jsx
│   ├── hooks/            # Custom React hooks
│   │   ├── useAppState.js
│   │   ├── useTournament.js
│   │   └── useStorage.js
│   ├── utils/            # Utility functions
│   │   ├── storage.js
│   │   ├── scoring.js
│   │   ├── seeding.js
│   │   ├── csvParser.js
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── styles/
│   │   └── App.css
│   ├── App.jsx
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

## Migration Notes

This React version maintains 100% feature parity with the original HTML version:
- All business logic preserved exactly as-is
- Same data format for backward compatibility
- Same storage mechanism (cookies with localStorage fallback)
- Same UI/UX and styling

## Technology Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Pure JavaScript** - No additional dependencies

## Browser Support

Works in all modern browsers that support:
- ES6+ JavaScript
- React 18
- localStorage/Cookies

## License

Same as the original application - Use at Your Own Risk.

