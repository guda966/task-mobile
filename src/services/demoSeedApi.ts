import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_COURSES } from '../constants/courses';
import { createDummyCollegeDraft } from '../constants/demoData';
import { REGIONAL_CENTERS } from '../constants/lookups';
import { DUMMY_STUDENT } from '../constants/student';
import { createDemoTrainerDraft, createTrainerRegistrationSeed } from '../constants/trainer';
import type { CollegeStudent, CourseRequest } from '../types/collegePortal';
import type { CollegeEnrollment } from '../types/enrollment';
import type {
  AssignmentSubmission,
  SessionAssignment,
  SessionAttendance,
  SessionMaterial,
} from '../types/sessionContent';
import type { StudentRecord } from '../types/student';
import type { TrainerRecord } from '../types/trainer';
import type { TrainingRegistration } from '../types/training';

/** Bump this when the seed shape changes so browsers auto-refresh once. */
export const DEMO_SEED_VERSION = '2026-08-07-demo-v2';

const META_KEY = 'task.demoSeed.meta.v1';

const IDS = {
  college: 'enr_demo_vivekananda',
  pendingCollege: 'enr_demo_pending',
  trainer: 'trn_demo_ananya',
  pendingTrainer: 'trn_demo_pending',
  student: 'stu_demo_ananya',
  batch: 'req_demo_cse_2027',
  pendingBatch: 'req_demo_pending_ece',
  material: 'mat_demo_1',
  assignment: 'asg_demo_1',
  submission: 'sub_demo_1',
};

