-- Survey Search Module Database Migration
-- This migration adds all tables needed for the survey search analysis feature
-- Run this in your Supabase SQL Editor after the main schema

-- Create survey_plans table
CREATE TABLE IF NOT EXISTS survey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  search_document_id UUID REFERENCES search_documents(id) ON DELETE CASCADE NOT NULL,
  reference_number TEXT NOT NULL, -- extracted from bookmarks (e.g., "432367-1")
  title TEXT,
  description TEXT,
  file_path TEXT NOT NULL, -- path to individual plan PDF in Supabase Storage
  page_numbers INTEGER[], -- pages from original document
  file_size INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
  sort_order INTEGER DEFAULT 0,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_tags table
CREATE TABLE IF NOT EXISTS plan_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#3B82F6', -- hex color for tag display
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(project_id, name)
);

-- Create plan_tag_assignments table
CREATE TABLE IF NOT EXISTS plan_tag_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE NOT NULL,
  tag_id UUID REFERENCES plan_tags(id) ON DELETE CASCADE NOT NULL,
  assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(plan_id, tag_id)
);

-- Create plan_relationships table
CREATE TABLE IF NOT EXISTS plan_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE NOT NULL,
  child_plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE NOT NULL,
  relationship_type TEXT DEFAULT 'related' CHECK (relationship_type IN ('parent', 'child', 'related', 'supersedes', 'superseded_by')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(parent_plan_id, child_plan_id),
  CHECK (parent_plan_id != child_plan_id)
);

-- Create plan_annotations table
CREATE TABLE IF NOT EXISTS plan_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES survey_plans(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  annotation_type TEXT NOT NULL CHECK (annotation_type IN ('markup', 'text', 'highlight', 'arrow', 'rectangle', 'circle', 'freehand')),
  page_number INTEGER NOT NULL DEFAULT 1,
  coordinates JSONB NOT NULL, -- {x, y, width, height} or path data for freehand
  content TEXT, -- text content for text annotations
  style JSONB, -- {color, strokeWidth, opacity, etc.}
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security on new tables
ALTER TABLE survey_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_annotations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for survey_plans
CREATE POLICY "Users can view plans for their projects" ON survey_plans FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = survey_plans.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    )
);

CREATE POLICY "Users can create plans for their projects" ON survey_plans FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND created_by = auth.uid()
);

CREATE POLICY "Users can update plans for their projects" ON survey_plans FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = survey_plans.project_id 
        AND projects.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete plans for their projects" ON survey_plans FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = survey_plans.project_id 
        AND projects.owner_id = auth.uid()
    )
);

-- RLS Policies for plan_tags
CREATE POLICY "Users can view tags for their projects" ON plan_tags FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = plan_tags.project_id 
        AND (projects.owner_id = auth.uid() OR projects.supervisor_id = auth.uid())
    )
);

CREATE POLICY "Users can create tags for their projects" ON plan_tags FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = project_id 
        AND projects.owner_id = auth.uid()
    ) AND created_by = auth.uid()
);

CREATE POLICY "Users can update tags for their projects" ON plan_tags FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = plan_tags.project_id 
        AND projects.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete tags for their projects" ON plan_tags FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM projects 
        WHERE projects.id = plan_tags.project_id 
        AND projects.owner_id = auth.uid()
    )
);

-- RLS Policies for plan_tag_assignments
CREATE POLICY "Users can view tag assignments for their projects" ON plan_tag_assignments FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_tag_assignments.plan_id 
        AND (p.owner_id = auth.uid() OR p.supervisor_id = auth.uid())
    )
);

CREATE POLICY "Users can create tag assignments for their projects" ON plan_tag_assignments FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_id 
        AND p.owner_id = auth.uid()
    ) AND assigned_by = auth.uid()
);

CREATE POLICY "Users can delete tag assignments for their projects" ON plan_tag_assignments FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_tag_assignments.plan_id 
        AND p.owner_id = auth.uid()
    )
);

-- RLS Policies for plan_relationships
CREATE POLICY "Users can view relationships for their projects" ON plan_relationships FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_relationships.parent_plan_id 
        AND (p.owner_id = auth.uid() OR p.supervisor_id = auth.uid())
    )
);

