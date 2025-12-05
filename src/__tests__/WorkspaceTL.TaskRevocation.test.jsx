import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTL from '../WorkspaceTL';
import { supabase } from '../supabaseClient';
import * as TaskService from '../services/TaskService';

// Mock dependencies
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn()
    },
    from: vi.fn(),
    storage: {
      from: vi.fn()
    }
  }
}));

vi.mock('../services/TaskService', () => ({
  revokeTaskAssignment: vi.fn()
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'workspace-123' })
  };
});

vi.mock('../Sidebar', () => ({
  default: () => <div>Sidebar</div>
}));

vi.mock('../AddMembers', () => ({
  default: () => <div>AddMembers</div>
}));

describe('WorkspaceTL - Task Revocation', () => {
  const mockUser = {
    id: 'tl-user-123',
    email: 'tl@example.com'
  };

  const mockWorkspace = {
    id: 'workspace-123',
    name: 'Test Workspace',
    description: 'Test Description',
    created_by: 'tl-user-123'
  };

  const mockMember = {
    id: 'member-1',
    user_id: 'member-user-123',
    workspace_id: 'workspace-123',
    users: {
      id: 'member-user-123',
      email: 'member@example.com',
      full_name: 'John Doe'
    }
  };

  const mockTask = {
    id: 'task-123',
    workspace_id: 'workspace-123',
    title: 'Test Task',
    status: 'in_progress',
    assigned_to: 'member-user-123',
    assigned_by: 'tl-user-123',
    created_at: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock auth
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });

    // Mock database queries
    const createMockChain = (data) => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data, error: null }),
      order: vi.fn().mockResolvedValue({ data: data ? [data] : [], error: null })
    });

    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return createMockChain(mockWorkspace);
      }
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [mockMember], error: null })
        };
      }
      if (table === 'users') {
        return createMockChain(mockMember.users);
      }
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [mockTask], error: null })
        };
      }
      return createMockChain(null);
    });
  });

  it('should display revoke button for assigned tasks', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // Check for revoke button
    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    expect(revokeButton).toBeInTheDocument();
  });

  it('should open confirmation dialog when revoke button is clicked', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // Click revoke button
    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    // Check dialog appears
    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('should close dialog when cancel is clicked', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section and click revoke
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    // Click cancel
    const cancelButton = screen.getAllByRole('button', { name: /cancel/i })[0];
    fireEvent.click(cancelButton);

    // Dialog should close
    await waitFor(() => {
      expect(screen.queryByText('Revoke Task Assignment?')).not.toBeInTheDocument();
    });
  });

  it('should call revokeTaskAssignment when confirmed', async () => {
    TaskService.revokeTaskAssignment.mockResolvedValue({ success: true });

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section and click revoke
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    // Click confirm
    const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(TaskService.revokeTaskAssignment).toHaveBeenCalledWith('task-123');
    });
  });

  it('should display success message after successful revocation', async () => {
    TaskService.revokeTaskAssignment.mockResolvedValue({ success: true });
    window.alert = vi.fn();

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section and click revoke
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Task assignment revoked successfully!');
    });
  });

  it('should display error message if revocation fails', async () => {
    TaskService.revokeTaskAssignment.mockRejectedValue(
      new Error('Only the team lead who assigned the task can revoke it')
    );
    window.alert = vi.fn();

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section and click revoke
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        'Only the team lead who assigned the task can revoke it'
      );
    });
  });

  it('should not show revoke button for completed tasks', async () => {
    const completedTask = {
      ...mockTask,
      status: 'completed'
    };

    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockWorkspace, error: null })
        };
      }
      if (table === 'workspace_members') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [mockMember], error: null })
        };
      }
      if (table === 'tasks') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [completedTask], error: null })
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      };
    });

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Expand member section
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    // Revoke button should not be present for completed tasks
    const revokeButton = screen.queryByRole('button', { name: /revoke assignment/i });
    expect(revokeButton).not.toBeInTheDocument();
  });

  it('should refresh workspace data after successful revocation', async () => {
    TaskService.revokeTaskAssignment.mockResolvedValue({ success: true });
    window.alert = vi.fn();

    const fromSpy = vi.spyOn(supabase, 'from');

    render(
      <BrowserRouter>
        <WorkspaceTL />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    const initialCallCount = fromSpy.mock.calls.length;

    // Expand member section and revoke task
    const memberName = screen.getByText('John Doe');
    fireEvent.click(memberName);

    await waitFor(() => {
      expect(screen.getByText('Test Task')).toBeInTheDocument();
    });

    const revokeButton = screen.getByRole('button', { name: /revoke assignment/i });
    fireEvent.click(revokeButton);

    await waitFor(() => {
      expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    });

    const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Task assignment revoked successfully!');
    });

    // Verify data was refreshed (more calls to supabase.from)
    expect(fromSpy.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});
