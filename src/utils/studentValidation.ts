import {
  getStudentRegistrationFee,
  type StudentCategory,
} from '../constants/student';
import type { StudentDraft } from '../types/student';
import { isValidMobile } from './validation';

export type StudentFieldErrors = Partial<Record<keyof StudentDraft, string>>;

function validatePercentage(value: string, label: string): string | undefined {
  if (!value.trim()) return `${label} percentage / CGPA is required`;
  const n = Number(value);
  if (Number.isNaN(n) || n <= 0 || n > 100) {
    return `${label} percentage / CGPA must be between 1 and 100`;
  }
  return undefined;
}

export function validateStudentDraft(draft: StudentDraft): StudentFieldErrors {
  const errors: StudentFieldErrors = {};

  if (!draft.firstName.trim()) errors.firstName = 'First name is required';
  if (!draft.lastName.trim()) errors.lastName = 'Last name is required';
  if (!draft.mobile.trim()) errors.mobile = 'Mobile number is required';
  else if (!isValidMobile(draft.mobile)) errors.mobile = 'Enter a valid 10-digit mobile number';
  if (!draft.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    errors.email = 'Enter a valid email address';
  }
  if (draft.aadhaarNumber.trim() && !/^\d{12}$/.test(draft.aadhaarNumber.trim())) {
    errors.aadhaarNumber = 'Aadhaar must be 12 digits';
  }
  if (!draft.category) errors.category = 'Category is required';
  if (
    (draft.category === 'ST' || draft.category === 'SC') &&
    !draft.casteCertificateProvided
  ) {
    errors.casteCertificateProvided =
      'Confirm caste certificate for 50% fee concession';
  }
  if (!draft.institutionType) errors.institutionType = 'Type of institution is required';
  if (!draft.affiliatedUniversity.trim()) {
    errors.affiliatedUniversity = 'Affiliated university is required';
  }
  if (!draft.district.trim()) errors.district = 'District is required';
  if (!draft.enrollmentId) errors.enrollmentId = 'College is required';
  if (!draft.collegeRollNo.trim()) errors.collegeRollNo = 'College roll no is required';
  if (!draft.yearOfGraduation) errors.yearOfGraduation = 'Year of graduation is required';
  if (!draft.branch) errors.branch = 'Branch / specialization is required';

  if (!draft.tenthBoard) errors.tenthBoard = '10th board is required';
  if (!draft.tenthSchoolName.trim()) errors.tenthSchoolName = '10th school name is required';
  if (!draft.tenthYearOfPassing) errors.tenthYearOfPassing = '10th year of passing is required';
  const tenthPct = validatePercentage(draft.tenthPercentage, '10th');
  if (tenthPct) errors.tenthPercentage = tenthPct;
  if (!draft.tenthHallTicketNo.trim()) {
    errors.tenthHallTicketNo = '10th hall ticket / roll no is required';
  }

  if (!draft.twelfthBoard) errors.twelfthBoard = '12th board is required';
  if (!draft.twelfthSchoolName.trim()) errors.twelfthSchoolName = '12th college / school is required';
  if (!draft.twelfthYearOfPassing) {
    errors.twelfthYearOfPassing = '12th year of passing is required';
  }
  const twelfthPct = validatePercentage(draft.twelfthPercentage, '12th');
  if (twelfthPct) errors.twelfthPercentage = twelfthPct;
  if (!draft.twelfthHallTicketNo.trim()) {
    errors.twelfthHallTicketNo = '12th hall ticket / roll no is required';
  }
  if (
    draft.tenthYearOfPassing &&
    draft.twelfthYearOfPassing &&
    Number(draft.twelfthYearOfPassing) < Number(draft.tenthYearOfPassing)
  ) {
    errors.twelfthYearOfPassing = '12th year cannot be earlier than 10th year';
  }

  if (!draft.password) errors.password = 'Password is required';
  else if (draft.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (draft.password !== draft.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  if (!draft.feeAcknowledged) {
    errors.feeAcknowledged = 'Acknowledge the registration fee to continue';
  }
  if (!draft.termsAccepted) errors.termsAccepted = 'You must agree to the terms';
  if (!draft.declarationAccepted) {
    errors.declarationAccepted = 'Declaration is required';
  }

  return errors;
}

export function studentFeeLabel(
  institutionType: StudentDraft['institutionType'],
  category: StudentCategory | '',
): number {
  return getStudentRegistrationFee(institutionType, category);
}
