import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SearchInput,
  SectionLabel,
  StatTiles,
} from '../components/college/PanelChrome';
import { StudentShell, type StudentMenuKey } from '../components/StudentShell';
import { PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import { trainingApi } from '../services/trainingApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { SchoolExamDetails, StudentRecord } from '../types/student';
import type { TrainingRegistration } from '../types/training';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentHome'>;

export function StudentHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<StudentMenuKey>('home');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [registrations, setRegistrations] = useState<TrainingRegistration[]>([]);
  const [sessions, setSessions] = useState<CourseRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [sessionQuery, setSessionQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.studentId) return;
    const profile = await studentApi.getStudent(user.studentId);
    setStudent(profile);
    if (!profile) return;
    setRegistrations(await trainingApi.listRegistrations(profile.id));
    const available = await trainingApi.listAvailableSessions(profile);
    setSessions(available);
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

  const onSignOut = async () => {
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const active = registrations.filter((r) => r.status === 'registered');
  const past = registrations.filter((r) => r.status !== 'registered');

  const filteredSessions = useMemo(() => {
    const q = sessionQuery.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter(
      (s) =>
        s.courseName.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [sessions, sessionQuery]);

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

  const register = async (session: CourseRequest) => {
    if (!student) return;
    try {
      setLoadingId(session.id);
      await trainingApi.registerForSession(student, session);
      Alert.alert('Registered', `You are registered for ${session.courseName}.`);
      await load();
      setMenu('trainings');
    } catch (e) {
      Alert.alert('Unable to register', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingId(null);
    }
  };

  const isRegistered = (sessionId: string) =>
    registrations.some((r) => r.courseRequestId === sessionId && r.status === 'registered');

  const displayName = student
    ? `${student.firstName} ${student.lastName}`
    : user?.name || 'Student';

  if (!user?.studentId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No student session found.</Text>
        <PrimaryButton title="Sign out" variant="secondary" onPress={onSignOut} />
      </View>
    );
  }

  return (
    <StudentShell
      studentName={displayName}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
    >
      {menu === 'home' ? (
        <ScrollView
          contentContainerStyle={styles.pad}
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
          <PanelHeader
            title="Home"
            subtitle="Browse sessions that match your college, branch, and graduation year."
          />

          <StatTiles
            items={[
              { label: 'Active trainings', value: active.length },
              { label: 'Open sessions', value: sessions.length },
              { label: 'Branch', value: student?.branch || '—' },
              { label: 'Grad year', value: student?.yearOfGraduation || '—' },
            ]}
          />

          {student ? (
            <DataCard>
              <View style={styles.row}>
                <Text style={styles.name}>
                  {student.firstName} {student.lastName}
                </Text>
                <StatusBadge status={student.status.toLowerCase()} />
              </View>
              <Text style={styles.meta}>{student.collegeName}</Text>
              <Text style={styles.meta}>
                {student.branch} · Roll {student.collegeRollNo} · ID {student.username}
              </Text>
            </DataCard>
          ) : (
            <EmptyState title="Loading profile…" />
          )}

          <SectionLabel>Quick links</SectionLabel>
          <View style={styles.actions}>
            <Pressable style={styles.action} onPress={() => setMenu('sessions')}>
              <Text style={styles.actionTitle}>Find sessions</Text>
              <Text style={styles.actionBody}>Register for approved TASK batches</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('trainings')}>
              <Text style={styles.actionTitle}>My trainings</Text>
              <Text style={styles.actionBody}>{active.length} active registration(s)</Text>
            </Pressable>
            <Pressable style={styles.action} onPress={() => setMenu('profile')}>
              <Text style={styles.actionTitle}>Profile & academics</Text>
              <Text style={styles.actionBody}>View 10th / 12th and college details</Text>
            </Pressable>
          </View>
        </ScrollView>
      ) : null}

      {menu === 'sessions' ? (
        <View style={styles.flex}>
          <View style={styles.toolbar}>
            <PanelHeader
              title="Find sessions"
              subtitle={
                student
                  ? `Showing batches for ${student.branch} · ${student.yearOfGraduation}`
                  : 'Approved training sessions'
              }
            />
            <SearchInput
              value={sessionQuery}
              onChangeText={setSessionQuery}
              placeholder="Search by course or category"
            />
            <Text style={styles.resultText}>{filteredSessions.length} session(s)</Text>
          </View>
          <FlatList
            style={styles.flex}
            data={filteredSessions}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              <EmptyState
                title="No matching sessions"
                body="Ask your college to request a course for your branch and graduation year."
              />
            }
            renderItem={({ item }) => {
              const registered = isRegistered(item.id);
              const seats = Math.max(0, item.batchSize - (counts[item.id] || 0));
              return (
                <DataCard accent>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.courseName}</Text>
                    <StatusBadge status={registered ? 'registered' : item.status} />
                  </View>
                  <Text style={styles.meta}>
                    {item.startDate} to {item.endDate} · {item.branch} · YOG {item.yearOfGraduation}
                  </Text>
                  <Text style={styles.meta}>
                    Seats left {seats} / {item.batchSize}
                    {item.trainerName ? ` · Trainer ${item.trainerName}` : ''}
                  </Text>
                  <View style={styles.gap} />
                  {registered ? (
                    <PrimaryButton
                      title="Open session"
                      onPress={() =>
                        navigation.navigate('StudentSessionDetail', { requestId: item.id })
                      }
                    />
                  ) : (
                    <PrimaryButton
                      title={loadingId === item.id ? 'Registering…' : 'Register'}
                      onPress={() => register(item)}
                      disabled={loadingId === item.id || seats <= 0}
                    />
                  )}
                </DataCard>
              );
            }}
          />
        </View>
      ) : null}

      {menu === 'trainings' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <PanelHeader
            title="My trainings"
            subtitle="Active and past registrations for TASK programmes."
          />

          <SectionLabel>Active</SectionLabel>
          {active.length === 0 ? (
            <EmptyState
              title="No active registrations"
              body="Use Find sessions to join an approved batch."
            />
          ) : (
            active.map((item) => (
              <DataCard key={item.id} accent>
                <View style={styles.row}>
                  <Text style={styles.name}>{item.courseName}</Text>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.meta}>
                  {item.startDate} to {item.endDate}
                </Text>
                <Text style={styles.meta}>
                  {item.branch} · Grad year {item.yearOfGraduation}
                </Text>
                <View style={styles.gap} />
                <PrimaryButton
                  title="Open session"
                  onPress={() =>
                    navigation.navigate('StudentSessionDetail', {
                      requestId: item.courseRequestId,
                    })
                  }
                />
                <Pressable onPress={() => cancel(item)} style={styles.cancelBtn}>
                  <Text style={styles.cancelText}>Cancel registration</Text>
                </Pressable>
              </DataCard>
            ))
          )}

          {past.length > 0 ? (
            <>
              <SectionLabel>Past / cancelled</SectionLabel>
              {past.map((item) => (
                <DataCard key={item.id}>
                  <View style={styles.row}>
                    <Text style={styles.name}>{item.courseName}</Text>
                    <StatusBadge status={item.status} />
                  </View>
                  <Text style={styles.meta}>
                    {item.startDate} to {item.endDate}
                  </Text>
                </DataCard>
              ))}
            </>
          ) : null}
        </ScrollView>
      ) : null}

      {menu === 'profile' ? (
        <ScrollView contentContainerStyle={styles.pad}>
          <PanelHeader
            title="Profile"
            subtitle="Personal, college, and school academic details."
            action={
              <PrimaryButton
                title="Edit"
                variant="secondary"
                onPress={() => navigation.navigate('ProfileEdit')}
              />
            }
          />

          {!student ? (
            <EmptyState title="Loading profile…" />
          ) : (
            <>
              <SectionLabel>Personal</SectionLabel>
              <DataCard>
                <Text style={styles.name}>
                  {student.firstName} {student.lastName}
                </Text>
                <Text style={styles.meta}>Email: {student.email}</Text>
                <Text style={styles.meta}>Mobile: {student.mobile}</Text>
                <Text style={styles.meta}>Category: {student.category}</Text>
                <Text style={styles.meta}>User ID: {student.username}</Text>
              </DataCard>

              <SectionLabel>College</SectionLabel>
              <DataCard>
                <Text style={styles.meta}>{student.collegeName}</Text>
                <Text style={styles.meta}>
                  {student.branch} · YOG {student.yearOfGraduation}
                </Text>
                <Text style={styles.meta}>Roll no: {student.collegeRollNo}</Text>
                <Text style={styles.meta}>
                  {student.district} · {student.affiliatedUniversity}
                </Text>
              </DataCard>

              <SectionLabel>Class 10</SectionLabel>
              <ExamCard exam={student.tenth} />

              <SectionLabel>Class 12</SectionLabel>
              <ExamCard exam={student.twelfth} />
            </>
          )}
        </ScrollView>
      ) : null}
    </StudentShell>
  );
}

