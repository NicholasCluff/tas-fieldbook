-- Migration script to transition existing users from supervisor/candidate model to organization model
-- This migration will:
-- 1. Create default organizations for existing supervisor-candidate relationships
-- 2. Convert supervisor_candidates relationships to organization memberships
-- 3. Update projects to use the new supervision model
-- 4. Clean up old data structures

-- Enable the uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a function to migrate existing data
CREATE OR REPLACE FUNCTION migrate_to_organization_model()
RETURNS VOID AS $$
DECLARE
    supervisor_record RECORD;
    new_organization_id UUID;
    relationship_record RECORD;
BEGIN
    -- Step 1: Create organizations for each supervisor who has candidates
    FOR supervisor_record IN 
        SELECT DISTINCT p.id, p.first_name, p.last_name, p.email
        FROM profiles p
        INNER JOIN supervisor_candidates sc ON p.id = sc.supervisor_id
        WHERE p.role = 'supervisor'
    LOOP
        -- Create organization for this supervisor
        INSERT INTO organizations (id, name, description, created_by, created_at, updated_at)
        VALUES (
            uuid_generate_v4(),
            supervisor_record.first_name || ' ' || supervisor_record.last_name || ' Practice',
            'Organization created during migration from supervisor-candidate model',
            supervisor_record.id,
            NOW(),
            NOW()
        )
        RETURNING id INTO new_organization_id;

        -- Add supervisor as organization owner
        INSERT INTO organization_memberships (
            id, organization_id, user_id, role, status, invited_by, joined_at, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            new_organization_id,
            supervisor_record.id,
            'owner',
            'active',
            supervisor_record.id,
            NOW(),
            NOW(),
            NOW()
        );

        -- Update supervisor's primary organization
        UPDATE profiles 
        SET primary_organization_id = new_organization_id,
            updated_at = NOW()
        WHERE id = supervisor_record.id;

        -- Add all candidates of this supervisor as organization members
        INSERT INTO organization_memberships (
            id, organization_id, user_id, role, status, invited_by, joined_at, created_at, updated_at
        )
        SELECT 
            uuid_generate_v4(),
            new_organization_id,
            sc.candidate_id,
            'member',
            CASE 
                WHEN sc.status = 'active' THEN 'active'
                ELSE 'inactive'
            END,
            supervisor_record.id,
            sc.created_at,
            sc.created_at,
            sc.updated_at
        FROM supervisor_candidates sc
        WHERE sc.supervisor_id = supervisor_record.id;

        -- Update candidates' primary organization
        UPDATE profiles 
        SET primary_organization_id = new_organization_id,
            updated_at = NOW()
        WHERE id IN (
            SELECT candidate_id 
            FROM supervisor_candidates 
            WHERE supervisor_id = supervisor_record.id
        );

        -- Update projects owned by candidates to be part of this organization
        UPDATE projects
        SET organization_id = new_organization_id,
            visibility = 'organization',
            allow_external_supervision = false,
            updated_at = NOW()
        WHERE owner_id IN (
            SELECT candidate_id 
            FROM supervisor_candidates 
            WHERE supervisor_id = supervisor_record.id
        );

        RAISE NOTICE 'Created organization % for supervisor %', new_organization_id, supervisor_record.email;
    END LOOP;

    -- Step 2: Convert existing project supervision relationships to the new model
    FOR relationship_record IN
        SELECT p.id as project_id, p.owner_id, p.supervisor_id
        FROM projects p
        WHERE p.supervisor_id IS NOT NULL 
        AND p.supervision_required = true
    LOOP
        -- Create new supervision relationship
        INSERT INTO project_supervisors (
            id, project_id, supervisor_id, supervised_user_id, 
            status, supervision_type, notes, requested_by, approved_by,
            started_at, created_at, updated_at
        ) VALUES (
            uuid_generate_v4(),
            relationship_record.project_id,
            relationship_record.supervisor_id,
            relationship_record.owner_id,
            'active',
            'full',
            'Migrated from old supervision model',
            relationship_record.owner_id,
            relationship_record.supervisor_id,
            NOW(),
            NOW(),
            NOW()
        );

        RAISE NOTICE 'Created supervision relationship for project % between % and %', 
            relationship_record.project_id, relationship_record.supervisor_id, relationship_record.owner_id;
    END LOOP;

    -- Step 3: Create default organizations for users without organizations
    -- These are typically independent practitioners
    INSERT INTO organizations (id, name, description, created_by, created_at, updated_at)
    SELECT 
        uuid_generate_v4(),
        p.first_name || ' ' || p.last_name || ' (Independent)',
        'Independent practitioner organization created during migration',
        p.id,
        NOW(),
        NOW()
    FROM profiles p
    WHERE p.primary_organization_id IS NULL
    AND p.id NOT IN (
        SELECT DISTINCT om.user_id 
        FROM organization_memberships om 
        WHERE om.status = 'active'
    );

    -- Add these users as owners of their organizations and update their profiles
    WITH new_orgs AS (
        INSERT INTO organization_memberships (
            id, organization_id, user_id, role, status, invited_by, joined_at, created_at, updated_at
        )
        SELECT 
            uuid_generate_v4(),
            o.id,
            o.created_by,
            'owner',
            'active',
            o.created_by,
            NOW(),
            NOW(),
            NOW()
        FROM organizations o
        WHERE o.description LIKE '%Independent practitioner%'
        AND o.created_by NOT IN (
            SELECT DISTINCT om.user_id 
            FROM organization_memberships om 
            WHERE om.status = 'active'
        )
        RETURNING organization_id, user_id
    )
    UPDATE profiles 
    SET primary_organization_id = new_orgs.organization_id,
        updated_at = NOW()
    FROM new_orgs
    WHERE profiles.id = new_orgs.user_id;

    RAISE NOTICE 'Migration to organization model completed successfully';

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Migration failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_to_organization_model();

-- Drop the migration function as it's no longer needed
DROP FUNCTION migrate_to_organization_model();

-- Step 4: Add a migration marker to track successful completion
INSERT INTO organizations (id, name, description, created_by, created_at, updated_at)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'MIGRATION_MARKER',
    'This record indicates successful completion of organization model migration',
    NULL,
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- Note: We don't drop the supervisor_candidates table yet to allow for rollback if needed
-- It will be marked for removal in a future migration after confirming everything works

COMMENT ON TABLE supervisor_candidates IS 'DEPRECATED: Will be removed in future migration. Replaced by organization_memberships and project_supervisors tables.';

-- Add indexes for the new queries that will be common
CREATE INDEX IF NOT EXISTS idx_organization_memberships_composite ON organization_memberships(user_id, organization_id, status);
CREATE INDEX IF NOT EXISTS idx_project_supervisors_composite ON project_supervisors(project_id, supervisor_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_organization_visibility ON projects(organization_id, visibility) WHERE organization_id IS NOT NULL;