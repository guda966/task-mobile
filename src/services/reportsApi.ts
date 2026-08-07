import { Platform, Share } from 'react-native';
import type {
  AttendanceReportRow,
  BatchProgressRow,
  CertificateReportRow,
  PlatformSummary,
  SubmissionReportRow,
} from '../types/reports';
import type { CourseRequest } from '../types/collegePortal';
import type { CollegeEnrollment } from '../types/enrollment';
import type { StudentRecord } from '../types/student';
import type { TrainerRecord } from '../types/trainer';
import type { TrainingRegistration } from '../types/training';
import type {
  AssignmentSubmission,
  SessionAssignment,
  SessionAttendance,
  SessionCertificate,
} from '../types/sessionContent';
import { sessionContentApi } from './sessionContentApi';

const REQUESTS_KEY = 'task.courseRequests.v1';
const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';
const STUDENTS_REG_KEY = 'task.studentRegistrations.v1';
const TRAINERS_KEY = 'task.trainers.v2';
const TRAINING_KEY = 'task.trainingRegistrations.v1';
const ATTENDANCE_KEY = 'task.sessionAttendance.v1';
const ASSIGNMENTS_KEY = 'task.sessionAssignments.v1';
const SUBMISSIONS_KEY = 'task.assignmentSubmissions.v1';
const CERTIFICATES_KEY = 'task.sessionCertificates.v1';

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

function delay(ms = 200): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => {
    if (v.includes(',') || v.includes('"') || v.includes('\n')) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };
  return [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

export async function exportTextReport(title: string, body: string): Promise<void> {
  const payload = `${title}\n\n${body}`;
  if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(payload);
    return;
  }
  await Share.share({ message: payload, title });
}