function ExamCard({ exam }: { exam?: SchoolExamDetails }) {
  if (!exam || !exam.board) {
    return (
      <EmptyState
        title="No academic details saved"
        body="Re-register or update profile later if these fields are missing."
      />
    );
  }
  return (
    <DataCard>
      <Text style={styles.meta}>Board: {exam.board}</Text>
      <Text style={styles.meta}>School / college: {exam.schoolName}</Text>
      <Text style={styles.meta}>Year of passing: {exam.yearOfPassing}</Text>
      <Text style={styles.meta}>Percentage / CGPA: {exam.percentage}</Text>
      <Text style={styles.meta}>Hall ticket: {exam.hallTicketNo}</Text>
    </DataCard>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  flex: { flex: 1 },
  pad: { padding: 16, paddingBottom: 40 },
  toolbar: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  listPad: { padding: 16, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
    alignItems: 'flex-start',
  },
  name: { flex: 1, fontWeight: '700', color: colors.text, fontSize: 15 },
  meta: { color: colors.textMuted, fontSize: 13, lineHeight: 18, marginBottom: 2 },
  muted: { color: colors.textMuted },
  resultText: { color: colors.textMuted, fontWeight: '600', fontSize: 12, marginTop: 4 },
  actions: { gap: 8 },
  action: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
  },
  actionTitle: { fontWeight: '700', color: colors.primaryDark, marginBottom: 4 },
  actionBody: { color: colors.textMuted, fontSize: 13 },
  gap: { height: 10 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
});
