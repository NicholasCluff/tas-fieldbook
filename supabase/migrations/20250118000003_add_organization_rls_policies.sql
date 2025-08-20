-- Row Level Security policies for the new organization system
-- This migration adds comprehensive RLS policies for organizations, memberships, and projects

-- Enable RLS on all new tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_supervisors ENABLE ROW LEVEL SECURITY;

-- Organizations RLS Policies
-- Users can view organizations they are members of
CREATE POLICY "Users can view organizations they belong to" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can view public organization info (for invitations, etc.)
CREATE POLICY "Users can view basic organization info for invitations" ON organizations
    FOR SELECT USING (
        id IN (
            SELECT organization_id 
            FROM organization_invitations 
            WHERE invitee_id = auth.uid() OR invitee_email = auth.email()
        )
    );

-- Organization owners and admins can update organizations
CREATE POLICY "Organization owners and admins can update organizations" ON organizations
    FOR UPDATE USING (
        id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- Users can create organizations (anyone can start an organization)
CREATE POLICY "Users can create organizations" ON organizations
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Only owners can delete organizations (soft delete recommended in practice)
CREATE POLICY "Organization owners can delete organizations" ON organizations
    FOR DELETE USING (
        id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND role = 'owner' 
            AND status = 'active'
        )
    );

-- Organization Memberships RLS Policies
-- Users can view memberships of organizations they belong to
CREATE POLICY "Users can view organization memberships" ON organization_memberships
    FOR SELECT USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )
    );

-- Organization owners and admins can manage memberships
CREATE POLICY "Organization owners and admins can manage memberships" ON organization_memberships
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- Users can update their own membership (e.g., leave organization)
CREATE POLICY "Users can update their own membership" ON organization_memberships
    FOR UPDATE USING (user_id = auth.uid());

-- Organization Invitations RLS Policies
-- Users can view invitations sent to them
CREATE POLICY "Users can view their invitations" ON organization_invitations
    FOR SELECT USING (
        invitee_id = auth.uid() OR 
        invitee_email = auth.email() OR
        inviter_id = auth.uid()
    );

-- Organization owners and admins can manage invitations
CREATE POLICY "Organization owners and admins can manage invitations" ON organization_invitations
    FOR ALL USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        )
    );

-- Users can update invitations sent to them (accept/decline)
CREATE POLICY "Users can respond to their invitations" ON organization_invitations
    FOR UPDATE USING (
        invitee_id = auth.uid() OR invitee_email = auth.email()
    );

-- Project Supervisors RLS Policies
-- Users can view supervision relationships they are part of
CREATE POLICY "Users can view their supervision relationships" ON project_supervisors
    FOR SELECT USING (
        supervisor_id = auth.uid() OR 
        supervised_user_id = auth.uid() OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Project owners and supervisors can manage supervision relationships
CREATE POLICY "Project stakeholders can manage supervision" ON project_supervisors
    FOR ALL USING (
        supervisor_id = auth.uid() OR 
        supervised_user_id = auth.uid() OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR
        project_id IN (
            SELECT project_id 
            FROM project_permissions 
            WHERE user_id = auth.uid() AND can_approve = true
        )
    );

-- Updated Projects RLS Policies (modify existing policies)
-- Drop existing project policies if they exist
DROP POLICY IF EXISTS "Users can view their projects" ON projects;
DROP POLICY IF EXISTS "Users can update their projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Users can view projects they have access to
CREATE POLICY "Users can view accessible projects" ON projects
    FOR SELECT USING (
        -- Projects they own
        owner_id = auth.uid() OR
        -- Projects they have explicit permissions for
        id IN (
            SELECT project_id 
            FROM project_permissions 
            WHERE user_id = auth.uid()
        ) OR
        -- Organization projects they can access
        (organization_id IS NOT NULL AND organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() AND status = 'active'
        )) OR
        -- Public projects with external supervision allowed
        (visibility = 'public' AND allow_external_supervision = true) OR
        -- Projects they supervise
        id IN (
            SELECT project_id 
            FROM project_supervisors 
            WHERE supervisor_id = auth.uid() AND status = 'active'
        ) OR
        -- Projects they are supervised on
        id IN (
            SELECT project_id 
            FROM project_supervisors 
            WHERE supervised_user_id = auth.uid() AND status = 'active'
        )
    );

