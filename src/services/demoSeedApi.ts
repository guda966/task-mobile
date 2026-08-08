import AsyncStorage from '@react-native-async-storage/async-storage';
import { SEED_COURSES } from '../constants/courses';
import { createDummyCollegeDraft } from '../constants/demoData';
import { REGIONAL_CENTERS, RC_MEMBERSHIP_FEE } from '../constants/lookups';
import { DUMMY_STUDENT } from '../constants/student';
import { createDemoTrainerDraft } from '../constants/trainer';
import { adminUsersApi } from './adminUsersApi';
import type { CollegeStudent, CourseRequest } from '../types/collegePortal';
import type { CollegeEnrollment } from '../types/enrollment';
import type {
  AssignmentSubmission,
  SessionAssignment,
  SessionAttendance,
  SessionEvidence,
  SessionMaterial,
} from '../types/sessionContent';
import type { RcMembership } from '../types/regionalCentre';
import { addMonthsIso } from '../types/regionalCentre';
import type { StudentRecord } from '../types/student';
import type { TrainerRecord } from '../types/trainer';
import type { TrainingRegistration } from '../types/training';

/** Bump this when the seed shape changes so browsers auto-refresh once. */
export const DEMO_SEED_VERSION = '2026-08-08-demo-v17';

const META_KEY = 'task.demoSeed.meta.v1';

