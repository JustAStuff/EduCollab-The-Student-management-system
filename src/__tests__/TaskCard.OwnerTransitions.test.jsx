/**
 * Integration test for TaskCard component with owner task state transitions
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import TaskCard from '../components/tasks/TaskCard';

// Mock the UI consistency config
vi.mock('../config/uiConsistency', () => ({
  getStatusStyle: vi.fn(() => ({
    label: 'Todo',
    color: 'default',
    icon: 'RadioButtonUnchecked',
    bgColor: '#f5f5f5',
    textColor: '#666'
  })),
  getActionButtonConfig: vi.fn(() => ({
    text: 'Start Task',
    color: 'primary',
    icon: 'PlayArrow'
  })),
  getCardStyle: vi.fn(() => ({})),
  getButtonStyle: vi.fn(() => ({})),
  getButtonGroupStyle: vi.fn(() => ({})),
  TYPOGRAPHY_CONFIG: {
    taskTitle: { variant: 'h6' },
    taskDescription: { variant: 'body2' },
    metadata: { variant: 'caption' },
    reviewComments: { variant: 'body2', sx: {} }
  },
  ICON_CONFIG: {
    size: { small: 16, medium: 20 },
    colors: { default: '#666' }
  }
}));

describe('TaskCard Owner Task State Transitions', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    description: 'Test Description',
    status: 'todo',
    created_at: '2024-01-01T00:00:00Z',
    assigned_to: 'owner-user-id'
  };

  const defaultProps = {
    task: mockTask,
    userRole: 'tl',
    workspaceRole: 'owner',
    currentUserId: 'owner-user-id',
    onStatusChange: vi.fn(),
    onUpload: vi.fn(),
    onReview: vi.fn(),
    onRevoke: vi.fn(),
    onDeleteSubmission: vi.fn(),
    onReuploadSubmission: vi.fn(),
    onViewSubmission: vi.fn(),
    onDownloadSubmission: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should show Start Task button for workspace owner on todo task', () => {
    render(<TaskCard {...defaultProps} />);
    
    expect(screen.getByText('Start Task')).toBeInTheDocument();
  });

  test('should show Restart Task button for workspace owner on needs_revision task', () => {
    const taskNeedsRevision = { ...mockTask, status: 'needs_revision' };
    render(<TaskCard {...defaultProps} task={taskNeedsRevision} />);
    
    expect(screen.getByText('Restart Task')).toBeInTheDocument();
  });

  test('should show Upload Result button for workspace owner on in_progress task', () => {
    const taskInProgress = { ...mockTask, status: 'in_progress' };
    render(<TaskCard {...defaultProps} task={taskInProgress} />);
    
    expect(screen.getByText('Upload Result')).toBeInTheDocument();
  });

  test('should not show action button for workspace owner on submitted task (peer review required)', () => {
    const taskSubmitted = { ...mockTask, status: 'submitted' };
    render(<TaskCard {...defaultProps} task={taskSubmitted} />);
    
    // Workspace owners cannot self-approve their submitted tasks
    // They need peer review from teammates
    expect(screen.queryByText('Mark Complete')).not.toBeInTheDocument();
  });

  test('should show Reopen Task button for workspace owner on completed task', () => {
    const taskCompleted = { ...mockTask, status: 'completed' };
    render(<TaskCard {...defaultProps} task={taskCompleted} />);
    
    expect(screen.getByText('Reopen Task')).toBeInTheDocument();
  });

  test('should call onStatusChange with correct parameters when Start Task is clicked', () => {
    render(<TaskCard {...defaultProps} />);
    
    const startButton = screen.getByText('Start Task');
    fireEvent.click(startButton);
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('task-123', 'in_progress');
  });

  test('should show review buttons for workspace owners viewing others submitted tasks', () => {
    // When workspace owner views a task submitted by someone else, they should see review buttons
    const taskSubmittedByOther = { 
      ...mockTask, 
      status: 'submitted',
      assigned_to: 'other-user-id',
      submission_file_url: 'path/to/file.pdf'
    };
    
    render(<TaskCard {...defaultProps} task={taskSubmittedByOther} />);
    
    // Should see review buttons for others' tasks
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Request Redo')).toBeInTheDocument();
  });

  test('should call onStatusChange with correct parameters when Reopen Task is clicked', () => {
    const taskCompleted = { ...mockTask, status: 'completed' };
    render(<TaskCard {...defaultProps} task={taskCompleted} />);
    
    const reopenButton = screen.getByText('Reopen Task');
    fireEvent.click(reopenButton);
    
    expect(defaultProps.onStatusChange).toHaveBeenCalledWith('task-123', 'in_progress');
  });

  test('should call onUpload when Upload Result is clicked', () => {
    const taskInProgress = { ...mockTask, status: 'in_progress' };
    render(<TaskCard {...defaultProps} task={taskInProgress} />);
    
    const uploadButton = screen.getByText('Upload Result');
    fireEvent.click(uploadButton);
    
    expect(defaultProps.onUpload).toHaveBeenCalledWith(taskInProgress);
  });

  test('should not show submission modification buttons for workspace owners', () => {
    const taskSubmitted = { 
      ...mockTask, 
      status: 'submitted',
      submission_file_name: 'test.pdf'
    };
    render(<TaskCard {...defaultProps} task={taskSubmitted} />);
    
    // Workspace owners should not see delete/re-upload buttons for their own tasks
    expect(screen.queryByTitle(/Delete your submission/)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Replace your current submission/)).not.toBeInTheDocument();
  });

  test('should not show action buttons for non-assignees', () => {
    const nonAssigneeProps = {
      ...defaultProps,
      currentUserId: 'other-user-id'
    };
    render(<TaskCard {...nonAssigneeProps} />);
    
    expect(screen.queryByText('Start Task')).not.toBeInTheDocument();
  });

  test('should show updating state correctly', () => {
    render(<TaskCard {...defaultProps} isUpdating={true} />);
    
    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  test('should not show review buttons for workspace owner on their own submitted task', () => {
    const taskSubmittedByOwner = { 
      ...mockTask, 
      status: 'submitted',
      assigned_to: 'owner-user-id', // Same as currentUserId
      submission_file_url: 'path/to/file.pdf'
    };
    
    const propsWithReview = {
      ...defaultProps,
      task: taskSubmittedByOwner,
      onReview: vi.fn() // Even with onReview prop, should not show buttons
    };
    
    render(<TaskCard {...propsWithReview} />);
    
    // Should NOT see review buttons for own task
    expect(screen.queryByText('Approve')).not.toBeInTheDocument();
    expect(screen.queryByText('Request Redo')).not.toBeInTheDocument();
    expect(screen.queryByText('View')).not.toBeInTheDocument();
    expect(screen.queryByText('Download')).not.toBeInTheDocument();
  });
});