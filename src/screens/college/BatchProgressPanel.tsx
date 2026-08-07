import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  FilterGrid,
  PanelHeader,
  ResultBar,
  SearchInput,
  StatTiles,
} from '../../components/college/PanelChrome';
import { DropdownField, PrimaryButton, StatusBadge } from '../../components/ui';
import { BRANCHES } from '../../constants/courses';
import { reportsApi } from '../../services/reportsApi';
import { colors } from '../../theme/colors';
import type { BatchProgressRow } from '../../types/reports';

export function BatchProgressPanel({
  enrollmentId,
  onOpenSession,
}: {
  enrollmentId: string;
  onOpenSession?: (requestId: string) => void;
}) {
  const [rows, setRows] = useState<BatchProgressRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');

  const load = useCallback(async () => {
    setRows(await reportsApi.listBatchProgress(enrollmentId));
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (branch && r.branch !== branch) return false;
      if (!q) return true;
      return (
        r.courseName.toLowerCase().includes(q) ||
        r.branch.toLowerCase().includes(q) ||
        (r.trainerName || '').toLowerCase().includes(q)
      );
    });
  }, [rows, branch, query]);

  const totals = useMemo(() => {
    const students = filtered.reduce((sum, r) => sum + r.registeredStudents, 0);
    const avg =
      filtered.length === 0
        ? 0
        : Math.round(
            filtered.reduce((sum, r) => sum + r.avgAttendancePercent, 0) / filtered.length,
          );
    const certs = filtered.reduce((sum, r) => sum + r.certificatesIssued, 0);
    return { students, avg, certs, batches: filtered.length };
  }, [filtered]);

  return (
    <ScrollView
      contentContainerStyle={styles.pad}
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
      <PanelHeader
        title="Batch progress"
        subtitle="Attendance, submissions, and certificate progress for approved batches."
      />

      <StatTiles
        items={[
          { label: 'Batches', value: totals.batches },
          { label: 'Students registered', value: totals.students },
          { label: 'Avg attendance', value: `${totals.avg}%` },
          { label: 'Certificates', value: totals.certs },
        ]}
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course, branch, or trainer"
      />

      <FilterGrid>
        <DropdownField
          label="Branch"
          value={branch}
          onChange={setBranch}
          options={[
            { value: '', label: 'All branches' },
            ...BRANCHES.map((b) => ({ value: b, label: b })),
          ]}
        />
      </FilterGrid>

      <PrimaryButton title="Refresh" variant="secondary" onPress={load} />
      <ResultBar label="Batches shown" count={filtered.length} />

      {filtered.length === 0 ? (
        <EmptyState
          title="No approved batches yet"
          body="Once TASK Admin approves a course request, progress metrics appear here."
        />
      ) : (
        filtered.map((row) => (
          <Pressable
            key={row.requestId}
            onPress={() => onOpenSession?.(row.requestId)}
            disabled={!onOpenSession}
          >
            <DataCard accent>
              <View style={styles.row}>
                <Text style={styles.title}>{row.courseName}</Text>
                <StatusBadge status={row.status} />
              </View>
              <Text style={styles.meta}>
                {row.branch} · Grad {row.yearOfGraduation} · {row.startDate} → {row.endDate}
              </Text>
              <Text style={styles.meta}>Trainer: {row.trainerName || 'Not assigned'}</Text>
              <View style={styles.metrics}>
                <Metric label="Students" value={String(row.registeredStudents)} />
                <Metric label="Attendance" value={`${row.avgAttendancePercent}%`} />
                <Metric label="Pending work" value={String(row.submissionsPending)} />
                <Metric label="Certificates" value={String(row.certificatesIssued)} />
              </View>
              {onOpenSession ? <Text style={styles.link}>Open session details →</Text> : null}
            </DataCard>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  metric: {
    backgroundColor: colors.primarySoft,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 90,
  },
  metricValue: { fontWeight: '800', color: colors.primaryDark, fontSize: 14 },
  metricLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  link: { marginTop: 10, color: colors.primary, fontWeight: '700', fontSize: 13 },
});
