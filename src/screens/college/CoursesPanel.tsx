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
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await collegePortalApi.listCourses(category, query));
    } finally {
      setLoading(false);
    }
  }, [category, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <PanelPage>
      <PanelHeader
        title="Courses"
        subtitle="Browse the TASK catalogue and request a course for your college batch."
      />

      <SearchInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search courses by title or category"
        onSubmit={load}
      />

      <FilterGrid>
        <DropdownField
          label="Category"
          value={category}
          onChange={setCategory}
          options={COURSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
      </FilterGrid>

      <ResultBar label="Courses found" count={items.length} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            title={loading ? 'Loading courses…' : 'No courses match your filters'}
            body="Try another category or clear the search text."
          />
        }
        renderItem={({ item }) => (
          <DataCard>
            <View style={styles.cardTop}>
              <Text style={styles.title}>{item.title}</Text>
              <View style={styles.chip}>
                <Text style={styles.chipText}>{item.category}</Text>
              </View>
            </View>
            <Text style={styles.desc}>{item.description || 'No description provided.'}</Text>
            <Text style={styles.years}>
              Graduation years:{' '}
              {item.graduationYears.length ? item.graduationYears.join(', ') : 'Open'}
            </Text>
            <View style={styles.action}>
              <PrimaryButton title="Request this course" onPress={() => onRequestCourse(item)} />
            </View>
          </DataCard>
        )}
      />
    </PanelPage>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 40 },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 8,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  chip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { color: colors.primaryDark, fontWeight: '700', fontSize: 11 },
  desc: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginBottom: 8 },
  years: { color: colors.textMuted, fontSize: 12, marginBottom: 12 },
  action: { marginTop: 2 },
});
