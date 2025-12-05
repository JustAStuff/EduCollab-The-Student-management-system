import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskCard from '../TaskCard';
import FileUpload from '../FileUpload';
import SubmissionDisplay from '../SubmissionDisplay';
import {
  STATUS_CONFIG,
  BUTTON_CONFIG,
  getStatusStyle,
  getActionButtonConfig,
  getCardStyle,
  getButtonStyle,
} from '../../../config/uiConsistency';

// Mock task data for testing
const mockTask = {
  id: 'test-task-1',
  title: 'Test Task',
  description: 'Test task description',
  status: 'todo',
  created_at: '2024-01-01T00:00:00Z',
  assigned_by_user: {
    full_name: 'Test User',
    email: 'test@example.com',
  },
};

describe('UI Consistency Tests', () => {
  describe('Status Configuration', () => {
    it('should have consistent status configurations', () => {
      const statuses = ['todo', 'in_progress', 'submitted', 'needs_revision', 'completed'];
      
      statuses.forEach(status => {
        const config = STATUS_CONFIG[status];
        expect(config).toBeDefined();
        expect(config.label).toBeDefined();
        expect(config.color).toBeDefined();
        expect(config.icon).toBeDefined();
        expect(config.bgColor).toBeDefined();
        expect(config.textColor).toBeDefined();
      });
    });

    it('should return consistent status styles', () => {
      const todoStyle = getStatusStyle('todo');
      expect(todoStyle.label).toBe('To Do');
      expect(todoStyle.color).toBe('default');
      expect(todoStyle.icon).toBe('RadioButtonUnchecked');

      const completedStyle = getStatusStyle('completed');
      expect(completedStyle.label).toBe('Completed');
      expect(completedStyle.color).toBe('success');
      expect(completedStyle.icon).toBe('CheckCircle');
    });
  });

  describe('Button Configuration', () => {
    it('should have consistent button configurations', () => {
      const variants = ['primary', 'success', 'error', 'info', 'warning'];
      
      variants.forEach(variant => {
        const config = BUTTON_CONFIG[variant];
        expect(config).toBeDefined();
        expect(config.bgcolor).toBeDefined();
        expect(config.hoverBgcolor).toBeDefined();
      });
    });

    it('should return consistent button styles', () => {
      const primaryStyle = getButtonStyle('primary');
      expect(primaryStyle.bgcolor).toBe('#106EBE');
      expect(primaryStyle.hoverBgcolor).toBe('#0A4E82');

      const successStyle = getButtonStyle('success');
      expect(successStyle.bgcolor).toBe('#28a745');
      expect(successStyle.hoverBgcolor).toBe('#218838');
    });
  });

  describe('Action Button Configuration', () => {
    it('should return consistent action button configs', () => {
      const todoConfig = getActionButtonConfig('todo');
      expect(todoConfig.text).toBe('Start Task');
      expect(todoConfig.icon).toBe('PlayArrow');
      expect(todoConfig.color).toBe('primary');
      expect(todoConfig.disabled).toBe(false);

      const submittedConfig = getActionButtonConfig('submitted');
      expect(submittedConfig.text).toBe('Under Review');
      expect(submittedConfig.disabled).toBe(true);
    });
  });

  describe('TaskCard Component Consistency', () => {
    it('should render with consistent styling for TL role', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tl"
          onStatusChange={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('Start Task')).toBeInTheDocument();
    });

    it('should render with consistent styling for TM role', () => {
      render(
        <TaskCard
          task={mockTask}
          userRole="tm"
          onStatusChange={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      expect(screen.getByText('Test Task')).toBeInTheDocument();
      expect(screen.getByText('To Do')).toBeInTheDocument();
      expect(screen.getByText('Start Task')).toBeInTheDocument();
    });

    it('should render submitted task with consistent styling', () => {
      const submittedTask = {
        ...mockTask,
        status: 'submitted',
        submission_file_name: 'test.pdf',
        submitted_at: '2024-01-02T00:00:00Z',
      };

      render(
        <TaskCard
          task={submittedTask}
          userRole="tm"
          onDeleteSubmission={vi.fn()}
          onReuploadSubmission={vi.fn()}
        />
      );

      expect(screen.getAllByText('Under Review')).toHaveLength(2); // Both chip and button
      expect(screen.getByText('test.pdf')).toBeInTheDocument();
    });

    it('should render completed task with consistent styling', () => {
      const completedTask = {
        ...mockTask,
        status: 'completed',
        completed_at: '2024-01-03T00:00:00Z',
      };

      render(
        <TaskCard
          task={completedTask}
          userRole="tm"
        />
      );

      expect(screen.getAllByText('Completed')).toHaveLength(2); // Both chip and button
    });
  });

  describe('FileUpload Component Consistency', () => {
    it('should render with consistent styling', () => {
      render(
        <FileUpload
          onFileSelect={vi.fn()}
          onUpload={vi.fn()}
        />
      );

      expect(screen.getByText('Select File')).toBeInTheDocument();
      expect(screen.getByText(/Accepted formats:/)).toBeInTheDocument();
    });
  });

  describe('SubmissionDisplay Component Consistency', () => {
    it('should render with consistent styling in compact mode', () => {
      render(
        <SubmissionDisplay
          fileName="test.pdf"
          fileUrl="/test.pdf"
          fileSize={1024}
          compact={true}
          onDownload={vi.fn()}
          onView={vi.fn()}
        />
      );

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText('1 KB')).toBeInTheDocument();
    });

    it('should render with consistent styling in full mode', () => {
      render(
        <SubmissionDisplay
          fileName="test.pdf"
          fileUrl="/test.pdf"
          fileSize={1024}
          submitterName="Test User"
          taskTitle="Test Task"
          compact={false}
          onDownload={vi.fn()}
          onView={vi.fn()}
        />
      );

      expect(screen.getByText('test.pdf')).toBeInTheDocument();
      expect(screen.getByText(/Size:/)).toBeInTheDocument();
      expect(screen.getByText(/1 KB/)).toBeInTheDocument();
      expect(screen.getByText('By: Test User')).toBeInTheDocument();
      expect(screen.getByText('Task: Test Task')).toBeInTheDocument();
    });
  });

  describe('Card Styling Consistency', () => {
    it('should return consistent card styles', () => {
      const cardStyle = getCardStyle();
      
      expect(cardStyle.mb).toBe(2);
      expect(cardStyle.border).toBe('1px solid #e0e0e0');
      expect(cardStyle.borderRadius).toBe('8px');
      expect(cardStyle.backgroundColor).toBe('white');
      expect(cardStyle['&:hover']).toBeDefined();
    });
  });

  describe('Color Consistency', () => {
    it('should use consistent colors across components', () => {
      // Test that all status colors are consistent
      expect(STATUS_CONFIG.todo.textColor).toBe('#666666');
      expect(STATUS_CONFIG.in_progress.textColor).toBe('#f57c00');
      expect(STATUS_CONFIG.submitted.textColor).toBe('#1976d2');
      expect(STATUS_CONFIG.needs_revision.textColor).toBe('#d32f2f');
      expect(STATUS_CONFIG.completed.textColor).toBe('#2e7d32');

      // Test that button colors are consistent
      expect(BUTTON_CONFIG.primary.bgcolor).toBe('#106EBE');
      expect(BUTTON_CONFIG.success.bgcolor).toBe('#28a745');
      expect(BUTTON_CONFIG.error.bgcolor).toBe('#dc3545');
    });
  });

  describe('Typography Consistency', () => {
    it('should use consistent typography across components', () => {
      // This test ensures that typography configurations are properly imported
      // and used consistently across components
      const { TYPOGRAPHY_CONFIG } = require('../../../config/uiConsistency');
      
      expect(TYPOGRAPHY_CONFIG.sectionTitle.variant).toBe('h6');
      expect(TYPOGRAPHY_CONFIG.taskTitle.variant).toBe('subtitle1');
      expect(TYPOGRAPHY_CONFIG.taskDescription.variant).toBe('body2');
      expect(TYPOGRAPHY_CONFIG.metadata.variant).toBe('caption');
    });
  });

  describe('Layout Consistency', () => {
    it('should use consistent spacing and layout patterns', () => {
      const { LAYOUT_CONFIG } = require('../../../config/uiConsistency');
      
      expect(LAYOUT_CONFIG.cardSpacing).toBe(2);
      expect(LAYOUT_CONFIG.sectionSpacing).toBe(4);
      expect(LAYOUT_CONFIG.buttonSpacing).toBe(1);
      expect(LAYOUT_CONFIG.contentPadding).toBe(2);
      expect(LAYOUT_CONFIG.borderRadius).toBe('8px');
      expect(LAYOUT_CONFIG.borderColor).toBe('#e0e0e0');
    });
  });

  describe('Icon Consistency', () => {
    it('should use consistent icon sizes and colors', () => {
      const { ICON_CONFIG } = require('../../../config/uiConsistency');
      
      expect(ICON_CONFIG.size.small).toBe(16);
      expect(ICON_CONFIG.size.medium).toBe(20);
      expect(ICON_CONFIG.size.large).toBe(24);
      
      expect(ICON_CONFIG.colors.pdf).toBe('#d32f2f');
      expect(ICON_CONFIG.colors.doc).toBe('#1976d2');
      expect(ICON_CONFIG.colors.image).toBe('#388e3c');
    });
  });

  describe('Message Consistency', () => {
    it('should use consistent validation and success messages', () => {
      const { VALIDATION_MESSAGES, SUCCESS_MESSAGES } = require('../../../config/uiConsistency');
      
      expect(VALIDATION_MESSAGES.uploadFailed).toBe('Upload failed. Please try again.');
      expect(VALIDATION_MESSAGES.downloadFailed).toBe('Download failed. Please try again.');
      expect(VALIDATION_MESSAGES.permissionDenied).toBe('You do not have permission to perform this action.');
      
      expect(SUCCESS_MESSAGES.taskStarted).toBe('Task started successfully!');
      expect(SUCCESS_MESSAGES.taskSubmitted).toBe('Task submitted successfully!');
      expect(SUCCESS_MESSAGES.taskApproved).toBe('Task approved successfully!');
    });
  });
});