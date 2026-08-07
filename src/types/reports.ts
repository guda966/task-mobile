export interface BatchProgressRow {
  requestId: string;
  courseName: string;
  collegeName: string;
  enrollmentId: string;
  branch: string;
  yearOfGraduation: string;
  startDate: string;
  endDate: string;
  status: string;
  trainerName?: string;
  registeredStudents: number;
  avgAttendancePercent: number;
  certificatesIssued: number;
  assignmentsTotal: number;
  submissionsAccepted: number;
  submissionsPending: number;
  eligibleForCert: number;
}

export interface AttendanceReportRow {
  requestId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  sessionDate: string;
  status: string;
}

export interface SubmissionReportRow {
  requestId: string;
  courseName: string;
  assignmentTitle: string;
  studentName: string;
  status: string;
  submittedAt: string;
  fileName: string;
  trainerRemark?: string;
}

export interface CertificateReportRow {
  requestId: string;
  courseName: string;
  collegeName: string;
  studentName: string;
  certificateCode: string;
  issuedByName: string;
  issuedAt: string;
}

export interface PlatformSummary {
  collegesApproved: number;
  collegesPending: number;
  students: number;
  trainersActive: number;
  trainersPending: number;
  sessionsApproved: number;
  certificatesIssued: number;
  submissionsPending: number;
}
