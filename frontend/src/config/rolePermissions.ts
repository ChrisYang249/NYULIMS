// Role-based permissions configuration
// This file centralizes all role permissions for easy management

// Define user roles as a const array for runtime access
export const USER_ROLES = ['super_admin', 'pm', 'accessioner', 'lab_tech', 'lab_manager', 'director', 'sales'] as const;

// Create type from the const array
export type UserRole = typeof USER_ROLES[number];

export interface RoutePermission {
  path: string;
  allowedRoles: UserRole[];
  label?: string;
}

// Define which roles can access which routes
// TODO: Update these permissions based on your organizational structure
export const routePermissions: RoutePermission[] = [
  // Dashboard - Everyone can access
  { path: '/dashboard', allowedRoles: ['super_admin', 'pm', 'accessioner', 'lab_tech', 'lab_manager', 'director', 'sales'] },
  
  // Projects
  { path: '/projects', allowedRoles: ['super_admin', 'pm', 'lab_manager', 'director', 'sales'] },
  
  // Clients
  { path: '/clients', allowedRoles: ['super_admin', 'pm', 'director', 'sales'] },
  
  // Users/Employees
  { path: '/employees', allowedRoles: ['super_admin', 'director'] },
  
  // Samples - Main page
  { path: '/samples', allowedRoles: ['super_admin', 'pm', 'accessioner', 'lab_tech', 'lab_manager', 'director'] },
  
  // Sample Queues - TODO: Adjust these based on your workflow
  { 
    path: '/samples/accessioning', 
    allowedRoles: ['super_admin', 'pm', 'accessioner', 'lab_manager', 'director'],
    label: 'Accessioning Queue'
  },
  { 
    path: '/samples/extraction-queue', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'Extraction Queue'
  },
  { 
    path: '/samples/extraction', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'In Extraction'
  },
  { 
    path: '/samples/dna-quant-queue', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'DNA Quant Queue'
  },
  { 
    path: '/samples/library-prep-queue', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'Library Prep Queue'
  },
  { 
    path: '/samples/library-prep', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'In Library Prep'
  },
  { 
    path: '/samples/sequencing-queue', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'Sequencing Queue'
  },
  { 
    path: '/samples/sequencing', 
    allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
    label: 'In Sequencing'
  },
  { 
    path: '/samples/reprocess', 
    allowedRoles: ['super_admin', 'lab_manager', 'director'],
    label: 'Reprocess Queue'
  },
  
  // Storage
  { path: '/storage', allowedRoles: ['super_admin', 'lab_tech', 'lab_manager', 'director'] },
  
  // Sample Types
  { path: '/sample-types', allowedRoles: ['super_admin', 'lab_manager', 'director'] },
  
  // Logs
  { path: '/logs', allowedRoles: ['super_admin', 'director'] },
  { path: '/deletion-logs', allowedRoles: ['super_admin', 'director'] },
];

// Action-based permissions
// TODO: Update these based on your workflow requirements
export const actionPermissions = {
  // Sample actions
  registerSamples: ['super_admin', 'pm', 'lab_manager', 'director'],
  accessionSamples: ['super_admin', 'accessioner', 'lab_manager', 'director'],
  reviewAndRouteSamples: ['super_admin', 'pm', 'lab_manager', 'director'],
  failSamples: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
  updateSampleStatus: ['super_admin', 'lab_tech', 'lab_manager', 'director'],
  editSamples: ['super_admin', 'lab_manager', 'director'],
  deleteSamples: ['super_admin', 'director'],
  
  // Project actions
  createProjects: ['super_admin', 'pm', 'director'],
  editProjects: ['super_admin', 'pm', 'director'],
  deleteProjects: ['super_admin', 'director'],
  
  // User management
  createUsers: ['super_admin'],
  editUsers: ['super_admin'],
  deleteUsers: ['super_admin'],
  
  // Storage management
  createStorageLocations: ['super_admin', 'lab_manager', 'director'],
  editStorageLocations: ['super_admin', 'lab_manager', 'director'],
  
  // Sample type management
  createSampleTypes: ['super_admin', 'lab_manager', 'director'],
  editSampleTypes: ['super_admin', 'lab_manager', 'director'],
  
  // Deletion logs
  viewDeletionLogs: ['super_admin', 'director'],
};

// Helper functions
export const canAccessRoute = (userRole: string | undefined, path: string): boolean => {
  if (!userRole) return false;
  
  const permission = routePermissions.find(p => p.path === path);
  if (!permission) return true; // If route not defined in permissions, allow access
  
  return permission.allowedRoles.includes(userRole as UserRole);
};

export const canPerformAction = (userRole: string | undefined, action: keyof typeof actionPermissions): boolean => {
  if (!userRole) return false;
  
  const allowedRoles = actionPermissions[action];
  if (!allowedRoles) return true; // If action not defined, allow
  
  return allowedRoles.includes(userRole as UserRole);
};

// Get allowed routes for a user role
export const getAllowedRoutes = (userRole: string | undefined): string[] => {
  if (!userRole) return [];
  
  return routePermissions
    .filter(permission => permission.allowedRoles.includes(userRole as UserRole))
    .map(permission => permission.path);
};

// Get menu items based on role
export const getMenuItemsForRole = (userRole: string | undefined): string[] => {
  if (!userRole) return [];
  
  return routePermissions
    .filter(permission => permission.allowedRoles.includes(userRole as UserRole))
    .map(permission => permission.path);
};