import React, { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { PrimaryButton, Screen, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import { trainingApi } from '../services/trainingApi';
import { colors } from '../theme/colors';
import type { StudentRecord } from '../types/student';
import type { TrainingRegistration } from '../types/training';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentHome'>;

export function StudentHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [registrations, setRegistrations] = useState<TrainingRegistration[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.studentId) return;
    const profile = await studentApi.getStudent(user.studentId);
    setStudent(profile);
    setRegistrations(await trainingApi.listRegistrations(user.studentId));
  }, [user?.studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const cancel = async (item: TrainingRegistration) => {
    if (!user?.studentId) return;
    try {
      await trainingApi.cancelRegistration(user.studentId, item.id);
      Alert.alert('Cancelled', `Registration for ${item.courseName} was cancelled.`);
      await load();
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Unable to cancel');
    }
  };

  const active = registrations.filter((r) => r.status === 'registered');
  const past = registrations.filter((r) => r.status !== 'registered');

  return (
    <Screen
      title="Student Dashboard"
      subtitle={user ? `${user.name} · ${user.email}` : 'Student'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {!student ? (
          <Text style={styles.muted}>No student profile found.</Text>
        ) : (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.name}>
                {student.firstName} {student.lastName}
              </Text>
              <StatusBadge status={student.status.toLowerCase()} />
            </View>
            <Text style={styles.meta}>User ID: {student.username}</Text>
            <Text style={styles.meta}>College: {student.collegeName}</Text>
            <Text style={styles.meta}>
              {student.branch} · Grad year {student.yearOfGraduation}
            </Text>
            <Text style={styles.meta}>Roll No: {student.collegeRollNo}</Text>
          </View>
        )}

        <PrimaryButton
          title="Browse training sessions"
          onPress={() => navigation.navigate('StudentSessions')}
        />
        <View style={styles.gap} />
        <PrimaryButton
          title="Edit profile"
          variant="secondary"
          onPress={() => navigation.navigate('ProfileEdit')}
        />

        <Text style={styles.h2}>My training registrations</Text>
        {active.length === 0 ? (
          <Text style={styles.muted}>
            No active registrations yet. Browse sessions to join an approved batch.
          </Text>
        ) : (
          active.map((item) => (
            <View key={item.id} style={styles.regCard}>
              <View style={styles.row}>
                <Text style={styles.regTitle}>{item.courseName}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.meta}>
                {item.startDate} → {item.endDate}
              </Text>
              <Text style={styles.meta}>
                {item.branch} · Grad year {item.yearOfGraduation}
              </Text>
              <View style={styles.gap} />
              <PrimaryButton
                title="Open session (materials & queries)"
                onPress={() =>
                  navigation.navigate('StudentSessionDetail', {
                    requestId: item.courseRequestId,
                  })
                }
              />
              <Pressable onPress={() => cancel(item)} style={styles.cancelBtn}>
                <Text style={styles.cancelText}>Cancel registration</Text>
              </Pressable>
            </View>
          ))
        )}

        {past.length > 0 ? (
          <>
            <Text style={styles.h2}>Past / cancelled</Text>
            {past.map((item) => (
              <View key={item.id} style={styles.regCard}>
                <View style={styles.row}>
                  <Text style={styles.regTitle}>{item.courseName}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.meta}>
                  {item.startDate} → {item.endDate}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.gap} />
        <PrimaryButton title="Sign Out" variant="secondary" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  name: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text },
  meta: { color: colors.textMuted, marginBottom: 4, fontSize: 13 },
  muted: { color: colors.textMuted, marginBottom: 12, lineHeight: 18 },
  h2: {
    marginTop: 16,
    marginBottom: 8,
    fontWeight: '700',
    color: colors.text,
    fontSize: 15,
  },
  regCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  regTitle: { flex: 1, fontWeight: '700', color: colors.text },
  cancelBtn: { marginTop: 8 },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  gap: { height: 12 },
});