-- Users can update projects they have edit rights to
CREATE POLICY "Users can update projects with edit rights" ON projects
    FOR UPDATE USING (
        -- Project owners
        owner_id = auth.uid() OR
        -- Users with explicit edit permissions
        id IN (
            SELECT project_id 
            FROM project_permissions 
            WHERE user_id = auth.uid() AND can_edit = true
        ) OR
        -- Organization admins/owners for organization projects
        (organization_id IS NOT NULL AND organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND role IN ('owner', 'admin') 
            AND status = 'active'
        ))
    );

-- Only project owners can delete projects
CREATE POLICY "Project owners can delete projects" ON projects
    FOR DELETE USING (owner_id = auth.uid());

-- Authenticated users can create projects
CREATE POLICY "Authenticated users can create projects" ON projects
    FOR INSERT WITH CHECK (
        auth.uid() IS NOT NULL AND 
        owner_id = auth.uid()
    );

-- Updated Project Permissions RLS Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project permissions" ON project_permissions;
DROP POLICY IF EXISTS "Users can manage project permissions" ON project_permissions;

-- Users can view permissions for projects they have access to
CREATE POLICY "Users can view project permissions" ON project_permissions
    FOR SELECT USING (
        project_id IN (
            SELECT id FROM projects 
            WHERE owner_id = auth.uid() OR
            id IN (
                SELECT project_id 
                FROM project_permissions 
                WHERE user_id = auth.uid()
            ) OR
            (organization_id IS NOT NULL AND organization_id IN (
                SELECT organization_id 
                FROM organization_memberships 
                WHERE user_id = auth.uid() AND status = 'active'
            ))
        )
    );

-- Project owners and users with invite permissions can manage permissions
CREATE POLICY "Authorized users can manage project permissions" ON project_permissions
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR
        project_id IN (
            SELECT project_id 
            FROM project_permissions 
            WHERE user_id = auth.uid() AND can_invite = true
        ) OR
        project_id IN (
            SELECT p.id FROM projects p
            INNER JOIN organization_memberships om 
            ON p.organization_id = om.organization_id
            WHERE om.user_id = auth.uid() 
            AND om.role IN ('owner', 'admin') 
            AND om.status = 'active'
        )
    );

-- Updated Project Invitations RLS Policies  
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view project invitations" ON project_invitations;
DROP POLICY IF EXISTS "Users can manage project invitations" ON project_invitations;

-- Users can view invitations involving them
CREATE POLICY "Users can view relevant project invitations" ON project_invitations
    FOR SELECT USING (
        inviter_id = auth.uid() OR 
        invitee_id = auth.uid() OR
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        )
    );

-- Users with invite permissions can manage invitations
CREATE POLICY "Authorized users can manage project invitations" ON project_invitations
    FOR ALL USING (
        project_id IN (
            SELECT id FROM projects WHERE owner_id = auth.uid()
        ) OR
        project_id IN (
            SELECT project_id 
            FROM project_permissions 
            WHERE user_id = auth.uid() AND can_invite = true
        ) OR
        invitee_id = auth.uid() -- Users can respond to their own invitations
    );

-- Add helpful comments
COMMENT ON POLICY "Users can view accessible projects" ON projects IS 
    'Allows users to view projects they own, have permissions for, are members of the organization, or can supervise';

COMMENT ON POLICY "Users can view organization memberships" ON organization_memberships IS 
    'Users can see membership lists of organizations they belong to';

COMMENT ON POLICY "Users can view their supervision relationships" ON project_supervisors IS 
    'Users can see supervision relationships where they are the supervisor, supervised user, or project owner';

-- Create helper function for organization access checks (useful for application code)
CREATE OR REPLACE FUNCTION user_has_organization_access(org_id UUID, min_role TEXT DEFAULT 'member')
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM organization_memberships 
        WHERE organization_id = org_id 
        AND user_id = auth.uid() 
        AND status = 'active'
        AND (
            min_role = 'member' OR
            (min_role = 'admin' AND role IN ('admin', 'owner')) OR
            (min_role = 'owner' AND role = 'owner')
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;