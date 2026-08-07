import type { CourseCategory } from '../types/collegePortal';
import type { TrainerDraft } from '../types/trainer';

export const TRAINER_SKILL_OPTIONS: CourseCategory[] = [
  'Technology',
  'Soft Skills',
  'Pharmacy',
  'A & R',
  'Tally',
];

/** Pre-approved demo trainer with a complete profile (for sign-in testing). */
export const DUMMY_TRAINER = {
  email: 'trainer.demo@task.telangana.gov.in',
  mobile: '9888800001',
  password: 'Trainer@123',
  firstName: 'Ananya',
  lastName: 'Reddy',
};

/**
 * Seed for new trainer registration flow (OTP + profile form).
 * Uses a different email than DUMMY_TRAINER so sign-in demo is not blocked.
 */
export const TRAINER_REGISTRATION_SEED = {
  email: 'trainer.apply@gmail.com',
  mobile: '9876501234',
  password: 'Apply@1234',
  firstName: 'Karthik',
  lastName: 'Naidu',
};

export function createDemoTrainerDraft(): TrainerDraft {
  const now = new Date().toISOString();
  return {
    firstName: DUMMY_TRAINER.firstName,
    lastName: DUMMY_TRAINER.lastName,
    email: DUMMY_TRAINER.email,
    mobile: DUMMY_TRAINER.mobile,
    skills: ['Technology', 'Soft Skills'],
    bio: 'TASK industry trainer focused on programming foundations, workplace communication, and hands-on lab facilitation for college workshops.',
    experienceYears: '7',
    city: 'Hyderabad',
    password: DUMMY_TRAINER.password,
    confirmPassword: DUMMY_TRAINER.password,
    resume: {
      fileName: 'Ananya_Reddy_Resume.pdf',
      sizeLabel: '312 KB',
      uploadedAt: now,
    },
    certificates: [
      {
        title: 'Certified Corporate Trainer',
        issuer: 'NSDC / Skill India',
        year: '2022',
        file: {
          fileName: 'NSDC_Trainer_Cert.pdf',
          sizeLabel: '180 KB',
          uploadedAt: now,
        },
      },
      {
        title: 'Full Stack Development Mentorship',
        issuer: 'NASSCOM',
        year: '2023',
        file: {
          fileName: 'NASSCOM_FS_Cert.pdf',
          sizeLabel: '210 KB',
          uploadedAt: now,
        },
      },
    ],
    achievements: [
      {
        title: 'Trained 2,000+ students',
        description: 'Delivered TASK technology and soft-skills workshops across Telangana colleges.',
        year: '2024',
      },
      {
        title: 'Best facilitator award',
        description: 'Recognised by TASK regional centre for workshop delivery excellence.',
        year: '2023',
      },
    ],
  };
}

/** Prefill for Trainer Registration form after OTP verify. */
export function createTrainerRegistrationSeed(
  email = TRAINER_REGISTRATION_SEED.email,
  mobile = TRAINER_REGISTRATION_SEED.mobile,
): TrainerDraft {
  const now = new Date().toISOString();
  return {
    firstName: TRAINER_REGISTRATION_SEED.firstName,
    lastName: TRAINER_REGISTRATION_SEED.lastName,
    email,
    mobile,
    skills: ['Technology', 'Tally'],
    bio: 'Aspiring TASK trainer with industry experience in software labs and student mentoring. Looking to deliver college workshop batches across Telangana.',
    experienceYears: '5',
    city: 'Warangal',
    password: TRAINER_REGISTRATION_SEED.password,
    confirmPassword: TRAINER_REGISTRATION_SEED.password,
    resume: {
      fileName: 'Karthik_Naidu_Resume.pdf',
      sizeLabel: '286 KB',
      uploadedAt: now,
    },
    certificates: [
      {
        title: 'Java Professional Certificate',
        issuer: 'Oracle',
        year: '2021',
        file: {
          fileName: 'Oracle_Java_Cert.pdf',
          sizeLabel: '150 KB',
          uploadedAt: now,
        },
      },
      {
        title: 'Tally Ace Certification',
        issuer: 'Tally Education',
        year: '2022',
        file: {
          fileName: 'Tally_Ace.pdf',
          sizeLabel: '120 KB',
          uploadedAt: now,
        },
      },
    ],
    achievements: [
      {
        title: 'Campus coding bootcamp lead',
        description: 'Led weekend coding bootcamps for 300+ engineering students.',
        year: '2023',
      },
      {
        title: 'Industry guest lecture series',
        description: 'Delivered guest lectures on employability skills at multiple degree colleges.',
        year: '2024',
      },
    ],
  };
}
