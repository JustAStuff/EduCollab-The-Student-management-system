# Design Document

## Overview

The file viewing issue stems from incorrect storage policies and file path structures that prevent Team Leaders from accessing task submission files. This design addresses the problem by fixing the storage bucket policies, updating the file path structure, and improving the download mechanism.

## Architecture

### Current Issues Identified

1. **Storage Policy Problem**: The current policy uses `(storage.foldername(name))[2]` to extract task ID, but the file path structure `userId/taskId/timestamp.ext` may not align properly with this extraction method.

2. **File Path Structure**: The current path `userId/taskId/timestamp.ext` creates unnecessary complexity for policy evaluation.

3. **Download Implementation**: The download function doesn't handle authentication and permission errors properly.

### Proposed Solution Architecture

```
File Storage Structure:
task-submissions/
├── workspaceId/
│   ├── taskId/
│   │   ├── userId_timestamp.ext
│   │   └── userId_timestamp.ext
│   └── taskId/
└── workspaceId/
```

This structure allows for:
- Easy workspace-based access control
- Clear task-based organization  
- User identification within task submissions
- Simplified policy evaluation

## Components and Interfaces

### 1. Storage Policy Updates

**New Policy Structure:**
- Path format: `workspaceId/taskId/userId_timestamp.ext`
- Policies based on workspace ownership and membership
- Simplified folder structure for easier policy evaluation

### 2. File Upload Component (WorkspaceTM.jsx)

**Updated Upload Logic:**
```javascript
// New file path structure
const fileName = `${workspaceId}/${taskId}/${userId}_${timestamp}.${fileExt}`;
```

**Key Changes:**
- Include workspace ID in path for easier access control
- Maintain user ID for ownership tracking
- Use consistent naming convention

### 3. File Download Component (WorkspaceTL.jsx)

**Enhanced Download Logic:**
- Better error handling with specific error messages
- Authentication verification before download attempts
- Fallback mechanisms for different file types

### 4. Database Schema

**No changes required** - existing `submission_file_url` and `submission_file_name` columns are sufficient.

## Data Models

### File Path Model
```
Path: {workspaceId}/{taskId}/{userId}_{timestamp}.{extension}
Example: "123e4567-e89b-12d3-a456-426614174000/456f7890-e89b-12d3-a456-426614174001/789g0123-e89b-12d3-a456-426614174002_1640995200000.pdf"
```

### Storage Policy Model
```sql
-- Workspace owners can view all submissions in their workspaces
bucket_id = 'task-submissions' AND (
  -- User can view their own submissions
  auth.uid()::text = split_part((storage.foldername(name))[3], '_', 1) OR
  -- Workspace owners can view submissions in their workspaces  
  auth.uid() IN (
    SELECT created_by FROM workspaces 
    WHERE id::text = (storage.foldername(name))[1]
  )
)
```

## Error Handling

### Upload Errors
1. **File Size Validation**: Check file size before upload
2. **File Type Validation**: Validate allowed file extensions
3. **Storage Quota**: Handle storage limit exceeded errors
4. **Network Issues**: Retry mechanism for failed uploads

### Download Errors
1. **Permission Denied**: Clear message about access rights
2. **File Not Found**: Handle deleted or moved files
3. **Network Issues**: Retry mechanism for failed downloads
4. **Authentication**: Redirect to login if session expired

## Testing Strategy

### Unit Tests
- File path generation logic
- Permission validation functions
- Error handling scenarios

### Integration Tests
- End-to-end file upload and download flow
- Cross-user permission testing
- Storage policy validation

### Manual Testing
- Team Leader file access verification
- Team Member upload functionality
- Error message clarity and accuracy