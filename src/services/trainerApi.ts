import AsyncStorage from '@react-native-async-storage/async-storage';
import { DUMMY_TRAINER, createDemoTrainerDraft } from '../constants/trainer';
import type { CourseRequest } from '../types/collegePortal';
import type { SessionUser } from '../types/enrollment';
import type {
  StudentTrainerQuery,
  TrainerAchievement,
  TrainerCertificate,
  TrainerDraft,
  TrainerFeedback,
  TrainerFileRef,
  TrainerMessage,
  TrainerRecord,
  TrainerStatus,
} from '../types/trainer';
import { isValidMobile } from '../utils/validation';
import { collegePortalApi } from './collegePortalApi';

const TRAINERS_KEY = 'task.trainers.v2';
const TRAINERS_LEGACY_KEY = 'task.trainers.v1';
const REQUESTS_KEY = 'task.courseRequests.v1';
const SESSION_KEY = 'task.session.v2';
const FEEDBACK_KEY = 'task.trainerFeedback.v1';
const MESSAGES_KEY = 'task.trainerMessages.v1';
const QUERIES_KEY = 'task.trainerQueries.v1';

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

function normalizeTrainer(raw: Partial<TrainerRecord> & { id: string; email: string }): TrainerRecord {
  const status = (raw.status as TrainerStatus) || 'pending';
  return {
    id: raw.id,
    firstName: raw.firstName || '',
    lastName: raw.lastName || '',
    email: raw.email,
    mobile: raw.mobile || '',
    skills: raw.skills || [],
    bio: raw.bio || '',
    experienceYears: raw.experienceYears || '0',
    city: raw.city || '',
    status,
    rejectionReason: raw.rejectionReason,
    reviewedAt: raw.reviewedAt,
    reviewedBy: raw.reviewedBy,
    passwordHash: raw.passwordHash || '',
    profileComplete: Boolean(raw.profileComplete),
    resume: raw.resume,
    certificates: raw.certificates || [],
    achievements: raw.achievements || [],
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
    createdBy: raw.createdBy || 'self',
  };
}

async function readTrainers(): Promise<TrainerRecord[]> {
  let items: TrainerRecord[] = [];
  const current = await AsyncStorage.getItem(TRAINERS_KEY);
  if (current) {
    items = (JSON.parse(current) as TrainerRecord[]).map(normalizeTrainer);
  } else {
    const legacy = await AsyncStorage.getItem(TRAINERS_LEGACY_KEY);
    if (legacy) {
      items = (JSON.parse(legacy) as TrainerRecord[]).map(normalizeTrainer);
      await writeJson(TRAINERS_KEY, items);
    }
  }
  return items;
}

async function writeTrainers(items: TrainerRecord[]): Promise<void> {
  await writeJson(TRAINERS_KEY, items);
}

function toSession(trainer: TrainerRecord): SessionUser {
  return {
    role: 'trainer',
    email: trainer.email,
    name: `${trainer.firstName} ${trainer.lastName}`,
    trainerId: trainer.id,
  };
}

