import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUMMY_EMAIL_OTP } from '../constants/demoData';
import type { CollegeEnrollment, SessionUser, UserRole } from '../types/enrollment';
import type { StudentRecord } from '../types/student';
import { isValidMobile } from '../utils/validation';

const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';
const STUDENTS_REG_KEY = 'task.studentRegistrations.v1';
const COLLEGE_STUDENTS_KEY = 'task.students.v1';
const TRAINERS_KEY = 'task.trainers.v2';
const SESSION_KEY = 'task.session.v2';
const RESET_OTP_KEY = 'task.resetOtp.v1';
const TASK_ADMIN_PASSWORD_KEY = 'task.taskAdminPassword.v1';

const TASK_ADMIN_EMAIL = 'admin@task.telangana.gov.in';
const TASK_ADMIN_DEFAULT_PASSWORD = 'TaskAdmin@123';
const SUPER_ADMIN_EMAIL = 'superadmin@task.telangana.gov.in';
const SUPER_ADMIN_PASSWORD_KEY = 'task.superAdminPassword.v1';
const SUPER_ADMIN_DEFAULT_PASSWORD = 'SuperAdmin@123';

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

export type AccountKind = UserRole;

export interface AccountLookup {
  role: AccountKind;
  email: string;
  name: string;
  mobile?: string;
  studentId?: string;
  enrollmentId?: string;
  trainerId?: string;
}

