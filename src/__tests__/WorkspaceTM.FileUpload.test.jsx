/**
 * WorkspaceTM File Upload Tests
 * 
 * Tests the file upload functionality in WorkspaceTM component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import WorkspaceTM from '../WorkspaceTM';
import * as TaskService from '../services/TaskService';

// Mock dependencies
vi.mock('../supabaseClient');
vi.mock('../services/TaskService');
vi.mock('../utils/fileUtils');
vi.mock('../hooks/useRealTimeUpdates');
vi.mock('../hooks/useDebounce');
vi.mock('../hooks/useOptimisticUpdate');

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ id: 'test-workspace-id' }),
  };
});

describe('WorkspaceTM File Upload', () => {
  const mockTask = {
    id: 'task-123',
    title: 'Test Task',
    status: 'in_progress',
    assigned_to: 'user-456',
    workspace_id: 'workspace-789',
    created_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful authentication
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-456' } },
          error: null
        })
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'workspace-789', name: 'Test Workspace', created_by: 'owner-123' },
              error: null
            }),
            order: vi.fn().mockResolvedValue({
              data: [mockTask],
              error: null
            })
          })
        })
      })
    };

    vi.doMock('../supabaseClient', () => ({
      supabase: mockSupabase
    }));

    // Mock file validation
    vi.doMock('../utils/fileUtils', () => ({
      validateFile: vi.fn().mockReturnValue({ isValid: true }),
      formatFileSize: vi.fn().mockReturnValue('1.5 MB'),
      generateFilePath: vi.fn().mockReturnValue('test/path/file.pdf'),
      getFileIcon: vi.fn().mockReturnValue('📄')
    }));

    // Mock TaskService
    TaskService.uploadTaskFile = vi.fn().mockResolvedValue({ success: true });
    TaskService.startTask = vi.fn().mockResolvedValue({ success: true });

    // Mock hooks
    vi.doMock('../hooks/useRealTimeUpdates', () => ({
      default: vi.fn()
    }));

    vi.doMock('../hooks/useDebounce', () => ({
      default: vi.fn((value) => value)
    }));

    vi.doMock('../hooks/useOptimisticUpdate', () => ({
      default: vi.fn(() => ({
        data: [mockTask],
        performOptimisticUpdate: vi.fn().mockImplementation((optimisticData, operation, rollbackData) => operation())
      }))
    }));
  });

  test('should show file upload dialog when uploading task result', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Find and click upload button (this would be on a TaskCard)
    // Note: This test would need to be more specific based on actual UI structure
    const uploadButton = screen.getByText(/upload result/i);
    fireEvent.click(uploadButton);

    // Should show upload dialog
    expect(screen.getByText(/submit task result/i)).toBeInTheDocument();
    expect(screen.getByText(/choose file/i)).toBeInTheDocument();
  });

  test('should handle file selection and upload', async () => {
    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Open upload dialog
    const uploadButton = screen.getByText(/upload result/i);
    fireEvent.click(uploadButton);

    // Create a mock file
    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    // Find file input and upload file
    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Should show selected file
    expect(screen.getByText(/selected: test.pdf/i)).toBeInTheDocument();

    // Click upload button
    const submitButton = screen.getByText(/upload & submit task/i);
    fireEvent.click(submitButton);

    // Should call uploadTaskFile
    await waitFor(() => {
      expect(TaskService.uploadTaskFile).toHaveBeenCalledWith(
        'task-123',
        mockFile,
        'test-workspace-id',
        expect.any(String) // CSRF token
      );
    });
  });

  test('should handle upload errors gracefully', async () => {
    // Mock upload failure
    TaskService.uploadTaskFile = vi.fn().mockRejectedValue(new Error('Upload failed'));

    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Open upload dialog and select file
    const uploadButton = screen.getByText(/upload result/i);
    fireEvent.click(uploadButton);

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Click upload button
    const submitButton = screen.getByText(/upload & submit task/i);
    fireEvent.click(submitButton);

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/failed to submit task/i)).toBeInTheDocument();
    });
  });

  test('should validate file before upload', async () => {
    // Mock file validation failure
    vi.doMock('../utils/fileUtils', () => ({
      validateFile: vi.fn().mockReturnValue({ 
        isValid: false, 
        error: 'File too large' 
      }),
      formatFileSize: vi.fn().mockReturnValue('15 MB'),
    }));

    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Open upload dialog and select file
    const uploadButton = screen.getByText(/upload result/i);
    fireEvent.click(uploadButton);

    const mockFile = new File(['test content'], 'large-file.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    // Click upload button
    const submitButton = screen.getByText(/upload & submit task/i);
    fireEvent.click(submitButton);

    // Should show validation error
    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    // Should not call uploadTaskFile
    expect(TaskService.uploadTaskFile).not.toHaveBeenCalled();
  });

  test('should generate CSRF token if none exists', async () => {
    // Clear session storage
    sessionStorage.clear();

    render(
      <BrowserRouter>
        <WorkspaceTM />
      </BrowserRouter>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
    });

    // Open upload dialog and upload file
    const uploadButton = screen.getByText(/upload result/i);
    fireEvent.click(uploadButton);

    const mockFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });
    const fileInput = screen.getByLabelText(/choose file/i);
    fireEvent.change(fileInput, { target: { files: [mockFile] } });

    const submitButton = screen.getByText(/upload & submit task/i);
    fireEvent.click(submitButton);

    // Should generate and store CSRF token
    await waitFor(() => {
      const storedToken = sessionStorage.getItem('csrf_token');
      expect(storedToken).toBeTruthy();
      expect(storedToken).toMatch(/^csrf-/);
    });
  });
});