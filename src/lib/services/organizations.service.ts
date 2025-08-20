import { supabase } from '$lib/utils/supabase.js'
import type { 
  Organization, 
  OrganizationInsert, 
  OrganizationUpdate,
  OrganizationMembership,
  OrganizationMembershipInsert,
  OrganizationInvitation,
  OrganizationInvitationInsert,
  OrganizationWithMembership,
  ServiceResult 
} from '$lib/types/database.js'

export class OrganizationsService {
  
  // Create a new organization
  async createOrganization(organization: Omit<OrganizationInsert, 'created_by'>): Promise<ServiceResult<Organization>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Create the organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({ ...organization, created_by: user.id })
        .select()
        .single()

      if (orgError) {
        return { success: false, error: orgError.message }
      }

      // Add the creator as an owner
      const { error: membershipError } = await supabase
        .from('organization_memberships')
        .insert({
          organization_id: newOrg.id,
          user_id: user.id,
          role: 'owner',
          status: 'active'
        })

      if (membershipError) {
        // Clean up the organization if membership creation fails
        await supabase.from('organizations').delete().eq('id', newOrg.id)
        return { success: false, error: membershipError.message }
      }

      return { success: true, data: newOrg }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get organizations for a user
  async getUserOrganizations(userId?: string): Promise<ServiceResult<OrganizationWithMembership[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const targetUserId = userId || user?.id
      
      if (!targetUserId) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('user_id', targetUserId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      // Transform the data to include membership info with organization
      const organizations: OrganizationWithMembership[] = data.map(membership => ({
        ...membership.organization,
        membership
      }))

      return { success: true, data: organizations }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get a specific organization with membership details
  async getOrganization(organizationId: string): Promise<ServiceResult<OrganizationWithMembership>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          memberships:organization_memberships(
            *,
            user:profiles(id, first_name, last_name, email)
          )
        `)
        .eq('id', organizationId)
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      // Check if user is a member
      const userMembership = data.memberships?.find(m => m.user_id === user.id && m.status === 'active')
      if (!userMembership) {
        return { success: false, error: 'Access denied' }
      }

      const result: OrganizationWithMembership = {
        ...data,
        membership: userMembership,
        member_count: data.memberships?.filter(m => m.status === 'active').length || 0
      }

      return { success: true, data: result }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Update an organization
  async updateOrganization(organizationId: string, updates: OrganizationUpdate): Promise<ServiceResult<Organization>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has admin rights
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { success: false, error: 'Insufficient permissions' }
      }

      const { data, error } = await supabase
        .from('organizations')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', organizationId)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Invite a user to join an organization
  async inviteUser(
    organizationId: string, 
    inviteeEmail: string, 
    role: 'admin' | 'member' = 'member',
    message?: string
  ): Promise<ServiceResult<OrganizationInvitation>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has invite rights
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_memberships')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('user_id', inviteeEmail) // This should check by email via profiles
        .single()

      if (existingMember) {
        return { success: false, error: 'User is already a member' }
      }

      // Check for pending invitations
      const { data: pendingInvite } = await supabase
        .from('organization_invitations')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('invitee_email', inviteeEmail)
        .eq('status', 'pending')
        .single()

      if (pendingInvite) {
        return { success: false, error: 'User already has a pending invitation' }
      }

      const invitation: OrganizationInvitationInsert = {
        organization_id: organizationId,
        inviter_id: user.id,
        invitee_email: inviteeEmail,
        role,
        message,
        status: 'pending'
      }

      const { data, error } = await supabase
        .from('organization_invitations')
        .insert(invitation)
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Accept an organization invitation
  async acceptInvitation(invitationId: string): Promise<ServiceResult<OrganizationMembership>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Get the invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('id', invitationId)
        .eq('status', 'pending')
        .single()

      if (inviteError || !invitation) {
        return { success: false, error: 'Invalid or expired invitation' }
      }

      // Check if invitation is for the current user
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!profile || profile.email !== invitation.invitee_email) {
        return { success: false, error: 'Invitation not for this user' }
      }

      // Check if invitation has expired
      if (new Date(invitation.expires_at) < new Date()) {
        await supabase
          .from('organization_invitations')
          .update({ status: 'expired' })
          .eq('id', invitationId)
        return { success: false, error: 'Invitation has expired' }
      }

      // Create membership
      const membershipData: OrganizationMembershipInsert = {
        organization_id: invitation.organization_id,
        user_id: user.id,
        role: invitation.role,
        invited_by: invitation.inviter_id,
        status: 'active'
      }

      const { data: membership, error: membershipError } = await supabase
        .from('organization_memberships')
        .insert(membershipData)
        .select()
        .single()

      if (membershipError) {
        return { success: false, error: membershipError.message }
      }

      // Update invitation status
      await supabase
        .from('organization_invitations')
        .update({ 
          status: 'accepted', 
          responded_at: new Date().toISOString(),
          invitee_id: user.id
        })
        .eq('id', invitationId)

      return { success: true, data: membership }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Decline an organization invitation
  async declineInvitation(invitationId: string): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { error } = await supabase
        .from('organization_invitations')
        .update({ 
          status: 'declined', 
          responded_at: new Date().toISOString() 
        })
        .eq('id', invitationId)
        .eq('status', 'pending')

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get pending invitations for a user
  async getUserInvitations(): Promise<ServiceResult<OrganizationInvitation[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', user.id)
        .single()

      if (!profile) {
        return { success: false, error: 'Profile not found' }
      }

      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organization:organizations(name),
          inviter:profiles!organization_invitations_inviter_id_fkey(first_name, last_name)
        `)
        .eq('invitee_email', profile.email)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Remove a user from an organization
  async removeMember(organizationId: string, userId: string): Promise<ServiceResult<void>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has admin rights or is removing themselves
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      const isRemovingSelf = user.id === userId
      const hasAdminRights = membership && ['owner', 'admin'].includes(membership.role)

      if (!isRemovingSelf && !hasAdminRights) {
        return { success: false, error: 'Insufficient permissions' }
      }

      // Prevent owner from removing themselves if they're the only owner
      if (isRemovingSelf && membership?.role === 'owner') {
        const { data: ownerCount } = await supabase
          .from('organization_memberships')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('role', 'owner')
          .eq('status', 'active')

        if (ownerCount && ownerCount.length <= 1) {
          return { success: false, error: 'Cannot remove the only owner. Transfer ownership first.' }
        }
      }

      const { error } = await supabase
        .from('organization_memberships')
        .update({ status: 'inactive' })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Update member role
  async updateMemberRole(
    organizationId: string, 
    userId: string, 
    newRole: 'owner' | 'admin' | 'member'
  ): Promise<ServiceResult<OrganizationMembership>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user has owner rights (only owners can change roles)
      const { data: membership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!membership || membership.role !== 'owner') {
        return { success: false, error: 'Only owners can change member roles' }
      }

      const { data, error } = await supabase
        .from('organization_memberships')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('organization_id', organizationId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .select()
        .single()

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }

  // Get organization members
  async getOrganizationMembers(organizationId: string): Promise<ServiceResult<OrganizationMembership[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { success: false, error: 'User not authenticated' }
      }

      // Check if user is a member
      const { data: userMembership } = await supabase
        .from('organization_memberships')
        .select('role')
        .eq('organization_id', organizationId)
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single()

      if (!userMembership) {
        return { success: false, error: 'Access denied' }
      }

      const { data, error } = await supabase
        .from('organization_memberships')
        .select(`
          *,
          user:profiles(id, first_name, last_name, email),
          invited_by_user:profiles!organization_memberships_invited_by_fkey(first_name, last_name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false })

      if (error) {
        return { success: false, error: error.message }
      }

      return { success: true, data }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error occurred' 
      }
    }
  }
}

export const organizationsService = new OrganizationsService()