const IDS = {
  college: 'enr_demo_vivekananda',
  pendingCollege: 'enr_demo_pending',
  trainer: 'trn_demo_ananya',
  student: 'stu_demo_ananya',
  studentRohan: 'stu_demo_rohan',
  batch: 'req_demo_cse_2027',
  pendingBatch: 'req_demo_pending_ece',
  rcApprovedBatch: 'req_demo_rc_approved',
  rcPendingBatch: 'req_demo_rc_pending',
  material: 'mat_demo_1',
  assignment: 'asg_demo_1',
  assignment2: 'asg_demo_2',
  assignment3: 'asg_demo_3',
  submission: 'sub_demo_1',
  submissionQuiz: 'sub_demo_quiz',
  evidence: 'evd_demo_1',
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
  const center =
    REGIONAL_CENTERS.find((c) => c.id === 'rc-hyd-masabtank') ?? REGIONAL_CENTERS[0];
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
        title: 'Welcome to TASK College portal',
        body: 'Your college is active. You can manage students, request courses, and view the training calendar from the menu.',
        createdAt: now,
        read: false,
      },
      {
        id: 'ntf_demo_course',
        audience: 'college_admin',
        enrollmentId: IDS.college,
        title: 'Course request update',
        body: '21st Century Transferrable Skills is approved for CSE. Open Calendar to see the dates.',
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
    district: 'Warangal (urban)',
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

/** Extra approved colleges for student registration cascade / search demos. */
export function buildSampleApprovedColleges(): CollegeEnrollment[] {
  const now = nowIso();
  const samples: Array<{
    id: string;
    name: string;
    type: CollegeEnrollment['institutionType'];
    university: string;
    district: string;
    aff: string;
    email: string;
    centerIndex: number;
  }> = [
    {
      id: 'enr_demo_jntuh_eng_hyd',
      name: 'Aurora Engineering College (Demo)',
      type: 'ENGINEERING',
      university: 'JNTU Hyderabad',
      district: 'Hyderabad',
      aff: 'DEMO-AFF-3101',
      email: 'admin@aurora-eng-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_jntuh_eng_rr',
      name: 'CVR College of Engineering (Demo)',
      type: 'ENGINEERING',
      university: 'JNTU Hyderabad',
      district: 'Ranga Reddy',
      aff: 'DEMO-AFF-3102',
      email: 'admin@cvr-eng-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_ou_deg_hyd',
      name: 'Nizam College (Demo)',
      type: 'DEGREE',
      university: 'Osmania University',
      district: 'Hyderabad',
      aff: 'DEMO-AFF-3201',
      email: 'admin@nizam-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_ou_pg_medchal',
      name: 'St. Ann\'s Degree & PG College (Demo)',
      type: 'DEGREE_PG',
      university: 'Osmania University',
      district: 'Medchal',
      aff: 'DEMO-AFF-3202',
      email: 'admin@stann-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_ku_eng_wgl',
      name: 'Kakatiya Institute of Technology (Demo)',
      type: 'ENGINEERING',
      university: 'Kakatiya University',
      district: 'Warangal (urban)',
      aff: 'DEMO-AFF-3301',
      email: 'admin@kit-wgl-demo.ac.in',
      centerIndex: 1,
    },
    {
      id: 'enr_demo_ku_deg_knr',
      name: 'Government Degree College Karimnagar (Demo)',
      type: 'DEGREE',
      university: 'Kakatiya University',
      district: 'Karimnagar',
      aff: 'DEMO-AFF-3302',
      email: 'admin@gdc-knr-demo.ac.in',
      centerIndex: 2,
    },
    {
      id: 'enr_demo_tu_deg_nzb',
      name: 'Telangana University College (Demo)',
      type: 'DEGREE_PG',
      university: 'Telangana University',
      district: 'Nizamabad',
      aff: 'DEMO-AFF-3401',
      email: 'admin@tu-nzb-demo.ac.in',
      centerIndex: 3,
    },
    {
      id: 'enr_demo_pharma_hyd',
      name: 'G. Pulla Reddy College of Pharmacy (Demo)',
      type: 'PHARMA',
      university: 'Osmania University',
      district: 'Hyderabad',
      aff: 'DEMO-AFF-3501',
      email: 'admin@gpr-pharma-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_poly_rr',
      name: 'Government Polytechnic Ranga Reddy (Demo)',
      type: 'POLYTECHNIC',
      university: 'Other / Autonomous',
      district: 'Ranga Reddy',
      aff: 'DEMO-AFF-3601',
      email: 'admin@gpt-rr-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_mba_hyd',
      name: 'ICFAI Business School Hyderabad (Demo)',
      type: 'MBA',
      university: 'Other / Autonomous',
      district: 'Hyderabad',
      aff: 'DEMO-AFF-3701',
      email: 'admin@ibs-hyd-demo.ac.in',
      centerIndex: 0,
    },
    {
      id: 'enr_demo_mgu_nlr',
      name: 'Mahatma Gandhi University College (Demo)',
      type: 'DEGREE',
      university: 'Mahatma Gandhi University',
      district: 'Nalgonda',
      aff: 'DEMO-AFF-3801',
      email: 'admin@mgu-nlr-demo.ac.in',
      centerIndex: 5,
    },
    {
      id: 'enr_demo_palamuru_mbnr',
      name: 'Palamuru University Degree College (Demo)',
      type: 'DEGREE_PG',
      university: 'Palamuru University',
      district: 'Mahbubnagar',
      aff: 'DEMO-AFF-3901',
      email: 'admin@pu-mbnr-demo.ac.in',
      centerIndex: 4,
    },
  ];

  return samples.map((s) => {
    const center = REGIONAL_CENTERS[s.centerIndex] ?? REGIONAL_CENTERS[0];
    return {
      id: s.id,
      createdAt: now,
      updatedAt: now,
      registrationKind: 'NEW' as const,
      institutionName: s.name,
      institutionType: s.type,
      collegeStatus: 'PRIVATE' as const,
      collegeType: 'CO_ED' as const,
      affiliationNumber: s.aff,
      affiliatedUniversity: s.university,
      district: s.district,
      pinCode: '500001',
      address: `${s.name}, ${s.district}, Telangana (sample data for testing)`,
      societyName: `${s.name} Society (Demo)`,
      contactPersonName: 'Demo Principal',
      contactDesignation: 'Principal',
      officialEmail: s.email,
      officialMobile: '9999910000',
      registrationFee: 7080,
      feeAcknowledged: true,
      passwordHash: 'College@123',
      status: 'approved' as const,
      reviewedAt: now,
      reviewedBy: 'admin@task.telangana.gov.in',
      regionalCenterId: center.id,
      regionalCenterName: center.name,
      notifications: [],
    };
  });
}

function buildCollegeStudents(): CollegeStudent[] {
  const rows = [
    ['Poojitha Ranabothu', 't26enec00750', '21QU1A0469', 'poojitha@demo.ac.in', 'OC', 'ECE', '6', '2026'],
    ['Raghavi Veerapaga', 't26enec00751', '21QU1A0470', 'raghavi@demo.ac.in', 'SC', 'ECE', '6', '2026'],
    ['Ananya Reddy', 't26encs00801', '21QU1A0501', 'ananya@demo.ac.in', 'GENERAL', 'CSE', '5', '2027'],
    ['Sai Kumar', 't26enit00812', '21QU1A1208', 'sai@demo.ac.in', 'OC', 'IT', '4', '2028'],
    ['Keerthi Sharma', 't26enae00820', '21QU1A0544', 'keerthi@demo.ac.in', 'OC', 'AI & ML', '5', '2027'],
    ['Rohan Varma', 't26encs00802', '21QU1A0502', 'rohan@demo.ac.in', 'OC', 'CSE', '5', '2027'],
  ] as const;

  return rows.map((r, i) => ({
    id: i === 2 ? IDS.student : i === 5 ? IDS.studentRohan : `stu_college_${i + 1}`,
    fullName: r[0],
    username: r[1],
    hallTicketNo: r[2],
    email: r[3],
    caste: r[4],
    branch: r[5],
    semester: r[6],
    yearOfGraduation: r[7],
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
    tenth: {
      board: 'BSE Telangana',
      schoolName: 'Demo High School, Hyderabad',
      yearOfPassing: '2019',
      percentage: '92.4',
      hallTicketNo: 'TS19X1001',
    },
    twelfth: {
      board: 'TSBIE / Telangana Board',
      schoolName: 'Demo Junior College, Hyderabad',
      yearOfPassing: '2021',
      percentage: '88.6',
      hallTicketNo: 'TS21I2001',
    },
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
    requesterType: 'college',
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
    requesterType: 'college',
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

function buildRcBatches(
  center: (typeof REGIONAL_CENTERS)[number],
  _trainer: TrainerRecord,
): CourseRequest[] {
  const tech =
    SEED_COURSES.find((c) => c.category === 'Technology' && c.enabled) ?? SEED_COURSES[1];
  const soft =
    SEED_COURSES.find((c) => c.title.includes('Campus to Corporate')) ?? SEED_COURSES[0];
  const now = nowIso();

  const approved: CourseRequest = {
    id: IDS.rcApprovedBatch,
    enrollmentId: '',
    collegeName: center.name,
    requesterType: 'regional_center',
    regionalCenterId: center.id,
    regionalCenterName: center.name,
    courseId: tech.id,
    courseName: tech.title,
    category: tech.category,
    yearOfGraduation: 'All',
    branch: 'All RC members',
    // After the college demo batch so calendars stay clear; left unassigned so the
    // demo trainer is not double-booked (TASK Admin assigns a trainer in the walkthrough).
    startDate: isoDay(14),
    endDate: isoDay(19),
    batchSize: 35,
    status: 'approved',
    requestedOn: now,
    reviewedAt: now,
    adminRemark: 'Demo approved RC batch — assign a trainer before delivery',
  };

  const pending: CourseRequest = {
    id: IDS.rcPendingBatch,
    enrollmentId: '',
    collegeName: center.name,
    requesterType: 'regional_center',
    regionalCenterId: center.id,
    regionalCenterName: center.name,
    courseId: soft.id,
    courseName: soft.title,
    category: soft.category,
    yearOfGraduation: 'All',
    branch: 'All RC members',
    startDate: isoDay(20),
    endDate: isoDay(25),
    batchSize: 40,
    status: 'pending',
    requestedOn: now,
  };

  return [approved, pending];
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

function buildRohanStudent(college: CollegeEnrollment): StudentRecord {
  const now = nowIso();
  return {
    id: IDS.studentRohan,
    createdAt: now,
    firstName: 'Rohan',
    lastName: 'Varma',
    mobile: '9876500102',
    email: 'rohan@demo.ac.in',
    aadhaarNumber: '',
    category: 'OC',
    casteCertificateProvided: false,
    institutionType: college.institutionType,
    affiliatedUniversity: college.affiliatedUniversity,
    district: college.district,
    enrollmentId: college.id,
    collegeName: college.institutionName,
    collegeRollNo: '21QU1A0502',
    yearOfGraduation: '2027',
    branch: 'CSE',
    tenth: {
      board: 'CBSE',
      schoolName: 'Demo Public School, Secunderabad',
      yearOfPassing: '2019',
      percentage: '90.0',
      hallTicketNo: 'CB19X2002',
    },
    twelfth: {
      board: 'CBSE',
      schoolName: 'Demo Public School, Secunderabad',
      yearOfPassing: '2021',
      percentage: '86.2',
      hallTicketNo: 'CB21I2002',
    },
    registrationFee: 500,
    passwordHash: 'Student@123',
    username: 't26encs00802',
    status: 'Active',
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
      description:
        'Read before tomorrow’s class. Covers communication, teamwork, and problem-solving basics used in the workshop.',
      file: {
        fileName: 'Day1_Transferable_Skills.pdf',
        sizeLabel: '1.2 MB',
        uploadedAt: now,
      },
      createdAt: now,
    },
    {
      id: 'mat_demo_2',
      requestId: IDS.batch,
      trainerId: trainer.id,
      title: 'Workplace examples handout',
      description:
        'Short case studies discussed in class. Keep this open while doing the reflection assignment.',
      file: {
        fileName: 'Workplace_Examples_Handout.pdf',
        sizeLabel: '640 KB',
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
      instructions:
        'Write a one-page reflection on workplace communication. Use the template, save as PDF, and submit before the due date.',
      dueDate: isoDay(2),
      file: {
        fileName: 'Reflection_Template.docx',
        sizeLabel: '84 KB',
        uploadedAt: now,
      },
      createdAt: now,
    },
    {
      id: IDS.assignment2,
      requestId: IDS.batch,
      trainerId: trainer.id,
      title: 'Team discussion summary',
      instructions:
        'Summarise your team discussion in 8–10 lines. Upload a PDF named with your roll number.',
      dueDate: isoDay(5),
      createdAt: now,
    },
    {
      id: IDS.assignment3,
      requestId: IDS.batch,
      trainerId: trainer.id,
      title: 'Soft skills self-check',
      instructions:
        'Complete the short self-assessment worksheet and upload it. Trainer will mark out of 20.',
      dueDate: isoDay(-1),
      file: {
        fileName: 'SoftSkills_SelfCheck.pdf',
        sizeLabel: '110 KB',
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
      status: 'needs_revision',
      trainerRemark: 'Add one real workplace example and resubmit.',
      submittedAt: now,
      reviewedAt: now,
    },
    {
      id: IDS.submissionQuiz,
      assignmentId: IDS.assignment3,
      requestId: IDS.batch,
      studentId: student.id,
      studentName: `${student.firstName} ${student.lastName}`,
      file: {
        fileName: 'Ananya_SoftSkills_Check.pdf',
        sizeLabel: '180 KB',
        uploadedAt: now,
      },
      status: 'accepted',
      score: 16,
      maxScore: 20,
      trainerRemark: 'Good self-awareness. Keep practising examples.',
      submittedAt: now,
      reviewedAt: now,
    },
  ];

  const evidenceSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
      <rect fill="#0F6E6E" width="100%" height="100%"/>
      <text x="50%" y="46%" fill="#fff" font-size="26" text-anchor="middle" font-family="sans-serif">Demo session photo</text>
      <text x="50%" y="56%" fill="#D7EEEE" font-size="16" text-anchor="middle" font-family="sans-serif">Geo-tagged evidence</text>
    </svg>`,
  );

  const evidence: SessionEvidence[] = [
    {
      id: IDS.evidence,
      requestId: IDS.batch,
      trainerId: trainer.id,
      trainerName: `${trainer.firstName} ${trainer.lastName}`,
      sessionDate: isoDay(0),
      caption: 'Campus lab block — transferable skills workshop (demo)',
      photo: {
        fileName: 'session_day1_lab.jpg',
        sizeLabel: '210 KB',
        uploadedAt: now,
        dataUrl: `data:image/svg+xml;charset=utf-8,${evidenceSvg}`,
      },
      geo: {
        latitude: 17.4065,
        longitude: 78.4772,
        accuracyMeters: 18,
        capturedAt: now,
      },
      createdAt: now,
    },
  ];

  return { materials, assignments, attendance, submissions, evidence };
}

function buildStudentAlerts(student: StudentRecord) {
  const now = nowIso();
  return [
    {
      id: 'sntf_demo_task_1',
      studentId: student.id,
      source: 'task' as const,
      title: 'Welcome to TASK Student portal',
      body: 'Your registration is active. Open Trainings to view materials, assignments, and attendance for your batch.',
      createdAt: now,
      read: false,
      relatedRequestId: IDS.batch,
    },
    {
      id: 'sntf_demo_college_1',
      studentId: student.id,
      source: 'college' as const,
      title: 'College notice: attend Day-1 workshop',
      body: `${student.collegeName} reminds CSE students to attend the transferable skills workshop on campus and submit assignments on time.`,
      createdAt: now,
      read: false,
      relatedRequestId: IDS.batch,
    },
    {
      id: 'sntf_demo_task_session_1',
      studentId: student.id,
      source: 'task' as const,
      title: 'TASK session scheduled: Career readiness clinic',
      body: 'Online · open for your college. Open Trainings → TASK sessions to enrol.',
      createdAt: now,
      read: false,
      relatedProgramSessionId: 'tps_demo_1',
    },
  ];
}

function buildTaskBroadcastSeed(student: StudentRecord, college: CollegeEnrollment) {
  const now = nowIso();
  const announcement = {
    id: 'tann_demo_1',
    kind: 'announcement' as const,
    title: 'State-wide soft-skills drive this month',
    body: 'TASK is running employability programmes across Telangana. Check Alerts and Trainings → TASK sessions for schedules that match your college.',
    scope: {
      kind: 'state' as const,
      label: 'Entire Telangana (all registered students)',
    },
    createdAt: now,
    createdBy: 'TASK Admin',
    notifiedCount: 2,
  };
  const session = {
    id: 'tps_demo_1',
    kind: 'session' as const,
    title: 'Career readiness clinic',
    description:
      'Interactive clinic covering resume polish, interview basics, and TASK placement pathways. Bring your updated CV.',
    mode: 'online' as const,
    startDate: '2026-08-20',
    endDate: '2026-08-20',
    startTime: '10:00',
    endTime: '13:00',
    venueOrLink: 'https://meet.task.telangana.gov.in/career-clinic-demo',
    instructorName: 'TASK Facilitation Team',
    maxSeats: 120,
    scope: {
      kind: 'college' as const,
      enrollmentId: college.id,
      label: `College · ${college.institutionName}`,
    },
    createdAt: now,
    createdBy: 'TASK Admin',
    notifiedCount: 2,
    status: 'open' as const,
  };
  return { announcement, session, studentId: student.id };
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

  await adminUsersApi.ensureSeedAdmins();

  const college = buildApprovedCollege();
  const sampleColleges = buildSampleApprovedColleges();
  const pendingCollege = buildPendingCollege();
  const trainer = buildApprovedTrainer();
  const student = buildDemoStudent(college);
  const rohan = buildRohanStudent(college);
  const batches = buildBatches(college, trainer);
  const rcCenter =
    REGIONAL_CENTERS.find((c) => c.id === 'rc-hyd-masabtank') ?? REGIONAL_CENTERS[0];
  const rcBatches = buildRcBatches(rcCenter, trainer);
  const activeBatch = batches[0];
  const training = buildTrainingRegistration(student, activeBatch);
  const trainingRohan: TrainingRegistration = {
    ...buildTrainingRegistration(rohan, activeBatch),
    id: 'trg_demo_2',
  };
  const session = buildSessionContent(trainer, student);

  await write('task.collegeRegistrations.v2', [college, ...sampleColleges, pendingCollege]);
  await write('task.courses.v3', SEED_COURSES.map((c) => ({ ...c, enabled: c.enabled !== false })));
  await write('task.students.v1', buildCollegeStudents());
  await write('task.trainers.v2', [trainer]);
  await write('task.studentRegistrations.v1', [student, rohan]);
  await write('task.courseRequests.v1', [...batches, ...rcBatches]);
  await write('task.trainingRegistrations.v1', [training, trainingRohan]);
  await write('task.sessionMaterials.v1', session.materials);
  await write('task.sessionAssignments.v1', session.assignments);
  await write('task.sessionAttendance.v1', session.attendance);
  await write('task.assignmentSubmissions.v1', session.submissions);
  await write('task.studentNotifications.v1', buildStudentAlerts(student));
  await write('task.sessionCertificates.v1', []);
  await write('task.sessionEvidence.v1', session.evidence);
  await write('task.trainerFeedback.v1', []);
  await write('task.trainerMessages.v1', []);
  await write('task.trainerQueries.v1', []);
  const broadcast = buildTaskBroadcastSeed(student, college);
  await write('task.adminAnnouncements.v1', [broadcast.announcement]);
  await write('task.adminProgramSessions.v1', [broadcast.session]);
  await write('task.adminProgramEnrollments.v1', []);

  const rcStarted = nowIso();
  const rcMembership: RcMembership = {
    id: 'rcm_demo_1',
    studentId: student.id,
    studentName: `${student.firstName} ${student.lastName}`,
    studentEmail: student.email,
    collegeName: student.collegeName,
    regionalCenterId: rcCenter.id,
    regionalCenterName: rcCenter.name,
    feePaid: RC_MEMBERSHIP_FEE,
    startedAt: rcStarted,
    expiresAt: addMonthsIso(rcStarted, 6),
    status: 'active',
    createdAt: rcStarted,
  };
  await write('task.rcMemberships.v1', [rcMembership]);
  await write('task.rcSessions.v1', []);
  await write('task.rcSessionEnrollments.v1', []);
  await write('task.rcNotifications.v1', {
    [rcCenter.id]: [
      {
        id: 'ntf_rc_demo_1',
        audience: 'regional_center',
        enrollmentId: '',
        regionalCenterId: rcCenter.id,
        title: 'Course request update',
        body: `${rcBatches[0].courseName} is approved for All RC members (${rcBatches[0].startDate} to ${rcBatches[0].endDate}). Check Calendar for dates.`,
        createdAt: rcStarted,
        read: false,
      },
    ],
  });

  await write('task.corporateRegistrations.v1', [
    {
      id: 'corp_demo_1',
      companyName: 'Demo Corporate Partners Pvt Ltd',
      contactName: 'HR Demo Lead',
      email: 'hr@demo-corporate.in',
      mobile: '9876500011',
      passwordHash: 'Corporate@123',
      status: 'active',
      createdAt: nowIso(),
    },
  ]);
  await write(META_KEY, {
    version: DEMO_SEED_VERSION,
    loadedAt: nowIso(),
    notes: {
      college: college.officialEmail,
      student: student.email,
      trainer: trainer.email,
      corporate: 'hr@demo-corporate.in',
      otps: { email: '111111', mobile: '222222' },
    },
  });

  return { version: DEMO_SEED_VERSION, forced: force, alreadyReady: false };
}

export const DEMO_CREDENTIALS_SUMMARY = [
  'Super Admin — superadmin@task.telangana.gov.in / SuperAdmin@123 (Staff Sign In)',
  'TASK Admin — admin@task.telangana.gov.in / TaskAdmin@123 (Staff Sign In)',
  'Placement — placement@task.telangana.gov.in / Placement@123 (Staff Sign In)',
  'College — admin@vivekananda-demo.ac.in / College@123',
  'Regional Centre — rc.hyderabad@task.telangana.gov.in / RcAdmin@123',
  'Student — student.demo@gmail.com / Student@123',
  'Trainer — trainer.demo@task.telangana.gov.in / Trainer@123',
  'Corporate — hr@demo-corporate.in / Corporate@123',
  'OTPs — Email 111111 · Mobile 222222',
].join('\n');
