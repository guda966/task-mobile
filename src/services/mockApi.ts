import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUMMY_EMAIL_OTP, DUMMY_MOBILE_OTP } from '../constants/demoData';
import { REGIONAL_CENTERS, REGISTRATION_FEES } from '../constants/lookups';
import type {
  AppNotification,
  CollegeEnrollment,
  EnrollmentDraft,
  SessionUser,
} from '../types/enrollment';
import { getFeeForDraft } from '../utils/validation';
import { accountApi } from './accountApi';
import { studentApi } from './studentApi';
import { trainerApi } from './trainerApi';

const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';
const SESSION_KEY = 'task.session.v2';
const OTP_KEY = 'task.otp.v1';

const TASK_ADMIN = {
  email: 'admin@task.telangana.gov.in',
  name: 'TASK Administrator',
};

const SUPER_ADMIN = {
  email: 'superadmin@task.telangana.gov.in',
  name: 'TASK Super Administrator',
};

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readEnrollments(): Promise<CollegeEnrollment[]> {
  const raw = await AsyncStorage.getItem(ENROLLMENTS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as CollegeEnrollment[];
}

async function writeEnrollments(items: CollegeEnrollment[]): Promise<void> {
  await AsyncStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(items));
}

function notify(
  audience: AppNotification['audience'],
  enrollmentId: string,
  title: string,
  body: string,
): AppNotification {
  return {
    id: uid('ntf'),
    audience,
    enrollmentId,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };
}

