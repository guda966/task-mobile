import type { CourseCategory } from './collegePortal';

export type TrainerStatus = 'pending' | 'active' | 'rejected' | 'inactive';

export interface TrainerFileRef {
  fileName: string;
  sizeLabel: string;
  uploadedAt: string;
}

export interface TrainerCertificate {
  id: string;
  title: string;
  issuer: string;
  year: string;
  file?: TrainerFileRef;
}

export interface TrainerAchievement {
  id: string;
  title: string;
  description: string;
  year: string;
}

export interface TrainerRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  skills: CourseCategory[];
  bio: string;
  experienceYears: string;
  city: string;
  status: TrainerStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  passwordHash: string;
  profileComplete: boolean;
  resume?: TrainerFileRef;
  certificates: TrainerCertificate[];
  achievements: TrainerAchievement[];
  createdAt: string;
  updatedAt: string;
  createdBy: 'task_admin' | 'self';
}

export interface TrainerDraft {
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  skills: CourseCategory[];
  bio: string;
  experienceYears: string;
  city: string;
  password: string;
  confirmPassword: string;
  resume?: TrainerFileRef;
  certificates: Omit<TrainerCertificate, 'id'>[];
  achievements: Omit<TrainerAchievement, 'id'>[];
}

export interface TrainerFeedback {
  id: string;
  trainerId: string;
  requestId?: string;
  courseName?: string;
  fromRole: 'task_admin' | 'student' | 'college_admin';
  fromName: string;
  studentId?: string;
  rating?: number;
  comment: string;
  createdAt: string;
}

export interface TrainerMessage {
  id: string;
  trainerId: string;
  fromRole: 'task_admin' | 'trainer';
  fromName: string;
  subject: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface StudentTrainerQuery {
  id: string;
  trainerId: string;
  studentId: string;
  studentName: string;
  collegeName: string;
  requestId?: string;
  courseName?: string;
  question: string;
  answer?: string;
  status: 'open' | 'answered';
  createdAt: string;
  answeredAt?: string;
}
