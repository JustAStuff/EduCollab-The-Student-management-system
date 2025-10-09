# EduCollab - Student Management System

A comprehensive collaboration platform combining features from Slack and Discord, designed specifically for educational environments and team management.

## 🚀 Features

### 📊 **Personal Statistics Dashboard**
- **Task Completion Analytics**: Track completion rates across different time periods
- **Productivity Metrics**: Efficiency scores, average completion times, and quality ratings
- **Achievement System**: Badges, streaks, and milestone tracking for motivation
- **Visual Analytics**: Interactive charts and progress indicators
- **Activity Timeline**: Recent activity feed and updates

### 👥 **Workspace Management**
- **Team Collaboration**: Create and manage workspaces with role-based access
- **Task Assignment**: Assign tasks to team members with status tracking
- **File Submissions**: Upload and review task submissions with approval workflow
- **Real-time Updates**: Live status updates and notifications

### 🔐 **Authentication & Security**
- **Secure Login/Registration**: Email-based authentication with Supabase
- **Role-based Access**: Team Leader and Team Member permissions
- **File Security**: Secure file storage with proper access controls

## 🛠️ Tech Stack

- **Frontend**: React 19, Material-UI, Recharts
- **Backend**: Supabase (Database, Auth, Storage)
- **Build Tool**: Vite
- **Styling**: Material-UI with custom theming
- **Charts**: Recharts for data visualization

## 📁 Project Structure

```
├── src/
│   ├── components/dashboard/    # Dashboard components
│   ├── services/               # Business logic services
│   ├── utils/                  # Utility functions
│   └── [React components]      # Main app components
├── docs/                       # Documentation
├── migrations/                 # Database migrations
└── supabase/                   # Supabase configuration
```

For detailed structure, see [PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Supabase account
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd EduCollab-The-Student-management-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Apply migrations from `/migrations/` folder
   - Update `src/supabaseClient.js` with your project credentials

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:5173
   ```

## 📊 Dashboard Features

### Statistics & Analytics
- **Task Completion Rates**: Visual progress indicators with percentages
- **Efficiency Metrics**: Productivity scores and performance analytics
- **Trend Analysis**: 30-day completion trends and patterns
- **Workspace Participation**: Role distribution and activity metrics

### Gamification
- **Achievement Badges**: Earn badges for milestones and quality work
- **Streak Tracking**: Daily and weekly completion streaks
- **Progress Bars**: Visual progress towards next goals
- **Activity Feed**: Timeline of recent accomplishments

## 🔧 Development

### Available Scripts
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Database Migrations
Apply migrations in order from the `/supabase/migrations/` folder:
1. `20240101000008_fix_task_submissions_storage.sql`
2. `20240101000009_simplify_storage_policies.sql`/` folder:
1. `20240101000008_fix_task_submissions_storage.sql`
2. `20240101000009_simplify_storage_policies.sql`

### Development Documentation
See `/docs/development/` for:
- System analysis and workflow decisions
- Testing guides and debugging utilities
- SQL fixes and temporary solutions

## 🎯 Key Features

### For Team Leaders
- Create and manage workspaces
- Assign tasks to team members
- Review and approve submissions
- Track team productivity and progress
- Manage team member permissions

### For Team Members
- View assigned tasks and deadlines
- Submit work with file uploads
- Track personal productivity metrics
- Earn achievements and badges
- Participate in multiple workspaces

## 📈 Analytics & Insights

The dashboard provides comprehensive analytics including:
- **Completion Rates**: All-time, monthly, and weekly statistics
- **Efficiency Scores**: Based on speed, quality, and timeliness
- **Productivity Trends**: Visual charts showing progress over time
- **Achievement Tracking**: Badges and milestones for motivation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the `/docs/` folder for documentation
- Review development utilities in `/docs/development/`
- Create an issue for bugs or feature requests

---

**EduCollab** - Empowering educational collaboration and productivity tracking.
