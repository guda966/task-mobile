import type { InstitutionType } from './lookups';

export type StudentCategory = 'ST' | 'SC' | 'BC' | 'OC' | 'OBC' | 'GENERAL';

export const STUDENT_CATEGORIES: { value: StudentCategory; label: string }[] = [
  { value: 'ST', label: 'ST' },
  { value: 'SC', label: 'SC' },
  { value: 'BC', label: 'BC' },
  { value: 'OC', label: 'OC' },
  { value: 'OBC', label: 'OBC' },
  { value: 'GENERAL', label: 'GENERAL' },
];

/** Placeholder student fees — confirm current TASK rates before production. */
export function getStudentRegistrationFee(
  institutionType: InstitutionType | '',
  category: StudentCategory | '',
): number {
  if (!institutionType || !category) return 0;
  const engineeringLike = ['ENGINEERING', 'PHARMA', 'MBA', 'PGDM'].includes(institutionType);
  const base = engineeringLike ? 1000 : 500;
  const concession = category === 'ST' || category === 'SC';
  return concession ? Math.round(base * 0.5) : base;
}

export const DUMMY_STUDENT = {
  email: 'student.demo@gmail.com',
  mobile: '9876543210',
  password: 'Student@123',
  firstName: 'Ananya',
  lastName: 'Reddy',
};

export const EDUCATION_BOARDS = [
  'TSBIE / Telangana Board',
  'BSE Telangana',
  'CBSE',
  'ICSE / ISC',
  'Other state board',
  'Other',
];

export const PASSING_YEARS = Array.from({ length: 20 }, (_, i) => String(2026 - i));
