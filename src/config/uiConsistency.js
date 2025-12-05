/**
 * UI Consistency Configuration
 * 
 * Centralized configuration for consistent UI elements across TL and TM views
 */

// Status configurations
export const STATUS_CONFIG = {
  todo: {
    label: 'To Do',
    color: 'default',
    icon: 'RadioButtonUnchecked',
    bgColor: '#f5f5f5',
    textColor: '#666666',
  },
  in_progress: {
    label: 'In Progress',
    color: 'warning',
    icon: 'PlayArrow',
    bgColor: '#fff3e0',
    textColor: '#f57c00',
  },
  submitted: {
    label: 'Under Review',
    color: 'info',
    icon: 'CloudUpload',
    bgColor: '#e3f2fd',
    textColor: '#1976d2',
  },
  needs_revision: {
    label: 'Needs Revision',
    color: 'error',
    icon: 'Error',
    bgColor: '#ffebee',
    textColor: '#d32f2f',
  },
  completed: {
    label: 'Completed',
    color: 'success',
    icon: 'CheckCircle',
    bgColor: '#e8f5e8',
    textColor: '#2e7d32',
  },
};

// Button configurations
export const BUTTON_CONFIG = {
  primary: {
    bgcolor: '#106EBE',
    hoverBgcolor: '#0A4E82',
  },
  success: {
    bgcolor: '#28a745',
    hoverBgcolor: '#218838',
  },
  error: {
    bgcolor: '#dc3545',
    hoverBgcolor: '#c82333',
  },
  info: {
    bgcolor: '#17a2b8',
    hoverBgcolor: '#138496',
  },
  warning: {
    bgcolor: '#ffc107',
    hoverBgcolor: '#e0a800',
  },
};

// Action button configurations based on task status and user role
export const ACTION_BUTTON_CONFIG = {
  todo: {
    text: 'Start Task',
    icon: 'PlayArrow',
    color: 'primary',
    disabled: false,
  },
  in_progress: {
    text: 'Upload Result',
    icon: 'CloudUpload',
    color: 'primary',
    disabled: false,
  },
  needs_revision: {
    text: 'Re-submit',
    icon: 'Refresh',
    color: 'error',
    disabled: false,
  },
  submitted: {
    text: 'Under Review',
    icon: 'HourglassEmpty',
    color: 'info',
    disabled: true,
  },
  completed: {
    text: 'Completed',
    icon: 'CheckCircle',
    color: 'success',
    disabled: true,
  },
};

// File upload configurations
export const FILE_UPLOAD_CONFIG = {
  acceptedFormats: '.jpg,.jpeg,.png,.pdf,.doc,.docx',
  maxSizeMB: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
};

// Spacing and layout configurations
export const LAYOUT_CONFIG = {
  cardSpacing: 2, // mb: 2 for cards
  sectionSpacing: 4, // mb: 4 for sections
  buttonSpacing: 1, // gap: 1 for button groups
  contentPadding: 2, // p: 2 for content areas
  borderRadius: '8px',
  borderColor: '#e0e0e0',
  hoverBackgroundColor: '#f9f9f9',
};

// Typography configurations
export const TYPOGRAPHY_CONFIG = {
  sectionTitle: {
    variant: 'h6',
    sx: { mb: 2, display: 'flex', alignItems: 'center' },
  },
  taskTitle: {
    variant: 'subtitle1',
    fontWeight: 'bold',
    gutterBottom: true,
  },
  taskDescription: {
    variant: 'body2',
    color: 'text.secondary',
    sx: { mb: 1 },
  },
  metadata: {
    variant: 'caption',
    color: 'text.secondary',
  },
  reviewComments: {
    variant: 'caption',
    color: 'text.secondary',
    sx: { mt: 1, p: 1, bgcolor: '#fff3cd', borderRadius: 1 },
  },
};

// Icon configurations
export const ICON_CONFIG = {
  size: {
    small: 16,
    medium: 20,
    large: 24,
  },
  colors: {
    pdf: '#d32f2f',
    doc: '#1976d2',
    image: '#388e3c',
    default: 'text.secondary',
  },
};

// Dialog configurations
export const DIALOG_CONFIG = {
  maxWidth: 'sm',
  fullWidth: true,
  paperProps: {
    sx: {
      borderRadius: '12px',
    },
  },
};

// Animation configurations
export const ANIMATION_CONFIG = {
  transition: 'all 0.2s ease-in-out',
  hoverScale: 1.02,
  clickScale: 0.98,
};

// Validation messages
export const VALIDATION_MESSAGES = {
  fileSize: (maxSize) => `File size must be less than ${maxSize}MB`,
  fileType: (allowedTypes) => `Only ${allowedTypes.join(', ')} files are allowed`,
  required: 'This field is required',
  uploadFailed: 'Upload failed. Please try again.',
  downloadFailed: 'Download failed. Please try again.',
  permissionDenied: 'You do not have permission to perform this action.',
};

// Success messages
export const SUCCESS_MESSAGES = {
  taskStarted: 'Task started successfully!',
  taskSubmitted: 'Task submitted successfully!',
  taskApproved: 'Task approved successfully!',
  taskRevised: 'Task sent back for revision!',
  submissionDeleted: 'Submission deleted successfully!',
  submissionReuploaded: 'Submission re-uploaded successfully!',
  taskRevoked: 'Task assignment revoked successfully!',
};

// Helper functions for consistent styling
export const getStatusStyle = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.todo;

export const getButtonStyle = (variant = 'primary') => BUTTON_CONFIG[variant] || BUTTON_CONFIG.primary;

export const getActionButtonConfig = (status) => ACTION_BUTTON_CONFIG[status] || ACTION_BUTTON_CONFIG.todo;

export const getCardStyle = () => ({
  mb: LAYOUT_CONFIG.cardSpacing,
  border: `1px solid ${LAYOUT_CONFIG.borderColor}`,
  borderRadius: LAYOUT_CONFIG.borderRadius,
  backgroundColor: 'white',
  '&:hover': { 
    backgroundColor: LAYOUT_CONFIG.hoverBackgroundColor,
    transform: `scale(${ANIMATION_CONFIG.hoverScale})`,
    transition: ANIMATION_CONFIG.transition,
  },
});

export const getSectionStyle = () => ({
  mb: LAYOUT_CONFIG.sectionSpacing,
});

export const getButtonGroupStyle = () => ({
  display: 'flex',
  gap: LAYOUT_CONFIG.buttonSpacing,
  flexWrap: 'wrap',
});

export const getContentStyle = () => ({
  p: LAYOUT_CONFIG.contentPadding,
});