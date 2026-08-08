import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  RC_MEMBERSHIP_FEE,
  RC_MEMBERSHIP_MONTHS,
  REGIONAL_CENTERS,
  type RegionalCenter,
} from '../constants/lookups';
import type { SessionUser } from '../types/enrollment';
import type {
  RcMembership,
  RcSession,
  RcSessionEnrollment,
} from '../types/regionalCentre';
import { addMonthsIso, isMembershipActive } from '../types/regionalCentre';
import type { StudentRecord } from '../types/student';
import { studentNotificationApi } from './studentNotificationApi';

const MEMBERSHIPS_KEY = 'task.rcMemberships.v1';
const SESSIONS_KEY = 'task.rcSessions.v1';
const SESSION_ENROLL_KEY = 'task.rcSessionEnrollments.v1';
const STUDENTS_KEY = 'task.studentRegistrations.v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function refreshMembershipStatus(m: RcMembership): RcMembership {
  if (m.status === 'active' && !isMembershipActive(m)) {
    return { ...m, status: 'expired' };
  }
  return m;
}

export const regionalCentreApi = {
  listCenters(): RegionalCenter[] {
    return [...REGIONAL_CENTERS];
  },

  getCenter(id: string): RegionalCenter | undefined {
    return REGIONAL_CENTERS.find((c) => c.id === id);
  },

  async signIn(email: string, password: string): Promise<SessionUser | null> {
    await delay(200);
    const normalized = email.trim().toLowerCase();
    const center = REGIONAL_CENTERS.find((c) => c.email === normalized);
    if (!center || center.password !== password) return null;
    return {
      role: 'regional_center',
      email: center.email,
      name: center.name,
      regionalCenterId: center.id,
    };
  },

  async getActiveMembership(studentId: string): Promise<RcMembership | null> {
    const items = (await readJson<RcMembership[]>(MEMBERSHIPS_KEY, [])).map(
      refreshMembershipStatus,
    );
    await writeJson(MEMBERSHIPS_KEY, items);
    return (
      items.find((m) => m.studentId === studentId && isMembershipActive(m)) ?? null
    );
  },

  async listMembershipsForCenter(regionalCenterId: string): Promise<RcMembership[]> {
    await delay();
    const items = (await readJson<RcMembership[]>(MEMBERSHIPS_KEY, [])).map(
      refreshMembershipStatus,
    );
    await writeJson(MEMBERSHIPS_KEY, items);
    return items
      .filter((m) => m.regionalCenterId === regionalCenterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async registerStudentForCenter(input: {
    student: StudentRecord;
    regionalCenterId: string;
  }): Promise<RcMembership> {
    await delay(400);
    const center = this.getCenter(input.regionalCenterId);
    if (!center) throw new Error('Select a valid Regional Centre.');

    const existing = await this.getActiveMembership(input.student.id);
    if (existing) {
      throw new Error(
        `You already have an active RC membership at ${existing.regionalCenterName} until ${new Date(existing.expiresAt).toLocaleDateString('en-IN')}.`,
      );
    }

    const now = new Date().toISOString();
    const record: RcMembership = {
      id: uid('rcm'),
      studentId: input.student.id,
      studentName: `${input.student.firstName} ${input.student.lastName}`,
      studentEmail: input.student.email,
      collegeName: input.student.collegeName,
      regionalCenterId: center.id,
      regionalCenterName: center.name,
      feePaid: RC_MEMBERSHIP_FEE,
      startedAt: now,
      expiresAt: addMonthsIso(now, RC_MEMBERSHIP_MONTHS),
      status: 'active',
      createdAt: now,
    };

    const items = await readJson<RcMembership[]>(MEMBERSHIPS_KEY, []);
    items.unshift(record);
    await writeJson(MEMBERSHIPS_KEY, items);

    await studentNotificationApi.notify({
      studentId: input.student.id,
      source: 'task',
      title: `RC membership activated: ${center.name}`,
      body: `Fee ₹${RC_MEMBERSHIP_FEE} paid. Valid for ${RC_MEMBERSHIP_MONTHS} months (until ${new Date(record.expiresAt).toLocaleDateString('en-IN')}). You can now enrol in RC sessions.`,
    });

    return record;
  },

  async listSessionsForCenter(regionalCenterId: string): Promise<RcSession[]> {
    await delay();
    const items = await readJson<RcSession[]>(SESSIONS_KEY, []);
    return items
      .filter((s) => s.regionalCenterId === regionalCenterId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listOpenSessionsForStudent(studentId: string): Promise<{
    membership: RcMembership | null;
    sessions: RcSession[];
    enrolledIds: string[];
  }> {
    await delay();
    const membership = await this.getActiveMembership(studentId);
    if (!membership) {
      return { membership: null, sessions: [], enrolledIds: [] };
    }
    const sessions = (await this.listSessionsForCenter(membership.regionalCenterId)).filter(
      (s) => s.status === 'open',
    );
    const enrollments = await readJson<RcSessionEnrollment[]>(SESSION_ENROLL_KEY, []);
    const enrolledIds = enrollments
      .filter((e) => e.studentId === studentId && e.status === 'registered')
      .map((e) => e.sessionId);
    return { membership, sessions, enrolledIds };
  },

  async createSession(input: {
    regionalCenterId: string;
    title: string;
    description: string;
    mode: 'online' | 'offline';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venueOrLink: string;
    maxSeats?: number;
    createdBy: string;
  }): Promise<RcSession> {
    await delay(400);
    if (!input.title.trim()) throw new Error('Session title is required.');
    if (!input.description.trim()) throw new Error('Session details are required.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
      throw new Error('Use dates as YYYY-MM-DD.');
    }
    if (input.endDate < input.startDate) throw new Error('End date cannot be before start date.');
    if (input.mode === 'online' && !input.venueOrLink.trim()) {
      throw new Error('Meeting / join link is required for online sessions.');
    }

    const center = this.getCenter(input.regionalCenterId);
    if (!center) throw new Error('Regional Centre not found.');

    const record: RcSession = {
      id: uid('rcs'),
      regionalCenterId: input.regionalCenterId,
      title: input.title.trim(),
      description: input.description.trim(),
      mode: input.mode,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime.trim() || '10:00',
      endTime: input.endTime.trim() || '13:00',
      venueOrLink: input.venueOrLink.trim(),
      maxSeats: input.maxSeats && input.maxSeats > 0 ? input.maxSeats : undefined,
      status: 'open',
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
    };

    const items = await readJson<RcSession[]>(SESSIONS_KEY, []);
    items.unshift(record);
    await writeJson(SESSIONS_KEY, items);

    const members = await this.listMembershipsForCenter(input.regionalCenterId);
    const active = members.filter((m) => isMembershipActive(m));
    for (const m of active) {
      await studentNotificationApi.notify({
        studentId: m.studentId,
        source: 'task',
        title: `RC session: ${record.title}`,
        body: `${record.mode === 'online' ? 'Online' : 'Offline'} · ${record.startDate} ${record.startTime}\nOpen Trainings → RC sessions to enrol.`,
      });
    }

    return record;
  },

  async closeSession(sessionId: string): Promise<void> {
    const items = await readJson<RcSession[]>(SESSIONS_KEY, []);
    const index = items.findIndex((s) => s.id === sessionId);
    if (index < 0) throw new Error('Session not found.');
    items[index] = { ...items[index], status: 'closed' };
    await writeJson(SESSIONS_KEY, items);
  },

  async getSessionEnrollmentCount(sessionId: string): Promise<number> {
    const items = await readJson<RcSessionEnrollment[]>(SESSION_ENROLL_KEY, []);
    return items.filter((e) => e.sessionId === sessionId && e.status === 'registered').length;
  },

  async enrollStudentInSession(input: {
    sessionId: string;
    studentId: string;
    studentName: string;
  }): Promise<RcSessionEnrollment> {
    await delay(350);
    const membership = await this.getActiveMembership(input.studentId);
    if (!membership) {
      throw new Error('Active RC membership (₹599 / 6 months) is required.');
    }
    const sessions = await readJson<RcSession[]>(SESSIONS_KEY, []);
    const session = sessions.find((s) => s.id === input.sessionId);
    if (!session || session.status !== 'open') {
      throw new Error('This RC session is not open for enrolment.');
    }
    if (session.regionalCenterId !== membership.regionalCenterId) {
      throw new Error('This session belongs to a different Regional Centre.');
    }

    const items = await readJson<RcSessionEnrollment[]>(SESSION_ENROLL_KEY, []);
    if (
      items.some(
        (e) =>
          e.sessionId === input.sessionId &&
          e.studentId === input.studentId &&
          e.status === 'registered',
      )
    ) {
      throw new Error('You are already enrolled in this session.');
    }
    const count = items.filter(
      (e) => e.sessionId === input.sessionId && e.status === 'registered',
    ).length;
    if (session.maxSeats && count >= session.maxSeats) {
      throw new Error('This session is full.');
    }

    const entry: RcSessionEnrollment = {
      id: uid('rce'),
      sessionId: input.sessionId,
      studentId: input.studentId,
      studentName: input.studentName,
      enrolledAt: new Date().toISOString(),
      status: 'registered',
    };
    items.unshift(entry);
    await writeJson(SESSION_ENROLL_KEY, items);
    return entry;
  },

  /** Used by seed / diagnostics */
  async _writeSeed(data: {
    memberships: RcMembership[];
    sessions: RcSession[];
    enrollments?: RcSessionEnrollment[];
  }): Promise<void> {
    await writeJson(MEMBERSHIPS_KEY, data.memberships);
    await writeJson(SESSIONS_KEY, data.sessions);
    await writeJson(SESSION_ENROLL_KEY, data.enrollments ?? []);
  },

  async _readStudents(): Promise<StudentRecord[]> {
    return readJson(STUDENTS_KEY, []);
  },
};
