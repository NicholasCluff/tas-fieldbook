-- Add organization system to replace supervisor/candidate model
-- This migration creates a flexible organization-based collaboration system

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    logo_url TEXT,
    settings JSONB DEFAULT '{}',
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create organization memberships table
CREATE TABLE IF NOT EXISTS organization_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

-- 3. Create organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invitee_email TEXT NOT NULL,
    invitee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled', 'expired')),
    message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create project supervisors table for flexible supervision relationships
CREATE TABLE IF NOT EXISTS project_supervisors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    supervisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    supervised_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'completed')),
    supervision_type TEXT NOT NULL DEFAULT 'full' CHECK (supervision_type IN ('full', 'review_only', 'advisory')),
    notes TEXT,
    requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, supervisor_id, supervised_user_id)
);

-- 5. Add organization support to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
ADD COLUMN IF NOT EXISTS allow_external_supervision BOOLEAN DEFAULT false;

-- 6. Remove role field from profiles table (but keep it for now to avoid breaking changes)
-- We'll add a migration step later to actually remove it after updating the codebase
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS primary_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 7. Update project_invitations to support organization context
ALTER TABLE project_invitations 
ADD COLUMN IF NOT EXISTS organization_context_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- 8. Update project_permissions to be more granular
ALTER TABLE project_permissions 
ADD COLUMN IF NOT EXISTS granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_organization_id ON organization_memberships(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_memberships_role ON organization_memberships(role);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_invitee_email ON organization_invitations(invitee_email);
CREATE INDEX IF NOT EXISTS idx_organization_invitations_status ON organization_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_supervisors_project_id ON project_supervisors(project_id);
CREATE INDEX IF NOT EXISTS idx_project_supervisors_supervisor_id ON project_supervisors(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_project_supervisors_supervised_user_id ON project_supervisors(supervised_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization_id ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);
CREATE INDEX IF NOT EXISTS idx_profiles_primary_organization_id ON profiles(primary_organization_id);

-- Add comments for documentation
COMMENT ON TABLE organizations IS 'Companies, firms, or businesses that users can belong to';
COMMENT ON TABLE organization_memberships IS 'User memberships in organizations with roles and status';
COMMENT ON TABLE organization_invitations IS 'Invitations for users to join organizations';
COMMENT ON TABLE project_supervisors IS 'Flexible supervision relationships for projects';
COMMENT ON COLUMN projects.organization_id IS 'Organization that owns or is associated with this project';
COMMENT ON COLUMN projects.visibility IS 'Who can see this project: private, organization members, or public';
COMMENT ON COLUMN projects.allow_external_supervision IS 'Whether users outside the organization can supervise this project';
COMMENT ON COLUMN profiles.primary_organization_id IS 'User primary/default organization affiliation';

-- Create trigger for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_memberships_updated_at 
    BEFORE UPDATE ON organization_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_supervisors_updated_at 
    BEFORE UPDATE ON project_supervisors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();