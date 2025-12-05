# Database Migration Guide

## Quick Start

### Apply All Migrations Locally

```bash
# Reset database and apply all migrations
supabase db reset

# Or apply only new migrations
supabase migration up
```

### Create a New Migration

```bash
# Create a new migration file
supabase migration new your_migration_name

# Edit the generated file in supabase/migrations/
```

### Test a Migration

```bash
# Run automated tests (if available)
node supabase/migrations/__tests__/test-migration.js

# Or manually test with SQL
supabase db reset
```

## Migration Naming Convention

Format: `YYYYMMDDHHMMSS_descriptive_name.sql`

Example: `20240101000012_workspace_task_management_enhancements.sql`

## Best Practices

### 1. Always Use IF NOT EXISTS / IF EXISTS

```sql
-- Good
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
DROP INDEX IF EXISTS idx_name;

-- Bad
ALTER TABLE tasks ADD COLUMN started_at TIMESTAMP;
CREATE INDEX idx_name ON table(column);
```

### 2. Include Rollback Instructions

Every migration should have a corresponding rollback plan documented in a README file.

### 3. Test Before Deploying

- Run automated tests
- Test in local environment
- Test in staging environment
- Create database backup before production deployment

### 4. Use Transactions When Appropriate

```sql
BEGIN;
  -- Your migration statements
  -- If any fail, all will be rolled back
COMMIT;
```

### 5. Add Comments and Documentation

```sql
-- Add descriptive comments
COMMENT ON COLUMN tasks.started_at IS 'Timestamp when task was started';

-- Include section headers
-- ============================================================================
-- 1. Add new columns
-- ============================================================================
```

### 6. Consider Performance

- Add indexes for frequently queried columns
- Use partial indexes when appropriate
- Consider the impact on existing data

### 7. Security First

- Always enable RLS on new tables
- Create appropriate policies
- Follow principle of least privilege

## Common Migration Patterns

### Adding a Column

```sql
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

### Creating a Table

```sql
CREATE TABLE IF NOT EXISTS table_name (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- other columns
);

-- Enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING (auth.uid() = user_id);
```

### Adding an Index

```sql
-- Regular index
CREATE INDEX IF NOT EXISTS idx_name 
ON table_name(column_name);

-- Composite index
CREATE INDEX IF NOT EXISTS idx_name 
ON table_name(column1, column2);

-- Partial index
CREATE INDEX IF NOT EXISTS idx_name 
ON table_name(column_name) 
WHERE condition;
```

### Creating RLS Policies

```sql
-- SELECT policy
CREATE POLICY "Users can view their own data"
ON table_name FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT policy
CREATE POLICY "Users can insert their own data"
ON table_name FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE policy
CREATE POLICY "Users can update their own data"
ON table_name FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- DELETE policy
CREATE POLICY "Users can delete their own data"
ON table_name FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

### Storage Policies

```sql
-- Upload policy
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'bucket-name' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Download policy
CREATE POLICY "Users can download files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'bucket-name' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Troubleshooting

### Migration Fails to Apply

1. Check for syntax errors in SQL
2. Verify all referenced tables/columns exist
3. Check for conflicting constraints
4. Review error messages in Supabase logs

### RLS Policies Not Working

1. Verify RLS is enabled: `ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;`
2. Check policy conditions
3. Test with different user roles
4. Review policy order (first matching policy wins)

### Performance Issues After Migration

1. Check if indexes are being used: `EXPLAIN ANALYZE SELECT ...`
2. Consider adding missing indexes
3. Review query patterns
4. Monitor database performance metrics

## Useful Commands

```bash
# Check migration status
supabase migration list

# Create a new migration
supabase migration new migration_name

# Apply migrations
supabase db reset  # Resets and applies all
supabase migration up  # Applies pending only

# Generate types from database
supabase gen types typescript --local > src/types/database.ts

# View database logs
supabase logs db

# Open database in browser
supabase db studio
```

## Resources

- [Supabase Migrations Documentation](https://supabase.com/docs/guides/cli/local-development#database-migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
