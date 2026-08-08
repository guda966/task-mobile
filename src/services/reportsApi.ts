import { Platform, Share } from 'react-native';
import type {
  AttendanceReportRow,
  BatchProgressRow,
  CertificateReportRow,
  CourseEnrolledReportRow,
  PlatformSummary,
  ReportScopeFilter,
  StudentRosterReportRow,
  SubmissionReportRow,
} from '../types/reports';
import type { CollegeStudent, CourseRequest } from '../types/collegePortal';
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
import { REGIONAL_CENTERS } from '../constants/lookups';
import { requesterOrgName } from '../utils/courseRequestLabels';
import { sessionContentApi } from './sessionContentApi';

const REQUESTS_KEY = 'task.courseRequests.v1';
const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';
const STUDENTS_REG_KEY = 'task.studentRegistrations.v1';
const COLLEGE_STUDENTS_KEY = 'task.students.v1';
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

function hasScope(scope?: ReportScopeFilter): boolean {
  if (!scope) return false;
  return Boolean(
    (scope.enrollmentId && scope.enrollmentId.trim()) ||
      (scope.district && scope.district !== 'All') ||
      (scope.regionalCenterId && scope.regionalCenterId !== 'All'),
  );
}

function filterEnrollments(
  enrollments: CollegeEnrollment[],
  scope?: ReportScopeFilter,
): CollegeEnrollment[] {
  if (!hasScope(scope)) return enrollments;
  return enrollments.filter((e) => {
    if (scope?.enrollmentId && e.id !== scope.enrollmentId) return false;
    if (scope?.district && scope.district !== 'All' && e.district !== scope.district) {
      return false;
    }
    if (
      scope?.regionalCenterId &&
      scope.regionalCenterId !== 'All' &&
      e.regionalCenterId !== scope.regionalCenterId
    ) {
      return false;
    }
    return true;
  });
}

