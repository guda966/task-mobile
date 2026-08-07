import React, { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton } from '../../components/ui';
import { COURSE_CATEGORIES } from '../../constants/courses';
import { collegePortalApi } from '../../services/collegePortalApi';
import { colors } from '../../theme/colors';
import type { Course } from '../../types/collegePortal';

export function CoursesPanel({
  onRequestCourse,
}: {
  onRequestCourse: (course: Course) => void;
}) {
  const [category, setCategory] = useState('All Categories');
  const [items, setItems] = useState<Course[]>([]);

  const load = useCallback(async () => {
    setItems(await collegePortalApi.listCourses(category));
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.root}>
      <Text style={styles.h1}>Courses</Text>
      <DropdownField
        label="Category"
        value={category}
        onChange={setCategory}
        options={COURSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      <Text style={styles.count}>Total Results: {items.length}</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.desc}>{item.description || '—'}</Text>
            <Text style={styles.years}>
              Year of graduation:{' '}
              {item.graduationYears.length
                ? `[ ${item.graduationYears.map((y) => `"${y}"`).join(', ')} ]`
                : '—'}
            </Text>
            <View style={styles.action}>
              <PrimaryButton
                title="Request this course"
                onPress={() => onRequestCourse(item)}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: 16 },
  h1: { fontSize: 22, fontWeight: '800', color: colors.text, marginBottom: 8 },
  count: { color: colors.textMuted, marginBottom: 10, fontWeight: '600' },
  list: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  title: { fontWeight: '700', color: colors.text, fontSize: 15, marginBottom: 4 },
  category: { color: colors.primary, fontWeight: '600', marginBottom: 6 },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 8 },
  years: { color: colors.textMuted, fontSize: 12, marginBottom: 12 },
  action: { marginTop: 4 },
});