CREATE POLICY "Users can create relationships for their projects" ON plan_relationships FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = parent_plan_id 
        AND p.owner_id = auth.uid()
    ) AND created_by = auth.uid()
);

CREATE POLICY "Users can update relationships for their projects" ON plan_relationships FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_relationships.parent_plan_id 
        AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete relationships for their projects" ON plan_relationships FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_relationships.parent_plan_id 
        AND p.owner_id = auth.uid()
    )
);

-- RLS Policies for plan_annotations
CREATE POLICY "Users can view annotations for their projects" ON plan_annotations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_annotations.plan_id 
        AND (p.owner_id = auth.uid() OR p.supervisor_id = auth.uid())
    )
);

CREATE POLICY "Users can create annotations for their projects" ON plan_annotations FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_id 
        AND p.owner_id = auth.uid()
    ) AND user_id = auth.uid()
);

CREATE POLICY "Users can update their own annotations" ON plan_annotations FOR UPDATE USING (
    user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_annotations.plan_id 
        AND p.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own annotations" ON plan_annotations FOR DELETE USING (
    user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM survey_plans sp
        JOIN projects p ON p.id = sp.project_id
        WHERE sp.id = plan_annotations.plan_id 
        AND p.owner_id = auth.uid()
    )
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_survey_plans_project_id ON survey_plans(project_id);
CREATE INDEX IF NOT EXISTS idx_survey_plans_search_document_id ON survey_plans(search_document_id);
CREATE INDEX IF NOT EXISTS idx_survey_plans_reference_number ON survey_plans(reference_number);
CREATE INDEX IF NOT EXISTS idx_survey_plans_status ON survey_plans(status);

CREATE INDEX IF NOT EXISTS idx_plan_tags_project_id ON plan_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_plan_tags_name ON plan_tags(project_id, name);

CREATE INDEX IF NOT EXISTS idx_plan_tag_assignments_plan_id ON plan_tag_assignments(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_tag_assignments_tag_id ON plan_tag_assignments(tag_id);

CREATE INDEX IF NOT EXISTS idx_plan_relationships_parent ON plan_relationships(parent_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_relationships_child ON plan_relationships(child_plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_relationships_type ON plan_relationships(relationship_type);

CREATE INDEX IF NOT EXISTS idx_plan_annotations_plan_id ON plan_annotations(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_annotations_page_number ON plan_annotations(plan_id, page_number);
CREATE INDEX IF NOT EXISTS idx_plan_annotations_user_id ON plan_annotations(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_annotations_type ON plan_annotations(annotation_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at timestamps
CREATE OR REPLACE TRIGGER update_survey_plans_updated_at 
    BEFORE UPDATE ON survey_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_plan_annotations_updated_at 
    BEFORE UPDATE ON plan_annotations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create a view for plans with their tags (for easier querying)
CREATE OR REPLACE VIEW survey_plans_with_tags AS
SELECT 
    sp.*,
    COALESCE(
        JSON_AGG(
            JSON_BUILD_OBJECT(
                'id', pt.id,
                'name', pt.name,
                'color', pt.color
            )
        ) FILTER (WHERE pt.id IS NOT NULL), 
        '[]'::json
    ) as tags
FROM survey_plans sp
LEFT JOIN plan_tag_assignments pta ON sp.id = pta.plan_id
LEFT JOIN plan_tags pt ON pta.tag_id = pt.id
GROUP BY sp.id, sp.project_id, sp.search_document_id, sp.reference_number, 
         sp.title, sp.description, sp.file_path, sp.page_numbers, sp.file_size,
         sp.status, sp.sort_order, sp.created_by, sp.created_at, sp.updated_at;

-- Grant permissions for the view
GRANT SELECT ON survey_plans_with_tags TO authenticated;

-- Create a function to get plan annotation count
CREATE OR REPLACE FUNCTION get_plan_annotation_count(plan_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INTEGER 
        FROM plan_annotations 
        WHERE plan_id = plan_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_plan_annotation_count TO authenticated;