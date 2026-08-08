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

export type CourseRequesterType = 'college' | 'regional_center';

export interface CourseRequest {
  id: string;
  /** College enrollment id; empty string for Regional Centre requests. */
  enrollmentId: string;
  collegeName: string;
  requesterType?: CourseRequesterType;
  regionalCenterId?: string;
  regionalCenterName?: string;
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
  /** Academic semester (1–8), used for college filtering. */
  semester: string;
  yearOfGraduation: string;
  status: 'Active' | 'Inactive';
  enrollmentId: string;
}

/** Final list of students registered against a college-requested course batch. */
export interface CourseEnrolledStudent {
  registrationId: string;
  studentId: string;
  fullName: string;
  email: string;
  hallTicketNo: string;
  username: string;
  branch: string;
  semester: string;
  yearOfGraduation: string;
  courseRequestId: string;
  courseName: string;
  category: string;
  batchStatus: CourseRequestStatus;
  registrationStatus: string;
  registeredAt: string;
  startDate: string;
  endDate: string;
  batchSize: number;
}

export interface CourseRequestDraft {
  courseId: string;
  yearOfGraduation: string;
  branch: string;
  startDate: string;
  endDate: string;
  batchSize: string;
}
