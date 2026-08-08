import AsyncStorage from '@react-native-async-storage/async-storage';
import { collegePortalApi } from './collegePortalApi';
import { regionalCentreApi } from './regionalCentreApi';
import type { CourseRequest } from '../types/collegePortal';
import type { StudentRecord } from '../types/student';
import type { TrainingRegistration } from '../types/training';

const TRAINING_KEY = 'task.trainingRegistrations.v1';
const REQUESTS_KEY = 'task.courseRequests.v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 250): Promise<void> {
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

/** Ensure demo college has an approved batch for this student's branch + year. */
async function ensureDemoSessionForStudent(student: StudentRecord): Promise<void> {
  const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
  const hasMatch = requests.some(
    (r) =>
      r.enrollmentId === student.enrollmentId &&
      r.status === 'approved' &&
      r.branch === student.branch &&
      r.yearOfGraduation === student.yearOfGraduation,
  );
  if (hasMatch) return;

  const courses = await collegePortalApi.listCourses();
  const course =
    courses.find((c) => c.graduationYears.includes(student.yearOfGraduation)) ?? courses[0];
  if (!course) return;

  const today = new Date();
  const iso = (offsetDays: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };

  const seeded: CourseRequest = {
    id: uid('req'),
    enrollmentId: student.enrollmentId,
    collegeName: student.collegeName,
    courseId: course.id,
    courseName: course.title,
    category: course.category,
    yearOfGraduation: student.yearOfGraduation,
    branch: student.branch,
    startDate: iso(7),
    endDate: iso(12),
    batchSize: 50,
    status: 'approved',
    requestedOn: new Date().toISOString(),
    reviewedAt: new Date().toISOString(),
    adminRemark: `Demo batch for ${student.branch} · ${student.yearOfGraduation}`,
  };

  await writeJson(REQUESTS_KEY, [seeded, ...requests]);
}

function isEligibleForSession(student: StudentRecord, session: CourseRequest): boolean {
  if (session.status !== 'approved') return false;
  if (session.requesterType === 'regional_center') return false;
  return (
    session.enrollmentId === student.enrollmentId &&
    session.branch === student.branch &&
    session.yearOfGraduation === student.yearOfGraduation
  );
}

function isEligibleForRcSession(
  student: StudentRecord,
  session: CourseRequest,
  regionalCenterId: string,
): boolean {
  if (session.status !== 'approved') return false;
  if (session.requesterType !== 'regional_center') return false;
  if (session.regionalCenterId !== regionalCenterId) return false;
  const openBranch = session.branch === 'All RC members' || session.branch === 'All';
  const openYear = session.yearOfGraduation === 'All';
  if (!openBranch && session.branch !== student.branch) return false;
  if (!openYear && session.yearOfGraduation !== student.yearOfGraduation) return false;
  return true;
}

export const trainingApi = {
  async listAvailableSessions(student: StudentRecord): Promise<CourseRequest[]> {
    await delay();
    await ensureDemoSessionForStudent(student);
    const sessions = await collegePortalApi.listCalendarEvents(student.enrollmentId);

    // Strict: only batches requested for this student's department + graduation year
    return sessions
      .filter((s) => isEligibleForSession(student, s))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async listAvailableRcSessions(student: StudentRecord): Promise<CourseRequest[]> {
    await delay();
    const membership = await regionalCentreApi.getActiveMembership(student.id);
    if (!membership) return [];
    const sessions = await collegePortalApi.listRcCalendarEvents(membership.regionalCenterId);
    return sessions
      .filter((s) => isEligibleForRcSession(student, s, membership.regionalCenterId))
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async listRegistrations(studentId: string): Promise<TrainingRegistration[]> {
    await delay();
    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    return items
      .filter((r) => r.studentId === studentId)
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  },

  async getRegistrationCount(courseRequestId: string): Promise<number> {
    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    return items.filter(
      (r) => r.courseRequestId === courseRequestId && r.status === 'registered',
    ).length;
  },

  async registerForSession(
    student: StudentRecord,
    session: CourseRequest,
  ): Promise<TrainingRegistration> {
    await delay(400);
    if (session.status !== 'approved') {
      throw new Error('This training session is not open for registration.');
    }

    if (session.requesterType === 'regional_center') {
      const membership = await regionalCentreApi.getActiveMembership(student.id);
      if (!membership || membership.regionalCenterId !== session.regionalCenterId) {
        throw new Error('Join this Regional Centre first to register for RC sessions.');
      }
      if (!isEligibleForRcSession(student, session, membership.regionalCenterId)) {
        throw new Error('This RC batch is not open for your branch or graduation year.');
      }
    } else {
      if (session.enrollmentId !== student.enrollmentId) {
        throw new Error('You can only register for sessions at your TASK-registered college.');
      }
      if (session.branch !== student.branch) {
        throw new Error(
          `This batch is only for ${session.branch} students. Your branch is ${student.branch}.`,
        );
      }
      if (session.yearOfGraduation !== student.yearOfGraduation) {
        throw new Error(
          `This batch is only for graduation year ${session.yearOfGraduation}. Yours is ${student.yearOfGraduation}.`,
        );
      }
    }

    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const already = items.find(
      (r) =>
        r.studentId === student.id &&
        r.courseRequestId === session.id &&
        r.status === 'registered',
    );
    if (already) throw new Error('You are already registered for this training session.');

    const seated = items.filter(
      (r) => r.courseRequestId === session.id && r.status === 'registered',
    ).length;
    if (seated >= session.batchSize) {
      throw new Error('This batch is full. Please choose another session.');
    }

    const record: TrainingRegistration = {
      id: uid('trn'),
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      studentEmail: student.email,
      courseRequestId: session.id,
      courseName: session.courseName,
      category: session.category,
      collegeName: session.collegeName,
      enrollmentId: session.enrollmentId || session.regionalCenterId || '',
      requesterType: session.requesterType || 'college',
      branch: session.branch,
      yearOfGraduation: session.yearOfGraduation,
      startDate: session.startDate,
      endDate: session.endDate,
      status: 'registered',
      registeredAt: new Date().toISOString(),
    };

    items.unshift(record);
    await writeJson(TRAINING_KEY, items);
    return record;
  },

  async cancelRegistration(studentId: string, registrationId: string): Promise<void> {
    await delay(300);
    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const index = items.findIndex(
      (r) => r.id === registrationId && r.studentId === studentId,
    );
    if (index < 0) throw new Error('Registration not found.');
    items[index] = { ...items[index], status: 'cancelled' };
    await writeJson(TRAINING_KEY, items);
  },

  async listRegistrationsForSession(courseRequestId: string): Promise<TrainingRegistration[]> {
    await delay();
    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    return items
      .filter(
        (r) =>
          r.courseRequestId === courseRequestId &&
          (r.status === 'registered' || r.status === 'completed'),
      )
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  },

  async markRegistrationCompleted(courseRequestId: string, studentId: string): Promise<void> {
    const items = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const index = items.findIndex(
      (r) =>
        r.courseRequestId === courseRequestId &&
        r.studentId === studentId &&
        r.status === 'registered',
    );
    if (index < 0) return;
    items[index] = { ...items[index], status: 'completed' };
    await writeJson(TRAINING_KEY, items);
  },
};
