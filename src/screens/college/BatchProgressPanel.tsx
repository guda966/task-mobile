import React, { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '../../components/ui';
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

  const load = useCallback(async () => {
    setRows(await reportsApi.listBatchProgress(enrollmentId));
  }, [enrollmentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

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
      <Text style={styles.h1}>Batch progress</Text>
      <Text style={styles.lead}>
        Attendance, assignment submissions, and certificate progress for your approved training
        batches.
      </Text>

      {rows.length === 0 ? (
        <Text style={styles.muted}>No approved batches yet.</Text>
      ) : (
        rows.map((row) => (
          <Pressable
            key={row.requestId}
            style={styles.card}
            onPress={() => onOpenSession?.(row.requestId)}
            disabled={!onOpenSession}
          >
            <View style={styles.row}>
              <Text style={styles.title}>{row.courseName}</Text>
              <StatusBadge status={row.status} />
            </View>
            <Text style={styles.meta}>
              {row.branch} · Grad {row.yearOfGraduation} · {row.startDate} → {row.endDate}
            </Text>
            <Text style={styles.meta}>Trainer: {row.trainerName || 'Not assigned'}</Text>
            <Text style={styles.stat}>
              Students {row.registeredStudents} · Avg attendance {row.avgAttendancePercent}%
            </Text>
            <Text style={styles.stat}>
              Assignments {row.assignmentsTotal} · Accepted {row.submissionsAccepted} · Pending{' '}
              {row.submissionsPending}
            </Text>
            <Text style={styles.stat}>
              Certificates {row.certificatesIssued} · Eligible now {row.eligibleForCert}
            </Text>
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  lead: { color: colors.textMuted, marginBottom: 14, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 4 },
  title: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  stat: { color: colors.primaryDark, fontSize: 12, fontWeight: '600', marginTop: 4 },
});
