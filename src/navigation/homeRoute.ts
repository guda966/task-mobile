import type { RootStackParamList } from './types';

export type AppHomeRoute = keyof RootStackParamList;

export function homeRouteForRole(role: string): AppHomeRoute {
  if (role === 'super_admin') return 'SuperAdminHome';
  if (role === 'task_admin') return 'TaskAdminHome';
  if (role === 'placement_coordinator') return 'PlacementCoordinatorHome';
  if (role === 'student') return 'StudentHome';
  if (role === 'trainer') return 'TrainerHome';
  if (role === 'corporate') return 'CorporateHome';
  return 'CollegeHome';
}
