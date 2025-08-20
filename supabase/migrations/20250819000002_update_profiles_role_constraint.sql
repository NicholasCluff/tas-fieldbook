-- Update profiles role constraint to support organization-based roles
-- Remove the old supervisor/candidate constraint and add modern role support

-- First, update existing roles to new system
UPDATE public.profiles SET role = 'user' WHERE role = 'candidate';
UPDATE public.profiles SET role = 'admin' WHERE role = 'supervisor';

-- Drop the old constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add new constraint that supports organization-based roles
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('user', 'admin', 'owner'));

-- Update the trigger function to use 'user' as default role
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile record using the user's metadata
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.raw_user_meta_data->>'phone',
    'user', -- Default role for new users
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON CONSTRAINT profiles_role_check ON profiles IS 'Allows user, admin, and owner roles for organization-based system';