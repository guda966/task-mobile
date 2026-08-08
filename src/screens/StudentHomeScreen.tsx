import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import {
  DataCard,
  EmptyState,
  PanelHeader,
  SearchInput,
  SectionLabel,
  SegmentedTabs,
} from '../components/college/PanelChrome';
import { StudentAnnouncementScroller } from '../components/StudentAnnouncementScroller';
import { StudentShell, type StudentMenuKey } from '../components/StudentShell';
import { DropdownField, PrimaryButton, StatusBadge } from '../components/ui';
import { LATEST_ANNOUNCEMENT } from '../constants/studentAnnouncements';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { studentApi } from '../services/studentApi';
import {
  studentAlertSourceLabel,
  studentNotificationApi,
} from '../services/studentNotificationApi';
import { taskBroadcastApi } from '../services/taskBroadcastApi';
import { regionalCentreApi } from '../services/regionalCentreApi';
import { trainingApi } from '../services/trainingApi';
import { colors } from '../theme/colors';
import type { CourseRequest } from '../types/collegePortal';
import type { SchoolExamDetails, StudentRecord } from '../types/student';
import type { StudentNotification } from '../types/studentNotification';
import type { TaskProgramSession } from '../types/taskBroadcast';
import type { RcMembership } from '../types/regionalCentre';
import type { TrainingRegistration } from '../types/training';
import { RC_MEMBERSHIP_FEE, RC_MEMBERSHIP_MONTHS, REGIONAL_CENTERS, regionalCenterLabel } from '../constants/lookups';

type Props = NativeStackScreenProps<RootStackParamList, 'StudentHome'>;
type TrainingTab = 'enrolled' | 'available' | 'task' | 'rc';

const ANNOUNCEMENT_SEEN_KEY = 'task.student.announcementSeen.v1';