/** Include college batches via enrollment scope, and RC batches via centre / district. */
function requestMatchesScope(
  request: CourseRequest,
  collegeIds: Set<string>,
  scope?: ReportScopeFilter,
): boolean {
  if (!hasScope(scope)) return true;

  if (request.requesterType === 'regional_center') {
    if (scope?.enrollmentId) return false;
    if (scope?.regionalCenterId && scope.regionalCenterId !== 'All') {
      return request.regionalCenterId === scope.regionalCenterId;
    }
    if (scope?.district && scope.district !== 'All') {
      const center = REGIONAL_CENTERS.find((c) => c.id === request.regionalCenterId);
      return center?.district === scope.district;
    }
    return false;
  }

  return collegeIds.has(request.enrollmentId);
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
  async getPlatformSummary(scope?: ReportScopeFilter): Promise<PlatformSummary> {
    await delay();
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const students = await readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
    const trainers = await readJson<TrainerRecord[]>(TRAINERS_KEY, []);
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const certs = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);
    const subs = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const registrations = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);

    const scopedColleges = filterEnrollments(enrollments, scope);
    const collegeIds = new Set(scopedColleges.map((e) => e.id));
    const statewide = !hasScope(scope);

    const scopedStudents = statewide
      ? students
      : students.filter((s) => collegeIds.has(s.enrollmentId));
    const scopedRequests = statewide
      ? requests
      : requests.filter((r) => requestMatchesScope(r, collegeIds, scope));
    const requestIds = new Set(scopedRequests.map((r) => r.id));
    const scopedRegs = statewide
      ? registrations
      : registrations.filter((r) => requestIds.has(r.courseRequestId));
    const scopedCerts = statewide
      ? certs
      : certs.filter((c) => requestIds.has(c.requestId));
    const scopedSubs = statewide
      ? subs
      : subs.filter((s) => requestIds.has(s.requestId));

    return {
      collegesApproved: scopedColleges.filter((e) => e.status === 'approved').length,
      collegesPending: statewide
        ? enrollments.filter((e) => e.status === 'pending').length
        : scopedColleges.filter((e) => e.status === 'pending').length,
      students: scopedStudents.length,
      trainersActive: trainers.filter((t) => t.status === 'active').length,
      trainersPending: trainers.filter((t) => t.status === 'pending').length,
      sessionsApproved: scopedRequests.filter((r) => r.status === 'approved').length,
      sessionsRcApproved: scopedRequests.filter(
        (r) => r.status === 'approved' && r.requesterType === 'regional_center',
      ).length,
      certificatesIssued: scopedCerts.length,
      submissionsPending: scopedSubs.filter((s) => s.status === 'submitted').length,
      studentsInTrainings: scopedRegs.filter(
        (r) => r.status === 'registered' || r.status === 'completed',
      ).length,
      placementsCompleted: scopedRegs.filter((r) => r.status === 'completed').length,
    };
  },

  async listBatchProgress(
    enrollmentId?: string,
    district?: string,
    regionalCenterId?: string,
  ): Promise<BatchProgressRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const registrations = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const attendance = await readJson<SessionAttendance[]>(ATTENDANCE_KEY, []);
    const assignments = await readJson<SessionAssignment[]>(ASSIGNMENTS_KEY, []);
    const submissions = await readJson<AssignmentSubmission[]>(SUBMISSIONS_KEY, []);
    const certificates = await readJson<SessionCertificate[]>(CERTIFICATES_KEY, []);

    const allowedEnrollmentIds = new Set(
      filterEnrollments(enrollments, {
        enrollmentId,
        district: district && district !== 'All' ? district : undefined,
        regionalCenterId:
          regionalCenterId && regionalCenterId !== 'All' ? regionalCenterId : undefined,
      })
        .filter((e) => e.status === 'approved')
        .map((e) => e.id),
    );

    const useScope = hasScope({
      enrollmentId,
      district: district && district !== 'All' ? district : undefined,
      regionalCenterId:
        regionalCenterId && regionalCenterId !== 'All' ? regionalCenterId : undefined,
    });

    const sessions = requests
      .filter(
        (r) =>
          r.status === 'approved' &&
          (!useScope || requestMatchesScope(r, allowedEnrollmentIds, {
            enrollmentId,
            district: district && district !== 'All' ? district : undefined,
            regionalCenterId:
              regionalCenterId && regionalCenterId !== 'All' ? regionalCenterId : undefined,
          })),
      )
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
        collegeName: requesterOrgName(session),
        enrollmentId: session.enrollmentId,
        requesterType: session.requesterType || 'college',
        regionalCenterId: session.regionalCenterId,
        regionalCenterName: session.regionalCenterName,
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

  async getStudentRosterReport(
    enrollmentId?: string,
    filters?: { branch?: string; semester?: string; yearOfGraduation?: string },
  ): Promise<StudentRosterReportRow[]> {
    await delay();
    const students = await readJson<CollegeStudent[]>(COLLEGE_STUDENTS_KEY, []);
    return students
      .filter((s) => !enrollmentId || s.enrollmentId === enrollmentId)
      .filter((s) => !filters?.branch || s.branch === filters.branch)
      .filter((s) => !filters?.semester || s.semester === filters.semester)
      .filter((s) => !filters?.yearOfGraduation || s.yearOfGraduation === filters.yearOfGraduation)
      .map((s) => ({
        fullName: s.fullName,
        username: s.username,
        hallTicketNo: s.hallTicketNo,
        email: s.email,
        branch: s.branch,
        semester: s.semester || '',
        yearOfGraduation: s.yearOfGraduation || '',
        caste: s.caste,
        status: s.status,
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  async getCourseEnrolledReport(
    enrollmentId?: string,
    requestId?: string,
  ): Promise<CourseEnrolledReportRow[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const registrations = await readJson<TrainingRegistration[]>(TRAINING_KEY, []);
    const students = await readJson<CollegeStudent[]>(COLLEGE_STUDENTS_KEY, []);
    const byEmail = new Map(students.map((s) => [s.email.trim().toLowerCase(), s]));
    const byId = new Map(students.map((s) => [s.id, s]));
    const allowed = new Set(
      requests
        .filter((r) => !enrollmentId || r.enrollmentId === enrollmentId)
        .filter((r) => !requestId || r.id === requestId)
        .map((r) => r.id),
    );

    return registrations
      .filter(
        (r) =>
          allowed.has(r.courseRequestId) &&
          (r.status === 'registered' || r.status === 'completed'),
      )
      .map((r) => {
        const profile = byId.get(r.studentId) || byEmail.get(r.studentEmail.trim().toLowerCase());
        return {
          fullName: r.studentName,
          email: r.studentEmail,
          hallTicketNo: profile?.hallTicketNo || '',
          branch: r.branch,
          semester: profile?.semester || '',
          yearOfGraduation: r.yearOfGraduation,
          courseName: r.courseName,
          registrationStatus: r.status,
          registeredAt: r.registeredAt,
          startDate: r.startDate,
          endDate: r.endDate,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
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

  studentRosterToCsv(rows: StudentRosterReportRow[]): string {
    return toCsv(
      [
        'Name',
        'Username',
        'Hall Ticket',
        'Email',
        'Branch',
        'Semester',
        'Year of Graduation',
        'Category',
        'Status',
      ],
      rows.map((r) => [
        r.fullName,
        r.username,
        r.hallTicketNo,
        r.email,
        r.branch,
        r.semester,
        r.yearOfGraduation,
        r.caste,
        r.status,
      ]),
    );
  },

  courseEnrolledToCsv(rows: CourseEnrolledReportRow[]): string {
    return toCsv(
      [
        'Name',
        'Email',
        'Hall Ticket',
        'Branch',
        'Semester',
        'Year of Graduation',
        'Course',
        'Registration Status',
        'Registered At',
        'Start',
        'End',
      ],
      rows.map((r) => [
        r.fullName,
        r.email,
        r.hallTicketNo,
        r.branch,
        r.semester,
        r.yearOfGraduation,
        r.courseName,
        r.registrationStatus,
        r.registeredAt,
        r.startDate,
        r.endDate,
      ]),
    );
  },

  batchProgressToCsv(rows: BatchProgressRow[]): string {
    return toCsv(
      [
        'Course',
        'Organisation',
        'Type',
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
        r.requesterType === 'regional_center' ? 'Regional Centre' : 'College',
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

  async listCollegesForReports(): Promise<
    { id: string; name: string; district: string; regionalCenterId?: string; regionalCenterName?: string }[]
  > {
    await delay(100);
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    return enrollments
      .filter((e) => e.status === 'approved')
      .map((e) => ({
        id: e.id,
        name: e.institutionName,
        district: e.district,
        regionalCenterId: e.regionalCenterId,
        regionalCenterName: e.regionalCenterName,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
};
