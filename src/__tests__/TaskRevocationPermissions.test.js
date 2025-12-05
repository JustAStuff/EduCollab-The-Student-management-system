// src/__tests__/TaskRevocationPermissions.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateTaskPermissions, validateTaskStatus } from '../utils/errorHandling';
import { revokeTaskAssignment } from '../services/TaskService';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(),
      })),
    })),
  },
}));

// Mock security validation
vi.mock('../utils/securityValidation', () => ({
  validateCSRFToken: vi.fn(() => true),
  auditLog: vi.fn(),
}));

describe('Task Revocation Permissions', () => {
  const mockTask = {
    id: 'task-123',
    workspace_id: 'workspace-456',
    assigned_to: 'member-user-id',
    assigned_by: 'tl-user-id',
    status: 'in_progress',
  };

  const workspaceOwnerId = 'owner-user-id';
  const teamLeadId = 'tl-user-id';
  const memberId = 'member-user-id';
  const otherMemberId = 'other-member-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateTaskPermissions for revocation', () => {
    it('should allow workspace owners to revoke any task', () => {
      const result = validateTaskPermissions(mockTask, workspaceOwnerId, 'revoke', 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow team leads to revoke tasks they assigned', () => {
      const result = validateTaskPermissions(mockTask, teamLeadId, 'revoke', 'member');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should not allow members to revoke tasks they did not assign', () => {
      const result = validateTaskPermissions(mockTask, otherMemberId, 'revoke', 'member');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Only workspace owners or the team lead who assigned the task can revoke it');
    });

    it('should not allow task assignees to revoke their own tasks (unless they are workspace owner)', () => {
      const result = validateTaskPermissions(mockTask, memberId, 'revoke', 'member');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should allow workspace owners to revoke their own tasks', () => {
      const ownerTask = {
        ...mockTask,
        assigned_to: workspaceOwnerId,
        assigned_by: workspaceOwnerId,
      };
      
      const result = validateTaskPermissions(ownerTask, workspaceOwnerId, 'revoke', 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('validateTaskStatus for revocation', () => {
    it('should allow revocation for todo tasks', () => {
      const todoTask = { ...mockTask, status: 'todo' };
      const result = validateTaskStatus(todoTask, 'revoke', workspaceOwnerId, 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow revocation for in_progress tasks', () => {
      const inProgressTask = { ...mockTask, status: 'in_progress' };
      const result = validateTaskStatus(inProgressTask, 'revoke', workspaceOwnerId, 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow revocation for submitted tasks', () => {
      const submittedTask = { ...mockTask, status: 'submitted' };
      const result = validateTaskStatus(submittedTask, 'revoke', workspaceOwnerId, 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should allow revocation for needs_revision tasks', () => {
      const needsRevisionTask = { ...mockTask, status: 'needs_revision' };
      const result = validateTaskStatus(needsRevisionTask, 'revoke', workspaceOwnerId, 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should not allow revocation for completed tasks', () => {
      const completedTask = { ...mockTask, status: 'completed' };
      const result = validateTaskStatus(completedTask, 'revoke', workspaceOwnerId, 'owner');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('revoke assignments for completed tasks');
    });

    it('should allow workspace owners enhanced revocation permissions', () => {
      // Test that workspace owners can revoke from any status except completed
      const statuses = ['todo', 'in_progress', 'submitted', 'needs_revision'];
      
      statuses.forEach(status => {
        const task = { ...mockTask, status, assigned_to: workspaceOwnerId };
        const result = validateTaskStatus(task, 'revoke', workspaceOwnerId, 'owner');
        
        expect(result.isValid).toBe(true);
        expect(result.error).toBeNull();
      });
    });
  });

  describe('revokeTaskAssignment service function integration', () => {
    it('should have the revokeTaskAssignment function available', () => {
      expect(typeof revokeTaskAssignment).toBe('function');
    });

    it('should be exported from TaskService', () => {
      expect(revokeTaskAssignment).toBeDefined();
    });
  });

  describe('Edge cases and error scenarios', () => {
    it('should handle missing task scenario', () => {
      const result = validateTaskPermissions(null, workspaceOwnerId, 'revoke', 'owner');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle missing user ID scenario', () => {
      const result = validateTaskPermissions(mockTask, null, 'revoke', 'owner');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('You must be logged in');
    });

    it('should handle undefined workspace role gracefully', () => {
      const result = validateTaskPermissions(mockTask, teamLeadId, 'revoke', null);
      
      // Should still work for team leads who assigned the task
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle workspace owner with null workspace role', () => {
      // Even if workspaceRole is null, if they assigned the task, they should be able to revoke
      const ownerTask = {
        ...mockTask,
        assigned_by: workspaceOwnerId,
      };
      
      const result = validateTaskPermissions(ownerTask, workspaceOwnerId, 'revoke', null);
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle workspace owner revoking member task', () => {
      const memberTask = {
        ...mockTask,
        assigned_to: memberId,
        assigned_by: teamLeadId,
      };
      
      const result = validateTaskPermissions(memberTask, workspaceOwnerId, 'revoke', 'owner');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should handle team lead revoking their assigned task', () => {
      const tlTask = {
        ...mockTask,
        assigned_to: memberId,
        assigned_by: teamLeadId,
      };
      
      const result = validateTaskPermissions(tlTask, teamLeadId, 'revoke', 'member');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should prevent regular members from revoking any tasks', () => {
      const scenarios = [
        // Member trying to revoke their own task
        { ...mockTask, assigned_to: memberId, assigned_by: teamLeadId },
        // Member trying to revoke another member's task
        { ...mockTask, assigned_to: otherMemberId, assigned_by: teamLeadId },
        // Member trying to revoke TL's task
        { ...mockTask, assigned_to: teamLeadId, assigned_by: workspaceOwnerId },
      ];

      scenarios.forEach((task, index) => {
        const result = validateTaskPermissions(task, memberId, 'revoke', 'member');
        
        expect(result.isValid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error.message).toContain('Only workspace owners or the team lead who assigned the task can revoke it');
      });
    });
  });
});

console.log('✅ Task Revocation Permissions tests completed');