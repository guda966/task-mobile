import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStudentRegistrationFee } from '../constants/student';
import { collegePortalApi } from './collegePortalApi';
import type { CollegeEnrollment, SessionUser } from '../types/enrollment';
import type { StudentDraft, StudentRecord } from '../types/student';

const STUDENTS_REG_KEY = 'task.studentRegistrations.v1';
const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';
const SESSION_KEY = 'task.session.v2';
const COLLEGE_STUDENTS_KEY = 'task.students.v1';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(value));
}

export const studentApi = {
  async listApprovedColleges(): Promise<CollegeEnrollment[]> {
    await delay();
    await collegePortalApi.ensureDemoApprovedCollege();
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    return enrollments.filter((e) => e.status === 'approved');
  },

  async listStudents(): Promise<StudentRecord[]> {
    return readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
  },

  async getStudent(id: string): Promise<StudentRecord | null> {
    const items = await this.listStudents();
    return items.find((s) => s.id === id) ?? null;
  },

  async getStudentByEmail(email: string): Promise<StudentRecord | null> {
    const items = await this.listStudents();
    return items.find((s) => s.email === email.trim().toLowerCase()) ?? null;
  },

  async submitStudent(draft: StudentDraft): Promise<StudentRecord> {
    await delay(500);
    const colleges = await this.listApprovedColleges();
    const college = colleges.find((c) => c.id === draft.enrollmentId);
    if (!college) {
      throw new Error(
        'Selected college is not registered/approved with TASK. Individual applications from non-registered colleges are not accepted.',
      );
    }

    const email = draft.email.trim().toLowerCase();
    const existing = await this.getStudentByEmail(email);
    if (existing) throw new Error('This email is already registered as a student.');

    const fee = getStudentRegistrationFee(draft.institutionType, draft.category);
    const id = uid('stu');
    const username = `t${draft.yearOfGraduation.slice(-2)}${draft.branch
      .replace(/[^a-zA-Z]/g, '')
      .slice(0, 4)
      .toLowerCase()}${Math.floor(Math.random() * 90000 + 10000)}`;

    const record: StudentRecord = {
      id,
      createdAt: new Date().toISOString(),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      mobile: draft.mobile.trim(),
      email,
      aadhaarNumber: draft.aadhaarNumber.trim(),
      category: draft.category as StudentRecord['category'],
      casteCertificateProvided: draft.casteCertificateProvided,
      institutionType: draft.institutionType as StudentRecord['institutionType'],
      affiliatedUniversity: draft.affiliatedUniversity,
      district: draft.district,
      enrollmentId: college.id,
      collegeName: college.institutionName,
      collegeRollNo: draft.collegeRollNo.trim(),
      yearOfGraduation: draft.yearOfGraduation,
      branch: draft.branch,
      registrationFee: fee,
      passwordHash: draft.password,
      username,
      status: 'Active',
    };

    const items = await this.listStudents();
    items.unshift(record);
    await writeJson(STUDENTS_REG_KEY, items);

    // Mirror into college students list for College Admin Students module
    const collegeStudents = await readJson<
      {
        id: string;
        fullName: string;
        username: string;
        hallTicketNo: string;
        email: string;
        caste: string;
        branch: string;
        semester: string;
        yearOfGraduation: string;
        status: 'Active' | 'Inactive';
        enrollmentId: string;
      }[]
    >(COLLEGE_STUDENTS_KEY, []);
    collegeStudents.unshift({
      id: record.id,
      fullName: `${record.firstName} ${record.lastName}`,
      username: record.username,
      hallTicketNo: record.collegeRollNo,
      email: record.email,
      caste: record.category,
      branch: record.branch,
      semester: '',
      yearOfGraduation: record.yearOfGraduation,
      status: 'Active',
      enrollmentId: record.enrollmentId,
    });
    await writeJson(COLLEGE_STUDENTS_KEY, collegeStudents);

    const session: SessionUser = {
      role: 'student',
      email: record.email,
      name: `${record.firstName} ${record.lastName}`,
      studentId: record.id,
      enrollmentId: record.enrollmentId,
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));

    return record;
  },

  async signIn(email: string, password: string): Promise<SessionUser | null> {
    // Bootstrap demo student on first student demo login attempt
    if (
      email.trim().toLowerCase() === 'student.demo@gmail.com' &&
      password === 'Student@123'
    ) {
      const existing = await this.getStudentByEmail(email);
      if (!existing) {
        const colleges = await this.listApprovedColleges();
        const college = colleges[0];
        if (college) {
          await this.submitStudent({
            firstName: 'Ananya',
            lastName: 'Reddy',
            mobile: '9876543210',
            email: 'student.demo@gmail.com',
            aadhaarNumber: '',
            category: 'GENERAL',
            casteCertificateProvided: false,
            institutionType: college.institutionType,
            affiliatedUniversity: college.affiliatedUniversity,
            district: college.district,
            enrollmentId: college.id,
            collegeRollNo: '21QU1A0501',
            yearOfGraduation: '2027',
            branch: 'CSE',
            password: 'Student@123',
            confirmPassword: 'Student@123',
            feeAcknowledged: true,
            termsAccepted: true,
            declarationAccepted: true,
          });
        }
      }
    }

    const match = await this.getStudentByEmail(email);
    if (!match || match.passwordHash !== password) return null;
    return {
      role: 'student',
      email: match.email,
      name: `${match.firstName} ${match.lastName}`,
      studentId: match.id,
      enrollmentId: match.enrollmentId,
    };
  },
};
