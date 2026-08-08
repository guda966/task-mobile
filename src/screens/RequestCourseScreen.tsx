import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  DropdownField,
  FormField,
  PrimaryButton,
  Screen,
} from '../components/ui';
import { DateField } from '../components/DateField';
import { BRANCHES, MIN_BATCH_SIZE } from '../constants/courses';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { collegePortalApi } from '../services/collegePortalApi';
import { mockApi } from '../services/mockApi';
import { regionalCentreApi } from '../services/regionalCentreApi';
import { colors } from '../theme/colors';
import type { Course } from '../types/collegePortal';
import type { CollegeEnrollment } from '../types/enrollment';

type Props = NativeStackScreenProps<RootStackParamList, 'RequestCourse'>;

export function RequestCourseScreen({ navigation, route }: Props) {
  const { user } = useAuth();
  const isRc = user?.role === 'regional_center';
  const [enrollment, setEnrollment] = useState<CollegeEnrollment | null>(null);
  const [rcName, setRcName] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [category, setCategory] = useState(route.params?.category ?? '');
  const [courseId, setCourseId] = useState(route.params?.courseId ?? '');
  const [yearOfGraduation, setYearOfGraduation] = useState(isRc ? 'All' : '');
  const [branch, setBranch] = useState(isRc ? 'All RC members' : '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [batchSize, setBatchSize] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const list = await collegePortalApi.listCourses();
      setCourses(list);

      if (isRc && user?.regionalCenterId) {
        const center = regionalCentreApi.getCenter(user.regionalCenterId);
        setRcName(center?.name || user.name);
      } else if (user?.enrollmentId) {
        setEnrollment(await mockApi.getEnrollment(user.enrollmentId));
      }

      const prefId = route.params?.courseId;
      if (prefId) {
        const match = list.find((c) => c.id === prefId);
        if (match) {
          setCategory(match.category);
          setCourseId(match.id);
        }
      } else if (route.params?.category) {
        setCategory(route.params.category);
      }
    })();
  }, [user?.enrollmentId, user?.regionalCenterId, user?.name, isRc, route.params?.courseId, route.params?.category]);

  const categories = useMemo(
    () => Array.from(new Set(courses.map((c) => c.category))),
    [courses],
  );

  const filteredCourses = useMemo(
    () => (category ? courses.filter((c) => c.category === category) : courses),
    [courses, category],
  );

  const selectedCourse = useMemo(
    () => courses.find((c) => c.id === courseId) ?? null,
    [courses, courseId],
  );

  const yearOptions = useMemo(() => {
    if (isRc) {
      return [
        { value: 'All', label: 'All RC members' },
        ...(selectedCourse?.graduationYears?.length
          ? selectedCourse.graduationYears
          : ['2026', '2027', '2028', '2029', '2030']
        ).map((y) => ({ value: y, label: y })),
      ];
    }
    const years = selectedCourse?.graduationYears?.length
      ? selectedCourse.graduationYears
      : ['2026', '2027', '2028', '2029', '2030', '2031', '2032'];
    return years.map((y) => ({ value: y, label: y }));
  }, [selectedCourse, isRc]);

  const branchOptions = useMemo(() => {
    if (isRc) {
      return [
        { value: 'All RC members', label: 'All RC members' },
        ...BRANCHES.map((b) => ({ value: b, label: b })),
      ];
    }
    return BRANCHES.map((b) => ({ value: b, label: b }));
  }, [isRc]);

  const onCategoryChange = useCallback((value: string) => {
    setCategory(value);
    setCourseId('');
    if (!isRc) setYearOfGraduation('');
  }, [isRc]);

  const onCourseChange = useCallback(
    (value: string) => {
      setCourseId(value);
      if (!isRc) setYearOfGraduation('');
    },
    [isRc],
  );

  const submit = async () => {
    try {
      setLoading(true);
      const draft = {
        courseId,
        yearOfGraduation,
        branch,
        startDate,
        endDate,
        batchSize,
      };
      if (isRc) {
        if (!user?.regionalCenterId) throw new Error('Regional Centre session missing.');
        await collegePortalApi.submitRcCourseRequest(
          user.regionalCenterId,
          rcName || user.name,
          draft,
        );
      } else {
        if (!enrollment) throw new Error('College enrollment missing.');
        await collegePortalApi.submitCourseRequest(enrollment, draft);
      }
      Alert.alert(
        'Request submitted',
        'Course request is pending TASK Admin approval. Approved sessions will appear on your calendar.',
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Unable to submit', e instanceof Error ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      title="Request for course"
      subtitle={
        isRc
          ? 'Regional Centre | Courses | Request (pending TASK approval)'
          : 'Home | Courses | Request Course'
      }
      showLogo={false}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {isRc ? (
          <Text style={styles.banner}>
            Schedule a TASK catalogue course for {rcName || 'your Regional Centre'}. TASK Admin must
            approve before RC students can enrol.
          </Text>
        ) : null}
        <DropdownField
          label="Course Category"
          required
          placeholder="Select Course Category"
          value={category}
          onChange={onCategoryChange}
          options={categories.map((c) => ({ value: c, label: c }))}
        />
        <DropdownField
          label="Course Name"
          required
          placeholder="Select Course"
          value={courseId}
          onChange={onCourseChange}
          options={filteredCourses.map((c) => ({ value: c.id, label: c.title }))}
        />
        <DropdownField
          label={isRc ? 'Audience / Year of Graduation' : 'Year of Graduation'}
          required
          placeholder="Select Year of Graduation"
          value={yearOfGraduation}
          onChange={setYearOfGraduation}
          options={yearOptions}
        />
        <DropdownField
          label="Branch"
          required
          placeholder="Select Branch"
          value={branch}
          onChange={setBranch}
          options={branchOptions}
        />
        <DateField
          label="Start Date"
          required
          value={startDate}
          onChange={(v) => {
            setStartDate(v);
            if (endDate && endDate < v) setEndDate('');
          }}
          minimumDate={new Date()}
        />
        <DateField
          label="End Date"
          required
          value={endDate}
          onChange={setEndDate}
          minimumDate={startDate ? new Date(`${startDate}T00:00:00`) : new Date()}
        />
        <FormField
          label="Batch size"
          required
          placeholder={`Minimum ${MIN_BATCH_SIZE}`}
          keyboardType="number-pad"
          value={batchSize}
          onChangeText={setBatchSize}
        />
        <Text style={styles.hint}>
          {isRc
            ? `Same TASK policy as colleges: minimum batch of ${MIN_BATCH_SIZE}. Use “All RC members” to open the batch to every active member at this centre.`
            : `TASK policy: trainings at college require a minimum batch of ${MIN_BATCH_SIZE} students of the same year of study.`}
        </Text>

        <View style={styles.actions}>
          <PrimaryButton title="Cancel" variant="secondary" onPress={() => navigation.goBack()} />
          <PrimaryButton
            title={loading ? 'Submitting…' : 'Request for course'}
            onPress={submit}
            disabled={loading}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  banner: {
    backgroundColor: '#FFF8E8',
    borderWidth: 1,
    borderColor: '#E8D4A8',
    borderRadius: 10,
    padding: 12,
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  hint: { color: colors.textMuted, fontSize: 12, lineHeight: 18, marginBottom: 14 },
  actions: { gap: 10 },
});
