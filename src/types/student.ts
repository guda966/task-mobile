import type { InstitutionType } from '../constants/lookups';
import type { StudentCategory } from '../constants/student';

/** Class 10 / Class 12 academic record captured at registration. */
export interface SchoolExamDetails {
  board: string;
  schoolName: string;
  yearOfPassing: string;
  percentage: string;
  hallTicketNo: string;
}

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
  tenth: SchoolExamDetails;
  twelfth: SchoolExamDetails;
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
  tenthBoard: string;
  tenthSchoolName: string;
  tenthYearOfPassing: string;
  tenthPercentage: string;
  tenthHallTicketNo: string;
  twelfthBoard: string;
  twelfthSchoolName: string;
  twelfthYearOfPassing: string;
  twelfthPercentage: string;
  twelfthHallTicketNo: string;
  password: string;
  confirmPassword: string;
  feeAcknowledged: boolean;
  termsAccepted: boolean;
  declarationAccepted: boolean;
  /** Optional Regional Centre join at registration (₹599 / 6 months). */
  joinRegionalCenter: boolean;
  regionalCenterId: string;
  rcFeeAcknowledged: boolean;
}

export function emptySchoolExam(): SchoolExamDetails {
  return {
    board: '',
    schoolName: '',
    yearOfPassing: '',
    percentage: '',
    hallTicketNo: '',
  };
}

export function schoolExamFromDraft(
  board: string,
  schoolName: string,
  yearOfPassing: string,
  percentage: string,
  hallTicketNo: string,
): SchoolExamDetails {
  return {
    board: board.trim(),
    schoolName: schoolName.trim(),
    yearOfPassing: yearOfPassing.trim(),
    percentage: percentage.trim(),
    hallTicketNo: hallTicketNo.trim(),
  };
}
