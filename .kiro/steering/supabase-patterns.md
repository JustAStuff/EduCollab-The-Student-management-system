---
title: Supabase Development Patterns
inclusion: fileMatch
fileMatchPattern: "**/*.{sql,js,jsx}"
---

# Supabase Best Practices

## Database Design
- Always use UUIDs for primary keys
- Create proper indexes for frequently queried columns
- Use foreign key constraints for data integrity
- Implement soft deletes with deleted_at timestamps

## Row Level Security (RLS)
- Enable RLS on all tables
- Create specific policies for each operation (SELECT, INSERT, UPDATE, DELETE)
- Test policies thoroughly with different user roles
- Use security definer functions when needed

## Real-time Features
- Enable real-time only on tables that need it
- Filter real-time subscriptions to reduce bandwidth
- Handle connection errors gracefully
- Clean up subscriptions on component unmount

## Storage
- Organize files in logical bucket structures
- Implement proper storage policies
- Validate file types and sizes on upload
- Use signed URLs for private files

## Migrations
- Use sequential numbering for migration files
- Include rollback logic when possible
- Test migrations on development environment first
- Document breaking changes clearly