export const accountApi = {
  async getTaskAdminPassword(): Promise<string> {
    return (await AsyncStorage.getItem(TASK_ADMIN_PASSWORD_KEY)) || TASK_ADMIN_DEFAULT_PASSWORD;
  },

  async getSuperAdminPassword(): Promise<string> {
    return (await AsyncStorage.getItem(SUPER_ADMIN_PASSWORD_KEY)) || SUPER_ADMIN_DEFAULT_PASSWORD;
  },

  async findAccountByEmail(email: string): Promise<AccountLookup | null> {
    await delay();
    const normalized = email.trim().toLowerCase();

    if (normalized === SUPER_ADMIN_EMAIL) {
      return {
        role: 'super_admin',
        email: SUPER_ADMIN_EMAIL,
        name: 'TASK Super Administrator',
      };
    }

    if (normalized === TASK_ADMIN_EMAIL) {
      return {
        role: 'task_admin',
        email: TASK_ADMIN_EMAIL,
        name: 'TASK Administrator',
      };
    }

    const students = await readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
    const student = students.find((s) => s.email === normalized);
    if (student) {
      return {
        role: 'student',
        email: student.email,
        name: `${student.firstName} ${student.lastName}`,
        mobile: student.mobile,
        studentId: student.id,
        enrollmentId: student.enrollmentId,
      };
    }

    const trainers = await readJson<{ id: string; email: string; firstName: string; lastName: string; mobile: string }[]>(
      TRAINERS_KEY,
      [],
    );
    const trainer = trainers.find((t) => t.email === normalized);
    if (trainer) {
      return {
        role: 'trainer',
        email: trainer.email,
        name: `${trainer.firstName} ${trainer.lastName}`,
        mobile: trainer.mobile,
        trainerId: trainer.id,
      };
    }

    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const college = enrollments.find((e) => e.officialEmail === normalized);
    if (college) {
      return {
        role: 'college_admin',
        email: college.officialEmail,
        name: college.contactPersonName,
        mobile: college.officialMobile,
        enrollmentId: college.id,
      };
    }

    return null;
  },

  async sendPasswordResetOtp(email: string): Promise<{ otp: string; account: AccountLookup }> {
    await delay();
    const account = await this.findAccountByEmail(email);
    if (!account) {
      throw new Error('No account found for this email.');
    }
    const otp = DUMMY_EMAIL_OTP;
    await AsyncStorage.setItem(
      RESET_OTP_KEY,
      JSON.stringify({
        email: account.email,
        otp,
        createdAt: new Date().toISOString(),
      }),
    );
    return { otp, account };
  },

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    await delay(400);
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    const raw = await AsyncStorage.getItem(RESET_OTP_KEY);
    if (!raw) throw new Error('OTP expired. Please request a new one.');
    const saved = JSON.parse(raw) as { email: string; otp: string };
    const normalized = email.trim().toLowerCase();
    if (saved.email !== normalized || saved.otp !== otp.trim()) {
      throw new Error(`Invalid OTP. Demo OTP is ${DUMMY_EMAIL_OTP}.`);
    }

    const account = await this.findAccountByEmail(normalized);
    if (!account) throw new Error('Account not found.');

    if (account.role === 'task_admin') {
      await AsyncStorage.setItem(TASK_ADMIN_PASSWORD_KEY, newPassword);
    } else if (account.role === 'super_admin') {
      await AsyncStorage.setItem(SUPER_ADMIN_PASSWORD_KEY, newPassword);
    } else if (account.role === 'student') {
      const students = await readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
      const index = students.findIndex((s) => s.email === normalized);
      if (index < 0) throw new Error('Student account not found.');
      students[index] = { ...students[index], passwordHash: newPassword };
      await writeJson(STUDENTS_REG_KEY, students);
    } else if (account.role === 'trainer') {
      const trainers = await readJson<{ email: string; passwordHash: string }[]>(TRAINERS_KEY, []);
      const index = trainers.findIndex((t) => t.email === normalized);
      if (index < 0) throw new Error('Trainer account not found.');
      trainers[index] = { ...trainers[index], passwordHash: newPassword };
      await writeJson(TRAINERS_KEY, trainers);
    } else {
      const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
      const index = enrollments.findIndex((e) => e.officialEmail === normalized);
      if (index < 0) throw new Error('College account not found.');
      enrollments[index] = { ...enrollments[index], passwordHash: newPassword };
      await writeJson(ENROLLMENTS_KEY, enrollments);
    }

    await AsyncStorage.removeItem(RESET_OTP_KEY);
  },

  async updateStudentProfile(
    studentId: string,
    input: {
      firstName: string;
      lastName: string;
      mobile: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<SessionUser> {
    await delay(400);
    const students = await readJson<StudentRecord[]>(STUDENTS_REG_KEY, []);
    const index = students.findIndex((s) => s.id === studentId);
    if (index < 0) throw new Error('Student not found.');

    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new Error('First and last name are required.');
    }
    if (!isValidMobile(input.mobile)) {
      throw new Error('Enter a valid 10-digit mobile number.');
    }

    if (input.newPassword) {
      if (!input.currentPassword) throw new Error('Current password is required.');
      if (students[index].passwordHash !== input.currentPassword) {
        throw new Error('Current password is incorrect.');
      }
      if (input.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters.');
      }
    }

    const updated: StudentRecord = {
      ...students[index],
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      mobile: input.mobile.trim(),
      passwordHash: input.newPassword || students[index].passwordHash,
    };
    students[index] = updated;
    await writeJson(STUDENTS_REG_KEY, students);

    // Keep college students list in sync
    const collegeStudents = await readJson<
      { id: string; fullName: string; email: string; [key: string]: unknown }[]
    >(COLLEGE_STUDENTS_KEY, []);
    const cIndex = collegeStudents.findIndex((s) => s.id === studentId);
    if (cIndex >= 0) {
      collegeStudents[cIndex] = {
        ...collegeStudents[cIndex],
        fullName: `${updated.firstName} ${updated.lastName}`,
        email: updated.email,
      };
      await writeJson(COLLEGE_STUDENTS_KEY, collegeStudents);
    }

    const session: SessionUser = {
      role: 'student',
      email: updated.email,
      name: `${updated.firstName} ${updated.lastName}`,
      studentId: updated.id,
      enrollmentId: updated.enrollmentId,
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async updateCollegeAdminProfile(
    enrollmentId: string,
    input: {
      contactPersonName: string;
      contactDesignation: string;
      officialMobile: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<SessionUser> {
    await delay(400);
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const index = enrollments.findIndex((e) => e.id === enrollmentId);
    if (index < 0) throw new Error('College account not found.');

    if (!input.contactPersonName.trim()) throw new Error('Contact person name is required.');
    if (!input.contactDesignation.trim()) throw new Error('Designation is required.');
    if (!isValidMobile(input.officialMobile)) {
      throw new Error('Enter a valid 10-digit mobile number.');
    }

    if (input.newPassword) {
      if (!input.currentPassword) throw new Error('Current password is required.');
      if (enrollments[index].passwordHash !== input.currentPassword) {
        throw new Error('Current password is incorrect.');
      }
      if (input.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters.');
      }
    }

    const updated: CollegeEnrollment = {
      ...enrollments[index],
      contactPersonName: input.contactPersonName.trim(),
      contactDesignation: input.contactDesignation.trim(),
      officialMobile: input.officialMobile.trim(),
      passwordHash: input.newPassword || enrollments[index].passwordHash,
      updatedAt: new Date().toISOString(),
    };
    enrollments[index] = updated;
    await writeJson(ENROLLMENTS_KEY, enrollments);

    const session: SessionUser = {
      role: 'college_admin',
      email: updated.officialEmail,
      name: updated.contactPersonName,
      enrollmentId: updated.id,
    };
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async updateTaskAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    await delay(400);
    const current = await this.getTaskAdminPassword();
    if (currentPassword !== current) throw new Error('Current password is incorrect.');
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
    await AsyncStorage.setItem(TASK_ADMIN_PASSWORD_KEY, newPassword);
  },

  async updateSuperAdminPassword(currentPassword: string, newPassword: string): Promise<void> {
    await delay(400);
    const current = await this.getSuperAdminPassword();
    if (currentPassword !== current) throw new Error('Current password is incorrect.');
    if (newPassword.length < 8) throw new Error('New password must be at least 8 characters.');
    await AsyncStorage.setItem(SUPER_ADMIN_PASSWORD_KEY, newPassword);
  },
};
