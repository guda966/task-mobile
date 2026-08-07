import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
        label: `${b.courseName} · ${b.branch} · ${b.yearOfGraduation} (${b.status})`,
      })),
    ],
    [batches],
  );

  const items = view === 'registry' ? registry : enrolled;
  const countLabel =
    view === 'registry'
      ? `College students: ${registry.length}`
      : `Course-enrolled students: ${enrolled.length}`;

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
    <View style={styles.root}>
      <Text style={styles.h1}>Students</Text>
      <Text style={styles.lead}>
        Filter by branch or semester. Switch to Course enrolled to see the final list of students
        registered on courses requested by your college.
      </Text>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, view === 'registry' && styles.tabActive]}
          onPress={() => setView('registry')}
        >
          <Text style={[styles.tabText, view === 'registry' && styles.tabTextActive]}>
            College students
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, view === 'enrolled' && styles.tabActive]}
          onPress={() => setView('enrolled')}
        >
          <Text style={[styles.tabText, view === 'enrolled' && styles.tabTextActive]}>
            Course enrolled
          </Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search by name, ID, email, or course"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={load}
      />

      <View style={styles.filters}>
        <View style={styles.filterCol}>
          <DropdownField
            label="Branch"
            value={branch}
            onChange={setBranch}
            options={branchOptions}
            placeholder="All branches"
          />
        </View>
        <View style={styles.filterCol}>
          <DropdownField
            label="Semester"
            value={semester}
            onChange={setSemester}
            options={semesterOptions}
            placeholder="All semesters"
          />
        </View>
      </View>

      <View style={styles.filters}>
        <View style={styles.filterCol}>
          <DropdownField
            label="Year of graduation"
            value={yearOfGraduation}
            onChange={setYearOfGraduation}
            options={yearOptions}
            placeholder="All years"
          />
        </View>
        {view === 'enrolled' ? (
          <View style={styles.filterCol}>
            <DropdownField
              label="Course batch"
              value={courseRequestId}
              onChange={setCourseRequestId}
              options={courseOptions}
              placeholder="All course batches"
            />
          </View>
        ) : (
          <View style={styles.filterCol} />
        )}
      </View>

      <View style={styles.actions}>
        <PrimaryButton title={loading ? 'Loading…' : 'Apply filters'} onPress={load} />
        <View style={styles.actionGap} />
        <PrimaryButton title="Export CSV" variant="secondary" onPress={exportList} />
      </View>

      <Text style={styles.count}>{countLabel}</Text>

      <FlatList
        data={items as (CollegeStudent | CourseEnrolledStudent)[]}
        keyExtractor={(item) =>
          'registrationId' in item ? item.registrationId : item.id
        }
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {loading
              ? 'Loading…'
              : view === 'enrolled'
                ? 'No students registered on college-requested courses yet.'
                : 'No students found for these filters.'}
          </Text>
        }
        renderItem={({ item, index }) => {
          if (view === 'enrolled' && 'courseName' in item) {
            const row = item as CourseEnrolledStudent;
            return (
              <View style={styles.row}>
                <Text style={styles.hash}>{index + 1}</Text>
                <View style={styles.body}>
                  <Text style={styles.name}>{row.fullName}</Text>
                  <Text style={styles.meta}>
                    {row.courseName}
                    {row.hallTicketNo ? ` · ${row.hallTicketNo}` : ''}
                  </Text>
                  <Text style={styles.meta}>
                    {row.email} · {row.branch}
                    {row.semester ? ` · Sem ${row.semester}` : ''} · YOG {row.yearOfGraduation}
                  </Text>
                  <Text style={styles.meta}>
                    Registered {row.registeredAt.slice(0, 10)} · Batch {row.startDate} → {row.endDate}
                  </Text>
                </View>
                <StatusBadge status={row.registrationStatus} />
              </View>
            );
          }

          const row = item as CollegeStudent;
          return (
            <View style={styles.row}>
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
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 6 },
  lead: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 12 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: colors.white },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    color: colors.text,
  },
  filters: { flexDirection: 'row', gap: 10 },
  filterCol: { flex: 1 },
  actions: { marginTop: 4, marginBottom: 8 },
  actionGap: { height: 8 },
  count: { color: colors.textMuted, marginBottom: 10, fontWeight: '600' },
  list: { paddingBottom: 40 },
  empty: { color: colors.textMuted, lineHeight: 20 },
  row: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  hash: { color: colors.textMuted, width: 20, marginTop: 2 },
  body: { flex: 1 },
  name: { fontWeight: '700', color: colors.text, marginBottom: 2 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
});
