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
import { ProgressBar } from '../components/SimpleCharts';
import { PrimaryButton, Screen } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { exportTextReport, reportsApi } from '../services/reportsApi';
import { colors } from '../theme/colors';
import type { BatchProgressRow, PlatformSummary } from '../types/reports';

type Props = NativeStackScreenProps<RootStackParamList, 'SuperAdminHome'>;
type Tab = 'home' | 'reports';

export function SuperAdminHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<Tab>('home');
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [batches, setBatches] = useState<BatchProgressRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setSummary(await reportsApi.getPlatformSummary());
    setBatches(await reportsApi.listBatchProgress());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const attention = useMemo(() => {
    if (!summary) return [];
    const items: { title: string; detail: string; action?: () => void }[] = [];
    if (summary.collegesPending > 0) {
      items.push({
        title: `${summary.collegesPending} college(s) waiting approval`,
        detail: 'Open TASK Admin inbox to approve or reject.',
        action: () => navigation.navigate('TaskAdminHome'),
      });
    }
    if (summary.submissionsPending > 0) {
      items.push({
        title: `${summary.submissionsPending} assignment submission(s) pending review`,
        detail: 'Trainers need to accept or send back for revision.',
      });
    }
    const lowAttendance = batches.filter((b) => b.avgAttendancePercent > 0 && b.avgAttendancePercent < 75);
    if (lowAttendance.length > 0) {
      items.push({
        title: `${lowAttendance.length} batch(es) below 75% attendance`,
        detail: 'These batches are not yet ready for certificates.',
      });
    }
    return items;
  }, [summary, batches, navigation]);

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const exportSimple = async (kind: 'progress' | 'attendance' | 'certificates') => {
    try {
      if (kind === 'progress') {
        await exportTextReport('Batch Progress', reportsApi.batchProgressToCsv(batches));
      } else if (kind === 'attendance') {
        const rows = await reportsApi.getAttendanceReport();
        await exportTextReport('Attendance', reportsApi.attendanceToCsv(rows));
      } else {
        const rows = await reportsApi.getCertificatesReport();
        await exportTextReport('Certificates', reportsApi.certificatesToCsv(rows));
      }
      Alert.alert(
        'Ready',
        Platform.OS === 'web'
          ? 'CSV copied. Paste into Excel / Google Sheets.'
          : 'Report ready to share.',
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <Screen
      title="Super Admin"
      subtitle={
        user
          ? `Hi ${user.role === 'super_admin' ? 'Super Admin' : user.name.split(' ')[0]} — keep it simple`
          : 'Super Admin'
      }
    >
      <View style={styles.tabs}>
        <Pressable
          onPress={() => setTab('home')}
          style={[styles.tab, tab === 'home' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'home' && styles.tabTextActive]}>Home</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('reports')}
          style={[styles.tab, tab === 'reports' && styles.tabActive]}
        >
          <Text style={[styles.tabText, tab === 'reports' && styles.tabTextActive]}>
            Easy reports
          </Text>
        </Pressable>
      </View>

      {tab === 'home' ? (
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
          <Text style={styles.h1}>At a glance</Text>
          {summary ? (
            <View style={styles.bigRow}>
              <BigNumber label="Colleges" value={summary.collegesApproved} hint="approved" />
              <BigNumber label="Students" value={summary.students} hint="registered" />
              <BigNumber label="Trainers" value={summary.trainersActive} hint="active" />
              <BigNumber label="Sessions" value={summary.sessionsApproved} hint="running" />
              <BigNumber label="Certificates" value={summary.certificatesIssued} hint="issued" />
              <BigNumber
                label="To do"
                value={
                  summary.collegesPending + summary.submissionsPending
                }
                hint="pending items"
                warn
              />
            </View>
          ) : (
            <Text style={styles.muted}>Loading…</Text>
          )}

          <Text style={styles.h1}>Needs your attention</Text>
          {attention.length === 0 ? (
            <View style={styles.calmBox}>
              <Text style={styles.calmTitle}>All clear</Text>
              <Text style={styles.muted}>Nothing urgent right now.</Text>
            </View>
          ) : (
            attention.map((item) => (
              <Pressable
                key={item.title}
                style={styles.attention}
                onPress={item.action}
                disabled={!item.action}
              >
                <Text style={styles.attentionTitle}>{item.title}</Text>
                <Text style={styles.muted}>{item.detail}</Text>
                {item.action ? <Text style={styles.link}>Open →</Text> : null}
              </Pressable>
            ))
          )}

          <Text style={styles.h1}>Batches (simple)</Text>
          {batches.length === 0 ? (
            <Text style={styles.muted}>No training batches yet.</Text>
          ) : (
            batches.slice(0, 8).map((b) => (
              <View key={b.requestId} style={styles.batch}>
                <Text style={styles.batchTitle}>{b.courseName}</Text>
                <Text style={styles.muted}>{b.collegeName}</Text>
                <Text style={styles.batchLine}>
                  {b.registeredStudents} students · {b.certificatesIssued} certificates
                </Text>
                <Text style={styles.batchLine}>Attendance</Text>
                <ProgressBar
                  value={b.avgAttendancePercent}
                  color={b.avgAttendancePercent >= 75 ? colors.success : colors.warning}
                />
              </View>
            ))
          )}

          <View style={styles.gap} />
          <PrimaryButton
            title="Approve colleges / assign trainers"
            onPress={() => navigation.navigate('TaskAdminHome')}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title="Manage courses"
            variant="secondary"
            onPress={() => navigation.navigate('TaskAdminCourses')}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title="Manage trainers"
            variant="secondary"
            onPress={() => navigation.navigate('TaskAdminTrainers')}
          />
          <View style={styles.gap} />
          <PrimaryButton
            title="Change password"
            variant="secondary"
            onPress={() => navigation.navigate('ProfileEdit')}
          />
          <View style={styles.gap} />
          <PrimaryButton title="Sign out" variant="secondary" onPress={onSignOut} />
        </ScrollView>
      ) : null}

      {tab === 'reports' ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.h1}>Easy reports</Text>
          <Text style={styles.lead}>
            Three downloads only. No filters. Open in Excel when you need details.
          </Text>

          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>1. Batch progress</Text>
            <Text style={styles.muted}>
              One row per batch: students, attendance %, certificates.
            </Text>
            <View style={styles.gap} />
            <PrimaryButton title="Download batch report" onPress={() => exportSimple('progress')} />
          </View>

          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>2. Attendance sheet</Text>
            <Text style={styles.muted}>Who was Present / Late / Absent, by date.</Text>
            <View style={styles.gap} />
            <PrimaryButton
              title="Download attendance"
              onPress={() => exportSimple('attendance')}
            />
          </View>

          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>3. Certificates issued</Text>
            <Text style={styles.muted}>Student name, course, certificate code, date.</Text>
            <View style={styles.gap} />
            <PrimaryButton
              title="Download certificates"
              onPress={() => exportSimple('certificates')}
            />
          </View>

          <Text style={styles.hint}>
            On web, download copies CSV to clipboard — paste into Excel.
          </Text>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function BigNumber({
  label,
  value,
  hint,
  warn,
}: {
  label: string;
  value: number;
  hint: string;
  warn?: boolean;
}) {
  return (
    <View style={styles.bigCard}>
      <Text style={[styles.bigValue, warn && value > 0 ? styles.bigWarn : null]}>{value}</Text>
      <Text style={styles.bigLabel}>{label}</Text>
      <Text style={styles.bigHint}>{hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: { color: colors.text, fontWeight: '700', fontSize: 14 },
  tabTextActive: { color: colors.white },
  content: { paddingBottom: 40 },
  h1: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 10,
  },
  lead: { color: colors.textMuted, marginBottom: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  bigRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  bigCard: {
    width: '31%',
    minWidth: 100,
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  bigValue: { fontSize: 28, fontWeight: '800', color: colors.primaryDark },
  bigWarn: { color: colors.warning },
  bigLabel: { marginTop: 4, fontWeight: '700', color: colors.text, fontSize: 13 },
  bigHint: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  calmBox: {
    backgroundColor: colors.successSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  calmTitle: { fontWeight: '800', color: colors.success, marginBottom: 4 },
  attention: {
    backgroundColor: colors.warningSoft,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  attentionTitle: { fontWeight: '800', color: colors.warning, marginBottom: 4 },
  link: { marginTop: 8, color: colors.primary, fontWeight: '700' },
  batch: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginBottom: 8,
  },
  batchTitle: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  batchLine: { marginTop: 6, color: colors.text, fontSize: 12, fontWeight: '600' },
  reportCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 12,
  },
  reportTitle: { fontWeight: '800', color: colors.text, fontSize: 16, marginBottom: 6 },
  hint: { color: colors.textMuted, fontSize: 12, marginTop: 8, lineHeight: 18 },
  gap: { height: 10 },
});
