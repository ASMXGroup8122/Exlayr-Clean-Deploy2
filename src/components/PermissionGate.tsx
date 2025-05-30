'use client';

import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { FeaturePermission } from '@/lib/permissions';

interface PermissionGateProps {
  children: ReactNode;
  permissions: FeaturePermission[];
  fallback?: ReactNode;
}

export function PermissionGate({ 
  children, 
  permissions, 
  fallback = null 
}: PermissionGateProps) {
  const { canAccessFeature } = usePermissions();

  if (!canAccessFeature(permissions)) {
    return fallback;
  }

  return <>{children}</>;
}

// Higher-order component for route protection
export function withPermissions(
  WrappedComponent: React.ComponentType<any>,
  requiredPermissions: FeaturePermission[]
) {
  return function PermissionWrapper(props: any) {
    return (
      <PermissionGate 
        permissions={requiredPermissions}
        fallback={<div className="p-4 text-red-600">Access Denied</div>}
      >
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
} 
