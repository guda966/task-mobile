import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { AdminShell } from '../components/AdminShell';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { DropdownField, FormField, PrimaryButton, StatusBadge } from '../components/ui';
import { DISTRICTS, REGIONAL_CENTERS } from '../constants/lookups';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { adminUsersApi } from '../services/adminUsersApi';
import { exportTextReport, reportsApi } from '../services/reportsApi';
import { colors } from '../theme/colors';
import {
  MANAGED_ADMIN_ROLE_OPTIONS,
  adminRoleLabel,
  type AdminUser,
  type AdminUserDraft,
  type ManagedAdminRole,
} from '../types/adminUser';
import type { BatchProgressRow, PlatformSummary, ReportScopeFilter } from '../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'SuperAdminHome'>;
/** Menu: Dashboard data · Create users · Extract / download data */
type MenuKey = 'home' | 'admins' | 'reports';
type ReportKind = 'progress' | 'attendance' | 'certificates' | 'submissions' | 'colleges';

const emptyDraft = (): AdminUserDraft => ({
  name: '',
  email: '',
  mobile: '',
  role: 'task_admin',
  password: '',
  confirmPassword: '',
  districtScope: '',
});

export function SuperAdminHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<MenuKey>('home');
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [colleges, setColleges] = useState<
    {
      id: string;
      name: string;
      district: string;
      regionalCenterId?: string;
      regionalCenterName?: string;
    }[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<AdminUserDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);

  /** Shared data scope for Dashboard + Extract data */
  const [regionalCenterId, setRegionalCenterId] = useState('All');
  const [district, setDistrict] = useState('All');
  const [collegeId, setCollegeId] = useState('');
  const [reportKind, setReportKind] = useState<ReportKind>('progress');
  const [filteredProgress, setFilteredProgress] = useState<BatchProgressRow[]>([]);

  const scopeFilter = useMemo((): ReportScopeFilter => {
    return {
      regionalCenterId: regionalCenterId === 'All' ? undefined : regionalCenterId,
      district: district === 'All' ? undefined : district,
      enrollmentId: collegeId || undefined,
    };
  }, [regionalCenterId, district, collegeId]);

  const load = useCallback(async () => {
    setSummary(await reportsApi.getPlatformSummary(scopeFilter));
    setAdmins(await adminUsersApi.listUsers());
    setColleges(await reportsApi.listCollegesForReports());
    setFilteredProgress(
      await reportsApi.listBatchProgress(
        scopeFilter.enrollmentId,
        scopeFilter.district,
        scopeFilter.regionalCenterId,
      ),
    );
  }, [scopeFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const managedAdmins = useMemo(
    () => admins.filter((a) => a.role !== 'super_admin'),
    [admins],
  );

  const collegeOptions = useMemo(() => {
    let scoped = colleges;
    if (regionalCenterId !== 'All') {
      scoped = scoped.filter((c) => c.regionalCenterId === regionalCenterId);
    }
    if (district !== 'All') {
      scoped = scoped.filter((c) => c.district === district);
    }
    return [
      { value: '', label: 'All colleges in scope' },
      ...scoped.map((c) => ({
        value: c.id,
        label: `${c.name} · ${c.district}`,
      })),
    ];
  }, [colleges, district, regionalCenterId]);

  const scopeLabel = useMemo(() => {
    if (!scopeFilter.regionalCenterId && !scopeFilter.district && !scopeFilter.enrollmentId) {
      return 'Entire Telangana (whole state)';
    }
    const parts: string[] = [];
    if (scopeFilter.regionalCenterId) {
      const rc = REGIONAL_CENTERS.find((r) => r.id === scopeFilter.regionalCenterId);
      parts.push(rc?.name || 'Regional centre');
    }
    if (scopeFilter.district) parts.push(`District: ${scopeFilter.district}`);
    if (scopeFilter.enrollmentId) {
      const c = colleges.find((x) => x.id === scopeFilter.enrollmentId);
      parts.push(c ? `College: ${c.name}` : 'Selected college');
    }
    return parts.join(' · ');
  }, [scopeFilter, colleges]);

  const createAdmin = async () => {
    try {
      setSaving(true);
      await adminUsersApi.createUser(draft, user?.email || 'super_admin');
      setDraft(emptyDraft());
      Alert.alert(
        'User created',
        'Share the email, password, and Staff Sign In link with the staff member.',
      );
      await load();
    } catch (e) {
      Alert.alert('Unable to create', e instanceof Error ? e.message : 'Try again');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (admin: AdminUser) => {
    if (admin.role === 'super_admin') return;
    try {
      await adminUsersApi.updateUser(admin.id, {
        name: admin.name,
        mobile: admin.mobile,
        role: admin.role as ManagedAdminRole,
        status: admin.status === 'active' ? 'inactive' : 'active',
        districtScope: admin.districtScope,
      });
      await load();
    } catch (e) {
      Alert.alert('Update failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const downloadReport = async () => {
    try {
      const progress = await reportsApi.listBatchProgress(
        scopeFilter.enrollmentId,
        scopeFilter.district,
        scopeFilter.regionalCenterId,
      );
      const requestIds = new Set(progress.map((p) => p.requestId));
      const titleSuffix = ` — ${scopeLabel}`;

      if (reportKind === 'progress') {
        await exportTextReport(
          `Batch progress${titleSuffix}`,
          reportsApi.batchProgressToCsv(progress),
        );
      } else if (reportKind === 'attendance') {
        const rows = (
          await reportsApi.getAttendanceReport(undefined, scopeFilter.enrollmentId)
        ).filter((r) => requestIds.has(r.requestId));
        await exportTextReport(`Attendance${titleSuffix}`, reportsApi.attendanceToCsv(rows));
      } else if (reportKind === 'certificates') {
        const rows = (
          await reportsApi.getCertificatesReport(undefined, scopeFilter.enrollmentId)
        ).filter((r) => requestIds.has(r.requestId));
        await exportTextReport(`Certificates${titleSuffix}`, reportsApi.certificatesToCsv(rows));
      } else if (reportKind === 'submissions') {
        const rows = (
          await reportsApi.getSubmissionsReport(undefined, scopeFilter.enrollmentId)
        ).filter((r) => requestIds.has(r.requestId));
        await exportTextReport(`Submissions${titleSuffix}`, reportsApi.submissionsToCsv(rows));
      } else {
        let list = colleges;
        if (scopeFilter.regionalCenterId) {
          list = list.filter((c) => c.regionalCenterId === scopeFilter.regionalCenterId);
        }
        if (scopeFilter.district) {
          list = list.filter((c) => c.district === scopeFilter.district);
        }
        if (scopeFilter.enrollmentId) {
          list = list.filter((c) => c.id === scopeFilter.enrollmentId);
        }
        const csv = [
          'College,District,Regional Centre',
          ...list.map(
            (c) =>
              `"${c.name.replace(/"/g, '""')}","${c.district}","${(c.regionalCenterName || '').replace(/"/g, '""')}"`,
          ),
        ].join('\n');
        await exportTextReport(`Colleges${titleSuffix}`, csv);
      }

      Alert.alert(
        'Download ready',
        Platform.OS === 'web'
          ? 'CSV copied to clipboard. Paste into Excel / Google Sheets.'
          : 'Report ready to share.',
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const ScopeFilters = (
    <DataCard>
      <Text style={styles.scopeBanner}>{scopeLabel}</Text>
      <Text style={styles.scopeHelp}>
        Choose whole state, or narrow by regional centre, district, and/or college. Dashboard
        numbers and downloads both use this scope.
      </Text>
      <DropdownField
        label="1. Regional centre"
        value={regionalCenterId}
        onChange={(v) => {
          setRegionalCenterId(v);
          setCollegeId('');
        }}
        options={[
          { value: 'All', label: 'All Telangana (whole state)' },
          ...REGIONAL_CENTERS.map((r) => ({ value: r.id, label: r.name })),
        ]}
      />
      <DropdownField
        label="2. District"
        value={district}
        onChange={(v) => {
          setDistrict(v);
          setCollegeId('');
        }}
        options={[
          { value: 'All', label: 'All districts in scope' },
          ...DISTRICTS.map((d) => ({ value: d, label: d })),
        ]}
      />
      <DropdownField
        label="3. College"
        value={collegeId}
        onChange={setCollegeId}
        options={collegeOptions}
      />
      <PrimaryButton title="Apply scope" onPress={load} />
    </DataCard>
  );

  return (
    <AdminShell
      brandTitle="Super Admin"
      userName={user?.name || 'Super Admin'}
      active={menu}
      onChange={(key) => setMenu(key as MenuKey)}
      onSignOut={onSignOut}
      menu={[
        { key: 'home', label: 'Dashboard' },
        { key: 'admins', label: 'Create users' },
        { key: 'reports', label: 'Extract data' },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {menu === 'home' ? (
          <>
            <PanelHeader
              title="Dashboard"
              subtitle="Live counts for colleges, students, trainings, and placements"
              action={
                <PrimaryButton
                  title="Profile"
                  variant="secondary"
                  onPress={() => navigation.navigate('ProfileEdit')}
                />
              }
            />

            <View style={styles.whereBox}>
              <Text style={styles.whereTitle}>Where to find things</Text>
              <Pressable onPress={() => setMenu('admins')} accessibilityRole="button">
                <Text style={styles.whereLink}>
                  → Create users — add TASK Admin / Placement Coordinator with email & password
                </Text>
              </Pressable>
              <Pressable onPress={() => setMenu('reports')} accessibilityRole="button">
                <Text style={styles.whereLink}>
                  → Extract data — download CSV for state / centre / district / college
                </Text>
              </Pressable>
            </View>

            <SectionLabel>Data scope</SectionLabel>
            {ScopeFilters}

            <SectionLabel>Counts in this scope</SectionLabel>
            {summary ? (
              <StatTiles
                items={[
                  {
                    label: 'Approved colleges',
                    value: String(summary.collegesApproved),
                    hint: 'Registered with TASK',
                  },
                  {
                    label: 'Students registered',
                    value: String(summary.students),
                    hint: 'Student portal accounts',
                  },
                  {
                    label: 'In trainings',
                    value: String(summary.studentsInTrainings),
                    hint: 'Enrolled in batches',
                  },
                  {
                    label: 'Placements done',
                    value: String(summary.placementsCompleted),
                    hint: 'Completed trainings',
                  },
                  {
                    label: 'Active batches',
                    value: String(summary.sessionsApproved),
                    hint: 'Approved course sessions',
                  },
                  {
                    label: 'Certificates issued',
                    value: String(summary.certificatesIssued),
                    hint: 'Within this scope',
                  },
                  {
                    label: 'Pending colleges',
                    value: String(summary.collegesPending),
                    hint: 'Awaiting TASK Admin',
                  },
                  {
                    label: 'Active trainers',
                    value: String(summary.trainersActive),
                    hint: 'Statewide trainer pool',
                  },
                ]}
              />
            ) : (
              <EmptyState title="Loading counts…" />
            )}

            <SectionLabel>{`Batches in scope (${filteredProgress.length})`}</SectionLabel>
            {filteredProgress.length === 0 ? (
              <EmptyState
                title="No training batches here"
                body="Widen the regional centre / district / college filters."
              />
            ) : (
              filteredProgress.slice(0, 8).map((b) => (
                <DataCard key={b.requestId}>
                  <Text style={styles.cardTitle}>{b.courseName}</Text>
                  <Text style={styles.meta}>
                    {b.collegeName} · {b.branch} YOG {b.yearOfGraduation}
                  </Text>
                  <Text style={styles.meta}>
                    {b.registeredStudents} students · {b.avgAttendancePercent}% attendance ·{' '}
                    {b.certificatesIssued} certificates
                  </Text>
                </DataCard>
              ))
            )}

            <View style={styles.gap} />
            <PrimaryButton title="Go to Extract data" onPress={() => setMenu('reports')} />
            <View style={styles.gap} />
            <PrimaryButton
              title="Open TASK Admin operations"
              variant="secondary"
              onPress={() => navigation.navigate('TaskAdminHome')}
            />
          </>
        ) : null}

        {menu === 'admins' ? (
          <>
            <PanelHeader
              title="Create users"
              subtitle="Assign role + login credentials. Staff sign in via Sign In → Staff / Admin sign in"
            />

            <SectionLabel>New user account</SectionLabel>
            <DataCard>
              <FormField
                label="Full name"
                required
                value={draft.name}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
              />
              <FormField
                label="Login email"
                required
                autoCapitalize="none"
                keyboardType="email-address"
                value={draft.email}
                onChangeText={(v) => setDraft((d) => ({ ...d, email: v }))}
              />
              <FormField
                label="Mobile"
                required
                keyboardType="phone-pad"
                value={draft.mobile}
                onChangeText={(v) => setDraft((d) => ({ ...d, mobile: v }))}
              />
              <DropdownField
                label="Role"
                required
                value={draft.role}
                onChange={(v) => setDraft((d) => ({ ...d, role: v as ManagedAdminRole }))}
                options={MANAGED_ADMIN_ROLE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
              />
              <Text style={styles.hint}>
                {MANAGED_ADMIN_ROLE_OPTIONS.find((o) => o.value === draft.role)?.hint}
              </Text>
              {draft.role === 'placement_coordinator' ? (
                <DropdownField
                  label="District scope (optional)"
                  value={draft.districtScope || ''}
                  onChange={(v) => setDraft((d) => ({ ...d, districtScope: v }))}
                  options={[
                    { value: '', label: 'All Telangana' },
                    ...DISTRICTS.map((d) => ({ value: d, label: d })),
                  ]}
                />
              ) : null}
              <FormField
                label="Password (share with user)"
                required
                secureTextEntry
                value={draft.password}
                onChangeText={(v) => setDraft((d) => ({ ...d, password: v }))}
              />
              <FormField
                label="Confirm password"
                required
                secureTextEntry
                value={draft.confirmPassword}
                onChangeText={(v) => setDraft((d) => ({ ...d, confirmPassword: v }))}
              />
              <PrimaryButton
                title={saving ? 'Creating…' : 'Create user & credentials'}
                onPress={createAdmin}
                disabled={saving}
              />
            </DataCard>

            <SectionLabel>{`Existing staff (${managedAdmins.length})`}</SectionLabel>
            {admins.map((admin) => (
              <Pressable
                key={admin.id}
                style={styles.adminCard}
                onPress={() => {
                  if (admin.role === 'super_admin') return;
                  toggleStatus(admin);
                }}
              >
                <View style={styles.row}>
                  <Text style={styles.cardTitle}>{admin.name}</Text>
                  <StatusBadge status={admin.status} />
                </View>
                <Text style={styles.meta}>{adminRoleLabel(admin.role)}</Text>
                <Text style={styles.meta}>
                  {admin.email} · {admin.mobile}
                </Text>
                {admin.districtScope ? (
                  <Text style={styles.meta}>District: {admin.districtScope}</Text>
                ) : null}
                {admin.role !== 'super_admin' ? (
                  <Text style={styles.cta}>
                    Tap to {admin.status === 'active' ? 'deactivate' : 'activate'}
                  </Text>
                ) : (
                  <Text style={styles.hint}>System Super Admin — not editable here</Text>
                )}
              </Pressable>
            ))}
          </>
        ) : null}

        {menu === 'reports' ? (
          <>
            <PanelHeader
              title="Extract data"
              subtitle="Download CSV for whole state or filtered regional centre / district / college"
            />

            <SectionLabel>1. Choose scope</SectionLabel>
            {ScopeFilters}

            <SectionLabel>2. Choose dataset & download</SectionLabel>
            <DataCard>
              <DropdownField
                label="What to download"
                value={reportKind}
                onChange={(v) => setReportKind(v as ReportKind)}
                options={[
                  { value: 'progress', label: 'Training batch progress' },
                  { value: 'attendance', label: 'Student attendance' },
                  { value: 'certificates', label: 'Certificates issued' },
                  { value: 'submissions', label: 'Assignment submissions' },
                  { value: 'colleges', label: 'College list' },
                ]}
              />
              <Text style={styles.hint}>
                File is copied to clipboard on web (paste into Excel). Scope: {scopeLabel}
              </Text>
              <PrimaryButton title="Download / copy CSV" onPress={downloadReport} />
            </DataCard>

            <SectionLabel>{`Preview — ${filteredProgress.length} batches`}</SectionLabel>
            {filteredProgress.length === 0 ? (
              <EmptyState title="Nothing in this scope" body="Widen filters, then Apply scope." />
            ) : (
              filteredProgress.slice(0, 12).map((b) => (
                <DataCard key={b.requestId}>
                  <Text style={styles.cardTitle}>{b.courseName}</Text>
                  <Text style={styles.meta}>
                    {b.collegeName} · {b.registeredStudents} students · {b.avgAttendancePercent}%
                    att.
                  </Text>
                </DataCard>
              ))
            )}
          </>
        ) : null}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  gap: { height: 10 },
  cardTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  hint: { color: colors.textMuted, fontSize: 12, marginBottom: 10, lineHeight: 17 },
  adminCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cta: { marginTop: 8, color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  scopeBanner: { fontWeight: '800', color: colors.primaryDark, marginBottom: 6, fontSize: 14 },
  scopeHelp: { color: colors.textMuted, fontSize: 12, lineHeight: 17, marginBottom: 12 },
  whereBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BFDCDC',
    padding: 14,
    marginBottom: 14,
    gap: 8,
  },
  whereTitle: { fontWeight: '800', color: colors.primaryDark, fontSize: 13, marginBottom: 2 },
  whereLink: { color: colors.text, fontSize: 13, lineHeight: 19, fontWeight: '600' },
});
