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
  SegmentedTabs,
  StatTiles,
} from '../components/college/PanelChrome';
import { StudentShell, type StudentMenuKey } from '../components/StudentShell';
import { PrimaryButton, StatusBadge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import {
  studentAlertSourceLabel,
  studentNotificationApi,
} from '../services/studentNotificationApi';
import { trainingApi } from '../services/trainingApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { SchoolExamDetails, StudentRecord } from '../types/student';
import type { StudentNotification } from '../types/studentNotification';
import type { TrainingRegistration } from '../types/training';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentHome'>;
type TrainingTab = 'enrolled' | 'available';

export function StudentHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<StudentMenuKey>('home');
  const [trainingTab, setTrainingTab] = useState<TrainingTab>('enrolled');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [registrations, setRegistrations] = useState<TrainingRegistration[]>([]);
  const [sessions, setSessions] = useState<CourseRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [alerts, setAlerts] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
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
    await studentNotificationApi.refreshDeadlineAlerts(profile.id);
    const notes = await studentNotificationApi.listForStudent(profile.id);
    setAlerts(notes);
    setUnreadCount(notes.filter((n) => !n.read).length);
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

  const markAlertsRead = async () => {
    if (!user?.studentId) return;
    await studentNotificationApi.markAllRead(user.studentId);
    await load();
  };

  const active = registrations.filter((r) => r.status === 'registered');
  const past = registrations.filter((r) => r.status !== 'registered');
  const deadlineAlerts = alerts.filter((a) => a.source === 'deadline' && !a.read);

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
      setTrainingTab('enrolled');
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
      unreadCount={unreadCount}
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
            title={student ? `Hi, ${student.firstName}` : 'Home'}
            subtitle={
              student
                ? `${student.collegeName} · ${student.branch}`
                : 'Your TASK trainings and updates'
            }
          />

          <StatTiles
            items={[
              { label: 'Trainings', value: active.length },
              { label: 'Alerts', value: unreadCount, hint: unreadCount ? 'Unread' : 'All read' },
            ]}
          />

          {deadlineAlerts.length > 0 ? (
            <Pressable
              style={styles.deadlineBanner}
              onPress={() => {
                const related = deadlineAlerts[0].relatedRequestId;
                if (related) {
                  navigation.navigate('StudentSessionDetail', { requestId: related });
                } else {
                  setMenu('alerts');
                }
              }}
            >
              <Text style={styles.deadlineTitle}>Action needed</Text>
              <Text style={styles.deadlineBody} numberOfLines={2}>
                {deadlineAlerts[0].title}
                {deadlineAlerts.length > 1
                  ? ` · +${deadlineAlerts.length - 1} more`
                  : ''}
              </Text>
              <Text style={styles.deadlineLink}>
                {deadlineAlerts[0].relatedRequestId ? 'Open assignment →' : 'View alerts →'}
              </Text>
            </Pressable>
          ) : null}

          <SectionLabel>Continue learning</SectionLabel>
          {active.length === 0 ? (
            <DataCard>
              <Text style={styles.name}>No active training yet</Text>
              <Text style={styles.meta}>
                Find an approved session for your branch and register to get materials and
                assignments.
              </Text>
              <View style={styles.gap} />
              <PrimaryButton
                title="Browse available sessions"
                onPress={() => {
                  setTrainingTab('available');
                  setMenu('trainings');
                }}
              />
            </DataCard>
          ) : (
            active.map((item) => (
              <DataCard key={item.id} accent>
                <Text style={styles.name}>{item.courseName}</Text>
                <Text style={styles.meta}>
                  {item.startDate} to {item.endDate}
                  {item.branch ? ` · ${item.branch}` : ''}
                </Text>
                <View style={styles.gap} />
                <PrimaryButton
                  title="Open training"
                  onPress={() =>
                    navigation.navigate('StudentSessionDetail', {
                      requestId: item.courseRequestId,
                    })
                  }
                />
              </DataCard>
            ))
          )}
        </ScrollView>
      ) : null}

      {menu === 'alerts' ? (
        <View style={styles.flex}>
          <View style={styles.toolbar}>
            <PanelHeader
              title="Alerts"
              subtitle="From TASK, your college, and assignment deadlines."
              action={
                unreadCount > 0 ? (
                  <PrimaryButton
                    title="Mark all read"
                    variant="secondary"
                    onPress={markAlertsRead}
                  />
                ) : undefined
              }
            />
            <Text style={styles.resultText}>
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
            </Text>
          </View>
          <FlatList
            style={styles.flex}
            data={alerts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listPad}
            ListEmptyComponent={
              <EmptyState
                title="No alerts yet"
                body="TASK updates, college notices, and assignment deadlines will appear here."
              />
            }
            renderItem={({ item }) => (
              <DataCard accent={!item.read}>
                <View style={styles.row}>
                  <View style={styles.sourcePill}>
                    <Text style={styles.sourceText}>{studentAlertSourceLabel(item.source)}</Text>
                  </View>
                  {!item.read ? (
                    <View style={styles.newPill}>
                      <Text style={styles.newText}>New</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.name}>{item.title}</Text>
                <Text style={styles.alertBody}>{item.body}</Text>
                <Text style={styles.meta}>
                  {new Date(item.createdAt).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
                {item.relatedRequestId ? (
                  <>
                    <View style={styles.gap} />
                    <PrimaryButton
                      title="Open related session"
                      variant="secondary"
                      onPress={() =>
                        navigation.navigate('StudentSessionDetail', {
                          requestId: item.relatedRequestId!,
                        })
                      }
                    />
                  </>
                ) : null}
              </DataCard>
            )}
          />
        </View>
      ) : null}

      {menu === 'trainings' ? (
        <View style={styles.flex}>
          <View style={styles.toolbar}>
            <PanelHeader
              title="Trainings"
              subtitle={
                student
                  ? `${student.branch} · graduation ${student.yearOfGraduation}`
                  : 'Find and manage your TASK batches'
              }
            />
            <SegmentedTabs
              value={trainingTab}
              onChange={setTrainingTab}
              options={[
                { value: 'enrolled', label: `Enrolled (${active.length})` },
                { value: 'available', label: `Available (${filteredSessions.length})` },
              ]}
            />
          </View>

          {trainingTab === 'enrolled' ? (
            <ScrollView contentContainerStyle={styles.listPad}>
              {active.length === 0 ? (
                <EmptyState
                  title="Not enrolled yet"
                  body="Switch to Available to register for an approved batch."
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

              {active.length === 0 ? (
                <PrimaryButton
                  title="Browse available sessions"
                  onPress={() => setTrainingTab('available')}
                />
              ) : null}
            </ScrollView>
          ) : (
            <View style={styles.flex}>
              <View style={styles.availableSearch}>
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
                        {item.startDate} to {item.endDate} · {item.branch} · YOG{' '}
                        {item.yearOfGraduation}
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
                            navigation.navigate('StudentSessionDetail', {
                              requestId: item.id,
                            })
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
          )}
        </View>
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
  availableSearch: {
    paddingHorizontal: 16,
    paddingTop: 10,
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
  gap: { height: 10 },
  cancelBtn: { marginTop: 10, alignSelf: 'flex-start' },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 13 },
  deadlineBanner: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: '#F7C948',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  deadlineTitle: { fontWeight: '800', color: colors.warning, marginBottom: 4 },
  deadlineBody: { color: colors.text, fontSize: 13, lineHeight: 18 },
  deadlineLink: { marginTop: 8, color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  softBanner: {
    backgroundColor: colors.primarySoft,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  softBannerText: { color: colors.primaryDark, fontWeight: '700', fontSize: 13 },
  sourcePill: {
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceText: { color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  newPill: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newText: { color: colors.danger, fontSize: 11, fontWeight: '800' },
  alertBody: { color: colors.text, fontSize: 13, lineHeight: 19, marginBottom: 6 },
});
