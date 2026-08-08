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

/** Trainer own-attendance photo slots for a session day (all mandatory). */
export type TrainerAttendancePhotoKind = 'start_class' | 'end_class';

export const TRAINER_ATTENDANCE_PHOTO_SLOTS: {
  kind: TrainerAttendancePhotoKind;
  moment: 'Session start' | 'Session close';
  title: string;
  hint: string;
}[] = [
  {
    kind: 'start_class',
    moment: 'Session start',
    title: 'Class photo',
    hint: 'Classroom / batch photo at start (auto geo-tagged)',
  },
  {
    kind: 'end_class',
    moment: 'Session close',
    title: 'Class photo',
    hint: 'Classroom / batch photo at closing (auto geo-tagged)',
  },
];

/** Geo-tagged photo posted by the trainer for their own session attendance. */
export interface SessionEvidence {
  id: string;
  requestId: string;
  trainerId: string;
  trainerName: string;
  /** Calendar day this photo belongs to (YYYY-MM-DD). */
  sessionDate: string;
  kind: TrainerAttendancePhotoKind;
  caption?: string;
  photo: SessionFileRef & { dataUrl?: string };
  geo: {
    latitude: number;
    longitude: number;
    accuracyMeters?: number;
    capturedAt: string;
  };
  createdAt: string;
}
