import type { UserRole } from './enrollment';

/** Roles Super Admin can provision (not public self-register). */
export type ManagedAdminRole = 'task_admin' | 'placement_coordinator';

export type AdminUserStatus = 'active' | 'inactive';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: ManagedAdminRole | 'super_admin';
  passwordHash: string;
  status: AdminUserStatus;
  /** Optional district scope for placement coordinators (empty = all Telangana). */
  districtScope?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface AdminUserDraft {
  name: string;
  email: string;
  mobile: string;
  role: ManagedAdminRole;
  password: string;
  confirmPassword: string;
  districtScope?: string;
}

export const MANAGED_ADMIN_ROLE_OPTIONS: { value: ManagedAdminRole; label: string; hint: string }[] =
  [
    {
      value: 'task_admin',
      label: 'TASK Admin',
      hint: 'College approvals, courses, trainers, and session operations',
    },
    {
      value: 'placement_coordinator',
      label: 'Placement Coordinator',
      hint: 'College & student placement views for assigned district or statewide',
    },
  ];

export function adminRoleLabel(role: UserRole | AdminUser['role']): string {
  if (role === 'super_admin') return 'Super Admin';
  if (role === 'task_admin') return 'TASK Admin';
  if (role === 'placement_coordinator') return 'Placement Coordinator';
  return role.replace(/_/g, ' ');
}
