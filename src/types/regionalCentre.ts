export type RcMembershipStatus = 'active' | 'expired';

export interface RcMembership {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  collegeName: string;
  regionalCenterId: string;
  regionalCenterName: string;
  feePaid: number;
  startedAt: string;
  expiresAt: string;
  status: RcMembershipStatus;
  createdAt: string;
}

export type RcSessionMode = 'online' | 'offline';

export interface RcSession {
  id: string;
  regionalCenterId: string;
  title: string;
  description: string;
  mode: RcSessionMode;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venueOrLink: string;
  maxSeats?: number;
  status: 'open' | 'closed';
  createdAt: string;
  createdBy: string;
}

export interface RcSessionEnrollment {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  enrolledAt: string;
  status: 'registered' | 'cancelled';
}

export function addMonthsIso(isoDate: string, months: number): string {
  const d = new Date(isoDate);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function isMembershipActive(m: RcMembership, now = new Date()): boolean {
  if (m.status !== 'active') return false;
  return new Date(m.expiresAt).getTime() >= now.getTime();
}
