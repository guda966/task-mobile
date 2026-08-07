import type { CourseCategory } from '../types/collegePortal';
import type { TrainerDraft } from '../types/trainer';

export const TRAINER_SKILL_OPTIONS: CourseCategory[] = [
  'Technology',
  'Soft Skills',
  'Pharmacy',
  'A & R',
  'Tally',
];

/** Pre-approved demo trainer created by TASK Admin (for sign-in testing). */
export const DUMMY_TRAINER = {
  email: 'trainer.demo@task.telangana.gov.in',
  mobile: '9888800001',
  password: 'Trainer@123',
  firstName: 'Ananya',
  lastName: 'Reddy',
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
        title: 'Full Stack Development Certificate',
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