export const mockApi = {
  async getSession(): Promise<SessionUser | null> {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  },

  async setSession(user: SessionUser | null): Promise<void> {
    if (!user) {
      await AsyncStorage.removeItem(SESSION_KEY);
      return;
    }
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  async sendOtp(
    email: string,
    mobile: string,
  ): Promise<{ emailOtp: string; mobileOtp: string }> {
    await delay();
    const payload = {
      email: email.trim().toLowerCase(),
      mobile: mobile.trim(),
      emailOtp: DUMMY_EMAIL_OTP,
      mobileOtp: DUMMY_MOBILE_OTP,
    };
    await AsyncStorage.setItem(OTP_KEY, JSON.stringify(payload));
    return { emailOtp: payload.emailOtp, mobileOtp: payload.mobileOtp };
  },

  async verifyOtp(
    email: string,
    mobile: string,
    emailOtp: string,
    mobileOtp: string,
  ): Promise<boolean> {
    await delay();
    const raw = await AsyncStorage.getItem(OTP_KEY);
    if (!raw) return false;
    const saved = JSON.parse(raw) as {
      email: string;
      mobile: string;
      emailOtp: string;
      mobileOtp: string;
    };
    return (
      saved.email === email.trim().toLowerCase() &&
      saved.mobile === mobile.trim() &&
      saved.emailOtp === emailOtp.trim() &&
      saved.mobileOtp === mobileOtp.trim()
    );
  },

  async submitEnrollment(draft: EnrollmentDraft): Promise<CollegeEnrollment> {
    await delay(500);
    const enrollments = await readEnrollments();
    const affiliation = draft.affiliationNumber.trim().toUpperCase();
    const duplicate = enrollments.find(
      (e) => e.affiliationNumber.toUpperCase() === affiliation,
    );
    if (duplicate) {
      throw new Error(
        `A college with affiliation number ${affiliation} is already registered (${duplicate.status}).`,
      );
    }

    const email = draft.officialEmail.trim().toLowerCase();
    const emailTaken = enrollments.find((e) => e.officialEmail === email);
    if (emailTaken) {
      throw new Error('This official email is already registered.');
    }

    const now = new Date().toISOString();
    const id = uid('enr');
    const record: CollegeEnrollment = {
      id,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
      registrationKind: draft.registrationKind as CollegeEnrollment['registrationKind'],
      institutionName: draft.institutionName.trim(),
      institutionType: draft.institutionType as CollegeEnrollment['institutionType'],
      collegeStatus: draft.collegeStatus as CollegeEnrollment['collegeStatus'],
      collegeType: draft.collegeType as CollegeEnrollment['collegeType'],
      affiliationNumber: affiliation,
      affiliatedUniversity: draft.affiliatedUniversity,
      district: draft.district,
      pinCode: draft.pinCode.trim(),
      address: draft.address.trim(),
      societyName: draft.societyName.trim(),
      contactPersonName: draft.contactPersonName.trim(),
      contactDesignation: draft.contactDesignation.trim(),
      officialEmail: email,
      officialMobile: draft.officialMobile.trim(),
      registrationFee: getFeeForDraft(draft),
      feeAcknowledged: draft.feeAcknowledged,
      passwordHash: draft.password,
      notifications: [
        notify(
          'task_admin',
          id,
          'New college registration pending',
          `${draft.institutionName.trim()} (${affiliation}) submitted college registration for review.`,
        ),
        notify(
          'college_admin',
          id,
          'College registration submitted',
          'Your college registration application is pending TASK Admin review.',
        ),
      ],
    };

    enrollments.unshift(record);
    await writeEnrollments(enrollments);
    await this.setSession({
      role: 'college_admin',
      email: record.officialEmail,
      name: record.contactPersonName,
      enrollmentId: record.id,
    });
    return record;
  },

  async signIn(email: string, password: string): Promise<SessionUser> {
    await delay();
    const normalized = email.trim().toLowerCase();

    if (normalized === SUPER_ADMIN.email) {
      const passwordOk = (await accountApi.getSuperAdminPassword()) === password;
      if (!passwordOk) throw new Error('Invalid email or password.');
      const user: SessionUser = {
        role: 'super_admin',
        email: SUPER_ADMIN.email,
        name: SUPER_ADMIN.name,
      };
      await this.setSession(user);
      return user;
    }

    if (normalized === TASK_ADMIN.email) {
      const passwordOk = (await accountApi.getTaskAdminPassword()) === password;
      if (!passwordOk) throw new Error('Invalid email or password.');
      const user: SessionUser = {
        role: 'task_admin',
        email: TASK_ADMIN.email,
        name: TASK_ADMIN.name,
      };
      await this.setSession(user);
      return user;
    }

    const student = await studentApi.signIn(normalized, password);
    if (student) {
      await this.setSession(student);
      return student;
    }

    const trainer = await trainerApi.signIn(normalized, password);
    if (trainer) {
      await this.setSession(trainer);
      return trainer;
    }

    const enrollments = await readEnrollments();
    const match = enrollments.find((e) => e.officialEmail === normalized);
    if (!match || match.passwordHash !== password) {
      throw new Error('Invalid email or password.');
    }

    const user: SessionUser = {
      role: 'college_admin',
      email: match.officialEmail,
      name: match.contactPersonName,
      enrollmentId: match.id,
    };
    await this.setSession(user);
    return user;
  },

  async signOut(): Promise<void> {
    await this.setSession(null);
  },

  async listPendingEnrollments(): Promise<CollegeEnrollment[]> {
    await delay();
    const enrollments = await readEnrollments();
    return enrollments.filter((e) => e.status === 'pending');
  },

  async listAllEnrollments(): Promise<CollegeEnrollment[]> {
    await delay();
    return readEnrollments();
  },

  async getEnrollment(id: string): Promise<CollegeEnrollment | null> {
    const enrollments = await readEnrollments();
    return enrollments.find((e) => e.id === id) ?? null;
  },

  async getEnrollmentByEmail(email: string): Promise<CollegeEnrollment | null> {
    const enrollments = await readEnrollments();
    return (
      enrollments.find((e) => e.officialEmail === email.trim().toLowerCase()) ?? null
    );
  },

  async approveEnrollment(
    id: string,
    regionalCenterId: string,
    reviewerEmail: string,
  ): Promise<CollegeEnrollment> {
    await delay(500);
    const enrollments = await readEnrollments();
    const index = enrollments.findIndex((e) => e.id === id);
    if (index < 0) throw new Error('Enrollment not found.');

    const center = REGIONAL_CENTERS.find((c) => c.id === regionalCenterId);
    if (!center) throw new Error('Select a valid Regional Centre.');

    const now = new Date().toISOString();
    const current = enrollments[index];
    const updated: CollegeEnrollment = {
      ...current,
      status: 'approved',
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: reviewerEmail,
      regionalCenterId: center.id,
      regionalCenterName: center.name,
      rejectionReason: undefined,
      notifications: [
        notify(
          'college_admin',
          id,
          'College registration approved',
          `Your college tenant is activated and assigned to ${center.name}.`,
        ),
        ...current.notifications,
      ],
    };
    enrollments[index] = updated;
    await writeEnrollments(enrollments);
    return updated;
  },

  async rejectEnrollment(
    id: string,
    reason: string,
    reviewerEmail: string,
  ): Promise<CollegeEnrollment> {
    await delay(500);
    if (!reason.trim()) throw new Error('Rejection reason is required.');

    const enrollments = await readEnrollments();
    const index = enrollments.findIndex((e) => e.id === id);
    if (index < 0) throw new Error('Enrollment not found.');

    const now = new Date().toISOString();
    const current = enrollments[index];
    const updated: CollegeEnrollment = {
      ...current,
      status: 'rejected',
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: reviewerEmail,
      rejectionReason: reason.trim(),
      regionalCenterId: undefined,
      regionalCenterName: undefined,
      notifications: [
        notify(
          'college_admin',
          id,
          'College registration rejected',
          `Reason: ${reason.trim()}`,
        ),
        ...current.notifications,
      ],
    };
    enrollments[index] = updated;
    await writeEnrollments(enrollments);
    return updated;
  },

  async getNotificationsFor(user: SessionUser): Promise<AppNotification[]> {
    const enrollments = await readEnrollments();
    if (user.role === 'task_admin') {
      return enrollments
        .flatMap((e) => e.notifications)
        .filter((n) => n.audience === 'task_admin')
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    const own = enrollments.find((e) => e.id === user.enrollmentId);
    return (own?.notifications ?? [])
      .filter((n) => n.audience === 'college_admin')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  getDemoCredentials() {
    return {
      taskAdmin: TASK_ADMIN,
      sampleFeeTable: REGISTRATION_FEES,
    };
  },
};
