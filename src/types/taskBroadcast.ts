/** Audience targeting for TASK Admin announcements and statewide sessions. */
export type AudienceScopeKind = 'state' | 'district' | 'university' | 'college';

export interface AudienceScope {
  kind: AudienceScopeKind;
  /** Required when kind is district */
  district?: string;
  /** Required when kind is university */
  university?: string;
  /** Required when kind is college — CollegeEnrollment.id */
  enrollmentId?: string;
  /** Display label cached at publish time */
  label: string;
}

export type TaskProgramMode = 'online' | 'offline';

export interface TaskAnnouncement {
  id: string;
  kind: 'announcement';
  title: string;
  body: string;
  scope: AudienceScope;
  createdAt: string;
  createdBy: string;
  /** How many Active students were notified */
  notifiedCount: number;
}

export interface TaskProgramSession {
  id: string;
  kind: 'session';
  title: string;
  description: string;
  mode: TaskProgramMode;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  /** Meeting link (online) or venue address (offline) */
  venueOrLink: string;
  instructorName?: string;
  maxSeats?: number;
  scope: AudienceScope;
  createdAt: string;
  createdBy: string;
  notifiedCount: number;
  status: 'open' | 'closed';
}

export interface TaskProgramEnrollment {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  enrolledAt: string;
  status: 'registered' | 'cancelled';
}

export type TaskBroadcast = TaskAnnouncement | TaskProgramSession;

export function audienceScopeLabel(scope: AudienceScope): string {
  if (scope.kind === 'state') return 'Entire Telangana (all registered students)';
  if (scope.kind === 'district') return `District · ${scope.district || '—'}`;
  if (scope.kind === 'university') return `University · ${scope.university || '—'}`;
  return `College · ${scope.label.replace(/^College · /, '')}`;
}
