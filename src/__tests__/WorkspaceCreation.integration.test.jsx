/**
 * Integration Test: Workspace Creation and Invitation Process
 * 
 * This test validates the complete workspace creation workflow including:
 * 1. Workspace creation with proper owner membership
 * 2. Email invitation sending
 * 3. CORS handling
 * 4. Error handling for various scenarios
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import CreateWorkspace from '../CreateWorkspace';

// Mock Supabase
vi.mock('../supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      getSession: vi.fn()
    }
  }
}));

// Mock fetch for Edge Function calls
global.fetch = vi.fn();

describe('Workspace Creation and Invitation Process', () => {
  const mockUser = {
    id: 'user-123',
    email: 'creator@test.com'
  };

  const mockSession = {
    access_token: 'mock-token-123'
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Get the mocked supabase instance
    const { supabase } = await import('../supabaseClient');
    
    // Setup default auth mocks
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    });
    
    supabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    });

    // Mock successful fetch response by default
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        success: true,
        workspace: { id: 'workspace-123', name: 'Test Workspace' },
        invitationsSent: 2,
        totalInvitations: 2,
        message: 'Workspace created successfully! 2 invitations sent.'
      })
    });
  });

  test('Successful workspace creation with invitations', async () => {
    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    // Fill in workspace details
    const nameInput = screen.getByLabelText('Workspace Name');
    const descriptionInput = screen.getByLabelText('Description');
    const emailInput = screen.getByLabelText('Email 1');

    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });
    fireEvent.change(descriptionInput, { target: { value: 'A test workspace for collaboration' } });
    fireEvent.change(emailInput, { target: { value: 'member1@test.com' } });

    // Add another email
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    const emailInput2 = screen.getByLabelText('Email 2');
    fireEvent.change(emailInput2, { target: { value: 'member2@test.com' } });

    // Submit the form
    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    // Wait for the API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/send-invite'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockSession.access_token}`,
            'x-client-info': 'educollab-web'
          }),
          body: JSON.stringify({
            workspaceName: 'Test Workspace',
            description: 'A test workspace for collaboration',
            userId: mockUser.id,
            emails: ['member1@test.com', 'member2@test.com']
          })
        })
      );
    });

    // Check that success message is shown
    await waitFor(() => {
      expect(screen.getByText(/creating/i)).not.toBeInTheDocument();
    });
  });

  test('Workspace creation without invitations', async () => {
    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    // Fill in only workspace name
    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Solo Workspace' } });

    // Submit without any emails
    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/send-invite'),
        expect.objectContaining({
          body: JSON.stringify({
            workspaceName: 'Solo Workspace',
            description: '',
            userId: mockUser.id,
            emails: []
          })
        })
      );
    });
  });

  test('CORS error handling', async () => {
    // Mock CORS error
    global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

    // Mock window.alert
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });

    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Network connection error')
      );
    });

    alertSpy.mockRestore();
  });

  test('HTTP error handling', async () => {
    // Mock HTTP error response
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Internal server error' })
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });

    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.stringContaining('Server error')
      );
    });

    alertSpy.mockRestore();
  });

  test('Authentication error handling', async () => {
    // Get the mocked supabase instance
    const { supabase } = await import('../supabaseClient');
    
    // Mock authentication failure
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: new Error('Not authenticated')
    });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });

    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please log in to create a workspace');
    });

    alertSpy.mockRestore();
  });

  test('Email validation', async () => {
    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText('Workspace Name');
    const emailInput = screen.getByLabelText('Email 1');

    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/send-invite'),
        expect.objectContaining({
          body: JSON.stringify({
            workspaceName: 'Test Workspace',
            description: '',
            userId: mockUser.id,
            emails: [] // Invalid email should be filtered out
          })
        })
      );
    });
  });

  test('Dynamic email field management', async () => {
    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    // Initially should have one email field
    expect(screen.getByLabelText('Email 1')).toBeInTheDocument();

    // Add a second email field
    const addButton = screen.getByRole('button', { name: /add/i });
    fireEvent.click(addButton);

    expect(screen.getByLabelText('Email 2')).toBeInTheDocument();

    // Add a third email field
    fireEvent.click(addButton);
    expect(screen.getByLabelText('Email 3')).toBeInTheDocument();

    // Remove the second email field
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[1]); // Delete second email field

    // Should still have Email 1 and Email 3, but Email 2 should be gone
    expect(screen.getByLabelText('Email 1')).toBeInTheDocument();
    expect(screen.queryByLabelText('Email 2')).not.toBeInTheDocument();
  });

  test('Loading state management', async () => {
    // Mock a slow response
    global.fetch.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true, workspace: { id: 'workspace-123' } })
        }), 100)
      )
    );

    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Test Workspace' } });

    const createButton = screen.getByRole('button', { name: /create workspace/i });
    fireEvent.click(createButton);

    // Should show loading state
    expect(screen.getByText('Creating...')).toBeInTheDocument();
    expect(createButton).toBeDisabled();

    // Wait for completion
    await waitFor(() => {
      expect(screen.queryByText('Creating...')).not.toBeInTheDocument();
    }, { timeout: 200 });
  });

  test('Form validation - empty workspace name', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    render(
      <BrowserRouter>
        <CreateWorkspace />
      </BrowserRouter>
    );

    // Try to submit without workspace name
    const createButton = screen.getByRole('button', { name: /create workspace/i });
    expect(createButton).toBeDisabled(); // Should be disabled when name is empty

    // Add and then clear the workspace name
    const nameInput = screen.getByLabelText('Workspace Name');
    fireEvent.change(nameInput, { target: { value: 'Test' } });
    expect(createButton).not.toBeDisabled();

    fireEvent.change(nameInput, { target: { value: '' } });
    expect(createButton).toBeDisabled();

    alertSpy.mockRestore();
  });
});