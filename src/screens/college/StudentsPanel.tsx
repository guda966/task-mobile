import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { StatusBadge } from '../../components/ui';
import { collegePortalApi } from '../../services/collegePortalApi';
import { colors } from '../../theme/colors';
import type { CollegeStudent } from '../../types/collegePortal';

export function StudentsPanel({ enrollmentId }: { enrollmentId: string }) {
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CollegeStudent[]>([]);

  const load = useCallback(async () => {
    setItems(await collegePortalApi.listStudents(enrollmentId, query));
  }, [enrollmentId, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Students</Text>
      <TextInput
        style={styles.search}
        placeholder="Search students"
        placeholderTextColor={colors.textMuted}
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={load}
      />
      <Text style={styles.count}>Total Results: {items.length}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No students found.</Text>}
        renderItem={({ item, index }) => (
          <View style={styles.row}>
            <Text style={styles.hash}>{index + 1}</Text>
            <View style={styles.body}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.meta}>
                {item.username} · {item.hallTicketNo}
              </Text>
              <Text style={styles.meta}>
                {item.email} · {item.caste} · {item.branch}
              </Text>
            </View>
            <StatusBadge status={item.status.toLowerCase()} />
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 12 },
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
  count: { color: colors.textMuted, marginBottom: 10, fontWeight: '600' },
  list: { paddingBottom: 40 },
  empty: { color: colors.textMuted },
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
