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
import { DISTRICTS } from '../constants/lookups';
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
import type { BatchProgressRow, PlatformSummary } from '../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'SuperAdminHome'>;
type MenuKey = 'home' | 'admins' | 'reports';
type ReportKind = 'progress' | 'attendance' | 'certificates' | 'submissions';

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
  const [batches, setBatches] = useState<BatchProgressRow[]>([]);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [colleges, setColleges] = useState<{ id: string; name: string; district: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<AdminUserDraft>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [district, setDistrict] = useState('All');
  const [collegeId, setCollegeId] = useState('');
  const [reportKind, setReportKind] = useState<ReportKind>('progress');
  const [filteredProgress, setFilteredProgress] = useState<BatchProgressRow[]>([]);

  const load = useCallback(async () => {
    setSummary(await reportsApi.getPlatformSummary());
    setBatches(await reportsApi.listBatchProgress());
    setAdmins(await adminUsersApi.listUsers());
    setColleges(await reportsApi.listCollegesForReports());
    const scoped = await reportsApi.listBatchProgress(
      collegeId || undefined,
      district === 'All' ? undefined : district,
    );
    setFilteredProgress(scoped);
  }, [collegeId, district]);

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
    const scoped =
      district === 'All' ? colleges : colleges.filter((c) => c.district === district);
    return [
      { value: '', label: 'All colleges (scope above)' },
      ...scoped.map((c) => ({ value: c.id, label: `${c.name} · ${c.district}` })),
    ];
  }, [colleges, district]);

  const createAdmin = async () => {
    try {
      setSaving(true);
      await adminUsersApi.createUser(draft, user?.email || 'super_admin');
      setDraft(emptyDraft());
      Alert.alert('Admin created', 'Share the email and password with the staff member.');
      await load();
      setMenu('admins');
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
      const enrollmentId = collegeId || undefined;
      const dist = district === 'All' ? undefined : district;
      const progress = await reportsApi.listBatchProgress(enrollmentId, dist);
      const requestIds = new Set(progress.map((p) => p.requestId));

      if (reportKind === 'progress') {
        await exportTextReport('Batch Progress (filtered)', reportsApi.batchProgressToCsv(progress));
      } else if (reportKind === 'attendance') {
        const rows = (await reportsApi.getAttendanceReport(undefined, enrollmentId)).filter((r) =>
          requestIds.has(r.requestId),
        );
        await exportTextReport('Attendance (filtered)', reportsApi.attendanceToCsv(rows));
      } else if (reportKind === 'certificates') {
        const rows = (await reportsApi.getCertificatesReport(undefined, enrollmentId)).filter((r) =>
          requestIds.has(r.requestId),
        );
        await exportTextReport('Certificates (filtered)', reportsApi.certificatesToCsv(rows));
      } else {
        const rows = (await reportsApi.getSubmissionsReport(undefined, enrollmentId)).filter((r) =>
          requestIds.has(r.requestId),
        );
        await exportTextReport('Submissions (filtered)', reportsApi.submissionsToCsv(rows));
      }

      Alert.alert(
        'Ready',
        Platform.OS === 'web'
          ? 'CSV copied to clipboard. Paste into Excel / Google Sheets.'
          : 'Report ready to share.',
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const scopeLabel =
    district === 'All' && !collegeId
      ? 'Entire Telangana (all approved colleges)'
      : [district !== 'All' ? district : null, collegeId ? 'selected college' : null]
          .filter(Boolean)
          .join(' · ');

  return (
    <AdminShell
      brandTitle="Super Admin"
      userName={user?.name || 'Super Admin'}
      active={menu}
      onChange={(key) => setMenu(key as MenuKey)}
      onSignOut={onSignOut}
      menu={[
        { key: 'home', label: 'Overview' },
        { key: 'admins', label: 'Staff admins', badge: managedAdmins.length || undefined },
        { key: 'reports', label: 'Reports' },
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
              title="State overview"
              subtitle="Create staff admins, monitor operations, download statewide reports"
              action={
                <PrimaryButton
                  title="Profile"
                  variant="secondary"
                  onPress={() => navigation.navigate('ProfileEdit')}
                />
              }
            />
            {summary ? (
              <StatTiles
                items={[
                  { label: 'Colleges', value: String(summary.collegesApproved) },
                  { label: 'Students', value: String(summary.students) },
                  { label: 'Trainers', value: String(summary.trainersActive) },
                  { label: 'Sessions', value: String(summary.sessionsApproved) },
                  { label: 'Certificates', value: String(summary.certificatesIssued) },
                  { label: 'Pending colleges', value: String(summary.collegesPending) },
                ]}
              />
            ) : (
              <EmptyState title="Loading overview…" />
            )}

            <SectionLabel>Quick links</SectionLabel>
            <PrimaryButton
              title="Open TASK Admin operations"
              onPress={() => navigation.navigate('TaskAdminHome')}
            />
            <View style={styles.gap} />
            <PrimaryButton
              title="Create staff admin"
              variant="secondary"
              onPress={() => setMenu('admins')}
            />
            <View style={styles.gap} />
            <PrimaryButton
              title="Download reports"
              variant="secondary"
              onPress={() => setMenu('reports')}
            />

            <SectionLabel>Recent batches</SectionLabel>
            {batches.slice(0, 6).map((b) => (
              <DataCard key={b.requestId}>
                <Text style={styles.cardTitle}>{b.courseName}</Text>
                <Text style={styles.meta}>
                  {b.collegeName} · {b.branch} · {b.registeredStudents} students
                </Text>
                <Text style={styles.meta}>
                  Attendance {b.avgAttendancePercent}% · Certs {b.certificatesIssued}
                </Text>
              </DataCard>
            ))}
          </>
        ) : null}

        {menu === 'admins' ? (
          <>
            <PanelHeader
              title="Staff admins"
              subtitle="Create TASK Admin and Placement Coordinator accounts with login credentials"
            />

            <SectionLabel>Create admin user</SectionLabel>
            <DataCard>
              <FormField
                label="Full name"
                required
                value={draft.name}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
              />
              <FormField
                label="Email"
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
                label="Temporary password"
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
                title={saving ? 'Creating…' : 'Create admin & credentials'}
                onPress={createAdmin}
                disabled={saving}
              />
            </DataCard>

            <SectionLabel>Directory</SectionLabel>
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
              title="Statewide reports"
              subtitle="Download for entire state or filter by district / college"
            />
            <DataCard>
              <Text style={styles.scope}>Scope: {scopeLabel}</Text>
              <DropdownField
                label="District"
                value={district}
                onChange={(v) => {
                  setDistrict(v);
                  setCollegeId('');
                }}
                options={[
                  { value: 'All', label: 'All Telangana' },
                  ...DISTRICTS.map((d) => ({ value: d, label: d })),
                ]}
              />
              <DropdownField
                label="College"
                value={collegeId}
                onChange={setCollegeId}
                options={collegeOptions}
              />
              <DropdownField
                label="Report type"
                value={reportKind}
                onChange={(v) => setReportKind(v as ReportKind)}
                options={[
                  { value: 'progress', label: 'Batch progress' },
                  { value: 'attendance', label: 'Attendance' },
                  { value: 'certificates', label: 'Certificates' },
                  { value: 'submissions', label: 'Assignment submissions' },
                ]}
              />
              <PrimaryButton title="Apply filters & refresh preview" onPress={load} />
              <View style={styles.gap} />
              <PrimaryButton title="Download CSV" onPress={downloadReport} />
            </DataCard>

            <SectionLabel>{`Preview (${filteredProgress.length} batches)`}</SectionLabel>
            {filteredProgress.length === 0 ? (
              <EmptyState title="No batches in this scope" body="Widen district/college filters." />
            ) : (
              filteredProgress.slice(0, 12).map((b) => (
                <DataCard key={b.requestId}>
                  <Text style={styles.cardTitle}>{b.courseName}</Text>
                  <Text style={styles.meta}>
                    {b.collegeName} · {b.registeredStudents} students · {b.avgAttendancePercent}% att.
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
  scope: { fontWeight: '700', color: colors.primaryDark, marginBottom: 10, fontSize: 13 },
});
