import type { EnrollmentDraft } from '../types/enrollment';

/** Temporary demo OTPs — replace with real SMS/email OTP later. */
export const DUMMY_EMAIL_OTP = '111111';
export const DUMMY_MOBILE_OTP = '222222';

export const DUMMY_COLLEGE_CONTACTS = {
  officialEmail: 'admin@vivekananda-demo.ac.in',
  officialMobile: '9999900001',
};

export const DUMMY_COLLEGE_PASSWORD = 'College@123';

/** Prefill for faster College Registration testing. */
export function createDummyCollegeDraft(
  email = DUMMY_COLLEGE_CONTACTS.officialEmail,
  mobile = DUMMY_COLLEGE_CONTACTS.officialMobile,
): EnrollmentDraft {
  return {
    registrationKind: 'NEW',
    institutionName: 'Vivekananda Degree & PG College (Demo)',
    institutionType: 'DEGREE_PG',
    collegeStatus: 'PRIVATE',
    collegeType: 'CO_ED',
    affiliationNumber: 'DEMO-AFF-2142',
    affiliatedUniversity: 'Osmania University',
    district: 'Hyderabad',
    pinCode: '500001',
    address:
      'Demo Campus, Near Masab Tank, Hyderabad, Telangana - 500001 (sample data for testing only)',
    societyName: 'Vivekananda Educational Society (Demo)',
    contactPersonName: 'Dr. Ramesh Kumar',
    contactDesignation: 'Principal',
    officialEmail: email,
    officialMobile: mobile,
    password: DUMMY_COLLEGE_PASSWORD,
    confirmPassword: DUMMY_COLLEGE_PASSWORD,
    feeAcknowledged: true,
    termsAccepted: true,
    declarationAccepted: true,
  };
}
