import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SessionUser } from '../types/enrollment';
import type {
  AdminUser,
  AdminUserDraft,
  ManagedAdminRole,
} from '../types/adminUser';
import { isValidMobile } from '../utils/validation';

const ADMIN_USERS_KEY = 'task.adminUsers.v1';
const SESSION_KEY = 'task.session.v2';

export const DEMO_SUPER_ADMIN = {
  id: 'adm_super_1',
  email: 'superadmin@task.telangana.gov.in',
  password: 'SuperAdmin@123',
  name: 'TASK Super Administrator',
  mobile: '9000000001',
};

export const DEMO_TASK_ADMIN = {
  id: 'adm_task_1',
  email: 'admin@task.telangana.gov.in',
  password: 'TaskAdmin@123',
  name: 'TASK Administrator',
  mobile: '9000000002',
};

export const DEMO_PLACEMENT_COORDINATOR = {
  id: 'adm_place_1',
  email: 'placement@task.telangana.gov.in',
  password: 'Placement@123',
  name: 'Placement Coordinator Demo',
  mobile: '9000000003',
  districtScope: 'Hyderabad',
};

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function delay(ms = 280): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readUsers(): Promise<AdminUser[]> {
  const raw = await AsyncStorage.getItem(ADMIN_USERS_KEY);
  if (!raw) return [];
  return JSON.parse(raw) as AdminUser[];
}

async function writeUsers(items: AdminUser[]): Promise<void> {
  await AsyncStorage.setItem(ADMIN_USERS_KEY, JSON.stringify(items));
}

function toSession(user: AdminUser): SessionUser {
  return {
    role: user.role,
    email: user.email,
    name: user.name,
    adminUserId: user.id,
  };
}

