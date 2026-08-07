import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  CheckboxRow,
  DropdownField,
  FormField,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { COURSE_CATEGORIES, GRADUATION_YEARS } from '../constants/courses';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { colors } from '../theme/colors';
import type { CourseCategory } from '../types/collegePortal';

type Props = NativeStackScreenProps<RootStackParamList, 'TaskAdminCourseForm'>;

const CATEGORY_OPTIONS = COURSE_CATEGORIES.filter((c) => c !== 'All Categories').map(
  (c) => ({ value: c, label: c }),
);

export function TaskAdminCourseFormScreen({ navigation, route }: Props) {
  const courseId = route.params?.courseId;
  const isEdit = !!courseId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CourseCategory | ''>('');
  const [description, setDescription] = useState('');
  const [years, setYears] = useState<string[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      if (!courseId) return;
      const course = await collegePortalApi.getCourse(courseId);
      if (!course) {
        Alert.alert('Not found', 'Course no longer exists.');
        navigation.goBack();
        return;
      }
      setTitle(course.title);
      setCategory(course.category);
      setDescription(course.description || '');
      setYears(course.graduationYears || []);
      setEnabled(course.enabled !== false);
    })();
  }, [courseId, navigation]);

  const toggleYear = (year: string) => {
    setYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year],
    );
  };

  const save = async () => {
    if (!category) {
      Alert.alert('Category required', 'Select a course category.');
      return;
    }
    try {
      setLoading(true);
      if (isEdit && courseId) {
        await collegePortalApi.updateCourse(courseId, {
          title,
          category,
          description,
          graduationYears: years,
          enabled,
        });
        Alert.alert('Saved', 'Course updated successfully.');
      } else {
        await collegePortalApi.createCourse({
          title,
          category,
          description,
          graduationYears: years,
          enabled,
        });
        Alert.alert('Created', 'Course added to the catalogue.');
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to save', e instanceof Error ? e.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title={isEdit ? 'Edit Course' : 'Add Course'}
      subtitle="TASK course catalogue"
      showLogo={false}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <FormField
          label="Course Title"
          required
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Cloud Computing"
        />
        <DropdownField
          label="Category"
          required
          placeholder="Select category"
          value={category}
          onChange={(v) => setCategory(v as CourseCategory)}
          options={CATEGORY_OPTIONS}
        />
        <FormField
          label="Description"
          value={description}
          onChangeText={setDescription}
          placeholder="Optional description"
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />

        <Text style={styles.label}>
          Year of graduation <Text style={styles.req}>*</Text>
        </Text>
        <View style={styles.yearWrap}>
          {GRADUATION_YEARS.map((year) => {
            const active = years.includes(year);
            return (
              <Pressable
                key={year}
                onPress={() => toggleYear(year)}
                style={[styles.yearChip, active && styles.yearChipActive]}
              >
                <Text style={[styles.yearText, active && styles.yearTextActive]}>{year}</Text>
              </Pressable>
            );
          })}
        </View>

        <CheckboxRow
          checked={enabled}
          onToggle={() => setEnabled((v) => !v)}
          label="Enabled — visible to colleges when requesting courses"
        />

        <View style={styles.actions}>
          <PrimaryButton title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
          <PrimaryButton
            title={loading ? 'Saving…' : isEdit ? 'Save changes' : 'Create course'}
            onPress={save}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  req: { color: colors.accent },
  yearWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  yearChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  yearChipActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  yearText: { color: colors.text, fontSize: 13 },
  yearTextActive: { color: colors.primaryDark, fontWeight: '700' },
  actions: { gap: 10, marginTop: 8 },
});
