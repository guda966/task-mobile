import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  FilterGrid,
  PanelHeader,
  PanelPage,
  ResultBar,
  SearchInput,
} from '../../components/college/PanelChrome';
import { DropdownField, PrimaryButton, StatusBadge } from '../../components/ui';
import { BRANCHES, GRADUATION_YEARS } from '../../constants/courses';
import { collegePortalApi } from '../../services/collegePortalApi';
import { colors } from '../../theme/colors';
import type { CourseRequest } from '../../types/collegePortal';
import type { CollegeEnrollment } from '../../types/enrollment';

export function CourseRequestsPanel({
  enrollment,
  regionalCenterId,
  onOpenForm,
  onView,
}: {
  enrollment?: CollegeEnrollment;
  regionalCenterId?: string;
  onOpenForm: () => void;
  onView: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [branch, setBranch] = useState('');
  const [yearOfGraduation, setYearOfGraduation] = useState('');
  const [items, setItems] = useState<CourseRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(
        await collegePortalApi.listCourseRequests({
          enrollmentId: enrollment?.id,
          regionalCenterId,
          requesterType: regionalCenterId ? 'regional_center' : undefined,
          status,
          query,
          branch: branch || undefined,
          yearOfGraduation: yearOfGraduation || undefined,
        }),
      );
    } finally {
      setLoading(false);
    }
  }, [enrollment?.id, regionalCenterId, status, query, branch, yearOfGraduation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <PanelPage>
      <PanelHeader
        title="My requests"
        subtitle={
          regionalCenterId
            ? 'Track course batches you asked TASK to run for your Regional Centre. Approved sessions appear on Calendar.'
            : 'Track course batches you asked TASK to run for your college.'
        }
        action={<PrimaryButton title="New request" onPress={onOpenForm} />}
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by course, branch, or trainer"
        onSubmit={load}
      />

      <FilterGrid>
        <DropdownField
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'All', label: 'All statuses' },
            { value: 'pending', label: 'Pending' },
            { value: 'approved', label: 'Approved' },
            { value: 'rejected', label: 'Rejected' },
          ]}
        />
        <DropdownField
          label="Branch"
          value={branch}
          onChange={setBranch}
          options={[
            { value: '', label: 'All branches' },
            ...BRANCHES.map((b) => ({ value: b, label: b })),
          ]}
        />
        <DropdownField
          label="Year of graduation"
          value={yearOfGraduation}
          onChange={setYearOfGraduation}
          options={[
            { value: '', label: 'All years' },
            ...GRADUATION_YEARS.map((y) => ({ value: y, label: y })),
          ]}
        />
      </FilterGrid>

      <ResultBar label="Requests" count={items.length} />

      <FlatList
        style={styles.listFlex}
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title={loading ? 'Loading requests…' : 'No course requests found'}
            body="Submit a new request from Courses, or clear filters to see older requests."
          />
        }
        renderItem={({ item }) => (
          <DataCard accent onPress={() => onView(item.id)}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.courseName}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>
              {item.branch} · YOG {item.yearOfGraduation} · Batch {item.batchSize}
            </Text>
            <Text style={styles.meta}>
              {formatDate(item.startDate)} → {formatDate(item.endDate)}
            </Text>
            <Text style={styles.meta}>Requested on {formatDate(item.requestedOn)}</Text>
            {item.trainerName ? (
              <Text style={styles.trainer}>Trainer: {item.trainerName}</Text>
            ) : null}
            <Text style={styles.view}>View details →</Text>
          </DataCard>
        )}
      />
    </PanelPage>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  listFlex: { flex: 1 },
  list: { paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 2, lineHeight: 17 },
  trainer: {
    marginTop: 4,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '600',
  },
  view: { marginTop: 10, color: colors.primary, fontWeight: '700', fontSize: 13 },
});
