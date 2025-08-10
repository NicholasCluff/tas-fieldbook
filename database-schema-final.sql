-- TasFieldbook Database Schema - Final Consolidated Version
-- Run this in your Supabase SQL Editor
-- 
-- This file consolidates all schema changes from the multiple versions
-- and represents the final, complete database structure.

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('supervisor', 'candidate')),
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create supervisor-candidate relationships table
CREATE TABLE IF NOT EXISTS supervisor_candidates (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(supervisor_id, candidate_id)
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    supervisor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    phase TEXT NOT NULL DEFAULT 'setup' CHECK (phase IN ('setup', 'fieldwork', 'review')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    supervision_required BOOLEAN NOT NULL DEFAULT false,
    supervision_requested BOOLEAN NOT NULL DEFAULT false,
    start_date DATE,
    due_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create search_documents table
CREATE TABLE IF NOT EXISTS search_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'not_required')),
    reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create diary_entries table
CREATE TABLE IF NOT EXISTS diary_entries (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    entry_date DATE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    weather TEXT,
    temperature DECIMAL,
    activities JSONB,
    location_lat DECIMAL,
    location_lng DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create photos table
CREATE TABLE IF NOT EXISTS photos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    diary_entry_id UUID REFERENCES diary_entries(id) ON DELETE SET NULL,
    title TEXT,
    description TEXT,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    location_lat DECIMAL,
    location_lng DECIMAL,
    taken_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_invitations table
CREATE TABLE IF NOT EXISTS project_invitations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('supervisor', 'collaborator')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'cancelled')),
    message TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_permissions table
CREATE TABLE IF NOT EXISTS project_permissions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('owner', 'supervisor', 'collaborator')),
    can_edit BOOLEAN NOT NULL DEFAULT false,
    can_approve BOOLEAN NOT NULL DEFAULT false,
    can_invite BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE supervisor_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view projects they own or supervise" ON projects FOR SELECT USING (
    owner_id = auth.uid() OR supervisor_id = auth.uid()
);
CREATE POLICY "Users can create projects they own" ON projects FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update projects they own" ON projects FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Supervisors can update supervised projects" ON projects FOR UPDATE USING (supervisor_id = auth.uid());

-- RLS Policies for diary_entries
CREATE POLICY "Users can view diary entries for their projects" ON diary_entries FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = diary_entries.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    )
);
CREATE POLICY "Users can create diary entries for their projects" ON diary_entries FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND user_id = auth.uid()
);
CREATE POLICY "Users can update their own diary entries" ON diary_entries FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for photos
CREATE POLICY "Users can view photos for their projects" ON photos FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = photos.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    )
);
CREATE POLICY "Users can create photos for their projects" ON photos FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND user_id = auth.uid()
);
CREATE POLICY "Users can update their own photos" ON photos FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for search_documents
CREATE POLICY "Users can view search documents for their projects" ON search_documents FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = search_documents.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    )
);
CREATE POLICY "Users can create search documents for their projects" ON search_documents FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND uploaded_by = auth.uid()
);

-- RLS Policies for project_invitations
CREATE POLICY "Users can view their own invitations" ON project_invitations FOR SELECT USING (
    inviter_id = auth.uid() OR invitee_id = auth.uid()
);
CREATE POLICY "Users can create invitations for their projects" ON project_invitations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND inviter_id = auth.uid()
);
CREATE POLICY "Users can update invitations they created or received" ON project_invitations FOR UPDATE USING (
    inviter_id = auth.uid() OR invitee_id = auth.uid()
);

-- RLS Policies for project_permissions
CREATE POLICY "Users can view permissions for their projects" ON project_permissions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_permissions.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    ) OR user_id = auth.uid()
);

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, first_name, last_name, role, phone)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'first_name', ''),
        COALESCE(new.raw_user_meta_data->>'last_name', ''),
        COALESCE(new.raw_user_meta_data->>'role', 'candidate'),
        new.raw_user_meta_data->>'phone'
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile on user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to create project permissions when a project is created
CREATE OR REPLACE FUNCTION public.handle_new_project()
RETURNS TRIGGER AS $$
BEGIN
    -- Create owner permission
    INSERT INTO public.project_permissions (project_id, user_id, role, can_edit, can_approve, can_invite)
    VALUES (new.id, new.owner_id, 'owner', true, true, true);
    
    -- Create supervisor permission if supervisor is assigned
    IF new.supervisor_id IS NOT NULL THEN
        INSERT INTO public.project_permissions (project_id, user_id, role, can_edit, can_approve, can_invite)
        VALUES (new.id, new.supervisor_id, 'supervisor', false, true, true);
    END IF;
    
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create permissions on project creation
CREATE OR REPLACE TRIGGER on_project_created
    AFTER INSERT ON projects
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_project();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_supervisor_id ON projects(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_project_id ON diary_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_diary_entries_user_id ON diary_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON photos(project_id);
CREATE INDEX IF NOT EXISTS idx_photos_diary_entry_id ON photos(diary_entry_id);
CREATE INDEX IF NOT EXISTS idx_search_documents_project_id ON search_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_invitee_id ON project_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_project_permissions_project_user ON project_permissions(project_id, user_id);

-- Storage bucket for file uploads (run this in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', false);

-- Storage RLS policies (run after creating buckets)
-- CREATE POLICY "Users can view files in their projects" ON storage.objects FOR SELECT USING (
--     bucket_id = 'project-files' AND
--     EXISTS (
--         SELECT 1 FROM projects p
--         WHERE (p.owner_id = auth.uid() OR p.supervisor_id = auth.uid())
--         AND name LIKE p.id::text || '%'
--     )
-- );
-- 
-- CREATE POLICY "Users can upload files to their projects" ON storage.objects FOR INSERT WITH CHECK (
--     bucket_id = 'project-files' AND
--     EXISTS (
--         SELECT 1 FROM projects p
--         WHERE p.owner_id = auth.uid()
--         AND name LIKE p.id::text || '%'
--     )
-- );