function isoDay(offsetDays: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function nowIso(): string {
  return new Date().toISOString();
}

async function clearTaskStorage(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const taskKeys = keys.filter((k) => k.startsWith('task.'));
  if (taskKeys.length) await AsyncStorage.multiRemove(taskKeys);
}

async function write(key: string, value: unknown): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

function buildApprovedCollege(): CollegeEnrollment {
  const draft = createDummyCollegeDraft();
  const center = REGIONAL_CENTERS[0];
  const now = nowIso();
  return {
    id: IDS.college,
    createdAt: now,
    updatedAt: now,
    registrationKind: draft.registrationKind as CollegeEnrollment['registrationKind'],
    institutionName: draft.institutionName,
    institutionType: draft.institutionType as CollegeEnrollment['institutionType'],
    collegeStatus: draft.collegeStatus as CollegeEnrollment['collegeStatus'],
    collegeType: draft.collegeType as CollegeEnrollment['collegeType'],
    affiliationNumber: draft.affiliationNumber,
    affiliatedUniversity: draft.affiliatedUniversity,
    district: draft.district,
    pinCode: draft.pinCode,
    address: draft.address,
    societyName: draft.societyName,
    contactPersonName: draft.contactPersonName,
    contactDesignation: draft.contactDesignation,
    officialEmail: draft.officialEmail,
    officialMobile: draft.officialMobile,
    registrationFee: 7080,
    feeAcknowledged: true,
    passwordHash: draft.password,
    status: 'approved',
    reviewedAt: now,
    reviewedBy: 'admin@task.telangana.gov.in',
    regionalCenterId: center.id,
    regionalCenterName: center.name,
    notifications: [
      {
        id: 'ntf_demo_welcome',
        audience: 'college_admin',
        enrollmentId: IDS.college,
        title: 'College approved',
        body: 'Vivekananda Degree & PG College (Demo) is approved for TASK programs.',
        createdAt: now,
        read: false,
      },
    ],
  };
}

function buildPendingCollege(): CollegeEnrollment {
  const now = nowIso();
  const center = REGIONAL_CENTERS[1];
  return {
    id: IDS.pendingCollege,
    createdAt: now,
    updatedAt: now,
    registrationKind: 'NEW',
    institutionName: 'Srinivasa Demo Engineering College',
    institutionType: 'ENGINEERING',
    collegeStatus: 'PRIVATE',
    collegeType: 'CO_ED',
    affiliationNumber: 'DEMO-AFF-9901',
    affiliatedUniversity: 'JNTU Hyderabad',
    district: 'Warangal',
    pinCode: '506001',
    address: 'Demo Engineering Campus, Warangal, Telangana',
    societyName: 'Srinivasa Educational Society (Demo)',
    contactPersonName: 'Prof. Lakshmi Narayana',
    contactDesignation: 'Principal',
    officialEmail: 'principal@srinivasa-demo.ac.in',
    officialMobile: '9999900099',
    registrationFee: 7080,
    feeAcknowledged: true,
    passwordHash: 'College@123',
    status: 'pending',
    regionalCenterId: center.id,
    regionalCenterName: center.name,
    notifications: [],
  };
}

function buildCollegeStudents(): CollegeStudent[] {
  const rows = [
    ['Poojitha Ranabothu', 't26enec00750', '21QU1A0469', 'poojitha@demo.ac.in', 'OC', 'ECE'],
    ['Raghavi Veerapaga', 't26enec00751', '21QU1A0470', 'raghavi@demo.ac.in', 'SC', 'ECE'],
    ['Ananya Reddy', 't26encs00801', '21QU1A0501', 'ananya@demo.ac.in', 'GENERAL', 'CSE'],
    ['Sai Kumar', 't26enit00812', '21QU1A1208', 'sai@demo.ac.in', 'OC', 'IT'],
    ['Keerthi Sharma', 't26enae00820', '21QU1A0544', 'keerthi@demo.ac.in', 'OC', 'AI & ML'],
  ] as const;

  return rows.map((r, i) => ({
    id: `stu_college_${i + 1}`,
    fullName: r[0],
    username: r[1],
    hallTicketNo: r[2],
    email: r[3],
    caste: r[4],
    branch: r[5],
    status: 'Active' as const,
    enrollmentId: IDS.college,
  }));
}

function buildApprovedTrainer(): TrainerRecord {
  const draft = createDemoTrainerDraft();
  const now = nowIso();
  return {
    id: IDS.trainer,
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email.trim().toLowerCase(),
    mobile: draft.mobile,
    skills: draft.skills,
    bio: draft.bio,
    experienceYears: draft.experienceYears,
    city: draft.city,
    status: 'active',
    reviewedAt: now,
    reviewedBy: 'TASK Administrator',
    passwordHash: draft.password,
    profileComplete: true,
    resume: draft.resume,
    certificates: draft.certificates.map((c, i) => ({
      id: `cert_demo_${i + 1}`,
      title: c.title,
      issuer: c.issuer,
      year: c.year,
      file: c.file,
    })),
    achievements: draft.achievements.map((a, i) => ({
      id: `ach_demo_${i + 1}`,
      title: a.title,
      description: a.description,
      year: a.year,
    })),
    createdAt: now,
    updatedAt: now,
    createdBy: 'task_admin',
  };
}

function buildPendingTrainer(): TrainerRecord {
  const draft = createTrainerRegistrationSeed();
  const now = nowIso();
  return {
    id: IDS.pendingTrainer,
    firstName: draft.firstName,
    lastName: draft.lastName,
    email: draft.email.trim().toLowerCase(),
    mobile: draft.mobile,
    skills: draft.skills,
    bio: draft.bio,
    experienceYears: draft.experienceYears,
    city: draft.city,
    status: 'pending',
    passwordHash: draft.password,
    profileComplete: true,
    resume: draft.resume,
    certificates: draft.certificates.map((c, i) => ({
      id: `cert_pending_${i + 1}`,
      title: c.title,
      issuer: c.issuer,
      year: c.year,
      file: c.file,
    })),
    achievements: draft.achievements.map((a, i) => ({
      id: `ach_pending_${i + 1}`,
      title: a.title,
      description: a.description,
      year: a.year,
    })),
    createdAt: now,
    updatedAt: now,
    createdBy: 'self',
  };
}

function buildDemoStudent(college: CollegeEnrollment): StudentRecord {
  const now = nowIso();
  return {
    id: IDS.student,
    createdAt: now,
    firstName: DUMMY_STUDENT.firstName,
    lastName: DUMMY_STUDENT.lastName,
    mobile: DUMMY_STUDENT.mobile,
    email: DUMMY_STUDENT.email,
    aadhaarNumber: '',
    category: 'GENERAL',
    casteCertificateProvided: false,
    institutionType: college.institutionType,
    affiliatedUniversity: college.affiliatedUniversity,
    district: college.district,
    enrollmentId: college.id,
    collegeName: college.institutionName,
    collegeRollNo: '21QU1A0501',
    yearOfGraduation: '2027',
    branch: 'CSE',
    registrationFee: 500,
    passwordHash: DUMMY_STUDENT.password,
    username: 't26encs00801',
    status: 'Active',
  };
}

function buildBatches(college: CollegeEnrollment, trainer: TrainerRecord): CourseRequest[] {
  const course =
    SEED_COURSES.find((c) => c.title.includes('21st Century')) ?? SEED_COURSES[0];
  const tech =
    SEED_COURSES.find((c) => c.category === 'Technology' && c.enabled) ?? SEED_COURSES[1];
  const now = nowIso();

  const active: CourseRequest = {
    id: IDS.batch,
    enrollmentId: college.id,
    collegeName: college.institutionName,
    courseId: course.id,
    courseName: course.title,
    category: course.category,
    yearOfGraduation: '2027',
    branch: 'CSE',
    startDate: isoDay(-2),
    endDate: isoDay(10),
    batchSize: 50,
    status: 'approved',
    requestedOn: now,
    reviewedAt: now,
    adminRemark: 'Demo approved batch for CSE · 2027',
    trainerId: trainer.id,
    trainerName: `${trainer.firstName} ${trainer.lastName}`,
    trainerEmail: trainer.email,
    trainerMobile: trainer.mobile,
    trainerSkills: trainer.skills.join(', '),
    trainerCity: trainer.city,
    trainerExperienceYears: trainer.experienceYears,
  };

  const pending: CourseRequest = {
    id: IDS.pendingBatch,
    enrollmentId: college.id,
    collegeName: college.institutionName,
    courseId: tech.id,
    courseName: tech.title,
    category: tech.category,
    yearOfGraduation: '2026',
    branch: 'ECE',
    startDate: isoDay(14),
    endDate: isoDay(19),
    batchSize: 45,
    status: 'pending',
    requestedOn: now,
  };

  return [active, pending];
}

function buildTrainingRegistration(
  student: StudentRecord,
  batch: CourseRequest,
): TrainingRegistration {
  return {
    id: 'trg_demo_1',
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    studentEmail: student.email,
    courseRequestId: batch.id,
    courseName: batch.courseName,
    category: batch.category,
    collegeName: batch.collegeName,
    enrollmentId: batch.enrollmentId,
    branch: batch.branch,
    yearOfGraduation: batch.yearOfGraduation,
    startDate: batch.startDate,
    endDate: batch.endDate,
    status: 'registered',
    registeredAt: nowIso(),
  };
}

function buildSessionContent(trainer: TrainerRecord, student: StudentRecord) {
  const now = nowIso();
  const materials: SessionMaterial[] = [
    {
      id: IDS.material,
      requestId: IDS.batch,
      trainerId: trainer.id,
      title: 'Day-1 workshop slides',
      description: 'Introduction deck for transferable skills workshop.',
      file: {
        fileName: 'Day1_Transferable_Skills.pdf',
        sizeLabel: '1.2 MB',
        uploadedAt: now,
      },
      createdAt: now,
    },
  ];

  const assignments: SessionAssignment[] = [
    {
      id: IDS.assignment,
      requestId: IDS.batch,
      trainerId: trainer.id,
      title: 'Reflection worksheet',
      instructions: 'Submit a one-page reflection on workplace communication.',
      dueDate: isoDay(5),
      file: {
        fileName: 'Reflection_Template.docx',
        sizeLabel: '84 KB',
        uploadedAt: now,
      },
      createdAt: now,
    },
  ];

  const attendance: SessionAttendance[] = [
    {
      id: 'att_demo_1',
      requestId: IDS.batch,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      sessionDate: isoDay(-1),
      status: 'present',
      markedByTrainerId: trainer.id,
      updatedAt: now,
    },
    {
      id: 'att_demo_2',
      requestId: IDS.batch,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      sessionDate: isoDay(0),
      status: 'present',
      markedByTrainerId: trainer.id,
      updatedAt: now,
    },
  ];

  const submissions: AssignmentSubmission[] = [
    {
      id: IDS.submission,
      assignmentId: IDS.assignment,
      requestId: IDS.batch,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      file: {
        fileName: 'Ananya_Reflection.pdf',
        sizeLabel: '220 KB',
        uploadedAt: now,
      },
      notes: 'Submitted for demo review.',
      status: 'submitted',
      submittedAt: now,
    },
  ];

  return { materials, assignments, attendance, submissions };
}

export type DemoSeedResult = {
  version: string;
  forced: boolean;
  alreadyReady: boolean;
};

/**
 * Ensures a consistent demo dataset is present.
 * Pass `force: true` to wipe local data and reload fresh dummy records.
 */
export async function ensureDemoData(options?: {
  force?: boolean;
}): Promise<DemoSeedResult> {
  const force = options?.force === true;
  const rawMeta = await AsyncStorage.getItem(META_KEY);
  const meta = rawMeta ? (JSON.parse(rawMeta) as { version?: string }) : null;

  if (!force && meta?.version === DEMO_SEED_VERSION) {
    return { version: DEMO_SEED_VERSION, forced: false, alreadyReady: true };
  }

  await clearTaskStorage();

  const college = buildApprovedCollege();
  const pendingCollege = buildPendingCollege();
  const trainer = buildApprovedTrainer();
  const pendingTrainer = buildPendingTrainer();
  const student = buildDemoStudent(college);
  const batches = buildBatches(college, trainer);
  const activeBatch = batches[0];
  const training = buildTrainingRegistration(student, activeBatch);
  const session = buildSessionContent(trainer, student);

  await write('task.collegeRegistrations.v2', [college, pendingCollege]);
  await write('task.courses.v3', SEED_COURSES.map((c) => ({ ...c, enabled: c.enabled !== false })));
  await write('task.students.v1', buildCollegeStudents());
  await write('task.trainers.v2', [trainer, pendingTrainer]);
  await write('task.studentRegistrations.v1', [student]);
  await write('task.courseRequests.v1', batches);
  await write('task.trainingRegistrations.v1', [training]);
  await write('task.sessionMaterials.v1', session.materials);
  await write('task.sessionAssignments.v1', session.assignments);
  await write('task.sessionAttendance.v1', session.attendance);
  await write('task.assignmentSubmissions.v1', session.submissions);
  await write('task.sessionCertificates.v1', []);
  await write('task.trainerFeedback.v1', []);
  await write('task.trainerMessages.v1', []);
  await write('task.trainerQueries.v1', []);
  await write(META_KEY, {
    version: DEMO_SEED_VERSION,
    loadedAt: nowIso(),
    notes: {
      college: college.officialEmail,
      student: student.email,
      trainer: trainer.email,
      pendingTrainer: pendingTrainer.email,
      otps: { email: '111111', mobile: '222222' },
    },
  });

  return { version: DEMO_SEED_VERSION, forced: force, alreadyReady: false };
}

export const DEMO_CREDENTIALS_SUMMARY = [
  'Super Admin — superadmin@task.telangana.gov.in / SuperAdmin@123',
  'TASK Admin — admin@task.telangana.gov.in / TaskAdmin@123',
  'College — admin@vivekananda-demo.ac.in / College@123',
  'Student — student.demo@gmail.com / Student@123',
  'Trainer — trainer.demo@task.telangana.gov.in / Trainer@123',
  'OTPs — Email 111111 · Mobile 222222',
].join('\n');
