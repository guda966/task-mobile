import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  FilterGrid,
  PanelHeader,
  ResultBar,
} from '../../components/college/PanelChrome';
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

  const previewCount =
    kind === 'progress'
      ? progress.length
      : kind === 'attendance'
        ? attendance.length
        : kind === 'submissions'
          ? submissions.length
          : kind === 'certificates'
            ? certificates.length
            : kind === 'student_roster'
              ? roster.length
              : enrolled.length;

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <PanelHeader
        title="Reports"
        subtitle="Download student lists and training reports as CSV."
        action={<PrimaryButton title="Export CSV" onPress={exportCurrent} disabled={loading} />}
      />

      <FilterGrid>
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
          <DropdownField
            label="Branch"
            value={branchFilter}
            onChange={setBranchFilter}
            options={[
              { value: '', label: 'All branches' },
              ...BRANCHES.map((b) => ({ value: b, label: b })),
            ]}
          />
        ) : null}
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
        {kind !== 'student_roster' ? (
          <DropdownField
            label="Session"
            value={sessionFilter}
            onChange={setSessionFilter}
            options={sessionOptions}
          />
        ) : null}
      </FilterGrid>

      <PrimaryButton title={loading ? 'Loading…' : 'Refresh preview'} variant="secondary" onPress={load} />
      <ResultBar label="Rows" count={previewCount} />

      <Text style={styles.h2}>Preview</Text>
      {preview.length === 0 ? (
        <EmptyState
          title={loading ? 'Loading report…' : 'No rows for this report'}
          body="Adjust filters or wait until students register for approved batches."
        />
      ) : kind === 'progress' ? (
        (preview as BatchProgressRow[]).map((r) => (
          <DataCard key={r.requestId} accent>
            <Text style={styles.title}>{r.courseName}</Text>
            <Text style={styles.meta}>
              {r.collegeName} · Students {r.registeredStudents} · Attendance {r.avgAttendancePercent}%
            </Text>
            <Text style={styles.meta}>
              Certs {r.certificatesIssued} · Pending submissions {r.submissionsPending}
            </Text>
          </DataCard>
        ))
      ) : kind === 'attendance' ? (
        (preview as AttendanceReportRow[]).map((r, i) => (
          <DataCard key={`${r.studentId}_${r.sessionDate}_${i}`}>
            <Text style={styles.title}>
              {r.studentName} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.courseName} · {r.sessionDate}
            </Text>
          </DataCard>
        ))
      ) : kind === 'submissions' ? (
        (preview as SubmissionReportRow[]).map((r, i) => (
          <DataCard key={`${r.studentName}_${r.submittedAt}_${i}`}>
            <Text style={styles.title}>
              {r.assignmentTitle} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.studentName} · {r.courseName}
            </Text>
          </DataCard>
        ))
      ) : kind === 'certificates' ? (
        (preview as CertificateReportRow[]).map((r) => (
          <DataCard key={r.certificateCode}>
            <Text style={styles.title}>{r.studentName}</Text>
            <Text style={styles.meta}>
              {r.certificateCode} · {r.courseName}
            </Text>
          </DataCard>
        ))
      ) : kind === 'student_roster' ? (
        (preview as StudentRosterReportRow[]).map((r, i) => (
          <DataCard key={`${r.hallTicketNo}_${i}`}>
            <Text style={styles.title}>{r.fullName}</Text>
            <Text style={styles.meta}>
              {r.branch}
              {r.semester ? ` · Sem ${r.semester}` : ''} · YOG {r.yearOfGraduation} · {r.status}
            </Text>
            <Text style={styles.meta}>
              {r.email} · {r.hallTicketNo}
            </Text>
          </DataCard>
        ))
      ) : (
        (preview as CourseEnrolledReportRow[]).map((r, i) => (
          <DataCard key={`${r.email}_${r.courseName}_${i}`} accent>
            <Text style={styles.title}>{r.fullName}</Text>
            <Text style={styles.meta}>
              {r.courseName} · {r.branch}
              {r.semester ? ` · Sem ${r.semester}` : ''}
            </Text>
            <Text style={styles.meta}>
              {r.registrationStatus} · Registered {r.registeredAt.slice(0, 10)}
            </Text>
          </DataCard>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40 },
  h2: { marginTop: 8, marginBottom: 8, fontWeight: '800', color: colors.text, fontSize: 15 },
  title: { fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
});
