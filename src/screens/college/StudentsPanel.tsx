import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
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
  PanelPage,
  ResultBar,
  SearchInput,
  SegmentedTabs,
} from '../../components/college/PanelChrome';
import { DropdownField, PrimaryButton, StatusBadge } from '../../components/ui';
import { BRANCHES, GRADUATION_YEARS, SEMESTERS } from '../../constants/courses';
import { collegePortalApi } from '../../services/collegePortalApi';
import { exportTextReport, reportsApi } from '../../services/reportsApi';
import { colors } from '../../theme/colors';
import type {
  CollegeStudent,
  CourseEnrolledStudent,
  CourseRequest,
} from '../../types/collegePortal';

type ListView = 'registry' | 'enrolled';

export function StudentsPanel({ enrollmentId }: { enrollmentId: string }) {
  const [view, setView] = useState<ListView>('registry');
  const [query, setQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [yearOfGraduation, setYearOfGraduation] = useState('');
  const [courseRequestId, setCourseRequestId] = useState('');
  const [registry, setRegistry] = useState<CollegeStudent[]>([]);
  const [enrolled, setEnrolled] = useState<CourseEnrolledStudent[]>([]);
  const [batches, setBatches] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = { query, branch, semester, yearOfGraduation, courseRequestId };
      const [students, courseStudents, requests] = await Promise.all([
        collegePortalApi.listStudents(enrollmentId, filters),
        collegePortalApi.listCourseEnrolledStudents(enrollmentId, filters),
        collegePortalApi.listCourseRequests({ enrollmentId }),
      ]);
      setRegistry(students);
      setEnrolled(courseStudents);
      setBatches(requests.filter((r) => r.status === 'approved' || r.status === 'pending'));
    } finally {
      setLoading(false);
    }
  }, [enrollmentId, query, branch, semester, yearOfGraduation, courseRequestId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const branchOptions = useMemo(
    () => [{ value: '', label: 'All branches' }, ...BRANCHES.map((b) => ({ value: b, label: b }))],
    [],
  );
  const semesterOptions = useMemo(
    () => [
      { value: '', label: 'All semesters' },
      ...SEMESTERS.map((s) => ({ value: s, label: `Semester ${s}` })),
    ],
    [],
  );
  const yearOptions = useMemo(
    () => [
      { value: '', label: 'All graduation years' },
      ...GRADUATION_YEARS.map((y) => ({ value: y, label: y })),
    ],
    [],
  );
  const courseOptions = useMemo(
    () => [
      { value: '', label: 'All course batches' },
      ...batches.map((b) => ({
        value: b.id,
        label: `${b.courseName} · ${b.branch} · ${b.yearOfGraduation}`,
      })),
    ],
    [batches],
  );

  const items = view === 'registry' ? registry : enrolled;

  const exportList = async () => {
    try {
      if (view === 'registry') {
        await exportTextReport(
          'College Student List',
          reportsApi.studentRosterToCsv(
            registry.map((s) => ({
              fullName: s.fullName,
              username: s.username,
              hallTicketNo: s.hallTicketNo,
              email: s.email,
              branch: s.branch,
              semester: s.semester,
              yearOfGraduation: s.yearOfGraduation,
              caste: s.caste,
              status: s.status,
            })),
          ),
        );
      } else {
        await exportTextReport(
          'Course Enrolled Students',
          reportsApi.courseEnrolledToCsv(
            enrolled.map((s) => ({
              fullName: s.fullName,
              email: s.email,
              hallTicketNo: s.hallTicketNo,
              branch: s.branch,
              semester: s.semester,
              yearOfGraduation: s.yearOfGraduation,
              courseName: s.courseName,
              registrationStatus: s.registrationStatus,
              registeredAt: s.registeredAt,
              startDate: s.startDate,
              endDate: s.endDate,
            })),
          ),
        );
      }
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

  return (
    <PanelPage>
      <PanelHeader
        title="Students"
        subtitle="Find students by branch or semester. Course enrolled shows who joined your requested batches."
        action={<PrimaryButton title="Export CSV" variant="secondary" onPress={exportList} />}
      />

      <SegmentedTabs
        value={view}
        onChange={setView}
        options={[
          { value: 'registry', label: 'College students' },
          { value: 'enrolled', label: 'Course enrolled' },
        ]}
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, ID, email, or course"
        onSubmit={load}
      />

      <FilterGrid>
        <DropdownField
          label="Branch"
          value={branch}
          onChange={setBranch}
          options={branchOptions}
          placeholder="All branches"
        />
        <DropdownField
          label="Semester"
          value={semester}
          onChange={setSemester}
          options={semesterOptions}
          placeholder="All semesters"
        />
        <DropdownField
          label="Year of graduation"
          value={yearOfGraduation}
          onChange={setYearOfGraduation}
          options={yearOptions}
          placeholder="All years"
        />
        {view === 'enrolled' ? (
          <DropdownField
            label="Course batch"
            value={courseRequestId}
            onChange={setCourseRequestId}
            options={courseOptions}
            placeholder="All course batches"
          />
        ) : null}
      </FilterGrid>

      <ResultBar
        label={view === 'registry' ? 'College students' : 'Course-enrolled students'}
        count={items.length}
      />

      <FlatList
        data={items as (CollegeStudent | CourseEnrolledStudent)[]}
        keyExtractor={(item) => ('registrationId' in item ? item.registrationId : item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title={
              loading
                ? 'Loading students…'
                : view === 'enrolled'
                  ? 'No course-enrolled students yet'
                  : 'No students match these filters'
            }
            body={
              view === 'enrolled'
                ? 'Students appear here after they register on a college-requested course batch.'
                : 'Try another branch, semester, or clear search.'
            }
          />
        }
        renderItem={({ item, index }) => {
          if (view === 'enrolled' && 'courseName' in item) {
            const row = item as CourseEnrolledStudent;
            return (
              <DataCard accent>
                <View style={styles.rowTop}>
                  <Text style={styles.hash}>{index + 1}</Text>
                  <View style={styles.body}>
                    <Text style={styles.name}>{row.fullName}</Text>
                    <Text style={styles.meta}>{row.courseName}</Text>
                    <Text style={styles.meta}>
                      {row.email}
                      {row.hallTicketNo ? ` · ${row.hallTicketNo}` : ''}
                    </Text>
                    <Text style={styles.meta}>
                      {row.branch}
                      {row.semester ? ` · Sem ${row.semester}` : ''} · YOG {row.yearOfGraduation}
                    </Text>
                  </View>
                  <StatusBadge status={row.registrationStatus} />
                </View>
              </DataCard>
            );
          }

          const row = item as CollegeStudent;
          return (
            <DataCard>
              <View style={styles.rowTop}>
                <Text style={styles.hash}>{index + 1}</Text>
                <View style={styles.body}>
                  <Text style={styles.name}>{row.fullName}</Text>
                  <Text style={styles.meta}>
                    {row.username} · {row.hallTicketNo}
                  </Text>
                  <Text style={styles.meta}>
                    {row.email} · {row.caste} · {row.branch}
                    {row.semester ? ` · Sem ${row.semester}` : ''}
                    {row.yearOfGraduation ? ` · YOG ${row.yearOfGraduation}` : ''}
                  </Text>
                </View>
                <StatusBadge status={row.status.toLowerCase()} />
              </View>
            </DataCard>
          );
        }}
      />
    </PanelPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 40 },
  rowTop: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  hash: { color: colors.textMuted, width: 20, marginTop: 2, fontWeight: '700' },
  body: { flex: 1 },
  name: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
