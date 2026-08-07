import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CourseRequest } from '../types/collegePortal';
import type {
  AssignmentSubmission,
  AttendanceStatus,
  SessionAssignment,
  SessionAttendance,
  SessionCertificate,
  SessionFileRef,
  SessionMaterial,
  SubmissionStatus,
} from '../types/sessionContent';
import { trainingApi } from './trainingApi';

const MATERIALS_KEY = 'task.sessionMaterials.v1';
const ASSIGNMENTS_KEY = 'task.sessionAssignments.v1';
const ATTENDANCE_KEY = 'task.sessionAttendance.v1';
const SUBMISSIONS_KEY = 'task.assignmentSubmissions.v1';
const CERTIFICATES_KEY = 'task.sessionCertificates.v1';
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

async function getRequest(requestId: string): Promise<CourseRequest> {
  const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
  const item = items.find((r) => r.id === requestId);
  if (!item) throw new Error('Training session not found.');
  return item;
}

function assertCanManage(session: CourseRequest, trainerId: string) {
  if (session.status !== 'approved') {
    throw new Error('Only approved sessions can be managed.');
  }
  if (session.trainerId !== trainerId && session.backupTrainerId !== trainerId) {
    throw new Error('Only the assigned trainer can manage this session.');
  }
}

function certCode(courseName: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const short = courseName.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase() || 'TASK';
  return `TASK-${short}-${stamp}`;
}

