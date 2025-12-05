# Complete Platform Documentation

## Table of Contents
1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Core Features](#core-features)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Feature Details](#feature-details)
6. [Architecture](#architecture)

---

## Overview

This is a comprehensive collaborative workspace and project management platform designed for teams to work together on problem statements, manage tasks, track progress, and communicate effectively. The platform supports multiple user roles with hierarchical permissions and real-time collaboration features.

---

## Tech Stack

### Frontend
- **React 18** - Modern UI library with hooks
- **Material-UI (MUI)** - Component library for consistent design
- **React Router** - Client-side routing
- **Vite** - Fast build tool and dev server

### Backend & Database
- **Supabase** - Backend-as-a-Service platform
  - PostgreSQL database
  - Real-time subscriptions
  - Row Level Security (RLS)
  - Authentication & Authorization
  - Edge Functions (Deno runtime)
  - Storage for file uploads

### Testing
- **Vitest** - Unit and integration testing
- **React Testing Library** - Component testing
- **Happy DOM** - DOM implementation for tests

### Additional Tools
- **JavaScript (ES6+)** - Primary programming language
- **CSS3** - Custom styling
- **Git** - Version control

---

## Core Features

### 1. Authentication & User Management
- Email/password authentication
- Email confirmation workflow
- Password reset functionality
- User profiles with customizable information
- Secure session management

### 2. Problem Statement System (Multi-Team)
- Browse available problem statements/projects
- Create your own team as a Team Lead
- Join existing teams as a Member
- Apply to multiple teams for the same problem
- View team structure and members
- Application review system for team leads

**Key Capabilities:**
- Users can create multiple teams (multiple Lead applications)
- Users can join multiple teams (multiple Member applications)
- Auto-approval for Lead applications
- Manual approval for Member applications by team leads
- Real-time team updates

### 3. Workspace Management

#### Three Workspace Types:

**a) Workspace Owner (WorkspaceTM)**
- Create and manage workspaces
- Invite members via email
- Assign roles (Owner, Team Lead, Member)
- Upload files and manage workspace resources
- View all workspace activities
- Manage workspace settings

**b) Team Lead (WorkspaceTL)**
- Review and approve/reject task submissions
- Provide feedback on member work
- Revoke tasks when necessary
- View team performance metrics
- Manage team member tasks

**c) Team Member (WorkspaceTM)**
- View assigned tasks
- Submit task completions with file uploads
- Resubmit after feedback
- Track personal progress
- View task history

### 4. Task Management System

**Task Lifecycle:**
1. **Created** - Task assigned to member
2. **In Progress** - Member working on task
3. **Submitted** - Member submits for review
4. **Under Review** - Team Lead reviewing
5. **Approved** - Task completed successfully
6. **Needs Revision** - Requires changes
7. **Revoked** - Task reassigned or cancelled

**Task Features:**
- File upload support (multiple files per submission)
- Task categorization (Available, In Progress, Completed)
- Hierarchical review system (Member → Team Lead → Owner)
- Task modification and resubmission
- Task revocation with reason tracking
- Submission gallery view

### 5. Dashboard & Analytics

**Personal Dashboard:**
- Task completion statistics
- Efficiency metrics
- Recent activity feed
- Workspace participation overview
- Achievement tracking
- Completion trend charts

**Workspace Dashboard:**
- Team performance overview
- Task distribution analytics
- Member activity tracking
- Submissions gallery
- Progress visualization

### 6. Real-Time Communication

**Public Chat:**
- Real-time messaging using Supabase Realtime
- Online user presence indicators
- Message history
- User avatars and names
- Typing indicators
- Auto-scroll to latest messages

### 7. File Management

**Storage System:**
- Secure file uploads to Supabase Storage
- Support for multiple file types
- File size validation
- Organized by workspace/task
- Download capabilities
- Permission-based access control

### 8. Security Features

**Row Level Security (RLS):**
- Database-level access control
- User can only see their own data
- Team leads can view team data
- Workspace owners have full access
- Secure file storage policies

**Audit Logging:**
- Track all important actions
- User activity monitoring
- Security event logging
- Compliance support

**Data Validation:**
- Input sanitization
- File type validation
- Size limit enforcement
- SQL injection prevention
- XSS protection

### 9. Performance Optimizations

**Caching:**
- Workspace member cache
- Optimistic UI updates
- Local state management

**Pagination:**
- Large dataset handling
- Configurable page sizes
- Efficient data loading

**Lazy Loading:**
- Component code splitting
- On-demand resource loading
- Virtualized lists for large datasets

**Database Optimization:**
- Indexed columns for fast queries
- Optimized RLS policies
- Efficient join operations

### 10. Responsive Design

**Layout System:**
- Mobile-first approach
- Responsive grid system
- Adaptive components
- Touch-friendly interfaces
- Consistent spacing and typography

---

## User Roles & Permissions

### 1. Workspace Owner
**Can:**
- Create and delete workspaces
- Invite and remove members
- Assign and change roles
- Upload files to workspace
- View all workspace data
- Approve final task submissions
- Manage workspace settings

**Cannot:**
- Access other users' private workspaces

