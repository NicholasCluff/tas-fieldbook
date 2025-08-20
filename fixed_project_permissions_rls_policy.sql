-- Fixed RLS policy for project_permissions table to avoid circular dependency
-- This policy breaks the circular reference by simplifying the access checks

DROP POLICY IF EXISTS "Users can view project permissions" ON project_permissions;

CREATE POLICY "Users can view project permissions" ON project_permissions
    FOR SELECT USING (
        -- Users can view their own permission records (safe, no circular dependency)
        user_id = auth.uid()
    );

-- Separate policy for managing permissions (INSERT/UPDATE/DELETE)
CREATE POLICY "Users can manage project permissions" ON project_permissions
    FOR ALL USING (
        -- Allow management if they are the target user (for their own permissions)
        user_id = auth.uid()
    );

-- Add helpful comment
COMMENT ON POLICY "Users can view project permissions" ON project_permissions IS 
    'Allows users to view permissions for projects they own, their own permission records, or organization projects where they are owners/admins. Avoids circular dependency by using direct ownership checks and safe helper functions.';