export const reportsApi = {
  async getPlatformSummary(): Promise<PlatformSummary> {
    await delay();
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const students = await readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
    const trainers = await readJson<TrainerRecord[]>(TRAINERS_KEY, []);
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const certs = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    const subs = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);

    return {
      collegesApproved: enrollments.filter((e) => e.status === 'approved').length,
      collegesPending: enrollments.filter((e) => e.status === 'pending').length,
      students: students.length,
      trainersActive: trainers.filter((t) => t.status === 'active').length,
      trainersPending: trainers.filter((t) => t.status === 'pending').length,
      sessionsApproved: requests.filter((r) => r.status === 'approved').length,
      certificatesIssued: certs.length,
      submissionsPending: subs.filter((s) => s.status === 'submitted').length,
    };
  },

  async listBatchProgress(enrollmentId?: string): Promise<BatchProgressRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const registrations = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const attendance = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    const assignments = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const submissions = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const certificates = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);

    const sessions = requests
      .filter((r) => r.status === 'approved' && (!enrollmentId || r.enrollmentId === enrollmentId))
      .sort((a, b) => b.startDate.localeCompare(a.startDate));

    const rows: BatchProgressRow[] = [];
    for (const session of sessions) {
      const regs = registrations.filter(
        (r) =>
          r.courseRequestId === session.id &&
          (r.status === 'registered' || r.status === 'completed'),
      );
      const sessionAttendance = attendance.filter((a) => a.requestId === session.id);
      const sessionDates = [...new Set(sessionAttendance.map((a) => a.sessionDate))];
      let avgAttendancePercent = 0;
      let eligibleForCert = 0;
      if (regs.length > 0 && sessionDates.length > 0) {
        let sum = 0;
        for (const reg of regs) {
          let attended = 0;
          for (const date of sessionDates) {
            const row = sessionAttendance.find(
              (a) => a.studentId === reg.studentId && a.sessionDate === date,
            );
            if (row && (row.status === 'present' || row.status === 'late')) attended += 1;
          }
          const pct = Math.round((attended / sessionDates.length) * 100);
          sum += pct;
        }
        avgAttendancePercent = Math.round(sum / regs.length);
      }

      const asgs = assignments.filter((a) => a.requestId === session.id);
      const subs = submissions.filter((s) => s.requestId === session.id);
      const certs = certificates.filter((c) => c.requestId === session.id);

      for (const reg of regs) {
        if (certs.some((c) => c.studentId === reg.studentId)) continue;
        try {
          const elig = await sessionContentApi.getCertificateEligibility(session.id, reg.studentId);
          if (elig.eligible) eligibleForCert += 1;
        } catch {
          // ignore
        }
      }

      rows.push({
        requestId: session.id,
        courseName: session.courseName,
        collegeName: session.collegeName,
        enrollmentId: session.enrollmentId,
        branch: session.branch,
        yearOfGraduation: session.yearOfGraduation,
        startDate: session.startDate,
        endDate: session.endDate,
        status: session.status,
        trainerName: session.trainerName,
        registeredStudents: regs.length,
        avgAttendancePercent,
        certificatesIssued: certs.length,
        assignmentsTotal: asgs.length,
        submissionsAccepted: subs.filter((s) => s.status === 'accepted').length,
        submissionsPending: subs.filter((s) => s.status === 'submitted').length,
        eligibleForCert,
      });
    }
    return rows;
  },

  async getAttendanceReport(requestId?: string, enrollmentId?: string): Promise<AttendanceReportRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const attendance = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    const registrations = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const allowed = new Set(
      requests
        .filter((r) => !enrollmentId || r.enrollmentId === enrollmentId)
        .filter((r) => !requestId || r.id === requestId)
        .map((r) => r.id),
    );

    return attendance
      .filter((a) => allowed.has(a.requestId))
      .map((a) => {
        const session = requests.find((r) => r.id === a.requestId);
        const reg = registrations.find(
          (r) => r.courseRequestId === a.requestId && r.studentId === a.studentId,
        );
        return {
          requestId: a.requestId,
          courseName: session?.courseName || '',
          studentId: a.studentId,
          studentName: a.studentName,
          studentEmail: reg?.studentEmail || '',
          sessionDate: a.sessionDate,
          status: a.status,
        };
      })
      .sort((a, b) =>
        `${b.sessionDate}${a.studentName}`.localeCompare(`${a.sessionDate}${b.studentName}`),
      );
  },

  async getSubmissionsReport(
    requestId?: string,
    enrollmentId?: string,
  ): Promise<SubmissionReportRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const assignments = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const submissions = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const allowed = new Set(
      requests
        .filter((r) => !enrollmentId || r.enrollmentId === enrollmentId)
        .filter((r) => !requestId || r.id === requestId)
        .map((r) => r.id),
    );

    return submissions
      .filter((s) => allowed.has(s.requestId))
      .map((s) => {
        const session = requests.find((r) => r.id === s.requestId);
        const asg = assignments.find((a) => a.id === s.assignmentId);
        return {
          requestId: s.requestId,
          courseName: session?.courseName || '',
          assignmentTitle: asg?.title || s.assignmentId,
          studentName: s.studentName,
          status: s.status,
          submittedAt: s.submittedAt,
          fileName: s.file.fileName,
          trainerRemark: s.trainerRemark,
        };
      })
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  },

  async getCertificatesReport(
    requestId?: string,
    enrollmentId?: string,
  ): Promise<CertificateReportRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const certificates = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    const allowed = new Set(
      requests
        .filter((r) => !enrollmentId || r.enrollmentId === enrollmentId)
        .filter((r) => !requestId || r.id === requestId)
        .map((r) => r.id),
    );

    return certificates
      .filter((c) => allowed.has(c.requestId))
      .map((c) => ({
        requestId: c.requestId,
        courseName: c.courseName,
        collegeName: c.collegeName,
        studentName: c.studentName,
        certificateCode: c.certificateCode,
        issuedByName: c.issuedByName,
        issuedAt: c.issuedAt,
      }))
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  },

  attendanceToCsv(rows: AttendanceReportRow[]): string {
    return toCsv(
      ['Course', 'Student', 'Email', 'Date', 'Status'],
      rows.map((r) => [r.courseName, r.studentName, r.studentEmail, r.sessionDate, r.status]),
    );
  },

  submissionsToCsv(rows: SubmissionReportRow[]): string {
    return toCsv(
      ['Course', 'Assignment', 'Student', 'Status', 'Submitted At', 'File', 'Remark'],
      rows.map((r) => [
        r.courseName,
        r.assignmentTitle,
        r.studentName,
        r.status,
        r.submittedAt,
        r.fileName,
        r.trainerRemark || '',
      ]),
    );
  },

  certificatesToCsv(rows: CertificateReportRow[]): string {
    return toCsv(
      ['Course', 'College', 'Student', 'Code', 'Issued By', 'Issued At'],
      rows.map((r) => [
        r.courseName,
        r.collegeName,
        r.studentName,
        r.certificateCode,
        r.issuedByName,
        r.issuedAt,
      ]),
    );
  },

  batchProgressToCsv(rows: BatchProgressRow[]): string {
    return toCsv(
      [
        'Course',
        'College',
        'Branch',
        'Students',
        'Avg Attendance %',
        'Assignments',
        'Accepted Subs',
        'Pending Subs',
        'Certificates',
        'Eligible',
        'Trainer',
      ],
      rows.map((r) => [
        r.courseName,
        r.collegeName,
        r.branch,
        String(r.registeredStudents),
        String(r.avgAttendancePercent),
        String(r.assignmentsTotal),
        String(r.submissionsAccepted),
        String(r.submissionsPending),
        String(r.certificatesIssued),
        String(r.eligibleForCert),
        r.trainerName || '',
      ]),
    );
  },
};