function validateDraft(draft: TrainerDraft, requirePassword: boolean): void {
  if (!draft.firstName.trim() || !draft.lastName.trim()) {
    throw new Error('First and last name are required.');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    throw new Error('Enter a valid email address.');
  }
  if (!isValidMobile(draft.mobile)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }
  if (!draft.skills.length) {
    throw new Error('Select at least one skill / domain.');
  }
  if (!draft.city.trim()) {
    throw new Error('City is required.');
  }
  if (!draft.bio.trim()) {
    throw new Error('Bio / profile summary is required.');
  }
  if (!draft.experienceYears.trim()) {
    throw new Error('Experience (years) is required.');
  }
  if (!draft.resume?.fileName) {
    throw new Error('Resume upload is required.');
  }
  if (draft.certificates?.some((c) => !c.title.trim() || !c.issuer.trim())) {
    throw new Error('Each certificate needs a title and issuer.');
  }
  if (draft.achievements?.some((a) => !a.title.trim() || !a.description.trim())) {
    throw new Error('Each achievement needs a title and description.');
  }
  if (requirePassword) {
    if (draft.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (draft.password !== draft.confirmPassword) {
      throw new Error('Password and confirmation do not match.');
    }
  }
}

export const trainerApi = {
  async listTrainers(params?: {
    query?: string;
    status?: string;
    skill?: string;
  }): Promise<TrainerRecord[]> {
    await delay();
    let items = await readTrainers();
    if (params?.status && params.status !== 'All') {
      items = items.filter((t) => t.status === params.status!.toLowerCase());
    }
    if (params?.skill && params.skill !== 'All') {
      items = items.filter((t) =>
        t.skills.includes(params.skill as TrainerRecord['skills'][number]),
      );
    }
    if (params?.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      items = items.filter(
        (t) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q) ||
          t.mobile.includes(q) ||
          t.city.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => {
      const order: Record<string, number> = { pending: 0, active: 1, rejected: 2, inactive: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.firstName.localeCompare(b.firstName);
    });
  },

  async listActiveTrainers(): Promise<TrainerRecord[]> {
    return this.listTrainers({ status: 'active' });
  },

  async countPending(): Promise<number> {
    const items = await readTrainers();
    return items.filter((t) => t.status === 'pending').length;
  },

  async getTrainer(id: string): Promise<TrainerRecord | null> {
    const items = await readTrainers();
    return items.find((t) => t.id === id) ?? null;
  },

  async getTrainerByEmail(email: string): Promise<TrainerRecord | null> {
    const items = await readTrainers();
    return items.find((t) => t.email === email.trim().toLowerCase()) ?? null;
  },

  async ensureDemoTrainer(): Promise<TrainerRecord> {
    const existing = await this.getTrainerByEmail(DUMMY_TRAINER.email);
    const draft = createDemoTrainerDraft();
    const now = new Date().toISOString();
    const certificates = draft.certificates.map((c) => ({
      id: uid('cert'),
      title: c.title,
      issuer: c.issuer,
      year: c.year,
      file: c.file,
    }));
    const achievements = draft.achievements.map((a) => ({
      id: uid('ach'),
      title: a.title,
      description: a.description,
      year: a.year,
    }));

    if (existing) {
      const needsRefresh =
        existing.status !== 'active' ||
        !existing.resume ||
        existing.certificates.length === 0 ||
        existing.achievements.length === 0 ||
        existing.firstName === 'Priya';
      if (!needsRefresh) return existing;

      const items = await readTrainers();
      const index = items.findIndex((t) => t.id === existing.id);
      if (index < 0) return this.createTrainer(draft, 'task_admin');

      items[index] = {
        ...items[index],
        firstName: draft.firstName,
        lastName: draft.lastName,
        mobile: draft.mobile,
        skills: draft.skills,
        bio: draft.bio,
        experienceYears: draft.experienceYears,
        city: draft.city,
        status: 'active',
        rejectionReason: undefined,
        reviewedAt: now,
        reviewedBy: 'TASK Administrator',
        passwordHash: draft.password,
        profileComplete: true,
        resume: draft.resume,
        certificates,
        achievements,
        updatedAt: now,
        createdBy: 'task_admin',
      };
      await writeTrainers(items);
      return items[index];
    }

    return this.createTrainer(draft, 'task_admin');
  },

  async createTrainer(
    draft: TrainerDraft,
    createdBy: 'task_admin' | 'self',
  ): Promise<TrainerRecord> {
    await delay(400);
    validateDraft(draft, true);
    const email = draft.email.trim().toLowerCase();
    const items = await readTrainers();
    if (items.some((t) => t.email === email)) {
      throw new Error('A trainer with this email already exists.');
    }

    const now = new Date().toISOString();
    const certificates: TrainerCertificate[] = draft.certificates.map((c) => ({
      id: uid('cert'),
      title: c.title.trim(),
      issuer: c.issuer.trim(),
      year: c.year.trim(),
      file: c.file,
    }));
    const achievements: TrainerAchievement[] = draft.achievements.map((a) => ({
      id: uid('ach'),
      title: a.title.trim(),
      description: a.description.trim(),
      year: a.year.trim(),
    }));

    const record: TrainerRecord = {
      id: uid('trn'),
      firstName: draft.firstName.trim(),
      lastName: draft.lastName.trim(),
      email,
      mobile: draft.mobile.trim(),
      skills: draft.skills,
      bio: draft.bio.trim(),
      experienceYears: draft.experienceYears.trim() || '0',
      city: draft.city.trim(),
      status: createdBy === 'task_admin' ? 'active' : 'pending',
      reviewedAt: createdBy === 'task_admin' ? now : undefined,
      reviewedBy: createdBy === 'task_admin' ? 'TASK Administrator' : undefined,
      passwordHash: draft.password,
      profileComplete: true,
      resume: draft.resume,
      certificates,
      achievements,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    items.unshift(record);
    await writeTrainers(items);
    return record;
  },

  async registerSelf(draft: TrainerDraft): Promise<SessionUser> {
    const record = await this.createTrainer(draft, 'self');
    const session = toSession(record);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async approveTrainer(id: string, reviewedBy = 'TASK Administrator'): Promise<TrainerRecord> {
    await delay(350);
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === id);
    if (index < 0) throw new Error('Trainer not found.');
    items[index] = {
      ...items[index],
      status: 'active',
      rejectionReason: undefined,
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    await this.sendMessage(id, {
      fromRole: 'task_admin',
      fromName: reviewedBy,
      subject: 'Trainer application approved',
      body: 'Your trainer profile has been approved by TASK Admin. You can now be assigned to college course requests.',
    });
    return items[index];
  },

  async rejectTrainer(
    id: string,
    reason: string,
    reviewedBy = 'TASK Administrator',
  ): Promise<TrainerRecord> {
    await delay(350);
    if (!reason.trim()) throw new Error('Rejection reason is required.');
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === id);
    if (index < 0) throw new Error('Trainer not found.');
    items[index] = {
      ...items[index],
      status: 'rejected',
      rejectionReason: reason.trim(),
      reviewedAt: new Date().toISOString(),
      reviewedBy,
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    await this.sendMessage(id, {
      fromRole: 'task_admin',
      fromName: reviewedBy,
      subject: 'Trainer application not approved',
      body: `Your trainer application was not approved.\n\nReason: ${reason.trim()}`,
    });
    return items[index];
  },

  async updateTrainer(
    id: string,
    input: {
      firstName: string;
      lastName: string;
      mobile: string;
      skills: TrainerRecord['skills'];
      bio: string;
      experienceYears: string;
      city: string;
      status?: TrainerStatus;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<TrainerRecord> {
    await delay(400);
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === id);
    if (index < 0) throw new Error('Trainer not found.');

    if (!input.firstName.trim() || !input.lastName.trim()) {
      throw new Error('First and last name are required.');
    }
    if (!isValidMobile(input.mobile)) {
      throw new Error('Enter a valid 10-digit mobile number.');
    }
    if (!input.skills.length) {
      throw new Error('Select at least one skill / domain.');
    }
    if (!input.city.trim()) {
      throw new Error('City is required.');
    }

    if (input.newPassword) {
      if (!input.currentPassword) throw new Error('Current password is required.');
      if (items[index].passwordHash !== input.currentPassword) {
        throw new Error('Current password is incorrect.');
      }
      if (input.newPassword.length < 8) {
        throw new Error('New password must be at least 8 characters.');
      }
    }

    const updated: TrainerRecord = {
      ...items[index],
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      mobile: input.mobile.trim(),
      skills: input.skills,
      bio: input.bio.trim(),
      experienceYears: input.experienceYears.trim() || '0',
      city: input.city.trim(),
      status: input.status || items[index].status,
      passwordHash: input.newPassword || items[index].passwordHash,
      profileComplete: true,
      updatedAt: new Date().toISOString(),
    };
    items[index] = updated;
    await writeTrainers(items);

    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    let changed = false;
    const fullName = `${updated.firstName} ${updated.lastName}`;
    const nextRequests = requests.map((r) => {
      let copy = r;
      if (r.trainerId === id) {
        copy = {
          ...copy,
          trainerName: fullName,
          trainerEmail: updated.email,
          trainerMobile: updated.mobile,
          trainerSkills: updated.skills.join(', '),
          trainerCity: updated.city,
          trainerExperienceYears: updated.experienceYears,
        };
        changed = true;
      }
      if (r.backupTrainerId === id) {
        copy = {
          ...copy,
          backupTrainerName: fullName,
          backupTrainerEmail: updated.email,
          backupTrainerMobile: updated.mobile,
        };
        changed = true;
      }
      return copy;
    });
    if (changed) await writeJson(REQUESTS_KEY, nextRequests);

    return updated;
  },

  async updateOwnProfile(
    trainerId: string,
    input: {
      firstName: string;
      lastName: string;
      mobile: string;
      skills: TrainerRecord['skills'];
      bio: string;
      experienceYears: string;
      city: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ): Promise<SessionUser> {
    const existing = await this.getTrainer(trainerId);
    if (!existing) throw new Error('Trainer not found.');

    await this.updateTrainer(trainerId, {
      ...input,
      status: existing.status,
    });

    // Rejected trainers who update profile re-enter the approval queue.
    if (existing.status === 'rejected') {
      const items = await readTrainers();
      const index = items.findIndex((t) => t.id === trainerId);
      if (index >= 0) {
        items[index] = {
          ...items[index],
          status: 'pending',
          rejectionReason: undefined,
          updatedAt: new Date().toISOString(),
        };
        await writeTrainers(items);
      }
    }

    const latest = await this.getTrainer(trainerId);
    if (!latest) throw new Error('Trainer not found.');
    const session = toSession(latest);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async setResume(trainerId: string, file: TrainerFileRef): Promise<TrainerRecord> {
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === trainerId);
    if (index < 0) throw new Error('Trainer not found.');
    items[index] = { ...items[index], resume: file, updatedAt: new Date().toISOString() };
    await writeTrainers(items);
    return items[index];
  },

  async addCertificate(
    trainerId: string,
    cert: Omit<TrainerCertificate, 'id'>,
  ): Promise<TrainerRecord> {
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === trainerId);
    if (index < 0) throw new Error('Trainer not found.');
    if (!cert.title.trim()) throw new Error('Certificate title is required.');
    const next: TrainerCertificate = { ...cert, id: uid('cert'), title: cert.title.trim() };
    items[index] = {
      ...items[index],
      certificates: [next, ...items[index].certificates],
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    return items[index];
  },

  async removeCertificate(trainerId: string, certificateId: string): Promise<TrainerRecord> {
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === trainerId);
    if (index < 0) throw new Error('Trainer not found.');
    items[index] = {
      ...items[index],
      certificates: items[index].certificates.filter((c) => c.id !== certificateId),
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    return items[index];
  },

  async addAchievement(
    trainerId: string,
    achievement: Omit<TrainerAchievement, 'id'>,
  ): Promise<TrainerRecord> {
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === trainerId);
    if (index < 0) throw new Error('Trainer not found.');
    if (!achievement.title.trim()) throw new Error('Achievement title is required.');
    const next: TrainerAchievement = {
      ...achievement,
      id: uid('ach'),
      title: achievement.title.trim(),
      description: achievement.description.trim(),
    };
    items[index] = {
      ...items[index],
      achievements: [next, ...items[index].achievements],
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    return items[index];
  },

  async removeAchievement(trainerId: string, achievementId: string): Promise<TrainerRecord> {
    const items = await readTrainers();
    const index = items.findIndex((t) => t.id === trainerId);
    if (index < 0) throw new Error('Trainer not found.');
    items[index] = {
      ...items[index],
      achievements: items[index].achievements.filter((a) => a.id !== achievementId),
      updatedAt: new Date().toISOString(),
    };
    await writeTrainers(items);
    return items[index];
  },

  async signIn(email: string, password: string): Promise<SessionUser | null> {
    await this.ensureDemoTrainer();
    const trainer = await this.getTrainerByEmail(email);
    if (!trainer || trainer.passwordHash !== password) return null;
    if (trainer.status === 'inactive') {
      throw new Error('This trainer account is inactive. Contact TASK Admin.');
    }
    const session = toSession(trainer);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async listAssignedSessions(trainerId: string): Promise<CourseRequest[]> {
    await delay();
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    return requests
      .filter(
        (r) =>
          r.status === 'approved' &&
          (r.trainerId === trainerId || r.backupTrainerId === trainerId),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async listTrainingHistory(trainerId: string): Promise<CourseRequest[]> {
    const sessions = await this.listAssignedSessions(trainerId);
    const today = new Date().toISOString().slice(0, 10);
    return sessions.filter((s) => s.endDate < today);
  },

  async assignTrainers(
    requestId: string,
    primaryTrainerId: string,
    backupTrainerId?: string,
  ): Promise<CourseRequest> {
    await delay(400);
    if (!primaryTrainerId) throw new Error('Select a primary trainer.');
    if (backupTrainerId && backupTrainerId === primaryTrainerId) {
      throw new Error('Backup trainer must be different from the primary trainer.');
    }

    const trainers = await readTrainers();
    const primary = trainers.find((t) => t.id === primaryTrainerId && t.status === 'active');
    if (!primary) {
      throw new Error('Primary trainer must be an approved (active) TASK trainer.');
    }

    let backup: TrainerRecord | undefined;
    if (backupTrainerId) {
      backup = trainers.find((t) => t.id === backupTrainerId && t.status === 'active');
      if (!backup) {
        throw new Error('Backup trainer must be an approved (active) TASK trainer.');
      }
    }

    const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const index = items.findIndex((r) => r.id === requestId);
    if (index < 0) throw new Error('Course request not found.');
    if (items[index].status !== 'approved') {
      throw new Error('Assign trainers only after the course request is approved.');
    }

    const updated: CourseRequest = {
      ...items[index],
      trainerId: primary.id,
      trainerName: `${primary.firstName} ${primary.lastName}`,
      trainerEmail: primary.email,
      trainerMobile: primary.mobile,
      trainerSkills: primary.skills.join(', '),
      trainerCity: primary.city,
      trainerExperienceYears: primary.experienceYears,
      backupTrainerId: backup?.id,
      backupTrainerName: backup ? `${backup.firstName} ${backup.lastName}` : undefined,
      backupTrainerEmail: backup?.email,
      backupTrainerMobile: backup?.mobile,
    };
    // Explicitly clear backup when none selected (spread can leave stale fields)
    if (!backup) {
      delete updated.backupTrainerId;
      delete updated.backupTrainerName;
      delete updated.backupTrainerEmail;
      delete updated.backupTrainerMobile;
    }
    items[index] = updated;
    await writeJson(REQUESTS_KEY, items);
    await collegePortalApi.notifyCollegeAdmin(
      updated.enrollmentId,
      'Trainer assigned to course',
      `${updated.courseName}: ${updated.trainerName} has been assigned${
        updated.backupTrainerName ? ` (backup: ${updated.backupTrainerName})` : ''
      }.`,
    );
    return updated;
  },

  async listFeedback(trainerId: string): Promise<TrainerFeedback[]> {
    const items = await readJson<TrainerFeedback[]>(FEEDBACK_KEY, []);
    return items
      .filter((f) => f.trainerId === trainerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async addFeedback(input: Omit<TrainerFeedback, 'id' | 'createdAt'>): Promise<TrainerFeedback> {
    await delay(300);
    if (!input.comment.trim()) throw new Error('Feedback comment is required.');
    const entry: TrainerFeedback = {
      ...input,
      id: uid('fb'),
      comment: input.comment.trim(),
      createdAt: new Date().toISOString(),
    };
    const items = await readJson<TrainerFeedback[]>(FEEDBACK_KEY, []);
    items.unshift(entry);
    await writeJson(FEEDBACK_KEY, items);
    return entry;
  },

  async listMessages(trainerId: string): Promise<TrainerMessage[]> {
    const items = await readJson<TrainerMessage[]>(MESSAGES_KEY, []);
    return items
      .filter((m) => m.trainerId === trainerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async sendMessage(
    trainerId: string,
    input: { fromRole: 'task_admin' | 'trainer'; fromName: string; subject: string; body: string },
  ): Promise<TrainerMessage> {
    await delay(250);
    if (!input.subject.trim() || !input.body.trim()) {
      throw new Error('Subject and message body are required.');
    }
    const entry: TrainerMessage = {
      id: uid('msg'),
      trainerId,
      fromRole: input.fromRole,
      fromName: input.fromName,
      subject: input.subject.trim(),
      body: input.body.trim(),
      createdAt: new Date().toISOString(),
      read: input.fromRole === 'trainer',
    };
    const items = await readJson<TrainerMessage[]>(MESSAGES_KEY, []);
    items.unshift(entry);
    await writeJson(MESSAGES_KEY, items);
    return entry;
  },

  async markMessagesRead(trainerId: string): Promise<void> {
    const items = await readJson<TrainerMessage[]>(MESSAGES_KEY, []);
    let changed = false;
    const next = items.map((m) => {
      if (m.trainerId === trainerId && !m.read) {
        changed = true;
        return { ...m, read: true };
      }
      return m;
    });
    if (changed) await writeJson(MESSAGES_KEY, next);
  },

  async listQueries(trainerId: string): Promise<StudentTrainerQuery[]> {
    const items = await readJson<StudentTrainerQuery[]>(QUERIES_KEY, []);
    return items
      .filter((q) => q.trainerId === trainerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async listQueriesForStudent(studentId: string): Promise<StudentTrainerQuery[]> {
    const items = await readJson<StudentTrainerQuery[]>(QUERIES_KEY, []);
    return items
      .filter((q) => q.studentId === studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async submitStudentQuery(input: {
    trainerId: string;
    studentId: string;
    studentName: string;
    collegeName: string;
    requestId?: string;
    courseName?: string;
    question: string;
  }): Promise<StudentTrainerQuery> {
    await delay(350);
    if (!input.question.trim()) throw new Error('Enter your question.');
    const trainer = await this.getTrainer(input.trainerId);
    if (!trainer || trainer.status !== 'active') {
      throw new Error('Trainer is not available for queries.');
    }
    const entry: StudentTrainerQuery = {
      id: uid('qry'),
      trainerId: input.trainerId,
      studentId: input.studentId,
      studentName: input.studentName,
      collegeName: input.collegeName,
      requestId: input.requestId,
      courseName: input.courseName,
      question: input.question.trim(),
      status: 'open',
      createdAt: new Date().toISOString(),
    };
    const items = await readJson<StudentTrainerQuery[]>(QUERIES_KEY, []);
    items.unshift(entry);
    await writeJson(QUERIES_KEY, items);
    return entry;
  },

  async answerQuery(queryId: string, answer: string): Promise<StudentTrainerQuery> {
    await delay(350);
    if (!answer.trim()) throw new Error('Enter an answer.');
    const items = await readJson<StudentTrainerQuery[]>(QUERIES_KEY, []);
    const index = items.findIndex((q) => q.id === queryId);
    if (index < 0) throw new Error('Query not found.');
    items[index] = {
      ...items[index],
      answer: answer.trim(),
      status: 'answered',
      answeredAt: new Date().toISOString(),
    };
    await writeJson(QUERIES_KEY, items);
    return items[index];
  },
};
