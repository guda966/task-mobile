import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StudentRecord } from '../types/student';
import type {
  AudienceScope,
  TaskAnnouncement,
  TaskProgramEnrollment,
  TaskProgramSession,
} from '../types/taskBroadcast';
import { audienceScopeLabel } from '../types/taskBroadcast';
import { studentNotificationApi } from './studentNotificationApi';

const ANNOUNCEMENTS_KEY = 'task.adminAnnouncements.v1';
const SESSIONS_KEY = 'task.adminProgramSessions.v1';
const ENROLLMENTS_KEY = 'task.adminProgramEnrollments.v1';
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

function validateScope(scope: AudienceScope): void {
  if (scope.kind === 'district' && !scope.district?.trim()) {
    throw new Error('Select a district.');
  }
  if (scope.kind === 'university' && !scope.university?.trim()) {
    throw new Error('Select an affiliated university.');
  }
  if (scope.kind === 'college' && !scope.enrollmentId?.trim()) {
    throw new Error('Select a college.');
  }
}

async function matchingStudents(scope: AudienceScope): Promise<StudentRecord[]> {
  validateScope(scope);
  const students = await readJson<StudentRecord[]>(STUDENTS_KEY, []);
  const active = students.filter((s) => s.status === 'Active');
  if (scope.kind === 'state') return active;
  if (scope.kind === 'district') {
    return active.filter((s) => s.district === scope.district);
  }
  if (scope.kind === 'university') {
    return active.filter((s) => s.affiliatedUniversity === scope.university);
  }
  return active.filter((s) => s.enrollmentId === scope.enrollmentId);
}

async function notifyStudents(
  students: StudentRecord[],
  input: {
    title: string;
    body: string;
    relatedProgramSessionId?: string;
  },
): Promise<number> {
  for (const s of students) {
    await studentNotificationApi.notify({
      studentId: s.id,
      source: 'task',
      title: input.title,
      body: input.body,
      relatedProgramSessionId: input.relatedProgramSessionId,
    });
  }
  return students.length;
}

