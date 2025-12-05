import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RevocationDialog from '../RevocationDialog';

describe('RevocationDialog', () => {
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
  };

  const mockMember = {
    full_name: 'John Doe',
    email: 'john@example.com',
  };

  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();

  it('renders dialog when open', () => {
    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Revoke Task Assignment?')).toBeInTheDocument();
    expect(screen.getByText('Test Task')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <RevocationDialog
        open={false}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Revoke Task Assignment?')).not.toBeInTheDocument();
  });

  it('displays member email when full_name is not available', () => {
    const memberWithoutName = {
      email: 'jane@example.com',
    };

    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={memberWithoutName}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel button is clicked', () => {
    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when Confirm Revocation button is clicked', () => {
    const mockOnConfirmLocal = vi.fn();
    const mockOnCancelLocal = vi.fn();
    
    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirmLocal}
        onCancel={mockOnCancelLocal}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /confirm revocation/i });
    fireEvent.click(confirmButton);

    expect(mockOnConfirmLocal).toHaveBeenCalledTimes(1);
    expect(mockOnCancelLocal).not.toHaveBeenCalled();
  });

  it('disables buttons when isRevoking is true', () => {
    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
        isRevoking={true}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    const confirmButton = screen.getByRole('button', { name: /revoking/i });

    expect(cancelButton).toBeDisabled();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByText('Revoking...')).toBeInTheDocument();
  });

  it('displays info alert about preserving progress', () => {
    render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText(/any progress and submissions will be preserved/i)).toBeInTheDocument();
  });

  it('returns null when task is not provided', () => {
    const { container } = render(
      <RevocationDialog
        open={true}
        task={null}
        member={mockMember}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('returns null when member is not provided', () => {
    const { container } = render(
      <RevocationDialog
        open={true}
        task={mockTask}
        member={null}
        onConfirm={mockOnConfirm}
        onCancel={mockOnCancel}
      />
    );

    expect(container.firstChild).toBeNull();
  });
});
