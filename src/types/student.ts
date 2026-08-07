import type { InstitutionType } from '../constants/lookups';
import type { StudentCategory } from '../constants/student';

export interface StudentRecord {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  aadhaarNumber: string;
  category: StudentCategory;
  casteCertificateProvided: boolean;
  institutionType: InstitutionType;
  affiliatedUniversity: string;
  district: string;
  enrollmentId: string;
  collegeName: string;
  collegeRollNo: string;
  yearOfGraduation: string;
  branch: string;
  registrationFee: number;
  passwordHash: string;
  username: string;
  status: 'Active' | 'Inactive';
}

export interface StudentDraft {
  firstName: string;
  lastName: string;
  mobile: string;
  email: string;
  aadhaarNumber: string;
  category: StudentCategory | '';
  casteCertificateProvided: boolean;
  institutionType: InstitutionType | '';
  affiliatedUniversity: string;
  district: string;
  enrollmentId: string;
  collegeRollNo: string;
  yearOfGraduation: string;
  branch: string;
  password: string;
  confirmPassword: string;
  feeAcknowledged: boolean;
  termsAccepted: boolean;
  declarationAccepted: boolean;
}
