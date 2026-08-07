import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Platform,
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
import { DropdownField, PrimaryButton } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { adminUsersApi } from '../services/adminUsersApi';
import { mockApi } from '../services/mockApi';
import { exportTextReport, reportsApi } from '../services/reportsApi';
import { colors } from '../theme/colors';
import type { CollegeEnrollment } from '../types/enrollment';
import type { BatchProgressRow } from '../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'PlacementCoordinatorHome'>;
type MenuKey = 'home' | 'colleges' | 'reports';

export function PlacementCoordinatorHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<MenuKey>('home');
  const [districtScope, setDistrictScope] = useState<string | undefined>();
  const [colleges, setColleges] = useState<CollegeEnrollment[]>([]);
  const [batches, setBatches] = useState<BatchProgressRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [reportKind, setReportKind] = useState<'progress' | 'certificates'>('progress');

  const load = useCallback(async () => {
    let scope: string | undefined;
    if (user?.adminUserId) {
      const me = await adminUsersApi.getUser(user.adminUserId);
      scope = me?.districtScope;
      setDistrictScope(scope);
    } else if (user?.email) {
      const me = await adminUsersApi.getByEmail(user.email);
      scope = me?.districtScope;
      setDistrictScope(scope);
    }
    const all = await mockApi.listAllEnrollments();
    const approved = all.filter((c) => c.status === 'approved');
    const scoped = scope ? approved.filter((c) => c.district === scope) : approved;
    setColleges(scoped);
    setBatches(await reportsApi.listBatchProgress(undefined, scope));
  }, [user?.adminUserId, user?.email]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const studentsHint = useMemo(
    () => batches.reduce((sum, b) => sum + b.registeredStudents, 0),
    [batches],
  );

  const download = async () => {
    try {
      if (reportKind === 'progress') {
        await exportTextReport(
          `Placement progress${districtScope ? ` — ${districtScope}` : ''}`,
          reportsApi.batchProgressToCsv(batches),
        );
      } else {
        const rows = await reportsApi.getCertificatesReport();
        const ids = new Set(batches.map((b) => b.requestId));
        const filtered = rows.filter((r) => ids.has(r.requestId));
        await exportTextReport(
          `Placement certificates${districtScope ? ` — ${districtScope}` : ''}`,
          reportsApi.certificatesToCsv(filtered),
        );
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

  return (
    <AdminShell
      brandTitle="Placement"
      userName={user?.name || 'Placement Coordinator'}
      active={menu}
      onChange={(key) => setMenu(key as MenuKey)}
      onSignOut={onSignOut}
      menu={[
        { key: 'home', label: 'Home' },
        { key: 'colleges', label: 'Colleges' },
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
              title="Placement coordinator"
              subtitle={
                districtScope
                  ? `Scoped to ${districtScope} district`
                  : 'Statewide placement support view'
              }
              action={
                <PrimaryButton
                  title="Profile"
                  variant="secondary"
                  onPress={() => navigation.navigate('ProfileEdit')}
                />
              }
            />
            <StatTiles
              items={[
                { label: 'Colleges', value: String(colleges.length) },
                { label: 'Batches', value: String(batches.length) },
                { label: 'Enrolled seats', value: String(studentsHint) },
              ]}
            />
            <SectionLabel>Recent batches</SectionLabel>
            {batches.slice(0, 8).map((b) => (
              <DataCard key={b.requestId}>
                <Text style={styles.title}>{b.courseName}</Text>
                <Text style={styles.meta}>
                  {b.collegeName} · {b.registeredStudents} students
                </Text>
              </DataCard>
            ))}
            {batches.length === 0 ? (
              <EmptyState title="No batches in scope" body="Ask TASK Admin to approve sessions." />
            ) : null}
          </>
        ) : null}

        {menu === 'colleges' ? (
          <>
            <PanelHeader
              title="Colleges in scope"
              subtitle={districtScope || 'All Telangana approved colleges'}
            />
            {colleges.map((c) => (
              <DataCard key={c.id}>
                <Text style={styles.title}>{c.institutionName}</Text>
                <Text style={styles.meta}>
                  {c.district} · {c.institutionType} · {c.affiliatedUniversity}
                </Text>
              </DataCard>
            ))}
            {colleges.length === 0 ? <EmptyState title="No colleges in this district" /> : null}
          </>
        ) : null}

        {menu === 'reports' ? (
          <>
            <PanelHeader
              title="Placement reports"
              subtitle="Download progress or certificates for your district scope"
            />
            <DropdownField
              label="Report"
              value={reportKind}
              onChange={(v) => setReportKind(v as 'progress' | 'certificates')}
              options={[
                { value: 'progress', label: 'Batch progress' },
                { value: 'certificates', label: 'Certificates' },
              ]}
            />
            <PrimaryButton title="Download CSV" onPress={download} />
            <View style={styles.gap} />
            <Text style={styles.meta}>
              Scope: {districtScope || 'Entire Telangana'} · {batches.length} batches
            </Text>
          </>
        ) : null}
      </ScrollView>
    </AdminShell>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 40 },
  title: { fontWeight: '800', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  gap: { height: 10 },
});
