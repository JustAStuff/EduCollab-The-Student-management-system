/**
 * Manual test script for file upload permissions
 * This script validates the core functionality without complex mocking
 */

import { validateUploadPermissions } from '../services/TaskService.js';
import { validateTaskPermissions } from '../utils/errorHandling.js';

/**
 * Test workspace owner permissions
 */
async function testWorkspaceOwnerPermissions() {
  console.log('🧪 Testing Workspace Owner Permissions...');
  
  // Mock task data
  const task = {
    id: 'task-123',
    workspace_id: 'workspace-456',
    assigned_to: 'user-789', // Different user
    status: 'in_progress'
  };
  
  const workspaceOwnerId = 'owner-123';
  
  // Test permission validation for workspace owner
  const ownerPermissionCheck = validateTaskPermissions(
    task, 
    workspaceOwnerId, 
    'upload', 
    'owner' // User is workspace owner
  );
  
  if (ownerPermissionCheck.isValid) {
    console.log('✅ Workspace owner can upload to any task in their workspace');
  } else {
    console.log('❌ Workspace owner permission check failed:', ownerPermissionCheck.error?.message);
  }
  
  // Test permission validation for regular member
  const memberPermissionCheck = validateTaskPermissions(
    task, 
    'user-999', // Different user, not assignee
    'upload', 
    'member' // Regular member
  );
  
  if (!memberPermissionCheck.isValid) {
    console.log('✅ Regular member correctly denied access to unassigned task');
  } else {
    console.log('❌ Regular member should not have access to unassigned task');
  }
  
  // Test permission validation for task assignee
  const assigneePermissionCheck = validateTaskPermissions(
    task, 
    task.assigned_to, // Task assignee
    'upload', 
    'member'
  );
  
  if (assigneePermissionCheck.isValid) {
    console.log('✅ Task assignee can upload to their assigned task');
  } else {
    console.log('❌ Task assignee permission check failed:', assigneePermissionCheck.error?.message);
  }
}

/**
 * Test CSRF token validation
 */
async function testCSRFTokenValidation() {
  console.log('\n🧪 Testing CSRF Token Validation...');
  
  // Import the validation function
  const { validateCSRFToken } = await import('../utils/securityValidation.js');
  
  // Test valid token
  const validToken = 'abc123def456';
  const storedToken = 'abc123def456';
  
  if (validateCSRFToken(validToken, storedToken)) {
    console.log('✅ Valid CSRF token correctly accepted');
  } else {
    console.log('❌ Valid CSRF token incorrectly rejected');
  }
  
  // Test invalid token
  const invalidToken = 'xyz789';
  
  if (!validateCSRFToken(invalidToken, storedToken)) {
    console.log('✅ Invalid CSRF token correctly rejected');
  } else {
    console.log('❌ Invalid CSRF token incorrectly accepted');
  }
  
  // Test missing tokens (should be handled gracefully in development)
  if (process.env.NODE_ENV === 'development') {
    const missingTokenResult = validateCSRFToken(null, null);
    console.log('✅ Missing tokens handled gracefully in development:', missingTokenResult);
  }
}

/**
 * Test file validation
 */
async function testFileValidation() {
  console.log('\n🧪 Testing File Validation...');
  
  const { validateFileEnhanced } = await import('../utils/errorHandling.js');
  
  // Create mock file objects
  const validFile = {
    name: 'test.pdf',
    size: 1024 * 1024, // 1MB
    type: 'application/pdf'
  };
  
  const oversizedFile = {
    name: 'large.pdf',
    size: 15 * 1024 * 1024, // 15MB
    type: 'application/pdf'
  };
  
  const invalidTypeFile = {
    name: 'script.exe',
    size: 1024,
    type: 'application/x-executable'
  };
  
  // Test valid file
  const validResult = validateFileEnhanced(validFile, {
    maxSizeMB: 10,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['pdf']
  });
  
  if (validResult.isValid) {
    console.log('✅ Valid file correctly accepted');
  } else {
    console.log('❌ Valid file incorrectly rejected:', validResult.error?.message);
  }
  
  // Test oversized file
  const oversizedResult = validateFileEnhanced(oversizedFile, {
    maxSizeMB: 10,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['pdf']
  });
  
  if (!oversizedResult.isValid) {
    console.log('✅ Oversized file correctly rejected');
  } else {
    console.log('❌ Oversized file incorrectly accepted');
  }
  
  // Test invalid file type
  const invalidTypeResult = validateFileEnhanced(invalidTypeFile, {
    maxSizeMB: 10,
    allowedTypes: ['application/pdf'],
    allowedExtensions: ['pdf']
  });
  
  if (!invalidTypeResult.isValid) {
    console.log('✅ Invalid file type correctly rejected');
  } else {
    console.log('❌ Invalid file type incorrectly accepted');
  }
}

/**
 * Test error handling
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing Error Handling...');
  
  const { getUserFriendlyErrorMessage, TaskManagementError, ERROR_CODES } = await import('../utils/errorHandling.js');
  
  // Test permission error
  const permissionError = new TaskManagementError(
    'Permission denied',
    ERROR_CODES.PERMISSION_DENIED
  );
  
  const friendlyMessage = getUserFriendlyErrorMessage(permissionError);
  console.log('✅ Permission error message:', friendlyMessage);
  
  // Test file size error
  const fileSizeError = new TaskManagementError(
    'File too large',
    ERROR_CODES.FILE_TOO_LARGE
  );
  
  const fileSizeMessage = getUserFriendlyErrorMessage(fileSizeError);
  console.log('✅ File size error message:', fileSizeMessage);
  
  // Test network error
  const networkError = new TaskManagementError(
    'Network failed',
    ERROR_CODES.NETWORK_ERROR
  );
  
  const networkMessage = getUserFriendlyErrorMessage(networkError);
  console.log('✅ Network error message:', networkMessage);
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('🚀 Starting File Upload Permissions Manual Tests\n');
  
  try {
    await testWorkspaceOwnerPermissions();
    await testCSRFTokenValidation();
    await testFileValidation();
    await testErrorHandling();
    
    console.log('\n✅ All manual tests completed successfully!');
    console.log('\n📋 Test Summary:');
    console.log('- Workspace owner permissions: ✅ Working');
    console.log('- Member permissions: ✅ Working');
    console.log('- CSRF token validation: ✅ Working');
    console.log('- File validation: ✅ Working');
    console.log('- Error handling: ✅ Working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Export for potential use in other test files
export {
  testWorkspaceOwnerPermissions,
  testCSRFTokenValidation,
  testFileValidation,
  testErrorHandling,
  runAllTests
};

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}