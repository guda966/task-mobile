export type CourseCategory =
  | 'Technology'
  | 'Soft Skills'
  | 'Pharmacy'
  | 'A & R'
  | 'Tally';

export interface Course {
  id: string;
  title: string;
  category: CourseCategory;
  description: string;
  graduationYears: string[];
  /** When false, hidden from college request catalogue. */
  enabled: boolean;
  updatedAt?: string;
}

export type CourseRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CourseRequest {
  id: string;
  enrollmentId: string;
  collegeName: string;
  courseId: string;
  courseName: string;
  category: CourseCategory;
  yearOfGraduation: string;
  branch: string;
  startDate: string;
  endDate: string;
  batchSize: number;
  status: CourseRequestStatus;
  requestedOn: string;
  reviewedAt?: string;
  rejectionReason?: string;
  adminRemark?: string;
  trainerId?: string;
  trainerName?: string;
  trainerEmail?: string;
  trainerMobile?: string;
  trainerSkills?: string;
  trainerCity?: string;
  trainerExperienceYears?: string;
  backupTrainerId?: string;
  backupTrainerName?: string;
  backupTrainerEmail?: string;
  backupTrainerMobile?: string;
}

export interface CollegeStudent {
  id: string;
  fullName: string;
  username: string;
  hallTicketNo: string;
  email: string;
  caste: string;
  branch: string;
  status: 'Active' | 'Inactive';
  enrollmentId: string;
}

export interface CourseRequestDraft {
  courseId: string;
  yearOfGraduation: string;
  branch: string;
  startDate: string;
  endDate: string;
  batchSize: string;
}