function validateDraft(draft: AdminUserDraft, requirePassword: boolean): void {
  if (!draft.name.trim()) throw new Error('Full name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) {
    throw new Error('Enter a valid email address.');
  }
  if (!isValidMobile(draft.mobile)) {
    throw new Error('Enter a valid 10-digit mobile number.');
  }
  if (!draft.role) throw new Error('Select an admin role.');
  if (requirePassword) {
    if (draft.password.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (draft.password !== draft.confirmPassword) {
      throw new Error('Password and confirmation do not match.');
    }
  }
}

export const adminUsersApi = {
  async ensureSeedAdmins(): Promise<AdminUser[]> {
    const existing = await readUsers();
    const now = new Date().toISOString();
    const seeds: AdminUser[] = [
      {
        id: DEMO_SUPER_ADMIN.id,
        name: DEMO_SUPER_ADMIN.name,
        email: DEMO_SUPER_ADMIN.email,
        mobile: DEMO_SUPER_ADMIN.mobile,
        role: 'super_admin',
        passwordHash: DEMO_SUPER_ADMIN.password,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
      {
        id: DEMO_TASK_ADMIN.id,
        name: DEMO_TASK_ADMIN.name,
        email: DEMO_TASK_ADMIN.email,
        mobile: DEMO_TASK_ADMIN.mobile,
        role: 'task_admin',
        passwordHash: DEMO_TASK_ADMIN.password,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
      {
        id: DEMO_PLACEMENT_COORDINATOR.id,
        name: DEMO_PLACEMENT_COORDINATOR.name,
        email: DEMO_PLACEMENT_COORDINATOR.email,
        mobile: DEMO_PLACEMENT_COORDINATOR.mobile,
        role: 'placement_coordinator',
        passwordHash: DEMO_PLACEMENT_COORDINATOR.password,
        status: 'active',
        districtScope: DEMO_PLACEMENT_COORDINATOR.districtScope,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
      },
    ];

    if (!existing.length) {
      await writeUsers(seeds);
      return seeds;
    }

    const byEmail = new Map(existing.map((u) => [u.email, u]));
    let changed = false;
    for (const seed of seeds) {
      if (!byEmail.has(seed.email)) {
        existing.push(seed);
        changed = true;
      }
    }
    if (changed) await writeUsers(existing);
    return readUsers();
  },

  async listUsers(params?: {
    query?: string;
    role?: string;
    status?: string;
  }): Promise<AdminUser[]> {
    await delay();
    await this.ensureSeedAdmins();
    let items = await readUsers();
    if (params?.role && params.role !== 'All') {
      items = items.filter((u) => u.role === params.role);
    }
    if (params?.status && params.status !== 'All') {
      items = items.filter((u) => u.status === params.status);
    }
    const q = params?.query?.trim().toLowerCase();
    if (q) {
      items = items.filter(
        (u) =>
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.mobile.includes(q),
      );
    }
    return items.sort((a, b) => a.name.localeCompare(b.name));
  },

  async getUser(id: string): Promise<AdminUser | null> {
    const items = await readUsers();
    return items.find((u) => u.id === id) ?? null;
  },

  async getByEmail(email: string): Promise<AdminUser | null> {
    await this.ensureSeedAdmins();
    const items = await readUsers();
    return items.find((u) => u.email === email.trim().toLowerCase()) ?? null;
  },

  async createUser(draft: AdminUserDraft, createdBy: string): Promise<AdminUser> {
    await delay(350);
    validateDraft(draft, true);
    const email = draft.email.trim().toLowerCase();
    const items = await readUsers();
    if (items.some((u) => u.email === email)) {
      throw new Error('An admin user with this email already exists.');
    }
    const now = new Date().toISOString();
    const record: AdminUser = {
      id: uid('adm'),
      name: draft.name.trim(),
      email,
      mobile: draft.mobile.trim(),
      role: draft.role,
      passwordHash: draft.password,
      status: 'active',
      districtScope: draft.districtScope?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      createdBy,
    };
    items.unshift(record);
    await writeUsers(items);
    return record;
  },

  async updateUser(
    id: string,
    input: {
      name: string;
      mobile: string;
      role?: ManagedAdminRole;
      status?: AdminUser['status'];
      districtScope?: string;
      newPassword?: string;
    },
  ): Promise<AdminUser> {
    await delay(350);
    const items = await readUsers();
    const index = items.findIndex((u) => u.id === id);
    if (index < 0) throw new Error('Admin user not found.');
    const current = items[index];
    if (current.role === 'super_admin' && input.role) {
      throw new Error('Cannot change the Super Admin role.');
    }
    if (input.newPassword && input.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }
    if (!input.name.trim()) throw new Error('Full name is required.');
    if (!isValidMobile(input.mobile)) throw new Error('Enter a valid 10-digit mobile number.');

    items[index] = {
      ...current,
      name: input.name.trim(),
      mobile: input.mobile.trim(),
      role: current.role === 'super_admin' ? 'super_admin' : input.role || current.role,
      status: input.status || current.status,
      districtScope:
        input.districtScope !== undefined
          ? input.districtScope.trim() || undefined
          : current.districtScope,
      passwordHash: input.newPassword || current.passwordHash,
      updatedAt: new Date().toISOString(),
    };
    await writeUsers(items);
    return items[index];
  },

  async signIn(email: string, password: string): Promise<SessionUser | null> {
    await this.ensureSeedAdmins();
    const user = await this.getByEmail(email);
    if (!user) return null;
    if (user.status !== 'active') {
      throw new Error('This admin account is inactive. Contact Super Admin.');
    }
    if (user.passwordHash !== password) return null;
    const session = toSession(user);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  },

  async updateOwnPassword(
    adminUserId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.getUser(adminUserId);
    if (!user) throw new Error('Admin user not found.');
    if (user.passwordHash !== currentPassword) {
      throw new Error('Current password is incorrect.');
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters.');
    }
    await this.updateUser(adminUserId, {
      name: user.name,
      mobile: user.mobile,
      newPassword,
    });
  },
};