export function StudentHomeScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [menu, setMenu] = useState<StudentMenuKey>('home');
  const [trainingTab, setTrainingTab] = useState<TrainingTab>('enrolled');
  const [student, setStudent] = useState<StudentRecord | null>(null);
  const [registrations, setRegistrations] = useState<TrainingRegistration[]>([]);
  const [sessions, setSessions] = useState<CourseRequest[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [taskAvailable, setTaskAvailable] = useState<TaskProgramSession[]>([]);
  const [taskEnrolled, setTaskEnrolled] = useState<TaskProgramSession[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});
  const [rcMembership, setRcMembership] = useState<RcMembership | null>(null);
  const [rcSessions, setRcSessions] = useState<CourseRequest[]>([]);
  const [rcCounts, setRcCounts] = useState<Record<string, number>>({});
  const [rcJoinId, setRcJoinId] = useState('rc-hyd-masabtank');
  const [alerts, setAlerts] = useState<StudentNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sessionQuery, setSessionQuery] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showAnnouncementPopup, setShowAnnouncementPopup] = useState(false);

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
    const task = await taskBroadcastApi.listSessionsForStudent(profile);
    setTaskAvailable(task.available);
    setTaskEnrolled(task.enrolled);
    const nextTaskCounts: Record<string, number> = {};
    for (const s of [...task.available, ...task.enrolled]) {
      nextTaskCounts[s.id] = await taskBroadcastApi.getEnrollmentCount(s.id);
    }
    setTaskCounts(nextTaskCounts);
    const membership = await regionalCentreApi.getActiveMembership(profile.id);
    setRcMembership(membership);
    const rcAvailable = await trainingApi.listAvailableRcSessions(profile);
    setRcSessions(rcAvailable);
    const nextRcCounts: Record<string, number> = {};
    for (const s of rcAvailable) {
      nextRcCounts[s.id] = await trainingApi.getRegistrationCount(s.id);
    }
    setRcCounts(nextRcCounts);
    await studentNotificationApi.refreshDeadlineAlerts(profile.id);
    const notes = await studentNotificationApi.listForStudent(profile.id);
    setAlerts(notes);
    setUnreadCount(notes.filter((n) => !n.read).length);
  }, [user?.studentId]);

  useFocusEffect(
    useCallback(() => {
      load();
      (async () => {
        const seen = await AsyncStorage.getItem(ANNOUNCEMENT_SEEN_KEY);
        if (seen !== LATEST_ANNOUNCEMENT.id) {
          setShowAnnouncementPopup(true);
        }
      })();
    }, [load]),
  );

  const dismissAnnouncementPopup = async () => {
    await AsyncStorage.setItem(ANNOUNCEMENT_SEEN_KEY, LATEST_ANNOUNCEMENT.id);
    setShowAnnouncementPopup(false);
  };

  const remindLaterAnnouncement = () => {
    setShowAnnouncementPopup(false);
  };

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

  const enrollTaskSession = async (session: TaskProgramSession) => {
    if (!student) return;
    try {
      setLoadingId(session.id);
      await taskBroadcastApi.enrollStudent({
        sessionId: session.id,
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        collegeName: student.collegeName,
      });
      Alert.alert('Enrolled', `You are enrolled in ${session.title}.`);
      await load();
      setTrainingTab('task');
      setMenu('trainings');
    } catch (e) {
      Alert.alert('Unable to enrol', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingId(null);
    }
  };

  const joinRc = async () => {
    if (!student) return;
    try {
      setLoadingId('rc-join');
      await regionalCentreApi.registerStudentForCenter({
        student,
        regionalCenterId: rcJoinId,
      });
      Alert.alert(
        'RC membership active',
        `₹${RC_MEMBERSHIP_FEE} paid. Valid for ${RC_MEMBERSHIP_MONTHS} months.`,
      );
      await load();
      setTrainingTab('rc');
      setMenu('trainings');
    } catch (e) {
      Alert.alert('Unable to join RC', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingId(null);
    }
  };

  const enrollRcSession = async (session: CourseRequest) => {
    if (!student) return;
    try {
      setLoadingId(session.id);
      await trainingApi.registerForSession(student, session);
      Alert.alert('Registered', `You are registered for ${session.courseName}.`);
      await load();
      setTrainingTab('enrolled');
      setMenu('trainings');
    } catch (e) {
      Alert.alert('Unable to enrol', e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoadingId(null);
    }
  };

  const isRegistered = (sessionId: string) =>
    registrations.some((r) => r.courseRequestId === sessionId && r.status === 'registered');

  const openTaskSessionFromAlert = (sessionId: string) => {
    setTrainingTab('task');
    setMenu('trainings');
    const session =
      taskAvailable.find((s) => s.id === sessionId) ||
      taskEnrolled.find((s) => s.id === sessionId);
    if (session) {
      Alert.alert(
        session.title,
        `${session.mode === 'online' ? 'Online' : 'Offline'} · ${session.startDate} ${session.startTime}\n${session.venueOrLink || 'Venue: to be confirmed'}\n\n${session.description}`,
        taskEnrolled.some((s) => s.id === sessionId)
          ? [{ text: 'OK' }]
          : [
              { text: 'Later', style: 'cancel' },
              { text: 'Enrol now', onPress: () => enrollTaskSession(session) },
            ],
      );
    }
  };

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
    <>
    <StudentShell
      studentName={displayName}
      active={menu}
      onChange={setMenu}
      onSignOut={onSignOut}
      unreadCount={unreadCount}
      onBack={navigation.canGoBack() ? () => navigation.goBack() : undefined}
      onHome={() => setMenu('home')}
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

          <StudentAnnouncementScroller />

          <DataCard accent>
            <Text style={styles.name}>Regional Centre membership</Text>
            <Text style={styles.alertBody}>
              {rcMembership
                ? `You are active at ${rcMembership.regionalCenterName} until ${new Date(rcMembership.expiresAt).toLocaleDateString('en-IN')}. Open Trainings → RC to enrol in centre sessions.`
                : `TASK has 16 Regional Centres across Telangana. Pay ₹${RC_MEMBERSHIP_FEE} (valid ${RC_MEMBERSHIP_MONTHS} months) to access RC courses and services near you.`}
            </Text>
            <View style={styles.gap} />
            <PrimaryButton
              title={rcMembership ? 'Open RC sessions' : 'Learn & join RC'}
              onPress={() => {
                setTrainingTab('rc');
                setMenu('trainings');
              }}
            />
          </DataCard>

          <View style={styles.shortcuts}>
            <Pressable
              style={styles.shortcut}
              onPress={() => {
                setTrainingTab(active.length ? 'enrolled' : 'available');
                setMenu('trainings');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.shortcutValue}>{active.length}</Text>
              <View style={styles.shortcutText}>
                <Text style={styles.shortcutTitle}>
                  {active.length === 1 ? 'Active training' : 'Active trainings'}
                </Text>
                <Text style={styles.shortcutHint}>
                  {active.length
                    ? 'Batches you already joined · Tap to open'
                    : 'None yet · Tap to browse available'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.shortcut}
              onPress={() => {
                setTrainingTab('rc');
                setMenu('trainings');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.shortcutValue}>{rcSessions.length}</Text>
              <View style={styles.shortcutText}>
                <Text style={styles.shortcutTitle}>Regional Centre</Text>
                <Text style={styles.shortcutHint}>
                  {rcMembership
                    ? `${rcSessions.length} RC session(s) · Tap to open`
                    : `₹${RC_MEMBERSHIP_FEE} / ${RC_MEMBERSHIP_MONTHS} months · Tap to join`}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.shortcut}
              onPress={() => {
                setTrainingTab('task');
                setMenu('trainings');
              }}
              accessibilityRole="button"
            >
              <Text style={styles.shortcutValue}>
                {taskAvailable.length + taskEnrolled.length}
              </Text>
              <View style={styles.shortcutText}>
                <Text style={styles.shortcutTitle}>TASK sessions</Text>
                <Text style={styles.shortcutHint}>
                  {taskAvailable.length
                    ? `${taskAvailable.length} open to enrol · Alerts go here too`
                    : taskEnrolled.length
                      ? 'Your statewide / college programmes'
                      : 'Posted by TASK Admin for your audience'}
                </Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.shortcut}
              onPress={() => setMenu('alerts')}
              accessibilityRole="button"
            >
              <Text style={styles.shortcutValue}>{unreadCount}</Text>
              <View style={styles.shortcutText}>
                <Text style={styles.shortcutTitle}>
                  {unreadCount === 1 ? 'Unread alert' : 'Unread alerts'}
                </Text>
                <Text style={styles.shortcutHint}>
                  {unreadCount > 0
                    ? 'From TASK, college, or deadlines · Tap to view'
                    : 'All caught up · Tap to open Alerts'}
                </Text>
              </View>
            </Pressable>
          </View>

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
                {item.relatedProgramSessionId ? (
                  <>
                    <View style={styles.gap} />
                    <PrimaryButton
                      title="View TASK session / enrol"
                      variant="secondary"
                      onPress={() => openTaskSessionFromAlert(item.relatedProgramSessionId!)}
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
                {
                  value: 'task',
                  label: `TASK (${taskAvailable.length + taskEnrolled.length})`,
                },
                {
                  value: 'rc',
                  label: `RC (${rcSessions.length})`,
                },
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
          ) : trainingTab === 'available' ? (
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
          ) : trainingTab === 'task' ? (
            <ScrollView contentContainerStyle={styles.listPad}>
              <Text style={styles.resultText}>
                Statewide / district / university / college programmes posted by TASK Admin
              </Text>
              {taskEnrolled.length > 0 ? (
                <>
                  <SectionLabel>You enrolled</SectionLabel>
                  {taskEnrolled.map((item) => (
                    <DataCard key={item.id} accent>
                      <View style={styles.row}>
                        <Text style={styles.name}>{item.title}</Text>
                        <StatusBadge status="registered" />
                      </View>
                      <Text style={styles.meta}>
                        {item.mode === 'online' ? 'Online' : 'Offline'} · {item.startDate}{' '}
                        {item.startTime} → {item.endDate} {item.endTime}
                      </Text>
                      <Text style={styles.meta}>{item.scope.label}</Text>
                      <Text style={styles.meta}>
                        {item.mode === 'online' ? 'Link' : 'Venue'}:{' '}
                        {item.venueOrLink || 'to be confirmed'}
                      </Text>
                      <Text style={styles.alertBody}>{item.description}</Text>
                      <Text style={styles.meta}>
                        Enrolled students: {taskCounts[item.id] ?? 0}
                        {item.maxSeats ? ` / ${item.maxSeats}` : ''}
                      </Text>
                    </DataCard>
                  ))}
                </>
              ) : null}

              <SectionLabel>Open for enrolment</SectionLabel>
              {taskAvailable.length === 0 ? (
                <EmptyState
                  title="No TASK sessions for you right now"
                  body="When TASK Admin schedules a session for your state, district, university, or college, it appears here with an alert."
                />
              ) : (
                taskAvailable.map((item) => {
                  const enrolled = taskCounts[item.id] ?? 0;
                  const full = item.maxSeats ? enrolled >= item.maxSeats : false;
                  return (
                    <DataCard key={item.id} accent>
                      <View style={styles.row}>
                        <Text style={styles.name}>{item.title}</Text>
                        <StatusBadge status={item.mode} />
                      </View>
                      <Text style={styles.meta}>
                        {item.startDate} {item.startTime} → {item.endDate} {item.endTime}
                      </Text>
                      <Text style={styles.meta}>{item.scope.label}</Text>
                      <Text style={styles.meta}>
                        {item.mode === 'online' ? 'Link' : 'Venue'}:{' '}
                        {item.venueOrLink || 'to be confirmed'}
                      </Text>
                      {item.instructorName ? (
                        <Text style={styles.meta}>Facilitator: {item.instructorName}</Text>
                      ) : null}
                      <Text style={styles.alertBody}>{item.description}</Text>
                      <Text style={styles.meta}>
                        Enrolled {enrolled}
                        {item.maxSeats ? ` / ${item.maxSeats}` : ''}
                      </Text>
                      <View style={styles.gap} />
                      <PrimaryButton
                        title={
                          loadingId === item.id
                            ? 'Enrolling…'
                            : full
                              ? 'Session full'
                              : 'Enrol'
                        }
                        onPress={() => enrollTaskSession(item)}
                        disabled={loadingId === item.id || full}
                      />
                    </DataCard>
                  );
                })
              )}
            </ScrollView>
          ) : (
            <ScrollView contentContainerStyle={styles.listPad}>
              {rcMembership ? (
                <DataCard accent>
                  <Text style={styles.name}>{rcMembership.regionalCenterName}</Text>
                  <Text style={styles.meta}>
                    Active until {new Date(rcMembership.expiresAt).toLocaleDateString('en-IN')} · Fee
                    ₹{rcMembership.feePaid}
                  </Text>
                  <Text style={styles.alertBody}>
                    You can enrol in TASK-approved RC course batches scheduled by this centre.
                  </Text>
                </DataCard>
              ) : (
                <DataCard>
                  <Text style={styles.name}>Join a Regional Centre</Text>
                  <Text style={styles.alertBody}>
                    Pay ₹{RC_MEMBERSHIP_FEE} (valid {RC_MEMBERSHIP_MONTHS} months) to access RC
                    courses at one of 16 centres. After TASK Admin approves an RC course request, it
                    appears here for enrolment.
                  </Text>
                  <DropdownField
                    label="Regional Centre"
                    required
                    value={rcJoinId}
                    onChange={setRcJoinId}
                    options={REGIONAL_CENTERS.map((c) => ({
                      value: c.id,
                      label: regionalCenterLabel(c),
                    }))}
                  />
                  <PrimaryButton
                    title={
                      loadingId === 'rc-join'
                        ? 'Joining…'
                        : `Pay ₹${RC_MEMBERSHIP_FEE} & join`
                    }
                    onPress={joinRc}
                    disabled={loadingId === 'rc-join'}
                  />
                </DataCard>
              )}

              <SectionLabel>Approved RC sessions</SectionLabel>
              {!rcMembership ? (
                <EmptyState
                  title="Membership required"
                  body="Join a Regional Centre above to see and enrol in RC sessions."
                />
              ) : rcSessions.length === 0 ? (
                <EmptyState
                  title="No approved RC sessions"
                  body="When your Regional Centre’s course request is approved by TASK Admin, it appears here."
                />
              ) : (
                rcSessions.map((item) => {
                  const seated = rcCounts[item.id] ?? 0;
                  const full = seated >= item.batchSize;
                  const already = registrations.some(
                    (r) => r.courseRequestId === item.id && r.status === 'registered',
                  );
                  return (
                    <DataCard key={item.id} accent>
                      <View style={styles.row}>
                        <Text style={styles.name}>{item.courseName}</Text>
                        <StatusBadge status={already ? 'registered' : item.status} />
                      </View>
                      <Text style={styles.meta}>
                        {item.startDate} → {item.endDate} · {item.branch} · Grad{' '}
                        {item.yearOfGraduation}
                      </Text>
                      <Text style={styles.meta}>
                        Seats {seated}/{item.batchSize}
                        {item.trainerName ? ` · Trainer ${item.trainerName}` : ''}
                      </Text>
                      <View style={styles.gap} />
                      {already ? (
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
                              ? 'Enrolling…'
                              : full
                                ? 'Batch full'
                                : 'Enrol'
                          }
                          onPress={() => enrollRcSession(item)}
                          disabled={loadingId === item.id || full}
                        />
                      )}
                    </DataCard>
                  );
                })
              )}
            </ScrollView>
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

      <Modal
        visible={showAnnouncementPopup && menu === 'home'}
        transparent
        animationType="fade"
        onRequestClose={dismissAnnouncementPopup}
      >
        <View style={styles.popupBackdrop}>
          <View style={styles.popupCard}>
            <Text style={styles.popupEyebrow}>Latest from TASK</Text>
            <Text style={styles.popupTitle}>{LATEST_ANNOUNCEMENT.title}</Text>
            <Text style={styles.popupBody}>{LATEST_ANNOUNCEMENT.body}</Text>
            <PrimaryButton title="Got it" onPress={dismissAnnouncementPopup} />
            <Pressable onPress={remindLaterAnnouncement} style={styles.popupLater}>
              <Text style={styles.popupLaterText}>Remind me next visit</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
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
  shortcuts: { gap: 8, marginBottom: 12 },
  shortcut: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: '#BFDCDC',
    borderRadius: 12,
    padding: 14,
  },
  shortcutValue: {
    minWidth: 36,
    fontSize: 28,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  shortcutText: { flex: 1 },
  shortcutTitle: { fontWeight: '800', color: colors.text, fontSize: 15 },
  shortcutHint: { color: colors.textMuted, fontSize: 12, marginTop: 2, lineHeight: 16 },
  popupBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 35, 35, 0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popupEyebrow: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  popupTitle: { fontWeight: '800', color: colors.text, fontSize: 18, marginBottom: 8 },
  popupBody: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginBottom: 16 },
  popupLater: { marginTop: 12, alignSelf: 'center' },
  popupLaterText: { color: colors.textMuted, fontWeight: '600', fontSize: 13 },
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
