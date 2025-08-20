-- Fixed RLS policy for projects table to avoid circular dependency
-- This policy uses the helper function we created to safely check organization access

DROP POLICY IF EXISTS "Users can view accessible projects" ON projects;

CREATE POLICY "Users can view accessible projects" ON projects
    FOR SELECT USING (
        -- Projects they own (direct ownership check - no circular dependency)
        owner_id = auth.uid() OR
        
        -- Organization projects they can access (using our safe helper function)
        (organization_id IS NOT NULL AND get_user_organization_role(organization_id) IN ('owner', 'admin', 'member')) OR
        
        -- Public projects with external supervision allowed (direct column check)
        (visibility = 'public' AND allow_external_supervision = true) OR
        
        -- Projects they supervise (direct table lookup)
        id IN (
            SELECT project_id 
            FROM project_supervisors 
            WHERE supervisor_id = auth.uid() AND status = 'active'
        ) OR
        
        -- Projects they are supervised on (direct table lookup)
        id IN (
            SELECT project_id 
            FROM project_supervisors 
            WHERE supervised_user_id = auth.uid() AND status = 'active'
        )
    );

-- Add helpful comment
COMMENT ON POLICY "Users can view accessible projects" ON projects IS 
    'Allows users to view projects they own, have permissions for, are members of the organization, can supervise, or are public with external supervision. Uses helper function to avoid circular dependency in organization membership checks.';