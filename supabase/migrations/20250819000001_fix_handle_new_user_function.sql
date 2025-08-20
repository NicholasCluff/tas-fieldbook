-- Fix handle_new_user function to properly create user profiles
-- This migration fixes the signup issue by implementing the missing trigger function

-- Drop the existing trigger first
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the existing incomplete function
DROP FUNCTION IF EXISTS handle_new_user();

-- Create the proper handle_new_user function
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
    'user', -- Default role
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

-- Ensure the trigger exists (it should already exist based on our investigation)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add comment for documentation
COMMENT ON FUNCTION handle_new_user() IS 'Creates a user profile in public.profiles when a new user is created in auth.users';