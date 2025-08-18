export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'supervisor' | 'candidate'
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          role: 'supervisor' | 'candidate'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          role?: 'supervisor' | 'candidate'
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      supervisor_candidates: {
        Row: {
          id: string
          supervisor_id: string
          candidate_id: string
          status: 'active' | 'inactive'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          supervisor_id: string
          candidate_id: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          supervisor_id?: string
          candidate_id?: string
          status?: 'active' | 'inactive'
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          title: string
          description: string | null
          location: string
          owner_id: string
          supervisor_id: string | null
          phase: 'setup' | 'fieldwork' | 'review'
          status: 'active' | 'completed' | 'archived'
          supervision_required: boolean
          supervision_requested: boolean
          start_date: string | null
          due_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          location: string
          owner_id: string
          supervisor_id?: string | null
          phase?: 'setup' | 'fieldwork' | 'review'
          status?: 'active' | 'completed' | 'archived'
          supervision_required?: boolean
          supervision_requested?: boolean
          start_date?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          location?: string
          owner_id?: string
          supervisor_id?: string | null
          phase?: 'setup' | 'fieldwork' | 'review'
          status?: 'active' | 'completed' | 'archived'
          supervision_required?: boolean
          supervision_requested?: boolean
          start_date?: string | null
          due_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      search_documents: {
        Row: {
          id: string
          project_id: string
          title: string
          file_path: string
          file_size: number | null
          mime_type: string | null
          uploaded_by: string
          status: 'pending' | 'approved' | 'rejected' | 'not_required'
          reviewed_by: string | null
          reviewed_at: string | null
          comments: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          title: string
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by: string
          status?: 'pending' | 'approved' | 'rejected' | 'not_required'
          reviewed_by?: string | null
          reviewed_at?: string | null
          comments?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          title?: string
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          uploaded_by?: string
          status?: 'pending' | 'approved' | 'rejected' | 'not_required'
          reviewed_by?: string | null
          reviewed_at?: string | null
          comments?: string | null
          created_at?: string
        }
      }
      diary_entries: {
        Row: {
          id: string
          project_id: string
          user_id: string
          entry_date: string
          title: string
          description: string
          weather: string | null
          temperature: number | null
          activities: Json | null
          location_lat: number | null
          location_lng: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          entry_date: string
          title: string
          description: string
          weather?: string | null
          temperature?: number | null
          activities?: Json | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          entry_date?: string
          title?: string
          description?: string
          weather?: string | null
          temperature?: number | null
          activities?: Json | null
          location_lat?: number | null
          location_lng?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      photos: {
        Row: {
          id: string
          project_id: string
          user_id: string
          diary_entry_id: string | null
          title: string | null
          description: string | null
          file_path: string
          file_size: number | null
          mime_type: string | null
          location_lat: number | null
          location_lng: number | null
          taken_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          diary_entry_id?: string | null
          title?: string | null
          description?: string | null
          file_path: string
          file_size?: number | null
          mime_type?: string | null
          location_lat?: number | null
          location_lng?: number | null
          taken_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          diary_entry_id?: string | null
          title?: string | null
          description?: string | null
          file_path?: string
          file_size?: number | null
          mime_type?: string | null
          location_lat?: number | null
          location_lng?: number | null
          taken_at?: string | null
          created_at?: string
        }
      }
      project_invitations: {
        Row: {
          id: string
          project_id: string
          inviter_id: string
          invitee_id: string
          role: 'supervisor' | 'collaborator'
          status: 'pending' | 'accepted' | 'declined' | 'cancelled'
          message: string | null
          responded_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          inviter_id: string
          invitee_id: string
          role: 'supervisor' | 'collaborator'
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
          message?: string | null
          responded_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          inviter_id?: string
          invitee_id?: string
          role?: 'supervisor' | 'collaborator'
          status?: 'pending' | 'accepted' | 'declined' | 'cancelled'
          message?: string | null
          responded_at?: string | null
          created_at?: string
        }
      }
      project_permissions: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: 'owner' | 'supervisor' | 'collaborator'
          can_edit: boolean
          can_approve: boolean
          can_invite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role: 'owner' | 'supervisor' | 'collaborator'
          can_edit?: boolean
          can_approve?: boolean
          can_invite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: 'owner' | 'supervisor' | 'collaborator'
          can_edit?: boolean
          can_approve?: boolean
          can_invite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      survey_plans: {
        Row: {
          id: string
          project_id: string
          search_document_id: string
          reference_number: string
          title: string | null
          description: string | null
          file_path: string
          page_numbers: number[] | null
          file_size: number | null
          status: 'active' | 'archived' | 'deleted'
          sort_order: number
          plan_year: number | null
          is_starred: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          search_document_id: string
          reference_number: string
          title?: string | null
          description?: string | null
          file_path: string
          page_numbers?: number[] | null
          file_size?: number | null
          status?: 'active' | 'archived' | 'deleted'
          sort_order?: number
          plan_year?: number | null
          is_starred?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          search_document_id?: string
          reference_number?: string
          title?: string | null
          description?: string | null
          file_path?: string
          page_numbers?: number[] | null
          file_size?: number | null
          status?: 'active' | 'archived' | 'deleted'
          sort_order?: number
          plan_year?: number | null
          is_starred?: boolean
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      plan_tags: {
        Row: {
          id: string
          project_id: string
          name: string
          color: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          color?: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          color?: string
          created_by?: string | null
          created_at?: string
        }
      }
      plan_tag_assignments: {
        Row: {
          id: string
          plan_id: string
          tag_id: string
          assigned_by: string | null
          assigned_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          tag_id: string
          assigned_by?: string | null
          assigned_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          tag_id?: string
          assigned_by?: string | null
          assigned_at?: string
        }
      }
      plan_relationships: {
        Row: {
          id: string
          parent_plan_id: string
          child_plan_id: string
          relationship_type: 'parent' | 'child' | 'related' | 'supersedes' | 'superseded_by'
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          parent_plan_id: string
          child_plan_id: string
          relationship_type?: 'parent' | 'child' | 'related' | 'supersedes' | 'superseded_by'
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          parent_plan_id?: string
          child_plan_id?: string
          relationship_type?: 'parent' | 'child' | 'related' | 'supersedes' | 'superseded_by'
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
      }
      plan_annotations: {
        Row: {
          id: string
          plan_id: string
          user_id: string
          annotation_type: 'markup' | 'text' | 'highlight' | 'arrow' | 'rectangle' | 'circle' | 'freehand'
          page_number: number
          coordinates: Json
          content: string | null
          style: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          user_id: string
          annotation_type: 'markup' | 'text' | 'highlight' | 'arrow' | 'rectangle' | 'circle' | 'freehand'
          page_number?: number
          coordinates: Json
          content?: string | null
          style?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          user_id?: string
          annotation_type?: 'markup' | 'text' | 'highlight' | 'arrow' | 'rectangle' | 'circle' | 'freehand'
          page_number?: number
          coordinates?: Json
          content?: string | null
          style?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      survey_plans_with_tags: {
        Row: {
          id: string
          project_id: string
          search_document_id: string
          reference_number: string
          title: string | null
          description: string | null
          file_path: string
          page_numbers: number[] | null
          file_size: number | null
          status: 'active' | 'archived' | 'deleted'
          sort_order: number
          plan_year: number | null
          is_starred: boolean
          created_by: string | null
          created_at: string
          updated_at: string
          tags: Json
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Project = Database['public']['Tables']['projects']['Row']
export type SearchDocument = Database['public']['Tables']['search_documents']['Row']
export type DiaryEntry = Database['public']['Tables']['diary_entries']['Row']
export type Photo = Database['public']['Tables']['photos']['Row']
export type ProjectInvitation = Database['public']['Tables']['project_invitations']['Row']
export type ProjectPermission = Database['public']['Tables']['project_permissions']['Row']

// Survey Search types
export type SurveyPlan = Database['public']['Tables']['survey_plans']['Row']
export type PlanTag = Database['public']['Tables']['plan_tags']['Row']
export type PlanTagAssignment = Database['public']['Tables']['plan_tag_assignments']['Row']
export type PlanRelationship = Database['public']['Tables']['plan_relationships']['Row']
export type PlanAnnotation = Database['public']['Tables']['plan_annotations']['Row']
export type SurveyPlanWithTags = Database['public']['Views']['survey_plans_with_tags']['Row']

// Insert types
export type ProjectInsert = Database['public']['Tables']['projects']['Insert']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type DiaryEntryInsert = Database['public']['Tables']['diary_entries']['Insert']
export type SearchDocumentInsert = Database['public']['Tables']['search_documents']['Insert']
export type SurveyPlanInsert = Database['public']['Tables']['survey_plans']['Insert']
export type PlanTagInsert = Database['public']['Tables']['plan_tags']['Insert']
export type PlanTagAssignmentInsert = Database['public']['Tables']['plan_tag_assignments']['Insert']
export type PlanRelationshipInsert = Database['public']['Tables']['plan_relationships']['Insert']
export type PlanAnnotationInsert = Database['public']['Tables']['plan_annotations']['Insert']

// Update types
export type SurveyPlanUpdate = Database['public']['Tables']['survey_plans']['Update']
export type PlanTagUpdate = Database['public']['Tables']['plan_tags']['Update']
export type PlanAnnotationUpdate = Database['public']['Tables']['plan_annotations']['Update']
export type PlanRelationshipUpdate = Database['public']['Tables']['plan_relationships']['Update']

// Specialized types for client use
export interface AnnotationStyle {
  color?: string
  strokeWidth?: number
  opacity?: number
  fill?: string
  fontSize?: number
}

export interface AnnotationCoordinates {
  x: number
  y: number
  width?: number
  height?: number
  path?: { x: number; y: number }[] // for freehand drawings
}

export interface PlanTagWithAssignment extends PlanTag {
  assigned_at?: string
  assigned_by?: string | null
}

export interface SurveyPlanWithDetails extends SurveyPlan {
  tags?: PlanTagWithAssignment[]
  annotations_count?: number
  relationships_count?: number
  search_document?: SearchDocument
}

export interface PlanFilters {
  search?: string
  tags?: string[]
  status?: SurveyPlan['status'][]
  sort_by?: 'created_at' | 'updated_at' | 'title' | 'reference_number' | 'plan_year' | 'is_starred'
  sort_order?: 'asc' | 'desc'
  starred_only?: boolean
}

export interface DocumentProcessingResult {
  success: boolean
  plans?: Array<{
    reference_number: string
    title?: string
    pages: number[]
    file_path: string
  }>
  errors?: string[]
}

// Service result wrapper
export interface ServiceResult<T> {
  data?: T
  error?: string
  success: boolean
}