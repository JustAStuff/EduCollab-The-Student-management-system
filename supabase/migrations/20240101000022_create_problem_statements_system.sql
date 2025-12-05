-- Migration: Create Problem Statements System
-- This creates the backend for the Problem Statement page

-- ============================================================================
-- 1. Create problem_statements table
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
  duration VARCHAR(50) NOT NULL,
  team_size VARCHAR(50) NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  requirements TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- 2. Create problem_applications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Lead', 'Member')),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message TEXT,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate applications
  UNIQUE(problem_id, user_id)
);

-- ============================================================================
-- 3. Create problem_teams table (for approved applications)
-- ============================================================================

CREATE TABLE IF NOT EXISTS problem_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  problem_id UUID NOT NULL REFERENCES problem_statements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('Lead', 'Member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Prevent duplicate team memberships
  UNIQUE(problem_id, user_id)
);

-- ============================================================================
-- 4. Enable RLS on all tables
-- ============================================================================

ALTER TABLE problem_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE problem_teams ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. Create RLS policies for problem_statements
-- ============================================================================

-- Anyone can view active problem statements
CREATE POLICY "Anyone can view active problem statements" ON problem_statements
FOR SELECT TO authenticated
USING (status = 'active');

-- Users can create problem statements
CREATE POLICY "Users can create problem statements" ON problem_statements
FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

-- Users can update their own problem statements
CREATE POLICY "Users can update their own problem statements" ON problem_statements
FOR UPDATE TO authenticated
USING (created_by = auth.uid());

-- ============================================================================
-- 6. Create RLS policies for problem_applications
-- ============================================================================

-- Users can view their own applications
CREATE POLICY "Users can view their own applications" ON problem_applications
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Problem creators can view applications for their problems
CREATE POLICY "Problem creators can view applications" ON problem_applications
FOR SELECT TO authenticated
USING (
  problem_id IN (
    SELECT id FROM problem_statements WHERE created_by = auth.uid()
  )
);

-- Users can create applications
CREATE POLICY "Users can create applications" ON problem_applications
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

-- Problem creators can update applications (approve/reject)
CREATE POLICY "Problem creators can update applications" ON problem_applications
FOR UPDATE TO authenticated
USING (
  problem_id IN (
    SELECT id FROM problem_statements WHERE created_by = auth.uid()
  )
);

-- ============================================================================
-- 7. Create RLS policies for problem_teams
-- ============================================================================

-- Team members can view their team
CREATE POLICY "Team members can view their team" ON problem_teams
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Problem creators can view their problem teams
CREATE POLICY "Problem creators can view their teams" ON problem_teams
FOR SELECT TO authenticated
USING (
  problem_id IN (
    SELECT id FROM problem_statements WHERE created_by = auth.uid()
  )
);

-- System can insert team members (via triggers)
CREATE POLICY "System can insert team members" ON problem_teams
FOR INSERT TO authenticated
WITH CHECK (true);

-- ============================================================================
-- 8. Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_problem_statements_status ON problem_statements(status);
CREATE INDEX IF NOT EXISTS idx_problem_statements_difficulty ON problem_statements(difficulty);
CREATE INDEX IF NOT EXISTS idx_problem_statements_created_by ON problem_statements(created_by);
CREATE INDEX IF NOT EXISTS idx_problem_applications_problem_id ON problem_applications(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_applications_user_id ON problem_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_applications_status ON problem_applications(status);
CREATE INDEX IF NOT EXISTS idx_problem_teams_problem_id ON problem_teams(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_teams_user_id ON problem_teams(user_id);

-- ============================================================================
-- 9. Create trigger to auto-add approved applications to teams
-- ============================================================================

CREATE OR REPLACE FUNCTION handle_approved_application()
RETURNS TRIGGER AS $$
BEGIN
  -- If application is approved, add user to team
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    INSERT INTO problem_teams (problem_id, user_id, role)
    VALUES (NEW.problem_id, NEW.user_id, NEW.role)
    ON CONFLICT (problem_id, user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_approved_application
  AFTER UPDATE ON problem_applications
  FOR EACH ROW
  EXECUTE FUNCTION handle_approved_application();

-- ============================================================================
-- 10. Insert sample problem statements
-- ============================================================================

INSERT INTO problem_statements (title, description, difficulty, duration, team_size, skills, requirements) VALUES
(
  'AI-powered Student Performance Tracker',
  'Develop an intelligent system to track and analyze student performance using machine learning algorithms.',
  'Advanced',
  '3-4 months',
  '4-6 members',
  ARRAY['React', 'Python', 'Machine Learning', 'Data Analysis'],
  ARRAY[
    'Build a dashboard for performance visualization',
    'Implement ML algorithms for predictive analysis',
    'Create student and teacher interfaces',
    'Develop reporting and analytics features'
  ]
),
(
  'Smart Attendance Management System',
  'Create a modern attendance system with facial recognition and automated reporting capabilities.',
  'Intermediate',
  '2-3 months',
  '3-5 members',
  ARRAY['React', 'Node.js', 'Computer Vision', 'Database Design'],
  ARRAY[
    'Implement facial recognition for attendance',
    'Build admin dashboard for management',
    'Create mobile app for students',
    'Generate automated attendance reports'
  ]
),
(
  'Collaborative Study Group Platform',
  'Build a platform for students to form study groups, share resources, and collaborate on projects.',
  'Beginner',
  '1-2 months',
  '2-4 members',
  ARRAY['React', 'Firebase', 'Real-time Communication', 'UI/UX'],
  ARRAY[
    'Create user registration and profiles',
    'Implement group creation and management',
    'Build file sharing capabilities',
    'Add real-time chat functionality'
  ]
),
(
  'College Event Management App',
  'Develop a comprehensive app for managing college events, registrations, and notifications.',
  'Intermediate',
  '2-3 months',
  '3-5 members',
  ARRAY['React Native', 'Node.js', 'Push Notifications', 'Payment Integration'],
  ARRAY[
    'Build event creation and management system',
    'Implement user registration and ticketing',
    'Add push notifications for updates',
    'Create analytics dashboard for organizers'
  ]
);

-- ============================================================================
-- 11. Create helpful comments
-- ============================================================================

COMMENT ON TABLE problem_statements IS 'Stores available problem statements for students to work on';
COMMENT ON TABLE problem_applications IS 'Tracks user applications for problem statement roles';
COMMENT ON TABLE problem_teams IS 'Stores approved team members for each problem statement';

COMMENT ON COLUMN problem_statements.skills IS 'Array of required technical skills';
COMMENT ON COLUMN problem_statements.requirements IS 'Array of project requirements';
COMMENT ON COLUMN problem_applications.role IS 'Applied role: Lead or Member';
COMMENT ON COLUMN problem_applications.status IS 'Application status: pending, approved, or rejected';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- Problem Statement system is now ready with:
-- ✅ Problem statements storage
-- ✅ Application system
-- ✅ Team management
-- ✅ RLS security policies
-- ✅ Sample data
-- ============================================================================