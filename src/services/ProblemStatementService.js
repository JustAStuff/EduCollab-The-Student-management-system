// Problem Statement Service
// Handles all backend operations for problem statements

import { supabase } from '../supabaseClient';

class ProblemStatementService {
  
  // ============================================================================
  // Problem Statements CRUD
  // ============================================================================

  /**
   * Get all active problem statements
   */
  async getAllProblemStatements() {
    try {
      const { data, error } = await supabase
        .from('problem_statements')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return empty array with helpful message
        if (error.code === 'PGRST205' || error.message.includes("Could not find the table")) {
          console.warn('Problem statements table not found. Please run the database setup script.');
          return { 
            data: [], 
            error: 'Database not set up. Please run the setup script in your Supabase dashboard.',
            needsSetup: true
          };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching problem statements:', error);
      return { 
        data: [], 
        error: error.message,
        needsSetup: error.code === 'PGRST205' || error.message.includes("Could not find the table")
      };
    }
  }

  /**
   * Get a specific problem statement by ID
   */
  async getProblemStatement(id) {
    try {
      const { data, error } = await supabase
        .from('problem_statements')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching problem statement:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Create a new problem statement
   */
  async createProblemStatement(problemData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('problem_statements')
        .insert([{
          ...problemData,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error creating problem statement:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Update a problem statement
   */
  async updateProblemStatement(id, updates) {
    try {
      const { data, error } = await supabase
        .from('problem_statements')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error updating problem statement:', error);
      return { data: null, error: error.message };
    }
  }

  // ============================================================================
  // Applications Management
  // ============================================================================

  /**
   * Apply for a problem statement role
   * @param {string} problemId - Problem statement ID
   * @param {string} role - 'Lead' or 'Member'
   * @param {string} teamId - Team ID (required for Member, null for Lead to create new team)
   * @param {string} message - Optional application message
   */
  async applyForProblem(problemId, role, teamId = null, message = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const applicationData = {
        problem_id: problemId,
        user_id: user.id,
        role: role,
        message: message,
        status: 'pending'
      };

      // Add team_id for Member applications, null for Lead (creates new team)
      if (role === 'Member' && teamId) {
        applicationData.team_id = teamId;
      }

      const { data, error } = await supabase
        .from('problem_applications')
        .insert([applicationData])
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error applying for problem:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get user's applications
   */
  async getUserApplications() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('problem_applications')
        .select(`
          *,
          problem_statements (
            title,
            description,
            difficulty,
            duration
          )
        `)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching user applications:', error);
      return { data: null, error: error.message };
    }
  }

  /**
   * Get applications for a problem (for problem creators)
   */
  async getProblemApplications(problemId) {
    try {
      // First get applications
      const { data: appData, error: appError } = await supabase
        .from('problem_applications')
        .select('*')
        .eq('problem_id', problemId)
        .order('applied_at', { ascending: false });

      if (appError) throw appError;
      
      if (!appData || appData.length === 0) {
        return { data: [], error: null };
      }

      // Then get user details for each applicant
      const userIds = appData.map(app => app.user_id);
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // If profiles table doesn't exist or has no data, return without user details
      if (userError || !userData) {
        return { 
          data: appData.map(app => ({
            ...app,
            user: { email: 'User' }
          })), 
          error: null 
        };
      }

      // Merge application data with user data
      const enrichedData = appData.map(app => {
        const user = userData.find(u => u.id === app.user_id);
        return {
          ...app,
          user: user || { email: 'User' }
        };
      });

      return { data: enrichedData, error: null };
    } catch (error) {
      console.error('Error fetching problem applications:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Approve or reject an application
   */
  async reviewApplication(applicationId, status, reviewMessage = '') {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('problem_applications')
        .update({
          status: status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
          message: reviewMessage
        })
        .eq('id', applicationId)
        .select()
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error reviewing application:', error);
      return { data: null, error: error.message };
    }
  }

  // ============================================================================
  // Team Management
  // ============================================================================

  /**
   * Get all teams for a problem (grouped by team_id)
   */
  async getProblemTeams(problemId) {
    try {
      // First get all team members
      const { data: teamData, error: teamError } = await supabase
        .from('problem_teams')
        .select('*')
        .eq('problem_id', problemId)
        .order('joined_at', { ascending: true });

      if (teamError) throw teamError;
      
      if (!teamData || teamData.length === 0) {
        return { data: [], error: null };
      }

      // Get user details for each team member
      const userIds = teamData.map(member => member.user_id);
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Merge team data with user data
      const enrichedData = teamData.map(member => {
        const user = userData?.find(u => u.id === member.user_id);
        return {
          ...member,
          user: user || { email: 'User' }
        };
      });

      // Group by team_id
      const teams = enrichedData.reduce((acc, member) => {
        const teamId = member.team_id;
        if (!acc[teamId]) {
          acc[teamId] = {
            team_id: teamId,
            problem_id: problemId,
            members: [],
            lead: null,
            member_count: 0
          };
        }
        
        acc[teamId].members.push(member);
        acc[teamId].member_count++;
        
        if (member.role === 'Lead') {
          acc[teamId].lead = member;
        }
        
        return acc;
      }, {});

      // Convert to array
      const teamsArray = Object.values(teams);

      return { data: teamsArray, error: null };
    } catch (error) {
      console.error('Error fetching problem teams:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Get team members for a problem (legacy - returns flat list)
   */
  async getProblemTeam(problemId) {
    try {
      // First get team members
      const { data: teamData, error: teamError } = await supabase
        .from('problem_teams')
        .select('*')
        .eq('problem_id', problemId)
        .order('joined_at', { ascending: true });

      if (teamError) throw teamError;
      
      if (!teamData || teamData.length === 0) {
        return { data: [], error: null };
      }

      // Then get user details for each team member
      const userIds = teamData.map(member => member.user_id);
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // If profiles table doesn't exist or has no data, try to get from auth metadata
      if (userError || !userData) {
        // Return team data without user details
        return { 
          data: teamData.map(member => ({
            ...member,
            user: { email: 'User' }
          })), 
          error: null 
        };
      }

      // Merge team data with user data
      const enrichedData = teamData.map(member => {
        const user = userData.find(u => u.id === member.user_id);
        return {
          ...member,
          user: user || { email: 'User' }
        };
      });

      return { data: enrichedData, error: null };
    } catch (error) {
      console.error('Error fetching problem team:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Get user's team memberships (for My Workspaces)
   */
  async getUserTeams() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('problem_teams')
        .select(`
          *,
          problem_statements (
            id,
            title,
            description,
            difficulty,
            duration,
            team_size,
            skills,
            status,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false });

      if (error) {
        // Handle missing table gracefully
        if (error.code === 'PGRST205' || error.message.includes("Could not find the table")) {
          console.warn('Problem teams table not found. Please run the database setup script.');
          return { 
            data: [], 
            error: null,
            needsSetup: true
          };
        }
        throw error;
      }
      return { data, error: null };
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return { 
        data: [], 
        error: error.message,
        needsSetup: error.code === 'PGRST205' || error.message.includes("Could not find the table")
      };
    }
  }

  /**
   * Get applications that need review (for leads)
   */
  async getPendingApplicationsForReview() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Get teams where user is a lead (with team_id)
      const { data: leadTeams, error: leadError } = await supabase
        .from('problem_teams')
        .select('problem_id, team_id')
        .eq('user_id', user.id)
        .eq('role', 'Lead');

      if (leadError) throw leadError;

      if (!leadTeams || leadTeams.length === 0) {
        return { data: [], error: null };
      }

      // Get pending applications for those specific teams
      const teamIds = leadTeams.map(t => t.team_id);

      const { data: applications, error } = await supabase
        .from('problem_applications')
        .select(`
          *,
          problem_statements (
            title,
            description
          )
        `)
        .in('team_id', teamIds)
        .eq('status', 'pending')
        .order('applied_at', { ascending: true });

      if (error) throw error;

      if (!applications || applications.length === 0) {
        return { data: [], error: null };
      }

      // Get user profiles for applicants
      const userIds = applications.map(app => app.user_id);
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      // Merge application data with user profiles
      const enrichedApplications = applications.map(app => {
        const profile = profiles?.find(p => p.id === app.user_id);
        return {
          ...app,
          applicant: profile || { 
            id: app.user_id,
            email: 'Unknown User',
            full_name: 'Unknown User'
          }
        };
      });

      return { data: enrichedApplications, error: null };
    } catch (error) {
      console.error('Error fetching pending applications:', error);
      return { data: [], error: error.message };
    }
  }

  /**
   * Remove a team member
   */
  async removeTeamMember(problemId, userId) {
    try {
      const { data, error } = await supabase
        .from('problem_teams')
        .delete()
        .eq('problem_id', problemId)
        .eq('user_id', userId);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Error removing team member:', error);
      return { data: null, error: error.message };
    }
  }

  // ============================================================================
  // Statistics and Analytics
  // ============================================================================

  /**
   * Get problem statement statistics
   */
  async getProblemStatistics(problemId) {
    try {
      // Get application counts
      const { data: applications, error: appError } = await supabase
        .from('problem_applications')
        .select('role, status')
        .eq('problem_id', problemId);

      if (appError) throw appError;

      // Get team counts
      const { data: team, error: teamError } = await supabase
        .from('problem_teams')
        .select('role')
        .eq('problem_id', problemId);

      if (teamError) throw teamError;

      // Calculate statistics
      const stats = {
        totalApplications: applications.length,
        pendingApplications: applications.filter(app => app.status === 'pending').length,
        approvedApplications: applications.filter(app => app.status === 'approved').length,
        rejectedApplications: applications.filter(app => app.status === 'rejected').length,
        leadApplications: applications.filter(app => app.role === 'Lead').length,
        memberApplications: applications.filter(app => app.role === 'Member').length,
        teamSize: team.length,
        teamLeads: team.filter(member => member.role === 'Lead').length,
        teamMembers: team.filter(member => member.role === 'Member').length
      };

      return { data: stats, error: null };
    } catch (error) {
      console.error('Error fetching problem statistics:', error);
      return { data: null, error: error.message };
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Check if user has already applied for a problem
   * Returns all applications for this problem by this user
   */
  async hasUserApplied(problemId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: false, error: null, applications: [] };

      const { data, error } = await supabase
        .from('problem_applications')
        .select('id, status, role, team_id')
        .eq('problem_id', problemId)
        .eq('user_id', user.id)
        .order('applied_at', { ascending: false });

      if (error) {
        // If table doesn't exist, return false (user hasn't applied)
        if (error.code === 'PGRST205' || error.message.includes("Could not find the table")) {
          console.warn('Problem applications table not found. Please run the database setup script.');
          return { 
            data: false, 
            error: null,
            applications: [],
            needsSetup: true
          };
        }
        throw error;
      }
      
      return { 
        data: data && data.length > 0, 
        error: null,
        applications: data || []
      };
    } catch (error) {
      console.error('Error checking user application:', error);
      return { 
        data: false, 
        error: error.message,
        applications: [],
        needsSetup: error.code === 'PGRST205' || error.message.includes("Could not find the table")
      };
    }
  }

  /**
   * Check if user has applied to a specific team
   */
  async hasUserAppliedToTeam(problemId, teamId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: false, error: null };

      const { data, error } = await supabase
        .from('problem_applications')
        .select('id, status, role')
        .eq('problem_id', problemId)
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return { 
        data: !!data, 
        error: null,
        application: data 
      };
    } catch (error) {
      console.error('Error checking team application:', error);
      return { data: false, error: error.message };
    }
  }

  /**
   * Get current user ID
   */
  async getCurrentUserId() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id || null;
    } catch (error) {
      console.error('Error getting current user ID:', error);
      return null;
    }
  }

  /**
   * Check if user is team member of a problem
   */
  async isUserTeamMember(problemId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { data: false, error: null };

      const { data, error } = await supabase
        .from('problem_teams')
        .select('role')
        .eq('problem_id', problemId)
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      return { 
        data: !!data, 
        error: null,
        role: data?.role 
      };
    } catch (error) {
      console.error('Error checking team membership:', error);
      return { data: false, error: error.message };
    }
  }
}

// Export singleton instance
const problemStatementService = new ProblemStatementService();
export default problemStatementService;