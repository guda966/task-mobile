import type {
  CollegeStatus,
  CollegeType,
  InstitutionType,
  RegistrationKind,
} from '../constants/lookups';

export type EnrollmentStatus = 'pending' | 'approved' | 'rejected';

export type UserRole = 'college_admin' | 'task_admin' | 'super_admin' | 'student' | 'trainer';

export interface CollegeEnrollment {
  id: string;
  status: EnrollmentStatus;
  createdAt: string;
  updatedAt: string;
  registrationKind: RegistrationKind;
  institutionName: string;
  institutionType: InstitutionType;
  collegeStatus: CollegeStatus;
  collegeType: CollegeType;
  affiliationNumber: string;
  affiliatedUniversity: string;
  district: string;
  pinCode: string;
  address: string;
  societyName: string;
  contactPersonName: string;
  contactDesignation: string;
  officialEmail: string;
  officialMobile: string;
  registrationFee: number;
  feeAcknowledged: boolean;
  passwordHash: string;
  regionalCenterId?: string;
  regionalCenterName?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  audience: 'task_admin' | 'college_admin';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  enrollmentId: string;
}

export interface SessionUser {
  role: UserRole;
  email: string;
  name: string;
  enrollmentId?: string;
  studentId?: string;
  trainerId?: string;
}

export interface EnrollmentDraft {
  registrationKind: RegistrationKind | '';
  institutionName: string;
  institutionType: InstitutionType | '';
  collegeStatus: CollegeStatus | '';
  collegeType: CollegeType | '';
  affiliationNumber: string;
  affiliatedUniversity: string;
  district: string;
  pinCode: string;
  address: string;
  societyName: string;
  contactPersonName: string;
  contactDesignation: string;
  officialEmail: string;
  officialMobile: string;
  password: string;
  confirmPassword: string;
  feeAcknowledged: boolean;
  termsAccepted: boolean;
  declarationAccepted: boolean;
}
