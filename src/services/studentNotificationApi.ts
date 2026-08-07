import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StudentNotification, StudentAlertSource } from '../types/studentNotification';
import type { SessionAssignment } from '../types/sessionContent';
import type { TrainingRegistration } from '../types/training';

const KEY = 'task.studentNotifications.v1';
const ASSIGNMENTS_KEY = 'task.sessionAssignments.v1';
const TRAINING_KEY = 'task.trainingRegistrations.v1';
const SUBMISSIONS_KEY = 'task.assignmentSubmissions.v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function daysUntil(dateStr: string): number {
  const due = new Date(`${dateStr}T23:59:59`);
  const now = new Date();
  const ms = due.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export const studentNotificationApi = {
  async listForStudent(studentId: string): Promise<StudentNotification[]> {
    const all = await readJson<StudentNotification[]>(KEY, []);
    return all
      .filter((n) => n.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async unreadCount(studentId: string): Promise<number> {
    const items = await this.listForStudent(studentId);
    return items.filter((n) => !n.read).length;
  },

  async notify(input: {
    studentId: string;
    source: StudentAlertSource;
    title: string;
    body: string;
    relatedRequestId?: string;
    relatedAssignmentId?: string;
    /** Stable id so deadline alerts are not duplicated on each refresh */
    id?: string;
  }): Promise<StudentNotification> {
    const all = await readJson<StudentNotification[]>(KEY, []);
    if (input.id) {
      const existing = all.find((n) => n.id === input.id);
      if (existing) return existing;
    }
    const note: StudentNotification = {
      id: input.id || uid('sntf'),
      studentId: input.studentId,
      source: input.source,
      title: input.title,
      body: input.body,
      createdAt: new Date().toISOString(),
      read: false,
      relatedRequestId: input.relatedRequestId,
      relatedAssignmentId: input.relatedAssignmentId,
    };
    all.unshift(note);
    await writeJson(KEY, all);
    return note;
  },

  async markAllRead(studentId: string): Promise<void> {
    const all = await readJson<StudentNotification[]>(KEY, []);
    await writeJson(
      KEY,
      all.map((n) => (n.studentId === studentId ? { ...n, read: true } : n)),
    );
  },

  /**
   * Creates deadline alerts for upcoming / overdue assignments
   * the student has not finished (accepted).
   */
  async refreshDeadlineAlerts(studentId: string): Promise<void> {
    const regs = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const activeRequestIds = new Set(
      regs
        .filter((r) => r.studentId === studentId && r.status === 'registered')
        .map((r) => r.courseRequestId),
    );
    const assignments = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const submissions = await readJson<{ assignmentId: string; studentId: string; status: string }[]>(
      SUBMISSIONS_KEY,
      [],
    );
    const mine = assignments.filter((a) => activeRequestIds.has(a.requestId) && a.dueDate);

    for (const assignment of mine) {
      const sub = submissions.find(
        (s) => s.assignmentId === assignment.id && s.studentId === studentId,
      );
      if (sub?.status === 'accepted') continue;

      const left = daysUntil(assignment.dueDate!);
      if (left > 7) continue;

      let title: string;
      let body: string;
      if (left < 0) {
        title = 'Assignment overdue';
        body = `"${assignment.title}" was due on ${assignment.dueDate}. Submit or resubmit as soon as possible.`;
      } else if (left === 0) {
        title = 'Assignment due today';
        body = `"${assignment.title}" is due today (${assignment.dueDate}). Open the session and submit your work.`;
      } else {
        title = `Assignment due in ${left} day${left === 1 ? '' : 's'}`;
        body = `"${assignment.title}" is due on ${assignment.dueDate}. Complete it before the deadline.`;
      }

      await this.notify({
        id: `sntf_deadline_${studentId}_${assignment.id}_${assignment.dueDate}`,
        studentId,
        source: 'deadline',
        title,
        body,
        relatedRequestId: assignment.requestId,
        relatedAssignmentId: assignment.id,
      });
    }
  },
};

export function studentAlertSourceLabel(source: StudentAlertSource): string {
  switch (source) {
    case 'task':
      return 'TASK';
    case 'college':
      return 'College';
    case 'deadline':
      return 'Deadline';
    default:
      return 'Alert';
  }
}
