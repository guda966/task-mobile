import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  EmptyState,
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

const PAGE_SIZE = 20;

export function StudentsPanel({ enrollmentId }: { enrollmentId: string }) {
  const [view, setView] = useState<ListView>('registry');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [yearOfGraduation, setYearOfGraduation] = useState('');
  const [courseRequestId, setCourseRequestId] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [registry, setRegistry] = useState<CollegeStudent[]>([]);
  const [enrolled, setEnrolled] = useState<CourseEnrolledStudent[]>([]);
  const [batches, setBatches] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [view, debouncedQuery, branch, semester, yearOfGraduation, courseRequestId]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = {
        query: debouncedQuery,
        branch,
        semester,
        yearOfGraduation,
        courseRequestId,
      };
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
  }, [enrollmentId, debouncedQuery, branch, semester, yearOfGraduation, courseRequestId]);

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
      { value: '', label: 'All years' },
      ...GRADUATION_YEARS.map((y) => ({ value: y, label: y })),
    ],
    [],
  );
  const courseOptions = useMemo(
    () => [
      { value: '', label: 'All batches' },
      ...batches.map((b) => ({
        value: b.id,
        label: `${b.courseName} · ${b.branch}`,
      })),
    ],
    [batches],
  );

  const items = view === 'registry' ? registry : enrolled;
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, safePage]);

  const activeFilterCount = [branch, semester, yearOfGraduation, view === 'enrolled' ? courseRequestId : '']
    .filter(Boolean).length;

  const clearFilters = () => {
    setBranch('');
    setSemester('');
    setYearOfGraduation('');
    setCourseRequestId('');
    setQuery('');
  };

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
          ? 'Full filtered list copied to clipboard (CSV).'
          : 'Share sheet opened with the CSV report.',
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Try again');
    }
  };

  return (
    <View style={styles.root}>
      <View style={styles.toolbar}>
        <View style={styles.titleRow}>
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Students</Text>
            <Text style={styles.subtitle}>
              {view === 'registry'
                ? 'College registry — filter by branch or semester'
                : 'Students registered on your requested course batches'}
            </Text>
          </View>
          <PrimaryButton title="Export" variant="secondary" onPress={exportList} />
        </View>

        <SegmentedTabs
          value={view}
          onChange={(v) => {
            setView(v);
            setFiltersOpen(false);
          }}
          options={[
            { value: 'registry', label: 'College students' },
            { value: 'enrolled', label: 'Course enrolled' },
          ]}
        />

        <SearchInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, hall ticket, email…"
          onSubmit={load}
        />

        <View style={styles.filterBar}>
          <Pressable
            onPress={() => setFiltersOpen((o) => !o)}
            style={styles.filterToggle}
            accessibilityRole="button"
          >
            <Text style={styles.filterToggleText}>
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
            </Text>
            <Text style={styles.filterChevron}>{filtersOpen ? '▲' : '▼'}</Text>
          </Pressable>
          {activeFilterCount > 0 ? (
            <Pressable onPress={clearFilters} hitSlop={8}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          ) : null}
        </View>

        {filtersOpen ? (
          <View style={styles.filtersBox}>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <DropdownField
                  label="Branch"
                  value={branch}
                  onChange={setBranch}
                  options={branchOptions}
                />
              </View>
              <View style={styles.filterCol}>
                <DropdownField
                  label="Semester"
                  value={semester}
                  onChange={setSemester}
                  options={semesterOptions}
                />
              </View>
            </View>
            <View style={styles.filterRow}>
              <View style={styles.filterCol}>
                <DropdownField
                  label="Year of graduation"
                  value={yearOfGraduation}
                  onChange={setYearOfGraduation}
                  options={yearOptions}
                />
              </View>
              {view === 'enrolled' ? (
                <View style={styles.filterCol}>
                  <DropdownField
                    label="Course batch"
                    value={courseRequestId}
                    onChange={setCourseRequestId}
                    options={courseOptions}
                  />
                </View>
              ) : (
                <View style={styles.filterCol} />
              )}
            </View>
          </View>
        ) : null}

        <View style={styles.resultRow}>
          <Text style={styles.resultText}>
            {loading ? 'Loading…' : `${items.length} student${items.length === 1 ? '' : 's'}`}
            {!loading && items.length > PAGE_SIZE
              ? ` · showing ${(safePage - 1) * PAGE_SIZE + 1}–${Math.min(safePage * PAGE_SIZE, items.length)}`
              : ''}
          </Text>
          {items.length > PAGE_SIZE ? (
            <View style={styles.pager}>
              <Pressable
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                style={[styles.pageBtn, safePage <= 1 && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Prev</Text>
              </Pressable>
              <Text style={styles.pageLabel}>
                {safePage}/{totalPages}
              </Text>
              <Pressable
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                style={[styles.pageBtn, safePage >= totalPages && styles.pageBtnDisabled]}
              >
                <Text style={styles.pageBtnText}>Next</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <FlatList
        style={styles.list}
        data={pageItems as (CollegeStudent | CourseEnrolledStudent)[]}
        keyExtractor={(item) => ('registrationId' in item ? item.registrationId : item.id)}
        initialNumToRender={PAGE_SIZE}
        maxToRenderPerBatch={PAGE_SIZE}
        windowSize={5}
        removeClippedSubviews
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title={
              loading
                ? 'Loading students…'
                : view === 'enrolled'
                  ? 'No course-enrolled students yet'
                  : 'No students match'
            }
            body={
              view === 'enrolled'
                ? 'They appear here after registering on a college-requested batch.'
                : 'Try another branch, semester, or clear filters.'
            }
          />
        }
        renderItem={({ item, index }) => {
          const rowNo = (safePage - 1) * PAGE_SIZE + index + 1;
          if (view === 'enrolled' && 'courseName' in item) {
            const row = item as CourseEnrolledStudent;
            return (
              <View style={[styles.row, styles.rowAccent]}>
                <Text style={styles.hash}>{rowNo}</Text>
                <View style={styles.body}>
                  <Text style={styles.name} numberOfLines={1}>
                    {row.fullName}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.courseName}
                    {row.hallTicketNo ? ` · ${row.hallTicketNo}` : ''}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {row.branch}
                    {row.semester ? ` · Sem ${row.semester}` : ''} · {row.yearOfGraduation}
                  </Text>
                </View>
                <StatusBadge status={row.registrationStatus} />
              </View>
            );
          }

          const row = item as CollegeStudent;
          return (
            <View style={styles.row}>
              <Text style={styles.hash}>{rowNo}</Text>
              <View style={styles.body}>
                <Text style={styles.name} numberOfLines={1}>
                  {row.fullName}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {row.hallTicketNo} · {row.branch}
                  {row.semester ? ` · Sem ${row.semester}` : ''}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {row.email}
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
  root: { flex: 1, backgroundColor: colors.background },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  title: { fontSize: 22, fontWeight: '800', color: colors.text },
  subtitle: { marginTop: 3, color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  filterToggleText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  filterChevron: { color: colors.textMuted, fontSize: 10 },
  clearText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  filtersBox: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingTop: 4,
    paddingBottom: 2,
    marginBottom: 8,
  },
  filterRow: { flexDirection: 'row', gap: 10 },
  filterCol: { flex: 1 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 28,
  },
  resultText: { color: colors.textMuted, fontWeight: '600', fontSize: 12, flex: 1 },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pageBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { color: colors.primaryDark, fontWeight: '700', fontSize: 12 },
  pageLabel: { color: colors.textMuted, fontWeight: '700', fontSize: 12 },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 28 },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  rowAccent: { borderLeftWidth: 3, borderLeftColor: colors.primary },
  hash: { color: colors.textMuted, width: 22, marginTop: 1, fontWeight: '700', fontSize: 12 },
  body: { flex: 1, minWidth: 0 },
  name: { fontWeight: '700', color: colors.text, fontSize: 14 },
  meta: { color: colors.textMuted, fontSize: 12, lineHeight: 16, marginTop: 1 },
});
