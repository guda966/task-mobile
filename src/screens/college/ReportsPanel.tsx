import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton } from '../../components/ui';
import { exportTextReport, reportsApi } from '../../services/reportsApi';
import { colors } from '../../theme/colors';
import type {
  AttendanceReportRow,
  BatchProgressRow,
  CertificateReportRow,
  SubmissionReportRow,
} from '../../types/reports';

type ReportKind = 'progress' | 'attendance' | 'submissions' | 'certificates';

export function ReportsPanel({
  enrollmentId,
  showCollegeFilter = false,
  colleges = [],
}: {
  enrollmentId?: string;
  showCollegeFilter?: boolean;
  colleges?: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState<ReportKind>('progress');
  const [collegeFilter, setCollegeFilter] = useState(enrollmentId || '');
  const [sessionFilter, setSessionFilter] = useState('');
  const [progress, setProgress] = useState<BatchProgressRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReportRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionReportRow[]>([]);
  const [certificates, setCertificates] = useState<CertificateReportRow[]>([]);
  const [loading, setLoading] = useState(false);

  const scopeEnrollment = enrollmentId || collegeFilter || undefined;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const batches = await reportsApi.listBatchProgress(scopeEnrollment);
      setProgress(batches);
      const requestId = sessionFilter || undefined;
      setAttendance(await reportsApi.getAttendanceReport(requestId, scopeEnrollment));
      setSubmissions(await reportsApi.getSubmissionsReport(requestId, scopeEnrollment));
      setCertificates(await reportsApi.getCertificatesReport(requestId, scopeEnrollment));
    } finally {
      setLoading(false);
    }
  }, [scopeEnrollment, sessionFilter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const sessionOptions = useMemo(
    () => [
      { value: '', label: 'All sessions' },
      ...progress.map((p) => ({
        value: p.requestId,
        label: `${p.courseName} (${p.startDate})`,
      })),
    ],
    [progress],
  );

  const exportCurrent = async () => {
    try {
      let title = 'TASK Report';
      let body = '';
      if (kind === 'progress') {
        title = 'Batch Progress Report';
        body = reportsApi.batchProgressToCsv(progress);
      } else if (kind === 'attendance') {
        title = 'Attendance Report';
        body = reportsApi.attendanceToCsv(attendance);
      } else if (kind === 'submissions') {
        title = 'Submissions Report';
        body = reportsApi.submissionsToCsv(submissions);
      } else {
        title = 'Certificates Report';
        body = reportsApi.certificatesToCsv(certificates);
      }
      await exportTextReport(title, body);
      Alert.alert(
        'Exported',
        Platform.OS === 'web'
          ? 'Report copied to clipboard (CSV). Paste into Excel or Sheets.'
          : 'Share sheet opened with the CSV report.',
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  const preview =
    kind === 'progress'
      ? progress.slice(0, 12)
      : kind === 'attendance'
        ? attendance.slice(0, 20)
        : kind === 'submissions'
          ? submissions.slice(0, 20)
          : certificates.slice(0, 20);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Reports</Text>
      <Text style={styles.lead}>
        Attendance sheets, assignment submission status, certificates, and batch progress. Export as
        CSV.
      </Text>

      <DropdownField
        label="Report type"
        value={kind}
        onChange={(v) => setKind(v as ReportKind)}
        options={[
          { value: 'progress', label: 'Batch progress' },
          { value: 'attendance', label: 'Attendance sheet' },
          { value: 'submissions', label: 'Assignment submissions' },
          { value: 'certificates', label: 'Certificates issued' },
        ]}
      />

      {showCollegeFilter ? (
        <DropdownField
          label="College"
          value={collegeFilter}
          onChange={setCollegeFilter}
          options={[
            { value: '', label: 'All colleges' },
            ...colleges.map((c) => ({ value: c.id, label: c.name })),
          ]}
        />
      ) : null}

      <DropdownField
        label="Session"
        value={sessionFilter}
        onChange={setSessionFilter}
        options={sessionOptions}
      />

      <PrimaryButton title={loading ? 'Loading…' : 'Refresh'} variant="secondary" onPress={load} />
      <View style={styles.gap} />
      <PrimaryButton title="Export CSV" onPress={exportCurrent} disabled={loading} />

      <Text style={styles.h2}>Preview</Text>
      {preview.length === 0 ? (
        <Text style={styles.muted}>{loading ? 'Loading…' : 'No rows for this report.'}</Text>
      ) : kind === 'progress' ? (
        (preview as BatchProgressRow[]).map((r) => (
          <View key={r.requestId} style={styles.card}>
            <Text style={styles.title}>{r.courseName}</Text>
            <Text style={styles.meta}>
              {r.collegeName} · Students {r.registeredStudents} · Attendance {r.avgAttendancePercent}%
            </Text>
            <Text style={styles.meta}>
              Certs {r.certificatesIssued} · Pending submissions {r.submissionsPending}
            </Text>
          </View>
        ))
      ) : kind === 'attendance' ? (
        (preview as AttendanceReportRow[]).map((r, i) => (
          <View key={`${r.studentId}_${r.sessionDate}_${i}`} style={styles.card}>
            <Text style={styles.title}>
              {r.studentName} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.courseName} · {r.sessionDate}
            </Text>
          </View>
        ))
      ) : kind === 'submissions' ? (
        (preview as SubmissionReportRow[]).map((r, i) => (
          <View key={`${r.studentName}_${r.submittedAt}_${i}`} style={styles.card}>
            <Text style={styles.title}>
              {r.assignmentTitle} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.studentName} · {r.courseName}
            </Text>
          </View>
        ))
      ) : (
        (preview as CertificateReportRow[]).map((r) => (
          <View key={r.certificateCode} style={styles.card}>
            <Text style={styles.title}>{r.studentName}</Text>
            <Text style={styles.meta}>
              {r.certificateCode} · {r.courseName}
            </Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  h2: { marginTop: 16, marginBottom: 8, fontWeight: '800', color: colors.text, fontSize: 15 },
  lead: { color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  muted: { color: colors.textMuted, lineHeight: 20 },
  gap: { height: 10 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  title: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
