import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton } from '../../components/ui';
import { BRANCHES, SEMESTERS } from '../../constants/courses';
import { exportTextReport, reportsApi } from '../../services/reportsApi';
import { colors } from '../../theme/colors';
import type {
  AttendanceReportRow,
  BatchProgressRow,
  CertificateReportRow,
  CourseEnrolledReportRow,
  StudentRosterReportRow,
  SubmissionReportRow,
} from '../../types/reports';

type ReportKind =
  | 'progress'
  | 'attendance'
  | 'submissions'
  | 'certificates'
  | 'student_roster'
  | 'course_enrolled';

export function ReportsPanel({
  enrollmentId,
  showCollegeFilter = false,
  colleges = [],
}: {
  enrollmentId?: string;
  showCollegeFilter?: boolean;
  colleges?: { id: string; name: string }[];
}) {
  const [kind, setKind] = useState<ReportKind>('student_roster');
  const [collegeFilter, setCollegeFilter] = useState(enrollmentId || '');
  const [sessionFilter, setSessionFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const [progress, setProgress] = useState<BatchProgressRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceReportRow[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionReportRow[]>([]);
  const [certificates, setCertificates] = useState<CertificateReportRow[]>([]);
  const [roster, setRoster] = useState<StudentRosterReportRow[]>([]);
  const [enrolled, setEnrolled] = useState<CourseEnrolledReportRow[]>([]);
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
      setRoster(
        await reportsApi.getStudentRosterReport(scopeEnrollment, {
          branch: branchFilter || undefined,
          semester: semesterFilter || undefined,
        }),
      );
      setEnrolled(
        (await reportsApi.getCourseEnrolledReport(scopeEnrollment, requestId)).filter(
          (r) => !branchFilter || r.branch === branchFilter,
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [scopeEnrollment, sessionFilter, branchFilter, semesterFilter]);

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
      } else if (kind === 'certificates') {
        title = 'Certificates Report';
        body = reportsApi.certificatesToCsv(certificates);
      } else if (kind === 'student_roster') {
        title = 'College Student List';
        body = reportsApi.studentRosterToCsv(roster);
      } else {
        title = 'Course Enrolled Students Report';
        body = reportsApi.courseEnrolledToCsv(enrolled);
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
          : kind === 'certificates'
            ? certificates.slice(0, 20)
            : kind === 'student_roster'
              ? roster.slice(0, 20)
              : enrolled.slice(0, 20);

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.h1}>Reports</Text>
      <Text style={styles.lead}>
        Student lists, course-enrolled rosters, attendance, submissions, certificates, and batch
        progress. Export as CSV.
      </Text>

      <DropdownField
        label="Report type"
        value={kind}
        onChange={(v) => setKind(v as ReportKind)}
        options={[
          { value: 'student_roster', label: 'College student list' },
          { value: 'course_enrolled', label: 'Course enrolled students' },
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

      {kind === 'student_roster' || kind === 'course_enrolled' ? (
        <>
          <DropdownField
            label="Branch"
            value={branchFilter}
            onChange={setBranchFilter}
            options={[
              { value: '', label: 'All branches' },
              ...BRANCHES.map((b) => ({ value: b, label: b })),
            ]}
          />
          {kind === 'student_roster' ? (
            <DropdownField
              label="Semester"
              value={semesterFilter}
              onChange={setSemesterFilter}
              options={[
                { value: '', label: 'All semesters' },
                ...SEMESTERS.map((s) => ({ value: s, label: `Semester ${s}` })),
              ]}
            />
          ) : null}
        </>
      ) : null}

      {kind !== 'student_roster' ? (
        <DropdownField
          label="Session"
          value={sessionFilter}
          onChange={setSessionFilter}
          options={sessionOptions}
        />
      ) : null}

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
      ) : kind === 'certificates' ? (
        (preview as CertificateReportRow[]).map((r) => (
          <View key={r.certificateCode} style={styles.card}>
            <Text style={styles.title}>{r.studentName}</Text>
            <Text style={styles.meta}>
              {r.certificateCode} · {r.courseName}
            </Text>
          </View>
        ))
      ) : kind === 'student_roster' ? (
        (preview as StudentRosterReportRow[]).map((r, i) => (
          <View key={`${r.hallTicketNo}_${i}`} style={styles.card}>
            <Text style={styles.title}>{r.fullName}</Text>
            <Text style={styles.meta}>
              {r.branch}
              {r.semester ? ` · Sem ${r.semester}` : ''} · YOG {r.yearOfGraduation} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.email} · {r.hallTicketNo}
            </Text>
          </View>
        ))
      ) : (
        (preview as CourseEnrolledReportRow[]).map((r, i) => (
          <View key={`${r.email}_${r.courseName}_${i}`} style={styles.card}>
            <Text style={styles.title}>{r.fullName}</Text>
            <Text style={styles.meta}>
              {r.courseName} · {r.branch}
              {r.semester ? ` · Sem ${r.semester}` : ''}
            </Text>
            <Text style={styles.meta}>
              {r.registrationStatus} · Registered {r.registeredAt.slice(0, 10)}
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
