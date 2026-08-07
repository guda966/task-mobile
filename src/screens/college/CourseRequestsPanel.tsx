import React, { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton, StatusBadge } from '../../components/ui';
import { collegePortalApi } from '../../services/collegePortalApi';
import { colors } from '../../theme/colors';
import type { CourseRequest } from '../../types/collegePortal';
import type { CollegeEnrollment } from '../../types/enrollment';

export function CourseRequestsPanel({
  enrollment,
  onOpenForm,
  onView,
}: {
  enrollment: CollegeEnrollment;
  onOpenForm: () => void;
  onView: (id: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [items, setItems] = useState<CourseRequest[]>([]);

  const load = useCallback(async () => {
    setItems(
      await collegePortalApi.listCourseRequests({
        enrollmentId: enrollment.id,
        status,
        query,
      }),
    );
  }, [enrollment.id, status, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.h1}>Request for a Course</Text>
        <PrimaryButton title="Request a course" onPress={onOpenForm} />
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search courses..."
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={load}
      />
      <DropdownField
        label="Status"
        value={status}
        onChange={setStatus}
        options={[
          { value: 'All', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
        ]}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No course requests yet.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => onView(item.id)}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.courseName}</Text>
              <StatusBadge status={item.status} />
            </View>
            <Text style={styles.meta}>Requested on {formatDate(item.requestedOn)}</Text>
            <Text style={styles.meta}>
              {formatDate(item.startDate)} → {formatDate(item.endDate)} · Batch {item.batchSize}
            </Text>
            <Text style={styles.view}>View</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function formatDate(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  header: { gap: 10, marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
    color: colors.text,
  },
  list: { paddingBottom: 40 },
  empty: { color: colors.textMuted },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  title: { flex: 1, fontWeight: '700', color: colors.text },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  view: { marginTop: 8, color: colors.primary, fontWeight: '700' },
});
