'use client';

import { useAuth } from '@/contexts/AuthContext';
import { 
  OrganizationRole, 
  FeaturePermission, 
  hasPermission, 
  getRolePermissions, 
  canAccessFeature 
} from '@/lib/permissions';

export function usePermissions() {
  const { user } = useAuth();
  
  // Get the user's role from their account_type
  const userRole = user?.account_type as OrganizationRole;

  // Convenience methods for checking approval-related permissions
  const canApproveUsers = () => userRole ? hasPermission(userRole, 'approve_users') : false;
  const canRejectUsers = () => userRole ? hasPermission(userRole, 'reject_users') : false;
  const canViewUserRequests = () => userRole ? hasPermission(userRole, 'view_user_requests') : false;
  
  const canApproveOrganizations = () => userRole ? hasPermission(userRole, 'approve_organizations') : false;
  const canRejectOrganizations = () => userRole ? hasPermission(userRole, 'reject_organizations') : false;
  const canViewOrganizationRequests = () => userRole ? hasPermission(userRole, 'view_organization_requests') : false;
  
  const canApproveDocuments = () => userRole ? hasPermission(userRole, 'approve_documents') : false;
  const canRejectDocuments = () => userRole ? hasPermission(userRole, 'reject_documents') : false;

  return {
    // Basic permission checks
    hasPermission: (permission: FeaturePermission) => 
      userRole ? hasPermission(userRole, permission) : false,

    // Get all permissions for the current user
    getUserPermissions: () => 
      userRole ? getRolePermissions(userRole) : [],

    // Check if user can access a feature requiring multiple permissions
    canAccessFeature: (requiredPermissions: FeaturePermission[]) =>
      userRole ? canAccessFeature(userRole, requiredPermissions) : false,

    // User approval permissions
    canApproveUsers,
    canRejectUsers,
    canViewUserRequests,

    // Organization approval permissions
    canApproveOrganizations,
    canRejectOrganizations,
    canViewOrganizationRequests,

    // Document approval permissions
    canApproveDocuments,
    canRejectDocuments,

    // Get the user's current role
    userRole,
  };
} 