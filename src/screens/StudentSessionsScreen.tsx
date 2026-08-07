import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
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
import type { CourseRequest } from '../types/collegePortal';
import type { StudentRecord } from '../types/student';
import type { TrainingRegistration } from '../types/training';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentSessions'>;

export function StudentSessionsScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [sessions, setSessions] = useState<CourseRequest[]>([]);
  const [mine, setMine] = useState<TrainingRegistration[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.studentId) return;
    const profile = await studentApi.getStudent(user.studentId);
    setStudent(profile);
    if (!profile) return;

    const available = await trainingApi.listAvailableSessions(profile);
    setSessions(available);
    setMine(await trainingApi.listRegistrations(profile.id));

    const nextCounts: Record<string, number> = {};
    for (const s of available) {
      nextCounts[s.id] = await trainingApi.getRegistrationCount(s.id);
    }
    setCounts(nextCounts);
  }, [user?.studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const isRegistered = (sessionId: string) =>
    mine.some((r) => r.courseRequestId === sessionId && r.status === 'registered');

  const matchesProfile = (session: CourseRequest) =>
    !!student &&
    session.yearOfGraduation === student.yearOfGraduation &&
    session.branch === student.branch;

  const register = async (session: CourseRequest) => {
    if (!student) return;
    try {
      setLoadingId(session.id);
      await trainingApi.registerForSession(student, session);
      Alert.alert('Registered', `You are registered for ${session.courseName}.`);
      await load();
    } catch (e) {
      Alert.alert('Unable to register', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <Screen
      title="Training Sessions"
      subtitle={
        student
          ? `${student.branch} · Grad year ${student.yearOfGraduation}`
          : 'Your department batches only'
      }
      showLogo={false}
    >
      <FlatList
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.lead}>
            Only batches requested for your department and graduation year are shown. Other
            branches cannot see or join these sessions.
          </Text>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No batches for your department</Text>
            <Text style={styles.emptyBody}>
              {student
                ? `No approved sessions for ${student.branch} (${student.yearOfGraduation}) yet. Your College Admin must request a course for this branch and year.`
                : 'No approved sessions found.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const registered = isRegistered(item.id);
          const seats = counts[item.id] ?? 0;
          const remaining = Math.max(item.batchSize - seats, 0);
          const match = matchesProfile(item);

          return (
            <View style={[styles.card, match && styles.cardMatch]}>
              <View style={styles.row}>
                <Text style={styles.title}>{item.courseName}</Text>
                <StatusBadge status={registered ? 'registered' : 'approved'} />
              </View>
              <Text style={styles.meta}>{item.category}</Text>
              <Text style={styles.dates}>
                {item.startDate} → {item.endDate}
              </Text>
              <Text style={styles.meta}>
                {item.branch} · Grad year {item.yearOfGraduation}
              </Text>
              <Text style={styles.meta}>
                Trainer: {item.trainerName || 'Not assigned yet'}
              </Text>
              <Text style={styles.meta}>
                Seats: {seats}/{item.batchSize} · {remaining} left
              </Text>
              <Text style={styles.match}>Eligible for your department</Text>
              <View style={styles.action}>
                {registered ? (
                  <PrimaryButton
                    title="Open session"
                    onPress={() =>
                      navigation.navigate('StudentSessionDetail', { requestId: item.id })
                    }
                  />
                ) : (
                  <PrimaryButton
                    title={
                      loadingId === item.id
                        ? 'Registering…'
                        : remaining === 0
                          ? 'Batch full'
                          : 'Register for this session'
                    }
                    onPress={() => register(item)}
                    disabled={loadingId === item.id || remaining === 0}
                  />
                )}
              </View>
              {registered ? (
                <Text style={styles.match}>
                  Registered — open the session for materials, assignments, feedback, and queries.
                </Text>
              ) : null}
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 40 },
  lead: { color: colors.textMuted, marginBottom: 12, lineHeight: 20 },
  empty: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 18,
  },
  emptyTitle: { fontWeight: '800', color: colors.primaryDark, marginBottom: 6 },
  emptyBody: { color: colors.textMuted, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  cardMatch: {
    borderColor: colors.primary,
    borderLeftWidth: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  title: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  dates: { color: colors.text, fontWeight: '600', marginTop: 4 },
  match: { marginTop: 6, color: colors.success, fontSize: 12, fontWeight: '600' },
  action: { marginTop: 10 },
});
