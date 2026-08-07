export interface SessionFileRef {
  fileName: string;
  sizeLabel: string;
  uploadedAt: string;
}

export interface SessionMaterial {
  id: string;
  requestId: string;
  trainerId: string;
  title: string;
  description?: string;
  file: SessionFileRef;
  createdAt: string;
}

export interface SessionAssignment {
  id: string;
  requestId: string;
  trainerId: string;
  title: string;
  instructions: string;
  dueDate?: string;
  file?: SessionFileRef;
  createdAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'late';

export interface SessionAttendance {
  id: string;
  requestId: string;
  studentId: string;
  studentName: string;
  sessionDate: string;
  status: AttendanceStatus;
  markedByTrainerId: string;
  updatedAt: string;
}

export type SubmissionStatus = 'submitted' | 'accepted' | 'needs_revision';

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  requestId: string;
  studentId: string;
  studentName: string;
  file: SessionFileRef;
  notes?: string;
  status: SubmissionStatus;
  trainerRemark?: string;
  /** Marks awarded by trainer (shown when status is accepted). */
  score?: number;
  maxScore?: number;
  submittedAt: string;
  reviewedAt?: string;
}

export interface SessionCertificate {
  id: string;
  requestId: string;
  courseName: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  issuedByTrainerId: string;
  issuedByName: string;
  certificateCode: string;
  issuedAt: string;
}
