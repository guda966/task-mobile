import {
  CONSUMER_EMAIL_DOMAINS,
  REGISTRATION_FEES,
  RENEWAL_FEES,
} from '../constants/lookups';
import type { EnrollmentDraft } from '../types/enrollment';

export function isOfficialEmailDomain(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const at = normalized.lastIndexOf('@');
  if (at < 1) return false;
  const domain = normalized.slice(at + 1);
  if (!domain.includes('.') || domain.endsWith('.')) return false;
  if (CONSUMER_EMAIL_DOMAINS.includes(domain)) return false;
  return (
    domain.endsWith('.edu.in') ||
    domain.endsWith('.ac.in') ||
    domain.endsWith('.gov.in') ||
    domain.endsWith('.org.in') ||
    domain.includes('college') ||
    domain.includes('university') ||
    domain.includes('institute') ||
    !CONSUMER_EMAIL_DOMAINS.includes(domain)
  );
}

export function isValidMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile.trim());
}

export function getFeeForDraft(draft: Pick<EnrollmentDraft, 'institutionType' | 'registrationKind'>): number {
  if (!draft.institutionType || !draft.registrationKind) return 0;
  const table = draft.registrationKind === 'RENEWAL' ? RENEWAL_FEES : REGISTRATION_FEES;
  return table[draft.institutionType];
}

export type FieldErrors = Partial<Record<keyof EnrollmentDraft, string>>;

export function validateEnrollmentDraft(draft: EnrollmentDraft): FieldErrors {
  const errors: FieldErrors = {};

  if (!draft.registrationKind) {
    errors.registrationKind = 'Select new registration or renewal';
  }
  if (!draft.institutionName.trim()) {
    errors.institutionName = 'College / institution name is required';
  }
  if (!draft.institutionType) {
    errors.institutionType = 'Type of institution is required';
  }
  if (!draft.collegeStatus) {
    errors.collegeStatus = 'College status is required';
  }
  if (!draft.collegeType) {
    errors.collegeType = 'College type is required';
  }
  if (!draft.affiliationNumber.trim()) {
    errors.affiliationNumber = 'Affiliation number / college code is required';
  }
  if (!draft.affiliatedUniversity.trim()) {
    errors.affiliatedUniversity = 'Affiliated university is required';
  }
  if (!draft.district.trim()) {
    errors.district = 'District is required';
  }
  if (!draft.pinCode.trim()) {
    errors.pinCode = 'PIN code is required';
  } else if (!/^\d{6}$/.test(draft.pinCode.trim())) {
    errors.pinCode = 'Enter a valid 6-digit PIN code';
  }
  if (!draft.address.trim()) {
    errors.address = 'College address is required';
  }
  if (!draft.contactPersonName.trim()) {
    errors.contactPersonName = 'Contact person name is required';
  }
  if (!draft.contactDesignation.trim()) {
    errors.contactDesignation = 'Designation is required';
  }
  if (!draft.officialEmail.trim()) {
    errors.officialEmail = 'Official email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.officialEmail.trim())) {
    errors.officialEmail = 'Enter a valid email address';
  } else if (!isOfficialEmailDomain(draft.officialEmail)) {
    errors.officialEmail =
      'Use an official institutional email (not Gmail/Yahoo/personal domains)';
  }
  if (!draft.officialMobile.trim()) {
    errors.officialMobile = 'Official mobile number is required';
  } else if (!isValidMobile(draft.officialMobile)) {
    errors.officialMobile = 'Enter a valid 10-digit Indian mobile number';
  }
  if (!draft.password) {
    errors.password = 'Password is required';
  } else if (draft.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  if (draft.password !== draft.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }
  if (!draft.feeAcknowledged) {
    errors.feeAcknowledged = 'Acknowledge the college registration fee to continue';
  }
  if (!draft.termsAccepted) {
    errors.termsAccepted = 'You must agree to the terms and conditions';
  }
  if (!draft.declarationAccepted) {
    errors.declarationAccepted = 'Declaration is required';
  }

  return errors;
}
