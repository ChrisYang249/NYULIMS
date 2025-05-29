import { useAuthStore } from '../store/authStore';
import { 
  canAccessRoute, 
  canPerformAction, 
  actionPermissions,
  USER_ROLES
} from '../config/rolePermissions';

/**
 * Custom hook for checking user permissions
 * 
 * Usage:
 * const { canAccess, canPerform, userRole } = usePermissions();
 * 
 * if (canAccess('/samples/accessioning')) {
 *   // Show accessioning link
 * }
 * 
 * if (canPerform('failSamples')) {
 *   // Show fail sample button
 * }
 */
export const usePermissions = () => {
  const { user } = useAuthStore();
  const userRole = user?.role;

  return {
    userRole,
    canAccess: (path: string) => canAccessRoute(userRole, path),
    canPerform: (action: keyof typeof actionPermissions) => canPerformAction(userRole, action),
    
    // Convenience methods
    isLabPersonnel: () => userRole && ['lab_tech', 'lab_manager', 'director', 'super_admin'].includes(userRole),
    isManagement: () => userRole && ['lab_manager', 'director', 'super_admin', 'pm'].includes(userRole),
    isAdmin: () => userRole && ['super_admin', 'director'].includes(userRole),
    isSuperAdmin: () => userRole === 'super_admin',
  };
};