export const sessionContentApi = {
  async getSession(requestId: string): Promise<CourseRequest> {
    await delay();
    return getRequest(requestId);
  },

  async listMaterials(requestId: string): Promise<SessionMaterial[]> {
    await delay();
    const items = await readJson<SessionMaterial[]>(MATERIALS_KEY, []);
    return items
      .filter((m) => m.requestId === requestId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async addMaterial(input: {
    requestId: string;
    trainerId: string;
    title: string;
    description?: string;
    file: SessionFileRef;
  }): Promise<SessionMaterial> {
    await delay(350);
    if (!input.title.trim()) throw new Error('Material title is required.');
    const session = await getRequest(input.requestId);
    assertCanManage(session, input.trainerId);

    const entry: SessionMaterial = {
      id: uid('mat'),
      requestId: input.requestId,
      trainerId: input.trainerId,
      title: input.title.trim(),
      description: input.description?.trim() || undefined,
      file: input.file,
      createdAt: new Date().toISOString(),
    };
    const items = await readJson<SessionMaterial[]>(MATERIALS_KEY, []);
    items.unshift(entry);
    await writeJson(MATERIALS_KEY, items);
    return entry;
  },

  async removeMaterial(materialId: string, trainerId: string): Promise<void> {
    await delay(200);
    const items = await readJson<SessionMaterial[]>(MATERIALS_KEY, []);
    const item = items.find((m) => m.id === materialId);
    if (!item) throw new Error('Material not found.');
    const session = await getRequest(item.requestId);
    assertCanManage(session, trainerId);
    await writeJson(
      MATERIALS_KEY,
      items.filter((m) => m.id !== materialId),
    );
  },

  async listAssignments(requestId: string): Promise<SessionAssignment[]> {
    await delay();
    const items = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    return items
      .filter((a) => a.requestId === requestId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async addAssignment(input: {
    requestId: string;
    trainerId: string;
    title: string;
    instructions: string;
    dueDate?: string;
    file?: SessionFileRef;
  }): Promise<SessionAssignment> {
    await delay(350);
    if (!input.title.trim()) throw new Error('Assignment title is required.');
    if (!input.instructions.trim()) throw new Error('Assignment instructions are required.');
    const session = await getRequest(input.requestId);
    assertCanManage(session, input.trainerId);

    const entry: SessionAssignment = {
      id: uid('asg'),
      requestId: input.requestId,
      trainerId: input.trainerId,
      title: input.title.trim(),
      instructions: input.instructions.trim(),
      dueDate: input.dueDate?.trim() || undefined,
      file: input.file,
      createdAt: new Date().toISOString(),
    };
    const items = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    items.unshift(entry);
    await writeJson(ASSIGNMENTS_KEY, items);
    return entry;
  },

  async removeAssignment(assignmentId: string, trainerId: string): Promise<void> {
    await delay(200);
    const items = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const item = items.find((a) => a.id === assignmentId);
    if (!item) throw new Error('Assignment not found.');
    const session = await getRequest(item.requestId);
    assertCanManage(session, trainerId);
    await writeJson(
      ASSIGNMENTS_KEY,
      items.filter((a) => a.id !== assignmentId),
    );
  },

  async listAttendance(requestId: string, sessionDate?: string): Promise<SessionAttendance[]> {
    await delay();
    const items = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    return items
      .filter((a) => a.requestId === requestId && (!sessionDate || a.sessionDate === sessionDate))
      .sort((a, b) => a.studentName.localeCompare(b.studentName));
  },

  async listAttendanceForStudent(
    requestId: string,
    studentId: string,
  ): Promise<SessionAttendance[]> {
    await delay();
    const items = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    return items
      .filter((a) => a.requestId === requestId && a.studentId === studentId)
      .sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  },

  async markAttendance(input: {
    requestId: string;
    trainerId: string;
    studentId: string;
    studentName: string;
    sessionDate: string;
    status: AttendanceStatus;
  }): Promise<SessionAttendance> {
    await delay(250);
    const session = await getRequest(input.requestId);
    assertCanManage(session, input.trainerId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.sessionDate)) {
      throw new Error('Use attendance date as YYYY-MM-DD.');
    }

    const items = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    const index = items.findIndex(
      (a) =>
        a.requestId === input.requestId &&
        a.studentId === input.studentId &&
        a.sessionDate === input.sessionDate,
    );
    const entry: SessionAttendance = {
      id: index >= 0 ? items[index].id : uid('att'),
      requestId: input.requestId,
      studentId: input.studentId,
      studentName: input.studentName,
      sessionDate: input.sessionDate,
      status: input.status,
      markedByTrainerId: input.trainerId,
      updatedAt: new Date().toISOString(),
    };
    if (index >= 0) items[index] = entry;
    else items.unshift(entry);
    await writeJson(ATTENDANCE_KEY, items);
    return entry;
  },

  async listSubmissions(requestId: string, assignmentId?: string): Promise<AssignmentSubmission[]> {
    await delay();
    const items = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    return items
      .filter(
        (s) =>
          s.requestId === requestId && (!assignmentId || s.assignmentId === assignmentId),
      )
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  async listMySubmissions(
    requestId: string,
    studentId: string,
  ): Promise<AssignmentSubmission[]> {
    await delay();
    const items = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    return items
      .filter((s) => s.requestId === requestId && s.studentId === studentId)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  async submitAssignment(input: {
    assignmentId: string;
    requestId: string;
    studentId: string;
    studentName: string;
    file: SessionFileRef;
    notes?: string;
  }): Promise<AssignmentSubmission> {
    await delay(350);
    const assignments = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const assignment = assignments.find((a) => a.id === input.assignmentId);
    if (!assignment || assignment.requestId !== input.requestId) {
      throw new Error('Assignment not found for this session.');
    }

    const items = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const existing = items.findIndex(
      (s) => s.assignmentId === input.assignmentId && s.studentId === input.studentId,
    );
    const entry: AssignmentSubmission = {
      id: existing >= 0 ? items[existing].id : uid('sub'),
      assignmentId: input.assignmentId,
      requestId: input.requestId,
      studentId: input.studentId,
      studentName: input.studentName,
      file: input.file,
      notes: input.notes?.trim() || undefined,
      status: 'submitted',
      submittedAt: new Date().toISOString(),
      trainerRemark: undefined,
      reviewedAt: undefined,
    };
    if (existing >= 0) items[existing] = entry;
    else items.unshift(entry);
    await writeJson(SUBMISSIONS_KEY, items);
    return entry;
  },

  async reviewSubmission(input: {
    submissionId: string;
    trainerId: string;
    status: Extract<SubmissionStatus, 'accepted' | 'needs_revision'>;
    remark?: string;
  }): Promise<AssignmentSubmission> {
    await delay(300);
    const items = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const index = items.findIndex((s) => s.id === input.submissionId);
    if (index < 0) throw new Error('Submission not found.');
    const session = await getRequest(items[index].requestId);
    assertCanManage(session, input.trainerId);
    items[index] = {
      ...items[index],
      status: input.status,
      trainerRemark: input.remark?.trim() || undefined,
      reviewedAt: new Date().toISOString(),
    };
    await writeJson(SUBMISSIONS_KEY, items);
    return items[index];
  },

  async listCertificates(requestId: string): Promise<SessionCertificate[]> {
    await delay();
    const items = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    return items
      .filter((c) => c.requestId === requestId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  async listCertificatesForStudent(studentId: string): Promise<SessionCertificate[]> {
    await delay();
    const items = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    return items
      .filter((c) => c.studentId === studentId)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  async getCertificateEligibility(
    requestId: string,
    studentId: string,
  ): Promise<{
    eligible: boolean;
    attendancePercent: number;
    attendedDays: number;
    totalDays: number;
    assignmentsTotal: number;
    assignmentsAccepted: number;
    reasons: string[];
  }> {
    const allAttendance = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    const sessionAttendance = allAttendance.filter((a) => a.requestId === requestId);
    const sessionDates = [...new Set(sessionAttendance.map((a) => a.sessionDate))].sort();
    const totalDays = sessionDates.length;

    let attendedDays = 0;
    for (const date of sessionDates) {
      const row = sessionAttendance.find(
        (a) => a.studentId === studentId && a.sessionDate === date,
      );
      if (row && (row.status === 'present' || row.status === 'late')) {
        attendedDays += 1;
      }
    }

    const attendancePercent =
      totalDays === 0 ? 0 : Math.round((attendedDays / totalDays) * 100);

    const assignments = await this.listAssignments(requestId);
    const submissions = await this.listSubmissions(requestId);
    const assignmentsTotal = assignments.length;
    const assignmentsAccepted = assignments.filter((asg) =>
      submissions.some(
        (s) =>
          s.assignmentId === asg.id &&
          s.studentId === studentId &&
          s.status === 'accepted',
      ),
    ).length;

    const reasons: string[] = [];
    if (totalDays === 0) {
      reasons.push('No attendance days marked for this session yet.');
    } else if (attendancePercent < 75) {
      reasons.push(
        `Attendance ${attendancePercent}% (need minimum 75% · ${attendedDays}/${totalDays} days).`,
      );
    }
    if (assignmentsTotal === 0) {
      reasons.push('No assignments posted yet — post and accept all assignments first.');
    } else if (assignmentsAccepted < assignmentsTotal) {
      reasons.push(
        `Assignments ${assignmentsAccepted}/${assignmentsTotal} accepted (all must be completed).`,
      );
    }

    return {
      eligible: reasons.length === 0,
      attendancePercent,
      attendedDays,
      totalDays,
      assignmentsTotal,
      assignmentsAccepted,
      reasons,
    };
  },

  async issueCertificate(input: {
    requestId: string;
    trainerId: string;
    trainerName: string;
    studentId: string;
    studentName: string;
    collegeName: string;
  }): Promise<SessionCertificate> {
    await delay(400);
    const session = await getRequest(input.requestId);
    assertCanManage(session, input.trainerId);

    const items = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    if (items.some((c) => c.requestId === input.requestId && c.studentId === input.studentId)) {
      throw new Error('Certificate already issued for this student.');
    }

    const eligibility = await this.getCertificateEligibility(input.requestId, input.studentId);
    if (!eligibility.eligible) {
      throw new Error(eligibility.reasons.join(' '));
    }

    const entry: SessionCertificate = {
      id: uid('cert'),
      requestId: input.requestId,
      courseName: session.courseName,
      studentId: input.studentId,
      studentName: input.studentName,
      collegeName: input.collegeName,
      issuedByTrainerId: input.trainerId,
      issuedByName: input.trainerName,
      certificateCode: certCode(session.courseName),
      issuedAt: new Date().toISOString(),
    };
    items.unshift(entry);
    await writeJson(CERTIFICATES_KEY, items);
    await trainingApi.markRegistrationCompleted(input.requestId, input.studentId);
    return entry;
  },

  async issueCertificatesForEligible(input: {
    requestId: string;
    trainerId: string;
    trainerName: string;
  }): Promise<number> {
    const session = await getRequest(input.requestId);
    assertCanManage(session, input.trainerId);
    const registered = await trainingApi.listRegistrationsForSession(input.requestId);
    const existing = await this.listCertificates(input.requestId);
    const issuedIds = new Set(existing.map((c) => c.studentId));
    let count = 0;
    for (const reg of registered) {
      if (issuedIds.has(reg.studentId)) continue;
      try {
        await this.issueCertificate({
          requestId: input.requestId,
          trainerId: input.trainerId,
          trainerName: input.trainerName,
          studentId: reg.studentId,
          studentName: reg.studentName,
          collegeName: reg.collegeName,
        });
        count += 1;
      } catch {
        // skip ineligible students
      }
    }
    return count;
  },
};
