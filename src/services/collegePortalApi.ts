import AsyncStorage from '@react-native-async-storage/async-storage';
import { MIN_BATCH_SIZE, SEED_COURSES } from '../constants/courses';
import { createDummyCollegeDraft } from '../constants/demoData';
import { REGIONAL_CENTERS } from '../constants/lookups';
import type {
  CollegeStudent,
  Course,
  CourseEnrolledStudent,
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
  if (!enrollmentId) return;
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

const RC_NOTES_KEY = 'task.rcNotifications.v1';

async function notifyRegionalCenter(
  regionalCenterId: string,
  title: string,
  body: string,
): Promise<void> {
  if (!regionalCenterId) return;
  const all = await readJson<Record<string, AppNotification[]>>(RC_NOTES_KEY, {});
  const note: AppNotification = {
    id: uid('ntf'),
    audience: 'regional_center',
    enrollmentId: '',
    regionalCenterId,
    title,
    body,
    createdAt: new Date().toISOString(),
    read: false,
  };
  all[regionalCenterId] = [note, ...(all[regionalCenterId] || [])];
  await writeJson(RC_NOTES_KEY, all);
}

async function notifyCourseRequester(request: CourseRequest, title: string, body: string) {
  if (request.requesterType === 'regional_center' && request.regionalCenterId) {
    await notifyRegionalCenter(request.regionalCenterId, title, body);
    return;
  }
  await notifyCollege(request.enrollmentId, title, body);
}

function seedStudents(enrollmentId: string): CollegeStudent[] {
  const rows = [
    ['Poojitha Ranabothu', 't26enec00750', '21QU1A0469', 'poojitha@demo.ac.in', 'OC', 'ECE', '6', '2026'],
    ['Raghavi Veerapaga', 't26enec00751', '21QU1A0470', 'raghavi@demo.ac.in', 'SC', 'ECE', '6', '2026'],
    ['Ananya Reddy', 't26encs00801', '21QU1A0501', 'ananya@demo.ac.in', 'BC', 'CSE', '5', '2027'],
    ['Sai Kumar', 't26enit00812', '21QU1A1208', 'sai@demo.ac.in', 'OC', 'IT', '4', '2028'],
    ['Keerthi Sharma', 't26enae00820', '21QU1A0544', 'keerthi@demo.ac.in', 'OC', 'AI & ML', '5', '2027'],
    ['Rohan Varma', 't26encs00802', '21QU1A0502', 'rohan@demo.ac.in', 'OC', 'CSE', '5', '2027'],
  ] as const;

  return rows.map((r, i) => ({
    id: `stu_${i + 1}`,
    fullName: r[0],
    username: r[1],
    hallTicketNo: r[2],
    email: r[3],
    caste: r[4],
    branch: r[5],
    semester: r[6],
    yearOfGraduation: r[7],
    status: 'Active' as const,
    enrollmentId,
  }));
}

export const collegePortalApi = {
  async notifyCollegeAdmin(enrollmentId: string, title: string, body: string): Promise<void> {
    await notifyCollege(enrollmentId, title, body);
  },

  async notifyCourseRequesterAdmin(
    request: CourseRequest,
    title: string,
    body: string,
  ): Promise<void> {
    await notifyCourseRequester(request, title, body);
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

    const center =
      REGIONAL_CENTERS.find((c) => c.id === 'rc-hyd-masabtank') ?? REGIONAL_CENTERS[0];
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

  async listCourses(category?: string, query = ''): Promise<Course[]> {
    await delay();
    await this.ensureSeedData();
    let courses = (await readJson<Course[]>(COURSES_KEY, [])).filter(
      (c) => c.enabled !== false,
    );
    if (category && category !== 'All Categories') {
      courses = courses.filter((c) => c.category === category);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      courses = courses.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          (c.description || '').toLowerCase().includes(q),
      );
    }
    return courses.sort((a, b) => a.title.localeCompare(b.title));
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

  async listStudents(
    enrollmentId: string,
    queryOrFilters:
      | string
      | {
          query?: string;
          branch?: string;
          semester?: string;
          yearOfGraduation?: string;
        } = '',
  ): Promise<CollegeStudent[]> {
    await delay();
    await this.ensureSeedData(enrollmentId);
    const students = await readJson<CollegeStudent[]>(STUDENTS_KEY, []);
    const filters =
      typeof queryOrFilters === 'string'
        ? { query: queryOrFilters }
        : queryOrFilters || {};
    const q = (filters.query || '').trim().toLowerCase();
    const branch = (filters.branch || '').trim();
    const semester = (filters.semester || '').trim();
    const year = (filters.yearOfGraduation || '').trim();

    return students
      .filter((s) => s.enrollmentId === enrollmentId)
      .filter((s) => !branch || s.branch === branch)
      .filter((s) => !semester || s.semester === semester)
      .filter((s) => !year || s.yearOfGraduation === year)
      .filter((s) => {
        if (!q) return true;
        return (
          s.fullName.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          s.hallTicketNo.toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q) ||
          s.branch.toLowerCase().includes(q)
        );
      })
      .map((s) => ({
        ...s,
        semester: s.semester || '',
        yearOfGraduation: s.yearOfGraduation || '',
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  },

  /** Students registered on courses requested by this college (final batch roster). */
  async listCourseEnrolledStudents(
    enrollmentId: string,
    filters?: {
      query?: string;
      branch?: string;
      semester?: string;
      yearOfGraduation?: string;
      courseRequestId?: string;
    },
  ): Promise<CourseEnrolledStudent[]> {
    await delay();
    await this.ensureSeedData(enrollmentId);
    const TRAINING_KEY = 'task.trainingRegistrations.v1';
    const requests = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    const registrations = await readJson<
      {
        id: string;
        studentId: string;
        studentName: string;
        studentEmail: string;
        courseRequestId: string;
        courseName: string;
        category: string;
        enrollmentId: string;
        branch: string;
        yearOfGraduation: string;
        startDate: string;
        endDate: string;
        status: string;
        registeredAt: string;
      }[]
    >(TRAINING_KEY, []);
    const collegeStudents = await readJson<CollegeStudent[]>(STUDENTS_KEY, []);

    const collegeRequests = requests.filter((r) => r.enrollmentId === enrollmentId);
    const requestMap = new Map(collegeRequests.map((r) => [r.id, r]));
    const allowedIds = new Set(collegeRequests.map((r) => r.id));
    const studentById = new Map(collegeStudents.map((s) => [s.id, s]));
    const studentByEmail = new Map(
      collegeStudents.map((s) => [s.email.trim().toLowerCase(), s]),
    );

    const q = (filters?.query || '').trim().toLowerCase();
    const branch = (filters?.branch || '').trim();
    const semester = (filters?.semester || '').trim();
    const year = (filters?.yearOfGraduation || '').trim();
    const courseRequestId = (filters?.courseRequestId || '').trim();

    return registrations
      .filter(
        (r) =>
          allowedIds.has(r.courseRequestId) &&
          (r.status === 'registered' || r.status === 'completed'),
      )
      .filter((r) => !courseRequestId || r.courseRequestId === courseRequestId)
      .filter((r) => !branch || r.branch === branch)
      .filter((r) => !year || r.yearOfGraduation === year)
      .map((r) => {
        const batch = requestMap.get(r.courseRequestId)!;
        const profile =
          studentById.get(r.studentId) ||
          studentByEmail.get(r.studentEmail.trim().toLowerCase());
        return {
          registrationId: r.id,
          studentId: r.studentId,
          fullName: r.studentName,
          email: r.studentEmail,
          hallTicketNo: profile?.hallTicketNo || '',
          username: profile?.username || '',
          branch: r.branch,
          semester: profile?.semester || '',
          yearOfGraduation: r.yearOfGraduation,
          courseRequestId: r.courseRequestId,
          courseName: r.courseName || batch.courseName,
          category: r.category || batch.category,
          batchStatus: batch.status,
          registrationStatus: r.status,
          registeredAt: r.registeredAt,
          startDate: r.startDate || batch.startDate,
          endDate: r.endDate || batch.endDate,
          batchSize: batch.batchSize,
        } satisfies CourseEnrolledStudent;
      })
      .filter((r) => !semester || r.semester === semester)
      .filter((r) => {
        if (!q) return true;
        return (
          r.fullName.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          r.hallTicketNo.toLowerCase().includes(q) ||
          r.courseName.toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const byCourse = a.courseName.localeCompare(b.courseName);
        if (byCourse !== 0) return byCourse;
        return a.fullName.localeCompare(b.fullName);
      });
  },

  async listCourseRequests(params?: {
    enrollmentId?: string;
    regionalCenterId?: string;
    requesterType?: 'college' | 'regional_center' | 'all';
    status?: string;
    query?: string;
    branch?: string;
    yearOfGraduation?: string;
  }): Promise<CourseRequest[]> {
    await delay();
    let items = await readJson<CourseRequest[]>(REQUESTS_KEY, []);
    if (params?.enrollmentId) {
      items = items.filter((r) => r.enrollmentId === params.enrollmentId);
    }
    if (params?.regionalCenterId) {
      items = items.filter((r) => r.regionalCenterId === params.regionalCenterId);
    }
    if (params?.requesterType === 'college') {
      items = items.filter((r) => (r.requesterType || 'college') === 'college');
    } else if (params?.requesterType === 'regional_center') {
      items = items.filter((r) => r.requesterType === 'regional_center');
    }
    if (params?.status && params.status !== 'All') {
      items = items.filter((r) => r.status === params.status!.toLowerCase());
    }
    if (params?.branch) {
      items = items.filter((r) => r.branch === params.branch);
    }
    if (params?.yearOfGraduation) {
      items = items.filter((r) => r.yearOfGraduation === params.yearOfGraduation);
    }
    if (params?.query?.trim()) {
      const q = params.query.trim().toLowerCase();
      items = items.filter(
        (r) =>
          r.courseName.toLowerCase().includes(q) ||
          r.collegeName.toLowerCase().includes(q) ||
          (r.regionalCenterName || '').toLowerCase().includes(q) ||
          r.branch.toLowerCase().includes(q) ||
          (r.trainerName || '').toLowerCase().includes(q),
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
      requesterType: 'college',
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

  async submitRcCourseRequest(
    regionalCenterId: string,
    regionalCenterName: string,
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
      enrollmentId: '',
      collegeName: regionalCenterName,
      requesterType: 'regional_center',
      regionalCenterId,
      regionalCenterName,
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
    const who =
      updated.requesterType === 'regional_center'
        ? 'Regional Centre members'
        : updated.branch;
    await notifyCourseRequester(
      updated,
      'Course request update',
      `${updated.courseName} is approved for ${who} (${updated.startDate} to ${updated.endDate}). Check Calendar for dates.`,
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
    await notifyCourseRequester(
      updated,
      'Course request update',
      `${updated.courseName} needs a small change before it can move ahead. Note from TASK: ${reason.trim()}`,
    );
    return updated;
  },

  async listCalendarEvents(enrollmentId?: string): Promise<CourseRequest[]> {
    const items = await this.listCourseRequests(
      enrollmentId ? { enrollmentId, status: 'approved' } : { status: 'approved' },
    );
    return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async listRcCalendarEvents(regionalCenterId: string): Promise<CourseRequest[]> {
    const items = await this.listCourseRequests({
      regionalCenterId,
      status: 'approved',
      requesterType: 'regional_center',
    });
    return items.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async listRcNotifications(regionalCenterId: string): Promise<AppNotification[]> {
    const all = await readJson<Record<string, AppNotification[]>>(RC_NOTES_KEY, {});
    return (all[regionalCenterId] || []).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },

  async markRcNotificationsRead(regionalCenterId: string): Promise<void> {
    const all = await readJson<Record<string, AppNotification[]>>(RC_NOTES_KEY, {});
    all[regionalCenterId] = (all[regionalCenterId] || []).map((n) => ({ ...n, read: true }));
    await writeJson(RC_NOTES_KEY, all);
  },
};
