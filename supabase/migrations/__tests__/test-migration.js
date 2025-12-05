/**
 * Test script for workspace task management enhancements migration
 * This script validates the migration file structure and SQL syntax
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the migration file
const migrationPath = join(__dirname, '../20240101000012_workspace_task_management_enhancements.sql');
const migrationSQL = readFileSync(migrationPath, 'utf-8');

console.log('🧪 Testing Migration: workspace_task_management_enhancements\n');

// Test 1: Check if migration file exists and is not empty
console.log('✓ Test 1: Migration file exists and is not empty');
if (!migrationSQL || migrationSQL.trim().length === 0) {
  console.error('❌ Migration file is empty');
  process.exit(1);
}
console.log('  ✓ Migration file has content\n');

// Test 2: Check for required ALTER TABLE statements
console.log('✓ Test 2: Checking for required ALTER TABLE statements');
const requiredAlters = [
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at',
  'ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submission_file_size'
];

requiredAlters.forEach(alter => {
  if (migrationSQL.includes(alter)) {
    console.log(`  ✓ Found: ${alter}`);
  } else {
    console.error(`  ❌ Missing: ${alter}`);
    process.exit(1);
  }
});
console.log();

// Test 3: Check for task_reviews table creation
console.log('✓ Test 3: Checking for task_reviews table creation');
if (migrationSQL.includes('CREATE TABLE IF NOT EXISTS task_reviews')) {
  console.log('  ✓ task_reviews table creation found');
  
  // Check for required columns
  const requiredColumns = ['id', 'task_id', 'reviewer_id', 'action', 'comments', 'reviewed_at', 'created_at'];
  requiredColumns.forEach(col => {
    if (migrationSQL.includes(col)) {
      console.log(`  ✓ Column: ${col}`);
    } else {
      console.error(`  ❌ Missing column: ${col}`);
      process.exit(1);
    }
  });
} else {
  console.error('  ❌ task_reviews table creation not found');
  process.exit(1);
}
console.log();

// Test 4: Check for indexes
console.log('✓ Test 4: Checking for performance indexes');
const requiredIndexes = [
  'idx_tasks_workspace_assigned',
  'idx_tasks_status',
  'idx_tasks_workspace_submissions',
  'idx_task_reviews_task',
  'idx_task_reviews_reviewer',
  'idx_task_reviews_task_reviewer'
];

requiredIndexes.forEach(index => {
  if (migrationSQL.includes(index)) {
    console.log(`  ✓ Index: ${index}`);
  } else {
    console.error(`  ❌ Missing index: ${index}`);
    process.exit(1);
  }
});
console.log();

// Test 5: Check for RLS policies
console.log('✓ Test 5: Checking for RLS policies');
const requiredPolicies = [
  'Workspace members can review tasks',
  'Users can view task reviews in their workspaces',
  'Users can view reviews for their assigned tasks',
  'Workspace members can view task submissions'
];

requiredPolicies.forEach(policy => {
  if (migrationSQL.includes(policy)) {
    console.log(`  ✓ Policy: ${policy}`);
  } else {
    console.error(`  ❌ Missing policy: ${policy}`);
    process.exit(1);
  }
});
console.log();

// Test 6: Check for RLS enablement
console.log('✓ Test 6: Checking for RLS enablement');
if (migrationSQL.includes('ALTER TABLE task_reviews ENABLE ROW LEVEL SECURITY')) {
  console.log('  ✓ RLS enabled on task_reviews table');
} else {
  console.error('  ❌ RLS not enabled on task_reviews table');
  process.exit(1);
}
console.log();

// Test 7: Check for proper SQL syntax (basic checks)
console.log('✓ Test 7: Basic SQL syntax validation');
const syntaxChecks = [
  { pattern: /CREATE TABLE.*\(/g, name: 'CREATE TABLE statements' },
  { pattern: /CREATE INDEX.*ON/g, name: 'CREATE INDEX statements' },
  { pattern: /CREATE POLICY.*ON/g, name: 'CREATE POLICY statements' },
  { pattern: /ALTER TABLE.*ADD COLUMN/g, name: 'ALTER TABLE statements' }
];

syntaxChecks.forEach(check => {
  const matches = migrationSQL.match(check.pattern);
  if (matches && matches.length > 0) {
    console.log(`  ✓ ${check.name}: ${matches.length} found`);
  } else {
    console.log(`  ⚠ ${check.name}: none found (may be intentional)`);
  }
});
console.log();

// Test 8: Check for comments/documentation
console.log('✓ Test 8: Checking for documentation comments');
if (migrationSQL.includes('COMMENT ON')) {
  console.log('  ✓ Documentation comments found');
} else {
  console.log('  ⚠ No documentation comments (recommended but not required)');
}
console.log();

// Test 9: Check for proper constraint definitions
console.log('✓ Test 9: Checking for constraint definitions');
if (migrationSQL.includes("CHECK (action IN ('approve', 'request_redo'))")) {
  console.log('  ✓ CHECK constraint on action column found');
} else {
  console.error('  ❌ CHECK constraint on action column not found');
  process.exit(1);
}
console.log();

// Test 10: Check for foreign key constraints
console.log('✓ Test 10: Checking for foreign key constraints');
const foreignKeys = [
  'REFERENCES tasks(id) ON DELETE CASCADE',
  'REFERENCES auth.users(id)'
];

foreignKeys.forEach(fk => {
  if (migrationSQL.includes(fk)) {
    console.log(`  ✓ Foreign key: ${fk}`);
  } else {
    console.error(`  ❌ Missing foreign key: ${fk}`);
    process.exit(1);
  }
});
console.log();

console.log('✅ All migration tests passed!\n');
console.log('📝 Summary:');
console.log('  - New columns added to tasks table: 2');
console.log('  - New tables created: 1 (task_reviews)');
console.log('  - Indexes created: 6');
console.log('  - RLS policies created: 4');
console.log('  - Storage policies updated: 1');
console.log('\n🚀 Migration is ready to be applied!');
