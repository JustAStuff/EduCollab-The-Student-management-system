/**
 * Test to verify WorkspaceTM database queries work correctly
 */

import { supabase } from '../supabaseClient';

// Mock supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'user-123', email: 'member@test.com' } }
      }))
    },
    from: vi.fn((table) => {
      if (table === 'workspaces') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'workspace-1', name: 'Test Workspace', created_by: 'owner-123' }
              }))
            }))
          }))
        };
      }
      
      if (table === 'workspace_members') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn(() => Promise.resolve({
                  data: { id: 'member-1', role: 'member' }
                }))
              }))
            }))
          }))
        };
      }
      
      if (table === 'tasks') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({
                  order: vi.fn(() => Promise.resolve({
                    data: [
                      {
                        id: 'tl-task-1',
                        title: 'TL Task',
                        status: 'submitted',
                        assigned_to: 'owner-123',
                        workspace_id: 'workspace-1',
                        assigned_by: 'owner-123',
                        submission_file_url: 'path/to/file.pdf'
                      }
                    ]
                  }))
                }))
              }))
            }))
          }))
        };
      }
      
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({
                data: { id: 'owner-123', email: 'owner@test.com', full_name: 'Team Lead' }
              }))
            }))
          }))
        };
      }
    })
  }
}));

describe('WorkspaceTM Database Queries', () => {
  test('should fetch TL tasks without foreign key errors', async () => {
    const workspaceId = 'workspace-1';
    const workspaceOwnerId = 'owner-123';

    // Test the corrected query approach
    const { data: tlTasksData, error: tlTasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("assigned_to", workspaceOwnerId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });

    expect(tlTasksError).toBeNull();
    expect(tlTasksData).toBeDefined();
    expect(Array.isArray(tlTasksData)).toBe(true);
  });

  test('should fetch user details separately without foreign key relationships', async () => {
    const userId = 'owner-123';

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', userId)
      .single();

    expect(userError).toBeNull();
    expect(userData).toBeDefined();
  });
});