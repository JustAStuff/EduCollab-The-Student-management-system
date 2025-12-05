# Implementation Plan

- [x] 1. Create TaskCategorization service with unified filtering logic



  - Create new service file `src/services/TaskCategorizationService.js`
  - Implement methods for getActiveTasks, getPendingReviewTasks, getCompletedTasks, getRemainingTasks
  - Implement getTaskCounts method that returns categorized counts
  - Add comprehensive JSDoc documentation for all methods
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 2. Create unit tests for TaskCategorization service






  - Create test file `src/services/__tests__/TaskCategorizationService.test.js`
  - Write tests for each filtering method with various task status combinations
  - Test getTaskCounts method returns correct counts for all categories
  - Test edge cases like empty arrays and invalid task statuses
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 3. Update StatisticsService to use TaskCategorization service



  - Import TaskCategorization service in StatisticsService.js
  - Modify calculateTaskStats method to use the new categorization service
  - Update remaining task calculation to include submitted tasks
  - Ensure backward compatibility with existing return structure
  - _Requirements: 1.1, 1.2, 3.1, 3.3_

- [x] 4. Update RemainingTasksCard to show clearer task breakdown


















  - Modify RemainingTasksCard component to use new task categorization
  - Update terminology to clarify that "remaining" includes submitted tasks
  - Add breakdown showing active vs pending review tasks
  - Update messaging to explain what tasks need user attention
  - _Requirements: 1.1, 1.2, 2.1, 2.2_


- [x] 5. Update WorkspaceTM to use consistent task filtering
  - Import TaskCategorization service in WorkspaceTM.jsx
  - Replace current task filtering logic with categorization service methods
  - Update section titles to match dashboard terminology ("Active Tasks" instead of "My Tasks")
  - Ensure task counts in section headers match dashboard calculations
  - _Requirements: 1.1, 1.3, 2.1, 2.3_
- [x] 6. Add error handling and validation to task categorization
  - Add try-catch blocks around categorization service usage
  - Implement fallback logic if categorization service fails
  - Add console warnings when task count inconsistencies are detected
  - Create validation function to check dashboard vs workspace count consistency
  - _Requirements: 3.1, 3.3_
- [x] 7. Create integration tests for updated components
  - Write tests for StatisticsService integration with TaskCategorization
  - Test RemainingTasksCard displays correct counts and messaging
  - Test WorkspaceTM sections show tasks in correct categories
  - Verify navigation from dashboard to workspace maintains data consistency
  - _Requirements: 1.1, 1.3, 2.1, 2.3_

- [x] 8. Add end-to-end test for task visibility consistency








  - Create E2E test that creates tasks in various statuses
  - Verify dashboard remaining count matches sum of workspace active and submitted tasks
  - Test task status transitions maintain consistency across views
  - Test "Go to Workspace" navigation shows expected task distribution
  - _Requirements: 1.1, 1.2, 1.3, 2.1_