### 2. Team Lead
**Can:**
- Review member task submissions
- Approve or request revisions
- Revoke tasks from members
- View team performance
- Provide feedback
- Manage team tasks

**Cannot:**
- Delete workspace
- Change member roles
- Access owner-only features

### 3. Team Member
**Can:**
- View assigned tasks
- Submit task completions
- Upload files for submissions
- Resubmit after feedback
- View personal statistics
- Participate in chat

**Cannot:**
- Review other members' work
- Assign tasks
- Change workspace settings

### 4. Problem Statement Roles

**Team Lead (Problem Statements):**
- Create new teams
- Review member applications
- Approve/reject team join requests
- Coordinate team activities

**Team Member (Problem Statements):**
- Apply to join teams
- View team information
- Collaborate with team

---

## Feature Details

### Problem Statement Workflow

1. **Browse Projects**
   - View all available problem statements
   - See project details (difficulty, duration, skills required)
   - Check existing teams

2. **Create a Team (As Lead)**
   - Click "Become Team Lead"
   - Automatically approved
   - Team created with unique ID
   - Visible to other users

3. **Join a Team (As Member)**
   - Browse existing teams
   - Click "Join Team"
   - Submit application with message
   - Wait for team lead approval

4. **Review Applications (As Lead)**
   - Go to "My Workspaces"
   - View pending applications
   - See applicant information (name, email, message)
   - Approve or reject applications

5. **Multi-Team Participation**
   - Users can be in multiple teams
   - Each team operates independently
   - Separate applications per team

### Task Management Workflow

1. **Task Assignment**
   - Owner creates task
   - Assigns to team member
   - Member receives notification

2. **Task Completion**
   - Member works on task
   - Uploads files/deliverables
   - Submits for review

3. **Review Process**
   - Team Lead reviews submission
   - Can approve or request changes
   - Provides feedback comments

4. **Final Approval**
   - Owner reviews approved tasks
   - Final sign-off
   - Task marked as complete

5. **Resubmission**
   - Member can modify and resubmit
   - Maintains submission history
   - Tracks revision count

### File Upload System

**Supported Operations:**
- Upload multiple files per submission
- Preview uploaded files
- Download files
- Delete files (with permissions)

**Security:**
- File type validation
- Size limits enforced
- Virus scanning (via Supabase)
- Access control via RLS

**Storage Structure:**
```
workspace-files/
  ├── {workspace_id}/
  │   ├── {task_id}/
  │   │   ├── {submission_id}/
  │   │   │   ├── file1.pdf
  │   │   │   ├── file2.jpg
```

### Real-Time Features

**Chat System:**
- WebSocket connection via Supabase Realtime
- Instant message delivery
- Online presence tracking
- Message persistence

**Live Updates:**
- Task status changes
- New submissions
- Application approvals
- Team member additions

---

## Architecture

### Database Schema

**Key Tables:**
- `profiles` - User information
- `workspaces` - Workspace data
- `workspace_members` - Member roles
- `tasks` - Task definitions
- `task_submissions` - Submission records
- `problem_statements` - Project definitions
- `problem_applications` - Team applications
- `problem_teams` - Team memberships
- `chat_messages` - Chat history
- `audit_logs` - Security logs

### API Structure

**Services:**
- `ProblemStatementService` - Problem/team operations
- `TaskService` - Task management
- `ChatService` - Messaging
- `StatisticsService` - Analytics
- `NotificationService` - Alerts

**Edge Functions:**
- `send-invite` - Email invitations
- Custom authentication hooks

### Security Model

**Authentication:**
- JWT tokens
- Secure session storage
- Automatic token refresh

**Authorization:**
- Row Level Security (RLS)
- Role-based access control
- Resource-level permissions

**Data Protection:**
- Encrypted connections (HTTPS)
- Encrypted storage
- Secure password hashing
- CSRF protection

---

## Getting Started

### For Users

1. **Sign Up**
   - Create account with email
   - Confirm email address
   - Complete profile

2. **Join or Create**
   - Browse problem statements
   - Create your own team OR
   - Join existing teams

3. **Collaborate**
   - Work on assigned tasks
   - Communicate via chat
   - Track your progress

### For Developers

1. **Setup**
   ```bash
   npm install
   npm run dev
   ```

2. **Environment Variables**
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Database Migrations**
   - Run migrations in order
   - Check migration guides
   - Verify RLS policies

---

## Support & Documentation

**Additional Docs:**
- [Workspace Task Management Guide](./WORKSPACE_TASK_MANAGEMENT_USER_GUIDE.md)
- [Peer Review System](./PEER_REVIEW_SYSTEM.md)
- [Task Revocation Process](./TASK_REVOCATION_PROCESS.md)
- [Submissions Gallery Guide](./SUBMISSIONS_GALLERY_USER_GUIDE.md)
- [Help Documentation Index](./HELP_DOCUMENTATION_INDEX.md)

**For Issues:**
- Check existing documentation
- Review error messages
- Contact system administrator

---

## Future Enhancements

**Planned Features:**
- Email notifications
- Advanced analytics
- Mobile app
- Video conferencing integration
- AI-powered task suggestions
- Gamification elements
- Export/import functionality
- API for third-party integrations

---

*Last Updated: November 2025*
*Version: 1.0*
