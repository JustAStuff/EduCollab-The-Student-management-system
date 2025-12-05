# Project Structure

This document outlines the organized file structure of the EduCollab Student Management System.

## 📁 Root Directory Structure

```
EduCollab-The-Student-management-system/
├── 📁 .kiro/                          # Kiro IDE configuration and specs
│   └── 📁 specs/                      # Feature specifications
│       ├── 📁 fix-file-viewing/       # File viewing fix spec
│       └── 📁 personal-statistics-dashboard/  # Dashboard spec
├── 📁 docs/                           # Documentation
│   ├── 📁 development/                # Development docs and utilities
│   └── PROJECT_STRUCTURE.md           # This file
├── 📁 public/                         # Static assets
├── 📁 src/                            # Source code
│   ├── 📁 components/                 # React components
│   │   └── 📁 dashboard/              # Dashboard-specific components
│   ├── 📁 services/                   # Business logic services
│   ├── 📁 utils/                      # Utility functions
│   └── [React components]             # Main React components
├── 📁 supabase/                       # Supabase configuration
│   ├── 📁 functions/                  # Edge functions
│   └── 📁 migrations/                 # Database migration files
└── [Config files]                     # Package.json, vite.config.js, etc.
```

## 📂 Detailed Structure

### `/src` - Source Code
```
src/
├── components/
│   └── dashboard/                     # Dashboard components
│       ├── TaskCompletionCard.jsx    # Task completion statistics
│       ├── EfficiencyMetricsCard.jsx # Work efficiency metrics
│       ├── CompletionTrendChart.jsx  # Trend visualization
│       ├── WorkspaceParticipationCard.jsx  # Workspace stats
│       ├── RemainingTasksCard.jsx    # Priority tasks overview
│       ├── AchievementsCard.jsx      # Badges and achievements
│       └── RecentActivityCard.jsx    # Activity timeline
├── services/
│   └── StatisticsService.js          # Statistics data service
├── utils/
│   └── fileUtils.js                  # File handling utilities
├── Dashboard.jsx                     # Main dashboard component
├── WorkspaceTL.jsx                   # Team Leader workspace view
├── WorkspaceTM.jsx                   # Team Member workspace view
├── [Other components...]             # Login, Register, etc.
└── supabaseClient.js                 # Supabase configuration
```

### `/docs` - Documentation
```
docs/
├── development/                       # Development utilities
│   ├── system-limits-and-workflow-analysis.md
│   ├── link-to-cloud-supabase.md
│   ├── test-file-functionality.md
│   ├── debug-file-paths.sql
│   ├── check-storage-files.md
│   ├── manual-sql-fix.sql
│   ├── quick-fix-public-bucket.sql
│   └── temp-debug-public.sql
└── PROJECT_STRUCTURE.md              # This file
```

### `/supabase` - Supabase Configuration
```
supabase/
├── functions/                         # Edge functions
├── migrations/                        # Database migrations
│   ├── 20240101000008_fix_task_submissions_storage.sql
│   └── 20240101000009_simplify_storage_policies.sql
└── config.toml                        # Supabase configuration
```

### `/.kiro` - Kiro IDE Specifications
```
.kiro/
└── specs/
    ├── fix-file-viewing/              # File viewing feature spec
    │   ├── requirements.md
    │   ├── design.md
    │   └── tasks.md
    └── personal-statistics-dashboard/ # Dashboard feature spec
        ├── requirements.md
        ├── design.md
        └── tasks.md
```

## 🎯 Key Features by Directory

### Dashboard Components (`/src/components/dashboard/`)
- **TaskCompletionCard**: Circular progress indicators, completion rates
- **EfficiencyMetricsCard**: Productivity scores, efficiency metrics
- **CompletionTrendChart**: 30-day trend visualization using Recharts
- **WorkspaceParticipationCard**: Workspace statistics and role distribution
- **RemainingTasksCard**: Priority tasks and action items
- **AchievementsCard**: Badges, streaks, and milestone tracking
- **RecentActivityCard**: Activity timeline and updates

### Services (`/src/services/`)
- **StatisticsService**: Centralized data fetching, caching, and calculations

### Utilities (`/src/utils/`)
- **fileUtils**: File validation, formatting, and path generation

## 🚀 Getting Started

1. **Install Dependencies**: `npm install`
2. **Apply Migrations**: Use files from `/supabase/migrations/` folder
3. **Start Development**: `npm run dev`
4. **View Documentation**: Check `/docs/` for guides and analysis

## 📝 Notes

- All development utilities moved to `/docs/development/`
- Migration files duplicated in `/migrations/` for easy access
- Kiro specs preserved in `/.kiro/specs/` for feature documentation
- Clean root directory with only essential configuration files