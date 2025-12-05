/**
 * Database Diagnostic Test
 * 
 * This test helps diagnose database schema and RLS policy issues
 * Run this to understand what's working and what needs to be fixed
 */

import { supabase } from '../supabaseClient';

describe('Database Diagnostic Tests', () => {
  let testWorkspaceId;
  let testUserId;

  beforeAll(async () => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    testUserId = user?.id;
    
    // Try to get a workspace
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .limit(1);
    
    testWorkspaceId = workspaces?.[0]?.id;
  });

  describe('Database Schema Checks', () => {
    test('should verify tasks table has all required columns', async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('id, started_at, submission_file_size')
        .limit(1);

      console.log('Tasks table schema check:', { data, error });
      
      if (error) {
        console.error('❌ Tasks table missing columns:', error.message);
        expect(error).toBeNull();
      } else {
        console.log('✅ Tasks table has required columns');
      }
    });

    test('should verify task_reviews table exists', async () => {
      const { data, error } = await supabase
        .from('task_reviews')
        .select('id')
        .limit(1);

      console.log('Task reviews table check:', { data, error });
      
      if (error && error.message.includes('does not exist')) {
        console.error('❌ Task reviews table missing');
      } else {
        console.log('✅ Task reviews table exists');
      }
    });
  });

  describe('RLS Policy Checks', () => {
    test('should check workspace_members query permissions', async () => {
      if (!testWorkspaceId || !testUserId) {
        console.log('⚠️ Skipping workspace members test - no test data');
        return;
      }

      const { data, error } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', testWorkspaceId)
        .eq('user_id', testUserId);

      console.log('Workspace members query:', { data, error });
      
      if (error) {
        console.error('❌ Workspace members query failed:', error.message);
        if (error.code === '406') {
          console.error('   This is likely an RLS policy issue');
        }
      } else {
        console.log('✅ Workspace members query works');
      }
    });

    test('should check tasks query permissions', async () => {
      if (!testWorkspaceId) {
        console.log('⚠️ Skipping tasks test - no test workspace');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, status, assigned_to')
        .eq('workspace_id', testWorkspaceId)
        .limit(5);

      console.log('Tasks query:', { data, error });
      
      if (error) {
        console.error('❌ Tasks query failed:', error.message);
        if (error.code === '400' || error.code === '406') {
          console.error('   This is likely an RLS policy or schema issue');
        }
      } else {
        console.log('✅ Tasks query works');
      }
    });

    test('should check submissions query permissions', async () => {
      if (!testWorkspaceId) {
        console.log('⚠️ Skipping submissions test - no test workspace');
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .select('id, title, submission_file_url, submission_file_name, submission_file_size, submitted_at, status, assigned_to')
        .eq('workspace_id', testWorkspaceId)
        .not('submission_file_url', 'is', null)
        .order('submitted_at', { ascending: false });

      console.log('Submissions query:', { data, error });
      
      if (error) {
        console.error('❌ Submissions query failed:', error.message);
        if (error.code === '400') {
          console.error('   This might be due to missing columns or RLS issues');
        }
      } else {
        console.log('✅ Submissions query works');
      }
    });
  });

  describe('Task Operations Checks', () => {
    test('should check task status update capability', async () => {
      // This test checks if we can perform the update operation that's failing
      const { data: tasks } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('status', 'todo')
        .limit(1);

      if (!tasks || tasks.length === 0) {
        console.log('⚠️ No todo tasks found for testing');
        return;
      }

      const testTaskId = tasks[0].id;
      
      // Try to update with started_at field
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', testTaskId)
        .select();

      console.log('Task status update test:', { data, error });
      
      if (error) {
        console.error('❌ Task status update failed:', error.message);
        if (error.message.includes('started_at')) {
          console.error('   The started_at column is missing from the database');
        }
      } else {
        console.log('✅ Task status update works');
        
        // Revert the change
        await supabase
          .from('tasks')
          .update({ status: 'todo', started_at: null })
          .eq('id', testTaskId);
      }
    });
  });

  describe('Current Working Features', () => {
    test('should verify basic authentication works', async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        console.error('❌ Authentication not working');
      } else {
        console.log('✅ Authentication works - User ID:', user.id);
      }
    });

    test('should verify workspace access works', async () => {
      const { data, error } = await supabase
        .from('workspaces')
        .select('id, name')
        .limit(5);

      if (error) {
        console.error('❌ Workspace access failed:', error.message);
      } else {
        console.log('✅ Workspace access works - Found', data?.length || 0, 'workspaces');
      }
    });
  });
});

// Helper function to run diagnostics manually
export const runDatabaseDiagnostics = async () => {
  console.log('🔍 Running Database Diagnostics...\n');
  
  try {
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Authentication failed');
      return;
    }
    console.log('✅ Authentication works');

    // Check basic workspace access
    const { data: workspaces, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .limit(1);
    
    if (workspaceError) {
      console.error('❌ Workspace access failed:', workspaceError.message);
      return;
    }
    console.log('✅ Workspace access works');

    if (!workspaces || workspaces.length === 0) {
      console.log('⚠️ No workspaces found');
      return;
    }

    const testWorkspaceId = workspaces[0].id;
    console.log('Using workspace:', workspaces[0].name);

    // Check tasks table schema
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, started_at, submission_file_size')
      .eq('workspace_id', testWorkspaceId)
      .limit(1);

    if (tasksError) {
      console.error('❌ Tasks schema issue:', tasksError.message);
      if (tasksError.message.includes('started_at')) {
        console.error('   → Need to run database migration to add started_at column');
      }
    } else {
      console.log('✅ Tasks table schema is correct');
    }

    // Check workspace members
    const { data: members, error: membersError } = await supabase
      .from('workspace_members')
      .select('*')
      .eq('workspace_id', testWorkspaceId);

    if (membersError) {
      console.error('❌ Workspace members query failed:', membersError.message);
      if (membersError.code === '406') {
        console.error('   → This is an RLS policy issue');
      }
    } else {
      console.log('✅ Workspace members query works');
    }

    // Check submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('tasks')
      .select('id, title, submission_file_url, submission_file_name')
      .eq('workspace_id', testWorkspaceId)
      .not('submission_file_url', 'is', null);

    if (submissionsError) {
      console.error('❌ Submissions query failed:', submissionsError.message);
    } else {
      console.log('✅ Submissions query works');
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  }
};

export default runDatabaseDiagnostics;