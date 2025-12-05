# EduCollab - Quick Start Guide

## For Hackathon Judges

This guide will help you quickly set up and test EduCollab.

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- Git

## Setup (5 minutes)

### 1. Clone and Install

```bash
git clone [your-repo-url]
cd EduCollab-The-Student-management-system
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your project URL and anon key

### 3. Configure Environment

Create a `.env` file in the root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Or update `src/supabaseClient.js` directly with your credentials.

### 4. Run Database Migrations

In your Supabase dashboard:
1. Go to SQL Editor
2. Run migrations from `supabase/migrations/` folder in order
3. Start with `20240101000008_fix_task_submissions_storage.sql`
4. Continue through to `20240101000022_create_problem_statements_system.sql`

**Quick Migration**: Copy and paste the contents of `COPY_PASTE_DATABASE_FIX.sql` for a faster setup.

### 5. Start the Application

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Testing the Application

### Create an Account
1. Click "Sign Up"
2. Enter email and password
3. Check email for confirmation (or disable email confirmation in Supabase)

### Test as Team Leader
1. Create a workspace
2. Add tasks
3. View dashboard statistics

### Test as Team Member
1. Create a second account
2. Join a workspace (use invite code)
3. Submit work on tasks
4. View personal dashboard

## Key Features to Test

### 1. Dashboard
- Personal statistics and metrics
- Achievement badges
- Completion trends
- Recent activity

### 2. Task Management
- Create workspace
- Assign tasks
- Upload files
- Review submissions
- Approve/reject work

### 3. Real-time Features
- Public chat
- Online presence
- Live notifications

### 4. Problem Statements
- Create problem statements
- Form teams
- Collaborate on solutions

## Kiro Features Demonstrated

### Specs (`.kiro/specs/`)
- 6 comprehensive feature specs
- Requirements, design, and task breakdowns
- 15+ completed task summaries

### Hooks (`.kiro/hooks/`)
- `lint-on-save.json` - Auto-linting
- `test-runner.json` - Automated testing
- `migration-validator.json` - SQL validation

### Steering (`.kiro/steering/`)
- `react-best-practices.md` - React patterns
- `supabase-patterns.md` - Database patterns
- `code-quality.md` - General standards

## Troubleshooting

### Build Errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Issues
- Verify Supabase URL and key in `.env`
- Check Supabase project is active
- Ensure migrations are applied

### RLS Policy Errors
- Run the complete migration set
- Check user is authenticated
- Verify workspace membership

## Project Structure

```
├── .kiro/              # Kiro specs, hooks, steering
├── src/
│   ├── components/     # React components
│   ├── services/       # Business logic
│   ├── hooks/          # Custom hooks
│   └── utils/          # Utilities
├── supabase/
│   └── migrations/     # Database migrations
└── docs/               # Documentation
```

## Support

For issues or questions:
- Check `docs/` folder for detailed documentation
- Review `KIROWEEN_SUBMISSION.md` for feature overview
- See migration files for database schema

## License

MIT License - See LICENSE file
