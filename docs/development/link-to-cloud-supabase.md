# Link Local Project to Cloud Supabase

Since you don't want to use Docker and have a cloud Supabase project, here's how to link and apply migrations:

## Step 1: Link to Your Cloud Project

```bash
# Login to Supabase
supabase login

# Link to your existing cloud project
supabase link nwfaaiixizernafxdddm
```

To find your PROJECT_REF:
1. Go to your Supabase dashboard
2. Look at the URL: https://supabase.com/dashboard/project/YOUR_PROJECT_REF
3. Or go to Settings > General > Reference ID

## Step 2: Apply Migrations to Cloud

```bash
# Push migrations to cloud database
supabase db push
```

This will apply all migration files in your `supabase/migrations/` folder to your cloud database.

## Step 3: Alternative - Manual SQL Execution

If the above doesn't work, you can manually run the SQL in your Supabase dashboard:

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the SQL from the migration files
4. Execute them in order

## Migration Files to Apply (in order):
1. `supabase/migrations/20240101000008_fix_task_submissions_storage.sql`
2. `supabase/migrations/20240101000009_simplify_storage_policies.sql`