export const taskBroadcastApi = {
  async previewAudienceCount(scope: AudienceScope): Promise<number> {
    await delay(120);
    return (await matchingStudents(scope)).length;
  },

  async listAnnouncements(): Promise<TaskAnnouncement[]> {
    await delay();
    const items = await readJson<TaskAnnouncement[]>(ANNOUNCEMENTS_KEY, []);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listProgramSessions(): Promise<TaskProgramSession[]> {
    await delay();
    const items = await readJson<TaskProgramSession[]>(SESSIONS_KEY, []);
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getProgramSession(id: string): Promise<TaskProgramSession | null> {
    const items = await this.listProgramSessions();
    return items.find((s) => s.id === id) ?? null;
  },

  async postAnnouncement(input: {
    title: string;
    body: string;
    scope: AudienceScope;
    createdBy: string;
  }): Promise<TaskAnnouncement> {
    await delay(400);
    if (!input.title.trim()) throw new Error('Announcement title is required.');
    if (!input.body.trim()) throw new Error('Announcement message is required.');
    validateScope(input.scope);

    const targets = await matchingStudents(input.scope);
    const scope: AudienceScope = {
      ...input.scope,
      label: audienceScopeLabel(input.scope),
    };
    const record: TaskAnnouncement = {
      id: uid('tann'),
      kind: 'announcement',
      title: input.title.trim(),
      body: input.body.trim(),
      scope,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      notifiedCount: 0,
    };

    const notified = await notifyStudents(targets, {
      title: `TASK announcement: ${record.title}`,
      body: `${record.body}\n\nAudience: ${scope.label}`,
    });
    record.notifiedCount = notified;

    const items = await readJson<TaskAnnouncement[]>(ANNOUNCEMENTS_KEY, []);
    items.unshift(record);
    await writeJson(ANNOUNCEMENTS_KEY, items);
    return record;
  },

  async scheduleSession(input: {
    title: string;
    description: string;
    mode: 'online' | 'offline';
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
    venueOrLink: string;
    instructorName?: string;
    maxSeats?: number;
    scope: AudienceScope;
    createdBy: string;
  }): Promise<TaskProgramSession> {
    await delay(450);
    if (!input.title.trim()) throw new Error('Session title is required.');
    if (!input.description.trim()) throw new Error('Session details are required.');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(input.endDate)) {
      throw new Error('Use start/end dates as YYYY-MM-DD.');
    }
    if (input.endDate < input.startDate) {
      throw new Error('End date cannot be before start date.');
    }
    if (input.mode === 'online' && !input.venueOrLink.trim()) {
      throw new Error('Meeting / join link is required for online sessions.');
    }
    validateScope(input.scope);

    const targets = await matchingStudents(input.scope);
    const scope: AudienceScope = {
      ...input.scope,
      label: audienceScopeLabel(input.scope),
    };
    const record: TaskProgramSession = {
      id: uid('tps'),
      kind: 'session',
      title: input.title.trim(),
      description: input.description.trim(),
      mode: input.mode,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime.trim() || '10:00',
      endTime: input.endTime.trim() || '13:00',
      venueOrLink: input.venueOrLink.trim(),
      instructorName: input.instructorName?.trim() || undefined,
      maxSeats: input.maxSeats && input.maxSeats > 0 ? input.maxSeats : undefined,
      scope,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      notifiedCount: 0,
      status: 'open',
    };

    const modeLabel = record.mode === 'online' ? 'Online' : 'Offline';
    const when = `${record.startDate} ${record.startTime} → ${record.endDate} ${record.endTime}`;
    const place = record.venueOrLink
      ? record.mode === 'online'
        ? `Join link: ${record.venueOrLink}`
        : `Venue: ${record.venueOrLink}`
      : 'Venue: to be confirmed';

    const notified = await notifyStudents(targets, {
      title: `TASK session scheduled: ${record.title}`,
      body: `${modeLabel} · ${when}\n${place}\n\n${record.description}\n\nAudience: ${scope.label}\nOpen Trainings → TASK sessions to enrol.`,
      relatedProgramSessionId: record.id,
    });
    record.notifiedCount = notified;

    const items = await readJson<TaskProgramSession[]>(SESSIONS_KEY, []);
    items.unshift(record);
    await writeJson(SESSIONS_KEY, items);
    return record;
  },

  async getEnrollmentCount(sessionId: string): Promise<number> {
    const items = await readJson<TaskProgramEnrollment[]>(ENROLLMENTS_KEY, []);
    return items.filter((e) => e.sessionId === sessionId && e.status === 'registered').length;
  },

  async listEnrollments(sessionId: string): Promise<TaskProgramEnrollment[]> {
    await delay();
    const items = await readJson<TaskProgramEnrollment[]>(ENROLLMENTS_KEY, []);
    return items
      .filter((e) => e.sessionId === sessionId && e.status === 'registered')
      .sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
  },

  async listSessionsForStudent(student: StudentRecord): Promise<{
    available: TaskProgramSession[];
    enrolled: TaskProgramSession[];
  }> {
    await delay();
    const sessions = (await this.listProgramSessions()).filter((s) => s.status === 'open');
    const enrollments = await readJson<TaskProgramEnrollment[]>(ENROLLMENTS_KEY, []);
    const mySessionIds = new Set(
      enrollments
        .filter((e) => e.studentId === student.id && e.status === 'registered')
        .map((e) => e.sessionId),
    );

    const matchesScope = (s: TaskProgramSession) => {
      const sc = s.scope;
      if (sc.kind === 'state') return true;
      if (sc.kind === 'district') return student.district === sc.district;
      if (sc.kind === 'university') return student.affiliatedUniversity === sc.university;
      return student.enrollmentId === sc.enrollmentId;
    };

    const enrolled = sessions.filter((s) => mySessionIds.has(s.id));
    const available = sessions.filter((s) => matchesScope(s) && !mySessionIds.has(s.id));
    return { available, enrolled };
  },

  async enrollStudent(input: {
    sessionId: string;
    studentId: string;
    studentName: string;
    collegeName: string;
  }): Promise<TaskProgramEnrollment> {
    await delay(350);
    const session = await this.getProgramSession(input.sessionId);
    if (!session || session.status !== 'open') {
      throw new Error('This session is not open for enrolment.');
    }
    const items = await readJson<TaskProgramEnrollment[]>(ENROLLMENTS_KEY, []);
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
    const entry: TaskProgramEnrollment = {
      id: uid('tpe'),
      sessionId: input.sessionId,
      studentId: input.studentId,
      studentName: input.studentName,
      collegeName: input.collegeName,
      enrolledAt: new Date().toISOString(),
      status: 'registered',
    };
    items.unshift(entry);
    await writeJson(ENROLLMENTS_KEY, items);
    return entry;
  },

  async closeSession(sessionId: string): Promise<void> {
    const items = await readJson<TaskProgramSession[]>(SESSIONS_KEY, []);
    const index = items.findIndex((s) => s.id === sessionId);
    if (index < 0) throw new Error('Session not found.');
    items[index] = { ...items[index], status: 'closed' };
    await writeJson(SESSIONS_KEY, items);
  },
};
