import AsyncStorage from '@react-native-async-storage/async-storage';
import { MIN_BATCH_SIZE, SEED_COURSES } from '../constants/courses';
import { createDummyCollegeDraft } from '../constants/demoData';
import { REGIONAL_CENTERS } from '../constants/lookups';
import type {
  CollegeStudent,
  Course,
  CourseRequest,
  CourseRequestDraft,
} from '../types/collegePortal';
import type { AppNotification, CollegeEnrollment } from '../types/enrollment';

const COURSES_KEY = 'task.courses.v3';
const REQUESTS_KEY = 'task.courseRequests.v1';
const STUDENTS_KEY = 'task.students.v1';
const ENROLLMENTS_KEY = 'task.collegeRegistrations.v2';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 250): Promise<void> {
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

async function notifyCollege(
  enrollmentId: string,
  title: string,
  body: string,
): Promise<void> {
  const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
  const index = enrollments.findIndex((e) => e.id === enrollmentId);
  if (index < 0) return;
  const note: AppNotification = {
    id: uid('ntf'),
    audience: 'college_admin',
    enrollmentId,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  enrollments[index] = {
    ...enrollments[index],
    notifications: [note, ...(enrollments[index].notifications || [])],
    updatedAt: new Date().toISOString(),
  };
  await writeJson(ENROLLMENTS_KEY, enrollments);
}

function seedStudents(enrollmentId: string): CollegeStudent[] {
  const rows = [
    ['Poojitha Ranabothu', 't26enec00750', '21QU1A0469', 'poojitha@demo.ac.in', 'OC', 'ECE'],
    ['Raghavi Veerapaga', 't26enec00751', '21QU1A0470', 'raghavi@demo.ac.in', 'SC', 'ECE'],
    ['Ananya Reddy', 't26encs00801', '21QU1A0501', 'ananya@demo.ac.in', 'BC', 'CSE'],
    ['Sai Kumar', 't26enit00812', '21QU1A1208', 'sai@demo.ac.in', 'OC', 'IT'],
    ['Keerthi Sharma', 't26enae00820', '21QU1A0544', 'keerthi@demo.ac.in', 'OC', 'AI & ML'],
  ] as const;

  return rows.map((r, i) => ({
    id: `stu_${i + 1}`,
    fullName: r[0],
    username: r[1],
    hallTicketNo: r[2],
    email: r[3],
    caste: r[4],
    branch: r[5],
    status: 'Active' as const,
    enrollmentId,
  }));
}

export const collegePortalApi = {
  async notifyCollegeAdmin(enrollmentId: string, title: string, body: string): Promise<void> {
    await notifyCollege(enrollmentId, title, body);
  },

  async ensureSeedData(enrollmentId?: string): Promise<void> {
    let courses = await readJson<Course[]>(COURSES_KEY, []);
    if (courses.length === 0) {
      const legacy = await readJson<Course[]>('task.courses.v2', []);
      courses =
        legacy.length > 0
          ? legacy.map((c) => ({ ...c, enabled: c.enabled !== false }))
          : SEED_COURSES.map((c) => ({ ...c, enabled: true }));
      await writeJson(COURSES_KEY, courses);
    } else {
      const migrated = courses.map((c) => ({
        ...c,
        enabled: c.enabled !== false,
      }));
      const needsMigrate = courses.some((c) => typeof c.enabled !== 'boolean');
      if (needsMigrate) await writeJson(COURSES_KEY, migrated);
    }

    if (enrollmentId) {
      const students = await readJson<CollegeStudent[]>(STUDENTS_KEY, []);
      if (!students.some((s) => s.enrollmentId === enrollmentId)) {
        await writeJson(STUDENTS_KEY, [...students, ...seedStudents(enrollmentId)]);
      }
    }
  },

  /** Ensures demo college exists and is approved so portal modules are usable. */
  async ensureDemoApprovedCollege(): Promise<CollegeEnrollment> {
    const enrollments = await readJson<CollegeEnrollment[]>(ENROLLMENTS_KEY, []);
    const draft = createDummyCollegeDraft();
    const existing = enrollments.find(
      (e) => e.officialEmail === draft.officialEmail || e.affiliationNumber === draft.affiliationNumber,
    );

    if (existing?.status === 'approved') {
      await this.ensureSeedData(existing.id);
      return existing;
    }

    const center = REGIONAL_CENTERS[0];
    const now = new Date().toISOString();
    const id = existing?.id ?? uid('enr');
    const approved: CollegeEnrollment = {
      ...(existing ?? {
        id,
        createdAt: now,
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
        notifications: [],
      }),
      id,
      status: 'approved',
      updatedAt: now,
      reviewedAt: now,
      reviewedBy: 'admin@task.telangana.gov.in',
      regionalCenterId: center.id,
      regionalCenterName: center.name,
      rejectionReason: undefined,
    };

    const next = existing
      ? enrollments.map((e) => (e.id === existing.id ? approved : e))
      : [approved, ...enrollments];
    await writeJson(ENROLLMENTS_KEY, next);
    await this.ensureSeedData(approved.id);
    return approved;
  },

  async listCourses(category?: string): Promise<Course[]> {
    await delay();
    await this.ensureSeedData();
    let courses = (await readJson<Course[]>(COURSES_KEY, [])).filter(
      (c) => c.enabled !== false,
    );
    if (category && category !== 'All Categories') {
      courses = courses.filter((c) => c.category === category);
    }
    return courses;
  },

  async listCoursesAdmin(params?: {
    category?: string;
    status?: 'all' | 'enabled' | 'disabled';
    query?: string;
  }): Promise<Course[]> {
    await delay();
    await this.ensureSeedData();
    let courses = (await readJson<Course[]>(COURSES_KEY, [])).map((c) => ({
      ...c,
      enabled: c.enabled !== false,
    }));
    if (params?.category && params.category !== 'All Categories') {
      courses = courses.filter((c) => c.category === params.category);
    }
    if (params?.status === 'enabled') courses = courses.filter((c) => c.enabled);
    if (params?.status === 'disabled') courses = courses.filter((c) => !c.enabled);
    if (params?.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q),
      );
    }
    return courses.sort((a, b) => a.title.localeCompare(b.title));
  },

  async getCourse(id: string): Promise<Course | null> {
    await this.ensureSeedData();
    const courses = await readJson<Course[]>(COURSES_KEY, []);
    return courses.find((c) => c.id === id) ?? null;
  },

  async createCourse(input: {
    title: string;
    category: Course['category'];
    description: string;
    graduationYears: string[];
    enabled?: boolean;
  }): Promise<Course> {
    await delay(400);
    await this.ensureSeedData();
    const title = input.title.trim();
    if (!title) throw new Error('Course title is required.');
    if (!input.category) throw new Error('Category is required.');
    if (!input.graduationYears.length) {
      throw new Error('Select at least one graduation year.');
    }

    const courses = await readJson<Course[]>(COURSES_KEY, []);
    if (courses.some((c) => c.title.toLowerCase() === title.toLowerCase())) {
      throw new Error('A course with this title already exists.');
    }

    const course: Course = {
      id: uid('crs'),
      title,
      category: input.category,
      description: input.description.trim(),
      graduationYears: [...input.graduationYears].sort(),
      enabled: input.enabled !== false,
      updatedAt: new Date().toISOString(),
    };
    courses.unshift(course);
    await writeJson(COURSES_KEY, courses);
    return course;
  },

  async updateCourse(
    id: string,
    input: {
      title: string;
      category: Course['category'];
      description: string;
      graduationYears: string[];
      enabled: boolean;
    },
  ): Promise<Course> {
    await delay(400);
    const courses = await readJson<Course[]>(COURSES_KEY, []);
    const index = courses.findIndex((c) => c.id === id);
    if (index < 0) throw new Error('Course not found.');

    const title = input.title.trim();
    if (!title) throw new Error('Course title is required.');
    if (!input.graduationYears.length) {
      throw new Error('Select at least one graduation year.');
    }
    if (
      courses.some((c) => c.id !== id && c.title.toLowerCase() === title.toLowerCase())
    ) {
      throw new Error('Another course already uses this title.');
    }

    const updated: Course = {
      ...courses[index],
      title,
      category: input.category,
      description: input.description.trim(),
      graduationYears: [...input.graduationYears].sort(),
      enabled: input.enabled,
      updatedAt: new Date().toISOString(),
    };
    courses[index] = updated;
    await writeJson(COURSES_KEY, courses);
    return updated;
  },

  async setCourseEnabled(id: string, enabled: boolean): Promise<Course> {
    await delay(300);
    const courses = await readJson<Course[]>(COURSES_KEY, []);
    const index = courses.findIndex((c) => c.id === id);
    if (index < 0) throw new Error('Course not found.');
    courses[index] = {
      ...courses[index],
      enabled,
      updatedAt: new Date().toISOString(),
    };
    await writeJson(COURSES_KEY, courses);
    return courses[index];
  },

  async listStudents(enrollmentId: string, query = ''): Promise<CollegeStudent[]> {
    await delay();
    await this.ensureSeedData(enrollmentId);
    const students = await readJson<CollegeStudent[]>(STUDENTS_KEY, []);
    const own = students.filter((s) => s.enrollmentId === enrollmentId);
    const q = query.trim().toLowerCase();
    if (!q) return own;
    return own.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.username.toLowerCase().includes(q) ||
        s.hallTicketNo.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q),
    );
  },

  async listCourseRequests(params?: {
    enrollmentId?: string;
    status?: string;
    query?: string;
  }): Promise<CourseRequest[]> {
    await delay();
    let items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    if (params?.enrollmentId) {
      items = items.filter((r) => r.enrollmentId === params.enrollmentId);
    }
    if (params?.status && params.status !== 'All') {
      items = items.filter((r) => r.status === params.status!.toLowerCase());
    }
    if (params?.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.courseName.toLowerCase().includes(q) ||
          r.collegeName.toLowerCase().includes(q),
      );
    }
    return items.sort((a, b) => b.requestedOn.localeCompare(a.requestedOn));
  },

  async getCourseRequest(id: string): Promise<CourseRequest | null> {
    const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    return items.find((r) => r.id === id) ?? null;
  },

  async submitCourseRequest(
    enrollment: CollegeEnrollment,
    draft: CourseRequestDraft,
  ): Promise<CourseRequest> {
    await delay(400);
    const course = await this.getCourse(draft.courseId);
    if (!course) throw new Error('Select a valid course.');
    if (!draft.yearOfGraduation) throw new Error('Year of graduation is required.');
    if (!draft.branch) throw new Error('Branch is required.');
    if (!draft.startDate || !draft.endDate) throw new Error('Start and end dates are required.');
    if (draft.endDate < draft.startDate) throw new Error('End date must be after start date.');

    const batchSize = Number(draft.batchSize);
    if (!batchSize || batchSize < 1) throw new Error('Enter a valid batch size.');
    if (batchSize < MIN_BATCH_SIZE) {
      throw new Error(`Minimum batch size is ${MIN_BATCH_SIZE} students (TASK policy).`);
    }

    const request: CourseRequest = {
      id: uid('req'),
      enrollmentId: enrollment.id,
      collegeName: enrollment.institutionName,
      courseId: course.id,
      courseName: course.title,
      category: course.category,
      yearOfGraduation: draft.yearOfGraduation,
      branch: draft.branch,
      startDate: draft.startDate,
      endDate: draft.endDate,
      batchSize,
      status: 'pending',
      requestedOn: new Date().toISOString(),
    };

    const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    items.unshift(request);
    await writeJson(REQUESTS_KEY, items);
    return request;
  },

  async approveCourseRequest(id: string, remark?: string): Promise<CourseRequest> {
    await delay(400);
    const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const index = items.findIndex((r) => r.id === id);
    if (index < 0) throw new Error('Request not found.');
    const updated: CourseRequest = {
      ...items[index],
      status: 'approved',
      reviewedAt: new Date().toISOString(),
      adminRemark: remark?.trim() || 'Approved by TASK Admin',
      rejectionReason: undefined,
    };
    items[index] = updated;
    await writeJson(REQUESTS_KEY, items);
    await notifyCollege(
      updated.enrollmentId,
      'Course request approved',
      `${updated.courseName} (${updated.branch}, ${updated.startDate} → ${updated.endDate}) was approved. Trainer assignment will follow.`,
    );
    return updated;
  },

  async rejectCourseRequest(id: string, reason: string): Promise<CourseRequest> {
    await delay(400);
    if (!reason.trim()) throw new Error('Rejection reason is required.');
    const items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const index = items.findIndex((r) => r.id === id);
    if (index < 0) throw new Error('Request not found.');
    const updated: CourseRequest = {
      ...items[index],
      status: 'rejected',
      reviewedAt: new Date().toISOString(),
      rejectionReason: reason.trim(),
    };
    items[index] = updated;
    await writeJson(REQUESTS_KEY, items);
    await notifyCollege(
      updated.enrollmentId,
      'Course request rejected',
      `${updated.courseName} was rejected. Reason: ${reason.trim()}`,
    );
    return updated;
  },

  async listCalendarEvents(enrollmentId?: string): Promise<CourseRequest[]> {
    const items = await this.listCourseRequests(
      enrollmentId ? { enrollmentId, status: 'approved' } : { status: 'approved' },
    );
    return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
};
