import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { DropdownField, PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { COURSE_CATEGORIES } from '../constants/courses';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { colors } from '../theme/colors';
import type { Course } from '../types/collegePortal';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminCourses'>;

export function TaskAdminCoursesScreen({ navigation }: Props) {
  const [items, setItems] = useState<Course[]>([]);
  const [category, setCategory] = useState('All Categories');
  const [status, setStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setItems(
      await collegePortalApi.listCoursesAdmin({
        category,
        status,
        query,
      }),
    );
  }, [category, status, query]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const toggle = async (course: Course) => {
    try {
      setBusyId(course.id);
      await collegePortalApi.setCourseEnabled(course.id, !course.enabled);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen
      title="Course Catalogue"
      subtitle="Add, edit, or disable TASK courses"
      showLogo={false}
    >
      <View style={styles.toolbar}>
        <PrimaryButton
          title="Add course"
          onPress={() => navigation.navigate('TaskAdminCourseForm', {})}
        />
        <TextInput
          style={styles.search}
          placeholder="Search courses..."
          placeholderTextColor={colors.textMuted}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={load}
        />
        <DropdownField
          label="Category"
          value={category}
          onChange={setCategory}
          options={COURSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
        />
        <DropdownField
          label="Status"
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
          options={[
            { value: 'all', label: 'All' },
            { value: 'enabled', label: 'Enabled' },
            { value: 'disabled', label: 'Disabled' },
          ]}
        />
        <Text style={styles.count}>Total: {items.length}</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No courses found.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.card, !item.enabled && styles.cardDisabled]}
            onPress={() =>
              navigation.navigate('TaskAdminCourseForm', { courseId: item.id })
            }
          >
            <View style={styles.row}>
              <Text style={styles.title}>{item.title}</Text>
              <StatusBadge status={item.enabled ? 'enabled' : 'disabled'} />
            </View>
            <Text style={styles.category}>{item.category}</Text>
            <Text style={styles.meta}>{item.description || '—'}</Text>
            <Text style={styles.meta}>
              Years:{' '}
              {item.graduationYears.length
                ? item.graduationYears.join(', ')
                : '—'}
            </Text>
            <View style={styles.actions}>
              <Pressable
                onPress={() =>
                  navigation.navigate('TaskAdminCourseForm', { courseId: item.id })
                }
              >
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => toggle(item)} disabled={busyId === item.id}>
                <Text style={[styles.link, item.enabled ? styles.danger : styles.success]}>
                  {busyId === item.id
                    ? 'Saving…'
                    : item.enabled
                      ? 'Disable'
                      : 'Enable'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  toolbar: { paddingHorizontal: 16, paddingTop: 8 },
  search: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 4,
    color: colors.text,
  },
  count: { color: colors.textMuted, fontWeight: '600', marginBottom: 8 },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { color: colors.textMuted, paddingVertical: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  cardDisabled: { opacity: 0.7, backgroundColor: '#F7F7F7' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  category: { color: colors.primary, fontWeight: '600', marginBottom: 4 },
  meta: { color: colors.textMuted, fontSize: 12, marginBottom: 2 },
  actions: {
    flexDirection: 'row',
    gap: 18,
    marginTop: 10,
  },
  link: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  danger: { color: colors.danger },
  success: { color: colors.success },
});
